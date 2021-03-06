//Producer JS
//===========

//The `producer` module extends Grammar classes, adding a `produce()` method
//to generate target code for the node.

//The comp1iler calls the `.produce()` method of the root 'Module' node
//in order to return the compiled code for the entire tree.

//We extend the Grammar classes, so this module require the `Grammar` module.

   var Grammar = require('./Grammar');


//Identifier aliases
//------------------

//This are a few aliases to most used built-in identifiers:

   var IDENTIFIER_ALIASES = {
     'on': 'true', 
     'off': 'false', 
     'me': 'this'
     };


//Utility
//-------

   var NL = '\n';//# New Line constant
   var util = require('./util');

//Operator Mapping
//================

//Many LiteScript operators can be easily mapped one-to-one with their JavaScript equivalents.

   var OPER_TRANSLATION = {
     'no': '!', 
     'not': '!', 
     'unary -': '-', 
     'unary +': '+', 
     'type of': 'typeof', 
     'instance of': 'instanceof', 
     'is': '===', 
     'isnt': '!==', 
     '<>': '!==', 
     'and': '&&', 
     'but': '&&', 
     'or': '||', 
     'has property': 'in'
     };

   //function operTranslate(name:string)
   function operTranslate(name){
     //return name.translate(OPER_TRANSLATION)
     return name.translate(OPER_TRANSLATION);
   };

//---------------------------------
//---------------------------------

   //append to ASTBase.prototype
   

//Helper methods and properties, valid for all nodes

     //     properties skipSemiColon

    //     helper method compilerVar(name)
    Grammar.ASTBase.prototype.compilerVar = function(name){

//helper function compilerVar(name)
//return root.compilerVars.members[name].value

       var asked = this.getRootNode().compilerVars.findOwnMember(name);
       //if asked
       if (asked) {
          //declare valid asked.value
          //return asked.value
         //return asked.value
         return asked.value;
       };
    };


    //     helper method outPrevLinesComments()
    Grammar.ASTBase.prototype.outPrevLinesComments = function(){

//outPrevLinesComments helper method: output comments from previous lines
//before the statement

      //declare valid me.lexer.lastOutCommentLine
      //declare valid me.lexer.LineTypes.CODE
      //declare valid me.lexer.LineTypes.CODE
      //declare valid me.lexer.infoLines
      //declare valid me.lexer.infoLines

      //var inx = me.lineInx
     var inx = this.lineInx;
     //if inx<1
     if (inx < 1) {
       //return
       return;
     };

     //if not me.lexer.lastOutCommentLine
     if (!(this.lexer.lastOutCommentLine)) {
       this.lexer.lastOutCommentLine = -1;
     };

//find comment lines in the previous lines of code.

     var preInx = inx;
     //while preInx and preInx>me.lexer.lastOutCommentLine
     while(preInx && preInx > this.lexer.lastOutCommentLine){
     
       preInx -= 1;
       //if me.lexer.infoLines[preInx].type is me.lexer.LineTypes.CODE
       if (this.lexer.infoLines[preInx].type === this.lexer.LineTypes.CODE) {
         preInx += 1;
         //break
         break;
       };
     
     };//end loop
     ;

//Output prev comments lines (also blank lines)

     //me.outLinesAsComment preInx, inx-1
     this.outLinesAsComment(preInx, inx - 1);
    };

    //#end method


    //     helper method getEOLComment()
    Grammar.ASTBase.prototype.getEOLComment = function(){
//getEOLComment: get the comment at the end of the line

//Check for "postfix" comments. These are comments that occur at the end of the line,
//such as `a = 1 #comment`. We want to try to add these at the end of the current JavaScript line.

        //declare valid me.lexer.lastOutCommentLine
        //declare valid me.lexer.LineTypes.CODE
        //declare valid me.lexer.LineTypes.CODE
        //declare valid me.lexer.infoLines
        //declare valid me.lexer.infoLines

        //var inx = me.lineInx
       var inx = this.lineInx;
       var infoLine = this.lexer.infoLines[inx];

        //#declare on infoLine
        //#    indent,text,tokens:array

       //if infoLine.tokens and infoLine.tokens.length
       if (infoLine.tokens && infoLine.tokens.length) {
           var lastToken = infoLine.tokens[infoLine.tokens.length - 1];
           //if lastToken.type is 'COMMENT'
           if (lastToken.type === 'COMMENT') {
               //return "#{lastToken.value.startsWith('//')?'':'//'} #lastToken.value"
               return "" + (lastToken.value.startsWith('//') ? '' : '//') + " " + lastToken.value;
           };
       };
    };


    //     helper method assignIfUndefined(name,value)
    Grammar.ASTBase.prototype.assignIfUndefined = function(name, value){

          //declare valid value.root.name.name
          //#do nothing if value is 'undefined'
          //if value.root.name.name is 'undefined' #Expression->Operand->VariableRef->name
         //if value.root.name.name is 'undefined' #Expression->Operand->VariableRef->name
         if (value.root.name.name === 'undefined') {//#Expression->Operand->VariableRef->name
           //me.out "// ",name,": undefined",NL
           this.out("// ", name, ": undefined", NL);
           //return
           return;
         };

         //me.out "if(",name,'===undefined) ',name,"=",value,";",NL
         this.out("if(", name, '===undefined) ', name, "=", value, ";", NL);
    };


//--------------------------------
//--------------------------------

//JavaScript Producer Functions
//==============================

   //append to Body.prototype
   

//A "Body" is an ordered list of statements.

//"Body"s lines have all the same indent, representing a scope.

