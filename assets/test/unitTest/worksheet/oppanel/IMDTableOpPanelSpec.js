describe('IMDTableOpPanel Test', () => {
    var oldPut;

    before(function(done) {
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            done();
        });
    });

    describe('IMD Table Panel Test', () => {
        let opPanel;
        let $panel;
        let node;
        let editor;
        let oldGetTables;
        let $tableList;

        before(() => {
            oldGetTables = PTblManager.Instance.getAvailableTables;
            PTblManager.Instance.getAvailableTables = function() {
                return [{
                    name: "A",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [{
                        startTS: 1,
                        batchId: 0,
                    }],
                    active: true
                }, {
                    name: "B",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [{
                        startTS: 1,
                        batchId: 0,
                    }, {
                        startTS: 2,
                        batchId: 1,
                    }],
                    active: true
                }, {
                    name: "C",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [],
                    active: false
                }];
            };
            node = new DagNodeIMDTable({});
            MainMenu.openPanel("dagPanel");
            IMDTableOpPanel.Instance.show(node, {});
            $panel = $("#IMDTableOpPanel");
            opPanel = IMDTableOpPanel.Instance;
            editor = opPanel.getEditor();
            $tableList = $("#pubTableList");
        });

        describe('Basic UI Tests', () => {
            it('Published Table Dropdown', () => {
                expect($tableList.find("li").length).to.equal(3);
            });

            it('Initial Version', () => {
                expect($panel.find(".tableVersionInput").val()).to.equal("-1");
            });

            it('Should be able to open schema screen and go back from it', () => {
                $tableList.find(".pubTableInput").click();
                $tableList.find("li").eq(1).trigger(fakeEvent.mouseup);
                expect($panel.find(".tableVersionInput").is(":visible")).to.be.true;
                $panel.find(".btn-next").click();
                expect($panel.find(".tableVersionInput").is(":visible")).to.be.false;
                expect($panel.find(".schema").is(":visible")).to.be.true;
                $panel.find(".btn-back").click();
                expect($panel.find(".tableVersionInput").is(":visible")).to.be.true;
                expect($panel.find(".schema").is(":visible")).to.be.false;
            });

            it ("Should be hidden at start", function () {
                opPanel.close();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });

            it ("Should be visible when show is called", function () {

                opPanel.show(node, {});
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.false;
            });

            it ("Should be hidden when close is called after showing", function () {
                opPanel.show(node, {});
                opPanel.close();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });

            it ("Should be hidden when close is clicked", function () {
                opPanel.show(node, {});
                $('#IMDTableOpPanel .close').click();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });
        });

        describe('Panel tests', () => {
            before(() => {
                opPanel.show(node, {});
            });

            it("Should change possible versions depending on table", () => {
                expect($("#tableVersionList li").length).to.equal(0);
                $tableList.find(".pubTableInput").click();
                $tableList.find("li").eq(1).trigger(fakeEvent.mouseup);
                expect($("#tableVersionList li").length).to.equal(2);
                $tableList.find(".pubTableInput").click();
                $tableList.find("li").eq(0).trigger(fakeEvent.mouseup);
                expect($("#tableVersionList li").length).to.equal(1);
            });

            it("Should be able to check and uncheck latest version", () => {
                $tableList.find(".pubTableInput").click();
                $tableList.find("li").eq(1).trigger(fakeEvent.mouseup);
                expect($(".tableVersion .checkbox").hasClass("checked")).to.be.true;
                $(".tableVersion .checkbox").click();
                expect($(".tableVersion .checkbox").hasClass("checked")).to.be.false;
                $tableList.find(".pubTableInput").click();
                $tableList.find("li").eq(2).trigger(fakeEvent.mouseup);
                expect($(".tableVersion .checkbox").hasClass("checked")).to.be.true;
                $(".tableVersion .checkbox").click();
                expect($(".tableVersion .checkbox").hasClass("checked")).to.be.true;
            });

        });

        describe("Advanced Mode related IMD Table Op Panel Tests", function() {
            it("Should show statusbox error if not all fields are there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify({}, null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });
            it("Should show statusbox error if source is not there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"version": -1, "schema": [{"name": "COL", "type": "integer"}]},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });
            it("Should show statusbox error if version is not there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"source": "B", "schema": [{"name": "COL", "type": "integer"}]},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });
            it("Should show statusbox error if schema is not there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"source": "B", "version": -1},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });

            it("Should switch back correctly with updated fields", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"source": "B", "version": 0, "schema": [{"name": "COL", "type": "integer"}], "filterString": "123"},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                expect($panel.find(".pubTableInput").val()).to.equal("B");
                expect($panel.find(".tableVersionInput").val()).to.equal("0");
                expect($panel.find(".filterStringInput").val()).to.equal("123");
                expect($(".tableVersion .checkbox").hasClass("checked")).to.be.false;
                opPanel.close();
            });
        });

        describe("Final output", function() {
            it ("final node should have correct input", function() {
                opPanel.show(node, {});
                expect(JSON.stringify(node.getParam())).to.equal('{"source":"","version":-1,"filterString":"","schema":[],"limitedRows":null}');
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                var input = JSON.stringify(
                    {"source": "B", "version": -1, "schema": [{"name": "COL", "type": "integer"}]},
                    null, 4);
                editor.setValue(input);
                $panel.find(".submit").click();
                expect(JSON.stringify(node.getParam())).to.equal('{"source":"B","version":-1,"filterString":"","schema":[{"name":"COL","type":"integer"}],"limitedRows":null}');
            });
        });

        after(() => {
            PTblManager.Instance.getAvailableTables = oldGetTables;
        });
    });

    after(function() {
        XcalarKeyPut = oldPut;
        UnitTest.offMinMode();
    });
});