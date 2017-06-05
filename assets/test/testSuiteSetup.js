/* visit testSuite.html
 *  params:
 *      user: userName to use, default will be testSuite + random suffix
 *      test: only set to y then can we trigger teststuite
 *      delay:  dealy time before running test suite
 *      animation: if testsuite should run with animation
 *      clean: if teststuite should clean table after finishing
 *      close: y or force. if y, window closes after successful run. if
 *        force, window closes after all runs regardless of success or failure
 *      id: id of current run. For reporting back to testSuiteManager
 *      noPopup: y to suppress alert with final results
 *      mode: nothing, ten or hundred - ds size
 *      type: string, type of test "undoredo", "testsuite"
 *      subType: string, subtype of undoredo test
 *      whichTest: demo (filterOnly demo instead of testSuite)
 * example:
 *  http://localhost:8888/testSuite.html?test=y&delay=2000&user=test&clean=y&close=y
 *  http://localhost:8080/undoredoTest.html?test=y&user=someone&type=undoredo&subType=frontEnd
 *  http://localhost:8080/testSuite.html?type=testSuite&test=y&noPopup=y&whichTest=demo&user=someone
 */
window.TestSuiteSetup = (function(TestSuiteSetup) {
    var testSuiteKey = "autoTestsuite";
    var hasUser = true;

    TestSuiteSetup.setup = function() {
        var params = getUrlParameters();
        var user = params.user;
        if (user == null) {
            hasUser = false;
        } else {
            autoLogin(user);
        }
        var testType = params.type;
        if (testType === "undoredo") {
            window.unitTestMode = true;
        }
    };

    TestSuiteSetup.initialize = function() {
        var deferred = jQuery.Deferred();
        // in case of the auto login trigger of short cuts
        xcLocalStorage.removeItem("autoLogin");

        var params = getUrlParameters();
        var runTest = hasUser && parseBooleanParam(params.test);
        var testType = params.type;
        var createWorkbookOnly = params.createWorkbook;
        var toTest = xcSessionStorage.getItem(testSuiteKey);

        if (toTest) {
            heartBeat();
        }

        xcManager.setup()
        .then(function() {
            if (!runTest) {
                if (!hasUser) {
                    document.write("Please specify a user name");
                }
                return;
            }

            if (toTest != null) {
                // next time not auto run it
                xcSessionStorage.removeItem(testSuiteKey);
                if (testType === "undoredo") {
                    return autoRunUndoTest();
                } else {
                    return autoRunTestSuite();
                }
            } else {
                return autoCreateWorkbook();
            }
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            if (runTest && error === WKBKTStr.NoWkbk || createWorkbookOnly) {
                autoCreateWorkbook()
                .then(function() {
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject();
                });
            } else {
                deferred.reject();
            }
        });
        return deferred.promise();
    };

    function heartBeat() {
        var connectionCheck = true;
        var interval = 60 * 1000; // 1min
        var timer = setInterval(function() {
            XcalarGetVersion(connectionCheck)
            .fail(function() {
                clearInterval(timer);
                reportResults({"error": "Connection issue"});
            });
        }, interval);
    }

    function autoLogin(user) {
        // XXX this may need to be replace after we have authentiaction
        xcSessionStorage.setItem("xcalar-username", user);
    }

    function autoCreateWorkbook() {
        var params = getUrlParameters();
        var whichTest = params.whichTest;
        var activeWorksheet = WSManager.getActiveWS();
        xcSessionStorage.setItem(testSuiteKey, "true");

        if (activeWorksheet != null) {
            if (whichTest === "demo") {
                console.log("run test");
                return autoRunTestSuite();
            }

            console.warn("This user is used to test before");
            Workbook.show(true);
        }

        if (whichTest === "demo") {
            var wkbks = WorkbookManager.getWorkbooks();
            var wkbkName = Object.keys(wkbks);
            return activeWorkbook(wkbkName);
        }

        return createWorkbook();
    }

    function createWorkbook() {
        var deferred = jQuery.Deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            if ($('#workbookPanel').is(':visible')) {
                var num = Math.ceil(Math.random() * 1000);
                var wbName = "WB" + num;
                $('.newWorkbookBox input').val(wbName);
                $('.newWorkbookBox button').click();
                clearInterval(wbInterval);

                activeWorkbook(wbName)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    }

    function activeWorkbook(wbName) {
        var deferred = jQuery.Deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            var $wkbkBox = $('.workbookBox[data-workbook-id*="' + wbName + '"]');
            if ($wkbkBox.length > 0) {
                clearInterval(wbInterval);
                $wkbkBox.find('.activate').click();
                deferred.resolve(wbName);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    }

    function autoRunTestSuite() {
        var params = getUrlParameters();
        var delay = Number(params.timeout);

        if (isNaN(delay)) {
            delay = 0;
        }
        var clean = parseBooleanParam(params.clean);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var whichTest = params.whichTest;

        // console.log("delay", delay, "clean", clean, "animation", animation)
        setTimeout(function() {
            var deferred = jQuery.Deferred();
            if (whichTest === "demo") {
                deferred = DemoTestSuite.run();
            } else {
                deferred = TestSuite.run(animation, clean, noPopup, mode);
            }
            deferred
            .then(function(res) {
                console.info(res);
                reportResults(res);
            })
            .fail(function() {
                console.log("fail");
            });
        }, delay);
    }

    function autoRunUndoTest() {
        // sample param ?user=someone&test=y&type=undoredo&subType=frontEnd
        var params = getUrlParameters();
        var delay = Number(params.timeout);
        var operationType = params.subType;

        if (isNaN(delay)) {
            delay = 0;
        }

        setTimeout(function() {
            UndoRedoTest.run(operationType)
            .always(function() {
               // undotest should be handling end cases
            });
        }, delay);
    }

    function reportResults(res) {
        var params = getUrlParameters();
        var close = params.close;
        var id = Number(params.id);
        if (isNaN(id)) {
            id = 0;
        }

        if (window.opener) {
            window.opener.reportResults(id, res);
            if (close) {
                if (close === "force") {
                    window.close();
                } else {
                    if (res.fail === 0) {
                        window.close();
                    }
                }
            }
        }
    }

    function parseBooleanParam(param) {
        if (param === "y") {
            return true;
        } else {
            return false;
        }
    }

    function getUrlParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
    }

    function transformToAssocArray(prmstr) {
        var params = {};
        var prmarr = prmstr.split("&");
        for ( var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params[tmparr[0]] = tmparr[1];
        }
        return params;
    }

    return (TestSuiteSetup);
}({}));