//"Body"s are used for example, to parse an `if` statement body and `else` body, `for` loops, etc.

     //method produce()
     Grammar.Body.prototype.produce = function(){

       //me.outCode.startNewLine()
       this.outCode.startNewLine();
       //for statement in me.statements
       for ( var statement__inx=0; statement__inx<this.statements.length; statement__inx++) {
         var statement=this.statements[statement__inx];
         //statement.produce()
         statement.produce();
       }; // end for each in this.statements

       //me.out NL
       this.out(NL);
     };


   //append to Module.prototype
   
//Same as Body

     //method produce()
     Grammar.Module.prototype.produce = function(){
       //Grammar.Body.prototype.produce.apply(this,arguments)
       Grammar.Body.prototype.produce.apply(this, arguments);
     };


//-------------------------------------
   //append to Statement.prototype
   

//`Statement` objects call their specific statement node's `produce()` method
//after adding any comment lines preceding the statement

     //method produce()
     Grammar.Statement.prototype.produce = function(){

        //declare valid me.lexer.lastOriginalCodeComment
        //declare valid me.lexer.LineTypes.CODE
        //declare valid me.lexer.LineTypes.CODE
        //declare valid me.lexer.infoLines
        //declare valid me.lexer.infoLines
        //declare valid me.statement.body
        //declare valid me.statement.body
        //declare valid me.statement.skipSemiColon
        //declare valid me.statement.skipSemiColon

//add comment lines, in the same position as the source

        //me.outPrevLinesComments()
       //me.outPrevLinesComments()
       this.outPrevLinesComments();

//To ease reading of compiled code, add original Lite line as comment
//(except for EndStatement ant others which produdce it)

       //if me.lexer.lastOriginalCodeComment<me.lineInx
       if (this.lexer.lastOriginalCodeComment < this.lineInx) {
         //if not (me.statement.constructor in [
         if (!(([Grammar.ClassDeclaration, Grammar.VarStatement, Grammar.CompilerStatement, Grammar.DeclareStatement, Grammar.AssignmentStatement, Grammar.PropertiesDeclaration].indexOf(this.statement.constructor)>=0))) {
           //me.out {COMMENT: me.lexer.infoLines[me.lineInx].text.trim()},NL
           this.out({COMMENT: this.lexer.infoLines[this.lineInx].text.trim()}, NL);
         };
       };
       this.lexer.lastOriginalCodeComment = this.lineInx;

//call the specific statement (if,for,print,if,function,class,etc) .produce()

       //me.out me.statement
       this.out(this.statement);

//add ";" after the statement
//then EOL comment (if it isnt a multiline statement)
//then NEWLINE

       //if not me.statement.skipSemiColon
       if (!(this.statement.skipSemiColon)) {
         //me.out ";"
         this.out(";");
         //if not me.statement.body
         if (!(this.statement.body)) {
           //me.out me.getEOLComment()
           this.out(this.getEOLComment());
         };
       };
     };


//---------------------------------
   //append to ThrowStatement.prototype
   

     //method produce()
     Grammar.ThrowStatement.prototype.produce = function(){
         //if me.specifier is 'fail'
         if (this.specifier === 'fail') {
           //me.out "throw new Error(", me.expr,")"
           this.out("throw new Error(", this.expr, ")");
         }
         else {
           //me.out "throw ", me.expr
           this.out("throw ", this.expr);
         
         };
     };


   //append to ReturnStatement.prototype
   

     //method produce()
     Grammar.ReturnStatement.prototype.produce = function(){
       //me.out "return"
       this.out("return");
       //if me.expr
       if (this.expr) {
         //me.out " ",me.expr
         this.out(" ", this.expr);
       };
     };


   //append to FunctionCall.prototype
   

     //method produce()
     Grammar.FunctionCall.prototype.produce = function(){

       //me.varRef.produce()
       this.varRef.produce();
       //if me.varRef.executes, return #if varRef already executes, nothing more to do
       if (this.varRef.executes) {
           return};
       //me.out "()" #add (), so JS executes de function call
       this.out("()");//#add (), so JS executes de function call
     };


   //append to Operand.prototype
   

//`Operand:
  //|NumberLiteral|StringLiteral|RegExpLiteral
  //|ParenExpression|ArrayLiteral|ObjectLiteral|FunctionDeclaration
  //|VariableRef

//A `Operand` is the left or right part of a binary oper
//or the only Operand of a unary oper.

     //method produce()
     Grammar.Operand.prototype.produce = function(){

       //me.out me.name, me.accessors
       this.out(this.name, this.accessors);
     };

      //#end Operand


   //append to UnaryOper.prototype
   

//`UnaryOper: ('-'|new|type of|not|no|bitwise not) `

//A Unary Oper is an operator acting on a single operand.
//Unary Oper inherits from Oper, so both are `instance of Oper`

