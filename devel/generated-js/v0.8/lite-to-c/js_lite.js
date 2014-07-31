//##Lite-js
//This is the command line interface to LiteScript-to-js Compiler
//when the LiteScript compiler is generated as js-code 
//to run on node.js or the browser
    //global import path,fs
    var path = require('path');
    var fs = require('fs');
    
    //import GeneralOptions, OptionsParser, ControlledError, color
    var GeneralOptions = require('./lib/GeneralOptions.js');
    var OptionsParser = require('./lib/OptionsParser.js');
    var ControlledError = require('./lib/ControlledError.js');
    var color = require('./lib/color.js');
    //import Compiler
    var Compiler = require('./Compiler.js');
//## usage, module vars
    //var usage = """
    var usage = "\n    LiteScript-to-js v" + Compiler.version + "\n\n    Usage:\n            lite mainModule.lite.md [options]\n            lite -run mainModule.lite.md [options]\n\n    This command will launch the LiteScript Compiler on mainModule.lite.md\n\n    options are:\n    -r, -run         compile & run .lite.md file\n    -o dir           output dir. Default is './generated/js/'\n    -b, -browser     compile for a browser environment (window instead of global, no process, etc)\n    -v, -verbose     verbose level, default is 0 (0-3)\n    -w, -warning     warning level, default is 1 (0-1)\n    -comments        comment level on generated files, default is 1 (0-2)\n    -version         print LiteScript version & exit\n\n    Advanced options:\n    -s,  -single     compile single file. do not follow \"import\" statements\n    -ifn, -ifnew     compile only if source is newer\n    -wa, -watch      watch current dir for source changes and compile\n    -es6, --harmony  used with -run, uses node --harmony\n    -nm, -nomap      do not generate sourcemap\n    -noval           skip property name validation\n    -D NAME -D NAME  preprocessor defines (#define)\n    -d, -debug       enable full compiler debug logger file at 'out/debug.logger'\n    -run -debug      when -run used with -debug, launch compiled file with: node --debug-brk\n";
    
    //LiteScript-to-js v#{Compiler.version}
    
    //Usage: 
            //lite mainModule.lite.md [options]
            //lite -run mainModule.lite.md [options]
    //This command will launch the LiteScript Compiler on mainModule.lite.md
    
    //options are:
    //-r, -run         compile & run .lite.md file
    //-o dir           output dir. Default is './generated/js/'
    //-b, -browser     compile for a browser environment (window instead of global, no process, etc)
    //-v, -verbose     verbose level, default is 0 (0-3)
    //-w, -warning     warning level, default is 1 (0-1)
    //-comments        comment level on generated files, default is 1 (0-2)
    //-version         print LiteScript version & exit
    //Advanced options:
    //-s,  -single     compile single file. do not follow "import" statements
    //-ifn, -ifnew     compile only if source is newer
    //-wa, -watch      watch current dir for source changes and compile
    //-es6, --harmony  used with -run, uses node --harmony
    //-nm, -nomap      do not generate sourcemap
    //-noval           skip property name validation
    //-D NAME -D NAME  preprocessor defines (#define)
    //-d, -debug       enable full compiler debug logger file at 'out/debug.logger'
    //-run -debug      when -run used with -debug, launch compiled file with: node --debug-brk 
    
    //"""
