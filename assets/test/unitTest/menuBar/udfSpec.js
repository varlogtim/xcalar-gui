describe("UDF Test", function() {
    var waitTime = 200;
    var defaultModule = "default";
    var syntaxErrror = "Error: [\"SyntaxError: ('invalid syntax', ('xcalar_udf_cdf', 12, 5, 'def :\\n'))\n\"]";
    var $udfSection;
    var $udfManager;

    before(function(done) {
        var $tab = $("#udfTab");

        $udfSection = $("#udfSection");
        $udfManager = $("#udf-manager");
        UnitTest.onMinMode();

        if (!$tab.hasClass("active")) {
            $tab.click();
            // wait for menu bar to open
            setTimeout(function() {
                done();
            }, waitTime);
        } else {
            done();
        }
    });

    describe("Basic Function Test", function() {
        it("isEditableUDF should work", function() {
            var isEditableUDF = UDF.__testOnly__.isEditableUDF;
            expect(isEditableUDF(defaultModule)).to.be.false;
            expect(isEditableUDF("test")).to.be.true;
        });

        it("getEntireUDF should work", function(done) {
            UDF.__testOnly__.getEntireUDF(defaultModule)
            .then(function(str) {
                expect(str).not.to.be.null;
                expect(str).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getEntireUDF should handle error", function(done) {
            UDF.__testOnly__.getEntireUDF("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("downloadUDF should work", function(done) {
            var oldFunc = xcHelper.downloadAsFile;
            var test = null;
            xcHelper.downloadAsFile = function(moduleName, entireString) {
                test = entireString;
            };

            UDF.__testOnly__.downloadUDF(defaultModule)
            .then(function() {
                expect(test).not.to.be.null;
                expect(test).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcHelper.downloadAsFile = oldFunc;
            });
        });

        it("downloadUDF should handle error case", function(done) {
            UDF.__testOnly__.downloadUDF("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
                done();
            });
        });

        it("parseSyntaxError should work", function() {
            var parseSyntaxError = UDF.__testOnly__.parseSyntaxError;
            // case 1
            var res = parseSyntaxError(null);
            expect(res).to.be.null;
            // case 2
            res = parseSyntaxError({"error": "abc"});
            expect(res).to.be.null;
            // case 3
            res = parseSyntaxError({"error": "a,b,c,d"});
            expect(res).to.be.null;
            // case 4
            res = parseSyntaxError({"error": "(a,b,c,d)"});
            expect(res).to.be.null;

            res = parseSyntaxError({"error": syntaxErrror});
            expect(res).to.be.an("object");
            expect(res.reason).to.equal("\'invalid syntax\'");
            expect(res.line).to.equal(12);
        });

        it("inputUDFFuncList should work", function() {
            var inputUDFFuncList = UDF.__testOnly__.inputUDFFuncList;
            var module = xcHelper.randName("testModule");
            inputUDFFuncList(module);
            UnitTest.hasStatusBoxWithError(UDFTStr.NoTemplate);
            // case 2
            inputUDFFuncList("default");
            expect(UDF.getEditor().getValue()).contains("convertFormats");
        });
    });

    describe("Upload Error Handling Test", function() {
        var uploadUDF;
        var oldUploadFunc;

        before(function() {
            uploadUDF = UDF.__testOnly__.uploadUDF;
            oldUploadFunc = XcalarUploadPython;
        });

        it("Should handle uneditable error", function(done) {
            uploadUDF(defaultModule, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(SideBarTStr.OverwriteErr);
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        it("Should handle normal error", function(done) {
            XcalarUploadPython = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            var moduleName = xcHelper.randName("unittest");
            uploadUDF(moduleName, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($udfSection.find(".lint-error").length)
                .to.equal(0);
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            });
        });

        it("Should handle syntax error", function(done) {
            if (isBrowserMicrosoft) {
                done();
                return;
            }
            XcalarUploadPython = function() {
                return PromiseHelper.reject({
                    "error": syntaxErrror
                });
            };

            var moduleName = xcHelper.randName("unittest");
            uploadUDF(moduleName, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect($udfSection.find(".lint-error").length)
                .to.above(0);
                UnitTest.hasAlertWithTitle(SideBarTStr.SyntaxError);
                done();
            });
        });

        after(function() {
            XcalarUploadPython = oldUploadFunc;
        });
    });

    describe("UDF Public API Test", function() {
        it("UDF.getEditor should work", function() {
            var editor = UDF.getEditor();
            expect(editor instanceof CodeMirror).to.be.true;
        });

        it("UDF.getUDFs should work", function() {
            var udfs = UDF.getUDFs();
            expect(udfs).to.be.an("object");
        });

        it("UDF.storePython should work", function() {
            var moduleName = xcHelper.randName("unittest");
            UDF.storePython(moduleName, "test");
            var udfs = UDF.getUDFs();
            expect(udfs).to.have.ownProperty(moduleName);
        });

        it("UDF.list should work", function(done) {
            UDF.list()
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res).to.have.property("fnDescs");
                expect(res).to.have.property("numXdfs");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("UDF.clear should work", function() {
            UDF.clear();
            var udfs = UDF.getUDFs();
            expect(jQuery.isEmptyObject(udfs)).to.be.true;
        });

        it("UDF.initialize should handle error case", function(done) {
            var oldFunc = XcalarListXdfs;
            XcalarListXdfs = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            UDF.initialize()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("UDF.initialize should work", function(done) {
            UDF.initialize()
            .then(function() {
                var udfs = UDF.getUDFs();
                expect(udfs).to.have.ownProperty(defaultModule);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("UDF.toggleXcUDFs should work", function() {
            var isHide = UserSettings.getPref("hideXcUDF") || false;
            var $li = $("<li>_xcalar_test</li>");
            $("#udf-fnMenu").append($li);
            UDF.toggleXcUDFs(!isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(!isHide);

            UDF.toggleXcUDFs(isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(isHide);
            $li.remove();
        });

        it("UDF.refreshWithoutClearing should work", function(done) {
            var oldFunc = XcalarListXdfs;
            var editor = UDF.getEditor();
            editor.setValue("test");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDF.refreshWithoutClearing()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(editor.getValue()).to.equal("test");
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("UDF.refresh should work", function(done) {
            var oldFunc = XcalarListXdfs;
            var editor = UDF.getEditor();
            editor.setValue("test2");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDF.refresh()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(editor.getValue()).not.to.equal("test2");
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });
    });

    describe("UDF Manager Behavior Test", function() {
        it("Should switch to manager tab", function() {
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            $tab.click();
            expect($tab.hasClass("active"));
            assert.isTrue($udfManager.is(":visible"));
        });

        it("Should refersh udf", function(done) {
            $udfManager.find(".refresh").click();
            expect($udfManager.hasClass("loading")).to.be.true;
            var checkFunc = function() {
                return !$udfManager.hasClass("loading");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click edit button to edit udf", function() {
            var $udf = $udfManager.find(".udf:contains(" + defaultModule + ")");
            $udf.find(".edit").click();
            var $tab = $udfSection.find('.tab[data-tab="udf-manager"]');
            expect($tab.hasClass("active")).to.be.false;
        });
    });

    describe("Upload and Delete UDF Test", function() {
        var $fnName;
        var uploadModule;
        var editor;
        var func = "def test():\n" +
                   "\treturn \"a\"";

        before(function() {
            $fnName = $("#udf-fnName");
            uploadModule = xcHelper.randName("unittest");
            editor = UDF.getEditor();
        });

        it("Should choose template", function() {
            var $menu = $("#udf-fnMenu");
            $("#udf-fnList").trigger(fakeEvent.click);
            assert.isTrue($menu.is(":visible"));
            $menu.find('li[name="blank"]').trigger(fakeEvent.mouseup);
            assert.isFalse($menu.is(":visible"));
        });

        it("Should not upload with empty module name", function() {
            editor.setValue(func);
            $fnName.val("");
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should not upload with long module name", function() {
            editor.setValue(func);
            // 256 a
            $fnName.val(new Array(257).join("a"));
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.LongFileName);
        });

        it("Should not upload empty module", function() {
            editor.setValue("");
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyFn);
        });

        it("Should not upload with long module", function() {
            // 10485761 a
            if (window.isSystemMac) { // some machines cannot handle this test
                editor.setValue(new Array(10485762).join("a"));
                $fnName.val(uploadModule);
                $("#udf-fnUpload").click();

                UnitTest.hasStatusBoxWithError(ErrTStr.LargeFile);
            }
        });

        it("Should upload udf", function(done) {
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnName").trigger(fakeEvent.enter);

            var checkFunc = function() {
                var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
                return $udf.length > 0;
            };

            var numUDF = Number($udfManager.find(".numUDF").text());

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var curNum = Number($udfManager.find(".numUDF").text());
                expect(curNum).to.equal(numUDF + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should alert when dup upload", function() {
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();
            UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF);
        });

        it("Should update with new func", function(done) {
            var oldFunc = XcalarUpdatePython;
            var updated = false;
            XcalarUpdatePython = function() {
                updated = true;
                return PromiseHelper.resolve();
            };
            editor.setValue(func);
            $fnName.val(uploadModule);
            $("#udf-fnUpload").click();

            var checkFunc = function() {
                return updated === true;
            };

            UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF, {"confirm": true});
            UnitTest.testFinish(checkFunc)
            .then(function() {
                XcalarUpdatePython = oldFunc;
                done();
            });
        });

        it("should handle delet udf fails case", function(done) {
            var oldDelete = XcalarDeletePython;
            var test = false;
            XcalarDeletePython = function() {
                test = true;
                return PromiseHelper.reject({"error": "test"});
            };

            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            var checkFunc = function() {
                return test === true;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDeletePython = oldDelete;
            });
        });

        it("should handle delet udf fails case 2", function(done) {
            var oldDelete = XcalarDeletePython;
            var oldList = XcalarListXdfs;
            var test = false;
            XcalarDeletePython = function() {
                test = true;
                return PromiseHelper.reject({
                    "status": StatusT.StatusUdfModuleNotFound
                });
            };

            XcalarListXdfs = function() {
                return PromiseHelper.resolve({
                    "numXdfs": 1
                });
            };

            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            var checkFunc = function() {
                return test === true;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDeletePython = oldDelete;
                XcalarListXdfs = oldList;
            });
        });

        it("Should delete udf", function(done) {
            var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
            $udf.find(".delete").click();
            UnitTest.hasAlertWithTitle(UDFTStr.DelTitle, {
                "confirm": true
            });

            var checkFunc = function() {
                var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
                return $udf.length === 0;
            };

            var numUDF = Number($udfManager.find(".numUDF").text());

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var curNum = Number($udfManager.find(".numUDF").text());
                expect(curNum).to.equal(numUDF - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    // Temporarily disabled due to not allowing users to upload apps anymore
    // from XD
    // describe("App and UDF upload switcher test", function() {
    //     before(function() {
    //         editor = UDF.getEditor();
    //         $fnName = $("#udf-fnName");
    //     });

    //     it("Should switch to app uploader", function(done) {
    //         var func = "def test():\n" +
    //                "\treturn \"a\"";

    //         var uploadedApp = 0;

    //         var checkFunc = function() {
    //             return uploadedApp === 1;
    //         };

    //         var oldAppSetFunc = XcalarAppSet;

    //         XcalarAppSet = function() {
    //             uploadedApp = 1;
    //             return PromiseHelper.resolve();
    //         };
    //         $("#udf-uploadType .iconWrapper .icon").click();
    //         assert.isTrue($("#udf-uploadTypeMenu").is(":visible"));
    //         $("#udf-uploadTypeMenu").find(".xi-add-app").closest("li")
    //                                 .trigger(fakeEvent.mouseup);
    //         assert.isTrue($("#udf-fnName").attr("placeholder").toLowerCase()
    //                                       .indexOf("app") > -1);
    //         editor.setValue(func);
    //         $fnName.val(xcHelper.randName("baabaa", 5));

    //         $("#udf-fnUpload").click();

    //         UnitTest.testFinish(checkFunc)
    //         .then(done)
    //         .fail(function() {
    //             done("fail");
    //         })
    //         .always(function() {
    //             XcalarAppSet = oldAppSetFunc;
    //         });
    //     });

    //     it("Should switch to udf uploader", function(done) {
    //         var func = "def test():\n" +
    //                "\treturn \"a\"";

    //         var uploadedUdf = 0;

    //         var checkFunc = function() {
    //             return uploadedUdf === 1;
    //         };

    //         var oldUploadFunc = XcalarUploadPython;
    //         XcalarUploadPython = function() {
    //             uploadedUdf = 1;
    //             return PromiseHelper.resolve();
    //         };

    //         $("#udf-uploadType .iconWrapper .icon").click();
    //         assert.isTrue($("#udf-uploadTypeMenu").is(":visible"));
    //         $("#udf-uploadTypeMenu").find(".xi-add-udf2").closest("li")
    //                                 .trigger(fakeEvent.mouseup);
    //         assert.isTrue($("#udf-fnName").attr("placeholder").toLowerCase()
    //                                       .indexOf("module") > -1);

    //         editor.setValue(func);
    //         $fnName.val(xcHelper.randName("baabaa", 5));

    //         $("#udf-fnUpload").click();

    //         UnitTest.testFinish(checkFunc)
    //         .then(done)
    //         .fail(function() {
    //            done("fail");
    //         })
    //         .always(function() {
    //             XcalarUploadPython = oldUploadFunc;
    //         });
    //     });
    // });

    after(function(done) {
        $("#udfTab").click();
        UnitTest.offMinMode();
        // wait for menu bar to open
        setTimeout(function() {
            done();
        }, waitTime);
    });
});