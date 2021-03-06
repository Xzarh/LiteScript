The Abstract Syntax Tree (AST) Base class
-----------------------------------------

This module defines the base abstract syntax tree class used by the grammar. 
It's main purpose is to provide utility methods used in the grammar 
for **req**uired tokens, **opt**ional tokens 
and comma or semicolon **Separated Lists** of symbols.

Dependencies

    var Lexer = require('./Lexer')

----------------------------------------------------------------------------------------------
### Helper Class OutCode
This class contains helper methods for AST nodes's `produce()` methods
It also handles SourceMap generation for Chrome Developer Tools debugger and Firefox Firebug

Source Map 
globalMap for sourceMapping
https://github.com/mozilla/source-map#with-sourcemapgenerator-low-level-api


#### Properties

      lineNum, column
      currLine:string
      lines:string array
      uniqueIds={}
      sourceMap

#### Method start()
Initialize output array

        me.lineNum=1
        me.column=1
        me.lines=[]
        me.uniqueIds={}
        
        #me.sourceMap #= require('../sourceMap.js')

#### Method getUniqueVarName(prefix)
Generate unique variable names

        var id = me.uniqueIds[prefix] or 0

        id += 1

        me.uniqueIds[prefix] = id

        return prefix + '__' + id


#### Method out(text:string)
out a string into produced code

if no current line
create a empty one

        if me.currLine is undefined
            me.currLine=""
            me.column=1

append text to line 

        if text
            me.currLine += text
            me.column += text.length


#### Method startNewLine()
Start New Line into produced code

send the current line

          me.lines.push(me.currLine or "")
          debug( me.lineNum+ ' '+ me.currLine)

clear current line

          me.lineNum += 1
          me.currLine = undefined


#### method getResult()
get result and clear memory      

        me.startNewLine() #close last line
        var result = me.lines
        me.lines = []
        return result


### Class ASTBase 

This class serves as a base class on top of which Grammar classes are defined.
It contains basic functions to parse a token stream.

#### properties
        parent, 

        name, keyword, type 

        lexer:Lexer, lineInx
        sourceLineNum, column
        indent, locked
        index
        outCode = new OutCode()


#### Constructor (parent:ASTBase, name)

        me.parent = parent
        me.name = name

Get lexer from parent

        me.lexer = parent.lexer

Remember this node source position.
Also remember line index in tokenized lines, and indent

        if me.lexer 
          me.sourceLineNum = me.lexer.sourceLineNum
          me.column = me.lexer.token.column
          me.indent = me.lexer.indent
          me.lineInx = me.lexer.lineInx

        #debug "created",me.constructor.name,"indent",me.indent

------------------------------------------------------------------------
#### method lock()
**lock** marks this node as "locked", meaning we are certain this is the right class
for the given syntax. For example, if the `FunctionDeclaration` class see the token `function`,
we are certain this is the right class to use, so we 'lock()'. 
Once locked, any **req**uired token not present causes compilation to fail.

        me.locked = on

#### helper method getParent(searchedClass)
**getParent** method searchs up the AST tree until a specfied node class is found

        var node = me
        while node and not(node instanceof searchedClass)
            node = node.parent # move to parent
        return node


#### helper method positionText() 

        if not me.lexer, return "(built-in)"    
        return "#{me.lexer.filename}:#{me.sourceLineNum}:#{me.column or 0}"
  
#### helper method toString()

        return "[#{me.constructor.name}]"


#### method throwError(msg)
**throwError** add node position info and throws a 'controled' error.

A 'controled' error, shows only err.message

A 'un-controled' error is an unhandled exception in the compiler code itself, 
and it shows error message *and stack trace*.

        var err = new Error("#{me.positionText()}. #msg")
        err.controled = true
        throw err

#### helper method sayErr(msg)

        log.error me.positionText(), msg
          

#### method throwParseFailed(msg)
throws a parseFailed-error

During a node.parse(), if there is a token mismatch, a "parse failed" is raised.
"parse failed" signals a failure to parse the tokens from the stream, 
however the syntax might still be valid for another AST node. 
If the AST node was locked-on-target, it is a hard-error.
If the AST node was NOT locked, it's a soft-error, and will not abort compilation 
as the parent node will try other AST classes against the token stream before failing.

        var err = new Error(msg)
        err.soft = not me.locked  #if not locked, is a soft-error, another Grammar class migth parse.
        err.controled = true
        throw err

#### method parse()
abstract method representing the TRY-Parse of the node.
Child classes _must_ override this method
      
        me.throwError 'Parser Not Implemented: ' + me.constructor.name

