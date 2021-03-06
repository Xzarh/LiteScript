Producer C
===========

The `producer` module extends Grammar classes, adding several `produce*()` methods 
to generate target code for the node.

The compiler calls the `.produce()` method of the root 'Module' node 
in order to return the compiled code for the entire tree.


Dependencies
------------

    import 
      Project
      Parser, ASTBase, Grammar
      Names
      Environment, logger, color, UniqueID

    shim import Map, LiteCore

Production
----------

We have different phases of productions for C-code:

- Header: 
    produce .h file content. public objects produce "external" declarations

- Module level declarations:
    to produce "declarative" code at the begginig of the .c file. (code valid -outside- a C function)
    this includes module-level "var" declarations & function forward declarations.

- Initial Assignments:
    to produce "executable" code assigning initial value to module|namespace|instance vars. 
    (code valid -inside- a C function)
    Here we produce all assignments for initial values given in var|props declarations.
    Note: C-99 allows to assign a value at var declaration outside a function, but values
    are strictly limited to literal constants, so it is ununsable in our case.

- normal produce: (main production)
    to produce "executable" code. (code valid inside a C function)


Object Literal
--------------

To be able to compile-to-c this source, we instruct the
compiler to create a *new Map* when it encounters an *untyped* object literal.
e.g: `var x = {foo:1, bar:"baz"}` => `var x = Map.newFromObject({foo:1, bar:"baz"})`

    //lexer options object literal is Map

Map & Object implement common methods:
.hasProperty, .tryGetProperty, .setProperty, .allClassProperties
so the same code can handle "objects" (when compiled-to-js) 
and "Maps" (when compiled-to-c)

module vars  
-----------

    # list of classes, to call _newClass & _declareMethodsAndProps
    var allClasses: array of Grammar.ClassDeclaration = []

store each distinct method name (globally).
We start with core-supported methods. 
Method get a trailing "_" if they're a C reserved word

    var allMethodNames: Map string to Names.Declaration = {}  // all distinct methodnames, to declare method symbols
    var allClassProperties: Map string to Names.Declaration = {} // all distinct propname, to declare props symbols

    var coreSupportedMethods = [
        "toString","iterableNext"
        "tryGetMethod","tryGetProperty","getProperty", "getPropertyName","hasProperty"
        "has", "get", "set", "clear", "delete", "keys"
        "slice", "split", "indexOf", "lastIndexOf", "concat"
        "toUpperCase", "toLowerCase","charAt", "replaceAll","trim","substr","countSpaces","byteIndexOf","byteSlice"
        "toDateString","toTimeString","toUTCString","toISOString"
        "copy", "write" //Buffer
        "shift","push","unshift", "pop", "join","splice"
    ]

    var coreSupportedProps = [
        'name','index','key','value','iterable','extra','size','message','stack','code'
    ]

    public var dispatcherModule: Grammar.Module

    var appendToCoreClassMethods: array of Grammar.MethodDeclaration = []

    var DEFAULT_ARGUMENTS = "(any this, len_t argc, any* arguments)"


### Public function postProduction(project)

create _dispatcher.c & .h

        dispatcherModule = new Grammar.Module()
        declare valid project.options
        dispatcherModule.lexer = new Parser.Lexer(project, project.options)

        project.redirectOutput dispatcherModule.lexer.outCode // all Lexers now out here        

        dispatcherModule.fileInfo = Environment.fileInfoNewFile("_dispatcher")

        dispatcherModule.lexer.outCode.filenames[0] = dispatcherModule.fileInfo.outFilename
        dispatcherModule.lexer.outCode.filenames[1] = '#{dispatcherModule.fileInfo.outFilename.slice(0,-1)}h'

        dispatcherModule.produceDispatcher project

        dispatcherModule.lexer.outCode.close

        /*
        var resultLines:string array =  dispatcherModule.lexer.outCode.getResult() //get .c file contents
        if resultLines.length
            Environment.externalCacheSave dispatcherModule.fileInfo.outFilename,resultLines

        resultLines =  dispatcherModule.lexer.outCode.getResult(1) //get .h file contents
        if resultLines.length
            Environment.externalCacheSave '#{dispatcherModule.fileInfo.outFilename.slice(0,-1)}h',resultLines
        */

        logger.info "#{color.green}[OK] -> #{dispatcherModule.fileInfo.outRelFilename} #{color.normal}"
        logger.extra #blank line

    end function

    helper function normalizeDefine(name:string)
        var chr, result=""
        for n=0 to name.length
            chr=name.charAt(n).toUpperCase()
            if chr<'A' or chr>'Z', chr="_"
            result="#{result}#{chr}"

        return result


"C" Producer Functions
======================

### Append to class Grammar.Module ###

#### method produceDispatcher(project)

        var requiredHeaders: Grammar.Module array = []

_dispatcher.h

        .out 
            {h:1},NL
            '#ifndef #{normalizeDefine(.fileInfo.outRelFilename)}_H',NL
            '#define #{normalizeDefine(.fileInfo.outRelFilename)}_H',NL,NL
            '#include "LiteC-core.h"',NL,NL,NL

LiteC__init extern declaration

        .out 
            NL,{COMMENT: 'core support and defined classes init'},NL
            'extern void __declareClasses();',NL,NL

verbs & things

now all distinct method names

        .out 
            {COMMENT: 'methods'},NL,NL
            "enum _VERBS { //a symbol for each distinct method name",NL

        var initialValue = " = -_CORE_METHODS_MAX-#{allMethodNames.size}"
        for each methodDeclaration in map allMethodNames
            .out '    ',makeSymbolName(methodDeclaration.name),initialValue,",",NL
            initialValue=undefined
        .out NL,"_LAST_VERB};",NL

all  distinct property names

        .out 
            {COMMENT: 'property names'},NL,NL
            "enum _THINGS { //a symbol for each distinct property name",NL

        initialValue = "= _CORE_PROPS_LENGTH"
        for each name,value in map allClassProperties
            .out '    ',makeSymbolName(name), initialValue, ",",NL
            initialValue=undefined
        .out NL,"_LAST_THING};",NL,NL,NL

        .out """

            // a MACRO for each property name, to circumvent C-preprocessor problem with commas
            // and to be able to include foo__(this) as a parameter in a ITEM(arr,index) MACRO

            """

        for each name,value in map allClassProperties
            .out "    #define ",makeSymbolName(name), "_(this) PROP(",makeSymbolName(name),",this)",NL
        
        .out NL,NL,NL

Now include headers for all the imported modules.
To put this last is important, because if there's a error in the included.h 
and it's *before* declaring _VERBS and _THINGS, _VERBS and _THINGS don't get
declared and the C compiler shows errors everywhere

        for each moduleNode:Grammar.Module in map project.moduleCache
            var hFile = moduleNode.fileInfo.outWithExtension(".h")
            hFile = Environment.relativeFrom(.fileInfo.outDir, hFile)
            .out '#include "#{hFile}"',NL

        .out NL,NL,"#endif",NL,NL

_dispatcher.c

        .out 
            {h:0},NL
            '#include "_dispatcher.h"',NL,NL,NL,NL

static definition added verbs (methods) and things (properties)

        .out 
            {COMMENT: 'methods'},NL,NL
            "static str _ADD_VERBS[] = { //string name for each distinct method name",NL
            {pre:'    "', CSL:allMethodNames.keys(), post:'"\n'}
            '};',NL,NL

all  distinct property names

        .out 
            {COMMENT: 'propery names'},NL,NL
            "static str _ADD_THINGS[] = { //string name for each distinct property name",NL
            {pre:'    "', CSL:allClassProperties.keys(), post:'"\n'}
            '};',NL,NL

All literal Maps & arrays

        /*for each nameDecl in map .scope.members
            where nameDecl.nodeDeclared instanceof Grammar.Literal
                .out nameDecl,";",NL
        */

_dispatcher.c contains main function

        .out 
            "\n\n\n//-------------------------------",NL
            "int main(int argc, char** argv) {",NL
            '    LiteC_init( #{allClasses.length}, argc,argv);',NL
            '    LiteC_addMethodSymbols( #{allMethodNames.size}, _ADD_VERBS);',NL
            '    LiteC_addPropSymbols( #{allClassProperties.size}, _ADD_THINGS);',NL
            

process methods appended to core classes, by calling LiteC_registerShim

        .out '\n'
        for each methodDeclaration in appendToCoreClassMethods
                var appendToDeclaration = methodDeclaration.getParent(Grammar.AppendToDeclaration)
                .out '    LiteC_registerShim(',appendToDeclaration.varRef,
                     ',#{methodDeclaration.name}_,',
                     appendToDeclaration.varRef,'_',methodDeclaration.name,');',NL

call __ModuleInit for all the imported modules. call the base modules init first
    
        var moduleList: array of Grammar.Module=[]

        for each moduleNode:Grammar.Module in map project.moduleCache
            where moduleNode isnt project.main
                moduleList.push moduleNode //order in moduleCache is lower level to higher level
        
        // sort list so base-modules (deeper level) come first 
        moduleList.sort(sortByRecurseLevel)

        .out '\n'
        for each nodeModule in moduleList
            .out 
                '    ',nodeModule.fileInfo.base,'__moduleInit();'
                ' // level:',nodeModule.dependencyTreeLevel,'.',nodeModule.dependencyTreeLevelOrder
                ' order: ',nodeModule.importOrder ,NL 

call main module __init (main program execution),
and before exit, call LiteC_finish

        .out 
            '\n\n    ',project.main.fileInfo.base,'__moduleInit();'
            NL
            '\n\n    LiteC_finish();'
            NL 
            '} //end main'
            NL


#### method produce() # Module

        .out 
            {h:1},NL
            '#ifndef #{normalizeDefine(.fileInfo.outRelFilename)}_H',NL
            '#define #{normalizeDefine(.fileInfo.outRelFilename)}_H',NL,NL

        var thisBase = Environment.getDir(.fileInfo.outFilename)
        var dispatcherRel = Environment.relativeFrom(thisBase, Environment.options.outDir & '/_dispatcher.h')
        .out '#include "', dispatcherRel, '"',NL

        var prefix=.fileInfo.base

        .out 
            "//-------------------------",NL
            "//.h for module ",prefix, NL
            "//-------------------------",NL

Modules have a __moduleInit function holding module items initialization and any loose statements

        .out "extern void ",prefix,"__moduleInit(void);",NL

Interfaces have a __nativeInit function to provide a initialization opportunity 
to module native support

        if .fileInfo.isInterface // add call to native hand-coded C support for this module 
            .out "extern void ",prefix,"__nativeInit(void);",NL

out header declarations for each statement requiring one 
(call produce while mode is HEADER, normally used for "public" declarations)

        .body.produceHeader prefix

Now start the .c file,

        .out 
            {h:0} //on .c
            '#include "#{prefix}.h"',NL,NL
            "//-------------------------",NL
            "//Module ",prefix, .fileInfo.isInterface? ' - INTERFACE':'',NL
            "//-------------------------",NL

Now produce module level declarations 
for statements requiring one.
e.g: functions do a forward declare, module vars & classes declare existence.

if we have a "export only" class or namespace, do not add module prefix.

        var exportPrefix = .exportsReplaced? "" else prefix

        .body.produceModuleLevelDeclarations exportPrefix

Now produce module function & classes bodies.
We must exclude other loose executable statements,
which must be moved to the module initialization function.

We exclude Grammar.VarStatement, because it is handled as 3 separated statements:
a [extern declaration], a module level declaration, and the initialization at __moduleInit

        var otherInitStatements = []
        for each statement in .body.statements
            where statement.specific.constructor isnt Grammar.VarStatement
                if statement.isDeclaration()
                    statement.produce
                else
                    otherInitStatements.push statement

Now start module initialization function

        .out 
            "\n\n//-------------------------",NL
            "void ",prefix,"__moduleInit(void){",NL

produce initial assignment, class registration, etc
for statements requiring one

        .body.produceAtModuleInitialization 

