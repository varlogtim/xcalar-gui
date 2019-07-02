describe("Dataset Operator Panel Test", function() {
    var datasetOpPanel;
    var node;
    var oldListDS;
    var oldJSONParse;
    var oldGetDS;
    var oldWaitForSetup;

    before(function(done) {
        node = new DagNodeDataset({});
        oldListDS = DS.listDatasets;
        DS.listDatasets = function() {
            return [
                {
                    path: "ds1",
                    id: "support@ds1",
                    suffix: "",
                    options: {
                        inActivated: false,
                        size: 123,
                    }
                },
                {
                    path: "/folder/ds2",
                    id: "support@ds2",
                    suffix: "",
                    options: {
                        inActivated: false,
                        size: 456
                    }
                }
            ]
        }
        datasetOpPanel = DatasetOpPanel.Instance;
        oldJSONParse = JSON.parse;
        oldGetDS = DS.getDSObj;
        DS.getDSObj = function(str) {
            if (str == "support@ds1") {
                return { val: "true"};
            }
        };
        node.setParam = () => {
            var deferred = PromiseHelper.deferred();
            return deferred.resolve();
        };
        oldWaitForSetup = XDFManager.Instance.waitForSetup;
        XDFManager.Instance.waitForSetup = () => PromiseHelper.resolve();

        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("Basic Dataset Panel UI Tests", function() {
        it ("Should be hidden at start", function () {
            datasetOpPanel.close();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {
            datasetOpPanel.close();
            datasetOpPanel.show(node);
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            datasetOpPanel.show(node);
            datasetOpPanel.close();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            datasetOpPanel.show(node);
            $('#datasetOpPanel .close.icon.xi-close').click();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it("should navigate to dataset panel when click link", function() {
            let testPanelId, testSubId;
            let oldFunc = MainMenu.openPanel;
            MainMenu.openPanel = (panelId, subId) => {
                testPanelId = panelId;
                testSubId = subId;
            };
            $('#datasetOpPanel .instrText .link').click();
            expect(testPanelId).to.equal("datastorePanel");
            expect(testSubId).to.equal("inButton");
            MainMenu.openPanel = oldFunc;
        });
    });

    describe("Standard Dataset Panel Tests", function() {

        it("Should display dataset list correctly", function() {
            datasetOpPanel.show(node);
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            datasetOpPanel.close();
        });

        it("Should display folders correctly", function() {
            datasetOpPanel.show(node);
            var $foldList = $("#datasetOpPanel #dsOpListSection .folderName");
            expect($foldList.length).to.equal(1);
            expect($foldList.eq(0).find(".name").text()).to.equal("folder");
            $foldList.eq(0).click();
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            datasetOpPanel.close();
        });

        it("Should handle back and forward buttons correctly", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            $("#datasetOpBrowser .backFolderBtn").click();
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.true;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.false;
            $("#datasetOpBrowser .forwardFolderBtn").click();
            $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should show the path correctly", function() {
            datasetOpPanel.show(node);
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home /");
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home / folder /");
        });

        it("Should refresh list properly", function() {
            expect($("#dsOpListSection").find("li").length).to.equal(1);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds2");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds2",
                        id: "support@ds2",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds3",
                        id: "support@ds3",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            };
            $("#datasetOpPanel .refreshDatasetList").click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home / folder /");
            expect($("#dsOpListSection").find("li").length).to.equal(2);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds2");
            expect($("#dsOpListSection").find("li").eq(1).text()).to.equal("ds3");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            };
            $("#datasetOpPanel .refreshDatasetList").click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home /");
            expect($("#dsOpListSection").find("li").length).to.equal(1);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds1");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds2",
                        id: "support@ds2",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            }
            $("#datasetOpPanel .refreshDatasetList").click();
        });

        it ("Should not submit empty arguments", function () {
            datasetOpPanel.show(node);
            $('#datasetOpPanel .submit').click();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it("Should not submit empty dataset", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            $('#datasetOpPanel .bottomSection .submit').click();
            UnitTest.hasStatusBoxWithError(OpPanelTStr.SelectDSSource);
        });

        it("Should not submit invalid prefix", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .fileName").eq(0).click();
            $("#datasetOpPanel .datasetPrefix .arg").val("@test");
            $('#datasetOpPanel .bottomSection .submit').click();
            UnitTest.hasStatusBoxWithError(ErrTStr.PrefixStartsWithLetter);
            datasetOpPanel.close();
        });

        // it("Should not submit with inactivated dataset", function() {
        //     var oldFunc = DS.getDSObj;
        //     DS.getDSObj = function() {
        //         return {
        //             activatted: false
        //         };
        //     };
        //     datasetOpPanel.show(node);
        //     $("#datasetOpPanel #dsOpListSection .fileName").eq(0).click();
        //     $("#datasetOpPanel .datasetPrefix .arg").val("test");
        //     $('#datasetOpPanel .bottomSection .submit').click();
        //     UnitTest.hasStatusBoxWithError(ErrTStr.InactivatedDS2);
        //     datasetOpPanel.close();
        //     DS.getDSObj = oldFunc;
        // });

        it("_sortListObj should sort files by name", function() {
            let file = {name: "B"};
            let res = datasetOpPanel._sortListObj([file], ["a"], "name");
            expect(res[0].obj).to.equal("a");
            expect(res[1].obj).to.equal(file);
        });

        it("_sortListObj should sort files by type", function() {
            let file = {name: "B"};
            let res = datasetOpPanel._sortListObj([file], ["a"], "type");
            expect(res[0].obj).to.equal("a");
            expect(res[1].obj).to.equal(file);
        });

        it("_sortListObj should sort files by size", function() {
            let file1 = {name: "B", options: {size: 456}};
            let file2 = {name: "a", options: {size: 123}};
            let res = datasetOpPanel._sortListObj([file1, file2], [], "size");
            expect(res[0].obj).to.equal(file2);
            expect(res[1].obj).to.equal(file1);
        });

        it("_sortListObj should sort files by none", function() {
            let file = {name: "B"};
            let res = datasetOpPanel._sortListObj([file], ["a"]);
            expect(res[0].obj).to.equal("a");
            expect(res[1].obj).to.equal(file);
        });

        it("_getFileHTML should work", function() {
            // case 1
            let file = {name: "test", id: "test", options: {inActivated: true}};
            let res = datasetOpPanel._getFileHTML(file);
            expect(res).to.contains("inActivated");
            // case 2
            file = {name: "test", id: "test"};
            res = datasetOpPanel._getFileHTML(file);
            expect(res).not.to.contains("inActivated");
        });

        it("_getFolderHTML should work", function() {
            let res = datasetOpPanel._getFolderHTML("test");
            expect(res).to.contains("folderName");
        });
    });

    describe("Advanced Dataset Panel Tests", function() {
        it("Should switch from advanced panel correctly", function() {
            datasetOpPanel.show(node);
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.true;
            JSON.parse = function() {
                return {
                    source: "support@ds1",
                    prefix: "pref"
                };
            };
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.false;
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.true;
            expect($("#datasetOpPanel .datasetPrefix .arg").val()).to.equal("pref");
            expect($("#datasetOpPanel #dsOpListSection .fileName.active").text()).to.equal("ds1");
            datasetOpPanel.close();
        });
    });

    /**
     * Need to have some integration tests to ensure file browsing
     * works as expected, and submission does as well.
     */

    after(function() {
        DS.listDatasets = oldListDS;
        JSON.parse = oldJSONParse;
        DS.getDSObj = oldGetDS;
        XDFManager.Instance.waitForSetup = oldWaitForSetup;
        datasetOpPanel.close();
    });
});