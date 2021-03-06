LiteScript Grammar
==================

The LiteScript Grammar is based on [Parsing Expression Grammars (PEGs)](http://en.wikipedia.org/wiki/Parsing_expression_grammar)
*with extensions*.

The LiteScript Grammar is defined as `classes`, one class for each non-terminal symbol.

The `.parse()` method of each class will try the grammar on the token stream and:
* If all tokens match, it will simply return after consuming the tokens. (success)
* On a token mismatch, it will raise a 'parse failed' exception.

When a 'parse failed' exception is raised, other classes can be tried. 
If none parses ok, a compiler error is emitted and compilation is aborted.

if the error is *before* the class has determined this was the right language construction,
it is a soft-error and other grammars can be tried over the source code.

if the error is *after* the class has determined this was the right language construction 
(if the node was 'locked'), it is a hard-error and compilation is aborted.

The `ASTBase` module defines the base class for the grammar classes along with
utility methods to **req**uire tokens and allow **opt**ional ones.

    var ASTBase = require('./ASTBase')
    var Lexer = require('./Lexer')

    compiler set sourceMap = false

    declare global process
    declare on process exit

    # forward declares

    declare forward
      StatementsDirect,FunctionAccess

    declare forward
      Module, Expression, FreeObjectLiteral, NameValuePair
      SingleLineStatement, Body, ExceptionBlock
      ElseIfStatement, ElseStatement, ForEachProperty
      ForIndexNumeric, ForEachInArray
      VariableRef, FunctionDeclaration
      ParenExpression,ArrayLiteral,ObjectLiteral
      StringLiteral, NumberLiteral, RegExpLiteral
      ClassDeclaration,AppendToDeclaration,Adjective


Reserved Words
----------------------

Words that are reserved in LiteScript and cannot be used as variable or function names
(There are no restrictions to object property names)

    var RESERVED_WORDS = ['function'
        ,'class','method','constructor','prototype'
        ,'if','then','else'
        ,'null','true','false','undefined'
        ,'and','or','but','no','not','has','property','properties'
        ,'new','is','isnt'
        ,'do','loop','while','until','for','to','break','continue'
        ,'return','try','catch','throw','raise','fail','exception','finally'
        ,'with','arguments','in','instanceof','typeof'
        ,'var','let','default','delete','interface','implements','yield'
        ,'me','this','super'
        ,'public','compiler','compile','debugger']


Operators precedence
--------------------

The order of symbols in `operatorsPrecedence`,  determines operators precedence

    var operatorsPrecedence = [ 
      '++','--', 'unary -', 'unary +', '~' ,'&', '^' ,'|'
      ,'>>','<<'
      ,'new','type of','instance of','has property','no'
      ,'*','/','%','+','-'
      ,'in'
      ,'>','<','>=','<=','is','<>'
      ,'not','and','but','or'
      ,'?',':' 
    ]

--------------------------------------

Grammar Meta-Syntax
===================

Each Grammar class parsing code, contains a 'grammar definition' as reference. 
The meta-syntax for the grammar definitions is 
an extended form of [Parsing Expression Grammars (PEGs)](http://en.wikipedia.org/wiki/Parsing_expression_grammar)

The differences with classic PEG are:
* instead of **Symbol <- definition**, we use **Symbol: definition**
* we use **[Symbol]** for optional symbols instead of **Symbol?** (brackets also groups symbols, the entire group is optional)
* symbols upper/lower case carries meaning
* we add **,|; Separated List** as a syntax option

Examples:

`IfStatement`    : CamelCase is reserved for non-terminal symbol 
`function`       : all-lowercase means the literal word
`":"`            : literal symbols are quoted

`IDENTIFIER`,`OPER` : all-uppercase denotes entire classes of symbols 
`NEWLINE`,`EOF`     : or special unprintable characters

`[of]`               : Optional symbols are enclosed in brackets
`(var|let)`          : The vertical bar represents ordered alternatives
`(Oper Operand)`     : Parentheses groups symbols
`(Oper Operand)*`    : Asterisk after a group `()*` means the group can repeat (one or more)
`[Oper Operand]*`    : Asterisk after a optional group `[]*` means zero or more of the group

`"(" [Expression,] ")"` : the comma means a comma "Separated List". When a "Separated List" is accepted,
                         also a *free-form* is accepted

`Body: (Statement;)` : the semicolon means: a semicolon "Separated List". When a "Separated List" is accepted,
                         also a *free-form* is accepted

"Separated List"
----------------

Example: `FunctionCall: IDENTIFIER "(" [Expression,] ")"`

`[Expression,]` means *optional* **comma "Separated List"** of Expressions. When the comma is 
inside a **[]** group, it means the entire list is optional.

Example: `VarStatement: (VariableDecl,)`

`(VariableDecl,)` means **comma "Separated List"** of `VariableDecl` (`VariableDecl: IDENTIFIER ["=" Expresion]`). 
When the comma is inside a **()** group, it means one or more of the group

At every point where a "Separated List" is accepted, also 
a "**free-form** Separated List" is accepted.

In *free-form* mode, each item stands on its own line, and separators (comma/semicolon) 
are optional and can appear after or before the NEWLINE.

For example, given the previous example: `VarStatement: var (VariableDecl,)`, 
all of the following constructions are equivalent and valid in LiteScript:

Examples: 

/*

    // standard js

    var a = {prop1:30 prop2: { prop2_1:19, prop2_2:71} arr:["Jan","Feb","Mar"]}


    //mixed freeForm and comma separated

    var a =
        prop1: 30

        prop2: 
          prop2_1: 19
          prop2_2: 71

        arr: [ "Jan", 
              "Feb", "Mar"]


    //in freeForm, commas are optional

    var a = {
        prop1: 30
        prop2: 
          prop2_1: 19,
          prop2_2: 71,
        arr: [ 
            "Jan", 
            "Feb"
            "Mar" 
            ]
        }
*/


--------------------------

LiteScript Grammar - AST Classes
================================


PrintStatement
--------------

`PrintStatement: 'print' [Expression,]`

This handles `print` followed by am optional comma separated list of expressions

    class PrintStatement inherits from ASTBase

      properties
        args

      method parse()

        me.req 'print'

At this point we lock because it is definitely a `print` statement. Failure to parse the expression 
from this point is a syntax error.

        me.lock()

        me.args = me.optSeparatedList(Expression,",")



### Public Class VariableDecl extends ASTBase
    
`VariableDecl: IDENTIFIER (':' dataType-VariableRef) ('=' assignedValue-Expression)`

variable name, optional type anotation and optionally assign a value

Note: If no value is assigned, `= undefined` is assumed

VariableDecls are used in `var` statement, in functions for *parameter declaration*
and in class *properties declaration*

Example:  
  `var a : string = 'some text'` 
  `function x ( a : string = 'some text', b, c=0)`

      properties
        name 
        type: VariableRef
        itemType: VariableRef
        assignedValue: Expression

      declare name affinity varDecl, paramDecl

      method parse()

        me.name = me.req('IDENTIFIER')

        me.lock()

optional type annotation 

        if me.opt(':')  

            me.type = me.req(VariableRef)

            #auto-capitalize core classes
            declare forward autoCapitalizeCoreClasses
            me.type.name = autoCapitalizeCoreClasses(me.type.name)

            # check for 'array', e.g.: `var list : string array`
            if me.opt('Array','array')
                me.itemType = me.type #assign as sub-type
                me.type = 'Array'


optional assigned value 

        if me.opt('=')
          if me.lexer.token.type is 'NEWLINE' #dangling assignment, assume free-form object literal
            me.assignedValue   = me.req(FreeObjectLiteral)
          else
            me.assignedValue   = me.req(Expression)



## Var Statement

`VarStatement: (var|let) (VariableDecl,) `

`var` followed by a comma separated list of VariableDecl (one or more items)

    class VarStatement inherits from ASTBase

      properties list:array

      method parse()

        me.req('var','let')
        me.lock()

        me.list = me.reqSeparatedList(VariableDecl,",")


## PropertiesDeclaration

`PropertiesDeclaration: properties (VariableDecl,)`

The `properties` keyword is used inside classes to define properties of the class (prototype).

    class PropertiesDeclaration extends ASTBase

      properties
        toNamespace
        list: VariableDecl array

      method parse()

        me.toNamespace = me.opt('namespace')? true:false
        me.req('properties')
        me.lock()

        me.list = me.reqSeparatedList(VariableDecl,',')


##TryCatch


`TryCatch: 'try' Body ExceptionBlock`

Defines a `try` block for trapping exceptions and handling them. 

    class TryCatch inherits from ASTBase

      properties body,exceptionBlock

      method parse()
        me.req 'try'
        me.lock()
        me.body = me.req(Body)

        me.exceptionBlock = me.req(ExceptionBlock)


## ExceptionBlock

`ExceptionBlock: (exception|catch) Identifier Body [finally Body]`

Defines a `catch` block for trapping exceptions and handling them. 
If no `try` preceded this construction, `try` is assumed at the beggining of the function

    class ExceptionBlock inherits from ASTBase

      properties 
        catchVar:string
        body,finallyBody

      method parse()

        me.req 'exception','catch'
        me.lock()

get catch variable - Note: catch variables in js are block-scoped

        me.catchVar = me.req('IDENTIFIER')

get body 

        me.body = me.req(Body)

get optional "finally" block

        if me.opt('finally')
          me.finallyBody = me.req(Body)


## ThrowStatement

`ThrowStatement: (throw|raise|fail with) Expression`

This handles `throw` and its synonyms followed by an expression 

    class ThrowStatement inherits from ASTBase
      
      properties specifier, expr

      method parse()

        me.specifier = me.req('throw', 'raise', 'fail')

At this point we lock because it is definitely a `throw` statement

        me.lock()

        if me.specifier is 'fail'
            me.req 'with'

        me.expr = me.req(Expression)


## ReturnStatement


`ReturnStatement: return Expression`

    class ReturnStatement inherits from ASTBase
      
      properties expr

      method parse()
        me.req 'return'
        me.lock()
        me.expr = me.opt(Expression)


IfStatement
-----------

`IfStatement: (if|when) Expression (then|',') SingleLineStatement [ElseIfStatement|ElseStatement]*`
`IfStatement: (if|when) Expression Body [ElseIfStatement|ElseStatement]*`
 
Parses `if` statments and any attached `else`s or `else if`s 

    class IfStatement inherits from ASTBase
      
      properties conditional,body,elseStatement

      method parse()

        me.req 'if','when'
        me.lock()

        me.conditional = me.req(Expression)

        if me.opt(',','then')

after `,` or `then`, a statement on the same line is required 

            me.body = me.req(SingleLineStatement)
        
        else # and indented block

            me.body = me.req(Body)

        #end if

control: "if"-"else" are related by having the same indent

        if me.lexer.token.value is 'else'

          if me.lexer.index isnt 0 
            me.throwError 'expected "else" to start on a new line'

          if me.lexer.indent < me.indent
            #token is 'else' **BUT IS LESS-INDENTED**. It is not the "else" to this "if"
            return

          if me.lexer.indent > me.indent
            me.throwError "'else' statement is over-indented"

        #end if

        me.elseStatement = me.opt(ElseIfStatement, ElseStatement)


ElseIfStatement
---------------

`ElseIfStatement: (else|otherwise) if Expression Body`

This class handles chained else-if statements

    class ElseIfStatement inherits from ASTBase
      
      properties nextIf

      method parse()

        me.req 'else'
        me.req 'if'
        me.lock()

return the consumed 'if', to parse as a normal 'IfStatement'

        me.lexer.returnToken()
        me.nextIf = me.req(IfStatement)


ElseStatement
-------------
`ElseStatement: ('else'|'otherwise') (Statement | Body) `

This class handles closing "else" statements

    class ElseStatement inherits from ASTBase
      
      properties body
      
      method parse()

        me.req 'else'
        me.lock()
        me.body = me.req(Body)


Loops
=====

LiteScript provides the standard js and C `while` loop, but also provides a `until` loop
and a post-condition `do loop while|until`


## WhileUntilExpression

common symbol for loops conditions. Is the word 'while' or 'until' followed by a boolean-Expression

`WhileUntilExpression: ('while'|'until') boolean-Expression`

    class WhileUntilExpression inherits from ASTBase
      
      properties expr

      method parse()
        me.name = me.req('while','until')
        me.lock()
        me.expr = me.req(Expression)

DoLoop
------

`DoLoop: do [pre-WhileUntilExpression] [":"] Body loop`
`DoLoop: do [":"] Body loop [post-WhileUntilExpression]`

do-loop can have a optional pre-condition or a optional post-condition

###Case 1) do-loop without any condition

a do-loop without any condition is an *infinite loop* (usually with a `break` statement inside)

Example:
/*
  var x=1
  
  do:

    x++
    print x
    when x is 10, break

  loop
*/

###Case 2) do-loop with pre-condition

A do-loop with pre-condition, is the same as a while|until loop

Example:
/*
  var x=1
  
  do while x<10

    x++
    print x

  loop
*/

### Case 3) do-loop with post-condition

A do-loop with post-condition, execute the block, at least once, and after each iteration, 
checks the post-condition, and loops `while` the expression is true
*or* `until` the expression is true 

Example:
/*
  var x=1
  
  do

    x++
    print x

  loop while x < 10
*/


### Implementation

    class DoLoop inherits from ASTBase
      
      properties 
        preWhileUntilExpression
        body
        postWhileUntilExpression

      method parse()
        
        me.req 'do'

        if me.opt('nothing')
          me.throwParseFailed('is do nothing')

        me.opt ":"
        me.lock()

Get optional pre-condition

        me.preWhileUntilExpression = me.opt(WhileUntilExpression)

        me.body = me.opt(Body)

        me.req "loop"

Get optional post-condition

        me.postWhileUntilExpression = me.opt(WhileUntilExpression)

        if me.preWhileUntilExpression and me.postWhileUntilExpression
          me.sayErr "Loop: cant have a pre-condition a and post-condition at the same time"


WhileUntilLoop
--------------

`WhileUntilLoop: pre-WhileUntilExpression Body`

Execute the block `while` the condition is true or `until` the condition is true 

while|until loops are simpler forms of loops. The `while` form, is the same as in C and js.

WhileUntilLoop derives from DoLoop, to use its `.produce()` method (it is a simple form of DoLoop)

    class WhileUntilLoop inherits from DoLoop
      
      properties preWhileUntilExpression, body

      method parse()
        
        me.preWhileUntilExpression = me.req(WhileUntilExpression)
        me.lock()

        me.body = me.opt(Body)


LoopControlStatement
--------------------

`LoopControlStatement: (break|continue)`

This handles the `break` and `continue` keywords.
'continue' jumps to the start of the loop (as C & Js: 'continue')

    class LoopControlStatement inherits from ASTBase
      
      properties control

      method parse()
        me.control = me.req('break','continue')


DoNothingStatement
------------------

`DoNothingStatement: do nothing`

    class DoNothingStatement inherits from ASTBase
      method parse()
        me.req 'do'
        me.req 'nothing'


For Statement
=============

    class ForStatement inherits from ASTBase
      
      properties 
        variant: ASTBase

      method parse()
      
        declare valid me.createScope

We start with commonn `for` keyword

        me.req 'for'
        me.lock()

There are 3 variants of `ForStatement` in LiteScript,
we now require one of them

        me.variant = me.req(ForEachProperty,ForIndexNumeric,ForEachInArray)


##Variant 1) **for each property** to loop over **object property names**

Grammar:
`ForEachProperty: for each [own] property name-Identifier in object-VariableRef`

where `name-VariableDecl` is a variable declared on the spot to store each property name,
and `object-VariableRef` is the object having the properties 

if the optional `own` keyword is used, only instance properties will be looped 
(no prototype chain properties)

    class ForEachProperty inherits from ASTBase

      properties ownOnly,indexVar,iterable, body

      method parse()
      
        me.req('each')

then check for optional `own`

        me.ownOnly = me.opt('own')? true: false

next we require: 'property', and lock.

        me.req('property')  
        me.lock()

Get index variable name (to store property names), register index var in the scope

        me.indexVar = me.req('IDENTIFIER')

Then we require `in`, then the iterable-Expression (a object)

        me.req 'in'
        me.iterable = me.req(Expression)

Now, get the loop body

        me.body = me.req(Body)


##Variant 2) **for index=...** to create **numeric loops**

This `for` variant is just a verbose expressions of the standard C (and js) `for(;;)` loop

Grammar:
`ForIndexNumeric: for index-Identifier = start-Expression [,|;] (while|until|to) end-Expression [(,|;) increment-Statement]`

where `index-VariableDecl` is a numeric variable declared on the spot to store loop index,
`start-Expression` is the start value for the index (ussually 0)
`end-Expression` is the end value (`to`), the condition to keep looping (`while`) or to end looping (`until`)
and `increment-Statement` is the statement used to advance the loop index. If omitted the default is `index++`

Note: You can use comma or semicolons between the expressions.

    declare forward Statement

    class ForIndexNumeric inherits from ASTBase
      
      properties 
        indexVar, startIndex
        conditionPrefix, endExpression
        increment: Statement
        body

      method parse()
      
we require: a variable, a "=", and a start index

        me.indexVar = me.req('IDENTIFIER')
        me.req "="
        me.lock()
        me.startIndex = me.req(Expression)

comma|semicolon are optional

        me.opt ',',";"

get 'while|until|to' and condition

        me.conditionPrefix = me.req('while','until','to')
        me.endExpression = me.req(Expression)

if a comma is next, expect Increment-Statement

        if me.opt(',',";")
          me.increment = me.req(SingleLineStatement)

Now, get the loop body

        me.body = me.req(Body)


##Variant 3) **for each in** to loop over **Arrays**

Grammar:
`ForEachInArray: for [each] [index-Identifier,]item-Identifier in array-VariableRef`

where:
* `index-VariableDecl` is a variable declared on the spot to store each item index (from 0 to array.length)
* `item-VariableDecl` is a variable declared on the spot to store each array item (array[index])
and `array-VariableRef` is the array to iterate over

    class ForEachInArray inherits from ASTBase
      
      properties 
        mainVar:String
        indexVar:String
        iterable
        body

      method parse()
      
first, optional 'each'

        me.opt('each')

Get index variable and value variable.
Keep it simple: index and value are always variables declared on the spot

        me.mainVar = me.req('IDENTIFIER')

a comma means: previous var was 'index', so register as index and get main var
  
        if me.opt(',')
          me.indexVar = me.mainVar
          me.mainVar = me.req('IDENTIFIER')

        else if me.opt('at') #old syntax
          me.indexVar = me.req('IDENTIFIER')

        #end if           

we now *require* `in` and the iterable (array)

        me.req 'in'
        me.lock()
        me.iterable = me.req(Expression)

and then, loop body

        me.body = me.req(Body)


--------------------------------

## AssignmentStatement

`AssignmentStatement: VariableRef ("="|"+="|"-="|"*="|"/=") Expression`

    class AssignmentStatement inherits from ASTBase
      
      properties lvalue:VariableRef, rvalue:Expression

      method parse()
      
        declare valid this.scopeEvaluateAssignment
        declare valid me.parent.preParsedVarRef
        declare valid me.scopeEvaluateAssignment

        if me.parent.preParsedVarRef
          me.lvalue   = me.parent.preParsedVarRef # get already parsed VariableRef 
        else
          me.lvalue   = me.req(VariableRef)

require an assignment symbol: ("="|"+="|"-="|"*="|"/=")

        me.name = me.req('ASSIGN')
        me.lock()

        if me.lexer.token.type is 'NEWLINE' #dangling assignment
          me.rvalue   = me.req(FreeObjectLiteral) #assume Object Expression in freeForm mode
        else
          me.rvalue   = me.req(Expression)


-----------------------

## Accessors

`Accessors: (PropertyAccess|FunctionAccess|IndexAccess)`

Accessors: 
  `PropertyAccess: '.' IDENTIFIER`
  `IndexAccess:    '[' Expression ']'`
  `FunctionAccess: '(' [Expression,]* ')'`

Accessors can appear after a VariableRef (most common case)
but also after a String constant, a Regex Constant,
a ObjectLiteral and a ArrayLiteral 

Examples:
  myObj.item.fn(call)  <-- 3 accesors, two PropertyAccess and a FunctionAccess
  myObj[5](param).part  <-- 3 accesors, IndexAccess, FunctionAccess and PropertyAccess
  [1,2,3,4].indexOf(3) <-- 2 accesors, PropertyAccess and FunctionAccess


Actions:
`.`-> PropertyAccess: Search the property in the object and in his pototype chain.
                      It resolves to the property value

`[...]` -> IndexAccess: Same as PropertyAccess

`(...)` -> FunctionAccess: The object is assumed to be a function, and the code executed. 
                      It resolves to the function return value.

### Implementation
We provide a class Accessor to be super class for the three accessors types.

    class Accessor inherits from ASTBase
      method parse
        fail with 'abstract'
      method toString
        fail with 'abstract'

PropertyAccess
--------------

`.` -> PropertyAccess: get the property named "n" 

`PropertyAccess: '.' IDENTIFIER`

    class PropertyAccess extends Accessor

      method parse()
        me.req('.')
        me.lock()
        me.name = me.req('IDENTIFIER') 

      method toString()
        return '.'+me.name

IndexAccess
-----------

`[n]`-> IndexAccess: get the property named "n" / then nth index of the array
                       It resolves to the property value

`IndexAccess: '[' Expression ']'`

    class IndexAccess extends Accessor

      method parse()
        
        me.req "["
        me.lock()
        me.name = me.req( Expression )
        me.req "]" #closer ]

      method toString()
        return '[...]'

FunctionAccess
--------------

`(...)` -> FunctionAccess: The object is assumed to be a function, and the code executed. 
                           It resolves to the function return value.

`FunctionAccess: '(' [Expression,]* ')'`

    class FunctionAccess extends Accessor
      properties args

      method parse()
        me.req "("
        me.lock()
        me.args = me.optSeparatedList( Expression, ",", ")" ) #comma-separated list of expressions, closed by ")"

      method toString()
        return '(...)'

## Helper Functions to parse accessors on any node

### Append to class ASTBase
      properties 
        accessors: Accessor array      
        executes, hasSideEffects

      helper method parseAccessors
      
(performance) only if the next token in ".[("

          if me.lexer.token.value not in ".[(" then return

We store the accessors in the property: .accessors
if the accessors node exists, .list will have **at least one item**

loop parsing accessors

          declare forward AccessorsDirect      

          do
              var ac:Accessor = me.parseDirect(me.lexer.token.value, AccessorsDirect)
              if no ac, break

              me.addAccessor ac

          loop #continue parsing accesors

          return

##### helper method insertAccessorAt(position,item)

            #create accessors list, if there was none
            if no me.accessors, me.accessors = []

            #polymorphic params, string defaults to PropertyAccess
            if type of item is 'string', item = new PropertyAccess(me, item)
            #insert
            me.accessors.splice position,0,item


##### helper method addAccessor(item)

            #create accessors list, if there was none
            if no me.accessors, me.accessors = []
            me.insertAccessorAt me.accessors.length, item

if the very last accesor is "(", it means the entire expression is a function call,
it's a call to "execute code", so it's a imperative statement on it's own.
if any accessor is a function call, this statement is assumed to have side-effects

            me.executes = item instance of FunctionAccess
            if me.executes, me.hasSideEffects = true


## VariableRef

`VariableRef: ('--'|'++') IDENTIFIER [Accessors] ('--'|'++')`

`VariableRef` is a Variable Reference

a VariableRef can include chained 'Accessors', which do:
* access a property of the object : `.`-> **PropertyAccess** and `[...]`->**IndexAccess**
* assume the variable is a function and perform a function call :  `(...)`->**FunctionAccess**

    class VariableRef inherits from ASTBase
      
      properties 
        preIncDec
        postIncDec

      declare name affinity varRef

      method parse()

        me.preIncDec = me.opt('--','++')

get var name, translate common aliases (me->this)

        me.executes = false

        me.name = me.req('IDENTIFIER')

        me.lock()

Now we check for accessors: 
`.`->**PropertyAccess** 
`[...]`->**IndexAccess** 
`(...)`->**FunctionAccess**
Note: paserAccessors() will:
* set .hasSideEffects=true if a function accessor is parsed
* set .executes=true if the last accessor is a function accessor

        me.parseAccessors

Replace lexical 'super' by '#{SuperClass name}.prototype'
    
        if me.name is 'super'

            var classDecl = me.getParent(ClassDeclaration)
            if no classDecl
              me.throwError "can't use 'super' outside a class method"

            if classDecl.varRefSuper
                #replace name='super' by name = SuperClass name
                me.name = classDecl.varRefSuper.name
            else
                me.name ='Object' # no superclass means 'Object' is super class

            #insert '.prototype.' as first accessor (after super class name)
            me.insertAccessorAt 0, 'prototype'

            #if super class is a composed name (x.y.z), we must insert those accessors also
            # so 'super.myFunc' turns into 'NameSpace.subName.SuperClass.prototype.myFunc'
            if classDecl.varRefSuper and classDecl.varRefSuper.accessors
                #insert super class accessors
                var position = 0
                for each ac in classDecl.varRefSuper.accessors
                  if ac instanceof PropertyAccess
                    me.insertAccessorAt position++, ac.name

        end if super

Allow 'null' as alias to 'do nothing'

        if me.name is 'null', me.executes = true

check for post-fix increment/decrement

        me.postIncDec = me.opt('--','++')

If this variable ref has ++ or --, IT IS CONSIDERED a "call to execution" in itself, 
a "imperative statement", because it has side effects. 
(`i++` has a "imperative" part, It means: "give me the value of i, and then increment it!")

        if me.preIncDec or me.postIncDec 
          me.executes = true
          me.hasSideEffects = true

Note: In LiteScript, *any VariableRef standing on its own line*, it's considered 
a function call. A VariableRef on its own line means "execute this!",
so, when translating to js, it'll be translated as a function call, and `()` will be added.
If the VariableRef is marked as 'executes' then it's assumed it is alread a functioncall, 
so `()` will NOT be added.

Examples:
---------
    LiteScript   | Translated js  | Notes
    -------------|----------------|-------
    start        | start();       | "start", on its own, is considered a function call
    start(10,20) | start(10,20);  | Normal function call
    start 10,20  | start(10,20);  | function call w/o parentheses
    start.data   | start.data();  | start.data, on its own, is considered a function call
    i++          | i++;           | i++ is marked "executes", it is a statement in itself

Keep track of 'require' calls, to import modules (recursive)

        if me.name is 'require'
            me.getParent(Module).requireCallNodes.push me            

---------------------------------
This method is only valid to be used in error reporting.
function accessors will be output as "(...)", and index accessors as [...]

      method toString()

        var result = (me.preIncDec or "") + me.name
        if me.accessors
          for ac in me.accessors
            result += ac.toString()
        return result + (me.postIncDec or "")

-----------------------

## Operand

`Operand: (
  (NumberLiteral|StringLiteral|RegExpLiteral|ArrayLiteral|ObjectLiteral
                    |ParenExpression|FunctionDeclaration)[Accessors])
  |VariableRef) 

Examples:

4 + 3 : Operand Oper Operand
-4    : UnaryOper Operand

A `Operand` is the data on which the operator operates.
It's the left and right part of a binary operator.
It's the data affected (righ) by a UnaryOper.

To make parsing faster, associate a token type/value,
with exact AST class to call parse() on.

    var OPERAND_DIRECT_TYPE = 
          'STRING': StringLiteral
          'NUMBER': NumberLiteral
          'REGEX': RegExpLiteral
    

    var OPERAND_DIRECT_TOKEN = 
          '(':ParenExpression
          '[':ArrayLiteral
          '{':ObjectLiteral
          'function': FunctionDeclaration
    

    class Operand inherits from ASTBase

      method parse()

fast-parse: if it's a NUMBER: it is NumberLiteral, if it's a STRING: it is StringLiteral (also for REGEX)
or, upon next token, cherry pick which AST nodes to try,
'(':ParenExpression,'[':ArrayLiteral,'{':ObjectLiteral,'function': FunctionDeclaration

        me.name = me.parseDirect(me.lexer.token.type, OPERAND_DIRECT_TYPE) 
          or me.parseDirect(me.lexer.token.value, OPERAND_DIRECT_TOKEN)

if it was a Literal, ParenExpression or FunctionDeclaration
besides base value, this operands can have accessors. For example: `"string".length` , `myObj.fn(10)`

        if me.name
            me.parseAccessors

else, (if not Literal, ParenExpression or FunctionDeclaration)
it must be a variable ref 

        else
            me.name = me.req(VariableRef)

        #end if

    #end Operand


## Oper

`Oper: ('~'|'&'|'^'|'|'|'>>'|'<<'
        |'*'|'/'|'+'|'-'|mod
        |instance of|instanceof
        |'>'|'<'|'>='|'<='
        |is|'==='|isnt|is not|'!=='
        |and|but|or
        |[not] in
        |(has|hasnt) property
        |? true-Expression : false-Expression)`

An Oper sits between two Operands ("Oper" is a "Binary Operator", 
differents from *UnaryOperators* which optionally precede a Operand)

If an Oper is found after an Operand, a second Operand is expected.

Operators can include:
* arithmetic operations "*"|"/"|"+"|"-"
* boolean operations "and"|"or"
* `in` collection check.  (js: `indexOx()>=0`)
* instance class checks   (js: instanceof)
* short-if ternary expressions ? :
* bit operations (|&)
* `has property` object property check (js: 'propName in object')

    class Oper inherits from ASTBase

      properties 
        negated
        left:Operand, right:Operand
        pushed, precedence

      method parse()

        declare valid me.getPrecedence

Get next token, require an OPER

        me.name = me.req('OPER')
        me.lock() 

A) validate double-word opers

A.1) validate `instance of`

        if me.name is 'instance'
            me.name += ' '+me.req('of')

A.2) validate `has|hasnt property`

        else if me.name is 'has'
            me.negated = me.opt('not')? true:false # set the 'negated' flag
            me.name += ' '+me.req('property')

        else if me.name is 'hasnt'
            me.negated = true # set the 'negated' flag
            me.name += 'has '+me.req('property')

A.3) also, check if we got a `not` token.
In this case we require the next token to be `in` 
`not in` is the only valid (not-unary) *Oper* starting with `not`

        else if me.name is 'not'
          me.negated = true # set the 'negated' flag
          me.name = me.req('in') # require 'not in'

B) Synonyms 

else, check for `isnt`, which we treat as `!==`, `negated is` 

        else if me.name is 'isnt'
          me.negated = true # set the 'negated' flag
          me.name = 'is' # treat as 'Negated is'

else check for `instanceof`, (old habits die hard)

        else if me.name is 'instanceof'
          me.name = 'instance of'

        #end if

C) Variants on 'is/isnt...'

        if me.name is 'is' # note: 'isnt' was converted to 'is {negated:true}' above

  C.1) is not
  Check for `is not`, which we treat as `isnt` rather than `is ( not`.

          if me.opt('not') # --> is not...
              if me.negated, me.throwError '"isnt not" is invalid'
              me.negated = true # set the 'negated' flag

        #end if

  C.2) accept 'is/isnt instance of' and 'is/isnt instanceof'

          if me.opt('instance')
              me.name = 'instance '+me.req('of')
          else if me.opt('instanceof')
              me.name = 'instance of'

        #end if

Get operator precedence index

        me.getPrecedence

      #end Oper parse


###getPrecedence:

**Helper method to get Precedence Index (lower number means higher precedende)**

      method getPrecedence()

        me.precedence = operatorsPrecedence.indexOf(me.name)
        if me.precedence is -1 
            debugger
            fail with "OPER '#{me.name}' not found in the operator precedence list"


###Boolean Negation: `not`
####Notes for the javascript programmer


In LiteScript, the *boolean negation* `not`, 
has LOWER PRECEDENCE than the arithmetic and logical operators.

In LiteScript: `if not a + 2 is 5` means `if not (a+2 is 5)`

In javascript: `if ( ! a + 2 === 5 )` means `if ( (!a)+2 === 5 )` 

so remember **not to** mentally translate `not` to js `!`


UnaryOper
---------

`UnaryOper: ('-'|'+'|new|type of|typeof|not|no|'~') `

A Unary Oper is an operator acting on a single operand.
Unary Oper inherits from Oper, so both are `instance of Oper`

Examples:
1) `not`     *boolean negation*     `if not ( a is 3 or b is 4)`
2) `-`       *numeric unary minus*  `-(4+3)`
2) `+`       *numeric unary plus*   `+4` (can be ignored)
3) `new`     *instantiation*        `x = new classes[2]()`
4) `type of` *type name access*     `type of x is 'string'` 
5) `no`      *'falsey' check*       `if no options then options={}` 
6) `~`       *bit-unary-negation*   `a = ~xC0 + 5`

    var unaryOperators = ['new','-','no','not','type','typeof','~','+']

    class UnaryOper inherits from Oper

      method parse()

require a unaryOperator

          me.name = me.reqOneOf(unaryOperators)

Check for `type of` - we allow "type" as var name, but recognize "type of" as UnaryOper

          if me.name is 'type'
              if me.opt('of')
                me.name = 'type of'
              else
                me.throwParseFailed 'expected "of" after "type"'
                    
Lock, we have a unary oper

          me.lock()

Rename - and + to 'unary -' and 'unary +'
'typeof' to 'type of'

          if me.name is '-'
            me.name = 'unary -'

          else if me.name is '+'
            me.name = 'unary +'

          else if me.name is 'typeof'
              me.name = 'type of'

          #end if

calculate precedence - Oper.getPrecedence()

          me.getPrecedence()

      #end parse 


-----------
## Expression

`Expression: [UnaryOper] Operand [Oper [UnaryOper] Operand]*`

The expression class parses intially a *flat* array of nodes.
After the expression is parsed, a *Expression Tree* is created based on operator precedence.

    class Expression inherits from ASTBase
      
      properties operandCount, root
 
      method parse()
      
        declare valid me.growExpressionTree
        declare valid me.root.name.type

        var arr = []
        me.operandCount = 0 

        while true

Get optional unary operator
(performance) check token first

          if me.lexer.token.value in unaryOperators
              var oper = me.opt(UnaryOper)
              if oper 
                arr.push oper
                me.lock()

Get operand

          arr.push me.req(Operand) 
          me.operandCount += 1 
          me.lock()

(performance) Fast exit for common tokens: `=` `,` `]`  `)` means end of expression.

          if me.lexer.token.type is 'ASSIGN' or me.lexer.token.value in ',)]' 
              break

optional newline **before** Oper
To allow a expressions to continue on the next line, we look ahead, and if the first token in the next line is OPER
we consume the NEWLINE, allowing multiline expressions. The exception is ArrayLiteral, because in free-form mode
the next item in the array, can start with a unary operator

          if me.lexer.token.type is 'NEWLINE' and not (me.parent instanceof ArrayLiteral)
            me.opt 'NEWLINE' #consume newline
            if me.lexer.token.type isnt 'OPER' # the first token in the next line isnt OPER (+,and,or,...)
              me.lexer.returnToken() # return NEWLINE
              break #end Expression

Try to parse next token as an operator

          var operator = me.opt(Oper)
          if no operator then break # no more operators, end of expression

If it was an operator, store, and continue because we expect another operand.
(operators sits between two operands)

          arr.push(operator)

allow dangling expresion. If the line ends with OPER, 
we consume the NEWLINE and continue parsing the expression on the next line

          me.opt 'NEWLINE' #consume optional newline after Oper

        #loop

Fix 'new' calls. Check parameters for 'new' unary operator, for consistency, add '()' if not present,
so `a = new MyClass` turns into `a = new MyClass()`

        for each index,item in arr
          declare item:UnaryOper         
          if item instanceof UnaryOper and item.name is 'new'
            var operand = arr[index+1]
            if operand.name instanceof VariableRef
                var varRef = operand.name
                if no varRef.executes, varRef.addAccessor new FunctionAccess(me)

Now we create a tree from me.arr[], based on operator precedence

        me.growExpressionTree(arr)


      #end method Expression.parse()


Grow The Expression Tree
========================

Growing the expression AST
--------------------------

By default, for every expression, the parser creates a *flat array*
of UnaryOper, Operands and Operators.

`Expression: [UnaryOper] Operand [Oper [UnaryOper] Operand]*`

For example, `not 1 + 2 * 3 is 5`, turns into:

me.arr =  ['not','1','+','2','*','3','is','5']

In this method we create the tree, by pushing down operands, 
according to operator precedence.

Te process runs until there is only one operator left in the root node 
(the one with lower precedence)

For example, `not 1 + 2 * 3 is 5`, turns into:

<pre>
>   not
>      \
>      is
>     /  \
>   +     5
>  / \   
> 1   *  
>    / \ 
>    2  3
</pre>


`3 in a and not 4 in b`
<pre>
>      and
>     /  \
>   in    not
>  / \     |
> 3   a    in
>         /  \
>        4   b
</pre>

`3 in a and 4 not in b`
<pre>
>      and
>     /  \
>   in   not-in
>  / \    / \
> 3   a  4   b
>         
</pre>

`-(4+3)*2`
<pre>
>   *
>  / \
> -   2
>  \
>   +
>  / \
> 4   3
</pre>

Expression.growExpressionTree()
-------------------------------

      method growExpressionTree(arr:array)

while there is more than one operator in the root node...

        while arr.length > 1

find the one with highest precedence (lower number) to push down
(on equal precedende, we use the leftmost)

          compile if debug
            var d="Expr.TREE: "
            for each inx,item in arr
              declare valid item.name.name
              declare valid item.pushed
              if item instanceof Oper
                d+=" "+item.name
                if item.pushed 
                    d+="-v"
                d+=" "
              else
                d+=" "+item.name.name
            debug d
          end 

          var pos=-1
          var minPrecedenceInx = 100
          for each inx,item in arr

            //debug "item at #{inx} #{item.name}, Oper? #{item instanceof Oper}. precedence:",item.precedence
            declare valid item.precedence
            declare valid item.pushed

            if item instanceof Oper
              if not item.pushed and item.precedence < minPrecedenceInx
                pos = inx
                minPrecedenceInx = item.precedence

          #end for
          
          #control
          if pos<0, me.throwError("can't find highest precedence operator")

Un-flatten: Push down the operands a level down

          var oper = arr[pos]

          oper.pushed = true

          if oper instanceof UnaryOper

            #control
            compile if debug
              if pos is arr.length
                me.throwError("can't get RIGHT operand for unary operator '#{oper}'") 
            end compile

            # if it's a unary operator, take the only (right) operand, and push-it down the tree
            oper.right = arr.splice(pos+1,1)[0]

          else

            #control
            compile if debug
              if pos is arr.length
                me.throwError("can't get RIGHT operand for binary operator '#{oper}'")
              if pos is 0
                me.throwError("can't get LEFT operand for binary operator '#{oper}'")
            end compile

            # if it's a binary operator, take the left and right operand, and push-them down the tree
            oper.right = arr.splice(pos+1,1)[0]
            oper.left = arr.splice(pos-1,1)[0]

          #end if

        #loop until there's only one operator

Store the root operator

        me.root = arr[0]

      #end method

-----------------------

## Literal

This class groups: NumberLiteral, StringLiteral, RegExpLiteral, ArrayLiteral and ObjectLiteral

    class Literal inherits from ASTBase
  
      properties 
        type = '*abstract-Literal*'

      method getValue()
        return me.name


## NumberLiteral

`NumberLiteral: NUMBER`

A numeric token constant. Can be anything the lexer supports, including scientific notation
, integers, floating point, or hex.

    class NumberLiteral inherits from Literal

      properties 
        type = 'Number'

      method parse()
        me.name = me.req('NUMBER')


## StringLiteral

`StringLiteral: STRING`

A string constant token. Can be anything the lexer supports, including single or double-quoted strings. 
The token include the enclosing quotes

    class StringLiteral inherits from Literal

      properties 
        type = 'String'

      method parse()
        me.name = me.req('STRING')

      method getValue()
        return me.name.slice(1,-1) #remove quotes

## RegExpLiteral

`RegExpLiteral: REGEX`

A regular expression token constant. Can be anything the lexer supports.

    class RegExpLiteral inherits from Literal

      properties 
        type = 'RegExp'

      method parse()
        me.name = me.req('REGEX')


## ArrayLiteral

`ArrayLiteral: '[' (Expression,)* ']'`

An array definition, such as `a = [1,2,3]`
or 

```
a = [
   "January"
   "February"
   "March"
  ]
```

    class ArrayLiteral inherits from Literal

      properties 
        type = 'Array'
        items

      method parse()
        me.req '['
        me.lock()
        me.items = me.optSeparatedList(Expression,',',']') # closer "]" required


## ObjectLiteral

`ObjectLiteral: '{' NameValuePair* '}'`

Defines an object with a list of key value pairs. This is a JavaScript-style definition.

`x = {a:1,b:2,c:{d:1}}`

    class ObjectLiteral inherits from Literal

      properties 
        items: NameValuePair array
        type = 'Object'

      method parse()

        me.req '{'
        me.lock()
        me.items = me.optSeparatedList(NameValuePair,',','}') # closer "}" required


####helper Functions

      #recursive duet 1 (see NameValuePair)
      helper method forEach(callback) 
          for nameValue in me.items
            nameValue.forEach(callback)


## NameValuePair

`NameValuePair: (IDENTIFIER|STRING|NUMBER) ':' Expression`

A single definition in a `ObjectLiteral` 
a `property-name: value` pair.

    class NameValuePair inherits from ASTBase

      properties value: Expression

      method parse()

        me.name = me.req('IDENTIFIER','STRING','NUMBER')

        me.req ':'
        me.lock()

if it's a "dangling assignment", we assume FreeObjectLiteral

        if me.lexer.token.type is 'NEWLINE'
          me.value = me.req(FreeObjectLiteral)
        else
          me.value = me.req(Expression)


      #recursive duet 2 (see ObjectLiteral)
      helper method forEach(callback)

          callback(me) 

if ObjectLiteral, recurse
          
          declare valid me.value.root.name
  
          if me.value.root.name instanceof ObjectLiteral
            declare valid me.value.root.name.forEach
            me.value.root.name.forEach callback # recurse

    #end helper recursive functions


## FreeObjectLiteral

Defines an object with a list of key value pairs. 
Each pair can be in it's own line. A indent denotes a new level deep.
FreeObjectLiterals are triggered by a "danglin assignment"

Examples: 
/*

    var x =            // <- dangling assignment
          a: 1 
          b:           // <- dangling assignment
            b1:"some"
            b2:"cofee"


    var x =
     a:1
     b:2
     c:
      d:1
     months: ["J","F",
      "M","A","M","J",
      "J","A","S","O",
      "N","D" ]


    var y =
     c:{d:1}
     trimester:[
       "January"
       "February"
       "March"
     ]
     getValue: function(i)
       return y.trimester[i]
*/

    class FreeObjectLiteral inherits from ObjectLiteral

      method parse()
        me.lock()

get items: optional comma separated, closes on de-indent, at least one required

        me.items = me.reqSeparatedList(NameValuePair,',') 



## ParenExpression

`ParenExpression: '(' Expression ')'`

An expression enclosed by parentheses, like `(a + b)`.

    class ParenExpression inherits from ASTBase

      properties expr:Expression

      method parse()
        me.req '('
        me.lock()
        me.expr = me.req(Expression)
        me.req ')'



## FunctionDeclaration

`FunctionDeclaration: 'function [IDENITIFIER] ["(" [VariableDecl,]* ")"] [returns type-VariableRef] Body`

Functions: parametrized pieces of callable code.

    class FunctionDeclaration inherits from ASTBase

      properties 
        specifier, public, shim
        paramsDeclarations: VariableDecl array
        returnType: VariableRef
        body

      method parse()

        declare valid me.parent.isAdjectivated

        me.specifier = me.req('function','method')
        me.lock()

        me.name = me.opt('IDENTIFIER') 

get parameter members, and function body

        me.parseParametersAndBody()

      #end parse

##### method parseParametersAndBody()

This method is shared by functions, methods and constructors and 

if there are no `()` after `function`, we assume `()`

        if me.lexer.token.type in 'NEWLINE' #-> assume "()" (no parameters)
            do nothing

else, parse parameter members: `'(' [VariableDecl,] ')'`

        else 
            me.req '('
            me.paramsDeclarations = me.optSeparatedList(VariableDecl,',',')')

            if me.opt('returns')
              me.returnType = me.req(VariableRef)
              declare forward autoCapitalizeCoreClasses
              me.returnType.name = autoCapitalizeCoreClasses(me.returnType.name)

now get function body
        
        me.body = me.req(Body)


## MethodDeclaration 

`MethodDeclaration: 'method [name] ["(" [VariableDecl,]* ")"] [returns type-VariableRef] Body`

A `method` is a function defined in the prototype of a class. 
A `method` has an implicit var `this` pointing to the specific instance the method is called on.

MethodDeclaration derives from FunctionDeclaration, so both are instance of FunctionDeclaration

    class MethodDeclaration inherits from FunctionDeclaration

      method parse()

        me.specifier = me.req('method')
        me.lock()

require method name

        me.name = me.req('IDENTIFIER')

now parse parameters and body (as with any function)

        me.parseParametersAndBody()

      #end parse


## ClassDeclaration

`ClassDeclaration: class IDENTIFIER [[","] (extends|inherits from)] Body`

Defines a new class with an optional parent class. properties and methods go inside the block.

    class ClassDeclaration inherits from ASTBase

      properties
        name:string
        varRefSuper:VariableRef
        body

      declare name affinity classDecl

      method parse()

        me.req 'class'
        me.lock()
        
        me.name = me.req('IDENTIFIER')

Control: class names should be Capitalized

        if not String.isCapitalized(me.name), me.lexer.sayErr "class names should be Capitalized: class #{me.name}"

Now parse optional `,(super is|extends)` setting the super class
(aka oop classic:'inherits', or ES6: 'extends')

        me.opt(',') 
        if me.opt('extends','inherits') 
          me.opt('from') 
          me.varRefSuper = me.req(VariableRef)

Now get class body.

        me.body = me.opt(Body)



## ConstructorDeclaration 

`ConstructorDeclaration : 'constructor [new className-IDENTIFIER] ["(" [VariableDecl,]* ")"] [returns type-VariableRef] Body`

A `constructor` is the main function of the class. In js is the function-class body  (js: `function Class(...){... `)
The `constructor` method is called upon creation of the object, by the `new` operator.
The return value is the value returned by `new` operator, that is: the new instance of the class.

ConstructorDeclaration derives from MethodDeclaration, so it is also a instance of FunctionDeclaration

    class ConstructorDeclaration inherits from MethodDeclaration

      method parse()

        me.specifier = me.req('constructor')
        me.lock()

        if me.opt('new') # optional: constructor new Person(name:string)
          # to ease reading, and to find the constructor when you search for "new Person"
          var className = me.req('IDENTIFIER')
          var classDeclaration = me.getParent(ClassDeclaration)
          if classDeclaration.name isnt className, me.sayErr "Class Name mismatch #className/#me.parent.name"

now get parameters and body (as with any function)

        me.parseParametersAndBody()

      #end parse

------------------------------

## AppendToDeclaration

`AppendToDeclaration: append to (class|object) VariableRef Body`

Adds methods and properties to an existent object, e.g., Class.prototype

    class AppendToDeclaration inherits from ClassDeclaration
      
      properties 
        optClass
        varRef:VariableRef
        body

      method parse()

        me.req 'append'
        me.req 'to'
        me.lock()

        me.optClass = me.req('class','object','namespace') is 'class'

        me.varRef = me.req(VariableRef)

Now get body.

        me.body = me.req(Body)



## DebuggerStatement

`DebuggerStatement: debugger`

When a debugger is attached, break at this point.

    class DebuggerStatement inherits from ASTBase
      method parse()
        me.name = me.req("debugger")



CompilerStatement
-----------------

`compiler` is a generic entry point to alter LiteScript compiler from source code.
It allows conditional complilation, setting compiler options, define macros(*)
and also allow the programmer to hook transformations on the compiler process itself(*).

(*) Not yet.

`CompilerStatement: (compiler|compile) (set|if|debugger|option) Body`

`set-CompilerStatement: compiler set (VariableDecl,)`

`conditional-CompilerStatement: 'compile if IDENTIFIER Body`

    class CompilerStatement inherits from ASTBase

      properties
        kind, conditional:string
        list, body
        endLineInx

      method parse()

        //declare list:VariableDecl array 

        me.req 'compiler','compile'
        me.lock()
        me.kind = me.req('set','if','debugger','options')

### compiler set

        if me.kind is 'set'

get list of declared names, add to root node 'Compiler Vars'
            
            me.list = me.reqSeparatedList(VariableDecl,',')

### compiler if conditional compilation

        else if me.kind is 'if'

          me.conditional = me.req('IDENTIFIER')
          me.body = me.req(Body)


### other compile options

        else if me.kind is 'debugger' #debug-pause the compiler itself, to debug compiling process
          debugger

        else
          me.lexer.sayErr 'invalid compiler command'


### class DeclareStatement inherits from ASTBase

#### DeclareStatement

Declare statement allows you to forward-declare variable or object members. 
Also allows to declare the valid properties for externally created objects
when you dont want to create a class to use as type.

`DeclareStatement: declare ([types]|global|forward|on IDENTIFIER) (VariableDecl,)+`
`DeclareStatement: declare name affinity (IDENTIFIER,)+` 

#####Declare types
`DeclareStatement: declare [types] (VariableDecl,)+` 

To declare valid types for scope vars: 

Example:
    declare types name:string, parent:NameDeclaration

#####Declare valid
`DeclareStatement: declare valid IDENTIFIER ("."IDENTIFIER|"()"|"[]")*` 

To declare valid chains

Example:
    declare valid me.type[].name.name

#####Declare name affinity
`DeclareStatement: name affinity (IDENTIFIER,)+` 

To de used inside a class declaration, declare var names that will default to Class as type

Example
    Class NameDeclaration
      properties
        name: string, sourceLine, column
      **declare name affinity nameDecl**

Given the above declaration, any `var` named (or ending in) **"nameDecl"** or **"nameDeclaration"** 
will assume `:NameDeclaration` as type. (Class name is automatically included in 'name affinity')

Example:

`var nameDecl, parentNameDeclaration, childNameDecl, nameDeclaration`

all three vars will assume `:NameDeclaration` as type.

#####Declare global 
`DeclareStatement: declare global (VariableDecl,)+` 

To declare global, externally created vars. Example: `declare global logMessage, colors`

#####Declare on 
`DeclareStatement: declare on IDENTIFIER (VariableDecl,)+` #declare members on vars

To declare valid members on scope vars. 

#####Declare forward ### DEPRECATED
`DeclareStatement: declare forward (VariableDecl,)+` 

#### DeclareStatement body

      properties
        varRef: VariableRef
        names: VariableDecl array
        specifier

      method parse()

        me.req 'declare'
        me.lock()

        me.names = []

check 'on|valid|forward|global'

        me.specifier = me.opt('on')
        if me.specifier

Find the main name where this properties are being declared. Read names

            me.name = me.req('IDENTIFIER')
            me.names = me.reqSeparatedList(VariableDecl,',')
            return

check 'valid' 

        me.specifier = me.opt('valid')
        if me.specifier
            me.varRef = me.req(VariableRef)
            if no me.varRef.accessors, me.sayErr "declare valid: expected accesor chain. Example: 'declare valid name.member.member'"
            return

check 'name affinity', if not, must be: global|forward|types(default)

        if me.opt('name')
          me.specifier = me.req('affinity')
        else 
          me.specifier = me.opt('global','forward') or 'types' 

all of them get a (VariableDecl,)+

        me.names = me.reqSeparatedList(VariableDecl,',')
        
check syntax

        for varDecl in me.names
          if me.specifier is 'types'
            if no varDecl.type or varDecl.assignedValue
              me.sayErr "declare types: expected 'name:type, name:type,...'"
          else if me.specifier is 'affinity'
            if varDecl.type or varDecl.assignedValue
              me.sayErr "declare name affinity: expected 'name,name,...'"

        return


## DefaultAssignment

`DefaultAssignment: default AssignmentStatement`

It is a common pattern in javascript to use a object parameters (named "options")
to pass misc options to functions.

Litescript provide a 'default' construct as syntax sugar for this common pattern

The 'default' construct is formed as an ObjectLiteral assignment, 
but only the 'undfined' properties of the object will be assigned.
/*

    function theApi(object,options,callback)

      default options =
        log: console.log
        encoding: 'utf-8'
        throwErrors: true
        debug:
          enabled: false
          level: 2
      end default

      ...function body...

    end function
*/
is equivalent to js's:
/*

    function theApi(object,options,callback) {

        //defaults
        if (!options) options = {};
        if (options.log===undefined) options.log = console.log;
        if (options.encoding===undefined) options.encoding = 'utf-8';
        if (options.throwErrors===undefined) options.throwErrors=true;
        if (!options.debug) options.debug = {};
        if (options.debug.enabled===undefined) options.debug.enabled=false;
        if (options.debug.level===undefined) options.debug.level=2;

        ...function body...
    }
*/

    class DefaultAssignment inherits from ASTBase
  
      properties
        assignment: AssignmentStatement

      method parse()

        me.req 'default'
        me.lock()

        me.assignment = me.req(AssignmentStatement)



## End Statement

`EndStatement: end (IDENTIFIER)* NEWLINE`

`end` is an **optional** end-block marker to ease code reading.
It marks the end of code blocks, and can include extra tokens referencing the construction
closed. (in the future) This references will be cross-checked, to help redude subtle bugs
by checking that the block ending here is the intended one.

If it's not used, the indentation determines where blocks end ()

Example: `end if` , `end loop`, `end for each item`

Usage Examples:  
/*

    if a is 3 and b is 5
      print "a is 3"
      print "b is 5"
    end if

    loop while a < 10
      a++
      b++
    end loop
*/

    class EndStatement inherits from ASTBase
  
      properties
        references:string array

      method parse()

        me.req 'end'

        me.lock()
        me.references=[]
 
The words after `end` are just 'loose references' to the block intended to be closed
We pick all the references up to EOL (or EOF)

        while not me.opt('NEWLINE','EOF')

Get optional identifier reference
We save `end` references, to match on block indentation,
for Example: `end for` indentation must match a `for` statement on the same indent

            if me.lexer.token.type is 'IDENTIFIER'
              me.references.push(me.lexer.token.value)

            me.lexer.nextToken

        #end loop


## WaitForAsyncCall

`WaitForAsyncCall: wait for fnCall-VariableRef`

The `wait for` expression calls a normalized async function 
and `waits` for the async function to execute the callback.

A normalized async function is an async function with the last parameter = callback(err,data)

The waiting is implemented by exisiting libs.

Example: `contents = wait for fs.readFile('myFile.txt','utf8')`

    class WaitForAsyncCall inherits from ASTBase
  
      properties
        varRef

      method parse()

        me.req 'wait'
        me.lock()

        me.req 'for'
        me.varRef = me.req(VariableRef)


LaunchStatement
---------------

`LaunchStatement: 'launch' fnCall-VariableRef`

`launch` starts a generator function.
The generator function rus as a co-routine, (pseudo-parallel), 
and will be paused on `wait for` statements.

The `launch` statement will return on the first `wait for` or `yield` of the generator

    class LaunchStatement inherits from ASTBase
  
      properties
        varRef

      method parse()

        me.req 'launch'
        me.lock()

        me.varRef = me.req(VariableRef)


Adjective
---------

`Adjective: (public|generator|shim|helper)`

    class Adjective inherits from ASTBase

      method parse()

        me.name = me.req("public","generator","shim","helper")


###a Helper method, Check validity of adjective-statement combination 
      
      method validate(statement)

        var validCombinations = { public: ['class','function','var'] ,
                                  generator: ['function','method'] ,
                                  shim: ['function','method','class'] ,
                                  helper:  ['function','method','class'] }

        //declare valid:array
        declare valid statement.keyword

        var valid:array = validCombinations[me.name] or ['-*none*-']
        if not (statement.keyword in valid)
            me.throwError "'#{me.name}' can only apply to #{valid.join('|')} not to '#{statement.keyword}'"
        
Also convert adjectives to Statement node properties to ease code generation

        statement[me.name] = true


FunctionCall
------------

`FunctionCall: VariableRef ["("] (Expression,) [")"]`

    class FunctionCall inherits from ASTBase
      
      properties
          varRef: VariableRef

      method parse(options)

        declare valid me.parent.preParsedVarRef
        declare valid me.name.executes

Check for VariableRef. - can include (...) FunctionAccess

        if me.parent.preParsedVarRef #VariableRef already parsed
          me.varRef = me.parent.preParsedVarRef #use it
        else  
          me.varRef = me.req(VariableRef)

if the last accessor is function call, this is already a FunctionCall

        if me.varRef.executes
            return #already a function call

Here we assume is a function call without parentheses, a 'command'

        if me.lexer.token.type in ['NEWLINE','EOF']
          # no more tokens, let's asume FnCall w/o parentheses and w/o parameters
          return

else, get parameters, add to varRef as FunctionAccess accessor

        var functionAccess = new FunctionAccess(me.varRef)
        functionAccess.args = functionAccess.optSeparatedList(Expression,",")

        me.varRef.addAccessor functionAccess

keep track of `require` calls

        if me.varRef.name is 'require'
            me.getParent(Module).requireCallNodes.push me.varRef


Statement
---------

A `Statement` is an imperative statment (command) or a control construct.

The `Statement` node is a generic container for all previously defined statements. 


The generic `Statement` is used to define `Body: (Statement;)`, that is,
**Body** is a list of semicolon (or NEWLINE) separated **Statements**.

`Statement: [Adjective]* (ClassDeclaration|FunctionDeclaration
 |IfStatement|ForStatement|WhileUntilLoop|DoLoop
 |AssignmentStatement
 |LoopControlStatement|ThrowStatement
 |TryCatch|ExceptionBlock
 |ReturnStatement|PrintStatement|DoNothingStatement)`

`Statement: ( AssignmentStatement | fnCall-VariableRef [ ["("] (Expression,) [")"] ] )`

    class Statement inherits from ASTBase
  
      properties
        adjectives: Adjective array
        statement
        preParsedVarRef

      method parse()

        #debug show line and tokens
        debug ""
        me.lexer.infoLine.dump()

#support old SYNTAX -  method initialize = constructor - REMOVE LATER
/*
        var pos=me.lexer.getPos()
        if me.opt('method')
          if me.opt('initialize')
            me.lexer.returnToken()
            me.lexer.token.value ='constructor'
          else
            me.lexer.setPos pos
*/
#END support old SYNTAX - 

First, fast-parse the statement by using a table.
We look up the token (keyword) in **StatementsDirect** table, and parse the specific AST node

        me.statement = me.parseDirect(me.lexer.token.value, StatementsDirect)
        if no me.statement

If it was not found, try optional adjectives (zero or more). Adjectives precede statement keyword.
Recognized adjectives are: `(public|generator|shim|helper)`. 

          me.adjectives = me.optList(Adjective)

Now re-try fast-parse

          me.statement = me.parseDirect(me.lexer.token.value, StatementsDirect)
          if no me.statement

If the token wasn't on StatementsDirect, or parse failed, lets try DoNothingStatement 
(It is not in StatementsDirect because starts wih 'do' as DoLoopStatement)

            me.statement = me.opt(DoNothingStatement)
            if no me.statement

Last possibilities are: fnCall-VariableRef or AssignmentStatement
both start with a VariableRef:

(performance) **require** & pre-parse the VariableRef

              me.preParsedVarRef = me.req(VariableRef)

Then we require a AssignmentStatement|FunctionCall

              me.statement = me.req(AssignmentStatement,FunctionCall)

              me.preParsedVarRef = undefined #clear

        #end if - statement parse tries

If we reached here, we have parsed a valid statement 
Check validity of adjective-statement combination 
        
        if me.adjectives
          for adj in me.adjectives
            adj.validate(me.statement)


###a helper method to check adjectives asosciated to this statement

      method isAdjectivated(adjName)

        if me.adjectives
          for adj in me.adjectives
            if adj.name is adjName 
              return true




## Body

`Body: (Statement;)`

Body is a semicolon-separated list of statements (At least one)

`Body` is used for "Module" body, "class" body, "function" body, etc.
Anywhere a list of semicolon separated statements apply.

    class Body inherits from ASTBase

      properties
        statements: Statement array

      method parse()

        if me.lexer.token.type isnt 'NEWLINE'
            me.lexer.sayErr "Expected NEWLINE before indented body"

We use the generic ***ASTBase.reqSeparatedList*** to get a list of **Statement** symbols, 
*semicolon* separated or in freeForm mode: one statement per line, closed when indent changes.

        me.statements = me.reqSeparatedList(Statement,";")


## Single Line Statement

This construction is used when a statement is expected on the same line.
It is used by `IfStatement: if conditon-Expression (','|then) *SingleLineStatement*`
It is also used for the increment statemenf in for-while loops:`for x=0; while x<10 [,SingleLineStatement]`

    class SingleLineStatement inherits from Statement
      
      properties
        statements: Statement array

      method parse()

        if me.lexer.token.type is 'NEWLINE'
          me.lexer.returnToken()
          me.lock()
          me.lexer.sayErr "Expected statement on the same line after '#{me.lexer.token.value}'"

        # normally: ReturnStatement, ThrowStatement, PrintStatement, AssignmentStatement
        # but we parse any Statement
  
        me.statements = me.reqSeparatedList(Statement,";")

## Module

The `Module` represents a complete source file. 

    class Module inherits from Body

      method parse()

We start by locking. There is no other construction to try,
if Module.parse() fails we abort compilation.

          me.lock()

Get Module body: Statements, separated by NEWLINE|';' closer:'EOF'

          me.statements = me.optFreeFormList(Statement,';','EOF')

      #end Module parse


----------------------------------------

Table-based (fast) Statement parsing
------------------------------------

This a extension to PEGs.
To make the compiler faster and easier to debug, we define an 
object with name-value pairs: `"keyword" : AST node class` 

We look here for fast-statement parsing, selecting the right AST node to call `parse()` on 
based on `token.value`. (instead of parsing by ordered trial & error)

This table makes a direct parsing of almost all statements, thanks to a core definition of LiteScript:
Anything standing aline in it's own line, its an imperative statement (it does something, it produces effects).

    var StatementsDirect = {'var': VarStatement,
      'let': VarStatement,
      'function': FunctionDeclaration,
      'class': ClassDeclaration,
      'append': AppendToDeclaration,
      'constructor': ConstructorDeclaration,
      'properties': PropertiesDeclaration,
      'namespace': PropertiesDeclaration,
      'method': MethodDeclaration,
      'default': DefaultAssignment,
      'if': IfStatement,
      'when': IfStatement,
      'for':ForStatement,
      'while':WhileUntilLoop,
      'until':WhileUntilLoop,
      'do':DoLoop,
      'break':LoopControlStatement,
      'continue':LoopControlStatement,
      'end':EndStatement,
      'return':ReturnStatement,
      'print':PrintStatement,
      'throw':ThrowStatement,
      'raise':ThrowStatement,
      'fail':ThrowStatement,
      'try':TryCatch,
      'exception':ExceptionBlock,
      'debugger':DebuggerStatement, 
      'declare':DeclareStatement,
      'compile':CompilerStatement,
      'compiler':CompilerStatement,
      'wait':WaitForAsyncCall, 
      'launch':LaunchStatement
    }

    var AccessorsDirect = {'.': PropertyAccess,
      '[': IndexAccess,
      '(': FunctionAccess }


    helper function autoCapitalizeCoreClasses(name:string) returns String
      #auto-capitalize core classes
      if name in ['string','array','number','object','function','boolean']
        return name.capitalized()
      return name

------------
Exports

A list of Grammar classes to export.

    exports.ASTBase = ASTBase

    exports.Expression = Expression
    exports.VariableRef = VariableRef
    exports.FunctionCall = FunctionCall

    exports.PropertyAccess = PropertyAccess
    exports.FunctionAccess = FunctionAccess
    exports.IndexAccess = IndexAccess

    exports.Module = Module

    exports.Literal = Literal
    exports.StringLiteral = StringLiteral
    exports.ObjectLiteral = ObjectLiteral
    exports.FreeObjectLiteral = FreeObjectLiteral
    exports.Body = Body
    exports.Statement = Statement
    exports.ThrowStatement = ThrowStatement
    exports.ClassDeclaration = ClassDeclaration
    exports.VarStatement = VarStatement
    exports.CompilerStatement = CompilerStatement
    exports.DeclareStatement = DeclareStatement
    exports.AssignmentStatement = AssignmentStatement
    exports.SingleLineStatement = SingleLineStatement
    exports.ReturnStatement = ReturnStatement
    exports.Operand=Operand    
    exports.UnaryOper=UnaryOper
    exports.Oper=Oper
    exports.DefaultAssignment=DefaultAssignment

    exports.IfStatement=IfStatement
    exports.ElseIfStatement=ElseIfStatement
    exports.ElseStatement=ElseStatement
    exports.ForStatement=ForStatement
    exports.ForEachProperty = ForEachProperty
    exports.ForIndexNumeric = ForIndexNumeric
    exports.ForEachInArray = ForEachInArray
    exports.WhileUntilExpression=WhileUntilExpression
    exports.DoLoop=DoLoop
    exports.DoNothingStatement=DoNothingStatement
    exports.LoopControlStatement=LoopControlStatement
    exports.ParenExpression=ParenExpression
    exports.ArrayLiteral=ArrayLiteral
    exports.NameValuePair=NameValuePair

    exports.FunctionDeclaration=FunctionDeclaration
    exports.MethodDeclaration=MethodDeclaration

    exports.PrintStatement=PrintStatement
    exports.EndStatement=EndStatement
    exports.ConstructorDeclaration =ConstructorDeclaration 
    exports.AppendToDeclaration=AppendToDeclaration
    exports.TryCatch=TryCatch
    exports.ExceptionBlock=ExceptionBlock
    exports.WaitForAsyncCall=WaitForAsyncCall
    exports.PropertiesDeclaration = PropertiesDeclaration