#### method produce()
**produce()** is the method to produce target code
Target code produces should override this, if the default production isnt: `me.out me.name`

        me.out me.name

#### method parseDirect(key,directObj)

We use a DIRECT associative array to pick the exact AST node to parse 
based on the actual token value or type.
This speeds up parsing, avoiding parsing by trial & error

Check keyword

        if directObj.hasOwnProperty(key)

get class

            var directASTNode = directObj[key]

try parse

            var statement = me.opt(directASTNode)

if parsed ok, assign keyword for reference

            declare valid statement.keyword
            if statement
                statement.keyword = key
          
return parsed statement or nothing

            return statement



#### Method opt()
**opt** (optional) is for optional parts of a grammar. It attempts to parse 
the token stream using one of the classes or token types specified.
This method takes a variable number of arguments.
For example:
  calling `me.opt IfStatement, Expression, 'IDENTIFIER'`
  would attempt to parse the token stream first as an `IfStatement`. If that fails, it would attempt
  to use the `Expression` class. If that fails, it will accept a token of type `IDENTIFIER`.
  If all of those fail, it will return `undefined`.

Method start:
Remember the actual position, to rewind if all the arguments to `opt` fail

        var startPos = me.lexer.getPos()

        declare on startPos
          index,sourceLineNum,column,token
        declare valid startPos.token.column

        #debug
        var spaces = me.levelIndent()

For each argument, -a class or a string-, we will attempt to parse the token stream 
with the class, or match the token type to the string.

        for searched in arguments

          declare on searched
            toUpperCase #for strings
            name #for AST nodes

skip empty, null & undefined

          if no searched, continue

determine value or type
For strings we check the token **value** or **TYPE** (if searched is all-uppercase)

          if typeof searched is 'string'

            #debug spaces, me.constructor.name,'TRY',searched, 'on', me.lexer.token.toString()

            var isTYPE = /^[A-Z]+$/.test(searched)
            var found

            if isTYPE 
              found = me.lexer.token.type is searched
            else
              found = me.lexer.token.value is searched

            if found

Ok, type/value found! now we return: token.value
Note: we shouldnt return the 'token' object, because returning objects (here and in js) 
is a "pass by reference". You return a "pointer" to the object.
If we return the 'token' object, the calling function will recive a "pointer"
and it can inadvertedly alter the token object in the token stream. (it should not, leads to subtle bugs)

              debug spaces, me.constructor.name,'matched OK:',searched, me.lexer.token.value
              var result = me.lexer.token.value 

Advance a token, me.lexer.token always has next token

              me.lexer.nextToken()
              return result

          else

"searched" is a AST class

            debug spaces, me.constructor.name,'TRY',searched.name, 'on', me.lexer.token.toString()

if the argument is an AST node class, we instantiate the class and try the `parse()` method.
`parse()` can fail with `ParseFailed` if the syntax do not match

            try

                var astNode:ASTBase = new searched(me)
                astNode.parse() # if it can't parse, will raise an exception

                debug spaces, 'Parsed OK!->',searched.name

                return astNode # parsed ok!, return instance

            catch err

If parsing fail, but the AST node were not 'locked' on target, (a soft-error),
we will try other AST nodes.

              if err.soft
                  me.lexer.softError = err
                  debug spaces, searched.name,'parse failed.',err.message

rewind the token stream, to try other AST nodes

                  debug "<<REW to", "#{startPos.sourceLineNum}:#{startPos.token.column or 0} [#{startPos.index}]", startPos.token.toString()
                  me.lexer.setPos startPos

              else

else: it's a hard-error. The AST node were locked-on-target.
We abort parsing and throw.

                  # debug

                  # the first hard-error is the most informative, the others are cascading ones
                  if me.lexer.hardError is null 
                      me.lexer.hardError = err
                  #end if

raise up, abort parsing

                  raise err

              #end if - type of error

            #end catch
            
          #end if - string or class

        #loop - try the next argument

No more arguments.
`opt` returns `undefined` if none of the arguments could be use to parse the stream.

        return undefined

      #end method opt


#### method req()

**req** (required) if for required symbols of the grammar. It works the same way as `opt` 
except that it throws an error if none of the arguments can be used to parse the stream.

We first call `opt` to see what we get. If a value is returned, the function was successful,
so we just return the node that `opt` found.

else, If `opt` returned nothing, we give the user a useful error.

        var result = me.opt.apply(this,arguments)

        if no result 
          me.throwParseFailed "#{me.lexer.posToString()} #{me.constructor.name}: found #{me.lexer.token.toString()} but #{me.listArgs(arguments)} required"

        return result


