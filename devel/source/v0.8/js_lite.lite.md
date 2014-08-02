##Lite-js
This is the command line interface to LiteScript-to-js Compiler
when the LiteScript compiler is generated as js-code 
to run on node.js or the browser

    global import path,fs
    
    import GeneralOptions, OptionsParser, ControlledError, color

    import Compiler

execute commands

    execute process.argv


### function execute(params:array)

        var title = "LiteScript-to-js v#{Compiler.version} Build Date #{Compiler.buildDate}"

#### usage

        var usage = """
        
        #{title}
        
        Usage: 
                lite mainModule.lite.md [options]
                lite -run mainModule.lite.md [options]

        This command will launch the LiteScript Compiler for mainModule.lite.md
        
        options are:
        -r, -run         compile & run .lite.md file
        -o dir           output dir. Default is './generated/js/'
        -b, -browser     compile for a browser environment (window instead of global, no process, etc)
        -v, -verbose     verbose level, default is 0 (0-3)
        -w, -warning     warning level, default is 1 (0-1)
        -comments        comment level on generated files, default is 1 (0-2)
        -version         print LiteScript version & exit
        -i dir           additional "import" dir. e.g: -i ../../intefaces

        Advanced options:
        -s,  -single     compile single file. do not follow "import" statements
        -wa, -watch      watch current dir for source changes and compile
        -es6, --harmony  used with -run, uses node --harmony
        -nm, -nomap      do not generate sourcemap
        -noval           skip property name validation
        -D NAME -D NAME  preprocessor defines (#define)
        -d, -debug       enable full compiler debug logger file at 'out/debug.logger'
        -run -debug      when -run used with -debug, launch compiled file with: node --debug-brk 
        
        """


Get & process command line arguments

        var args = new OptionsParser(params)

        var options = new GeneralOptions

        var 
            isCompileAndRun:boolean
            compileAndRunParams:array

Check for -help

        if args.option('h','help') 
            print usage
            process.exit 0

Check for -version

        if args.option('vers','version') 
            print Compiler.version
            process.exit 0

Check for -run

        if args.valueFor('r','run') into options.mainModuleName
            isCompileAndRun = true
            compileAndRunParams = args.items.splice(args.lastIndex) #remove params after --run

get compiler version to --use

        var use = args.valueFor('u','use')

set other options

        with options
            .outDir         = path.resolve(args.valueFor('o') or './generated/js') //output dir
            .verboseLevel   = Number(args.valueFor('v',"verbose") or 0) 
            .warningLevel   = Number(args.valueFor('w',"warning") or 1)
            .comments       = Number(args.valueFor('comment',"comments") or 1) 
            .debugEnabled   = args.option('d',"debug") 
            .skip           = args.option('noval',"novalidation") // skip name validation
            .generateSourceMap = args.option('nm',"nomap")? false:true // do not generate sourcemap
            .single         = args.option('s',"single") // single file- do not follow require() calls
            .compileIfNewer = args.option('ifn',"ifnew") // single file, compile if source is newer
            .browser        = args.option('b',"browser") 
            .es6            = args.option('es6',"harmony") 
            .perf           = parseInt(args.valueFor('perf',"performance") or 0)
            .defines = []
            .includeDirs = []


        while args.valueFor('D') into var newDef
            options.defines.push newDef

        while args.valueFor('i') into var includeDir
            options.includeDirs.push includeDir

Check for -watch dir

        if args.option('wa','watch')
            watchDir Compiler,options
            return //EXIT

get mainModuleName

        //only mainModuleName should be left
        case args.items.length 

            when 0:
                if no options.mainModuleName
                    console.error  """
                        #{title}
                        Missing MainModule or -run filename.
                        lite -h for help
                        """
                    process.exit 2

            when 1:
                options.mainModuleName = args.items[0]

            else
                console.error  """
                    Invalid (#{args.items.length}) arguments:", args.items.join(' ')
                    lite -h for help
                    """
                process.exit 2