Now produce other loose executable statements un the module body,
which needed to be moved here: the module initialization function

        for each statement in otherInitStatements
            statement.produce

if this is a .interface. file, 
add call to native hand-coded C support for this module 

        if .fileInfo.isInterface 
            .out NL,'    ',prefix,"__nativeInit();"

close __moduleInit

        .out NL,"};",NL
        .skipSemiColon = true

close .h #ifdef

        .out 
            {h:1}
            NL,'#endif',NL
            {h:0}


### function sortByRecurseLevel(moduleA:Grammar.Module, moduleB:Grammar.Module)
deeper level goes first
but on everything equal, import order wins

        return moduleB.dependencyTreeLevel - moduleA.dependencyTreeLevel
            or moduleB.dependencyTreeLevelOrder - moduleA.dependencyTreeLevelOrder
            or moduleA.importOrder - moduleB.importOrder 


----------------------------

## Grammar.ClassDeclaration & derivated

### Append to class Grammar.AppendToDeclaration ###

Any class|object can have properties or methods appended at any time. 
Append-to body contains properties and methods definitions.

#### method outCommentTitle(prefix) 
        .out NL,"//------- append to ",.toNamespace? "namespace ":"class " ,prefix,NL

Append-to on Header:

#### method produceHeader() 

 calculate .nameDecl 

        .nameDecl = .varRef.tryGetReference() // get class|ns being append to
        if no .nameDecl, return .sayErr("append to: reference not found")
        
        var prefix = .nameDecl.getComposedName()
        .outCommentTitle prefix

        if .toNamespace //if it is "append to namespace x"...
            .body.produceHeader prefix, forcePublic=true
            return

else, is "append to class"            
handle methods added to core classes. We assume them "public"

        if .nameDecl.nodeDeclared and .nameDecl.nodeDeclared.name is "*Global Scope*"

            for each item in .body.statements
                if item.specific.constructor is Grammar.MethodDeclaration 
                    declare item.specific: Grammar.MethodDeclaration 

                    if no item.specific.nameDecl, continue // do not process, is a shim

keep a list of all methods appended to core-defined classes (like String)
they require a special registration, because the class pre-exists in core

                    appendToCoreClassMethods.push item.specific

also add to allMethods, since the class is core, the class is not declared in this project

                    item.specific.nameDecl.addToAllMethodNames

out header (assume public)

                    .out 'extern any ',item.specific.nameDecl.getComposedName(),"(DEFAULT_ARGUMENTS);",NL                            

                else if item.specific.constructor is Grammar.PropertiesDeclaration
                    .sayErr "C-production. Cannot append properties to a core class"


#### method produceModuleLevelDeclarations(prefix,forcePublic) # of Grammar.AppendToDeclaration

add declarations for appended classes

        .outCommentTitle prefix
        .body.produceModuleLevelDeclarations prefix,forcePublic

#### method produceAtModuleInitialization() # of Grammar.AppendToDeclaration

register internal classes

        var prefix= .nameDecl.getComposedName()
        .outCommentTitle prefix
        .body.produceAtModuleInitialization

#### method produce()

        var prefix = .nameDecl.getComposedName()
        .outCommentTitle prefix
        .body.produce


### Append to class Grammar.NamespaceDeclaration ###

#### method outCommentTitle(prefix)

        .out NL,"//------- namespace ",prefix,NL

#### method produceHeader
                       
        var prefix= .nameDecl.getComposedName()
        .outCommentTitle prefix

all namespace methods & props are exported in C

/*        // export properties & methods
        for each member in map .nameDecl.members
            where member.name not in ['constructor','length','prototype']
                case member.nodeClass
                    when Grammar.VariableDecl:
                        .out '    extern var ',prefix,'_',member.name,';',NL
                    when Grammar.MethodDeclaration:
                        .out '    extern any ',prefix,'_',member.name,'(DEFAULT_ARGUMENTS);',NL

*/            

         //add internal classes and namespaces
        .body.produceHeader prefix, forcePublic=true


#### method produceModuleLevelDeclarations(prefix,forcePublic) # of Grammar.NamespaceDeclaration

add declarations for vars & internal classes

        .outCommentTitle prefix
        .body.produceModuleLevelDeclarations prefix,forcePublic


#### method produceAtModuleInitialization() # of Grammar.NamespaceDeclaration

register internal classes

        var prefix= .nameDecl.getComposedName()
        .outCommentTitle prefix
        .body.produceAtModuleInitialization

#### method produce # of Grammar.NamespaceDeclaration

        var prefix= .nameDecl.getComposedName()
        .outCommentTitle prefix

        //logger.debug "produce Namespace",c

Now on the .c file,

        .body.produce
        .skipSemiColon = true


### Append to class Grammar.ClassDeclaration ###

-------------------------------------
#### helper method outClassTitleComment(prefix)

        .out 
            NL,"//-------- class ",prefix
            .varRefSuper?' extends ':'',.varRefSuper
            NL

#### method produceHeader()

        if no .nameDecl, return //shim class

        // keep a list of classes in each moudle, to out __registerClass
        allClasses.push this

        var c = .nameDecl.getComposedName()

        //logger.debug "produce header class",c

header

        .outClassTitleComment c

        //var holding class reference 
        .out 'extern any ',c,';',NL

In C we create a struct for "instance properties" of each class 

        .out 
            "typedef struct ",c,"_s * ",c,"_ptr;",NL
            "typedef struct ",c,"_s {",NL

out all properties, from the start of the "super-extends" chain

        .nameDecl.outSuperChainProps this

close instance struct

        .out NL,"} ",c,"_s;",NL,NL

and declare extern for class __init

        //declare extern for this class methods
        .out "extern void ",c,"__init(DEFAULT_ARGUMENTS);",NL
        .out "extern any ",c,"_newFromObject(DEFAULT_ARGUMENTS);",NL

add each prop to "all properties list", each method to "all methods list"
and declare extern for each class method

        var classMethods=[]

        var prt = .nameDecl.findOwnMember('prototype')
        for each prtNameDecl in map prt.members
            where prtNameDecl.name not in ['constructor','length','prototype']
                if prtNameDecl.nodeClass is Grammar.VariableDecl
                    // keep a list of all classes props
                    prtNameDecl.addToAllProperties
                else
                    // keep a list of all classes methods
                    prtNameDecl.addToAllMethodNames 

                    //declare extern for this class methods
                    .out "extern any ",c,"_",prtNameDecl.name,"(DEFAULT_ARGUMENTS);",NL

methods in the class as namespace

        for each nameDecl in map .nameDecl.members
            where nameDecl.name isnt 'prototype' and nameDecl.name.charAt(0) isnt '*'
                if nameDecl.nodeClass is Grammar.MethodDeclaration
                    //declare extern for this class as namespace method
                    .out "extern any ",c,"_",nameDecl.name,"(DEFAULT_ARGUMENTS); //class as namespace",NL


#### method produceModuleLevelDeclarations(prefix,forcePublic)

static definition info for each class: list of _METHODS and _PROPS

        //skip NamespaceDeclaration & AppendToDeclaration (both derived from ClassDeclaration)
        if .constructor isnt Grammar.ClassDeclaration, return 

        .outClassTitleComment prefix

        //var holding class reference 
        .out 'any ',prefix,';',NL

        .out 
            '//-----------------------',NL
            '// Class ',prefix,': static list of METHODS(verbs) and PROPS(things)',NL
            '//-----------------------',NL
            NL 
            "static _methodInfoArr ",prefix,"_METHODS = {",NL

        var propList=[]
        var prt = .nameDecl.findOwnMember('prototype')
        for each nameDecl in map prt.members
            where nameDecl.name not in ['constructor','length','prototype']
                if nameDecl.nodeClass is Grammar.MethodDeclaration
                    .out '  { #{makeSymbolName(nameDecl.name)}, #{prefix}_#{nameDecl.name} },',NL
                else
                    propList.push makeSymbolName(nameDecl.name)

        .out 
            NL,"{0,0}}; //method jmp table initializer end mark",NL
            NL
            "static propIndex_t ",prefix,"_PROPS[] = {",NL
            {CSL:propList, post:'\n    '}
            "};",NL,NL

#### method produceAtModuleInitialization # of ClassDeclaration

        //skip NamespaceDeclaration & AppendToDeclaration (both derived from ClassDeclaration)
        if .constructor isnt Grammar.ClassDeclaration, return 

        if no .nameDecl, return //shim class

        var c = .nameDecl.getComposedName()
        .outClassTitleComment c

        var superName = .nameDecl.superDecl? .nameDecl.superDecl.getComposedName() else 'Object' 

        .out 
            '    #{c} =_newClass("#{c}", #{c}__init, sizeof(struct #{c}_s), #{superName});',NL
            '    _declareMethods(#{c}, #{c}_METHODS);',NL
            '    _declareProps(#{c}, #{c}_PROPS, sizeof #{c}_PROPS);',NL,NL

#### method produce()

        if no .nameDecl, return //shim class

        //logger.debug "produce body class",c

this is the class body, goes on the .c file,

        var c = .nameDecl.getComposedName()
        .outClassTitleComment c

        var hasConstructor: boolean
        var hasNewFromObject: boolean

        for each index,item in .body.statements

            if item.specific instanceof Grammar.ConstructorDeclaration 
                if hasConstructor # what? more than one?
                    .throwError('Two constructors declared for class #{c}')
                hasConstructor = true
            
            else if item.specific instanceof Grammar.MethodDeclaration
                if .name is 'newFromObject'
                    hasNewFromObject = true


default constructors

        if not .getParent(Grammar.Module).fileInfo.isInterface

            if not hasConstructor 
                // produce a default constructor
                .out 
                    "//auto ",c,"__init",NL
                    "void ",c,"__init",DEFAULT_ARGUMENTS,"{",NL

                if .varRefSuper
                    .out 
                        "    ",{COMMENT:"//auto call super class __init"},NL
                        "    ",.varRefSuper,"__init(this,argc,arguments);",NL

                .producePropertiesInitialValueAssignments

                // end default constructor
                .out "};",NL

produce newFromObject

            if not hasNewFromObject

                // produce default newFromObject as namespace method for the class
                .out 
                    NL
                    "//auto ",c,"_newFromObject",NL
                    "inline any ",c,"_newFromObject(DEFAULT_ARGUMENTS){",NL
                    "    return _newFromObject(",c,",argc,arguments);",NL
                    "}",NL

produce class body

        .body.produce
        .skipSemiColon = true


#### method producePropertiesInitialValueAssignments()

if there is var or properties with assigned values, produce those assignment

        for each item in .body.statements 
            where item.specific.constructor is Grammar.PropertiesDeclaration 
                declare item.specific:Grammar.PropertiesDeclaration
                for each variableDecl in item.specific.list
                    where variableDecl.assignedValue
                        .out makeSymbolName(variableDecl.name),'_(this)=',variableDecl.assignedValue,";",NL



-------------------------------------
### Append to class Names.Declaration
#### method outSuperChainProps(node:Grammar.ClassDeclaration) #recursive

out all properties of a class, including those of the super's-chain

        if .superDecl, .superDecl.outSuperChainProps node #recurse

        node.out '    //',.name,NL
        var prt = .ownMember('prototype')
        if no prt, .sayErr "class #{.name} has no prototype"

        for each prtNameDecl in map prt.members
            where prtNameDecl.name not in ['constructor','length','prototype']
                if prtNameDecl.nodeClass is Grammar.VariableDecl
                    node.out '    any ',prtNameDecl.name,";",NL


-------------------------------------
### Append to class Grammar.Body

