//The Abstract Syntax Tree (AST) Base class
//-----------------------------------------

//This module defines the base abstract syntax tree class used by the grammar.
//It's main purpose is to provide utility methods used in the grammar
//for **req**uired tokens, **opt**ional tokens
//and comma or semicolon **Separated Lists** of symbols.

//Dependencies

   var Lexer = require('./Lexer');

//----------------------------------------------------------------------------------------------
   //class OutCode, constructor:
   function OutCode(){};
   
   // declared properties & methods
//This class contains helper methods for AST nodes's `produce()` methods
//It also handles SourceMap generation for Chrome Developer Tools debugger and Firefox Firebug

//Source Map
//globalMap for sourceMapping
//https://github.com/mozilla/source-map#with-sourcemapgenerator-low-level-api


     //     properties

      //lineNum, column
      //currLine:string
      //lines:string array
      //uniqueIds={}
      //sourceMap
     OutCode.prototype.uniqueIds={};

    //     method start()
    OutCode.prototype.start = function(){
//Initialize output array

       this.lineNum = 1;
       this.column = 1;
       this.lines = [];
       this.uniqueIds = {};
    };

        //#me.sourceMap #= require('../sourceMap.js')

    //     method getUniqueVarName(prefix)
    OutCode.prototype.getUniqueVarName = function(prefix){
//Generate unique variable names

       var id = this.uniqueIds[prefix] || 0;

       id += 1;

       this.uniqueIds[prefix] = id;

       //return prefix + '__' + id
       return prefix + '__' + id;
    };


    //     method out(text:string)
    OutCode.prototype.out = function(text){
//out a string into produced code

//if no current line
//create a empty one

       //if me.currLine is undefined
       if (this.currLine === undefined) {
           this.currLine = "";
           this.column = 1;
       };

//append text to line

       //if text
       if (text) {
           this.currLine += text;
           this.column += text.length;
       };
    };


    //     method startNewLine()
    OutCode.prototype.startNewLine = function(){
//Start New Line into produced code

//send the current line

         //me.lines.push(me.currLine or "")
         this.lines.push(this.currLine || "");
         //debug( me.lineNum+ ' '+ me.currLine)
         debug(this.lineNum + ' ' + this.currLine);

//clear current line

         this.lineNum += 1;
         this.currLine = undefined;
    };


    //     method getResult()
    OutCode.prototype.getResult = function(){
//get result and clear memory

       //me.startNewLine() #close last line
       this.startNewLine();//#close last line
       var result = this.lines;
       this.lines = [];
       //return result
       return result;
    };
   
   //end class OutCode


   //class ASTBase, constructor:
   function ASTBase(parent, name){

       this.parent = parent;
       this.name = name;

//Get lexer from parent

       this.lexer = parent.lexer;

//Remember this node source position.
//Also remember line index in tokenized lines, and indent

       //if me.lexer
       if (this.lexer) {
         this.sourceLineNum = this.lexer.sourceLineNum;
         this.column = this.lexer.token.column;
         this.indent = this.lexer.indent;
         this.lineInx = this.lexer.lineInx;
       };
    };
   
   // declared properties & methods
     //     properties
        //parent,

        //name, keyword, type

        //lexer:Lexer, lineInx
        //sourceLineNum, column
        //indent, locked
        //index
        //outCode = new OutCode()
       ASTBase.prototype.outCode=new OutCode();

        //#debug "created",me.constructor.name,"indent",me.indent

