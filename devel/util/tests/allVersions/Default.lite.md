Default Assignment Tests
------------------------

    declare var expect:function

    function aFn(x,y, options)

      default options =
          num1 : 5
          num2 : 0
          string1: "xx"
          string2: ""
          func: aFn
          bool1: true
          bool2: false

      return options


    function multiLevel(options)

      default options =
          num : 
            nonZero:5
            zero : 0
          stringValue:
            withData: "xx"
            empty: ""
          func: 
            name:
              display: "the Function"
              internal: "fn"
          more: {}

      return options


    var Tests = 

      'missing options parameter':

        code: function

            var options = aFn(10,20)

            declare valid options.func
            expect options.func is aFn, true
            options.func=""

            expect JSON.stringify(options), 
                      JSON.stringify({
                        num1:5,num2:0,string1:"xx",string2:""
                        ,func:"",bool1:true, bool2:false})


      'change num & bool':

        code: function

            var options = aFn(10,20,{num1:11, bool1:false})

            declare valid options.func
            expect options.func is aFn, true
            options.func=""

            expect JSON.stringify(options), 
                      JSON.stringify({
                          num1: 11
                          bool1: false
                          num2: 0
                          string1: "xx"
                          string2: ""
                          func:""
                          bool2: false
                      })


      'change num from zero, undeclared param and func:null':

        code: function

            var options = aFn (10,20,{
                                  num1:21
                                  num2:7
                                  string1:false
                                  other:/./
                                  func: null
                                })

            expect JSON.stringify(options), 
                      JSON.stringify({
                          num1: 21
                          num2: 7
                          string1: false
                          other:/./
                          func: null
                          string2: ""
                          bool1: true
                          bool2: false
                      })



      'multilevel- empty':

        code: function

            var options = multiLevel()

            expect JSON.stringify(options), 
  
                      JSON.stringify({

                        num:
                            nonZero: 5
                            zero: 0
                        stringValue:
                            withData: "xx"
                            empty: ""
                        func:
                            name:
                                display: "the Function"
                                internal: "fn"
                        more: {}
                      })


      'multilevel':

        code: function

            var options = multiLevel(
                {
                  num:
                    nonZero:0
                    zero:5
                  func: 
                    name: 
                      display:"myFunc", internal:"mf"
                    filter:/./
                  more:
                    more1:1
                    more2:"data"
                  unexpected:
                    l1:
                      l2:
                        l3:0
                })


            expect JSON.stringify(options), 
  
                JSON.stringify({

                  num:
                    nonZero:0
                    zero:5

                  func: 
                    name: 
                      display:"myFunc", internal:"mf"
                    filter:/./

                  more:
                    more1:1
                    more2:"data"

                  unexpected:
                    l1:
                      l2:
                        l3:0

                  stringValue:
                    withData: "xx"
                    empty: ""

                })