#### method produceHeader(parentName,forcePublic)

        if no .statements, return //interface only

        var prefix = parentName? "#{parentName}_" else ""

        // add each declared prop as a extern prefixed var
        for each item in .statements

            var isPublic = forcePublic or item.hasAdjective('export')

            case item.specific.constructor

                when Grammar.VarStatement, Grammar.PropertiesDeclaration:
                    declare item.specific:Grammar.VarStatement
                    if isPublic, .out 'extern var ',{pre:prefix, CSL:item.specific.getNames()},";",NL

                when Grammar.FunctionDeclaration, Grammar.MethodDeclaration: //method: append to class xx - when is a core class
                    declare item.specific:Grammar.FunctionDeclaration
                    //export module function
                    if isPublic, .out 'extern any ',prefix,item.specific.name,"(DEFAULT_ARGUMENTS);",NL

                when Grammar.NamespaceDeclaration, Grammar.ClassDeclaration, Grammar.AppendToDeclaration:
                    declare item.specific:Grammar.ClassDeclaration
                    item.specific.produceHeader #recurses
                    // as in JS, always public. Must produce. namespace also can have classes inside


#### method produceModuleLevelDeclarations(prefix,forcePublic) #body

before main function,
produce body sustance: vars & other functions declarations
        
        if no .statements, return //just interface

        //var produceSecond: array of Grammar.Statement = []
        //var produceThird: array of Grammar.Statement = []

        for each item in .statements

            var pre= prefix and (forcePublic or item.hasAdjective('export'))? "#{prefix}_" else ""

            // declare var & functions
            if item.specific instanceof Grammar.VarDeclList // PropertiesDeclaration & VarStatement
                declare item.specific:Grammar.VarDeclList
                //just declare existence, do not assign. (C compiler: error: initializer element is not constant)
                .out 'var ',{pre:pre, CSL:item.specific.getNames()},";",NL

            //since C require to define a fn before usage. we make forward declarations
            // of all module functions, to avoid any ordering problem.
            else if item.specific.constructor is Grammar.FunctionDeclaration
                declare item.specific:Grammar.FunctionDeclaration
                //just declare existence, do not assign. (C compiler: error: initializer element is not constant)
                .out 'any ',pre,item.specific.name,"(DEFAULT_ARGUMENTS); //forward declare",NL
                    //produceThird.push item

            else if item.specific instanceof Grammar.ClassDeclaration // % derivates
                declare item.specific:Grammar.ClassDeclaration
                item.specific.produceModuleLevelDeclarations 
                        item.specific.nameDecl.getComposedName()
                        forcePublic = item.specific.constructor is Grammar.NamespaceDeclaration

            //else if item.specific.constructor is Grammar.NamespaceDeclaration
                //declare item.specific:Grammar.NamespaceDeclaration
                //produceSecond.push item.specific #recurses thru namespace.produce()

            //else if item.specific.constructor is Grammar.AppendToDeclaration
            //    item.specific.callOnSubTree LiteCore.getSymbol('produceModuleLevelDeclarations') //if there are internal classes
                //produceThird.push item

            //else if item.isDeclaration()
            //    produceThird.push item
        
        end for //produce declarations previous to functions & classes sustance
        
        /*for each item in produceSecond //class & namespace sustance
            .out item

        for each item in produceThird //other declare statements
            .out item
        */

#### method produceAtModuleInitialization() # for Body

User classes must be registered previously, in case the module vars use them as initial values.

assign values for module vars.
if there are vars or properties with assigned values, produce those assignment.

        for each item in .statements 
            where item.specific.constructor is Grammar.ClassDeclaration 
                declare item.specific:Grammar.ClassDeclaration
                item.specific.produceAtModuleInitialization //register class

        for each item in .statements 
            where item.specific.constructor isnt Grammar.ClassDeclaration 

                if item.specific instanceof Grammar.VarDeclList //for modules:VarStatement, for Namespaces: PropertiesDeclaration
                    declare item.specific:Grammar.VarDeclList
                    for each variableDecl in item.specific.list
                        where variableDecl.assignedValue
                            .out NL,"//-- module level var ", variableDecl.name,NL
                            item.callOnSubTree LiteCore.getSymbol('declareIntoVar') //declare "into" and "__orx" vars
                            .out '    ',variableDecl.nameDecl.getComposedName(),' = ', variableDecl.assignedValue,";",NL

                else if item.specific instanceof Grammar.ClassDeclaration //& derivated
                    declare item.specific:Grammar.ClassDeclaration
                    item.specific.produceAtModuleInitialization


#### method produce # of Body

        .out .statements

-------------------------------------
### append to class Grammar.Statement ###

`Statement` objects call their specific statement node's `produce()` method
after adding any comment lines preceding the statement

      method produce()

add preceeding comment lines, in the same position as the source

        .outPreviousComments

To enhance compiled code readability, add original Lite code line as comment 

        if .lexer.options.comments // and .lexer.outCode.lastOriginalCodeComment<.lineInx
               
            var commentTo =  .lastSourceLineNum 
            if .specific has property "body"
                or .specific is instance of Grammar.IfStatement
                or .specific is instance of Grammar.WithStatement
                or .specific is instance of Grammar.ForStatement
                or .specific is instance of Grammar.CaseStatement
                    commentTo =  .sourceLineNum 

            .outSourceLinesAsComment commentTo

            //.lexer.outCode.lastOriginalCodeComment = commentTo

Each statement in its own line

        if .specific isnt instance of Grammar.SingleLineBody
          .lexer.outCode.ensureNewLine

if there are one or more 'into var x' in a expression in this statement, 
declare vars before the statement (exclude body of FunctionDeclaration).
Also declare __orXX temp vars to implement js || behavior.

        this.callOnSubTree LiteCore.getSymbol('declareIntoVar'), excludeClass=Grammar.Body

call the specific statement (if,for,print,if,function,class,etc) .produce()

        var mark = .lexer.outCode.markSourceMap(.indent)
        .specific.produce

add ";" after the statement

        if not .specific.skipSemiColon
          .addSourceMap mark
          .out ";",NL

helper method to determine if a statement is a declaration (can be outside a funcion in "C")
or a "statement" (must be inside a funcion in "C")

      helper method isDeclaration returns boolean
        return .specific is instance of Grammar.ClassDeclaration
            or .specific is instance of Grammar.FunctionDeclaration
            or .specific.constructor in [
                    Grammar.ImportStatement
                    Grammar.DeclareStatement
                    Grammar.CompilerStatement
                    ]

        //Note: Do not include Grammar.VarStatement, because it is handled as 3 separated statements
        // a [extern declaration], a module level declaration, and the initialization at __moduleInit
        // if it has initialization, it is "executable"


      helper method isExecutableStatement returns boolean
        return not .isDeclaration()


    append to class Grammar.Oper

      method declareIntoVar()

called above, pre-declare vars from 'into var x' assignment-expression
and also "__orX" vars to emulate js's || operator behavior.

.intoVar values:
- '*r' means use .right operaand (used for "into x")
- anything else is the var name to declare

        var varName = .intoVar

        if varName
            if varName is '*r', varName = .right
            .out "var ",varName,"=undefined;",NL


---------------------------------
### append to class Grammar.ThrowStatement ###

      method produce()
          if .specifier is 'fail'
            .out "throw(new(Error,1,(any_arr){",.expr,"}));"
          else
            .out "throw(",.expr,")"


### Append to class Grammar.ReturnStatement ###

      method produce()
        var funcDecl = .getParent(Grammar.FunctionDeclaration)
        var defaultReturn = funcDecl.constructor is Grammar.ConstructorDeclaration? '' else 'undefined'

we need to unwind try-catch blocks, to calculate to which active exception frame
we're "returning" to

        var countTryBlocks = 0
        var node:ASTBase = this.parent
        do until node instance of Grammar.FunctionDeclaration

            if node.constructor is Grammar.TryCatch
                //a return inside a "TryCatch" block
                countTryBlocks++ //we need to explicitly unwind

            node = node.parent
        loop 

we reached function header here.
if the function had a ExceptionBlock, we need to unwind
because an auto "try{" is inserted at function start

        declare node:Grammar.FunctionDeclaration
        if node.hasExceptionBlock, countTryBlocks++ 

        if countTryBlocks
            .out "{e4c_exitTry(",countTryBlocks,");"

        .out 'return ',.expr or defaultReturn

        if countTryBlocks
            .out ";}"


### Append to class Grammar.FunctionCall ###

      method produce() 

Check if varRef "executes" 
(a varRef executes if last accessor is "FunctionCall" or it has --/++)

if varRef do not "executes" add "FunctionCall", 
so varRef production adds (), 
and C/JS executes the function call

        if no .varRef.executes, .varRef.addAccessor new Grammar.FunctionAccess(.varRef)

        var result = .varRef.calcReference()
        .out result


### append to class Grammar.Operand ###