//------------------------------------------------------------------------
    //     method lock()
    ASTBase.prototype.lock = function(){
//**lock** marks this node as "locked", meaning we are certain this is the right class
//for the given syntax. For example, if the `FunctionDeclaration` class see the token `function`,
//we are certain this is the right class to use, so we 'lock()'.
//Once locked, any **req**uired token not present causes compilation to fail.

       this.locked = true;
    };

    //     helper method getParent(searchedClass)
    ASTBase.prototype.getParent = function(searchedClass){
//**getParent** method searchs up the AST tree until a specfied node class is found

       var node = this;
       //while node and not(node instanceof searchedClass)
       while(node && !((node instanceof searchedClass))){
       
           node = node.parent;//# move to parent
       
       };//end loop
       ;
       //return node
       return node;
    };


    //     helper method positionText()
    ASTBase.prototype.positionText = function(){

       //if not me.lexer, return "(built-in)"
       if (!(this.lexer)) {
           return "(built-in)"};
       //return "#{me.lexer.filename}:#{me.sourceLineNum}:#{me.column or 0}"
       return "" + (this.lexer.filename) + ":" + (this.sourceLineNum) + ":" + (this.column || 0);
    };

    //     helper method toString()
    ASTBase.prototype.toString = function(){

       //return "[#{me.constructor.name}]"
       return "[" + (this.constructor.name) + "]";
    };


    //     method throwError(msg)
    ASTBase.prototype.throwError = function(msg){
//**throwError** add node position info and throws a 'controled' error.

//A 'controled' error, shows only err.message

//A 'un-controled' error is an unhandled exception in the compiler code itself,
//and it shows error message *and stack trace*.

       var err = new Error("" + (this.positionText()) + ". " + msg);
       err.controled = true;
       //throw err
       throw err;
    };

    //     helper method sayErr(msg)
    ASTBase.prototype.sayErr = function(msg){

       //log.error me.positionText(), msg
       log.error(this.positionText(), msg);
    };


    //     method throwParseFailed(msg)
    ASTBase.prototype.throwParseFailed = function(msg){
//throws a parseFailed-error

//During a node.parse(), if there is a token mismatch, a "parse failed" is raised.
//"parse failed" signals a failure to parse the tokens from the stream,
//however the syntax might still be valid for another AST node.
//If the AST node was locked-on-target, it is a hard-error.
//If the AST node was NOT locked, it's a soft-error, and will not abort compilation
//as the parent node will try other AST classes against the token stream before failing.

       var err = new Error(msg);
       err.soft = !(this.locked);//#if not locked, is a soft-error, another Grammar class migth parse.
       err.controled = true;
       //throw err
       throw err;
    };

    //     method parse()
    ASTBase.prototype.parse = function(){
//abstract method representing the TRY-Parse of the node.
//Child classes _must_ override this method

       //me.throwError 'Parser Not Implemented: ' + me.constructor.name
       this.throwError('Parser Not Implemented: ' + this.constructor.name);
    };

    //     method produce()
    ASTBase.prototype.produce = function(){
//**produce()** is the method to produce target code
//Target code produces should override this, if the default production isnt: `me.out me.name`

       //me.out me.name
       this.out(this.name);
    };

    //     method parseDirect(key,directObj)
    ASTBase.prototype.parseDirect = function(key, directObj){

//We use a DIRECT associative array to pick the exact AST node to parse
//based on the actual token value or type.
//This speeds up parsing, avoiding parsing by trial & error

//Check keyword

       //if directObj.hasOwnProperty(key)
       if (directObj.hasOwnProperty(key)) {

//get class

           var directASTNode = directObj[key];

//try parse

           var statement = this.opt(directASTNode);

//if parsed ok, assign keyword for reference

            //declare valid statement.keyword
            //if statement
           //if statement
           if (statement) {
               statement.keyword = key;
           };

//return parsed statement or nothing

           //return statement
           return statement;
       };
    };



    //     method opt()
    ASTBase.prototype.opt = function(){
//**opt** (optional) is for optional parts of a grammar. It attempts to parse
//the token stream using one of the classes or token types specified.
//This method takes a variable number of arguments.
//For example:
  //calling `me.opt IfStatement, Expression, 'IDENTIFIER'`
  //would attempt to parse the token stream first as an `IfStatement`. If that fails, it would attempt
  //to use the `Expression` class. If that fails, it will accept a token of type `IDENTIFIER`.
  //If all of those fail, it will return `undefined`.

//Method start:
//Remember the actual position, to rewind if all the arguments to `opt` fail

       var startPos = this.lexer.getPos();

        //declare on startPos
          //index,sourceLineNum,column,token
        //declare valid startPos.token.column

        //#debug
        //var spaces = me.levelIndent()
       var spaces = this.levelIndent();

//For each argument, -a class or a string-, we will attempt to parse the token stream
//with the class, or match the token type to the string.

       //for searched in arguments
       for ( var searched__inx=0; searched__inx<arguments.length; searched__inx++) {
         var searched=arguments[searched__inx];

          //declare on searched
            //toUpperCase #for strings
            //name #for AST nodes

//skip empty, null & undefined

         //if no searched, continue
         if (!searched) {
             continue};

//determine value or type
//For strings we check the token **value** or **TYPE** (if searched is all-uppercase)

         //if typeof searched is 'string'
         if (typeof searched === 'string') {

            //#debug spaces, me.constructor.name,'TRY',searched, 'on', me.lexer.token.toString()

           var isTYPE = /^[A-Z]+$/.test(searched);
           var found = undefined;

           //if isTYPE
           if (isTYPE) {
             found = this.lexer.token.type === searched;
           }
           else {
             found = this.lexer.token.value === searched;
           
           };

           //if found
           if (found) {

//Ok, type/value found! now we return: token.value
//Note: we shouldnt return the 'token' object, because returning objects (here and in js)
//is a "pass by reference". You return a "pointer" to the object.
//If we return the 'token' object, the calling function will recive a "pointer"
//and it can inadvertedly alter the token object in the token stream. (it should not, leads to subtle bugs)

             //debug spaces, me.constructor.name,'matched OK:',searched, me.lexer.token.value
             debug(spaces, this.constructor.name, 'matched OK:', searched, this.lexer.token.value);
             var result = this.lexer.token.value;

//Advance a token, me.lexer.token always has next token

             //me.lexer.nextToken()
             this.lexer.nextToken();
             //return result
             return result;
           };
         }
         else {

//"searched" is a AST class

           //debug spaces, me.constructor.name,'TRY',searched.name, 'on', me.lexer.token.toString()
           debug(spaces, this.constructor.name, 'TRY', searched.name, 'on', this.lexer.token.toString());

//if the argument is an AST node class, we instantiate the class and try the `parse()` method.
//`parse()` can fail with `ParseFailed` if the syntax do not match

           //try
           try{

               var astNode = new searched(this);
               //astNode.parse() # if it can't parse, will raise an exception
               astNode.parse();//# if it can't parse, will raise an exception

               //debug spaces, 'Parsed OK!->',searched.name
               debug(spaces, 'Parsed OK!->', searched.name);

               //return astNode # parsed ok!, return instance
               return astNode;//# parsed ok!, return instance
           
           }catch(err){

//If parsing fail, but the AST node were not 'locked' on target, (a soft-error),
//we will try other AST nodes.

             //if err.soft
             if (err.soft) {
                 this.lexer.softError = err;
                 //debug spaces, searched.name,'parse failed.',err.message
                 debug(spaces, searched.name, 'parse failed.', err.message);

//rewind the token stream, to try other AST nodes

                 //debug "<<REW to", "#{startPos.sourceLineNum}:#{startPos.token.column or 0} [#{startPos.index}]", startPos.token.toString()
                 debug("<<REW to", "" + (startPos.sourceLineNum) + ":" + (startPos.token.column || 0) + " [" + (startPos.index) + "]", startPos.token.toString());
                 //me.lexer.setPos startPos
                 this.lexer.setPos(startPos);
             }
             else {

//else: it's a hard-error. The AST node were locked-on-target.
//We abort parsing and throw.

                  //# debug

                  //# the first hard-error is the most informative, the others are cascading ones
                 //if me.lexer.hardError is null
                 if (this.lexer.hardError === null) {
                     this.lexer.hardError = err;
                 };
                  //#end if

//raise up, abort parsing

                 //raise err
                 throw err;
             
             };
           };
         
         };
       }; // end for each in arguments

              //#end if - type of error

            //#end catch

          //#end if - string or class

        //#loop - try the next argument

//No more arguments.
//`opt` returns `undefined` if none of the arguments could be use to parse the stream.

       //return undefined
       return undefined;
    };

      //#end method opt


    //     method req()
    ASTBase.prototype.req = function(){

//**req** (required) if for required symbols of the grammar. It works the same way as `opt`
//except that it throws an error if none of the arguments can be used to parse the stream.

//We first call `opt` to see what we get. If a value is returned, the function was successful,
//so we just return the node that `opt` found.

//else, If `opt` returned nothing, we give the user a useful error.

       var result = this.opt.apply(this, arguments);

       //if no result
       if (!result) {
         //me.throwParseFailed "#{me.lexer.posToString()} #{me.constructor.name}: found #{me.lexer.token.toString()} but #{me.listArgs(arguments)} required"
         this.throwParseFailed("" + (this.lexer.posToString()) + " " + (this.constructor.name) + ": found " + (this.lexer.token.toString()) + " but " + (this.listArgs(arguments)) + " required");
       };

       //return result
       return result;
    };


    //     method reqOneOf(arr)
    ASTBase.prototype.reqOneOf = function(arr){
//(performance) call req only if next token in list

       //if me.lexer.token.value in arr
       if (arr.indexOf(this.lexer.token.value)>=0) {
           //return me.req.apply(this,arr)
           return this.req.apply(this, arr);
       }
       else {
           //me.throwParseFailed "not in list"
           this.throwParseFailed("not in list");
       
       };
    };


    //     method optList()
    ASTBase.prototype.optList = function(){
//this generic method will look for zero or more of the requested classes,

       var item = undefined;
       var list = [];

       //do
       while(true){
       
         item = this.opt.apply(this, arguments);
         //if no item then break
         if (!item) {
             break};
         //list.push item
         list.push(item);
       
       };//end loop
       ;

       //return list.length? list : undefined
       return list.length ? list : undefined;
    };


    //     method optSeparatedList(astClass:ASTBase, separator, closer) #[Separated Lists]
    ASTBase.prototype.optSeparatedList = function(astClass, separator, closer){//#[Separated Lists]

//Start optSeparatedList

       var result = [];

//If the list starts with a NEWLINE,
//process as free-form mode separated list, where NEWLINE is a valid separator.

       //if me.lexer.token.type is 'NEWLINE'
       if (this.lexer.token.type === 'NEWLINE') {
         //return me.optFreeFormList( astClass, separator, closer )
         return this.optFreeFormList(astClass, separator, closer);
       };

//normal separated list,
//loop until closer found

       //debug "optSeparatedList [#{me.constructor.name}] indent:#{me.indent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no closer char-'
       debug("optSeparatedList [" + (this.constructor.name) + "] indent:" + (this.indent) + ", get SeparatedList of [" + (astClass.name) + "] by '" + (separator) + "' closer:", closer || '-no closer char-');

       var startLine = this.lexer.sourceLineNum;
       //do until me.opt(closer)
       while(!this.opt(closer)){
       

//get a item

           var item = this.req(astClass);
           //me.lock()
           this.lock();

//add item to result

           //result.push(item)
           result.push(item);

//newline after item (before comma or closer) is optional

           //if separator is ';' and me.lexer.token.type is 'NEWLINE'
           if (separator === ';' && this.lexer.token.type === 'NEWLINE') {
               //return result
               return result;
           };

           //me.opt('NEWLINE')
           this.opt('NEWLINE');

//if, after newline, we got the closer, then exit.

           //if me.opt(closer) then break #closer found
           if (this.opt(closer)) {
               break};

//here, a 'separator' (comma/semicolon) means: 'there is another item'.
//Any token other than 'separator' means 'end of list'

           //if no me.opt(separator)
           if (!this.opt(separator)) {
              //# any token other than comma/semicolon means 'end of comma separated list'
              //# but if a closer was required, then "other" token is an error
             //if closer, me.throwError "Expected '#{closer}' to end list started at line #{startLine}"
             if (closer) {
                 this.throwError("Expected '" + (closer) + "' to end list started at line " + (startLine))};
             //break # else ok, end of list
             break;//# else ok, end of list
           };
           //end if

//optional newline after comma

           //if separator is ';' and me.lexer.token.type is 'NEWLINE'
           if (separator === ';' && this.lexer.token.type === 'NEWLINE') {
               //return result
               return result;
           };

           //me.opt('NEWLINE')
           this.opt('NEWLINE');
       
       };//end loop
       ;

       //return result
       return result;
    };

    //     method optFreeFormList(astClass:ASTBase, separator, closer)
    ASTBase.prototype.optFreeFormList = function(astClass, separator, closer){

//In "freeForm Mode", each item stands in its own line, and commas (separators) are optional.
//The item list ends when a closer is found or when indentation changes

       var result = [];
       var lastItemSourceLine = -1;
       var separatorAfterItem = undefined;
       var parentIndent = this.parent.indent;

//FreeFormList should start with NEWLINE
//First line sets indent level

       //me.req "NEWLINE"
       this.req("NEWLINE");
       var startLine = this.lexer.sourceLineNum;
       var blockIndent = this.lexer.indent;

       //debug "optFreeFormList [#{me.constructor.name}] parentname:#{me.parent.name} parentIndent:#{parentIndent}, blockIndent:#{blockIndent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no-'
       debug("optFreeFormList [" + (this.constructor.name) + "] parentname:" + (this.parent.name) + " parentIndent:" + (parentIndent) + ", blockIndent:" + (blockIndent) + ", get SeparatedList of [" + (astClass.name) + "] by '" + (separator) + "' closer:", closer || '-no-');

       //if blockIndent <= parentIndent #first line is same or less indented than parent - assume empty list
       if (blockIndent <= parentIndent) {//#first line is same or less indented than parent - assume empty list
         //me.lexer.sayErr "free-form SeparatedList: next line is same or less indented (#{blockIndent}) than parent indent (#{parentIndent}) - assume empty list"
         this.lexer.sayErr("free-form SeparatedList: next line is same or less indented (" + (blockIndent) + ") than parent indent (" + (parentIndent) + ") - assume empty list");
         //return result
         return result;
       };

//now loop until closer or an indent change

       //do until me.opt(closer) #if closer found (`]`, `)`, `}`), end of list
       while(!this.opt(closer)){
       

//check for indent changes

           //debug "freeForm Mode me.lexer.indent:#{me.lexer.indent} block indent:#{blockIndent} parentIndent:#{parentIndent}"
           debug("freeForm Mode me.lexer.indent:" + (this.lexer.indent) + " block indent:" + (blockIndent) + " parentIndent:" + (parentIndent));
           //if me.lexer.indent isnt blockIndent
           if (this.lexer.indent !== blockIndent) {

//indent changed:
//if a closer was specified, indent change before the closer means error (line misaligned)

                 //if closer
                 if (closer) {
                   //me.lexer.throwErr "Misaligned indent: #{me.lexer.indent}. Expected #{blockIndent}, or '#{closer}' to end block started at line #{startLine}"
                   this.lexer.throwErr("Misaligned indent: " + (this.lexer.indent) + ". Expected " + (blockIndent) + ", or '" + (closer) + "' to end block started at line " + (startLine));
                 };

//check for excesive indent

                 //if me.lexer.indent > blockIndent
                 if (this.lexer.indent > blockIndent) {
                   //me.lexer.throwErr "Misaligned indent: #{me.lexer.indent}. Expected #{blockIndent} to continue block, or #{parentIndent} to close block started at line #{startLine}"
                   this.lexer.throwErr("Misaligned indent: " + (this.lexer.indent) + ". Expected " + (blockIndent) + " to continue block, or " + (parentIndent) + " to close block started at line " + (startLine));
                 };

//else, if no closer specified, and indent decreased => end of list

                 //break #end of list
                 break;//#end of list
           };

           //end if

//check for more than one statement on the same line, with no separator

           //if not separatorAfterItem and me.lexer.sourceLineNum is lastItemSourceLine
           if (!(separatorAfterItem) && this.lexer.sourceLineNum === lastItemSourceLine) {
               //me.lexer.sayErr "More than one [#{astClass.name}] on line #{lastItemSourceLine}. Missing ( ) on function call?"
               this.lexer.sayErr("More than one [" + (astClass.name) + "] on line " + (lastItemSourceLine) + ". Missing ( ) on function call?");
           };

           lastItemSourceLine = this.lexer.sourceLineNum;

//else, get a item

           var item = this.req(astClass);
           //me.lock()
           this.lock();

//add item to result

           //result.push(item)
           result.push(item);

//newline after item (before comma or closer) is optional

           //me.opt('NEWLINE')
           this.opt('NEWLINE');

//separator (comma|semicolon) is optional,
//NEWLINE also is optional and valid

           separatorAfterItem = this.opt(separator);
           //me.opt('NEWLINE')
           this.opt('NEWLINE');
       
       };//end loop
       ;

       //debug "END freeFormMode [#{me.constructor.name}] blockIndent:#{blockIndent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no closer-'
       debug("END freeFormMode [" + (this.constructor.name) + "] blockIndent:" + (blockIndent) + ", get SeparatedList of [" + (astClass.name) + "] by '" + (separator) + "' closer:", closer || '-no closer-');

        //if closer then me.opt('NEWLINE') # consume optional newline after closer in free-form mode

       //return result
       return result;
    };


    //     method reqSeparatedList(astClass:ASTBase, separator, closer)
    ASTBase.prototype.reqSeparatedList = function(astClass, separator, closer){
//**reqSeparatedList** is the same as `optSeparatedList` except that it throws an error
//if the list is empty

//First, call optSeparatedList

       var result = this.optSeparatedList(astClass, separator, closer);
       //if result.length is 0, me.throwParseFailed "#{me.constructor.name}: Get list: At least one [#{astClass.name}] was expected"
       if (result.length === 0) {
           this.throwParseFailed("" + (this.constructor.name) + ": Get list: At least one [" + (astClass.name) + "] was expected")};

       //return result
       return result;
    };


    //     helper method listArgs(args:array)
    ASTBase.prototype.listArgs = function(args){
//listArgs list arguments (from opt or req). used for debugging
//and syntax error reporting

       var msg = [];
       //for i in args
       for ( var i__inx=0; i__inx<args.length; i__inx++) {
           var i=args[i__inx];

            //declare valid i.name

            //if typeof i is 'string'
           //if typeof i is 'string'
           if (typeof i === 'string') {
               //msg.push("'#{i}'")
               msg.push("'" + (i) + "'");
           }
           else if (i) {
               //if typeof i is 'function'
               if (typeof i === 'function') {
                 //msg.push("[#{i.name}]")
                 msg.push("[" + (i.name) + "]");
               }
               else {
                 //msg.push("<#{i.name}>")
                 msg.push("<" + (i.name) + ">");
               
               };
           }
           else {
               //msg.push("[null]")
               msg.push("[null]");
           
           };
       }; // end for each in args

       //return msg.join('|')
       return msg.join('|');
    };