#### method reqOneOf(arr)
(performance) call req only if next token in list
        
        if me.lexer.token.value in arr
            return me.req.apply(this,arr)
        else
            me.throwParseFailed "not in list"


#### method optList()
this generic method will look for zero or more of the requested classes,

        var item
        var list=[]
        
        do
          item = me.opt.apply(this,arguments)
          if no item then break
          list.push item
        loop

        return list.length? list : undefined


#### method optSeparatedList(astClass:ASTBase, separator, closer) #[Separated Lists]

Start optSeparatedList

        var result = []

If the list starts with a NEWLINE, 
process as free-form mode separated list, where NEWLINE is a valid separator.

        if me.lexer.token.type is 'NEWLINE'
          return me.optFreeFormList( astClass, separator, closer )

normal separated list, 
loop until closer found

        debug "optSeparatedList [#{me.constructor.name}] indent:#{me.indent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no closer char-'

        var startLine = me.lexer.sourceLineNum
        do until me.opt(closer)

get a item

            var item = me.req(astClass)
            me.lock()

add item to result

            result.push(item)

newline after item (before comma or closer) is optional

            if separator is ';' and me.lexer.token.type is 'NEWLINE'
                return result

            me.opt('NEWLINE')

if, after newline, we got the closer, then exit. 

            if me.opt(closer) then break #closer found

here, a 'separator' (comma/semicolon) means: 'there is another item'.
Any token other than 'separator' means 'end of list'

            if no me.opt(separator)
              # any token other than comma/semicolon means 'end of comma separated list'
              # but if a closer was required, then "other" token is an error
              if closer, me.throwError "Expected '#{closer}' to end list started at line #{startLine}"
              break # else ok, end of list
            end if

optional newline after comma 

            if separator is ';' and me.lexer.token.type is 'NEWLINE'
                return result

            me.opt('NEWLINE')

        loop #try get next item

        return result

#### Method optFreeFormList(astClass:ASTBase, separator, closer)

In "freeForm Mode", each item stands in its own line, and commas (separators) are optional.
The item list ends when a closer is found or when indentation changes

        var result = []
        var lastItemSourceLine = -1
        var separatorAfterItem
        var parentIndent = me.parent.indent

FreeFormList should start with NEWLINE
First line sets indent level

        me.req "NEWLINE"
        var startLine = me.lexer.sourceLineNum
        var blockIndent = me.lexer.indent

        debug "optFreeFormList [#{me.constructor.name}] parentname:#{me.parent.name} parentIndent:#{parentIndent}, blockIndent:#{blockIndent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no-'

        if blockIndent <= parentIndent #first line is same or less indented than parent - assume empty list
          me.lexer.sayErr "free-form SeparatedList: next line is same or less indented (#{blockIndent}) than parent indent (#{parentIndent}) - assume empty list"
          return result

now loop until closer or an indent change

        do until me.opt(closer) #if closer found (`]`, `)`, `}`), end of list

check for indent changes

            debug "freeForm Mode me.lexer.indent:#{me.lexer.indent} block indent:#{blockIndent} parentIndent:#{parentIndent}"
            if me.lexer.indent isnt blockIndent

indent changed:
if a closer was specified, indent change before the closer means error (line misaligned)

                  if closer 
                    me.lexer.throwErr "Misaligned indent: #{me.lexer.indent}. Expected #{blockIndent}, or '#{closer}' to end block started at line #{startLine}"

check for excesive indent

                  if me.lexer.indent > blockIndent
                    me.lexer.throwErr "Misaligned indent: #{me.lexer.indent}. Expected #{blockIndent} to continue block, or #{parentIndent} to close block started at line #{startLine}"

else, if no closer specified, and indent decreased => end of list

                  break #end of list

            end if

check for more than one statement on the same line, with no separator

            if not separatorAfterItem and me.lexer.sourceLineNum is lastItemSourceLine 
                me.lexer.sayErr "More than one [#{astClass.name}] on line #{lastItemSourceLine}. Missing ( ) on function call?"

            lastItemSourceLine = me.lexer.sourceLineNum

else, get a item

            var item = me.req(astClass)
            me.lock()

add item to result

            result.push(item)

newline after item (before comma or closer) is optional

            me.opt('NEWLINE')

separator (comma|semicolon) is optional, 
NEWLINE also is optional and valid 

            separatorAfterItem = me.opt(separator)
            me.opt('NEWLINE')

        loop #try get next item

        debug "END freeFormMode [#{me.constructor.name}] blockIndent:#{blockIndent}, get SeparatedList of [#{astClass.name}] by '#{separator}' closer:", closer or '-no closer-'

        //if closer then me.opt('NEWLINE') # consume optional newline after closer in free-form mode

        return result