//### public function main
    function main(){ try{
//Get & process command line arguments
        //var args = new OptionsParser(process.argv)
        var args = new OptionsParser(process.argv);
        //var 
            //mainModuleName
            //compileAndRunOption:boolean
            //compileAndRunParams:array
        var 
        mainModuleName = undefined, 
        compileAndRunOption = undefined, 
        compileAndRunParams = undefined
;
//Check for -help
        //if args.option('h','help') 
        if (args.option('h', 'help')) {
            //print usage
            console.log(usage);
            //process.exit 0
            process.exit(0);
        };
//Check for -version
        //if args.option('vers','version') 
        if (args.option('vers', 'version')) {
            //print Compiler.version
            console.log(Compiler.version);
            //process.exit 0
            process.exit(0);
        };
//Check for -run
        //if args.valueFor('r','run') into mainModuleName
        if ((mainModuleName=args.valueFor('r', 'run'))) {
            //compileAndRunOption = true
            compileAndRunOption = true;
            //compileAndRunParams = args.items.splice(args.lastIndex) #remove params after --run
            compileAndRunParams = args.items.splice(args.lastIndex);// #remove params after --run
        };
//get compiler version to --use
        //var use = args.valueFor('u','use')
        var use = args.valueFor('u', 'use');
//Check for other options
        //var options = new GeneralOptions
        var options = new GeneralOptions();
        //with options
        var _with1=options;
            //.outDir  = path.resolve(args.valueFor('o') or './generated/js') //output dir
            _with1.outDir = path.resolve(args.valueFor('o') || './generated/js'); //output dir
            //.verboseLevel = Number(args.valueFor('v',"verbose") or 0) 
            _with1.verboseLevel = Number(args.valueFor('v', "verbose") || 0);
            //.warningLevel = Number(args.valueFor('w',"warning") or 1)
            _with1.warningLevel = Number(args.valueFor('w', "warning") || 1);
            //.comments= Number(args.valueFor('comment',"comments") or 1) 
            _with1.comments = Number(args.valueFor('comment', "comments") || 1);
            //.debugEnabled   = args.option('d',"debug") 
            _with1.debugEnabled = args.option('d', "debug");
            //.skip    = args.option('noval',"novalidation") // skip name validation
            _with1.skip = args.option('noval', "novalidation"); // skip name validation
            //.generateSourceMap = args.option('nm',"nomap")? false:true // do not generate sourcemap
            _with1.generateSourceMap = args.option('nm', "nomap") ? false : true; // do not generate sourcemap
            //.single  = args.option('s',"single") // single file- do not follow require() calls
            _with1.single = args.option('s', "single"); // single file- do not follow require() calls
            //.compileIfNewer= args.option('ifn',"ifnew") // single file, compile if source is newer
            _with1.compileIfNewer = args.option('ifn', "ifnew"); // single file, compile if source is newer
            //.browser = args.option('b',"browser") 
            _with1.browser = args.option('b', "browser");
            //.es6     = args.option('es6',"harmony") 
            _with1.es6 = args.option('es6', "harmony");
            //.defines = []
            _with1.defines = [];
        ;
        //while args.valueFor('D') into var newDef
        var newDef=undefined;
        while((newDef=args.valueFor('D'))){
            //options.defines.push newDef
            options.defines.push(newDef);
        };// end loop
        //if options.verboseLevel
        if (options.verboseLevel) {
            //print 'LiteScript compiler version #{Compiler.version}  #{Compiler.buildDate}'
            console.log('LiteScript compiler version ' + Compiler.version + '  ' + Compiler.buildDate);
        };
//Check for -watch dir
        //if args.option('wa','watch')
        if (args.option('wa', 'watch')) {
            //watchDir Compiler,options
            watchDir(Compiler, options);
            //return //EXIT
            return; //EXIT
        };
//get mainModuleName
        ////only mainModuleName should be left
        //case args.items.length 
        
            //when 0:
        if (
        (args.items.length==0)
){
                //console.error "Missing MainModule or -run filename.\nlite -h for help"
                console.error("Missing MainModule or -run filename.\nlite -h for help");
                //process.exit 2
                process.exit(2);
        
        }
            //when 1:
        else if (
        (args.items.length==1)
){
                //mainModuleName = args.items[0]
                mainModuleName = args.items[0];
        
        }
        else {
            //else
                //print "Invalid (#{args.items.length}) arguments:", args.items.join(' ')
                console.log("Invalid (" + args.items.length + ") arguments:", args.items.join(' '));
                //print "lite -h for help"
                console.log("lite -h for help");
                //process.exit 2
                process.exit(2);
        };
//show args
        ////console.log(process.cwd());
        //if options.verboseLevel>1
        if (options.verboseLevel > 1) {
            //print 'compiler options: #{JSON.stringify(options)}'
            console.log('compiler options: ' + (JSON.stringify(options)));
            //print 'cwd: #{process.cwd()}'
            console.log('cwd: ' + (process.cwd()));
            //print 'compile#{compileAndRunOption?" and run":""}: #{mainModuleName}'
            console.log('compile' + (compileAndRunOption ? " and run" : "") + ': ' + mainModuleName);
            //if options.debugEnabled, print color.yellow,"GENERATING COMPILER DEBUG AT out/debug.logger",color.normal
            if (options.debugEnabled) {console.log(color.yellow, "GENERATING COMPILER DEBUG AT out/debug.logger", color.normal)};
        };
//launch project compilation
//if "compile and run", load & compile single file and run it
        //if compileAndRunOption
        if (compileAndRunOption) {
            //compileAndRun compileAndRunParams, mainModuleName, options
            compileAndRun(compileAndRunParams, mainModuleName, options);
        }
        else {
//else, launch compile Project
        //else
            //Compiler.compileProject mainModuleName, options
            Compiler.compileProject(mainModuleName, options);
        };
//Exception handler
        //Exception err
        
        }catch(err){
            //if err instance of ControlledError 
            if (err instanceof ControlledError) {
                //console.error color.red, err.message, color.normal
                console.error(color.red, err.message, color.normal);
                //process.exit 1
                process.exit(1);
            }
            else if (err.code === 'EISDIR') {
            
            //else if err.code is 'EISDIR'
                //console.error color.red, err.message, color.normal
                console.error(color.red, err.message, color.normal);
                //console.error 'Please specify a *file* as the main module to compile'
                console.error('Please specify a *file* as the main module to compile');
                //process.exit 2
                process.exit(2);
            }
            else {
            
            //else 
                //console.log 'UNCONTROLLED #{err.constructor.name}',err
                console.log('UNCONTROLLED ' + err.constructor.name, err);
                //throw err
                throw err;
            };
        };
    }
    // export
    module.exports.main = main;
        
    //end main function