//Helper functions for code generation
//=====================================

    //     helper method out()
    ASTBase.prototype.out = function(){

//*out* is a helper function for code generation
//It evaluates and output its arguments. uses ASTBase.prototype.outCode

       //for each item in arguments
       for ( var item__inx=0; item__inx<arguments.length; item__inx++) {
         var item=arguments[item__inx];

          //declare on item
            //COMMENT:string, NLI, CSL:array, freeForm
            //name, lexer, produce, out

//skip empty items

         //if no item, continue
         if (!item) {
             continue};

//if it is the first thing in the line, out indentation

         //if not me.outCode.currLine, me.outCode.out String.spaces(me.indent-1)
         if (!(this.outCode.currLine)) {
             this.outCode.out(String.spaces(this.indent - 1))};

//if it is an AST node, call .produce()

         //if item instance of ASTBase
         if (item instanceof ASTBase) {
           //item.produce()
           item.produce();
         }
         else if (item === '\n') {
           //me.outCode.startNewLine()
           this.outCode.startNewLine();
         }
         else if (typeof item === 'string') {
           //me.outCode.out item
           this.outCode.out(item);
         }
         else if (typeof item === 'object') {

//if the object is an array, resolve with a recursive call

           //if item instance of Array
           if (item instanceof Array) {
             //me.out.apply me,item #recursive
             this.out.apply(this, item);//#recursive
           }
           else if (item.hasOwnProperty('CSL')) {

             //if no item.CSL, continue #empty list
             if (!item.CSL) {
                 continue};

              //declare valid item.separator

              //for each inx,listItem in item.CSL
             //for each inx,listItem in item.CSL
             for ( var inx=0; inx<item.CSL.length; inx++) {
               var listItem=item.CSL[inx];

                //declare valid listItem.out

                //if inx>0
               //if inx>0
               if (inx > 0) {
                 //me.outCode.out item.separator or ', '
                 this.outCode.out(item.separator || ', ');
               };

               //if item.freeForm
               if (item.freeForm) {
                 //if listItem instanceof ASTBase
                 if (listItem instanceof ASTBase) {
                   //listItem.out '\n' #(prettier generated code) use "listItem" indent
                   listItem.out('\n');//#(prettier generated code) use "listItem" indent
                 }
                 else {
                   //item.out '\n'
                   item.out('\n');
                 
                 };
               };

               //me.out listItem
               this.out(listItem);
             }; // end for each in item.CSL

             //end for

             //if item.freeForm, me.out '\n' # (prettier generated code)
             if (item.freeForm) {
                 this.out('\n')};
           }
           else if (item.COMMENT !== undefined) {

              //# prepend // if necessary
             //if not item.COMMENT.startsWith("//"), me.outCode.out "//"
             if (!(item.COMMENT.startsWith("//"))) {
                 this.outCode.out("//")};

             //me.out item.COMMENT
             this.out(item.COMMENT);
           }
           else {
             var msg = "method:ASTBase.out() Caller:" + (this.constructor.name) + ": object not recognized. type: " + typeof item;
             //debug msg
             debug(msg);
             //debug item
             debug(item);
             //me.throwError msg
             this.throwError(msg);
           
           };
         }
         else {
           //me.outCode.out item.toString() # try item.toString()
           this.outCode.out(item.toString());//# try item.toString()
         
         };

         //end if
         }; // end for each in arguments
    };


        //#loop, next item


    //     helper method outLineAsComment(preComment,lineInx)
    ASTBase.prototype.outLineAsComment = function(preComment, lineInx){
//out a full source line as comment into produced code

//manage optional parameters

       //if no lineInx
       if (!lineInx) {
         lineInx = preComment;
         preComment = "";
       }
       else {
         preComment += ": ";
       
       };

//validate index

       //if no me.lexer, return log.error("ASTBase.outLineAsComment #{lineInx}: NO LEXER")
       if (!this.lexer) {
           return log.error("ASTBase.outLineAsComment " + (lineInx) + ": NO LEXER")};

       var line = this.lexer.infoLines[lineInx];
       //if no line, return log.error("ASTBase.outLineAsComment #{lineInx}: NO LINE")
       if (!line) {
           return log.error("ASTBase.outLineAsComment " + (lineInx) + ": NO LINE")};

//out as comment

       var prepend = "";
       //if preComment or not line.text.startsWith("//"), prepend="//"
       if (preComment || !(line.text.startsWith("//"))) {
           prepend = "//"};
       //if preComment or line.text, me.outCode.out prepend+String.spaces(line.indent)+preComment+line.text
       if (preComment || line.text) {
           this.outCode.out(prepend + String.spaces(line.indent) + preComment + line.text)};
       //me.outCode.startNewLine()
       this.outCode.startNewLine();

        //declare valid me.lexer.lastOutCommentLine
        //me.lexer.lastOutCommentLine = lineInx
       this.lexer.lastOutCommentLine = lineInx;
    };


    //     helper method outLinesAsComment(fromLine,toLine)
    ASTBase.prototype.outLinesAsComment = function(fromLine, toLine){

       //if me.outCode.currLine and me.outCode.currLine.trim()
       if (this.outCode.currLine && this.outCode.currLine.trim()) {
         //me.outCode.startNewLine()
         this.outCode.startNewLine();
       };

       this.outCode.currLine = "";//#clear indents

       //for i=fromLine to toLine
       for( var i=fromLine; i<=toLine; i++){
         //me.outLineAsComment i
         this.outLineAsComment(i);
       }; // end for i
    };


    //     helper method addSourceMap()
    ASTBase.prototype.addSourceMap = function(){
//Here we use mozilla/source-map to generate source map items
//https://github.com/mozilla/source-map#with-sourcemapgenerator-low-level-api

        //declare global window

       //if typeof window is 'undefined' # in Node
       if (typeof window === 'undefined') {//# in Node
           var sourceMapItem = {generated: {line: this.outCode.lineNum, column: this.outCode.column}, original: {line: this.sourceLineNum || 1, column: this.column}, name: "a"};
       };
    };
            //#me.outCode.sourceMap.addMapping sourceMapItem


    //     helper method levelIndent()
    ASTBase.prototype.levelIndent = function(){
//show indented messaged for debugging

       var indent = ' ';
       var node = this.parent;
       //while node
       while(node){
       
         node = node.parent;
         indent += '  ';
       
       };//end loop
       ;
       //return indent
       return indent;
    };
   
   //end class ASTBase


//------------------------------------------------------------------------
//##Export

   module.exports = ASTBase;