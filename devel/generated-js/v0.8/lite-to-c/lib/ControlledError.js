// -----------
// Module Init
// -----------
    //class ControlledError extends Error
    // constructor
    function ControlledError(msg){
    //Sadly, the Error Class in javascript is not easily subclassed.
//http://stackoverflow.com/questions/8802845/inheriting-from-the-error-object-where-is-the-message-property
this.__proto__.__proto__=Error.apply(null,arguments);
//NOTE: all instances of ControlledError will share the same info
        //properties
            //soft: boolean
            //declare valid Error.apply
            
            //declare valid this.__proto__.__proto__
            
            //.__proto__.__proto__ = Error.apply(null,arguments)
            this.__proto__.__proto__ = Error.apply(null, Array.prototype.slice.call(arguments));
        };
    // ControlledError (extends|proto is) Error
    ControlledError.prototype.__proto__ = Error.prototype;
    
    // end class ControlledError
// -----------
// Module code
// -----------
// end of module
module.exports=ControlledError;