//### function launchCompilation(mainModuleName, options:GeneralOptions)
    function launchCompilation(mainModuleName, options){
        //Compiler.compileProject(mainModuleName, options);
        Compiler.compileProject(mainModuleName, options);
    };
//### function compileAndRun(compileAndRunParams:array,mainModuleName,options:GeneralOptions)
    function compileAndRun(compileAndRunParams, mainModuleName, options){
        //var nodeArgs = options.es6?" --harmony":"" &
        var nodeArgs = options.es6 ? " --harmony" : "" + options.debugEnabled ? " --debug-brk" : "";
                       //options.debugEnabled?" --debug-brk":""
        //var filename = mainModuleName
        var filename = mainModuleName;
        //if not fs.existsSync(filename), filename=mainModuleName+'.md'
        if (!(fs.existsSync(filename))) {filename = mainModuleName + '.md'};
        //if not fs.existsSync(filename), filename=mainModuleName+'.lite.md'
        if (!(fs.existsSync(filename))) {filename = mainModuleName + '.lite.md'};
        //if not fs.existsSync(filename), fail with 'Compile and Run,  File not found: "#{mainModuleName}"'
        if (!(fs.existsSync(filename))) {throw new Error('Compile and Run,  File not found: "' + mainModuleName + '"')};
        //var sourceLines = fs.readFileSync(filename)
        var sourceLines = fs.readFileSync(filename);
        //var compiledCode = Compiler.compile(filename,sourceLines,options);
        var compiledCode = Compiler.compile(filename, sourceLines, options);
        //// if options.debug, save compiled file, run node --debug.brk
        //if options.debugEnabled or options.es6
        if (options.debugEnabled || options.es6) {
            //var outFile = path.join(options.outDir,mainModuleName+'.js')
            var outFile = path.join(options.outDir, mainModuleName + '.js');
            //fs.writeFileSync outFile,compiledCode
            fs.writeFileSync(outFile, compiledCode);
            //var exec = require('child_process').exec;
            var exec = require('child_process').exec;
            //if options.debugEnabled, print "***LAUNCHING NODE in DEBUG MODE***"
            if (options.debugEnabled) {console.log("***LAUNCHING NODE in DEBUG MODE***")};
            //var cmd = 'node #{nodeArgs} #{outFile} #{compileAndRunParams.join(" ")}'
            var cmd = 'node ' + nodeArgs + ' ' + outFile + ' ' + (compileAndRunParams.join(" "));
            //print cmd
            console.log(cmd);
            //exec cmd, function(error:Error, stdout, stderr) 
                        //print stdout
                        //print stderr
                        //if no options.debugEnabled
                            //try # to delete generated temp file
                                //fs.unlink outFile
                            //catch err 
                                //print err.message," at rm",outFile
                        //end if
                        //if error 
                            //declare valid error.errno
                            //print "ERROR",error.code
                            //print error.message
                            //process.exit error.errno or 1
            exec(cmd, function (error, stdout, stderr){
                        console.log(stdout);
                        console.log(stderr);
                        if (!options.debugEnabled) {
                            try{
                                fs.unlink(outFile);
                            
                            }catch(err){
                                console.log(err.message, " at rm", outFile);
                            };
                        };
                        
                        if (error) {
                            
                            console.log("ERROR", error.code);
                            console.log(error.message);
                            process.exit(error.errno || 1);
                        };
            });
        }
        else {
        //else //run here
            //compileAndRunParams.unshift 'lite',mainModuleName  #add 'lite filename...' to arguments
            compileAndRunParams.unshift('lite', mainModuleName);// #add 'lite filename...' to arguments
            //if options.verboseLevel, print "RUN: #{compileAndRunParams.join(' ')}"
            if (options.verboseLevel) {console.log("RUN: " + (compileAndRunParams.join(' ')))};
            
//register require() extensions, so if .lite and .md LiteScript 
//files can be required() from node
            //declare valid Compiler.registerRequireExtensions
            
            //Compiler.registerRequireExtensions
            Compiler.registerRequireExtensions();
//hack for require(). Simulate we're at the run module dir,
//for require() to look at the same dirs as at runtime
            //declare on module paths:string array
            
            //declare valid module.constructor._nodeModulePaths
            
            //module.filename = path.resolve(filename)
            module.filename = path.resolve(filename);
            //module.paths = module.constructor._nodeModulePaths(path.dirname(module.filename))
            module.paths = module.constructor._nodeModulePaths(path.dirname(module.filename));
            //declare global var __dirname
            
            //__dirname = path.dirname(module.filename)
            __dirname = path.dirname(module.filename);
//set process.argv to parameters after "--run filename"
            //process.argv = compileAndRunParams
            process.argv = compileAndRunParams;
//run code
            //eval compiledCode
            eval(compiledCode);
        };
    };
