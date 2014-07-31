#include "c_lite.h"
//-------------------------
//Module c_lite
//-------------------------
#include "c_lite.c.extra"
//-------------------------
//NAMESPACE c_lite
//-------------------------
var c_lite_VERSION, c_lite_BUILD_DATE;
var c_lite_usage;
var c_lite_args;
var c_lite_mainModuleName, c_lite_compileAndRunOption, c_lite_compileAndRunParams;
var c_lite_options;
any c_lite_startCompilation(DEFAULT_ARGUMENTS); //forward declare
//##Lite-c
//This is the command line interface to LiteScript Compiler,
//when it is generated as C-code standalone executable 
    //#define C_LITE
    //global import fs, path
    
    //import color, ControlledError
    
    //import OptionsParser  
    
    //import GeneralOptions, Compiler, ASTBase
    
    //var 
        //VERSION = '0.8.5'
        //BUILD_DATE = '__DATE__'
//## module vars
    //var usage = """
    
    //LiteScript compiler v#{VERSION} #{BUILD_DATE} (standalone executable)
    
    //Usage: litec main.lite.md [options]
    
    //options are:
    //-o dir           output dir. Default is './out'
    //-v, -verbose     verbose level, default is 0 (0-3)
    //-w, -warning     warning level, default is 1 (0-1)
    //-comments        comment level on generated files, default is 1 (0-2)
    //-version         print LiteScript version & exit
    //Advanced options:
    //-D FOO -D BAR    Defines preprocessor names (#ifdef FOO/#ifndef BAR)
    //-nm, -nomap      do not generate sourcemap
    //-d, -debug       enable full compiler debug log file at 'out/debug.logger'
    //-perf            0..2: show performance timers
    
    //"""
//Get & parse command line arguments
    //var args = new OptionsParser(process.argv)
    //var 
        //mainModuleName
        //compileAndRunOption:boolean
        //compileAndRunParams:array
//Check for -help
    //if args.option('h','help') 
        //print usage
        //process.exit 0
//Check for -version
    //if args.option('vers','version') 
        //print VERSION
        //process.exit 0
//Check for -run
    //if args.valueFor('r','run') into mainModuleName
        //compileAndRunOption = true
        //compileAndRunParams = args.items.splice(args.lastIndex) #remove params after --run
//Check for other options
    //var options = new GeneralOptions()
    //with options
        //.outDir         = path.resolve(args.valueFor('o') or './out') //output dir
        //.verboseLevel   = parseInt(args.valueFor('v',"verbose") or 0) 
        //.warningLevel   = parseInt(args.valueFor('w',"warning") or 1)
        //.perf           = parseInt(args.valueFor('perf',"performance") or 0)
        //.comments       = parseInt(args.valueFor('comment',"comments") or 1) 
        //.debugEnabled   = args.option('d',"debug") 
        //.generateSourceMap = args.option('nm',"nomap")? false:true // do not generate sourcemap
        //.defines = []
    //if options.verboseLevel>1
        //print JSON.stringify(process.argv)
    //while args.valueFor('D') into var newDef
        //options.defines.push newDef
//get mainModuleName
    //if no args.items.length
        //console.error "Missing file.lite.md to compile\nlite -h for help"
        //process.exit 
    ////only main module name should be left
    //if args.items.length>1
        //print "Invalid arguments:", args.items.join(' ')
        //print "lite -h for help"
        //process.exit 2
        
    //mainModuleName = args.items[0]
//show args
    ////console.log(process.cwd());
    //if options.verboseLevel 
        //print """
            //LiteScript compiler version: #{Compiler.version} #{Compiler.buildDate}
            //compiler options: #{options}
            //cwd: #{process.cwd()}
            //compile: #{mainModuleName}
            //"""
        //if options.verboseLevel >1
            //print 'compiler options: #{JSON.stringify(options)}'
    //if options.debugEnabled, print color.yellow,"GENERATING COMPILER DEBUG AT out/debug.logger",color.normal