`Operand:
  |NumberLiteral|StringLiteral|RegExpLiteral
  |ParenExpression|ArrayLiteral|ObjectLiteral|FunctionDeclaration
  |VariableRef

A `Operand` is the left or right part of a binary oper
or the only Operand of a unary oper.

      properties
        produceType: string 

      method produce()

        if .accessors and .name isnt instance of Grammar.NumberLiteral 
            .sayErr "accessors on Literals or ParenExpressions not supported for C generation"

        var pre,post

        if .name instance of Grammar.StringLiteral
            declare .name:Grammar.StringLiteral
            // in C we only have "" to define strings, '' are for char constants
            // if the StringLiteral is defined with '', change to "" and escape all internal \"
            var strValue:string = .name.name
            if strValue.charAt(0) is "'"
                strValue = .name.getValue() // w/o quotes
                strValue = strValue.replaceAll("\"",'\\"') // escape internal " => \"
                strValue = '"#{strValue}"' // enclose in ""

            if strValue is '""' 
                .out "any_EMPTY_STR"
            else if .produceType is 'Number' and (strValue.length is 3 or strValue.charAt(1) is '/' and strValue.length is 4) //a single char (maybe escaped)
                .out "'", strValue.slice(1,-1), "'" // out as C 'char' (C char = byte, a numeric value)
            else
                .out "any_LTR(",strValue,")"

            //out .accessors

        else if .name instance of Grammar.NumberLiteral

            if .produceType is 'any'
                pre="any_number("
                post=")"

            .out pre,.name, post //.accessors,post

        else if .name instance of Grammar.VariableRef
            declare .name:Grammar.VariableRef
            .name.produceType = .produceType
            .out .name

        else if .name instance of Grammar.ParenExpression
            declare .name:Grammar.ParenExpression
            .name.expr.produceType = .produceType
            .out '(', .name.expr, ')', .accessors

        else //other
            .out .name, .accessors

        end if

      #end Operand


### append to class Grammar.UnaryOper ###

`UnaryOper: ('-'|new|type of|not|no|bitwise not) `

A Unary Oper is an operator acting on a single operand.
Unary Oper inherits from Oper, so both are `instance of Oper`

Examples:
1) `not`     *boolean negation*     `if not a is b`
2) `-`       *numeric unary minus*  `-(4+3)`
3) `new`     *instantiation*        `x = new classNumber[2]`
4) `type of` *type name access*     `type of x is classNumber[2]` 
5) `no`      *'falsey' check*       `if no options then options={}` 
6) `~`       *bit-unary-negation*   `a = ~xC0 + 5`

      method produce() 
        
        var translated = operTranslate(.name)
        var prepend,append

Consider "not": 
if it is "boolean not", add parentheses, because js has a different precedence for "boolean not"
-(prettier generated code) do not add () for simple "falsey" variable check: "if no x"

        if translated is "!" 
            if not (.name is "no" and .right.name instanceof Grammar.VariableRef)
                prepend ="("
                append=")"

Special cases

        var pre,post

        if translated is "new" and .right.name instance of Grammar.VariableRef
            declare .right.name:Grammar.VariableRef

hacked optimization, when parameter is ObjectLiteral: {name:value}:
instead of producing: `new(X,1,new(map(new(nvp... ` wich is slow (calls to getSymbol),
produce a call to `_fastNew(X,n,prop,value,prop,value)... `

conditions: when you call: new Foo({bar:1,baz:2})

            var fastNewProduced = false;

            var newArg:Grammar.VariableRef = .right.name //argument to "new", e.g.: "ClasX({a:1,b:2)"

            if newArg.accessors.length > 0 and newArg.accessors[newArg.accessors.length-1] instanceof Grammar.FunctionAccess
                var ac:Grammar.FunctionAccess = newArg.accessors[newArg.accessors.length-1]
                if ac.args and ac.args.length is 1 and ac.args[0].expression.operandCount is 1

                    var objLit:Grammar.ObjectLiteral = ac.args[0].expression.root.name
                    if objLit instanceof Grammar.ObjectLiteral

                        //OK here we can use _fastNew
                        .out objLit.calcFastNew(newArg.calcPropAccessOnly())
                        fastNewProduced = true
            end if

            if not fastNewProduced // then produce a "standard" call to new()
                .out "new(", newArg.calcReference(callNew=true)

            return

        if translated is "typeof" 
            pre="_typeof("
            translated=""
            post=")"

        else
            if .produceType is 'any'
                if translated is "!"  //result of ! (not) is type:bool (true|false)
                    pre = 'any_bool('
                    post = ")"
                else
                    pre="any_number("
                    post=")"

            .right.produceType = translated is "!"? 'Bool' else 'Number' //Except "!", unary opers require numbers

        end if

//add a space if the unary operator is a word. Example `typeof`
//            if /\w/.test(translated), translated+=" "

        .out pre, translated, prepend, .right, append, post


### append to class Grammar.Oper ###

      properties
          produceType: string

      method produce()

        var oper = .name

Discourage string concat using '+':

+, the infamous js string concat. You should not use + to concat strings. use string interpolation instead.
e.g.: DO NOT: `stra+": "+strb`   DO: `"#{stra}: #{strb}"`

        if oper is '+'
            var lresultNameDecl = .left.getResultType() 
            var rresultNameDecl = .right.getResultType() 
            if (lresultNameDecl and lresultNameDecl.hasProto('String'))
                or (rresultNameDecl and rresultNameDecl.hasProto('String'))
                    .sayErr """
                            You should not use + to concat strings. use string interpolation instead.
                            e.g.: DO: "#\{stra}: #\{strb}"  vs.  DO NOT: stra + ": " + strb
                            """

        var toAnyPre, toAnyPost
        if .produceType is 'any' 
            toAnyPre = 'any_number('
            toAnyPost = ")"

default mechanism to handle 'negated' operand

        var prepend,append
        if .negated # NEGATED

else -if NEGATED- we add `!( )` to the expression

            prepend ="!("
            append=")"

Check for special cases: 

1) 'in' operator, requires swapping left and right operands and to use `.indexOf(...)>=0`
example: `x in [1,2,3]` -> `indexOf(x,_literalArray(1,2,3))>=0`
example: `x not in [1,2,3]` -> `indexOf(x,_literalArray(1,2,3))==-1`
example: `char not in myString` -> `indexOf(char,myString)==-1`

        case .name 
          when 'in':
            if .right.name instanceof Grammar.ArrayLiteral
                var haystack:Grammar.ArrayLiteral = .right.name
                .out toAnyPre,prepend,"__inLiteralArray(",.left,",",haystack.items.length,",(any_arr){",{CSL:haystack.items},"})",append,toAnyPost
            else
                .out toAnyPre,"__byteIndex(",.left,",",.right,")", .negated? "==-1" : ">=0",toAnyPost

2) *'has property'* operator
js => requires swapping left and right operands and to use js's: `in`
Lite-C => use Object.hasProperty(left,1,(any_arr){right}) which mimics js's "in"

          when 'has property':
            .out toAnyPre,prepend,"_hasProperty(",.left,",",.right,")",append,toAnyPost
            //.throwError "NOT IMPLEMENTED YET for C"
            //.out toAnyPre,"indexOf(",.right,",1,(any_arr){",.left,"}).value.number", .negated? "==-1" : ">=0",toAnyPost

3) *'into'* operator (assignment-expression), requires swapping left and right operands and to use: `=`

          when 'into':
            if .produceType and .produceType isnt 'any', .out '_anyTo',.produceType,'('
            .left.produceType='any'
            .out "(",.right,"=",.left,")"
            if .produceType and .produceType isnt 'any', .out ')'

4) *instanceof* use core _instanceof(x,y)

          when 'instance of':
            .left.produceType = 'any'
            .right.produceType = 'any'
            .out toAnyPre,prepend,'_instanceof(',.left,',',.right,')',append,toAnyPost

4b) *'like'* operator (RegExp.test), requires swapping left and right operands and to use js: `.test()`

          when 'like':
            .throwError "like not supported yet for C-production"
            //.out toAnyPre,prepend,'RegExp_test(',.left,',"',.right,'")',append,toAnyPost

5) equal comparisions require both any

          when 'is':
            .left.produceType = 'any'
            .right.produceType = 'any'
            .out toAnyPre,.negated?'!':'', '__is(',.left,',',.right,')',toAnyPost

6) js's '||' operator returns first expression if "thruthy", second expression is first is "falsey"
   so it can be used to set a default value if first value is "falsey" i.e: undefined,0,null or ""

   C's '||' operator, returns 1 or 0 (not the first expression or the second. Expressions are discarded in C's ||)

 We'll use a ternary operator to emulate js behavior

code js "||" in C, using ternary if ?:                
js: `A || B` 
C: `any __or1;`
   `(_anyToBool(__or1=A)? __or1 : B)`

          when 'or':
            .lexer.outCode.orTempVarCount++

            .left.produceType = 'any'
            .right.produceType = 'any'
            if .produceType and .produceType isnt 'any', .out '_anyTo',.produceType,'('
            
            .out '(_anyToBool(', .intoVar,'=',.left,')? ',.intoVar,' : ',.right,')'

            if .produceType and .produceType isnt 'any', .out ')'

modulus is only for integers. for doubles, you need fmod (and link the math.lib)
we convert to int, as js seems to do.

          when '%',"<<",">>","bitand","bitor","bitxor":
            if .produceType and .produceType isnt 'Number', .out 'any_number('
            .left.produceType = 'Number'
            .right.produceType = 'Number'
            .out '(int64_t)',.left,' ',operTranslate(oper),' (int64_t)',.right
            if .produceType and .produceType isnt 'Number', .out ')'

string concat: & 

          when '&':
            if .produceType is 'Number', .throwError 'cannot use & to concat and produce a number'
            .left.produceType = 'any'
            .right.produceType = 'any'
            .out "_concatAny(2,",.left,',',.right,')'

else we have a direct translatable operator. 
We out: left,operator,right

          else

            var operC = operTranslate(oper) 
            case operC

                when '?': // left is condition, right is: if_true
                    .left.produceType = 'Bool'
                    .right.produceType = .produceType

                when ':': // left is a?b, right is: if_false
                    .left.produceType = .produceType
                    .right.produceType = .produceType

                when '&&': // boolean and
                    .left.produceType = 'Bool'
                    .right.produceType = 'Bool'

                else // a+b  a>=b  a<b 
                     //default for two-operand operators: numbers
                    .left.produceType = 'Number'
                    .right.produceType = 'Number'

            var extra, preExtra

            if operC isnt '?' // cant put xx( a ? b )
                if .produceType is 'any' 
                    if .left.produceType is 'any' and .right.produceType is 'any'
                        do nothing
                    else
                        case operC
                            when '>','<','>=','<=','!=','==':
                                // comparision operators, result is converted to boolean
                                preExtra = 'any_bool('
                                extra = ")"
                            else
                                preExtra = 'any_number('
                                extra = ")"
                
                else if .produceType 
                    if ( .left.produceType is .produceType and .right.produceType is .produceType )
                        or ( .produceType is 'Bool' and .left.produceType is 'Number' and .right.produceType is 'Number' ) // numbers are valid bools
                        do nothing
                    else
                      preExtra = '_anyTo#{.produceType}('
                      extra = ")"

            .out preExtra, prepend, .left,' ', operC, ' ',.right, append, extra

        end case oper


### append to class Grammar.Expression ###

      properties
          produceType: string

      method produce(negated) 

Produce the expression body, optionally negated

        default .produceType='any'

        var prepend=""
        var append=""
        if negated

(prettier generated code) Try to avoid unnecessary parens after '!' 
for example: if the expression is a single variable, as in the 'falsey' check: 
Example: `if no options.logger then... ` --> `if (!options.logger) {...` 
we don't want: `if (!(options.logger)) {...` 

          if .operandCount is 1 
              #no parens needed
              prepend = "!"
          else
              prepend = "!("
              append = ")"
          #end if
        #end if negated

produce the expression body

        declare valid .root.produceType
        .root.produceType = .produceType
        .out prepend, .root, append
        //.out preExtra, prepend, .root, append, extra


### helper function makeSymbolName(symbol)
        // hack: make "symbols" avoid interference with C's reserved words
        // and also common variable names
        return "#{symbol}_"

### append to class Grammar.VariableRef ###

`VariableRef: ['--'|'++'] IDENTIFIER [Accessors] ['--'|'++']`

`VariableRef` is a Variable Reference. 

 a VariableRef can include chained 'Accessors', which can:
 *access a property of the object : `.`-> PropertyAccess `[`->IndexAccess
 *assume the variable is a function and perform a function call :  `(`-> FunctionAccess

      properties
          produceType: string 
          calcType: string // 'any','Number','Bool','**native number**'

      method produce() 

Prefix ++/--, varName, Accessors and postfix ++/--

        if .name is 'arguments'
            .out '_newArray(argc,arguments)'
            return

        var result = .calcReference()
        var pre,post

if what is required is what is referenced, do nothing

        if .produceType is .calcType 
            do nothing 

else, if we require 'any' but the variable ref is referencing something else...

        if .produceType is 'any' and not .calcType is 'any'
            if .calcType is 'functionPtr'
                pre = 'any_func('
            else
                //assume returnes is number|native number
                pre = 'any_number('
            end if
            post = ')'
        
else, if we require other than 'any' and the varRef returns 'any'...

        else if .produceType and .produceType isnt 'any' and .calcType is 'any'
            pre = '_anyTo#{.produceType}('
            post = ')'

        .out pre, result, post

##### helper method calcReference(callNew) returns array of array

        var result = .calcReferenceArr(callNew)

PreIncDec and postIncDec: ++/--

        var hasIncDec = .preIncDec or .postIncDec
        
        if hasIncDec 

            if no .calcType
                .throwError "pre or post inc/dec (++/--) can only be used on simple variables"

            if .calcType is 'any'
                result.push ['.value.number']
                .calcType = 'Number'

            else //assume number
                do nothing

        if .postIncDec
            result.push [.postIncDec]

        if .preIncDec
            result.unshift [.preIncDec]

        return result

##### helper method calcReferenceArr(callNew) returns array of array

Start with main variable name, to check property names

        var actualVar = .tryGetFromScope(.name)
        if no actualVar, .throwError("var '#{.name}' not found in scope")

        var actualType = actualVar //determines valid memebers at actual point in accesor chain analysis

*actualVar* determines the specific var at actual point in the chain analysis.
actualVar can be calculated on each [PropertyAccess] accessor, but cannot
pass a [FunctionAccess] (we dont know which instance the fn will return)
or a [IndexAccess] (we dont evaluate the index value, neither know what is stored)


*actualType* determines the specific *type* at actual point in the chain analysis.
actualType follows actualVar (is the same) during [PropertyAccess], but, unlike actualVar
is able to pass a [FunctionAccess] and [IndexAccess] if typified.

if the function referenced in the [FunctionAccess] has a *result type* (at function declaration),
actualType continues with that type.

if the array referenced at [IndexAccess] has a *item type* (at array declaration),
actualType continues with that **item type**


        var result: array = [] //array of arrays

        var partial = actualVar.getComposedName()
        result.push [partial]

        .calcType = 'any' //default
        if actualVar.findOwnMember("**proto**") is '**native number**' 
            //e.g.:loop index var, is: int64_t
            .calcType = '**native number**'
        else if actualVar.nodeClass is Grammar.FunctionDeclaration
            .calcType = 'functionPtr'
        
        if no .accessors, return result

now follow each accessor

        var hasInstanceReference:boolean
        var isOk, functionAccess, args:array

        var skip= 0

        for inx=0 while inx<.accessors.length
            
            var ac = .accessors[inx]
            
            //if no actualVar
            //    .throwError("processing '#{partial}', cant follow property chain types")

##### PropertyAccess: ***.***

for PropertyAccess: `foo.bar`

            if ac instanceof Grammar.PropertyAccess

                partial ="#{partial}.#{ac.name}"

                var classNameArr:array

**.constructor**: hack, all vars have a "constructor" property.

`foo.constructor` resolves to the class-function of which foo is instance of.

compile-to-c: convert "bar.constructor" into: "any_class(bar.class)"

                if ac.name is 'constructor' 

                    result.unshift ['any_class(']
                    // here goes anyClass var
                    result.push [".class)"]
                    
                    .calcType = 'any'
                    hasInstanceReference=true

                    if actualVar
                        actualVar = actualVar.findOwnMember('**proto**')
                        //now we're referencig the Class

                    actualType = actualVar //actualtype follows actualVar on [PropertyAccess]


**.prototype**: hack, all classes have a "prototype" property to access methods.

compile-to-c: convert "Foo.prototype.slice" into: "__classMethodAny(slice_,Foo)" :returns any

                else if ac.name is 'prototype'

                    if inx+1 >= .accessors.length or .accessors[inx+1].constructor isnt Grammar.PropertyAccess
                        .sayErr "expected: Class.prototype.method, e.g.: 'Foo.prototype.toString'"
                        return result

                    classNameArr = result.pop()
                    classNameArr.unshift '__classMethodFunc(',.accessors[inx+1].name,"_ ," //__classMethodFunc(methodName,
                    // here goes any class
                    classNameArr.push ")"
                    result.push classNameArr //now converted to any Function
                    inx+=1 //skip method name

                    .calcType = 'any' // __classMethodFunc() returns any_func
                    hasInstanceReference = true

                    if actualVar 
                        actualVar = actualVar.findMember(.accessors[inx+1].name) 
                        //move to method
                    
                    actualType = actualVar //actualtype follows actualVar on [PropertyAccess]

 hack, convert x.length in a funcion call, _length(x)

                else if ac.name is 'length'
                    result.unshift ['_length','('] // put "_length(" first
                    result.push [")"]

                    .calcType = '**native number**'
                    actualVar = undefined
                    actualType = undefined 


hack: *.call(...)*

convert .call(...) to  __apply(Function,instance,argc,arguments)

                else if ac.name is 'call' 

                    //should be here after Class.prototype.xxx.call
                    // or foo.call(...) when foo:Function
                    if no actualType or no actualType.findMember('call')
                        .sayErr "#{partial}: #{actualType? actualType.info(): '-no actual Type-'}"
                        .throwError 'cannot use .call on a non-Function. Use: Class.prototype.method.call(this,arg1,...)'

                    //let's make sure next accessor is FunctionAccess with at least one arg
                    isOk=false

                    if inx+1<.accessors.length 
                        if .accessors[inx+1].constructor is Grammar.FunctionAccess
                            functionAccess=.accessors[inx+1]
                            if functionAccess.args and functionAccess.args.length >= 1
                                isOk=true

                    if not isOk, .throwError 'expected instance and optional arguments after ".call": foo.call(this,arg1,arg2)'
                    
                    args = functionAccess.args

                    result.unshift ['__apply(']
                    // - here goes Function name reference
                    var FnArr = [","] 
                    functionAccess.pushArgumentsTo FnArr,actualVar //add arguments
                    FnArr.push ')'

                    result.push FnArr
                    
                    //new actual type is method's return type
                    if actualVar
                        actualType = actualVar.findMember("**return type**")
                    else
                        actualType = undefined //any

                    inx+=1 //skip fn.call and args
                    actualVar = undefined //we dont know what instance the pointed function returns
                    .calcType = 'any' // all funcs returns any

hack: *.apply(x,arr[])*

convert .apply(x,arr[]) to:  __apply(Function,x,arr.length,arr.itemd)

                else if ac.name is 'apply' 

                    //should be here after Class.prototype.xxx.call
                    // or foo.call(...) when foo:Function
                    //if no actualType or no actualType.findMember('apply')
                    //    .throwError 'cannot use .apply on a non-Function. Use: Class.prototype.method.apply(this,args:Array)'

                    //let's make sure next accessor is FunctionAccess with at least one arg
                    isOk=false
                    if inx+1<.accessors.length 
                        if .accessors[inx+1].constructor is Grammar.FunctionAccess
                            functionAccess=.accessors[inx+1]
                            if functionAccess.args and functionAccess.args.length >= 2
                                isOk=true

                    if no isOk, .throwError 'expected two arguments after ".apply". e.g.: foo.apply(this,argArray)'
                    
                    args = functionAccess.args

                    result.unshift ['__applyArr(', hasInstanceReference? '': 'any_func(']
                    //here goes Function ref
                    var applyArgs = [hasInstanceReference? '': ')',',']
                    functionAccess.pushArgumentsTo applyArgs,actualVar //add arguments
                    applyArgs.push ')'
                    result.push applyArgs

                    //new actual type is method's return type
                    if actualVar
                        actualType = actualVar.findMember("**return type**")
                    else
                        actualType = undefined //any

                    inx+=1 //skip fn.call and args
                    actualVar = undefined //we dont know what does the pointed function returns
                    .calcType = 'any' // all funcs returns any


access to a namespace property or function. Implies *no* redirection. 
when compiled-to-c, namespaces are just lexical name concatenations (better performance)

                else if actualVar and ( actualVar.nodeClass is Grammar.NamespaceDeclaration //is namespace
                                        or (actualVar.nodeClass is Grammar.ClassDeclaration and ac.name isnt 'name' ) // or a class prop other than .name
                                      )

                    //just namespace access or accessing a "property" of a class "as namespace"
                    var prevArr:array = result.pop() 
                    prevArr.push "_",ac.name
                    result.push prevArr

if we're accessing a namespace function, it could be:

a) a raw C function (it is *not*: `(any){.class=Function_inx}` var)

b) a class, then *it is*: `(any){.class=Class_inx}`

on case a), we mark ".calcType" as 'functionPtr', so it can be enlosed by "any_func()" 
in case type "any" is required from this varRef

                    actualType = undefined

                    if actualVar.findMember(ac.name) into actualVar
                        //got the accessed member
                        if actualVar.nodeDeclared instanceof Grammar.FunctionDeclaration 
                            //if it is a function...
                            .calcType = 'functionPtr' //it's a raw c-function
                            actualType = undefined //it's a raw c-function
                        else
                            // a namespace property
                            .calcType = 'any'
                            actualType = actualVar //actualType follows actualVar on [PropertyAccess]

avoid evaluating as a property if the next accessor is a function call

                else if inx+1 < .accessors.length and .accessors[inx+1].constructor is Grammar.FunctionAccess

                    // if next is function access, this is a method name. just make ac.name a symbol
                    result.push [makeSymbolName(ac.name)]
                    .calcType = 'any'
                    hasInstanceReference=true
                    
                    if actualVar 
                        actualVar = actualVar.findMember(ac.name)

                    actualType = actualVar //actualType follows actualVar on [PropertyAccess]


else, normal property access. out: `propName__(instance)`. 

macro "foo__(this)" will evaluate to direct|fast access #ifdef NDEBUG, 
and a controlled|checked access otherwise 

                else

                    .calcType = 'any'
                    hasInstanceReference=true
                    result.unshift [makeSymbolName(ac.name),"_("] // foo__(this) macro enclose all 
                    // here goes thisValue (instance)
                    result.push [")"]

                    if actualVar 
                        actualVar = actualVar.findMember(ac.name)

                    actualType = actualVar //actualType follows actualVar on [PropertyAccess]

                end if // subtypes of propertyAccess


##### FunctionAccess: (...)

else, for FunctionAccess

            else if ac.constructor is Grammar.FunctionAccess

                partial ="#{partial}(...)"
                .calcType = 'any'

                functionAccess = ac

                var callParams:array

if there was a "new" unary-op: "new Foo(bar)" 
the `new Foo(bar,baz)` call translates to `new(Foo,1,[bar,baz])`

                if callNew

                    callParams = [","] // new(Class,argc,arguments*)
                    //add arguments: count,(any_arr){...}
                    functionAccess.pushArgumentsTo callParams, actualVar
                    callParams.push ")" //close 

                    // new(Foo..) result type is a Foo.prototype object
                    if actualVar 
                        actualType = actualVar.findOwnMember('prototype')
                    else
                        actualType = undefined

                    actualVar = undefined //a new instance

else, a method call

                else

Mandatory use of apply/call, 
if we're calling on the result of an IndexAccess 
or the result of a function 
or a var type:function.

                    
                    var callOnValue
                    /*
                    if inx>0 and .accessors[inx-1].constructor isnt Grammar.PropertyAccess
                        callOnValue = true 
                        // calling on: "foo[x](...)"
                        // calling on: "foo(a,b,c)(...)"

                    else if actualVar and actualVar.nodeClass not in [Grammar.FunctionDeclaration,Grammar.MethodDeclaration]
                        // calling on: "foo.prop(a,b,c)" when "prop" is  property
                        // calling on: "avar(a,b,c)" when "avar" is a scope var
                        callOnValue = true
                    */

                    if callOnValue
                        .throwError("'#{partial}: .call() or '.apply()' must be used to call a function from a 'value'")

                    var fnNameArray:array = result.pop() //take fn name 

                    if no hasInstanceReference //first accessor is function access, this is a call to a global function

                        fnNameArray.push "(" //add "(" 
                        //if fnNameArray[0] is 'Number', fnNameArray[0]='_toNumber'; //convert "Number" (class name) to fn "_toNumber"
                        result.unshift fnNameArray // put "functioname" first - call to global function

                        if fnNameArray[0] is '_concatAny'
                            callParams =[] // no "thisValue" for internal _concatAny, just params to concat
                            //add arguments: count,...
                            functionAccess.pushArgumentsTo callParams, actualVar, skipAnyArr=true
                        else
                            callParams = ["undefined", ","] //this==undefined as in js "use strict" mode
                            //add arguments: count,(any_arr){...}
                            functionAccess.pushArgumentsTo callParams, actualVar

                        callParams.push ")" //close function(undefined,arg,any* arguments)

                    else
                        //method call

                        // DISABLED-
                        //to ease C-code reading, use macros CALL1 to CALL4 if possible
                        if false /*functionAccess.args and functionAccess.args.length<=4*/

                            // __call enclose all
                            fnNameArray.unshift "CALL#{functionAccess.args.length}(" 
                            // here goes methodName
                            fnNameArray.push "," // CALLn(symbol_ *,*
                            // here: instance reference as 2nd param (this value)
                            result.unshift fnNameArray //prepend CALLn(method_,instanceof,...
                            callParams = functionAccess.args.length? [","] else []
                            callParams.push {CSL:functionAccess.args}

                        else 

                            /* commented: use of macros CALL1..4
                            // METHOD()(... ) enclose all
                            fnNameArray.unshift "METHOD(" 
                            // here goes methodName
                            fnNameArray.push "," // __call(symbol_ *,*
                            // here: instance reference as 2nd param (this value)
                            result.unshift fnNameArray //prepend __call(methodName, ...instanceof
                            //options.validations.push ["assert("].concat(callParams,".type>TYPE_NULL);")
                            callParams = [")("]
                            */
                            var simpleVar = result.length is 1 and result[0].length is 1
                            if simpleVar
                                var simpleVarName = result[0][0]
                                // METHOD()(... ) enclose all
                                fnNameArray.unshift ["METHOD("]
                                // here goes methodName
                                fnNameArray.push ","
                                result.unshift fnNameArray
                                // here: 1st instance reference 
                                result.push [")(",simpleVarName] // METHOD(symbol_,this)(this
                                //options.validations.push ["assert("].concat(callParams,".type>TYPE_NULL);")
                                callParams = [","]
        
                            else
                                // __call() enclose all
                                fnNameArray.unshift "__call(" 
                                // here goes methodName
                                fnNameArray.push "," // __call(symbol_ *,*
                                // here: instance reference as 2nd param (this value)
                                result.unshift fnNameArray //prepend __call(methodName, ...instanceof
                                //options.validations.push ["assert("].concat(callParams,".type>TYPE_NULL);")
                                callParams = [","]
                            end if

                            //add arguments: count,(any_arr){...}
                            functionAccess.pushArgumentsTo callParams, actualVar
                            callParams.push ")" //close 

                        end if
                
                    end if //global fn or method

                    // foo(...) 
                    // new actual type is method's return type
                    if actualVar
                        actualType = actualVar.findMember("**return type**")
                    else
                        actualType = undefined //any

                    actualVar = undefined // we cannot know return instance

                
                end if //new x() or x()

                result.push callParams


##### IndexAccess: [...]

else, for IndexAccess, the varRef type is now 'name.value.item[...]'
and next property access should be on members type of the array

            else if ac.constructor is Grammar.IndexAccess
                
                partial ="#{partial}[...]"

                .calcType = 'any'

                declare ac:Grammar.IndexAccess

                //ac.name is a Expression
                ac.name.produceType = 'Number'

                //add macro ITEM(array,index)
                //macro ITEM() encloses all 
                result.unshift ["ITEM(" ]
                // here goes instance
                result.push [",",ac.name,")"]

                if actualVar 
                    actualType = actualVar.findMember('**item type**')
                    if no actualVar.hasProto("Array"), .sayErr "#{partial} is not Array"
                else
                    actualType = undefined

                actualVar = undefined // we cannot know return instance

            end if //type of accessor

        end for #each accessor

        return result


##### helper method calcPropAccessOnly() returns array 

Start with main variable name, upto functionAccess or indexAccess

        var actualVar = .tryGetFromScope(.name)
        if no actualVar, .throwError("var '#{.name}' not found in scope")

        var result: array = []

        var partial = actualVar.getComposedName()
        result.push partial

        if no .accessors, return result

now follow each PropertyAccess

        for each inx,ac:Grammar.PropertyAccess in .accessors

            if ac isnt instanceof Grammar.PropertyAccess, return result

            partial ="#{partial}.#{ac.name}"

access to a namespace property or function. Implies *no* redirection. 
when compiled-to-c, namespaces are just lexical name concatenations (better performance)

            if actualVar and ( actualVar.nodeClass is Grammar.NamespaceDeclaration //is namespace
                                    or (actualVar.nodeClass is Grammar.ClassDeclaration and ac.name isnt 'name' ) // or a class prop other than .name
                                  )

                    //just namespace access or accessing a "property" of a class "as namespace"
                    result.push "_",ac.name

else, normal property access. out: `propName__(instance)`. 

macro "PROP" will evaluate to direct|fast access #ifdef NDEBUG, 
and a controlled|checked access otherwise 

            else

                result.unshift makeSymbolName(ac.name),"_("  // foo__() macro enclose all 
                // here goes thisValue (instance)
                result.push ")"

            end if

            if actualVar 
                actualVar = actualVar.findMember(ac.name)

        end loop


### Append to class Grammar.FunctionAccess

##### helper method pushArgumentsTo(callParams:array, actualVar:Names.Declaration, skipAnyArr:boolean)

        var composedArgs=.composeArgumentsList(actualVar)

        if no composedArgs or no .args
            callParams.push "0,NULL"
        else
            callParams.push 
                "#{.args.length}," 
                skipAnyArr? '' else "(any_arr){"
                {CSL:composedArgs}
                skipAnyArr? '' else "}"


/*
##### helper method calcParam2(inx, fnParams:Grammar.FunctionParameters) returns array

optional fnParams contains the parameter declaration from the Function Declaration, to validate type

        var expr = .expression 

        if expr.operandCount is 1 and expr.root.name instanceof Grammar.ObjectLiteral

            //Here we have a ObjectLiteral argument
            var objLit:Grammar.ObjectLiteral = expr.root.name

find the FunctionDeclaration for the function we're calling

            var funcDecl: Grammar.FunctionDeclaration = actualVar.nodeDeclared

check if the function defines a "class" for this parameter, 
so we produce a _fastNew() call creating a instance on-the-fly 
as function argument, thus emulating js common usage pattern of options:Object as parameter 

            if actualVar 

                if actualVar.nodeDeclared instanceof Grammar.FunctionDeclaration
                    funcDecl = actualVar.nodeDeclared

                else if actualVar.nodeDeclared.constructor is Grammar.ClassDeclaration
                    // we're calling the constructor of a class 
                    declare actualVar.nodeDeclared:Grammar.ClassDeclaration
                    funcDecl = actualVar.nodeDeclared.constructorDeclaration
                    if no funcDecl //if there's no explicit constructor
                        // the default constructor accepts a initialization object
                        return objLit.calcFastNew(actualVar.getComposedName())

Here funcDecl is: function or method

                if no funcDecl.paramsDeclarations or no funcDecl.paramsDeclarations.list.length
                    if no funcDecl.paramsDeclarations.variadic
                        .sayErr "#{funcDecl.specifier} #{funcDecl.nameDecl} takes no arguments"
                        funcDecl.sayErr "function declaration is here"

                else 
                    var definedArgs = funcDecl.paramsDeclarations.list.length                
                    var paramVarDecl
                    if inx<definedArgs
                        paramVarDecl = funcDecl.paramsDeclarations.list[inx]
                    else 
                        paramVarDecl = undefined
                        if no funcDecl.paramsDeclarations.variadic
                                .sayErr "#{funcDecl.specifier} #{funcDecl.nameDecl} accepts only #{definedArgs} arguments"
                                funcDecl.sayErr "function declaration is here"

                    if paramVarDecl and paramVarDecl.nameDecl
                        var paramDeclClass = paramVarDecl.nameDecl.findMember("**proto**")
                        if paramDeclClass and paramDeclClass.name is 'prototype' 
                            paramDeclClass = paramDeclClass.parent
                            if paramDeclClass.name not in ['Object','Map']
                                if paramDeclClass.nodeDeclared.constructor is Grammar.ClassDeclaration

                                    //Here we have a ObjectLiteral argument for a type:class parameter
                                    //so we can use _fastNew to instantiate the class
                                    return objLit.calcFastNew(paramDeclClass.getComposedName())

else, just return argument expression

        return [expr]
*/


### append to class Grammar.AssignmentStatement ###

      method produce() 

        var extraLvalue='.value.number'
        if .lvalue.tryGetReference() into var nameDecl
            and nameDecl.findOwnMember('**proto**') is '**native number**'
                extraLvalue=undefined

        var oper = operTranslate(.name)
        case oper
            when "+=","-=","*=","/=":

                if oper is '+='
                    var rresultNameDecl = .rvalue.getResultType() 
                    if (nameDecl and nameDecl.hasProto('String'))
                        or (rresultNameDecl and rresultNameDecl.hasProto('String'))
                            .sayErr """
                                You should not use += to concat strings. use string concat oper: & or interpolation instead.
                                e.g.: DO: "a &= b"  vs.  DO NOT: a += b
                                """

                .rvalue.produceType = 'Number'
                .out .lvalue,extraLvalue,' ', oper,' ',.rvalue

            when "&=": //string concat
                .rvalue.produceType = 'any'
                .out .lvalue, '=', "_concatAny(2,",.lvalue,',',.rvalue,')'

            else
                .rvalue.produceType = 'any'
                .out .lvalue, ' ', operTranslate(.name), ' ' , .rvalue

-------
### append to class Grammar.DefaultAssignment ###

      method produce() 

        .process(.assignment.lvalue, .assignment.rvalue)

        .skipSemiColon = true

#### helper Functions

      #recursive duet 1
      helper method process(name,value)

if it is ObjectLiteral: recurse levels, else, a simple 'if undefined, assignment'

check if it's a ObjectLiteral (level indent)

          if value instanceof Grammar.ObjectLiteral
            .processItems name, value # recurse Grammar.ObjectLiteral

else, simple value (Expression)

          else
            .assignIfUndefined name, value # Expression


      #recursive duet 2
      helper method processItems(main, objectLiteral) 

          .throwError "default for objects not supported on C-generation"
          /*
          .out "_defaultObject(&",main,");",NL

          for each nameValue in objectLiteral.items
            var itemFullName = [main,'.',nameValue.name]
            .process(itemFullName, nameValue.value)
          */
    
    #end helper recursive functions

-----------

### Append to class Grammar.WithStatement ###

`WithStatement: with VariableRef Body`

The WithStatement simplifies calling several methods of the same object:
Example:
```    
with frontDoor
    .show
    .open
    .show
    .close
    .show
```
to js:
```
var with__1=frontDoor;
  with__1.show;
  with__1.open
  with__1.show
  with__1.close
  with__1.show
```

      method produce() 

        .out "var ",.nameDecl.getComposedName(),'=',.varRef,";"
        .out .body



---

### Append to class Names.Declaration ###

      method addToAllProperties

        var name = .name
        if name not in coreSupportedProps and not allClassProperties.has(name) 
            if allMethodNames.has(name)
                .sayErr "Ambiguity: A method named '#{name}' is already defined. Cannot reuse the symbol for a property"
                allMethodNames.get(name).sayErr "declaration of method '#{name}'"
            else if name in coreSupportedMethods
                .sayErr "'#{name}' is declared in as a core method. Cannot use the symbol for a property"
            else
                allClassProperties.set name, this

### Append to class Grammar.VarDeclList ###

      method addToAllProperties
        for each varDecl in .list
            varDecl.nameDecl.addToAllProperties

### Append to class Grammar.VarStatement ###
'var' followed by a list of comma separated: var names and optional assignment

/*##### method produceHeader

        if .hasAdjective('export')
            var prefix = .list[0].nameDecl.getComposedPrefix() // same prefix for all
            .out 'extern var ',{pre:prefix, CSL:.getNames()},";",NL
*/

##### method produce

        .out 'var ',{CSL:.list, freeForm:1}


### Append to class Grammar.VariableDecl ###

variable name and optionally assign a value

      method produce
        .out .name,' = ', .assignedValue or 'undefined'

### Append to class Grammar.ImportStatement ###

'import' followed by a list of comma separated: var names and optional assignment

      method produce() 

        //for each item in .list
        //    .out '#include "', item.getRefFilename('.h'),'"', NL

        .skipSemiColon = true


### Append to class Grammar.SingleLineBody ###

      method produce()
        
        var bare=[]
        for each item in .statements
            bare.push item.specific

        .out {CSL:bare, separator:","}


### Append to class Grammar.IfStatement ###

      method produce() 

        declare valid .elseStatement.produce
        .conditional.produceType = 'Bool'
        .out "if (", .conditional,") "

        if .body instanceof Grammar.SingleLineBody
            .out '{',.body,';}' // note: added ";" before closing block 
        else
            //multiline body
            .out " {",NL // .getEOLComment()
            .out .body, "}"
        
        if .elseStatement
            .elseStatement.outSourceLinesAsComment
            .elseStatement.produce()


### Append to class Grammar.ElseIfStatement ###

      method produce() 

        .outSourceLinesAsComment

        .out NL,"else ", .nextIf

### Append to class Grammar.ElseStatement ###

      method produce()

        .outSourceLinesAsComment

        .out NL,"else {", .body, "}"

### Append to class Grammar.ForStatement ###

There are 3 variants of `ForStatement` in LiteScript

      method produce() 

        declare valid .variant.produce
        .variant.produce()

Since al 3 cases are closed with '}; //comment', we skip statement semicolon

        .skipSemiColon = true


### Append to class Grammar.ForEachProperty
### Variant 1) 'for each property' to loop over *object property names* 

`ForEachProperty: for each property [name-IDENTIFIER,]value-IDENTIFIER in this-VariableRef`

      method produce() 

=> C:  for(inx=0;inx<obj.getPropertyCount();inx++){ 
            value=obj.value.prop[inx]; name=obj.getPropName(inx); 
        ...

Create a default index var name if none was provided

        .out "{" //enclose defined temp vars in their own scope

        var listName, uniqueName = UniqueID.getVarName('list')  #unique temp listName var name
        declare valid .iterable.root.name.hasSideEffects
        if .iterable.operandCount>1 or .iterable.root.name.hasSideEffects or .iterable.root.name instanceof Grammar.Literal
            listName = uniqueName
            .out "any ",listName,"=",.iterable,";"
        else
            listName = .iterable

create a var holding object property count

        .out "len_t __propCount=_length(",listName,');'

        var startValue = "0"
        var intIndexVarName = '#{.valueVar.name}__inx';

        if .keyIndexVar 
            .out " any ",.keyIndexVar.name,"=undefined;"

        .out " any ",.valueVar.name,"=undefined;", NL

        .out 
            "for(int __propIndex=", startValue
            " ; __propIndex < __propCount"
            " ; __propIndex++ ){", NL
            

        // loop vars assignment block
        .body.out "_nameValuePair_s _nvp = _unifiedGetNVPAtIndex(",listName,", __propIndex);",NL
        .body.out .valueVar.name,"= _nvp.value;"
        if .keyIndexVar
            .body.out .keyIndexVar.name,"= _nvp.name;"
        .body.out NL

        if .where 
          .out '  ',.where,"{",.body,"}"
        else 
          .out .body

        .out "}};",{COMMENT:["end for each property in ",.iterable]},NL

### Append to class Grammar.ForEachInArray
### Variant 2) 'for each index' to loop over *Array indexes and items*

`ForEachInArray: for each [index-VariableDecl,]item-VariableDecl in array-VariableRef`

####  method produce()

Create a default index var name if none was provided

vars declaration code in a bracket block to contain scope

        .out 
            "{",NL

Determine type for loop var indexNameVar

/*        var nameIndexType, valueType
        if .iterable.root.name instanceof Grammar.ArrayLiteral
            or .iterable.root.name instanceof Grammar.StringLiteral
                nameIndexType='**native number**'
*/

Check if we can use the iterable as it is, or we need to create a temp var

/*        var listName

        if .iterable.operandCount>1 or .iterable.root.name.hasSideEffects or .iterable.root.name instanceof Grammar.Literal
            listName = UniqueID.getVarName('list')  #unique temp listName var name
            .out "var ",listName,"=",.iterable,";",NL
        else
            //simple var
            listName = .iterable
*/       

check if a intIndexVarName was specified: `for each inx,name,value in iterable`

        //var intIndexVarName
        //var startValue = "0"
        if .intIndexVar 
            .intIndexVar.nameDecl.setMember '**proto**','**native number**'
            //intIndexVarName = .intIndexVar.name
            //startValue = .intIndexVar.assignedValue or "0"
        //else
        //    intIndexVarName = '#{.valueVar.name}__inx';

check if a nameIndexVarName was specified: `for each name,value in iterable`

        //var keyVarName
        //if .keyIndexVar
        //    keyVarName = .keyIndexVar.name
        //else
        //    keyVarName = '#{.valueVar.name}__name';


list of declared vars

        var loopVars = []
        if .intIndexVar, loopVars.push .intIndexVar.name
        if .keyIndexVar, loopVars.push .keyIndexVar.name
        loopVars.push .valueVar.name

declare loop vars & Iterable.Position

        .out "var ",{CSL:loopVars},", iter=_newIterPos(",.iterable,");",NL

start loop, calling _iterNext() assigning values to loop vars (up to three)

        .out "for(;_iterNext(iter, &",.valueVar.name

        if .keyIndexVar 
            .out ", &",.keyIndexVar.name
        else
            .out ", NULL"

        if .intIndexVar
            .out ", &",.intIndexVar.name
        else
            .out ", NULL"

        .out ");){",NL

out filter and body

        if .where 
            .out '  ',.where,"{",.body,"}" //filter condition
        else 
            .out .body

        .out "}};",{COMMENT:"end for each loop"},NL

/*
Create a default index var name if none was provided

        var listName
        listName = UniqueID.getVarName('list')  #unique temp listName var name
        .out "any ",listName,"=",.iterable,";",NL

        if .isMap
            return .produceForMap(listName)

        var intIndexVarName
        var startValue = "0"
        if .keyIndexVar 
            .keyIndexVar.nameDecl.members.set '**proto**','**native number**'
            intIndexVarName = .keyIndexVar.name
            startValue = .keyIndexVar.assignedValue or "0"
        else
            intIndexVarName = '#{.valueVar.name}__inx';

include valueVar.name in a bracket block to contain scope

        .out "{ var ",.valueVar.name,"=undefined;",NL

        .out 
            "for(int ", intIndexVarName,"=", startValue
            " ; ",intIndexVarName,"<",listName,".value.arr->length"
            " ; ",intIndexVarName,"++){"

        .body.out .valueVar.name,"=ITEM(",listName,",",intIndexVarName,");",NL

        if .where 
            .out '  ',.where,"{",.body,"}" //filter condition
        else 
            .out .body

        .out "}};",{COMMENT:"end for each in"},NL


####  method produceForMap(listName)

        .out 
            "{" //enclose in a block to limit scope of loop vars
            "NameValuePair_ptr __nvp=NULL; //name:value pair",NL
            "int64_t __len=MAPSIZE(",listName,"); //how many pairs",NL
            
        if .keyIndexVar, .out "var ",.keyIndexVar.name,"=undefined; //key",NL 
        .out "var ",.valueVar.name,"=undefined; //value",NL

        .out 
            "for(int64_t __inx=0"
            " ; __inx < __len"
            " ; __inx++ ){",NL

        .body.out "__nvp = MAPITEM( __inx,",listName,");",NL //get nv pair ptr
        if .keyIndexVar, .body.out .keyIndexVar.name,"= __nvp->name;",NL //get key
        .body.out .valueVar.name,"= __nvp->value;",NL //get value

        if .where 
          .out '  ',.where,"{",.body,"}" //filter condition
        else 
          .out .body

        .out "}};",{COMMENT:"end for each in map"},NL
*/

### Append to class Grammar.ForIndexNumeric
### Variant 3) 'for index=...' to create *numeric loops* 

`ForIndexNumeric: for index-VariableDecl [","] (while|until|to|down to) end-Expression ["," increment-Statement] ["," where Expression]`

Examples: `for n=0 while n<10`, `for n=0 to 9`
Handle by using a js/C standard for(;;){} loop

      method produce(iterable)

        var isToDownTo: boolean
        var endTempVarName

        .endExpression.produceType='Number'

        // indicate .keyIndexVar is a native number, so no ".value.number" required to produce a number
        .keyIndexVar.nameDecl.members.set '**proto**','**native number**'

        if .keyIndexVar.assignedValue, .keyIndexVar.assignedValue.produceType='Number'

        if .conditionPrefix in['to','down']

            isToDownTo= true

store endExpression in a temp var. 
For loops "to/down to" evaluate end expresion only once

            endTempVarName = UniqueID.getVarName('end')
            .out "int64_t ",endTempVarName,"=",.endExpression,";",NL

        end if

        .out "for(int64_t ", .keyIndexVar.name,"=", .keyIndexVar.assignedValue or "0","; "

        if isToDownTo

            #'for n=0 to 10' -> for(n=0;n<=10;n++)
            #'for n=10 down to 0' -> for(n=10;n>=0;n--)
            .out .keyIndexVar.name, .conditionPrefix is 'to'? "<=" else ">=", endTempVarName

        else # is while|until

produce the condition, negated if the prefix is 'until'

            #for n=0, while n<arr.length  -> for(n=0;n<arr.length;...
            #for n=0, until n >= arr.length  -> for(n=0;!(n>=arr.length);...
            .endExpression.produceType='Bool'
            .endExpression.produce( negated = .conditionPrefix is 'until' )

        end if

        .out "; "

if no increment specified, the default is keyIndexVar++/--

        if .increment
            .out .increment //statements separated by ","
        else
            //default index++ (to) or index-- (down to)
            .out .keyIndexVar.name, .conditionPrefix is 'down'? '--' else '++'

        .out 
            "){", .body, "};" 
            {COMMENT:"end for #{.keyIndexVar.name}"}, NL



### Append to class Grammar.ForWhereFilter
### Helper for where filter
`ForWhereFilter: [where Expression]`

      method produce()

        //.outLineAsComment .lineInx
        .outSourceLinesAsComment

        .filterExpression.produceType='Bool'
        .out 'if(',.filterExpression,')'

### Append to class Grammar.DeleteStatement
`DeleteStatement: delete VariableRef`

      method produce()
        .out 'delete ',.varRef

### Append to class Grammar.WhileUntilExpression ###

      method produce(askFor:string, negated:boolean) 

If the parent ask for a 'while' condition, but this is a 'until' condition,
or the parent ask for a 'until' condition and this is 'while', we must *negate* the condition.

        if askFor and .name isnt askFor
            negated = true

*askFor* is used when the source code was, for example,
`do until Expression` and we need to code: `while(!(Expression))` 
or the code was `loop while Expression` and we need to code: `if (!(Expression)) break` 

when you have a `until` condition, you need to negate the expression 
to produce a `while` condition. (`while NOT x` is equivalent to `until x`)

        .expr.produceType = 'Bool'
        .expr.produce negated


### Append to class Grammar.DoLoop ###

      method produce() 

Note: **WhileUntilLoop** extends **DoLoop**, so this *.produce()* method is used by both symbols.

        if .postWhileUntilExpression 

if we have a post-condition, for example: `do ... loop while x>0`, 

            .out 
                "do{", NL //, .getEOLComment()
                .body
                "} while ("
            
            .postWhileUntilExpression.produce(askFor='while')
            
            .out ")"

else, optional pre-condition:
  
        else

            .out 'while('
            if .preWhileUntilExpression
              .preWhileUntilExpression.produce(askFor='while')
            else 
              .out 'TRUE'

            .out '){', .body , "}"

        end if

        .out ";",{COMMENT:"end loop"},NL
        .skipSemiColon = true

### Append to class Grammar.LoopControlStatement ###
This is a very simple produce() to allow us to use the `break` and `continue` keywords.
  
      method produce() 

validate usage inside a for/while

        var nodeASTBase = this.parent
        do

            if nodeASTBase is instanceof Grammar.FunctionDeclaration
                //if we reach function header
                .sayErr '"{.control}" outside a for|while|do loop'
                break loop

            else if nodeASTBase is instanceof Grammar.ForStatement
                or nodeASTBase is instanceof Grammar.DoLoop
                    break loop //ok, break/continue used inside a loop

            end if

            nodeASTBase = nodeASTBase.parent

        loop

        .out .control


### Append to class Grammar.DoNothingStatement ###

      method produce()
        .out "//do nothing",NL

### Append to class Grammar.ParenExpression ###
A `ParenExpression` is just a normal expression surrounded by parentheses.

      properties
        produceType

      method produce() 
        .expr.produceType = .produceType
        .out "(",.expr,")"

### Append to class Grammar.ArrayLiteral ###

A `ArrayLiteral` is a definition of a list like `[1, a, 2+3]`. 
On js we just pass this through, on C we create the array on the fly

      method produce() 
      
        .out "new(Array,"

        if no .items or .items.length is 0
            .out "0,NULL"
        else
            .out .items.length, ',(any_arr){', {CSL:.items}, '}'
        
        .out ")"


### Append to class Grammar.NameValuePair ###

A `NameValuePair` is a single item in an Map definition. 
we call _newPair to create a new NameValuePair

      method produce() 
        var strName = .name

        if strName instanceof Grammar.Literal
            declare strName: Grammar.Literal
            strName = strName.getValue() 

        .out NL,'_newPair("',strName, '",', .value,')'

### Append to class Grammar.ObjectLiteral ### also FreeObjectLiteral

A `ObjectLiteral` is an object definition using key/value pairs like `{a:1,b:2}`. 
JavaScript supports this syntax, so we just pass it through. 
C99 does only support "static" initializers for structs.

      method produce()

        .out .calcNewMap(),NL


      method calcNewMap()

        var resultArray = ["new(Map,"]

        if no .items or .items.length is 0
            resultArray.push "0,NULL"
        else
            resultArray.push "#{.items.length},(any_arr){", {CSL:.items},NL,"}"
        
        resultArray.push ")"
        return resultArray


      method calcFastNew(className) returns array

        if className in ['Map','any']
            return .calcNewMap()
            
        else
            var resultArray = ["_fastNew(", className ,",", .items.length]
            for each nameValuePair in .items
                resultArray.push ",",nameValuePair.name,"_,",nameValuePair.value,NL
            resultArray.push ")"

            return resultArray


### Append to class Grammar.RegExpLiteral ###


      method produce()

        .throwError "generating C-code for RegExp Literals not supported yet. Use PMREX paliatives"


### Append to class Grammar.ConstructorDeclaration ###

Produce a Constructor

      method produce() 

        if no .body.statements 
            .skipSemiColon=true
            return // just method declaration (interface)

        // get owner: should be ClassDeclaration
        var ownerClassDeclaration  = .getParent(Grammar.ClassDeclaration) 
        if no ownerClassDeclaration.nameDecl, return 

        var c = ownerClassDeclaration.nameDecl.getComposedName()

        .out "void ",c,"__init(DEFAULT_ARGUMENTS){",NL

auto call supper init

        if ownerClassDeclaration.varRefSuper
            .out 
                "  ",{COMMENT:"auto call super class __init"},NL
                "  ",ownerClassDeclaration.varRefSuper,"__init(this,argc,arguments);",NL

On the constructor, assign initial values for properties.
Initialize (non-undefined) properties with assigned values.

        .getParent(Grammar.ClassDeclaration).producePropertiesInitialValueAssignments 

// now the rest of the constructor body 

        .produceFunctionBody 


### Append to class Grammar.MethodDeclaration ###

Produce a Method

      method produce() 

        if no .body.statements
            .skipSemiColon=true
            return //just interface

        if no .nameDecl, return //shim
        var name = .nameDecl.getComposedName()

        var ownerNameDecl  = .nameDecl.parent
        if no ownerNameDecl, return 

        var isClass = ownerNameDecl.name is 'prototype'

        var c = ownerNameDecl.getComposedName()

        .out "any ",name,"(DEFAULT_ARGUMENTS){",NL

        //assert 'this' parameter class
        if isClass 
            .body.out 
                "assert(_instanceof(this,",c,"));",NL
                "//---------"

        .produceFunctionBody 


### Append to class Grammar.FunctionDeclaration ###

only module function production
(methods & constructors handled above)

`FunctionDeclaration: '[export] function [name] '(' FunctionParameterDecl* ')' Block`

      method produce() 

exit if it is a *shim* method which never got declared (method exists, shim not required)

        if no .nameDecl, return

being a function, the only possible parent is a Module

        //var parentModule = .getParent(Grammar.Module)
        //var prefix = parentModule.fileInfo.base
        var name = .nameDecl.getComposedName() //"#{prefix}_#{.name}"

        var isInterface = no .body.statements
        if isInterface, return // just method declaration (interface)
        
        .out {COMMENT:"---------------------------------"},NL
        .out "any ",name,"(DEFAULT_ARGUMENTS){"

        .produceFunctionBody 


##### helper method produceFunctionBody()

common code
start body

        // function named params
        if .paramsDeclarations and .paramsDeclarations.list.length

            .body.out NL,"// define named params",NL
            for each inx,varDecl in .paramsDeclarations.list
                .body.out "var #{varDecl.name} = argc>#{inx}? arguments[#{inx}] : undefined;",NL

            .body.out "//---------",NL
        
        end if //named params

if single line body, insert return. Example: `function square(x) = x*x`

        if .body instance of Grammar.Expression
            .out "return ", .body

        else

if it has a exception block, insert 'try{'

            if .hasExceptionBlock, .body.out " try{",NL

now produce function body

            .body.produce()

close the function, to all functions except *constructors* (__init), 
add default "return undefined", to emulate js behavior on C. 
if you dot not insert a "return", the C function will return garbage.

            if not .constructor is Grammar.ConstructorDeclaration // declared as void Class__init(...)
                .out "return undefined;",NL

close function

        .out "}"

        .skipSemiColon = true

        //if .lexer.out.sourceMap
        //    .lexer.out.sourceMap.add ( .EndFnLineNum, 0, .lexer.out.lineNum-1, 0)
        //endif


--------------------
### Append to class Grammar.PrintStatement ###
`print` is an alias for console.log

      method produce()

        if .args.length 
            .out 'print(#{.args.length},(any_arr){',{CSL:.args},'})'
        else
            .out 'print(0,NULL)'

--------------------
### Append to class Grammar.EndStatement ###

Marks the end of a block. It's just a comment for javascript

      method produce()

        //declare valid .lexer.outCode.lastOriginalCodeComment
        //declare valid .lexer.infoLines

        //if .lexer.outCode.lastOriginalCodeComment<.lineInx
        //  .out {COMMENT: .lexer.infoLines[.lineInx].text}
        
        .outSourceLinesAsComment

        .skipSemiColon = true

/*
--------------------
### Append to class Grammar.CompilerStatement ###

      method produce()

first, out as comment this line

        //.outLineAsComment .lineInx
        .outSourceLineAsComment .sourceLineNum

if it's a conditional compile, output body is option is Set

        if .conditional
            if .compilerVar(.conditional)
                declare valid .body.produce
                .body.produce()

        .skipSemiColon = true
*/

--------------------
### Append to class Grammar.ImportStatementItem ###

        method getRefFilename(ext)

            var thisModule = .getParent(Grammar.Module)

            return Environment.relativeFrom(thisModule.fileInfo.outDir,
                     .importedModule.fileInfo.outWithExtension(".h"))

--------------------
### Append to class Grammar.DeclareStatement ###

Out as comments

      method produce()
        .skipSemiColon = true


----------------------------
### Append to class Names.Declaration ###

#### method addToAllMethodNames() 

For C production, we're declaring each distinct method name (verbs)

            var methodName=.name

            if methodName not in coreSupportedMethods and not allMethodNames.has(methodName) 
                if allClassProperties.has(methodName)
                    .sayErr "Ambiguity: A property '#{methodName}' is already defined. Cannot reuse the symbol for a method."
                    allClassProperties.get(methodName).sayErr "Definition of property '#{methodName}'."
                else if methodName in coreSupportedProps
                    .sayErr "Ambiguity: A property '#{methodName}' is defined in core. Cannot reuse the symbol for a method."

                else
                    allMethodNames.set methodName, this



### Append to class Grammar.TryCatch ###

      method produce() 

        .out 'try{', .body, .exceptionBlock

### Append to class Grammar.ExceptionBlock ###

      method produce() 

        .out NL,'}catch(',.catchVar,'){', .body, '}'

        if .finallyBody
            .out NL,'finally{', .finallyBody, '}'


### Append to class Grammar.CaseStatement ###

##### method produce()

if it was "case foo instance of"... we produce
the special "instance of" check loop

        if .isInstanceof
            return .produceCaseInstanceOfLoop()

if we have a varRef, is a case over a value
start "case-when", store expression in a tempVar

        var tmpVar
        if .varRef
            tmpVar = UniqueID.getVarName('case')
            .out "var ",tmpVar,"=",.varRef,";",NL

        for each index,whenSection in .cases

            //.outLineAsComment switchCase.lineInx
            whenSection.outSourceLinesAsComment

            .out '    ',index>0? 'else ' : '' 

            if .varRef
                //case foo...
                .out 'if (', {pre:['__is(',tmpVar,','], CSL:whenSection.expressions, post:')', separator:'||'}
            else
                //case when TRUE
                .out 'if (', {pre:['('], CSL:whenSection.expressions, post:')', separator:'||'}
                
            .out 
                '){',NL
                '        ',whenSection.body,";", NL
                '    }'

else body

        if .elseBody, .out NL,'else {',.elseBody,'}'


##### method produceCaseInstanceOfLoop

        var tmpVar=UniqueID.getVarName('class')
        .out 
            "Class_ptr ",tmpVar," = ",.varRef,".class;",NL
            "while(",tmpVar,"){",NL

        for each index,whenSection in .cases

            //.outLineAsComment switchCase.lineInx
            whenSection.outSourceLinesAsComment 

            whenSection.out 
                index>0? 'else ' : '' 
                'if (', {pre:['(',.varRef,'.class=='], CSL:whenSection.expressions, post:')', separator:'||'}
                '){'
                whenSection.body, NL
                'break;',NL //exit while super loop
                '}'

        end for

        .out tmpVar,'=',tmpVar,'.super;',NL //move to super
        .out '}',NL //close while loooking for super

else body

        if .elseBody, .out NL,'if(!tmpVar) {',.elseBody,'}'

Example produced loop: /*

    var __class1 = CLASSES[foo.class];
    while(__class1) {
        if (__class1==Grammar.ClassDeclaration.value.class){
            declare foo:Grammar.ClassDeclaration;
            ...
        }
        else if (__class1==Grammar.AppendToDeclaration){
            declare foo:Grammar.AppendToDeclaration
            ...
        }
        else if (__class1==Grammar.VarStatement){
            declare foo:Grammar.VarStatement
            ...
        }
        __class1=CLASSES[__class1].super;
    }
    if (!__class1){ //default:
        fail with "Unexpected class. foo is #{CLASSES[foo.class].name}"
    }

*/


### Append to class Grammar.DebuggerStatement ###
      method produce
        .out "assert(0)"

### Append to class Grammar.YieldExpression ###

      method produce()

Check location
      
        if no .getParent(Grammar.FunctionDeclaration) into var functionDeclaration 
            or no functionDeclaration.hasAdjective('nice')
                .throwError '"yield" can only be used inside a "nice function/method"'

        var yieldArr=[]

        var varRef = .fnCall.varRef
        //from .varRef calculate object owner and method name 

        var thisValue='null'
        var fnName = varRef.name #default if no accessors 

        if varRef.accessors

            var inx=varRef.accessors.length-1
            if varRef.accessors[inx] instance of Grammar.FunctionAccess
                var functionAccess = varRef.accessors[inx]
                yieldArr = functionAccess.args
                inx--

            if inx>=0 
                if varRef.accessors[inx] isnt instance of Grammar.PropertyAccess
                    .throwError 'yield needs a clear method name. Example: "yield until obj.method(10)". redefine yield parameter.'

                fnName = "'#{varRef.accessors[inx].name}'"
                thisValue = [varRef.name]
                thisValue = thisValue.concat(varRef.accessors.slice(0,inx))


        if .specifier is 'until'

            yieldArr.unshift fnName
            yieldArr.unshift thisValue

        else #parallel map

            yieldArr.push "'map'",.arrExpression, thisValue, fnName


        .out "yield [ ",{CSL:yieldArr}," ]"



# Helper functions 

Utility 
-------

    var NL = '\n' # New Line constant

Operator Mapping
================

Many LiteScript operators can be easily mapped one-to-one with their JavaScript equivalents.

    var OPER_TRANSLATION = 

      'no':           '!'
      'not':          '!'
      'unary -':      '-'
      'unary +':      '+'

      'type of':      'typeof'
      'instance of':  'instanceof'

      'bitand':       '&'
      'bitor':        '|'
      'bitxor':       '^'
      'bitnot':       '~'

      'is':           '=='
      'isnt':         '!='
      '<>':           '!='
      'and':          '&&'
      'but':          '&&'
      'or':           '||'
      'has property': 'in'
    

    function operTranslate(name:string)
      return OPER_TRANSLATION.tryGetProperty(name) or name

---------------------------------

### Append to class ASTBase
Helper methods and properties, valid for all nodes

     properties skipSemiColon 

#### helper method assignIfUndefined(name,expression) 
          
        .out "if (",name,".class==Undefined_inx) ",name,"=",expression,";",NL



--------------------------------
