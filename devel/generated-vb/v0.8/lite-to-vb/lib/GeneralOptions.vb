'Generated by LiteScript compiler v0.8.9, source: lib/GeneralOptions.lite.md
' -----------
Module GeneralOptions
' -----------
    '    export only class GeneralOptions
    ' constructor
    Class GeneralOptions
        Public Property verboseLevel as Object=1
          Public Property warningLevel as Object=1
          Public Property comments as Object=1
          Public Property target as Object="vb"
          Public Property outDir as Object="generated/vb"
          Public Property debugEnabled as Object=undefined
          Public Property perf as Object=0
          Public Property skip as Object=undefined
          Public Property generateSourceMap as Object=true
          Public Property single as Object=undefined
          Public Property compileIfNewer as Object=undefined
          Public Property browser as Object=undefined
          Public Property es6 as Boolean' mainType: Boolean  
      
          Public Property defines as Array' mainType: Array  ' itemType: String
      =new ArrayList
      
          Public Property includeDirs as Array' mainType: Array  ' itemType: String
      =new ArrayList
      
          Public Property projectDir as String' mainType: String  
      ="."
          Public Property mainModuleName as String' mainType: String  
      ="unnamed"
          Public Property storeMessages as Boolean' mainType: Boolean  
      =false
          Public Property version as String' mainType: String  
      
          Public Property now as Date' mainType: Date  
      =new Date()
    
    Sub New() 'default constructor
    
      ' ---------------------------
      Public Function toString ()
            'return "outDir:" + .outDir + "\ndefines:" + (.defines.join())
            return "outDir:" + Me.outDir + "\ndefines:" + (Me.defines.join())
      end function
    
    end class 'GeneralOptions
' -----------
' Module code
' -----------
end module
