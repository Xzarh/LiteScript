Shims Tests
-----------

    declare var expect:function
    
    var Tests = 

      'shim adjective':

        code: function

          class First 

            properties
              val: number = -1

            constructor(val)
              .val = val

            method oldOne
                return 1

            method getVal()
              return .val


          Append to class First

            shim method oldOne
                return 2

            shim method newOne
                return 10

          var f = new First(20)

          expect f.getVal(), 20
          expect f.oldOne(), 1
          expect f.newOne(), 10