//### function watchDir(options:GeneralOptions)
    function watchDir(options){
//Watch a directory and compile when files change
    
        //options.compileIfNewer = true //compile only if source is newer
        options.compileIfNewer = true; //compile only if source is newer
        //var mainDir = path.resolve('.')
        var mainDir = path.resolve('.');
        //console.log "watching dir #{mainDir}"
        console.log("watching dir " + mainDir);
        //var watcher = fs.watch(mainDir)
        var watcher = fs.watch(mainDir);
        //var readdirTimeout
        var readdirTimeout = undefined;
        //declare valid watcher.on
        
        //declare valid watcher.close
        
        //watcher.on 'error' -> err
          //watcher.close
          //throw err
        watcher.on('error', function (err){
          watcher.close();
          throw err;
        });
        //watcher.on 'change' -> event,file
          //clearTimeout readdirTimeout
          //readdirTimeout = setTimeout( ->
                    ////console.log "DIR CHANGE"
                    //compileOnChange(file, mainDir, options) 
        watcher.on('change', function (event, file){
          clearTimeout(readdirTimeout);
          readdirTimeout = setTimeout(function (){
                    compileOnChange(file, mainDir, options);
          }, 250);
        });
    };
                //,250)
//### function compileOnChange(file, dir, options)
    function compileOnChange(file, dir, options){ try{
    
        //if file # we have specific file information
        if (file) {// # we have specific file information
            //if file like /\.(lite|lite\.md)$/
            if (/\.(lite|lite\.md)$/.test(file)) {
                //Compiler.compileProject file, options
                Compiler.compileProject(file, options);
            };
        }
        else {
        //else
            //# check entire dir
            //var files:array = fs.readdirSync(dir)
            var files = fs.readdirSync(dir);
            //for each dirFile in files where dirFile like /\.(lite|lite\.md)$/
            for( var dirFile__inx=0,dirFile ; dirFile__inx<files.length ; dirFile__inx++){dirFile=files[dirFile__inx];
              if(/\.(lite|lite\.md)$/.test(dirFile)){
                //Compiler.compileProject dirFile, options
                Compiler.compileProject(dirFile, options);
            }};// end for each in files
            
        };
        //Exception err
        
        }catch(err){
            //console.log err.message
            console.log(err.message);
        };
    };// --------------------
// Module code
// --------------------
    
// end of module
