Strings
-------

    declare var expect:function #provided by test framework

Triple Quoted Strings

    var b=0
    var sonet18 = """
        Shall I compare thee to a summer's day? 
        Thou art more lovely and more temperate. 
        Rough winds do shake the darling buds of May, 
        And summer's lease hath all too short a date.
    """ 

    var red = """
        The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, 
        so suddenly that Alice had not a moment to think about stopping herself 
        before she found herself falling down a very deep well.
        """ 

---------

    var Tests = 

      'triple quotes':

        code: function

          expect sonet18.split("\n").length, 4
          expect sonet18.split(" ").length, 30

          expect red.split("\n").length, 3
          expect red.split(" ").length, 37

      'like':

        code: function

          expect sonet18 like /a summer's day/, true
          expect sonet18 like /a winter's day/, false
          expect sonet18 like /summer(.|\n)*winds(.|\n)*of May/, true


      'regular expressions':

        code: function

          var r = /[0-9]+/g
          var s = '43 4 test 533 x'.replace(r, 'o')

          return s

        expected: 'o o test o x'


      'multi line comments':

        code: function

          var flags = 
                isThisCode: 0
                isThisNotCode : 0
                isThisCode2: 0
                isThisCode3: 0

          /* 1) This are multiline comments
          to check how the code is generated
          */          

/* 

        2) This are more multiline comments
        to also check how comments are added to generated code
        flags.isThisNotCode=true #this should ne not code

        */
          flags.isThisCode=true #this should be code

       /* 3) This are multiline comments
          to check how the code is generated
          lorem ipsum
        */
          flags.isThisCode2=true #this should be code too

        /* 4) This are multiline comments
        to check ho the code is generated
        lorem ipsum */
          flags.isThisCode3=true //this should be code

          expect flags.isThisCode, true
          expect flags.isThisNotCode, 0
          expect flags.isThisCode2, true
          expect flags.isThisCode3, true

