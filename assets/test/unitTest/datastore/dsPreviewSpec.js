describe("Dataset-DSPreview Test", function() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var $previewCard;
    var $previewTable;
    var $form;
    var $formatText;

    var $fieldText;
    var $lineText;

    var $udfModuleList;
    var $udfFuncList;

    var $headerCheckBox; // promote header checkbox

    var $skipInput;
    var $quoteInput;

    var $statusBox;

    var loadArgs;

    var $mainTabCache;

    before(function() {
        $previewCard = $("#dsForm-preview");
        $previewTable = $("#previewTable");
        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox

        $skipInput = $("#dsForm-skipRows");
        $quoteInput = $("#dsForm-quote");

        $statusBox = $("#statusBox");
        loadArgs = DSPreview.__testOnly__.get().loadArgs;

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();
    });

    describe("Basic Preview Function Test", function() {
        it("parseTdHelper should work", function() {
            var parseTdHelper = DSPreview.__testOnly__.parseTdHelper;
            var testCases = [{
                // test1: when not th, has delimiter
                "delimiter": ",",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h' +
                                '</div>' +
                            '</td>' +
                            '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'i' +
                                '</div>' +
                            '</td>'
            },{
                // test2: when not th, no delimiter
                "delimiter": "",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    '<span class="td">h</span>' +
                                    '<span class="td has-margin has-comma">' +
                                        ',' +
                                    '</span>' +
                                    '<span class="td">i</span>' +
                                '</div>' +
                             '</td>'
            },{
                // test3: when not th, other delimiter
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h,i' +
                                '</div>' +
                            '</td>'
            },{
                // test4: when is th, has delimiter
                "delimiter": ",",
                "isTh": true,
                "data": ["h", ",", "i"],
                "expectRes": '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">h</div>' +
                                '</div>' +
                            '</th>' +
                            '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">i</div>' +
                                '</div>' +
                            '</th>'
            },{
                // test5: when not th, delimiter ",", data has backslash
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", "\\", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h\\,i' +
                                '</div>' +
                            '</td>'
            }];

            testCases.forEach(function(testCase) {
                var td = parseTdHelper(testCase.data, testCase.delimiter,
                                        testCase.isTh);
                expect(td).to.equal(testCase.expectRes);
            });
        });

        it("getTbodyHTML() shoud work", function() {
            var getTbodyHTML = DSPreview.__testOnly__.getTbodyHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["t", "e", "s", "t"]],
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">' +
                                        '1' +
                                    '</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">t</span>' +
                                            '<span class="td">e</span>' +
                                            '<span class="td">s</span>' +
                                            '<span class="td">t</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            },{
                // test2: when has header
                "datas": [["t", "e", "s", "t"], ["h", "i"]],
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">1</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">h</span>' +
                                            '<span class="td">i</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);
                var tbody = getTbodyHTML(testCase.datas, delimiter);
                expect(tbody).to.equal(testCase.expectRes);
            });

            DSPreview.__testOnly__.set();
        });

        it("getTheadHTML should work", function() {
            var getTheadHTML = DSPreview.__testOnly__.getTheadHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="colGrab" data-sizedtoheader="false"></div>' +
                                            '<div class="text">column0</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            },{
                // test2: when has header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="text cell">' +
                                                '<span class="td">h</span>' +
                                                '<span class="td">i</span>' +
                                            '</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);

                var tHead = getTheadHTML(testCase.datas, delimiter, testCase.tdLen);
                expect(tHead).to.equal(testCase.expectRes);
            });

            DSPreview.__testOnly__.set();
        });

        it("highlightHelper() should work", function() {
            var $cell = $('<div class="text cell">'+
                            '<span class="td">h</span>' +
                            '<span class="td">,</span>' +
                            '<span class="td">i</span>' +
                        '</div>');
            DSPreview.__testOnly__.highlightHelper($cell, ",");

            expect($cell.html()).to.equal('<span class="td">h</span>' +
                                '<span class="td highlight">,</span>' +
                                '<span class="td">i</span>');
        });

        it("getPreviewName() should work", function() {
            var getPreviewTableName = DSPreview.__testOnly__.getPreviewTableName;
            var res = getPreviewTableName("test");
            expect(res.indexOf("test-") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;

            res = getPreviewTableName();
            expect(res.indexOf("previewTable") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;
        });

        it("toggleHeader() should workh", function() {
            var data = "line1\nline2";
            var $checkbox = $headerCheckBox.find(".checkbox");
            var toggleHeader = DSPreview.__testOnly__.toggleHeader;

            loadArgs.reset();
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 2 rows
            expect($previewTable.find("tbody tr").length).to.equal(2);

            // toggle to have header
            toggleHeader(true, true);
            expect($checkbox.hasClass("checked")).to.be.true;
            expect(loadArgs.useHeader()).to.be.true;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // toggle to remove header
            toggleHeader(false, true);
            expect($checkbox.hasClass("checked")).to.be.false;
            expect(loadArgs.useHeader()).to.be.false;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(2);
        });

        it("getDataFromLoadUDF() should fail", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve("test");
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal(DSTStr.NoParse);
                done();
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getDataFromLoadUDF() should work", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 0
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
            });
        });

        it("getDataFromLoadUDF() should work 2", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve(['{"column10":"Opportunity Source"}']);
            };

            DSPreview.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.equal('[{"column10":"Opportunity Source"}]');
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getURLToPreview should work", function(done) {
            var meta = DSPreview.__testOnly__.get();
            meta.loadArgs.set({
                targetName: gDefaultSharedRoot,
                files: [{
                    path: "/url",
                }]
            });
            DSPreview.__testOnly__.set(null, null);
            var oldList = XcalarListFiles;
            XcalarListFiles = function() {
                return PromiseHelper.resolve({
                    numFiles: 1,
                    files: [{
                        name: "test",
                        attr: {
                            isDirectory: false
                        }
                    }]
                });
            };

            DSPreview.__testOnly__.getURLToPreview()
            .then(function(index, path) {
                expect(index).to.equal(0);
                expect(path).to.equal("/url/test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListFiles = oldList;
                DSPreview.__testOnly__.set(null, null);
            });
        });

        it("tooManyColAlertHelper should handle valid case", function(done) {
            DSPreview.__testOnly__.tooManyColAlertHelper(0)
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("tooManyColAlertHelper should handle invalid case", function(done) {
            var def = DSPreview.__testOnly__.tooManyColAlertHelper(gMaxColToPull);
            UnitTest.hasAlertWithTitle(DSFormTStr.CreateWarn);

            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("invalidHeaderDetection should handle no header case", function(done) {
            DSPreview.__testOnly__.invalidHeaderDetection(null)
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("invalidHeaderDetection should handle valid case 2", function(done) {
            var def = DSPreview.__testOnly__.invalidHeaderDetection(["abc"]);
            UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol, {
                confirm: true
            });
            def
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("invalidHeaderDetection should handle invalid case 3", function(done) {
            var def = DSPreview.__testOnly__.invalidHeaderDetection(["a.b"]);
            UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol);
            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            });
        });

        it("changePreviewFile should work", function() {
            var oldPreviewSource = loadArgs.getPreviewingSource();
            loadArgs.setPreviewingSource(0, "test");
            DSPreview.__testOnly__.changePreviewFile(0, "test2");
            expect(loadArgs.getPreviewFile()).to.equal("test2");
            if (oldPreviewSource != null) {
                loadArgs.setPreviewingSource(oldPreviewSource.index, oldPreviewSource.file);
            }
        });

        it("getTerminationOptions should work", function() {
            var getTerminationOptions = DSPreview.__testOnly__.getTerminationOptions;
            var $btns = $form.find(".advanceSection .termOptions .radioButton");
            var tests = [{
                option: "stop",
                allowRecordErrors: false,
                allowFileErrors: false
            }, {
                option: "continue",
                allowRecordErrors: true,
                allowFileErrors: true
            }, {
                option: "stoprecord",
                allowRecordErrors: false,
                allowFileErrors: true
            }];

            tests.forEach(function(test) {
                var option = test.option;
                $btns.removeClass("active");
                $btns.filter(function() {
                    return $(this).data("option") === option;
                }).addClass("active");

                var res = getTerminationOptions();
                expect(res).to.be.an("object");
                expect(res.allowRecordErrors).to.equal(test.allowRecordErrors);
                expect(res.allowFileErrors).to.equal(test.allowFileErrors);
            });
        });
    });

    describe("Preview Public API Test", function() {
        it("DSPreview.clear shoule resolve if view is hidden", function(done) {
            var isHidden = $previewCard.hasClass("xc-hidden");
            $previewCard.addClass("xc-hidden");

            DSPreview.clear()
            .then(function(res) {
                expect(res).to.equal(null);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                if (!isHidden) {
                    $previewCard.removeClass("xc-hidden");
                }
            });
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Suggest Test", function() {
        before(function() {
            loadArgs.reset();
        });

        it("Should detect correct format", function() {
            var detectFormat = DSPreview.__testOnly__.detectFormat;
            loadArgs.setPreviewingSource(0, "test.xlsx");
            expect(detectFormat()).to.equal("Excel");
            loadArgs.setPreviewingSource(0, "test");
            var data = "[{\"test\"}";
            expect(detectFormat(data, "\n")).to.equal("JSON");

            data = "{\"test\": \"val\"}";
            expect(detectFormat(data, "\n")).to.equal("JSON");

            data = "abc";
            expect(detectFormat(data, "\n")).to.equal("CSV");
        });

        it("Should detect correct header", function() {
            var detectHeader = DSPreview.__testOnly__.detectHeader;

            // when nothing to delimit
            var linDelim = "\n";
            var fieldDelim = "";
            var data = "";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            // when is not header
            data = "Col0\nCol1";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            data = "\t\t\n\tCol1";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            data = "1\t2\nCol1\tCol2";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            // has header
            data = "ThisisHeader1\tThisisHeader2\n" +
                    "1\t2\n" +
                    "3\t4";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.true;
        });

        it("Should detect excel header", function() {
            var detectExcelHeader = DSPreview.__testOnly__.detectExcelHeader;

            // has header case
            var obj = [{"col0": "test"}, {"col0": 1}, {"col0": 2}];
            var data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.true;

            // no header case
            obj = [{"col0": 0}, {"col0": 1}, {"col0": 2}];
            data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.false;

            // error case
            data = "invalid json data";
            expect(detectExcelHeader(data)).to.be.false;
        });
    });

    describe("Get Preview Table Test", function() {
        before(function() {
            $previewTable.html("");
            loadArgs.reset();
        });

        it ("Should get a table from raw data", function() {
            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");

            var data = "h,i\nte,st";
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();

            // has 2 rows and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.false;

            loadArgs.setFieldDelim(",");
            DSPreview.__testOnly__.getPreviewTable();
            // has 2 rows and 3 columns
            expect($previewTable.find("th").length).to.equal(3);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.true;

            // error json
            loadArgs.setFormat("JSON");
            DSPreview.__testOnly__.getPreviewTable();
            var res = $("#dsPreviewWrap").find(".errorSection .topSection .content").text();
            expect(res).to.equal("Your file cannot be parsed as JSON. We recommend you use the CSV format instead.");

            // valid json
            data = '{"a": "b"}';
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // valid json2
            data = '{"a": "{b"}';
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);
        });

        it("Should highlight delimiter", function() {
            var data = "h,i";
            var $highLightBtn = $("#dsForm-highlighter .highlight");
            var $rmHightLightBtn = $("#dsForm-highlighter .rmHightLight");

            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();

            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
            // can highlight
            DSPreview.__testOnly__.applyHighlight(",");
            expect(DSPreview.__testOnly__.get().highlighter).to.equal(",");
            expect($previewTable.find(".highlight").length).to.equal(1);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.false;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.false;

            // can remove highlight
            DSPreview.__testOnly__.applyHighlight("");
            expect(DSPreview.__testOnly__.get().highlighter).to.equal("");
            expect($previewTable.find(".highlight").length).to.equal(0);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
        });

        it("Should clear preview table", function(done) {
            var data = "h,i";
            DSPreview.__testOnly__.set(data);
            DSPreview.__testOnly__.getPreviewTable();
            var tName = DSPreview.__testOnly__.get().tableName;
            DSPreview.__testOnly__.clearPreviewTable(tName)
            .then(function(hasDestroyTable) {
                expect(hasDestroyTable).to.be.false;
                var res = DSPreview.__testOnly__.get();
                expect(res.highlighter).to.equal("");
                expect($previewTable.html()).to.equal("");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            DSPreview.__testOnly__.set("");
            $previewTable.empty();
        });
    });

    describe("Preview with UDF Function Test", function() {
        var oldLoad;
        var oldMakeResultSet;
        var oldFetch;
        var oldSetFree;

        before(function() {
            oldLoad = XcalarLoad;
            oldMakeResultSet = XcalarMakeResultSetFromDataset;
            oldSetFree = XcalarSetFree;
            oldFetch = XcalarFetchData;
        });

        it("should loadDataWithUDF handle error case", function(done) {
            XcalarLoad = function() {
                return PromiseHelper.reject("test");
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        it("should loadDataWithUDF handle parse error", function(done) {
            loadArgs.set({"path": "test"});
            XcalarLoad = function() {
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve(["test"]);
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds",{
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal(DSTStr.NoParse);
                done();
            });
        });

        it("should loadDataWithUDF", function(done) {
            loadArgs.set({"path": "test"});

            XcalarLoad = function() {
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            DSPreview.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function(buffer) {
                expect(buffer).not.to.be.null;
                expect(buffer).contains("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should fetch more rows with UDF load", function(done) {
            var test = false;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 40
                });
            };

            XcalarFetchData = function() {
                test = true;
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should clear the table", function(done) {
            var oldDestory = XcalarDestroyDataset;
            XcalarDestroyDataset = function() {
                return PromiseHelper.resolve();
            };
            var tName = DSPreview.__testOnly__.get().tableName;
            DSPreview.__testOnly__.clearPreviewTable(tName)
            .then(function(hasDestroyTable) {
                expect(hasDestroyTable).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDestroyDataset = oldDestory;
            });
        });

        after(function() {
            XcalarLoad = oldLoad;
            XcalarSetFree = oldSetFree;
            XcalarMakeResultSetFromDataset = oldMakeResultSet;
            XcalarFetchData = oldFetch;
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Basic form functionality test", function() {
        it("Should reset form", function() {
            $("#dsForm-skipRows").val(1);
            loadArgs.setFieldDelim("test..");
            DSPreview.__testOnly__.resetForm();

            expect($("#dsForm-skipRows").val()).to.equal("0");
            expect(loadArgs.getFieldDelim()).to.equal("");
        });

        it("getNameFromPath should work", function() {
            var getNameFromPath = DSPreview.__testOnly__.getNameFromPath;

            var testName = xcHelper.randName("testName");
            var oldhas = DS.has;

            // basic
            var res = getNameFromPath(testName);
            expect(res).to.equal(testName);

            var test2 = testName + ".test";
            res = getNameFromPath(test2);
            expect(res).to.equal(testName);

            var test3 = "/var/yelpUnittest/";
            res = getNameFromPath(test3);
            expect(res).to.equal("yelpUnittest");

            var test4 = "/var/gdeltUnittest.csv";
            res = getNameFromPath(test4);
            expect(res).to.equal("gdeltUnittest");

            var test5 = "/var/123";
            res = getNameFromPath(test5);
            expect(res).to.equal("var123");

            var test6 = "/123";
            res = getNameFromPath(test6);
            expect(res).to.equal("ds123");

            DS.has = function(name) {
                if (name === testName) {
                    return true;
                } else {
                    return false;
                }
            };

            res = getNameFromPath(testName);
            expect(res).to.equal(testName + "1");
            DS.has = oldhas;
        });

        it("getSkipRows() should work", function() {
            var $input = $("#dsForm-skipRows");
            var getSkipRows = DSPreview.__testOnly__.getSkipRows;
            // test1
            $input.val("2");
            expect(getSkipRows()).to.equal(2);

            // test2
            $input.val("");
            expect(getSkipRows()).to.equal(0);

            // test3
            $input.val("abc");
            expect(getSkipRows()).to.equal(0);

            // test4
            $input.val("-1");
            expect(getSkipRows()).to.equal(0);

            $input.val("");
        });

        it("applyQuote() should work", function() {
            var applyQuote = DSPreview.__testOnly__.applyQuote;
            var $quote = $("#dsForm-quote");

            applyQuote("\'");
            expect($quote.val()).to.equal("\'");
            expect(loadArgs.getQuote()).to.equal("\'");

            // error case
            applyQuote("test");
            expect(loadArgs.getQuote()).not.to.equal("test");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Delimiter Selection Test", function() {
        before(function() {
            DSPreview.__testOnly__.toggleFormat("CSV");
        });

        it("applyFieldDelim() should work", function() {
            var applyFieldDelim = DSPreview.__testOnly__.applyFieldDelim;

            // test1
            applyFieldDelim("");
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            //test 2
            applyFieldDelim(",");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            //test 3
            applyFieldDelim("\t");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("applyLineDelim() should work", function() {
            var applyLineDelim = DSPreview.__testOnly__.applyLineDelim;

            // test1
            applyLineDelim("");
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            //test 2
            applyLineDelim("\n");
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select line delim", function() {
            var $ele = $("#lineDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            // test2
            $ele.find('li[name="CRLF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r\\n");
            expect(loadArgs.getLineDelim()).to.equal("\r\n");

            // test3
            $ele.find('li[name="CR"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r");
            expect(loadArgs.getLineDelim()).to.equal("\r");

            // test4
            $ele.find('li[name="LF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select field delim", function() {
            var $ele = $("#fieldDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            // test2
            $ele.find('li[name="comma"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            // test 3
            $ele.find('li[name="tab"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("should input line delim", function() {
            $lineText.val(",").trigger("input");
            expect(loadArgs.getLineDelim()).to.equal(",");
        });

        it("should input field delim", function() {
            $fieldText.val(",").trigger("input");
            expect(loadArgs.getFieldDelim()).to.equal(",");
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Format Change Test", function() {
        before(function() {
            $previewCard.removeClass("xc-hidden")
                        .siblings().addClass("xc-hidden");
        });

        beforeEach(function() {
            DSPreview.__testOnly__.resetForm();
        });

        it("Format Should be CSV", function() {
            DSPreview.__testOnly__.toggleFormat("CSV");
            expect($formatText.data("format")).to.equal("CSV");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isTrue($fieldText.is(":visible"), "has field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
            assert.isTrue($quoteInput.is(":visible"), "has quote char");
            assert.isTrue($skipInput.is(":visible"), "has skip rows");
        });

        it("Format Should be JSON", function() {
            DSPreview.__testOnly__.toggleFormat("JSON");
            expect($formatText.data("format")).to.equal("JSON");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
        });

        it("Format Should be Text", function() {
            DSPreview.__testOnly__.toggleFormat("Text");
            expect($formatText.data("format")).to.equal("TEXT");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isTrue($lineText.is(":visible"), "has line delimiter");
            assert.isTrue($quoteInput.is(":visible"), "has quote char");
            assert.isTrue($skipInput.is(":visible"), "has skip rows");
        });

        it("Format Should be Excel", function() {
            DSPreview.__testOnly__.toggleFormat("Excel");
            expect($formatText.data("format")).to.equal("EXCEL");

            // UI part
            assert.isTrue($headerCheckBox.is(":visible"), "has header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isTrue($skipInput.is(":visible"), "no skip rows");
            assert.isFalse($udfModuleList.is(":visible"), "no udf module");
            assert.isFalse($udfFuncList.is(":visible"), "no udf func");
            assert.isFalse($form.find(".matchedXPath").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".elementXPath").is(":visible"), "no xml paths");
        });

        it("Format Should be UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($formatText.data("format")).to.equal("UDF");

            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
            assert.isTrue($udfModuleList.is(":visible"), "no udf module");
            assert.isTrue($udfFuncList.is(":visible"), "no udf func");
            assert.isFalse($("#dsForm-xPaths").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".matchedXPath").is(":visible"), "no xml paths");
            assert.isFalse($form.find(".elementXPath").is(":visible"), "no xml paths");
        });

        it("Format Should be XML", function() {
            DSPreview.__testOnly__.toggleFormat("XML");
            expect($formatText.data("format")).to.equal("XML");
            // UI part
            assert.isFalse($headerCheckBox.is(":visible"), "no header checkbox");
            assert.isFalse($fieldText.is(":visible"), "no field delimiter");
            assert.isFalse($lineText.is(":visible"), "no line delimiter");
            assert.isFalse($quoteInput.is(":visible"), "no quote char");
            assert.isFalse($skipInput.is(":visible"), "no skip rows");
            assert.isFalse($udfModuleList.is(":visible"), "no udf module");
            assert.isFalse($udfFuncList.is(":visible"), "no udf func");
            assert.isTrue($("#dsForm-xPaths").is(":visible"), "has xml paths");
            assert.isTrue($form.find(".matchedXPath").is(":visible"), "has xml paths");
            assert.isTrue($form.find(".elementXPath").is(":visible"), "has xml paths");
        });

        it("Format should be PARQUET", function() {
            var loadArgs = DSPreview.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() { return PromiseHelper.reject("test") };
            $previewCard.removeClass("format-parquet");
            DSPreview.__testOnly__.toggleFormat("PARQUET");
            expect($previewCard.hasClass("format-parquet")).to.be.treu;
            UnitTest.hasAlertWithTitle("Error Parsing Parquet Dataset");
            loadArgs.reset();
            XcalarAppExecute = oldFunc;
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
            DSForm.show({"noReset": true});
        });
    });

    describe("UDF Func Test", function() {
        var isUseUDFWithFunc;

        before(function() {
            $previewCard.removeClass("xc-hidden")
                        .siblings().addClass("xc-hidden");
            isUseUDFWithFunc = DSPreview.__testOnly__.isUseUDFWithFunc;
        });

        it("Should toggle UDF format", function() {
            var isUseUDF = DSPreview.__testOnly__.isUseUDF;
            // test 1
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.false;
            expect(isUseUDF()).to.be.true;
            expect(isUseUDFWithFunc()).to.be.false;

            // test 2
            DSPreview.__testOnly__.toggleFormat("CSV");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.true;
            expect(isUseUDF()).to.be.false;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should have default UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;

            // module default:openExcel should exists
            expect($udfModuleList.find("li:contains(default)")).not.to.be.empty;
            expect($udfFuncList.find("li:contains(openExcel)")).not.to.be.empty;
        });

        it("Should select a UDF module", function() {
            DSPreview.__testOnly__.selectUDFModule(null);
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSPreview.__testOnly__.selectUDFModule("default");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should select a UDF func", function() {
            DSPreview.__testOnly__.selectUDFFunc(null);
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSPreview.__testOnly__.selectUDFFunc("openExcel");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");
            expect(isUseUDFWithFunc()).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFModule = DSPreview.__testOnly__.validateUDFModule;
            expect(validateUDFModule("invalidModule")).to.be.false;
            expect(validateUDFModule("default")).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFFunc = DSPreview.__testOnly__.validateUDFFunc;
            expect(validateUDFFunc("default", "invalidFunc")).to.be.false;
            expect(validateUDFFunc("default", "openExcel")).to.be.true;
        });

        it("Should reset UDF", function() {
            DSPreview.__testOnly__.resetUdfSection();
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Validate Form Test", function() {
        var validateForm;
        var loadArgs;

        before(function() {
            validateForm = DSPreview.__testOnly__.validateForm;

            loadArgs = DSPreview.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
        });

        it("should validate ds names", function() {
            loadArgs.setFormat("CSV");

            // test1
            var $dsName = $form.find(".dsName").eq(0);
            $dsName.val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // test2
            var name = new Array(350).join("a");
            $dsName.val(name);
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.TooLong);

            // test3
            $dsName.val("1test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.DSStartsWithLetter);

            // test4
            var oldhas = DS.has;
            DS.has = function() {return true; };
            $dsName.val("test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.DSNameConfilct);
            DS.has = oldhas;

            // test5
            $dsName.val("test*test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoSpecialCharOrSpace);

            // test6
            $dsName.val("test_test");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.dsNames[0]).to.equal("test_test");

            // test7
            $dsName.val("test-test");
            res = validateForm();
            expect(res).to.be.an("object");
            expect(res.dsNames[0]).to.equal("test-test");

            // restore
            $dsName.val(xcHelper.randName("test"));
        });

        it("should validate format", function() {
            loadArgs.setFormat(null);
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            loadArgs.setFormat("CSV");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.be.equal("CSV");
        });

        it("should validate UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            $udfModuleList.find("input").val("");
            $udfModuleList.find("input").data("module", "");

            // empty module test
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // empty func test
            $udfModuleList.find("input").val("default").data("module", "workbook/udf/default");
            $udfFuncList.find("input").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // valid test
            $udfFuncList.find("input").val("openExcel");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("UDF");
            expect(res.udfModule).to.equal("workbook/udf/default");
            expect(res.udfFunc).to.equal("openExcel");

            // remove UDF checkbox
            $udfModuleList.find("input").val("").data("module", "");
            $udfFuncList.find("input").val("");
            DSPreview.__testOnly__.toggleFormat("CSV");
        });

        it("should validate delimiter", function() {
            // invalid field delimiter
            $fieldText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);
            $fieldText.val(",");

            // invalid line delimiter
            $lineText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);

            // invalid line delimiter
            $lineText.val("ab");
            loadArgs.setLineDelim("ab");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidLineDelim);

            $lineText.val("\r\n");
            loadArgs.setLineDelim("\r\n");

            // invalid quote
            $quoteInput.val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidQuote);

            // valid case
            $quoteInput.val("\"");
            expect(validateForm()).not.to.be.null;
        });

        it("should validate special JSON case", function() {
            var detectArgs = DSPreview.__testOnly__.get().detectArgs;
            detectArgs.isSpecialJSON = true;
            loadArgs.set({format: "JSON"});
            $udfModuleList.find("input").val("");

            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("JSON");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("convertNewLineJsonToArrayJson");

            // clear up
            detectArgs.isSpecialJSON = false;
        });

        it("should validate Excel case", function() {
            loadArgs.set({format: "Excel"});

            // test1
            $("#dsForm-skipRows").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test2
            $("#dsForm-skipRows").val("-1");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoNegativeNumber);

            //test3
            $("#dsForm-skipRows").val("0");
            $("#dsForm-excelIndex").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test4
            $("#dsForm-excelIndex").val("-1");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoNegativeNumber);

            //test5
            $("#dsForm-excelIndex").val("1");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("Excel");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("openExcel");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.skipRows).to.equal(0);
            expect(res.udfQuery.sheetIndex).to.equal(1);
            expect(res.udfQuery.withHeader).to.equal(loadArgs.useHeader());
            // restore
            $("#dsForm-excelIndex").val("0");
        });

        it("should validte XML case", function() {
            loadArgs.set({format: "XML"});

            $("#dsForm-xPaths").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            $("#dsForm-xPaths").val("test");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("XML");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("xmlToJson");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.xPath).to.equal("test");
            expect(res.udfQuery).to.have.property("matchedPath");
            expect(res.udfQuery).to.have.property("withPath");
            // restore
            $("#dsForm-xPaths").val("");
        });

        it("should validte PARQUET case", function() {
            var $parquetSection = $form.find(".parquetSection");
            var $selectedColList = $parquetSection.find(".selectedColSection .colList");
            var $partiontoinList = $parquetSection.find(".partitionList");
            loadArgs.set({format: "PARQUET"});

            // test1
            $selectedColList.html('<li class="mustSelect"></li>');
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.ParquetMustSelectNonPartitionCol);

            // test2
            $selectedColList.html('<li><div class="colName">test1</div></li>');
            $partiontoinList.html('<input value="">');
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // test3
            $partiontoinList.html('<input value="test1">');
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUET");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("parseParquet");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.columns).to.be.an("array");
            expect(res.udfQuery.columns.length).to.equal(1);
            expect(res.udfQuery.columns[0]).to.equal("test1");

            // restore
            $selectedColList.empty();
            $partiontoinList.empty();
        });

        it("should validte PARQUETFILE case", function() {
            loadArgs.set({format: "PARQUETFILE"});
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUETFILE");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("parseParquet");
        });

        it("should validate invalid col name in advanced section", function(done) {
            var $advanceSection = $form.find(".advanceSection");
            var $fileName = $advanceSection.find(".fileName");
            var oldFunc = xcHelper.validateColName;

            $fileName.find(".checkbox").addClass("checked");
            xcHelper.validateColName = function() {
                return "test error";
            };

            var res = validateForm();

            UnitTest.testFinish(function() {
                // it has dealy
                return $("#statusBox").is(":visible");
            })
            .then(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.InvalidColName);
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $fileName.find(".checkbox").removeClass("checked");
                xcHelper.validateColName = oldFunc;
            });
        });

        it("should validate invalid col name in advanced section", function(done) {
            var $advanceSection = $form.find(".advanceSection");
            var $rowNum = $advanceSection.find(".rowNumber");
            var oldFunc = xcHelper.validateColName;

            $rowNum.find(".checkbox").addClass("checked");
            $rowNum.find("input").val("test");
            $("#previewTable").html('<input class="editableHead" value="test">');

            var res = validateForm();

            UnitTest.testFinish(function() {
                // it has dealy
                return $("#statusBox").is(":visible");
            })
            .then(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.ColumnConflict);
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $("#previewTable").empty();
                $rowNum.find(".checkbox").removeClass("checked");
                xcHelper.validateColName = oldFunc;
            });
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Validate Preview Test", function() {
        var validatePreview;
        var loadArgs;

        before(function() {
            validatePreview = DSPreview.__testOnly__.validatePreview;
            loadArgs = DSPreview.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
        });

        it("should validate format", function() {
            loadArgs.setFormat(null);
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            loadArgs.setFormat("CSV");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.be.equal("CSV");
        });

        it("should validate UDF", function() {
            DSPreview.__testOnly__.toggleFormat("UDF");
            $udfModuleList.find("input").val("").data("module", "");

            // empty module test
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // empty func test
            $udfModuleList.find("input").val("default").data("module","workbook/udf/default");
            $udfFuncList.find("input").val("openExcel");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("UDF");
            expect(res.udfModule).to.equal("workbook/udf/default");
            expect(res.udfFunc).to.equal("openExcel");

            // remove UDF checkbox
            $udfModuleList.find("input").val("");
            $udfFuncList.find("input").val("");
            DSPreview.__testOnly__.toggleFormat("CSV");
        });

        it("should validate Excel case", function() {
            loadArgs.set({format: "Excel"});

            // test1
            $("#dsForm-skipRows").val("");
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test2
            $("#dsForm-skipRows").val("0");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("Excel");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("openExcel");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.skipRows).to.equal(0);
        });

        it("should validte PARQUETFILE case", function() {
            loadArgs.set({format: "PARQUETFILE"});
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUETFILE");
            expect(res.udfModule).to.equal("default");
            expect(res.udfFunc).to.equal("parseParquet");
        });
    });

    describe("Restore Form Test", function() {
        var resetForm;
        var loadArgs;

        before(function() {
            DSPreview.__testOnly__.resetForm();
            resetForm = DSPreview.__testOnly__.restoreForm;
            loadArgs = DSPreview.__testOnly__.get().loadArgs;
        });

        it("should restore form with UDF format", function() {
            resetForm({
                dsName: "test",
                moduleName: "default",
                funcName: "openExcel",
                format: "UDF",
                hasHeader: true,
                fieldDelim: "",
                lineDelim: "\n",
                quoteChar: "\"",
                skipRows: 1
            });

            expect($form.find(".dsName").eq(0).val()).to.equal("test");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");

            expect($formatText.data("format")).to.equal("UDF");
            expect($headerCheckBox.find(".checkbox").hasClass("checked"))
            .to.be.true;

            expect($lineText.val()).to.equal("\\n");
            expect($fieldText.val()).to.equal("Null");
            expect($("#dsForm-skipRows").val()).to.equal("1");
        });

        it("should restore special json", function() {
            resetForm({
                dsName: "test",
                moduleName: "default",
                funcName: "convertNewLineJsonToArrayJson",
                format: "JSON"
            });

            var detectArgs = DSPreview.__testOnly__.get().detectArgs;
            expect(detectArgs.isSpecialJSON).to.be.true;
            expect(loadArgs.getFormat()).to.equal("JSON");
        });

        it("should restore excel", function() {
            resetForm({
                dsName: "test",
                moduleName: "default",
                funcName: "openExcel",
                format: "Excel",
                udfQuery: {
                    sheetIndex: 1,
                    skipRows: 1
                }
            });

            expect(loadArgs.getFormat()).to.equal("Excel");
            expect($("#dsForm-excelIndex").val()).to.equal("1");
            expect($("#dsForm-skipRows").val()).to.equal("1");

            // restore
            $("#dsForm-excelIndex").val("");
            $("#dsForm-skipRows").val("");
        });

        it("should restore XML", function() {
            resetForm({
                dsName: "test",
                format: "XML",
                udfQuery: {
                    xPath: "test"
                }
            });

            expect(loadArgs.getFormat()).to.equal("XML");
            expect($("#dsForm-xPaths").val()).to.equal("test");

            // restore
            $("#dsForm-xPaths").val("");
        });

        it("should restore PARQUET", function() {
            var oldFunc = XcalarAppExecute;
            window.a = true
            XcalarAppExecute = function() { return PromiseHelper.reject("test") };
            resetForm({
                dsName: "test",
                format: "PARQUET",
                files: [{path: "test?abc"}],
            });

            expect(loadArgs.getFormat()).to.equal("PARQUET");

            UnitTest.hasAlertWithTitle("Error Parsing Parquet Dataset");
            XcalarAppExecute = oldFunc;
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
            loadArgs.reset();
        });
    });

    describe("Error Section Test", function() {
        var loadArgs;

        before(function() {
            loadArgs = DSPreview.__testOnly__.get().loadArgs;
        });

        it("should click suggest to change format", function() {
            var $errorSection = $previewCard.find(".errorSection");
            DSPreview.__testOnly__.toggleFormat("JSON");
            $errorSection.find(".content").html('<div class="suggest" data-format="CSV"></div>');
            $errorSection.find(".suggest").click();
            expect(loadArgs.getFormat()).to.equal("CSV");
            $errorSection.find(".content").empty();
        });

        it("should click debugUDF to debug", function() {
            loadArgs.set({files: [{}]});
            loadArgs.setPreviewingSource(0, "test");
            var oldFunc = JupyterPanel.autofillImportUdfModal;
            var test = false;
            JupyterPanel.autofillImportUdfModal = function() {
                test = true;
            };
            $("#dsPreview-debugUDF").click();
            expect(test).to.be.true;
            JupyterPanel.autofillImportUdfModal = oldFunc;
        });

        after(function() {
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Preview UI Behavior Test", function() {
        before(function() {
            DSPreview.__testOnly__.restoreForm({
                "dsName": "test",
                "moduleName": "default",
                "funcName": "openExcel",
                "format": "TEXT",
                "hasHeader": true,
                "fieldDelim": "",
                "lineDelim": "\n",
                "quoteChar": "\"",
                "skipRows": 1
            });
            // selection of range needs it to be visible
            DSForm.switchView(DSForm.View.Preview);
        });

        it("should apply highligher", function() {
            var highlighter;
            // case 1
            $previewTable.addClass("has-delimiter");
            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;

            // case 2
            $previewTable.removeClass("has-delimiter").addClass("truncMessage");
            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;

            // case 3
            $previewTable.removeClass("truncMessage");

            $previewTable.html("a");

            var range = document.createRange();
            range.setStart($previewTable[0].childNodes[0], 0);
            range.setEnd($previewTable[0].childNodes[0], 1);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            $previewTable.mouseup();
            highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.equal("a");

            $previewTable.empty();
        });

        it("should remove highlighter", function() {
            $previewCard.find(".rmHightLight").click();
            var highlighter = DSPreview.__testOnly__.get().highlighter;
            expect(highlighter).to.be.empty;
        });

        it("should apply highlighter to delimiter", function() {
            DSPreview.__testOnly__.set(null, "a");
            $previewCard.find(".highlight").click();
            expect(loadArgs.getFieldDelim()).to.equal("a");
        });

        it("should input to set quote", function() {
            $quoteInput.val("a").focus().trigger("input");
            expect(loadArgs.getQuote()).to.equal("a");
        });

        it("should click header box to toggle promote header", function() {
            var $checkbox = $headerCheckBox.find(".checkbox");
            var hasHeader = $checkbox.hasClass("checked");

            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(!hasHeader);
            expect(loadArgs.useHeader()).to.equal(!hasHeader);

            // toggle back
            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(hasHeader);
            expect(loadArgs.useHeader()).to.equal(hasHeader);
        });

        it("should click colGrab to trigger col resize", function() {
            var oldFunc = TblAnim.startColResize;
            var test = false;
            TblAnim.startColResize = function() {
                test = true;
            };

            var $ele = $('<div class="colGrab"></div>');
            $previewTable.append($ele);
            // nothing happen
            $ele.mousedown();
            expect(test).to.be.false;
            // trigger resize
            $ele.trigger(fakeEvent.mousedown);
            expect(test).to.be.true;

            $ele.remove();
            TblAnim.startColResize = oldFunc;
        });

        it("should click #dsForm-minimize to toggle minize", function() {
            expect($previewCard.hasClass("minimize")).to.be.false;

            var $btn = $("#dsForm-minimize");
            $btn.click();
            expect($previewCard.hasClass("minimize")).to.be.true;
            $btn.click();
            expect($previewCard.hasClass("minimize")).to.be.false;
        });

        it("should click to toggle advanced option", function() {
            var $advanceSection = $form.find(".advanceSection");
            var $button = $advanceSection.find(".listWrap");

            expect($advanceSection.hasClass("active")).to.be.false;
            // open advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.true;
            // close advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.false;
        });

        it("should click to fetch more rows", function(done) {
            DSPreview.__testOnly__.set("abc");
            $("#dsForm-skipRows").val("0");
            var test = false;
            var oldFunc = XcalarPreview;
            XcalarPreview = function() {
                test = true;
                return PromiseHelper.resolve([{
                    buffer: "efg"
                }]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldFunc;
            });
        });

        it("should click .tooltipOverflow to trigger auto tooltip", function() {
            var $fakeDiv = $('<div class="tooltipOverflow"></div>');
            var oldAdd = xcTooltip.add;
            var oldAuto = xcTooltip.auto;
            var test1 = false;
            var test2 = false;
            xcTooltip.add = function() {
                test1 = true;
            };
            xcTooltip.auto = function() {
                test2 = true;
            };
            $("#dsPreviewWrap").append($fakeDiv);
            $fakeDiv.trigger(fakeEvent.mouseenter);
            expect(test1).to.be.true;
            expect(test2).to.be.true;

            $fakeDiv.remove();
            xcTooltip.add = oldAdd;
            xcTooltip.auto = oldAuto;
        });

        it("should click .cancelLoad to cancel preview load", function() {
            var $fakeBtn = $('<div class="cancelLoad"></div>');
            var oldFunc = QueryManager.cancelQuery;
            var test = false;
            QueryManager.cancelQuery = function() {
                test = true;
            };
            $("#dsPreviewWrap").append($fakeBtn);
            $fakeBtn.click();
            expect(test).to.be.true;

            $fakeBtn.remove();
            QueryManager.cancelQuery = oldFunc;
        });

        it("should change format", function() {
            loadArgs.set({format: "CSV"});
            $("#fileFormatMenu").find("li[name=JSON]").trigger(fakeEvent.mouseup);
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#fileFormat input").val()).to.equal("JSON");
            // clear up
            loadArgs.set({format: "CSV"});
        });

        it("should click confirm to submit the form", function() {
            // make an error case
            $form.find(".dsName").eq(0).val("");
            $form.find(".confirm:not(.creatTable)").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("should click cancel to back to form", function() {
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                files: [{path: "/abc"}]
            });
            var $button = $form.find(".cancel");
            var oldGetLicense = XVM.getLicenseMode;
            var oldForm = DSForm.show;
            var oldFileBrowser = FileBrowser.show;
            var test1 = test2 = false;

            DSForm.show = function() { test1 = true; };
            FileBrowser.show = function() { test2 = true; };

            // case 1
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                files: [{path: "/abc"}]
            });
            XVM.getLicenseMode = function() { return XcalarMode.Oper; };
            DSPreview.__testOnly__.setBackToFormCard(true);
            $button.click();
            expect(test1).to.be.true;
            expect(test2).to.be.false;
            test1 = false;

            // case 2
            loadArgs.set({
                targetName: gDefaultSharedRoot,
                files: [{path: "/abc"}]
            });
            DSPreview.__testOnly__.setBackToFormCard(false);
            $button.click();
            expect(test1).to.be.false;
            expect(test2).to.be.true;

            XVM.getLicenseMode = oldGetLicense;
            DSForm.show = oldForm;
            FileBrowser.show = oldFileBrowser;
        });

        it("should click dsForm-writeUDF to trigger jupyer", function() {
            var loadArgs = DSPreview.__testOnly__.get().loadArgs;
            var test = false;
            var oldFunc = JupyterPanel.autofillImportUdfModal;
            JupyterPanel.autofillImportUdfModal = function() {
                test = true;
            };

            loadArgs.set({files: [{}]});
            loadArgs.setPreviewingSource(0, "testFile");
            $("#dsForm-writeUDF").click();
            expect(test).to.be.true;
            JupyterPanel.autofillImportUdfModal = oldFunc;
        });

        after(function() {
            DSPreview.__testOnly__.set();
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("Preview file change Test", function() {
        var oldHTML;
        var $previewFile;
        var $ul;
        var loadArgs;
        var oldPreview;
        var oldListFile;
        var listTest;

        before(function() {
            $previewFile = $("#preview-file");
            $ul = $previewFile.find("ul");
            oldHTML = $ul.html();
            loadArgs = DSPreview.__testOnly__.get().loadArgs;
            loadArgs.set();
            loadArgs.files = [{path: "path1"}, null, {path: "path4"}];


            var fakeHtml = '<li class="hint active">Hint</li>' +
                            '<li class="mainPath test1" data-path="path1" data-index="0">path1</li>' +
                            '<li class="mainPath singlePath test2" data-index="1">path2</li>' +
                            '<div class="subPathList test3" data-index="0"></div>' +
                            '<div class="subPathList" data-index="2">' +
                                '<li class="test4">path4</li>' +
                            '</div>';
            $ul.html(fakeHtml);
            loadArgs.setPreviewingSource(0, "path1");

            oldPreview = XcalarPreview;
            oldListFile = XcalarListFiles;
            XcalarPreview = function() {
                return PromiseHelper.reject();
            };
            XcalarListFiles = function() {
                listTest = true;
                return PromiseHelper.resolve({
                    numFiles: 1,
                    files: [{
                        name: "test",
                        attr: {
                            isDirectory: false
                        }
                    }]
                });
            };
        });

        it("open menu should set active preview file", function() {
            $previewFile.click();
            expect($ul.find(".test1").hasClass("active")).to.be.true;
            // close menu
            $previewFile.click();
        });

        it("click hint should have nothing happens", function() {
            $ul.find(".active").removeClass("active");
            $ul.find(".hint").trigger(fakeEvent.mouseup);
            expect($ul.find(".active").length).to.equal(0);
        });

        if ("should collapse main path", function() {
            var $li = $ul.find(".test1");
            $li.trigger(fakeEvent.mouseup);
            expect($li.hasClass("collapse")).to.be.true;
        });

        it("should select main path", function(done) {
            var $li = $ul.find(".test1").addClass("collapse");
            $li.trigger(fakeEvent.mouseup);
            expect($li.hasClass("collapse")).to.be.false;

            UnitTest.testFinish(function() {
                return listTest === true;
            })
            .then(function() {
                expect($ul.find(".test3").text()).not.to.be.empty;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should select single path", function() {
            $ul.find(".test2").trigger(fakeEvent.mouseup);
            expect(loadArgs.getPreivewIndex()).to.equal(1);
        });

        it("should select sub path", function() {
            $ul.find(".test4").trigger(fakeEvent.mouseup);
            expect(loadArgs.getPreivewIndex()).to.equal(2);
        });

        after(function() {
            $ul.html(oldHTML);
            loadArgs.reset();
            XcalarPreview = oldPreview;
            XcalarListFiles = oldListFile;
        });
    });

    describe("csv column renaming and type casting", function() {
        before(function(done) {
            DSPreview.show({
                "targetName": testDatasets.sp500.targetName,
                "files": [{path: testDatasets.sp500.path}]
            }, null)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("rename input should show", function(done) {
            expect($previewTable.find(".editableHead").length).to.equal(2);
            expect($("#importColRename").length).equal(0);

            $previewTable.find(".editableHead").eq(0).trigger(fakeEvent.mousedown);
            expect($("#importColRename").length).equal(1);
            expect($("#importColRename").width()).to.be.gt(40);
            expect($("#importColRename").width()).to.be.lt(140);
            UnitTest.testFinish(function() {
                return $(document.activeElement).is("#importColRename");
            }, 10)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("rename input should show error for if starts with number", function() {
            var cachedFn = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect(options.title).to.equal("Invalid name: a name can only begin with a letter or underscore(_).");
                called = true;
            };

            $("#importColRename").val("5");
            $("#importColRename").trigger("blur").blur();

            expect($("#importColRename").length).equal(1);
            expect(called).to.be.true;
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("column0");

            xcTooltip.transient = cachedFn;
        });

        it("rename input should show error for if duplicate name", function() {
            var cachedFn = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect(options.title).to.equal("A column with the same name already exists. Please choose another name.");
                called = true;
            };

            $("#importColRename").val("column1");
            $("#importColRename").trigger("blur").blur();

            expect($("#importColRename").length).equal(1);
            expect(called).to.be.true;
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("column0");

            xcTooltip.transient = cachedFn;
        });

        it("rename input blur with invalid should not change column name", function () {
            $("#importColRename").val("5b");
            expect($("#importColRename").length).equal(1);
            $previewCard.find(".previewSection").scrollLeft(1).scroll();
            expect($("#importColRename").length).equal(0);
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("column0");
        });

        it("rename input width should increase", function(done) {
            $previewTable.find(".editableHead").eq(0).trigger(fakeEvent.mousedown);
            expect($("#importColRename").length).equal(1);

            UnitTest.testFinish(function() {
                return $(document.activeElement).is("#importColRename");
            }, 10)
            .then(function() {
                var width = $("#importColRename").width();
                $("#importColRename").val("A".repeat(30)).trigger(fakeEvent.input);
                expect($("#importColRename").width()).to.be.gt(width);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("rename input with valid name should change column name", function () {
            expect($("#importColRename").length).equal(1);
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("column0");
            $("#importColRename").val("renamed");
            expect($("#importColRename").length).equal(1);
            $("#importColRename").trigger("blur").blur();
            expect($("#importColRename").length).equal(0);
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("renamed");
            $previewTable.find(".editableHead").eq(0).val("column0");
        });

        it("cast dropdown should show on click", function() {
            expect($previewCard.find(".castDropdown").is(":visible")).to.be.false;
            $previewTable.find(".editable").eq(0).find(".flex-left").click();
            expect($previewCard.find(".castDropdown").is(":visible")).to.be.true;
        });

        it("cast dropdown li should work", function() {
            expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.true;
            expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.false;
            $previewCard.find(".castDropdown").find(".type-boolean").trigger(fakeEvent.mouseup);
            expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.false;
            expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.true;

            $previewCard.find(".castDropdown").find(".type-integer").trigger(fakeEvent.mouseup);
            expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.true;
            expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.false;
        });

        it("check bulkduplicate names should work", function(done) {
            var fn = DSPreview.__testOnly__.checkBulkDuplicateNames;
            var headers = [{colName: "aa"}, {colName: "bb"}, {colName: "cc"}];
            var firstPass = false;
            fn(headers)
            .then(function() {
                firstPass = true;
                var headers = [{colName: "aa"}, {colName: "bb"}, {colName: "bb"}];
                setTimeout(function() {
                    UnitTest.hasAlertWithText(ErrTStr.DuplicateColNames + ":NameColumn Nos.bb2,3", {confirm: true});
                });
                return fn(headers);
            })
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(firstPass).to.be.true;
                done();
            });
        });

        after(function() {
            DSPreview.__testOnly__.set();
            DSPreview.__testOnly__.resetForm();
        });
    });

    describe("resizing bottomcard", function() {
        it("should resize", function() {
            var $bar = $previewCard.find(".cardBottom .ui-resizable-n").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY + 30 });

            expect($bar.offset().top > pageY);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
            expect($bar.offset().top === pageY);
        });
    });

    describe("Auto Header Check Test", function() {
        var loadArgs;

        before(function() {
            loadArgs = DSPreview.__testOnly__.get().loadArgs;
            loadArgs.set();
        });

        it("slowPreviewCheck should alert when too many files", function(done) {
            loadArgs.files = new Array(20);
            var def = DSPreview.__testOnly__.slowPreviewCheck();
            UnitTest.hasAlertWithTitle(DSFormTStr.ImportMultiple);
            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("slowPreviewCheck should alert when it's slow target", function(done) {
            var oldFunc = DSTargetManager.isSlowPreviewTarget;
            var test = false;
            DSTargetManager.isSlowPreviewTarget = function() {
                test = true;
                return true;
            };

            loadArgs.files = [];
            var def = DSPreview.__testOnly__.slowPreviewCheck();
            UnitTest.hasAlertWithTitle(DSFormTStr.ImportMultiple, {confirm: true});
            def
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DSTargetManager.isSlowPreviewTarget = oldFunc;
            });
        });

        it("slowPreviewCheck should not alert in normal case", function(done) {
            loadArgs.files = [];
            var def = DSPreview.__testOnly__.slowPreviewCheck();
            def
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("autoDetectSourceHeaderTypes should work", function(done) {
            var oldPreview = XcalarPreview;
            var typedColumnsList = [];
            var dsArgs = {
                lineDelim: "\n",
                fieldDelim: ",",
                hasHeader: true,
                quoteChar: "\""
            };
            XcalarPreview = function() {
                var buffer = 'header\n1\n1\n2\n3';
                return PromiseHelper.resolve({buffer: buffer});
            };

            DSPreview.__testOnly__.autoDetectSourceHeaderTypes({}, "testTarget", dsArgs, typedColumnsList, 0)
            .then(function() {
                expect(typedColumnsList.length).to.equal(1);
                var typedColumns = typedColumnsList[0];
                expect(typedColumns).to.be.an("array");
                expect(typedColumns.length).to.equal(1);
                var colInfo = typedColumns[0];
                expect(colInfo.colName).to.equal("header");
                expect(colInfo.colType).to.equal(ColumnType.integer);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        it("autoDetectSourceHeaderTypes should handle fail case", function(done) {
            var oldPreview = XcalarPreview;
            var typedColumnsList = [];
            var dsArgs = {
                lineDelim: "\n",
                fieldDelim: ",",
                hasHeader: true,
                quoteChar: "\""
            };
            XcalarPreview = function() {
                return PromiseHelper.reject("test");
            };

            DSPreview.__testOnly__.autoDetectSourceHeaderTypes({}, "testTarget", dsArgs, typedColumnsList, 0)
            .then(function() {
                expect(typedColumnsList.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        it("getTypedColumnsList should resolve with non CSV format", function(done) {
            var dsArgs = {format: "JSON"};
            DSPreview.__testOnly__.getTypedColumnsList([], dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getTypedColumnsList should resolve with non multi source case", function(done) {
            var typedColumns = [{colName: "test", colType: ColumnType.integer}];
            var dsArgs = {format: "CSV"};
            loadArgs.multiDS = false;

            DSPreview.__testOnly__.getTypedColumnsList(typedColumns, dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(1);
                expect(typedColumnsList[0][0].colName).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getTypedColumnsList should auto detect", function(done) {
            var typedColumns = [{colName: "test", colType: ColumnType.integer}];
            var dsArgs = {format: "CSV"};
            loadArgs.multiDS = true;
            loadArgs.setPreviewingSource(0, "testFile");
            loadArgs.headersList[1] = [{colName: "test2", colType: ColumnType.integer}];
            loadArgs.files = [{}, {}, {}];

            var oldPreview = XcalarPreview;
            XcalarPreview = function() {
                return PromiseHelper.reject("test");
            };

            DSPreview.__testOnly__.getTypedColumnsList(typedColumns, dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(2);
                expect(typedColumnsList[0][0].colName).to.equal("test");
                expect(typedColumnsList[1][0].colName).to.equal("test2");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        after(function() {
            loadArgs.reset();
        });
    });

    describe("Show Preview and Submit Test", function() {
        before(function() {
            DSPreview.__testOnly__.resetForm();
            DSForm.show({"noReset": true});
        });

        it("DSPreview.show() should work", function(done) {
            DSPreview.show({
                "targetName": testDatasets.sp500.targetName,
                "files": [{path: testDatasets.sp500.path}]
            }, null)
            .then(function() {
                expect($previewTable.html()).not.to.equal("");
                expect($formatText.data("format")).to.equal("CSV");
                expect($headerCheckBox.find(".checkbox").hasClass("checked"))
                .to.be.false;
                expect($lineText.val()).to.equal("\\n");
                expect($fieldText.val()).to.equal("\\t");
                expect($quoteInput.val()).to.equal("\"");
                expect($skipInput.val()).to.equal("0");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should sumibt form and load ds", function(done) {
            var validFunc = function(dsName) { return !DS.has(dsName); };
            var testDS = xcHelper.uniqueRandName("testSuitesSp500", validFunc, 10);
            $form.find(".dsName").eq(0).val(testDS);
            var $grid;
            DSPreview.__testOnly__.submitForm()
            .then(function() {
                expect(DS.has(testDS)).to.be.true;
                $grid = DS.getGridByName(testDS);
                expect($grid).not.to.be.null;

                var innerDeferred = PromiseHelper.deferred();
                // dealy delete ds since show the sample table needs time
                setTimeout(function() {
                    var dsObj = DS.getDSObj($grid.data("dsid"));
                    DS.__testOnly__.delDSHelper($grid, dsObj)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                }, 300);
                return innerDeferred.promise();
            })
            .then(function() {
                // make sure ds is deleted
                expect(DS.has(testDS)).to.be.false;
                $grid = DS.getGridByName(testDS);
                expect($grid).to.be.null;
                done();
            })
            .fail(function() {
                // Intentionally fail the test
                done("fail");
            });
        });
    });

    after(function() {
        StatusBox.forceHide();

        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});