//Examples:
//1) `not`     *boolean negation*     `if not a is b`
//2) `-`       *numeric unary minus*  `-(4+3)`
//3) `new`     *instantiation*        `x = new classNumber[2]`
//4) `type of` *type name access*     `type of x is classNumber[2]`
//5) `no`      *'falsey' check*       `if no options then options={}`
//6) `~`       *bit-unary-negation*   `a = ~xC0 + 5`

     //method produce()
     Grammar.UnaryOper.prototype.produce = function(){

       var translated = operTranslate(this.name);

//if it is "boolean not", add parentheses, because js has a different precedence for "boolean not"
//-(prettier generated code) do not add () for simple "falsey" variable check

       //if translated is "!" and not (me.name is "no" and me.right.name instanceof Grammar.VariableRef)
       if (translated === "!" && !((this.name === "no" && this.right.name instanceof Grammar.VariableRef))) {
         var prepend = "(";
         var append = ")";
       };

//add a space if the unary operator is a word. Example `typeof`

       //if /\w/.test(translated)
       if (/\w/.test(translated)) {
         translated += " ";
       };

       //me.out translated, prepend, me.right, append
       this.out(translated, prepend, this.right, append);
     };


   //append to Oper.prototype
   

     //method produce()
     Grammar.Oper.prototype.produce = function(){

       var oper = this.name;

//default mechanism to handle 'negated' operand

       var prepend = undefined, append = undefined;
       //if me.negated # NEGATED
       if (this.negated) {//# NEGATED

//if NEGATED and the oper is `is` we convert it to 'isnt'.
//'isnt' will be translated to !==

           //if oper is 'is' # Negated is ---> !==
           if (oper === 'is') {//# Negated is ---> !==
             oper = '!==';
           }
           else {
             prepend = "!(";
             append = ")";
           
           };
       };

//Check for special cases:

//1) 'in' operator, requires swapping left and right operands and to use `.indexOf(...)>=0`
//example: `x in [1,2,3]` -> `[1,2,3].indexOf(x)>=0`
//example: `x not in [1,2,3]` -> `[1,2,3].indexOf(x)==-1`
//example: `char not in myString` -> `myString.indexOf(char)==-1`
//example (`arguments` pseudo-array): `'lite' not in arguments` -> `Array.prototype.slice.call(arguments).indexOf(char)==-1`

       //if me.name is 'in'
       if (this.name === 'in') {
           //me.out me.right,".indexOf(",me.left,")", me.negated? "===-1":">=0"
           this.out(this.right, ".indexOf(", this.left, ")", this.negated ? "===-1" : ">=0");

//fix when used on JS built-in array-like `arguments`

           this.outCode.currLine = this.outCode.currLine.replace(/\barguments.indexOf\(/, 'Array.prototype.slice.call(arguments).indexOf(');
       }
       else if (this.name === 'has property') {
           //me.out prepend, me.right," in ",me.left, append
           this.out(prepend, this.right, " in ", this.left, append);
       }
       else {
           //me.out prepend, me.left, ' ', operTranslate(oper), ' ', me.right , append
           this.out(prepend, this.left, ' ', operTranslate(oper), ' ', this.right, append);
       
       };
     };

        //#end if


   //append to Expression.prototype
   

     //method produce(options)
     Grammar.Expression.prototype.produce = function(options){

        //declare on options
          //negated

//Produce the expression body, negated if options={negated:true}

       //default options=
       if(!options) options={};
       if(options.negated===undefined) options.negated=undefined;

       var prepend = "";
       var append = "";
       //if options.negated
       if (options.negated) {

//(prettier generated code) Try to avoid unnecessary parens after '!'
//for example: if the expression is a single variable, as in the 'falsey' check:
//Example: `if no options.log then... ` --> `if (!options.log) {...`
//we don't want: `if (!(options.log)) {...`

         //if me.operandCount is 1
         if (this.operandCount === 1) {
              //#no parens needed
             prepend = "!";
         }
         else {
             prepend = "!(";
             append = ")";
         
         };
       };
          //#end if
        //#end if negated

//produce the expression body

       //me.out prepend, me.root, append
       this.out(prepend, this.root, append);
     };


   //append to VariableRef.prototype
   

//`VariableRef: ['--'|'++'] IDENTIFIER [Accessors] ['--'|'++']`

//`VariableRef` is a Variable Reference.

 //a VariableRef can include chained 'Accessors', which can:
 //*access a property of the object : `.`-> PropertyAccess `[`->IndexAccess
 //*assume the variable is a function and perform a function call :  `(`-> FunctionAccess

     //method produce()
     Grammar.VariableRef.prototype.produce = function(){

//Prefix ++/--, varName, Accessors and postfix ++/--

       //me.out me.preIncDec, me.name.translate(IDENTIFIER_ALIASES), me.accessors, me.postIncDec
       this.out(this.preIncDec, this.name.translate(IDENTIFIER_ALIASES), this.accessors, this.postIncDec);
     };


   //append to AssignmentStatement.prototype
   

     //method produce()
     Grammar.AssignmentStatement.prototype.produce = function(){

       //me.out me.lvalue, ' ', operTranslate(me.name), ' ', me.rvalue
       this.out(this.lvalue, ' ', operTranslate(this.name), ' ', this.rvalue);
     };


//-------
   //append to DefaultAssignment.prototype
   

     //method produce()
     Grammar.DefaultAssignment.prototype.produce = function(){

       //me.process(me.assignment.lvalue, me.assignment.rvalue)
       this.process(this.assignment.lvalue, this.assignment.rvalue);

       this.skipSemiColon = true;
     };

//#### helper Functions

      //#recursive duet 1
     //helper method process(name,value)
     Grammar.DefaultAssignment.prototype.process = function(name, value){

//if it is ObjectLiteral: recurse levels, else, a simple 'if undefined, assignment'

//check if it's a ObjectLiteral (level indent)

         //if value instanceof Grammar.ObjectLiteral
         if (value instanceof Grammar.ObjectLiteral) {
           //me.processItems name, value # recurse Grammar.ObjectLiteral
           this.processItems(name, value);//# recurse Grammar.ObjectLiteral
         }
         else {
           //me.assignIfUndefined name, value # Expression
           this.assignIfUndefined(name, value);//# Expression
         
         };
     };


      //#recursive duet 2
     //helper method processItems(main, objectLiteral)
     Grammar.DefaultAssignment.prototype.processItems = function(main, objectLiteral){

         //me.out "if(!",main,') ',main,"={};",NL
         this.out("if(!", main, ') ', main, "={};", NL);

         //for nameValue in objectLiteral.items
         for ( var nameValue__inx=0; nameValue__inx<objectLiteral.items.length; nameValue__inx++) {
           var nameValue=objectLiteral.items[nameValue__inx];
           var itemFullName = [main, '.', nameValue.name];
           //me.process(itemFullName, nameValue.value)
           this.process(itemFullName, nameValue.value);
         }; // end for each in objectLiteral.items
     };


    //#end helper recursive functions


//-----------
//## Accessors
//We just defer to JavaScript's built in `.` `[ ]` and `( )` accessors

   //append to PropertyAccess.prototype
   
     //method produce()
     Grammar.PropertyAccess.prototype.produce = function(){
       //me.out ".",me.name
       this.out(".", this.name);
     };

   //append to IndexAccess.prototype
   
     //method produce()
     Grammar.IndexAccess.prototype.produce = function(){
       //me.out "[",me.name,"]"
       this.out("[", this.name, "]");
     };

   //append to FunctionAccess.prototype
   
     //method produce()
     Grammar.FunctionAccess.prototype.produce = function(){
       //me.out "(",{CSL:me.args},")"
       this.out("(", {CSL: this.args}, ")");
     };

//-----------

   //append to ASTBase.prototype
   
    //     helper method lastLineInxOf(list:Grammar.ASTBase array)
    Grammar.ASTBase.prototype.lastLineInxOf = function(list){

//More Helper methods, get max line of list

       var lastLine = this.lineInx;
       //for item in list
       for ( var item__inx=0; item__inx<list.length; item__inx++) {
           var item=list[item__inx];
           //if item.lineInx>lastLine
           if (item.lineInx > lastLine) {
             lastLine = item.lineInx;
           };
       }; // end for each in list

       //return lastLine
       return lastLine;
    };


    //     method getOwnerPrefix() returns array
    Grammar.ASTBase.prototype.getOwnerPrefix = function(){

//check if we're inside a ClassDeclaration or AppendToDeclaration.
//return prefix for item to be appended

       var parent = this.getParent(Grammar.ClassDeclaration);

       //if no parent, return
       if (!parent) {
           return};

       var ownerName = undefined, toPrototype = undefined;
       //if parent instance of Grammar.AppendToDeclaration
       if (parent instanceof Grammar.AppendToDeclaration) {
          //#append to class prototype or object
          //declare parent:Grammar.AppendToDeclaration
         toPrototype = parent.optClass;
         ownerName = parent.varRef;
       }
       else {
          //declare valid me.toNamespace
          //toPrototype = not me.toNamespace #if it's a "namespace properties" or "namespace method"
         toPrototype = !(this.toNamespace);//#if it's a "namespace properties" or "namespace method"
         ownerName = parent.name;
       
       };

       //return [ownerName, toPrototype? ".prototype." : "." ]
       return [ownerName, toPrototype ? ".prototype." : "."];
    };


//---
   //append to PropertiesDeclaration.prototype
   

//'var' followed by a list of comma separated: var names and optional assignment

     //method produce()
     Grammar.PropertiesDeclaration.prototype.produce = function(){

       //me.outLinesAsComment me.lineInx, me.lastLineInxOf(me.list)
       this.outLinesAsComment(this.lineInx, this.lastLineInxOf(this.list));

       var prefix = this.getOwnerPrefix();

       //for varDecl in me.list
       for ( var varDecl__inx=0; varDecl__inx<this.list.length; varDecl__inx++) {
         var varDecl=this.list[varDecl__inx];
         //if varDecl.assignedValue
         if (varDecl.assignedValue) {
           //me.out prefix, varDecl.name,"=",varDecl.assignedValue,";",NL
           this.out(prefix, varDecl.name, "=", varDecl.assignedValue, ";", NL);
         };
       }; // end for each in this.list

       this.skipSemiColon = true;
     };

   //append to VarStatement.prototype
   

//'var' followed by a list of comma separated: var names and optional assignment

     //method produce()
     Grammar.VarStatement.prototype.produce = function(){

        //declare valid me.keyword
        //declare valid me.compilerVar
        //declare valid me.compilerVar
        //declare valid me.public
        //declare valid me.public

        //if me.keyword is 'let' and me.compilerVar('ES6')
       //if me.keyword is 'let' and me.compilerVar('ES6')
       if (this.keyword === 'let' && this.compilerVar('ES6')) {
         //me.out 'let '
         this.out('let ');
       }
       else {
         //me.out 'var '
         this.out('var ');
       
       };

//Now, after 'var' or 'let' out one or more comma separated VariableDecl

       //me.out {CSL:me.list}
       this.out({CSL: this.list});

//If 'var' was adjectivated 'public', add to module.exports

       //if me.public
       if (this.public) {
         //for item in me.list
         for ( var item__inx=0; item__inx<this.list.length; item__inx++) {
           var item=this.list[item__inx];
            //declare valid item.name
            //me.out ";", NL,'exports.',item.name,' = ', item.name,NL
           //me.out ";", NL,'exports.',item.name,' = ', item.name,NL
           this.out(";", NL, 'exports.', item.name, ' = ', item.name, NL);
         }; // end for each in this.list
       };
     };


   //append to Grammar.VariableDecl.prototype
   

//variable name and optionally assign a value

     //method produce()
     Grammar.VariableDecl.prototype.produce = function(){

//It's a `var` keyword or we're declaring function parameters.
//In any case starts with the variable name

         //me.out me.name
         this.out(this.name);

          //declare valid me.keyword
          //declare valid me.public
          //declare valid me.public

//If this VariableDecl is from a 'var' statement, we force assignment (to avoid subtle bugs,
//in LiteScript, 'var' declaration assigns 'undefined')

          //if me.parent instanceof Grammar.VarStatement
         //if me.parent instanceof Grammar.VarStatement
         if (this.parent instanceof Grammar.VarStatement) {
             //me.out ' = ',me.assignedValue or 'undefined'
             this.out(' = ', this.assignedValue || 'undefined');
         }
         else {
           //if me.assignedValue and me.compilerVar('ES6')
           if (this.assignedValue && this.compilerVar('ES6')) {
               //me.out ' = ',me.assignedValue
               this.out(' = ', this.assignedValue);
           };
         
         };
     };

    //#end VariableDecl


   //append to SingleLineStatement.prototype
   

     //method produce()
     Grammar.SingleLineStatement.prototype.produce = function(){

       var bare = [];
       //for statement in me.statements
       for ( var statement__inx=0; statement__inx<this.statements.length; statement__inx++) {
           var statement=this.statements[statement__inx];
           //bare.push statement.statement
           bare.push(statement.statement);
       }; // end for each in this.statements
       //me.out NL,"    ",{CSL:bare, separator:";"}
       this.out(NL, "    ", {CSL: bare, separator: ";"});
     };


   //append to IfStatement.prototype
   

     //method produce()
     Grammar.IfStatement.prototype.produce = function(){

        //declare valid me.elseStatement.produce

        //if me.body instanceof Grammar.SingleLineStatement
       //if me.body instanceof Grammar.SingleLineStatement
       if (this.body instanceof Grammar.SingleLineStatement) {
           //me.out "if (", me.conditional,") {",me.body, "}"
           this.out("if (", this.conditional, ") {", this.body, "}");
       }
       else {
           //me.out "if (", me.conditional, ") {", me.getEOLComment()
           this.out("if (", this.conditional, ") {", this.getEOLComment());
           //me.out  me.body, "}"
           this.out(this.body, "}");
       
       };

       //if me.elseStatement
       if (this.elseStatement) {
         //me.elseStatement.produce()
         this.elseStatement.produce();
       };
     };


   //append to ElseIfStatement.prototype
   

     //method produce()
     Grammar.ElseIfStatement.prototype.produce = function(){

       //me.out NL,"else ", me.nextIf
       this.out(NL, "else ", this.nextIf);
     };

   //append to ElseStatement.prototype
   

     //method produce()
     Grammar.ElseStatement.prototype.produce = function(){

       //me.out NL,"else {", me.body, "}"
       this.out(NL, "else {", this.body, "}");
     };

   //append to ForStatement.prototype
   

//There are 3 variants of `ForStatement` in LiteScript

     //method produce()
     Grammar.ForStatement.prototype.produce = function(){

        //declare valid me.variant.iterable
        //declare valid me.variant.produce
        //declare valid me.variant.produce

//Pre-For code. If required, store the iterable in a temp var.
//(prettier generated code) Only if the iterable is a complex expression,
//(if it can have side-effects) we store it in a temp
//var in order to avoid calling it twice. Else, we use it as is.

        //var iterable = me.variant.iterable
       var iterable = this.variant.iterable;

        //declare iterable:Grammar.Expression
        //declare valid iterable.root.name.hasSideEffects

        //if iterable
       //if iterable
       if (iterable) {
         //if iterable.operandCount>1 or iterable.root.name.hasSideEffects or iterable.root instanceof Grammar.Literal
         if (iterable.operandCount > 1 || iterable.root.name.hasSideEffects || iterable.root instanceof Grammar.Literal) {
           iterable = this.outCode.getUniqueVarName('list');//#unique temp iterable var name
           //me.out "var ",iterable,"=",me.variant.iterable,";",NL
           this.out("var ", iterable, "=", this.variant.iterable, ";", NL);
         };
       };

       //me.variant.produce(iterable)
       this.variant.produce(iterable);

//Since al 3 cases are closed with '}; //comment', we skip statement semicolon

       this.skipSemiColon = true;
     };


   //append to ForEachProperty.prototype
   
//### Variant 1) 'for each property' to loop over *object property names*

//`ForEachProperty: for each [own] property name-VariableDecl in object-VariableRef`

     //method produce(iterable)
     Grammar.ForEachProperty.prototype.produce = function(iterable){

         //me.out "for ( var ", me.indexVar, " in ", iterable, ") "
         this.out("for ( var ", this.indexVar, " in ", iterable, ") ");
         //if me.ownOnly
         if (this.ownOnly) {
           //me.out "if (",iterable,".hasOwnProperty(",me.indexVar,")) "
           this.out("if (", iterable, ".hasOwnProperty(", this.indexVar, ")) ");
         };

         //me.out "{", me.body, "}; // end for each property",NL
         this.out("{", this.body, "}; // end for each property", NL);
     };


   //append to ForIndexNumeric.prototype
   
//### Variant 2) 'for index=...' to create *numeric loops*

//`ForIndexNumeric: for index-VariableDecl "=" start-Expression [,|;] (while|until) condition-Expression [(,|;) increment-Statement]`

//Examples: `for n=0 while n<10`, `for n=0 to 9`
//Handle by using a js/C standard for(;;){} loop

     //method produce()
     Grammar.ForIndexNumeric.prototype.produce = function(){

        //declare valid me.endExpression.produce

        //me.out "for( var ",me.indexVar, "=", me.startIndex, "; "
       //me.out "for( var ",me.indexVar, "=", me.startIndex, "; "
       this.out("for( var ", this.indexVar, "=", this.startIndex, "; ");

       //if me.conditionPrefix is 'to'
       if (this.conditionPrefix === 'to') {
            //#'for n=0 to 10' -> for(n=0;n<=10;...
           //me.out me.indexVar,"<=",me.endExpression
           this.out(this.indexVar, "<=", this.endExpression);
       }
       else {

//produce the condition, negated if the prefix is 'until'

          //#for n=0, while n<arr.length  -> for(n=0;n<arr.length;...
          //#for n=0, until n >= arr.length  -> for(n=0;!(n>=arr.length);...
         //me.endExpression.produce( {negated: me.conditionPrefix is 'until' })
         this.endExpression.produce({negated: this.conditionPrefix === 'until'});
       
       };

       //me.out "; "
       this.out("; ");

//if no increment specified, the default is indexVar++

       //if me.increment
       if (this.increment) {
         //me.out me.increment
         this.out(this.increment);
       }
       else {
         //me.out me.indexVar,"++"
         this.out(this.indexVar, "++");
       
       };

       //me.out "){", me.body, "}; // end for ", me.indexVar,NL
       this.out("){", this.body, "}; // end for ", this.indexVar, NL);
     };


   //append to ForEachInArray.prototype
   
//### Variant 3) 'for each index' to loop over *Array indexes and items*

//`ForEachInArray: for each [index-VariableDecl,]item-VariableDecl in array-VariableRef`

     //method produce(iterable)
     Grammar.ForEachInArray.prototype.produce = function(iterable){

//Create a default index var name if none was provided

       var indexVar = this.indexVar;
       //if no indexVar
       if (!indexVar) {
         indexVar = this.mainVar + '__inx';//#default index var name
       };

       //me.out "for ( var ", indexVar,"=0,",me.mainVar,"=undefined; ",indexVar,"<",iterable,".length; ",indexVar,"++) {",NL
       this.out("for ( var ", indexVar, "=0,", this.mainVar, "=undefined; ", indexVar, "<", iterable, ".length; ", indexVar, "++) {", NL);

       //me.body.out "var ",me.mainVar,"=",iterable,"[",indexVar,"];"
       this.body.out("var ", this.mainVar, "=", iterable, "[", indexVar, "];");

       //me.out me.body, "}; // end for each in ", me.iterable,NL
       this.out(this.body, "}; // end for each in ", this.iterable, NL);
     };


   //append to WhileUntilExpression.prototype
   

     //method produce(options)
     Grammar.WhileUntilExpression.prototype.produce = function(options){

//If the parent ask for a 'while' condition, but this is a 'until' condition,
//or the parent ask for a 'until' condition and this is 'while', we must *negate* the condition.

        //declare valid me.expr.produce

        //default options =
       //default options =
       if(!options) options={};
       if(options.askFor===undefined) options.askFor=undefined;
       if(options.negated===undefined) options.negated=undefined;

       //if options.askFor and me.name isnt options.askFor
       if (options.askFor && this.name !== options.askFor) {
           options.negated = true;
       };

//*options.askFor* is used when the source code was, for example,
//`do until Expression` and we need to code: `while(!(Expression))`
//or the code was `loop while Expression` and we need to code: `if (!(Expression)) break`

//when you have a `until` condition, you need to negate the expression
//to produce a `while` condition. (`while NOT x` is equivalent to `until x`)

       //me.expr.produce(options)
       this.expr.produce(options);
     };


   //append to DoLoop.prototype
   

     //method produce()
     Grammar.DoLoop.prototype.produce = function(){

//Note: **WhileUntilLoop** symbol has **DoLoop** as *prototype*, so this *.produce()* method
//is used by both symbols.

       //if me.postWhileUntilExpression
       if (this.postWhileUntilExpression) {

//if we have a post-condition, for example: `do ... loop while x>0`,

           //me.out "do{", me.getEOLComment()
           this.out("do{", this.getEOLComment());
           //me.out me.body
           this.out(this.body);
           //me.out "} while ("
           this.out("} while (");
           //me.postWhileUntilExpression.produce({askFor:'while'})
           this.postWhileUntilExpression.produce({askFor: 'while'});
           //me.out ");",{COMMENT:"end loop"},NL
           this.out(");", {COMMENT: "end loop"}, NL);
       }
       else {

           //me.out 'while('
           this.out('while(');
           //if me.preWhileUntilExpression
           if (this.preWhileUntilExpression) {
             //me.preWhileUntilExpression.produce({askFor:'while'})
             this.preWhileUntilExpression.produce({askFor: 'while'});
           }
           else {
             //me.out 'true'
             this.out('true');
           
           };
           //me.out '){', me.body , "};",{COMMENT:"end loop"},NL
           this.out('){', this.body, "};", {COMMENT: "end loop"}, NL);
       
       };

       //end if
       };


   //append to LoopControlStatement.prototype
   
//This is a very simple produce() to allow us to use the `break` and `continue` keywords.

     //method produce()
     Grammar.LoopControlStatement.prototype.produce = function(){
       //me.out me.control
       this.out(this.control);
     };

   //append to DoNothingStatement.prototype
   

     //method produce()
     Grammar.DoNothingStatement.prototype.produce = function(){
       //me.out "null"
       this.out("null");
     };

   //append to ParenExpression.prototype
   

//A `ParenExpression` is just a normal expression surrounded by parentheses.

     //method produce()
     Grammar.ParenExpression.prototype.produce = function(){
       //me.out "(",me.expr,")"
       this.out("(", this.expr, ")");
     };

   //append to ArrayLiteral.prototype
   

//A `ArrayLiteral` is a definition of a list like `[1, a, 2+3]`. We just pass this through to JavaScript.

     //method produce()
     Grammar.ArrayLiteral.prototype.produce = function(){
       //me.out "[",{CSL:me.items},"]"
       this.out("[", {CSL: this.items}, "]");
     };

   //append to NameValuePair.prototype
   

//A `NameValuePair` is a single item in an object definition. Since we copy js for this, we pass this straight through

     //method produce()
     Grammar.NameValuePair.prototype.produce = function(){
       //me.out me.name,": ",me.value
       this.out(this.name, ": ", this.value);
     };

   //append to ObjectLiteral.prototype
   

//A `ObjectLiteral` is an object definition using key/value pairs like `{a:1,b:2}`.
//JavaScript supports this syntax, so we just pass it through.

     //method produce()
     Grammar.ObjectLiteral.prototype.produce = function(){
       //me.out "{",{CSL:me.items},"}"
       this.out("{", {CSL: this.items}, "}");
     };

   //append to FreeObjectLiteral.prototype
   

//A `FreeObjectLiteral` is an object definition using key/value pairs, but in free-form
//(one NameValuePair per line, indented, comma is optional)

     //method produce()
     Grammar.FreeObjectLiteral.prototype.produce = function(){
       //me.out "{",{CSL:me.items, freeForm:true},"}"
       this.out("{", {CSL: this.items, freeForm: true}, "}");
     };


   //append to FunctionDeclaration.prototype
   

//`FunctionDeclaration: '[public][generator] (function|method|constructor) [name] '(' FunctionParameterDecl* ')' Block`

//`FunctionDeclaration`s are function definitions.

//`public` prefix causes the function to be included in `module.exports`
//`generator` prefix marks a 'generator' function that can be paused by `yield` (js/ES6 function*)

    //method produce()
    Grammar.FunctionDeclaration.prototype.produce = function(){

      //declare valid me.public
      //declare valid me.generator
      //declare valid me.generator
      //declare valid me.exceptionBlock
      //declare valid me.exceptionBlock

//Generators are implemented in ES6 with the "function*" keyword (note the asterisk)

      //var generatorMark = ""
     var generatorMark = "";
     //if me.generator and me.compilerVar('ES6')
     if (this.generator && this.compilerVar('ES6')) {
       generatorMark = "*";
     };

//check if we're inside a ClassDeclaration or AppendToDeclaration

     //if me instance of Grammar.ConstructorDeclaration
     if (this instanceof Grammar.ConstructorDeclaration) {
          //# class constructor: JS's function-class-object-constructor
         //me.out "function ",me.getParent(Grammar.ClassDeclaration).name
         this.out("function ", this.getParent(Grammar.ClassDeclaration).name);
     }
     else {
         var prefix = this.getOwnerPrefix();

         //if no prefix and me instance of Grammar.MethodDeclaration
         if (!prefix && this instanceof Grammar.MethodDeclaration) {
             //debugger
             debugger;
             //fail with "method #me.name. Can not determine owner object"
             throw new Error("method " + this.name + ". Can not determine owner object");
         };

         //if no prefix #no class, just a scope function
         if (!prefix) {//#no class, just a scope function
             //me.out "function ",me.name, generatorMark
             this.out("function ", this.name, generatorMark);
         }
         else {
             //me.out prefix, me.name," = function",generatorMark
             this.out(prefix, this.name, " = function", generatorMark);
         
         };
     
     };
//now produce function parameters declaration

     //me.out "(", {CSL:me.paramsDeclarations}, "){", me.getEOLComment()
     this.out("(", {CSL: this.paramsDeclarations}, "){", this.getEOLComment());

//if the function has a exception block, insert 'try{'

     //for each statement in me.body.statements
     for ( var statement__inx=0; statement__inx<this.body.statements.length; statement__inx++) {
       var statement=this.body.statements[statement__inx];
       //if statement.statement instance of Grammar.ExceptionBlock
       if (statement.statement instanceof Grammar.ExceptionBlock) {
           //me.out " try{",NL
           this.out(" try{", NL);
           //break
           break;
       };
     }; // end for each in this.body.statements

//if params defaults where included, we assign default values to arguments
//(if ES6 enabled, they were included abobve in ParamsDeclarations production )

     //if me.paramsDeclarations and not me.compilerVar('ES6')
     if (this.paramsDeclarations && !(this.compilerVar('ES6'))) {
         //for paramDecl in me.paramsDeclarations
         for ( var paramDecl__inx=0; paramDecl__inx<this.paramsDeclarations.length; paramDecl__inx++) {
           var paramDecl=this.paramsDeclarations[paramDecl__inx];
           //if paramDecl.assignedValue
           if (paramDecl.assignedValue) {
               //me.body.assignIfUndefined paramDecl.name, paramDecl.assignedValue
               this.body.assignIfUndefined(paramDecl.name, paramDecl.assignedValue);
           };
         }; // end for each in this.paramsDeclarations
     };
          //#end for
      //#end if

//now produce function body

     //me.body.produce()
     this.body.produce();

//close the function

     //me.out "}"
     this.out("}");

//If the function was adjectivated 'public', add to module.exports

     //if me.public
     if (this.public) {
       //me.out ";",NL,'exports.',me.name,'=',me.name
       this.out(";", NL, 'exports.', this.name, '=', this.name);
     };
    };


//--------------------
   //append to PrintStatement.prototype
   
//`print` is an alias for console.log

     //method produce()
     Grammar.PrintStatement.prototype.produce = function(){
       //me.out "console.log(",{"CSL":me.args},")"
       this.out("console.log(", {"CSL": this.args}, ")");
     };


//--------------------
   //append to EndStatement.prototype
   

//Marks the end of a block. It's just a comment for javascript

     //method produce()
     Grammar.EndStatement.prototype.produce = function(){

        //declare valid me.lexer.lastOriginalCodeComment
        //declare valid me.lexer.infoLines
        //declare valid me.lexer.infoLines

        //if me.lexer.lastOriginalCodeComment<me.lineInx
       //if me.lexer.lastOriginalCodeComment<me.lineInx
       if (this.lexer.lastOriginalCodeComment < this.lineInx) {
         //me.out {COMMENT: me.lexer.infoLines[me.lineInx].text}
         this.out({COMMENT: this.lexer.infoLines[this.lineInx].text});
       };

       this.skipSemiColon = true;
     };

//--------------------
   //append to CompilerStatement.prototype
   

     //method produce()
     Grammar.CompilerStatement.prototype.produce = function(){

//first, out as comment this line

       //me.outLineAsComment me.lineInx
       this.outLineAsComment(this.lineInx);

//if it's a conditional compile, output body is option is Set

       //if me.conditional
       if (this.conditional) {
           //if me.compilerVar(me.conditional)
           if (this.compilerVar(this.conditional)) {
                //declare valid me.body.produce
                //me.body.produce()
               //me.body.produce()
               this.body.produce();
           };
       };

       this.skipSemiColon = true;
     };


//--------------------
   //append to DeclareStatement.prototype
   

//Out as comments

     //method produce()
     Grammar.DeclareStatement.prototype.produce = function(){

       //me.outLinesAsComment me.lineInx, me.lastLineInxOf(me.names)
       this.outLinesAsComment(this.lineInx, this.lastLineInxOf(this.names));
       this.skipSemiColon = true;
     };


//----------------------------
   //append to ClassDeclaration.prototype
   

//Classes contain a code block with properties and methods definitions.

     //method produce()
     Grammar.ClassDeclaration.prototype.produce = function(){

       //me.out {COMMENT:" Class "},me.name
       this.out({COMMENT: " Class "}, this.name);
       //if me.varRefSuper
       if (this.varRefSuper) {
         //me.out ", extends|inherits from ", me.varRefSuper
         this.out(", extends|inherits from ", this.varRefSuper);
       };
       //me.out ", constructor:",NL
       this.out(", constructor:", NL);

//First, since in JS we have a object-class-function-constructor  all-in-one
//we need to get the class constructor, and separate other class items.

        //declare theConstructor:Grammar.FunctionDeclaration
        //declare valid me.produce_AssignObjectProperties
        //declare valid me.public
        //declare valid me.public

        //var theConstructor = null
       var theConstructor = null;
       var methodsAndProperties = [];

       //if me.body
       if (this.body) {
         //for item at index in me.body.statements
         for ( var index=0; index<this.body.statements.length; index++) {
           var item=this.body.statements[index];

           //if item.statement instanceof Grammar.ConstructorDeclaration
           if (item.statement instanceof Grammar.ConstructorDeclaration) {

             //if theConstructor # what? more than one?
             if (theConstructor) {//# what? more than one?
               //me.throwError('Two constructors declared for class #{me.name}')
               this.throwError('Two constructors declared for class ' + (this.name));
             };

             theConstructor = item.statement;
           }
           else {
             //methodsAndProperties.push item
             methodsAndProperties.push(item);
           
           };
         }; // end for each in this.body.statements
       };

        //#end if body

       //if theConstructor
       if (theConstructor) {
         //me.out theConstructor,";",NL
         this.out(theConstructor, ";", NL);
       }
       else {
          //#out a default "constructor"
         //me.out "function ",me.name,"(){"
         this.out("function ", this.name, "(){");
         //if me.varRefSuper
         if (this.varRefSuper) {
             //me.out NL,"    // default constructor: call super.constructor"
             this.out(NL, "    // default constructor: call super.constructor");
             //me.out NL,"    return ",me.varRefSuper,".prototype.constructor.apply(this,arguments)",NL
             this.out(NL, "    return ", this.varRefSuper, ".prototype.constructor.apply(this,arguments)", NL);
         };
         //me.out "};",NL
         this.out("};", NL);
       
       };
        //#end if

//Set parent class if we have one indicated

       //if me.varRefSuper
       if (this.varRefSuper) {
         //me.out '// ',me.name,' (extends|super is) ',me.varRefSuper, NL
         this.out('// ', this.name, ' (extends|super is) ', this.varRefSuper, NL);
         //me.out me.name,'.prototype.__proto__ = ', me.varRefSuper,'.prototype;',NL
         this.out(this.name, '.prototype.__proto__ = ', this.varRefSuper, '.prototype;', NL);
       };

//now out class body, which means create properties in the object-function-class prototype

       //me.out NL,'// declared properties & methods',NL
       this.out(NL, '// declared properties & methods', NL);
       //me.out methodsAndProperties
       this.out(methodsAndProperties);

//If the class was adjectivated 'public', add to module.exports

       //if me.public
       if (this.public) {
         //me.out NL,'exports.',me.name,' = ', me.name,";"
         this.out(NL, 'exports.', this.name, ' = ', this.name, ";");
       };

       //me.out NL,{COMMENT:"end class "},me.name,NL
       this.out(NL, {COMMENT: "end class "}, this.name, NL);
       this.skipSemiColon = true;
     };


   //append to AppendToDeclaration.prototype
   

//Any class|object can have properties or methods appended at any time.
//Append-to body contains properties and methods definitions.

     //method produce()
     Grammar.AppendToDeclaration.prototype.produce = function(){
       //me.out me.body
       this.out(this.body);
       this.skipSemiColon = true;
     };


   //append to TryCatch.prototype
   

     //method produce()
     Grammar.TryCatch.prototype.produce = function(){

       //me.out "try{", me.body, me.exceptionBlock
       this.out("try{", this.body, this.exceptionBlock);
     };

   //append to ExceptionBlock.prototype
   

     //method produce()
     Grammar.ExceptionBlock.prototype.produce = function(){

       //me.out NL,"}catch(",me.catchVar,"){", me.body, "}"
       this.out(NL, "}catch(", this.catchVar, "){", this.body, "}");

       //if me.finallyBody
       if (this.finallyBody) {
         //me.out NL,"finally{", me.finallyBody, "}"
         this.out(NL, "finally{", this.finallyBody, "}");
       };
     };


   //append to WaitForAsyncCall.prototype
   

     //method produce()
     Grammar.WaitForAsyncCall.prototype.produce = function(){

        //declare valid me.call.funcRef
        //declare valid me.call.args
        //declare valid me.call.args

        //me.out "wait.for(", {CSL:[me.call.funcRef].concat(me.call.args)} ,")"
       //me.out "wait.for(", {CSL:[me.call.funcRef].concat(me.call.args)} ,")"
       this.out("wait.for(", {CSL: [this.call.funcRef].concat(this.call.args)}, ")");
     };