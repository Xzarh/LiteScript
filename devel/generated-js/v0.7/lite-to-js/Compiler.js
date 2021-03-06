//Compiled by LiteScript compiler v0.6.7, source: /home/ltato/LiteScript/devel/source/v0.7/Compiler.lite.md
// The LiteScript Compiler Module
// ==============================
// LiteScript is a highly readable language that compiles to JavaScript.

   var version = '0.7.9';
   // export
   module.exports.version = version;

    //compiler generate(lines:string array)
    //    lines.push "export var buildDate = '#{new Date.toISOString()}'"
   var buildDate = '20140722';
   // export
   module.exports.buildDate = buildDate;

// This v0.6 compiler is written in v0.5 syntax.
// That is, you use the v0.5 compiler to compile this code
// and you get a v0.6 compiler, suporting v0.6 syntax.

// ###Module Dependencies

// The Compiler module is the main interface to LiteScript Project module.

   // import
   var Project = require('./Project');
   var Validate = require('./Validate');
   var Grammar = require('./Grammar');
   var log = require('./log');

   Project.version = version;

   var debug = log.debug;

// Get the 'Environment' object for the compiler to use.
// The 'Environment' object, must provide functions to load files, search modules,
// and a optional external cache (disk).
// The `Environment` abstraction allows us to support compile on server(node) or the browser.

   // import Environment
   var Environment = require('./Environment');


// ## Main API functions: LiteScript.compile & LiteScript.compileProject

   // export function compile (filename:string, sourceLines, options:Object) returns string
   function compile(filename, sourceLines, options){

// Used to compile source code loaded in memory (instead of loading a file)
// input:
// * filename (for error reporting),
// * sourceLines: LiteScript code: string array | large string | Buffer

// output:
// * string, compiled code

        // declare valid options.storeMessages
       // if options.storeMessages
       if (options.storeMessages) {
           log.options.storeMessages = true;
           log.getMessages(); //clear
       };

       var moduleNode = compileModule(filename, sourceLines, options);

       return moduleNode.getCompiledText();
   };
   // export
   module.exports.compile=compile;


   // export function compileProject (mainModule, options) returns Project
   function compileProject(mainModule, options){

// The 'compileProject' function will load and compile the main Module of a project.
// The compilation of the main module will trigger import and compilation of all its "child" modules
// (dependency tree is constructed by `import`/`require` between modules)

// The main module is the root of the module dependency tree, and can reference
// another modules via import|require.

       // default options =
       if(!options) options={};
       if(options.outDir===undefined) options.outDir='./out';
       if(options.target===undefined) options.target='js';
        // #endif

       log.message("Out Dir: " + options.outDir);

// Create a 'Project' to hold the main module and dependant modules

       var project = new Project(mainModule, options);

       project.compile();

       return project;
   };
   // export
   module.exports.compileProject=compileProject;

// After generating all modules, if no errors occurred,
// mainModuleName and all its dependencies will be compiled in the output dir

// ## Secondary Function: compileModule, returns Grammar.Module

   // export function compileModule (filename, sourceLines, options) returns Grammar.Module
   function compileModule(filename, sourceLines, options){
// Compile a module from source in memory
// input:
// * filename (for error reporting),
// * sourceLines: LiteScript code: string array | large string | Buffer

// output:
// * moduleNode: Grammar.Module: module's code AST root node

       // default filename = 'unnamed'
       if(filename===undefined) filename='unnamed';

        // declare on options version,debugEnabled
       options.version = version;// #add version to options

       // if options.debugEnabled, log.options.debug.enabled = true
       if (options.debugEnabled) {log.options.debug.enabled = true};

       var project = new Project(filename, options);

       var fileInfo = new Environment.FileInfo({name: filename});

       var moduleNode = project.createNewModule(fileInfo);

// parse source lines & store in moduleCache for validation

       project.parseOnModule(moduleNode, filename, sourceLines);
       project.moduleCache[filename] = moduleNode;

// import dependencies

       // if no project.options.single
       if (!project.options.single) {
           project.importDependencies(moduleNode);
       };

// validate var & property names

       // if no project.options.skip
       if (!project.options.skip) {

           Validate.launch(project);
           // if log.error.count is 0, log.info "Validation OK"
           if (log.error.count === 0) {log.info("Validation OK")};
       };

// initialize out buffer & produce target code

       log.info("Generating " + project.options.target);

       project.produceModule(moduleNode);
        // # the produced code will be at: moduleNode.lexer.out.getResult() :string array

       // if log.error.count isnt 0, log.throwControled "#log.error.count errors during compilation"
       if (log.error.count !== 0) {log.throwControled("#log.error.count errors during compilation")};

// text compiled result can be obtained with: moduleNode.lexer.out.getResult() :string array

       return moduleNode;
   };
   // export
   module.exports.compileModule=compileModule;


// Require Extensions
// ------------------

// This segment adds extensions to node's `require` function
// for LiteScript files so that you can just `require` a .lite.md file
// without having to compile it ahead of time

   // helper function extension_LoadLS(requiringModule, filename)
   function extension_LoadLS(requiringModule, filename){

// Read the file, then compile using the `compile` function above.
// Then use node's built-in compile function to compile the generated JavaScript.

       var content = compile(filename, Environment.loadFile(filename), {verbose: 0, warnings: 0});
        // declare valid requiringModule._compile
       requiringModule._compile(content, filename);
   };


   // export helper function registerRequireExtensions
   function registerRequireExtensions(){

// Add the extension for all appropriate file types. Don't overwrite `.md` in case CoffeeScript or something else is already using it.

        // declare on require
            // extensions

       // if require.extensions
       if (require.extensions) {

         require.extensions['.lite.md'] = extension_LoadLS;
         require.extensions['.lite'] = extension_LoadLS;
         require.extensions['.md'] = extension_LoadLS;
       };
   };
   // export
   module.exports.registerRequireExtensions=registerRequireExtensions;


// ##Helper module functions

   // public function getMessages() returns string array
   function getMessages(){
// if compile() throws, call getMessages() to retrieve compiler messages

       return log.getMessages();
   };
   // export
   module.exports.getMessages=getMessages;


//# sourceMappingURL=Compiler.js.map