//launch project compilation
    //startCompilation
    //function startCompilation
    any c_lite_startCompilation(DEFAULT_ARGUMENTS){ try{
        //Compiler.compileProject(mainModuleName, options);
        Compiler_compileProject(undefined,2,(any_arr){
        c_lite_mainModuleName, 
        c_lite_options
});
//Compile Exception handler
        //exception err
        
        }catch(err){
            //if err instance of ControlledError
            if (_instanceof(err,ControlledError))  {
                //console.error color.red, err.message, color.normal
                console_error(undefined,3,(any_arr){
        color_red, 
        PROP(message_,err), 
        color_normal
});
                //process.exit 1
                process_exit(undefined,1,(any_arr){
        any_number(1)
});
            }
            
            //else if err.code is 'EISDIR'
            
            else if (__is(PROP(code_,err),any_LTR("EISDIR")))  {
                //console.error '#{color.red}ERROR: "#{mainModuleName}" is a directory#{color.normal}'
                console_error(undefined,1,(any_arr){
        _concatAny(5,
        color_red, 
        any_LTR("ERROR: \""), 
        c_lite_mainModuleName, 
        any_LTR("\" is a directory"), 
        color_normal
)
});
                //console.error 'Please specify a *file* as the main module to compile'
                console_error(undefined,1,(any_arr){
        any_LTR("Please specify a *file* as the main module to compile")
});
                //process.exit 2
                process_exit(undefined,1,(any_arr){
        any_number(2)
});
            }
            
            //else 
            
            else {
                //console.error 'UNCONTROLLED ERROR:'
                console_error(undefined,1,(any_arr){
        any_LTR("UNCONTROLLED ERROR:")
});
                //console.error err
                console_error(undefined,1,(any_arr){
        err
});
                //console.error 'stack:',err.stack
                console_error(undefined,2,(any_arr){
        any_LTR("stack:"), 
        PROP(stack_,err)
});
                //process.exit 3
                process_exit(undefined,1,(any_arr){
        any_number(3)
});
            };
        };
    return undefined;
    }
//------------------
void c_lite__namespaceInit(void){
    c_lite_VERSION = any_LTR("0.8.5");
    c_lite_BUILD_DATE = any_LTR("Wed Jul 30 2014");
    c_lite_usage = _concatAny(5,
        any_LTR("\n    LiteScript compiler v"), 
        c_lite_VERSION, 
        any_LTR(" "), 
        c_lite_BUILD_DATE, 
        any_LTR(" (standalone executable)\n\n    Usage: litec main.lite.md [options]\n\n    options are:\n    -o dir           output dir. Default is './out'\n    -v, -verbose     verbose level, default is 0 (0-3)\n    -w, -warning     warning level, default is 1 (0-1)\n    -comments        comment level on generated files, default is 1 (0-2)\n    -version         print LiteScript version & exit\n\n    Advanced options:\n    -D FOO -D BAR    Defines preprocessor names (#ifdef FOO/#ifndef BAR)\n    -nm, -nomap      do not generate sourcemap\n    -d, -debug       enable full compiler debug log file at 'out/debug.logger'\n    -perf            0..2: show performance timers\n")
);
    c_lite_args = new(OptionsParser,1,(any_arr){
        process_argv
});
    c_lite_options = new(GeneralOptions,0,NULL);
};


