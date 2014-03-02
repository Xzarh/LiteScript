(function () {
  var k$comprl = function (iterable,func) {var o = []; if (iterable instanceof Array || typeof iterable.length == "number") {for (var i=0;i<iterable.length;i++) {o.push(func(iterable[i]));}} else if (typeof iterable.next == "function") {var i; while ((i = iterable.next()) != null) {o.push(func(i));}} else {throw "Object is not iterable";}return o;};
  var k$indexof = [].indexOf || function (item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
  /* The Abstract Syntax Tree (AST)
     ------------------------------

     This module defines error classes and the base abstract syntax tree class used by the parser and grammar. It's main purpose is to provide utility methods to parse the token array into classes that inherit from `ASTBase`.

     Errors
     ======

     There are two types of errors that can be reported during parsing. `ParseFailed` is less serious indicating that the class failed to parse the upcoming tokens in the array, however the syntax might still be valid if parsed as another type of AST node. This generally will not abort compilation as the parent node will try other AST classes against the token stream before failing. `not_compiler_issue` indicates to the compiler that this is a problem with the input code, not a bug in the compiler itself. This error is used internally only.
      */
  function ParseFailed(message) {
    this.message = message;
    this.not_compiler_issue = true;
  }

  /*
     `SyntaxError` is more serious indicating that the parser is using the correct class to parse the stream, but the code has invalid syntax. For example, `if for x` would throw this error because the `IfStatement` class is sure that this is an `if` statement, but `if for` is definitely invalid. This always aborts compilation and gives the user an error. This error will get thrown to the top level module.
      */
  function SyntaxError(message) {
    this.message = message;
    this.locked = true;
    this.not_compiler_issue = true;
  }

  /*  */
  exports.SyntaxError = SyntaxError;

  /*
     ASTBase Class
     =============

     This class serves as a base class on top of which AST nodes are defined. It contains utility functions to parse the token stream.
      */
  function ASTBase(ts, parent) {
    /*
       The object is initially marked as "unlocked", indicating that we are not sure that this is the right node to parse this segment of the token stream. We can't declare syntax errors until we are sure this is the right class.
        */
    this.locked = false;
    /*
       Record the line and link to the token stream. Also note the parent object for code generation
        */
    this.ts = ts;
    this.line = ts.line;
    this.ast_parent = parent;
    /*
       The `parse` method, which is overriden by child classes, attempts to parse the current spot in the token stream. It will fail with a `ParseFailed` error or `SyntaxError` if parsing fails.
        */
    this.parse();
    /*
       Record the last line of the node. This is used to place comments correctly in the output Javascript.
        */
    this.endline = ts.line;
  }

  /*  */

  /*
     **opt** attempts to parse the token stream using one of the classes or token types specified. This method takes a variable number of arguments. For example, calling `me.opt IfStatement, Expression, 'IDENTIFIER'` would attempt to parse the token stream first as an `IfStatement`. If that fails, it would attempt to use the `Expression` class. If that fails, it will accept a token of type `IDENTIFIER`. If all of those fail, it will return `none`.

     Note that `SyntaxError`s will still be thrown, but not `ParseFailed` errors.
      */
  ASTBase.prototype.opt = function () {
    var start_index, cls, token, ki$1, kobj$1;
    /*
       If `opt` fails, it will reset the current index of the token stream.
        */
    start_index = this.ts.index;
    /*
       For each argument, which can be a class or a string, it will attempt to parse the token stream with that class or match the token type to the string.
        */
    kobj$1 = arguments;
    for (ki$1 = 0; ki$1 < kobj$1.length; ki$1++) {
      cls = kobj$1[ki$1];
      /*
         For strings it just checks the token type. And returns the token (incrementing the token stream index) if the type matches.
          */
      if (typeof (cls) === 'string') {
        if (this.ts.type === cls) {
          token = this.ts.current;
          this.ts.next();
          return token;
        }
      } else {
        /*
           For classes, it attempts to instantiate the class (which calls the class's `parse`). `new` will fail with either a `ParseFailed`, `SyntaxError`, or other exception (if the compiler has a bug) if parsing fails.


           If parsing does fail, we want to rewind the token stream. If the error has the `locked` flag or the error came from the compiler, we do want to abort and throw.
            */
        try {
          return new cls(this.ts, this);
        } catch (err) {
          this.ts.goto_token(start_index);
          if (err.locked || !(err.not_compiler_issue)) {
            //console.log(err, 'class: ', cls);
            throw err;
          }
        }
      }
    }
    /*
       `opt` returns `nothing` if none of the arguments could be use to parse the stream.
        */
    return null;
  }

  /*
     -----------------------------
     **req** works the same way as `opt` except that it throws an error if none of the arguments can be used to parse the stream.
      */
  ASTBase.prototype.req = function () {
    var rv, list, cls, message;
    /*
       We first call `opt` to see what we get. If a value is returned, the function was successful, so we just return the node that `opt` found.
        */
    rv = this.opt.apply(this, arguments);
    if ((rv != null)) {
      return rv;
    }
    /*
       If `opt` returned nothing, we want to give the user a useful error.
        */
    list = k$comprl(Array.prototype.slice.call(arguments),function (k$i) {cls = k$i; return cls.name || cls;});
    if (list.length === 1) {
      /* if me.locked
         print me */
      message = ("1.Expected " + (list[0]));
    } else {
      message = ("2.Expected one of " + (list.join(', ')));
    }
    this.error(("" + message));
  }

  /*
     **opt_val** checks if the next token has a semantic value that matches one of the arguments provided. If so it returns that token and advances the stream. Otherwise, it returns `nothing`.
      */
  ASTBase.prototype.opt_val = function () {
    var token;
    if ((k$indexof.call(arguments, this.ts.value) >= 0)) {
      token = this.ts.current;
      this.ts.next();
      return token;
    } else {
      return null;
    }
  }

  /*
     **req_val** is the same as `opt_val` except that it throws an error if the semantic value could not be matched.
      */
  ASTBase.prototype.req_val = function () {
    var rv, args, v;
    rv = this.opt_val.apply(this, arguments);
    if ((rv != null)) {
      return rv;
    }
    /*
       The JavaScript (node) `arguments` structure is a little weird in that it's not strictly an array. It's actually an object mapping with some extra properties. In order to produce a useful error message we make a copy of the values as an array.
        */
    args = k$comprl(Array.prototype.slice.call(arguments),function (k$i) {v = k$i; return v;});
    this.error(("0.Expected '" + (args.join('\' or \'')) + "'"));
  }

  /*
     **opt_multi** this method is like `opt` except that it will return zero or more of the requested class or token type. If it can't match any tokens it returns an empty array. It is "greedy" in that it will try to match as many occurances of a token or class as possible. `opt_multi` will only return objects/tokens from the first argument that matches the token stream. This method always returns an array.
      */
  ASTBase.prototype.opt_multi = function () {
    var cls, rv;
    cls = this.opt.apply(this, arguments);
    if (!((cls != null))) {
      return [];
    }
    rv = [cls];
    while ((cls != null)) {
      cls = this.opt.apply(this, arguments);
      ((cls != null)) ? rv.push(cls) : void 0;
    }
    return rv;
  }

  /*
     **req_multi** this method is like `req` except that it will return one or more of the requested class or token type. If it can't match any tokens it does throw an error. It is "greedy" in that it will try to match as many occurances as possible. `req_multi` will only return objects/tokens from the first argument that matches the token stream. This method always returns an array.
      */
  ASTBase.prototype.req_multi = function () {
    var rv, list, cls;
    rv = this.opt_multi.apply(this, arguments);
    if (rv.length > 0) {
      return rv;
    }
    /*
       Create a useful error message for the user.
        */
    list = k$comprl(Array.prototype.slice.call(arguments),function (k$i) {cls = k$i; return cls.name || cls;});
    this.error(("Expected one of " + (list.join(', '))));
  }

  /*
     **parse** and **js** are abstract methods defined here to catch missing implementations. Child classes _must_ override these methods, otherwise compilation will fail.
      */
  ASTBase.prototype.parse = function () {
    this.lock();
    this.error('Parser Not Implemented: ' + this.constructor.name);
  }

  /*  */
  ASTBase.prototype.js = function () {
    this.error('Javascript Generator Not Implemented: ' + this.constructor.name);
  }

  /*
     **error** throws a `ParseFailed` error if the object is unlocked (syntax does not match this class, but may still be valid for another node) or a `SyntaxError` if the object is locked (syntax matches this node but is invalid).
      */
  ASTBase.prototype.error = function (msg) {
    var full_msg, up, filename;
    if (this.locked) {

      up = this;
      while (up) {
        if ((up.ts.options != null && up.ts.options['filename'] != null)) {
          filename = up.ts.options['filename'];
          break;
        } else {
          up = up.ast_parent;
        }
      }

      /* console.trace 'here' */
      full_msg = msg + " at (" + filename + ":" + this.line + ":1)";
      /*
         We try to report the filename if possible.
          */
      /*  */
      throw new SyntaxError(full_msg);
    } else {
      /*  */
      throw new ParseFailed(msg);
    }
  }

  /*
     **lock** marks this class as locked, meaning we are certain this is the correct class for the given syntax. For example, if the `FunctionExpression` class sees the IDENTIFIER `function`, we are certain this is the correct class to use. Once locked, any invalid syntax causes compilation to fail.

     `lock` can be called multiple times to update the line number. If a node spans multiple lines, this is useful because the line number is reported in the error message.
      */
  ASTBase.prototype.lock = function () {
    this.locked = true;
    this.line = this.ts.line;
  }

  /*
     ASTBase is the base class for all AST nodes.
      */
  exports.ASTBase = ASTBase;
})()