show options

        if options.verboseLevel
            print """
                #{title}
                compiler options: #{JSON.stringify(options)}
                cwd: #{process.cwd()}
                compile #{isCompileAndRun?"and run":""}: #{options.mainModuleName}
                """

        if options.debugEnabled, print color.yellow,"GENERATING COMPILER DEBUG AT out/debug.logger",color.normal

Launch project compilation
    
if "compile and run", load & compile then run it (eval)

        if isCompileAndRun
            compileAndRun compileAndRunParams, options

else, compile a entire Project

        else
            Compiler.compileProject options


Exception handler

        Exception err

            if err instance of ControlledError 
                console.error color.red, err.message, color.normal
                process.exit 1
            
            else if err.code is 'EISDIR'
                console.error color.red, err.message, color.normal
                console.error 'Please specify a *file* as the main module to compile'
                process.exit 2
            
            else 
                console.log 'UNCONTROLLED #{err.constructor.name}',err
                throw err
 
    end function execute


### function compileAndRun(compileAndRunParams:array, options:GeneralOptions)

        var nodeArgs = options.es6?" --harmony":"" 

        var filename = options.mainModuleName
        if not fs.existsSync(filename), filename=options.mainModuleName+'.md'
        if not fs.existsSync(filename), filename=options.mainModuleName+'.lite.md'
        if not fs.existsSync(filename), fail with 'Compile and Run,  File not found: "#{options.mainModuleName}"'
        var sourceLines = fs.readFileSync(filename)
        var compiledLines = Compiler.compile(filename,sourceLines,options);

if options.es6, save compiled file, run with node --harmony

        if options.es6
            var outFile = path.join(options.outDir,options.mainModuleName+'.js')
            fs.writeFileSync outFile,compiledLines.join("\n")
            var exec = require('child_process').exec;
            var cmd = 'node #{nodeArgs} #{outFile} #{compileAndRunParams.join(" ")}'
            print cmd
            exec cmd, function(error:Error, stdout, stderr) 
                        print stdout
                        print stderr
                        try # to delete generated temp file
                            fs.unlink outFile
                        catch err 
                            print err.message," at rm",outFile
                        if error 
                            declare valid error.errno
                            print "ERROR",error.code
                            print error.message
                            process.exit error.errno or 1

else, run here (eval)

        else 

            compileAndRunParams.unshift 'lite',options.mainModuleName  #add 'lite filename...' to arguments
            if options.verboseLevel, print "RUN: #{compileAndRunParams.join(' ')}"
            
register require() extensions, so if .lite and .md LiteScript 
files can be required() from node

            declare valid Compiler.registerRequireExtensions
            Compiler.registerRequireExtensions

hack for require(). Simulate we're at the run module dir,
for require() to look at the same dirs as at runtime

            declare on module paths:string array
            declare valid module.constructor._nodeModulePaths
            module.filename = path.resolve(filename)
            module.paths = module.constructor._nodeModulePaths(path.dirname(module.filename))
            __dirname = path.dirname(module.filename)

set process.argv to parameters after "--run filename"

            process.argv = compileAndRunParams

run code

            eval compiledLines.join("\n")


### function watchDir(options:GeneralOptions)

Watch a directory and compile when files change
    
        options.compileIfNewer = true //compile only if source is newer

        var mainDir = path.resolve('.')
        console.log "watching dir #{mainDir}"
        var watcher = fs.watch(mainDir)
        var readdirTimeout

        declare valid watcher.on
        declare valid watcher.close

        watcher.on 'error' -> err
          watcher.close
          throw err

        watcher.on 'change' -> event,file
          clearTimeout readdirTimeout
          readdirTimeout = setTimeout( ->
                    //console.log "DIR CHANGE"
                    compileOnChange(file, mainDir, options) 
                ,250)

### function compileOnChange(file, dir, options)
    
        if file # we have specific file information
            if file like /\.(lite|lite\.md)$/
                Compiler.compileProject file, options
        else
            # check entire dir
            var files:array = fs.readdirSync(dir)
            for each dirFile in files where dirFile like /\.(lite|lite\.md)$/
                Compiler.compileProject dirFile, options

        Exception err
            console.log err.message