//-------------------------
void c_lite__moduleInit(void){
    c_lite__namespaceInit();
    if (_anyToBool(METHOD(option_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("h"), 
        any_LTR("help")
})))  {
        print(1,(any_arr){c_lite_usage});
        process_exit(undefined,1,(any_arr){
        any_number(0)
});
    };
    if (_anyToBool(METHOD(option_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("vers"), 
        any_LTR("version")
})))  {
        print(1,(any_arr){c_lite_VERSION});
        process_exit(undefined,1,(any_arr){
        any_number(0)
});
    };
    if (_anyToBool((c_lite_mainModuleName=METHOD(valueFor_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("r"), 
        any_LTR("run")
}))))  {
        c_lite_compileAndRunOption = true;
        c_lite_compileAndRunParams = __call(splice_,PROP(items_,c_lite_args),1,(any_arr){
        PROP(lastIndex_,c_lite_args)
});// #remove params after --run
    };
    var c_lite__with1=c_lite_options;
        PROP(outDir_,c_lite__with1) = path_resolve(undefined,1,(any_arr){
        (_anyToBool(__or1=METHOD(valueFor_,c_lite_args)(c_lite_args,1,(any_arr){
        any_LTR("o")
}))? __or1 : any_LTR("./out"))
}); //output dir
        PROP(verboseLevel_,c_lite__with1) = parseInt(undefined,1,(any_arr){
        (_anyToBool(__or2=METHOD(valueFor_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("v"), 
        any_LTR("verbose")
}))? __or2 : any_number(0))
});
        PROP(warningLevel_,c_lite__with1) = parseInt(undefined,1,(any_arr){
        (_anyToBool(__or3=METHOD(valueFor_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("w"), 
        any_LTR("warning")
}))? __or3 : any_number(1))
});
        PROP(perf_,c_lite__with1) = parseInt(undefined,1,(any_arr){
        (_anyToBool(__or4=METHOD(valueFor_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("perf"), 
        any_LTR("performance")
}))? __or4 : any_number(0))
});
        PROP(comments_,c_lite__with1) = parseInt(undefined,1,(any_arr){
        (_anyToBool(__or5=METHOD(valueFor_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("comment"), 
        any_LTR("comments")
}))? __or5 : any_number(1))
});
        PROP(debugEnabled_,c_lite__with1) = METHOD(option_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("d"), 
        any_LTR("debug")
});
        PROP(generateSourceMap_,c_lite__with1) = _anyToBool(METHOD(option_,c_lite_args)(c_lite_args,2,(any_arr){
        any_LTR("nm"), 
        any_LTR("nomap")
})) ? false : true; // do not generate sourcemap
        PROP(defines_,c_lite__with1) = new(Array,0,NULL);
    ;
    if (_anyToNumber(PROP(verboseLevel_,c_lite_options)) > 1)  {
        print(1,(any_arr){JSON_stringify(undefined,1,(any_arr){
        process_argv
})});
    };
    var c_lite_newDef=undefined;
    while(_anyToBool((c_lite_newDef=METHOD(valueFor_,c_lite_args)(c_lite_args,1,(any_arr){
        any_LTR("D")
})))){
        __call(push_,PROP(defines_,c_lite_options),1,(any_arr){
        c_lite_newDef
});
    };// end loop
    if (!_length(PROP(items_,c_lite_args)))  {
        console_error(undefined,1,(any_arr){
        any_LTR("Missing file.lite.md to compile\nlite -h for help")
});
        process_exit(undefined,0,NULL);
    };
    if (_length(PROP(items_,c_lite_args)) > 1)  {
        print(2,(any_arr){any_LTR("Invalid arguments:"), __call(join_,PROP(items_,c_lite_args),1,(any_arr){
        any_LTR(" ")
})});
        print(1,(any_arr){any_LTR("lite -h for help")});
        process_exit(undefined,1,(any_arr){
        any_number(2)
});
    };
    c_lite_mainModuleName = ITEM(0,PROP(items_,c_lite_args));
    if (_anyToBool(PROP(verboseLevel_,c_lite_options)))  {
        print(1,(any_arr){_concatAny(10,
        any_LTR("LiteScript compiler version: "), 
        Compiler_version, 
        any_LTR(" "), 
        Compiler_buildDate, 
        any_LTR("\ncompiler options: "), 
        c_lite_options, 
        any_LTR("\ncwd: "), 
        ((process_cwd(undefined,0,NULL))), 
        any_LTR("\ncompile: "), 
        c_lite_mainModuleName
)});
        if (_anyToNumber(PROP(verboseLevel_,c_lite_options)) > 1)  {
            print(1,(any_arr){_concatAny(2,
        any_LTR("compiler options: "), 
        (JSON_stringify(undefined,1,(any_arr){
        c_lite_options
}))
)});
        };
    };
    if (_anyToBool(PROP(debugEnabled_,c_lite_options))) {print(3,(any_arr){color_yellow, any_LTR("GENERATING COMPILER DEBUG AT out/debug.logger"), color_normal});};
    c_lite_startCompilation(undefined,0,NULL);
};