#### method reqSeparatedList(astClass:ASTBase, separator, closer)
**reqSeparatedList** is the same as `optSeparatedList` except that it throws an error 
if the list is empty
        
First, call optSeparatedList

        var result:array = me.optSeparatedList(astClass, separator, closer)
        if result.length is 0, me.throwParseFailed "#{me.constructor.name}: Get list: At least one [#{astClass.name}] was expected"

        return result


#### helper method listArgs(args:array)
listArgs list arguments (from opt or req). used for debugging
and syntax error reporting

        var msg = []
        for i in args

            declare valid i.name

            if typeof i is 'string'
                msg.push("'#{i}'")
            else if i
                if typeof i is 'function'
                  msg.push("[#{i.name}]")
                else
                  msg.push("<#{i.name}>")
            else
                msg.push("[null]")

        return msg.join('|')



Helper functions for code generation
=====================================

#### helper method out()

*out* is a helper function for code generation
It evaluates and output its arguments. uses ASTBase.prototype.outCode

        for each item in arguments

          declare on item
            COMMENT:string, NLI, CSL:array, freeForm
            name, lexer, produce, out
          
skip empty items

          if no item, continue

if it is the first thing in the line, out indentation

          if not me.outCode.currLine, me.outCode.out String.spaces(me.indent-1)

if it is an AST node, call .produce()

          if item instance of ASTBase 
            item.produce()

New line char means "start new line"

          else if item is '\n' 
            me.outCode.startNewLine()

a simple string, out the string

          else if typeof item is 'string'
            me.outCode.out item

else, Object codes

          else if type of item is 'object'

if the object is an array, resolve with a recursive call

            if item instance of Array
              me.out.apply me,item #recursive

{CSL:arr} -> output the array as Comma Separated List
 
            else if item.hasOwnProperty('CSL')

              if no item.CSL, continue #empty list

              declare valid item.separator

              for each inx,listItem in item.CSL

                declare valid listItem.out

                if inx>0 
                  me.outCode.out item.separator or ', '

                if item.freeForm 
                  if listItem instanceof ASTBase
                    listItem.out '\n' #(prettier generated code) use "listItem" indent
                  else
                    item.out '\n'

                me.out listItem

              end for

              if item.freeForm, me.out '\n' # (prettier generated code)

{COMMENT:text} --> output text as a comment 
 
            else if item.COMMENT isnt undefined

              # prepend // if necessary
              if not item.COMMENT.startsWith("//"), me.outCode.out "//"

              me.out item.COMMENT

else, unrecognized object

            else
              var msg = "method:ASTBase.out() Caller:#{me.constructor.name}: object not recognized. type: "+ typeof item
              debug msg
              debug item
              me.throwError msg

Last option, out item.toString()

          else
            me.outCode.out item.toString() # try item.toString()

          end if


        #loop, next item


#### helper method outLineAsComment(preComment,lineInx)
out a full source line as comment into produced code

manage optional parameters

        if no lineInx
          lineInx = preComment
          preComment = ""
        else
          preComment+=": "

validate index

        if no me.lexer, return log.error("ASTBase.outLineAsComment #{lineInx}: NO LEXER")

        var line = me.lexer.infoLines[lineInx]
        if no line, return log.error("ASTBase.outLineAsComment #{lineInx}: NO LINE")

out as comment

        var prepend=""
        if preComment or not line.text.startsWith("//"), prepend="//"
        if preComment or line.text, me.outCode.out prepend+String.spaces(line.indent)+preComment+line.text
        me.outCode.startNewLine()

        declare valid me.lexer.lastOutCommentLine
        me.lexer.lastOutCommentLine = lineInx

      
#### helper method outLinesAsComment(fromLine,toLine)

        if me.outCode.currLine and me.outCode.currLine.trim()
          me.outCode.startNewLine()

        me.outCode.currLine="" #clear indents

        for i=fromLine to toLine
          me.outLineAsComment i


#### helper method addSourceMap()
Here we use mozilla/source-map to generate source map items
https://github.com/mozilla/source-map#with-sourcemapgenerator-low-level-api

        declare global window

        if typeof window is 'undefined' # in Node
            var sourceMapItem={ generated: {line: me.outCode.lineNum,column:me.outCode.column}, original: {line: me.sourceLineNum or 1,column: me.column},name:"a"}
            #me.outCode.sourceMap.addMapping sourceMapItem


#### helper method levelIndent()
show indented messaged for debugging

        var indent = ' '
        var node = me.parent
        while node
          node = node.parent
          indent += '  '
        return indent


------------------------------------------------------------------------
##Export

    module.exports = ASTBase

