// A basic test
mocha.timeout(50000);
describe("Mocha Setup Test", function() {
    before(function() {
        UnitTest.onMinMode();
    });

    // Note that this test helps to wait for 1s so that
    // UI has enough time to load
    it("Should pass simple promise test", function(done) {
        simplePromiseTest()
        .then(function(res) {
            expect(res).to.equal("pass");
            done();
        });
    });

    it("Should set up XI", function(done) {
        function transformToAssocArray(prmstr) {
            var params = {};
            var prmarr = prmstr.split("&");
            for ( var i = 0; i < prmarr.length; i++) {
                var tmparr = prmarr[i].split("=");
                params[tmparr[0]] = tmparr[1];
            }
            return params;
        }
        function getUrlParameters() {
            var prmstr = window.location.search.substr(1);
            return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
        }
        params = getUrlParameters();
        if (params.hasOwnProperty("createWorkbook")) {
            TestSuiteSetup.setup();
            TestSuiteSetup.initialize()
            .always(function() {
                expect("pass").to.equal("pass");
                done();
            });
        } else {
            xcManager.setup()
            .then(function() {
                XcUser.CurrentUser.disableIdleCheck();
                window.onbeforeunload = function() {
                    return;
                };

                expect("pass").to.equal("pass");
                done();
            })
            .fail(function(error) {
                done("failed");
                console.error(error);
                // fail case
                throw error;
            });
        }
    });

    it("Should check license type", function() {
        var mode = XVM.getLicenseMode();
        var valid = (mode === XcalarMode.Oper) || (mode === XcalarMode.Mod);
        expect(valid).to.be.true;
    });

    it("duplicate element IDs should not exist", function() {
         var map = {};
         $('[id]').each(function(){
             var id = $(this).attr('id');
             if (map[id]) {
                 expect(id).to.equal("duplicate element IDs should not exist");
                 return false;
             } else {
                 map[id] = true;
             }
         });
    });

    after(function() {
        UnitTest.offMinMode();
    });

    function simplePromiseTest() {
        var deferred = PromiseHelper.deferred();

        setTimeout(function() {
            deferred.resolve("pass");
        }, 100);

        return deferred.promise();
    }
});



