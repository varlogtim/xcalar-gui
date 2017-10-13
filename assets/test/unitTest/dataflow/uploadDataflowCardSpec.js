describe("Upload Dataflow Test", function() {
    var $mainTabCache;
    var $card;
    var $retPath;
    var $dfName;

    before(function(done) {
        $card = $("#uploadDataflowCard");
        $retPath = $card.find("#retinaPath");
        $dfName = $card.find("#dfName");

        $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#dataflowTab").click();
        }
        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            done();
        })
        .fail( function(){
            done("fail");
        });
    });

    describe("Upload Dataflow Api Test", function() {
        it("should show the card", function() {
            UploadDataflowCard.show();
            assert.isTrue($card.is(":visible"));
        });

        it("should change the file path and check invalid case", function() {
            var retName = "test";
            retName = xcHelper.checkNamePattern("dataflow", "fix", retName);
            retName = xcHelper.uniqueName(retName, function(name) {
                return !DF.hasDataflow(name);
            });

            UploadDataflowCard.__testOnly__.changeFilePath("test.pdf");
            expect($retPath.val()).to.equal("test.pdf");
            expect($dfName.val()).to.equal(retName);
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.true;
            UnitTest.hasStatusBoxWithError(ErrTStr.RetinaFormat);
        });

        it("should change file path to valid case", function() {
            UploadDataflowCard.__testOnly__.changeFilePath("file.tar.gz");
            expect($retPath.val()).to.equal("file.tar.gz");
            expect($dfName.val()).to.equal("file");
            expect($card.find(".confirm").hasClass("btn-disabled"))
            .to.be.false;
        });

        it("should toggle checkbox", function() {
            var $checkbox = $card.find(".overwriteUdf .checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $checkbox.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // uncheck
            $card.find(".overwriteUdf span").click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("fakeBrowse btn should trigger real btn", function() {
            var clicked = false;
            $("#dataflow-browse").attr("type", "");
            $("#dataflow-browse").on("click.unitTest", function() {
                clicked = true;
            });
            $("#dataflow-fakeBrowse").click();
            expect(clicked).to.be.true;
            clicked = false;
            $("#retinaPath").mousedown();
            expect(clicked).to.be.true;
            $("#dataflow-browse").attr("type", "file");
        });

        it("should close the card", function() {
            $card.find(".close").click();
            assert.isFalse($card.is(":visible"));
        });
    });

    describe("Upload Dataflow Submit Test", function() {
        var oldReader;
        var oldImport;
        var oldList;
        var oldAddDF;
        var isAddDF = false;
        var oldShowSuccess = xcHelper.showSuccess;
        var successMsg = null;

        before(function() {
            var FakeFileReader = function() {
                return this;
            };
            //Fake version of the method we depend upon
            FakeFileReader.prototype.readAsBinaryString = function(file){
                var e = {"target": {"result": "test"}};
                this.onload(e);
                return file;
            };
            FakeFileReader.prototype.onload = null;

            oldReader = FileReader;
            FileReader = FakeFileReader;

            oldImport = XcalarImportRetina;
            oldList = XcalarListRetinas;
            oldAddDF = DF.addDataflow;
            oldShowSuccess = xcHelper.showSuccess;

            XcalarListRetinas = function() {
                return PromiseHelper.resolve({"retinaDescs": []});
            };

            DF.addDataflow = function() {
                isAddDF = true;
            };

            xcHelper.showSuccess = function(input) {
                successMsg = input;
            };

            UploadDataflowCard.show();
            UploadDataflowCard.__testOnly__.changeFilePath("file.tar.gz");
        });

        it("should handle empty name error", function(done) {
            $("#dfName").val("");

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
                done();
            });
        });

        it("should handle name error", function(done) {
            $("#dfName").val("invalid#name");

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.DFNameIllegal);
                done();
            });
        });

        it("should handle name duplicate error", function(done) {
            $("#dfName").val("file");

            var curList = XcalarListRetinas;
            XcalarListRetinas = function() {
                return PromiseHelper.resolve({"retinaDescs": [{
                    "retinaName": "file"
                }]});
            };

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.NameInUse);
                done();
            })
            .always(function() {
                XcalarListRetinas = curList;
            });
        });

        it("should handle error case", function(done) {
            $("#dfName").val("file");

            XcalarImportRetina = function() {
                return PromiseHelper.reject("test");
            };

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect(isAddDF).to.be.false;
                expect(successMsg).to.be.null;
                UnitTest.hasStatusBoxWithError(ErrTStr.RetinaFailed);
                done();
            });
        });

        it("should handle large file size error", function(done) {
            UploadDataflowCard.__testOnly__.changeFilePath("file.tar.gz");
            UploadDataflowCard.__testOnly__.setFile({size: 2 * MB});
            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(DSTStr.UploadLimit);

                UploadDataflowCard.__testOnly__.changeFilePath("file.tar.gz");
                UploadDataflowCard.__testOnly__.setFile({size: 1 * KB});
                done();
            });
        });

        it("should upload the df", function(done) {
            $("#dfName").val("file");

            XcalarImportRetina = function() {
                return PromiseHelper.resolve();
            };

            var oldUDFRefresh = UDF.refreshWithoutClearing;
            var oldSocket = XcSocket.sendMessage;
            var oldGetDF = DF.getDataflow;
            UDF.refreshWithoutClearing = function() {};
            XcSocket.sendMessage = function() {};
            DF.getDataflow = function() {
                return {
                    "updateParamMapInUsed": function() {
                        return PromiseHelper.resolve();
                    }
                };
            };

            UploadDataflowCard.__testOnly__.submitForm()
            .then(function() {
                expect(isAddDF).to.be.true;
                expect(successMsg).to.equal(SuccessTStr.Upload);
                assert.isFalse($card.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                UDF.refreshWithoutClearing = oldUDFRefresh;
                XcSocket.sendMessage = oldSocket;
                DF.getDataflow = oldGetDF;
            });
        });

        after(function() {
            FileReader = oldReader;
            XcalarImportRetina = oldImport;
            XcalarListRetinas = oldList;
            DF.addDataflow = oldAddDF;
            xcHelper.showSuccess = oldShowSuccess;
        });
    });

    after(function() {
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $mainTabCache.click();
        }
    });
});