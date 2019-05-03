describe("DagView Test", () => {
    let $dagView;
    let $dfWrap;
    let $dfArea;
    let tabId;
    let oldPut;
    let cachedUserPref;

    before(function(done) {
        console.clear();
        console.log("DagView Test");
        UnitTest.onMinMode();
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        oldPut = XcalarKeyPut;

        UnitTest.testFinish(() => DagPanel.hasSetup())
        .always(function() {
            XcalarKeyPut = function() {
                return PromiseHelper.resolve();
            };
            if (XVM.isSQLMode()) {
                $("#modeArea").click();
            }
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            $dfArea = $dfWrap.find(".dataflowArea.active");
            MainMenu.openPanel("dagPanel", null);
            cachedUserPref = UserSettings.getPref;
            UserSettings.getPref = function(val) {
                if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                    return false;
                } else {
                    return cachedUserPref(val);
                }
            };

            done();
        });
    });
    describe("initial state", function() {
        it("initial screen should have no operators", function() {
            expect($dagView.find(".operator").length).to.be.gt(0);
            expect($dagView.find(".dataflowArea.active .operator").length).to.equal(0);
        });
        it("correct elements should be present", function() {
            expect($dagView.find(".dataflowArea.active .dataflowAreaWrapper").children().length).to.equal(3);
            expect($dagView.find(".dataflowArea.active .operatorSvg").length).to.equal(1);
        });
    });
    describe("adding node", function() {
        it("add node should work", function() {
            expect($dagView.find(".dataflowArea.active .operatorSvg").children().length).to.equal(0);

            const newNodeInfo = {
                type: "dataset",
                display: {
                    x: 20,
                    y: 40
                }
            };
            DagViewManager.Instance.newNode(newNodeInfo);
            expect($dagView.find(".dataflowArea.active .operatorSvg").children().length).to.equal(1);
            expect($dagView.find(".dataflowArea.active .operator").length).to.equal(1);
            const $operator = $dagView.find(".dataflowArea.active .operator");
            expect($operator.attr("transform")).to.equal("translate(20,40)");
            expect($operator.hasClass("dataset")).to.be.true;
            const dag = DagViewManager.Instance.getActiveDag();

            const nodeId = $operator.data("nodeid");
            expect(DagViewManager.Instance.getNode(nodeId).length).to.equal(1);
            const position = dag.getNode(nodeId).getPosition();
            expect(position.x).to.equal(20);
            expect(position.y).to.equal(40);
        });
    });

    describe("move node", function() {
        it("drag and drop for moving operators should work", function() {
            let $operator;
            let left;
            let top;
            let dagView = DagViewManager.Instance.getActiveDagView();
            const cacheFn = dagView.moveNodes;
            let called = false;
            dagView.moveNodes = function(nodeInfos) {
                expect(nodeInfos.length).to.equal(1);
                expect(nodeInfos[0].id).to.equal($operator.data("nodeid"));
                expect(nodeInfos[0].position.x).to.equal(left + 60);
                expect(nodeInfos[0].position.y).to.equal(top + 80);
                called = true;
            };
            $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            var parts  = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec($operator.attr("transform"));

            const nodeId = $operator.data("nodeid");
            left = parseInt(parts[1]); // 20
            top = parseInt(parts[2]); // 40
            const rect = $operator[0].getBoundingClientRect();
            const startLeft = rect.left;
            const startTop = rect.top;
            var e = $.Event('mousedown', {pageX: startLeft, pageY: startTop, which: 1});

            $operator.find(".main").trigger(e);

            expect($(".dragContainer").length).to.equal(0);

            var e = $.Event('mousemove', {pageX: startLeft + 20, pageY: startTop + 20});
            $(document).trigger(e);

            expect($(".dragContainer").length).to.equal(1);

            var e = $.Event('mousemove', {pageX: startLeft + 60, pageY: startTop + 80});
            $(document).trigger(e);

            var e = $.Event('mouseup', {pageX: startLeft + 60, pageY: startTop + 80});
            $(document).trigger(e);
            expect($(".dragContainer").length).to.equal(0);

            expect(called).to.be.true;
            dagView.moveNodes = cacheFn;
        });

        it("DagViewManager.Instance.moveNode should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const nodeId = $operator.data("nodeid");

            DagViewManager.Instance.moveNodes(tabId, [{type: "dagNode", id: nodeId, position: {x: 220, y: 240}}])
            .always(function() {
                const dag = DagViewManager.Instance.getActiveDag();
                expect(dag.getNode(nodeId).getPosition().x).to.equal(220);
                expect(dag.getNode(nodeId).getPosition().y).to.equal(240);
                expect($operator.attr("transform")).to.equal("translate(220,240)");
                done();
            });
        });
    });

    describe("connecting nodes", function() {
        before(function() {
            const newNodeInfo = {
                type: "filter",
                input: "{\"evalString\": \"eq(1, 1)\"}",
                display: {
                    x: 20,
                    y: 20
                }
            };
            DagViewManager.Instance.newNode(newNodeInfo);
        });

        it("drag and drop for connectors should work", function() {
            let dagView = DagViewManager.Instance.getActiveDagView();
            const cacheFn = dagView.connectNodes;
            let called = false;
            dagView.connectNodes = function(pId, cId, index) {
                expect(pId).to.equal($operator.data("nodeid"));
                expect(cId).to.equal($operator.siblings(".operator").data("nodeid"));
                expect(index).to.equal(0);
                called = true;
            };
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);

            expect($dagView.find(".dataflowArea.active .operator").length).to.equal(2);
            let rect = $operator.find(".connector.out")[0].getBoundingClientRect();
            const startLeft = rect.left;
            const startTop = rect.top;

            var e = $.Event('mousedown', {pageX: startLeft, pageY: startTop, which: 1});

            $operator.find(".connector.out").trigger(e);

            expect($(".dragContainer").length).to.equal(0);
            var e = $.Event('mousemove', {pageX: startLeft + 2, pageY: startLeft + 1});
            $(document).trigger(e);

            expect($(".dragContainer").length).to.equal(1);
            expect($dfWrap.find(".secondarySvg").length).to.equal(1);

            var e = $.Event('mousemove', {pageX: startLeft + 2, pageY: startTop + 1});
            $(document).trigger(e);

            rect = $operator.siblings(".operator")[0].getBoundingClientRect();
            var e = $.Event('mouseup', {pageX: rect.left, pageY: rect.top});
            $(document).trigger(e);

            expect($dfWrap.find(".secondarySvg").length).to.equal(0);

            expect(called).to.be.true;
            dagView.connectNodes = cacheFn;
        });

        it("DagViewManager.Instance.connectNodes should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const $child = $operator.siblings(".operator");
            const parentId = $operator.data("nodeid");
            const childId = $child.data("nodeid");
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            DagViewManager.Instance.connectNodes(parentId, childId, 0, tabId)
            .always(function() {
                const dag = DagViewManager.Instance.getActiveDag();
                expect(dag.getNode(parentId).children.length).to.equal(1);
                expect(dag.getNode(parentId).parents.length).to.equal(0);
                expect(dag.getNode(childId).parents.length).to.equal(1);
                expect(dag.getNode(childId).children.length).to.equal(0);
                expect($dfArea.find(".edgeSvg .edge").length).to.equal(1);
                done();
            });
        });
        it("DagViewManager.Instance.disconnectNodes should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const $child = $operator.siblings(".operator");
            const parentId = $operator.data("nodeid");
            const childId = $child.data("nodeid");
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            DagViewManager.Instance.disconnectNodes(parentId, childId, 0, tabId)
            .always(function() {
                const dag = DagViewManager.Instance.getActiveDag();
                expect(dag.getNode(parentId).children.length).to.equal(0);
                expect(dag.getNode(childId).parents.length).to.equal(0);
                expect($dfArea.find(".edgeSvg .edge").length).to.equal(0);
                done();
            });
        });
    });

    describe("delete nodes", function() {
        let idCache = [];
        before(function() {
            const dag = DagViewManager.Instance.getActiveDag();
            const nodes = dag.getAllNodes();
            nodes.forEach((node) => {
                idCache.push(node.getId());
            });
        })
        it("delete should work", function(done) {
            expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(2);
            const dag = DagViewManager.Instance.getActiveDag();
            let nodes = dag.getAllNodes();
            let nodeIds = [];
            nodes.forEach((node) => {
                nodeIds.push(node.getId());
            });
            DagViewManager.Instance.removeNodes(nodeIds, dag.getTabId())
            .always(function() {
                nodes = dag.getAllNodes();
                let nodeIds = [];
                nodes.forEach((node) => {
                    nodeIds.push(node.getId());
                });
                expect(nodeIds.length).to.equal(0);
                expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(0);

                done();
            });
        });
        it("add back should work", function(done) {
            DagViewManager.Instance.addBackNodes(idCache, tabId)
            .always(function() {
                expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(2);
                const dag = DagViewManager.Instance.getActiveDag();
                let nodes = dag.getAllNodes();
                let nodeIds = [];
                nodes.forEach((node) => {
                    nodeIds.push(node.getId());
                });
                expect(nodeIds.length).to.equal(2);
                done();
            });
        });
    });

    // describe("drag select", function() {
    //     it("drag select should select all nodes", function() {
    //         $dfWrap.find(".operator").removeClass("selected");
    //         expect($dfWrap.find(".operator.selected").length).to.equal(0);
    //         let e = $.Event('mousedown', {pageX: 800, pageY: 500, which: 1,
    //                     target: $dfWrap.find(".dataflowArea.active")});
    //         $dfWrap.trigger(e);
    //         e = $.Event('mousemove', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         e = $.Event('mousemove', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         e = $.Event('mouseup', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         expect($dfWrap.find(".operator.selected").length).to.equal(2);
    //     });
    // });

    describe("node description", function() {
        it("editDescription should work", function() {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            expect($operator.hasClass("hasDescription")).to.be.false;
            expect($operator.find(".descriptionIcon").length).to.equal(0);

            const nodeId = $operator.data('nodeid');
            DagViewManager.Instance.editDescription(nodeId, "test");
            const node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
            expect(node.getDescription()).to.equal("test");
            expect($operator.hasClass("hasDescription")).to.be.true;
            expect($operator.find(".descriptionIcon").length).to.equal(1);
        });

        it("editDescription with no value should work", function() {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            expect($operator.hasClass("hasDescription")).to.be.true;
            expect($operator.find(".descriptionIcon").length).to.equal(1);

            const nodeId = $operator.data('nodeid');
            DagViewManager.Instance.editDescription(nodeId, "");
            const node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
            expect(node.getDescription()).to.equal("");
            expect($operator.hasClass("hasDescription")).to.be.false;
            expect($operator.find(".descriptionIcon").length).to.equal(0);
        });
    });

    // move the first operator element which happens to be node 2
    describe("node title", function() {
        let node;
        let $operator;

        before(function() {
            $operator = $dfArea.find(".operator").eq(0);
            const nodeId = $operator.data("nodeid");
            node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        });

        it("node title should have no change", function() {
            expect($operator.find(".nodeTitle")).to.be.visible;
            expect($operator.find(".nodeTitle").text()).to.equal("Node 2");
            expect(node.hasTitleChange).to.be.false;
            expect($dfArea.find("textarea.editableNodeTitle").length).to.equal(0);
        });

        it("dbl clicking on nodeTitle should trigger text area", function() {
            $operator.find(".nodeTitle").dblclick();
            expect($operator.find(".nodeTitle")).to.not.be.visible;
            expect($dfArea.find("textarea.editableNodeTitle").length).to.equal(1);
            expect($dfArea.find("textarea.editableNodeTitle").val()).to.equal("Node 2");
        });

        it("edit title should work", function(done) {
            $dfArea.find("textarea.editableNodeTitle").val("newTitle");
            $(document).focus();
            $("input:visible").focus();
            $dfArea.find("textarea.editableNodeTitle").trigger("blur");
            $dfArea.trigger(fakeEvent.mousedown);
            UnitTest.testFinish(function() {
                return $dfArea.find("textarea.editableNodeTitle").length === 0;
            })
            .then(function() {
                expect($dfArea.find("textarea.editableNodeTitle").length).to.equal(0);
                expect(node.getTitle()).to.equal("newTitle");
                expect($operator.find(".nodeTitle")).to.be.visible;
                expect($operator.find(".nodeTitle").text()).to.equal("newTitle");
                expect(node.hasTitleChange).to.be.true;
                done();
            })
            .fail(function() {
                done("fail")
            });
        });
    });

    describe("preview table", () => {
        let graph;
        let node;
        let table;
        let oldShow;

        before(() => {
            graph = DagViewManager.Instance.getActiveDag();
            node = DagNodeFactory.create({type: DagNodeType.Dataset});
            graph.addNode(node);
            table = xcHelper.randName("test#abc")
            node.setTable(table);
            oldShow = DagTable.Instance._show;
        });

        it("should show table", (done) => {
            let test = false;
            DagTable.Instance._show = () => {
                test = true;
                return PromiseHelper.resolve();
            }
            DagViewManager.Instance.viewResult(node)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should show alert in error case", (done) => {
            DagTable.Instance._show = () => {
                return PromiseHelper.reject("test");
            }
            DagViewManager.Instance.viewResult(node)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                UnitTest.hasAlertWithText("test");
                done();
            });
        });

        it("should show alert in error code", (done) => {
            node.setTable("");
            DagViewManager.Instance.viewResult(node)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                UnitTest.hasAlertWithText(ErrTStr.Unknown);
                done();
            });
        });

        after(() => {
            graph.removeNode(node.getId());
            DagTable.Instance._show = oldShow;
        });
    });

    describe("Dag Progress", () => {
        let nodeId;
        let $node;
        let tabId;

        before(() => {
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            const newNodeInfo = {
                type: "filter",
                display: {
                    x: 20,
                    y: 20
                }
            };
            const node = DagViewManager.Instance.newNode(newNodeInfo);
            nodeId = node.getId();
            $node = DagViewManager.Instance.getNode(nodeId);
        });

        it("should add progress", () => {
            DagViewManager.Instance.addProgressPct(nodeId, tabId);
            expect($node.find(".opProgress").text()).to.equal("0%");
        });

        it("should update operation time", function() {
            let dagView = DagViewManager.Instance.getActiveDagView();
            let cachedFn = dagView.updateOperationTime;
            let called = false;
            dagView.updateOperationTime = function() {
                called = true;
            }

            dagView.updateNodeProgress(nodeId, tabId, {state: 5, curStep: 1, started: true}, [], [10], false);

            expect(called).to.be.true;
            expect(dagView.graph.getOperationTime()).to.equal(10);

            dagView.updateOperationTime = cachedFn;
        });

        it("should remove progress", () => {
            DagViewManager.Instance.removeProgressPct(nodeId, tabId);
            expect($node.find(".opProgress").length).to.equal(0);
        });

        after(() => {
            DagViewManager.Instance.removeNodes([nodeId], tabId);
        });
    });

    // XXX test is really simple, need to test complex cases
    describe("align nodes", function() {
        let node1;
        let node2;
        let node3;
        let tabId;
        before(function() {
            const newNodeInfo = {
                type: "map",
                display: {
                    x: 200,
                    y: 40
                }
            };
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            DagViewManager.Instance.newNode(newNodeInfo);
            node1 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
            node2 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));
            node3 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.map").data("nodeid"));
        });
        it("should align in a straight vertical line", function() {
            DagViewManager.Instance.autoAlign(DagViewManager.Instance.getActiveDag().getTabId());
            expect(node1.getPosition().x).to.equal(40);
            expect(node2.getPosition().x).to.equal(40);
            expect(node3.getPosition().x).to.equal(40);
            expect(node1.getPosition().y).to.equal(40);
            expect(node2.getPosition().y).to.equal(100);
            expect(node3.getPosition().y).to.equal(160);
        });
        it("should align in a straight horizontal line when connected", function() {
            DagViewManager.Instance.connectNodes(node2.getId(), node1.getId(), 0, tabId);
            DagViewManager.Instance.connectNodes(node1.getId(), node3.getId(), 0, tabId);
            DagViewManager.Instance.autoAlign(DagViewManager.Instance.getActiveDag().getTabId());
            expect(node1.getPosition().y).to.equal(40);
            expect(node2.getPosition().y).to.equal(40);
            expect(node3.getPosition().y).to.equal(40);

            expect(node2.getPosition().x).to.equal(40);
            expect(node1.getPosition().x).to.equal(180);
            expect(node3.getPosition().x).to.equal(320);
        });

        // undo repositioning , connection of nodes, addition of a node
        after(function(done) {
            Log.undo(5)
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            });
        });
    });

    describe("align nodes complex", function() {
        let graph;
        before(function() {
            let graphMeta = {
                "version": 1,
                "nodes": [
                    {
                        "version": 1,
                        "type": "join",
                        "subType": null,
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 2",
                        "hasTitleChange": false,
                        "input": {
                            "joinType": "innerJoin",
                            "left": {
                                "columns": [
                                    "flight2373::ActualElapsedTime"
                                ],
                                "keepColumns": [],
                                "rename": []
                            },
                            "right": {
                                "columns": [
                                    "class_name-split-1"
                                ],
                                "keepColumns": [
                                    "class_name-split-1",
                                    "classes::class_id",
                                    "classes::class_name"
                                ],
                                "rename": []
                            },
                            "evalString": "",
                            "nullSafe": false,
                            "keepAllColumns": false
                        },
                        "id": "dag_5CABD7531B05A85D_1555095773638_37",
                        "state": "Configured",
                        "configured": true,
                        "aggregates": [],
                        "parents": [
                            "dag_5CABD7531B05A85D_1555095778205_38",
                            "dag_5CABD7531B05A85D_1555095954069_40"
                        ]
                    },
                    {
                        "version": 1,
                        "type": "dataset",
                        "subType": null,
                        "table": "table_DF2_5CABD7531B05A85D_1555095768253_0_dag_5CABD7531B05A85D_1555095778205_38#t_1555098028362_1",
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 3",
                        "hasTitleChange": false,
                        "input": {
                            "source": "rudy.70327.flight2373",
                            "prefix": "flight2373",
                            "synthesize": false,
                            "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"rudy.70327.flight2373\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/flight/airlines\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\n\\\",\\\"fieldDelim\\\":\\\",\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CheckSum\",\n                        \"destColumn\": \"CheckSum\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Timestamp\",\n                        \"destColumn\": \"Timestamp\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Category\",\n                        \"destColumn\": \"Category\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Towers\",\n                        \"destColumn\": \"Towers\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"TypeOfInformation\",\n                        \"destColumn\": \"TypeOfInformation\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Year\",\n                        \"destColumn\": \"Year\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Month\",\n                        \"destColumn\": \"Month\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DayofMonth\",\n                        \"destColumn\": \"DayofMonth\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DayOfWeek\",\n                        \"destColumn\": \"DayOfWeek\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DepTime\",\n                        \"destColumn\": \"DepTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSDepTime\",\n                        \"destColumn\": \"CRSDepTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"ArrTime\",\n                        \"destColumn\": \"ArrTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSArrTime\",\n                        \"destColumn\": \"CRSArrTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"UniqueCarrier\",\n                        \"destColumn\": \"UniqueCarrier\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"FlightNum\",\n                        \"destColumn\": \"FlightNum\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TailNum\",\n                        \"destColumn\": \"TailNum\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"ActualElapsedTime\",\n                        \"destColumn\": \"ActualElapsedTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSElapsedTime\",\n                        \"destColumn\": \"CRSElapsedTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"AirTime\",\n                        \"destColumn\": \"AirTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"ArrDelay\",\n                        \"destColumn\": \"ArrDelay\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"DepDelay\",\n                        \"destColumn\": \"DepDelay\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Origin\",\n                        \"destColumn\": \"Origin\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Dest\",\n                        \"destColumn\": \"Dest\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Distance\",\n                        \"destColumn\": \"Distance\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TaxiIn\",\n                        \"destColumn\": \"TaxiIn\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TaxiOut\",\n                        \"destColumn\": \"TaxiOut\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Cancelled\",\n                        \"destColumn\": \"Cancelled\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CancellationCode\",\n                        \"destColumn\": \"CancellationCode\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Diverted\",\n                        \"destColumn\": \"Diverted\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CarrierDelay\",\n                        \"destColumn\": \"CarrierDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"WeatherDelay\",\n                        \"destColumn\": \"WeatherDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"NASDelay\",\n                        \"destColumn\": \"NASDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"SecurityDelay\",\n                        \"destColumn\": \"SecurityDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"LateAircraftDelay\",\n                        \"destColumn\": \"LateAircraftDelay\",\n                        \"columnType\": \"DfInt64\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                        },
                        "id": "dag_5CABD7531B05A85D_1555095778205_38",
                        "state": "Complete",
                        "configured": true,
                        "aggregates": [],
                        "schema": [],
                        "parents": []
                    },
                    {
                        "version": 1,
                        "type": "split",
                        "subType": null,
                        "table": "table_DF2_5CABD7531B05A85D_1555095768253_0_dag_5CABD7531B05A85D_1555095954069_40#t_1555107476331_0",
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 5",
                        "hasTitleChange": false,
                        "input": {
                            "eval": [
                                {
                                    "evalString": "cut(classes::class_name,1,\"a\")",
                                    "newField": "class_name-split-1"
                                }
                            ],
                            "icv": false
                        },
                        "id": "dag_5CABD7531B05A85D_1555095954069_40",
                        "state": "Complete",
                        "configured": true,
                        "aggregates": [],
                        "parents": [
                            "dag_5CABD7531B05A85D_1555097830382_36"
                        ]
                    },
                    {
                        "version": 1,
                        "type": "dataset",
                        "subType": null,
                        "table": "table_DF2_5CABD7531B05A85D_1555095768253_0_dag_5CABD7531B05A85D_1555097830382_36#t_1555099864315_0",
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 4",
                        "hasTitleChange": false,
                        "input": {
                            "source": "rudy.10997.classes",
                            "prefix": "classes",
                            "synthesize": false,
                            "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"rudy.10997.classes\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/indexJoin/classes/classes.json\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseJson\",\n                \"parserArgJson\": \"{}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                        },
                        "id": "dag_5CABD7531B05A85D_1555097830382_36",
                        "state": "Complete",
                        "configured": true,
                        "aggregates": [],
                        "schema": [
                            {
                                "name": "class_name",
                                "type": "string"
                            },
                            {
                                "name": "class_id",
                                "type": "integer"
                            }
                        ],
                        "parents": []
                    },
                    {
                        "version": 1,
                        "type": "filter",
                        "subType": null,
                        "table": "table_DF2_5CABD7531B05A85D_1555095768253_0_dag_5CABD7531B05A85D_1555102509658_37#t_1555108259735_0",
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 5",
                        "hasTitleChange": false,
                        "input": {
                            "evalString": "eq(1, 1)"
                        },
                        "id": "dag_5CABD7531B05A85D_1555102509658_37",
                        "state": "Complete",
                        "configured": true,
                        "aggregates": [],
                        "parents": [
                            "dag_5CABD7531B05A85D_1555097830382_36"
                        ]
                    },
                    {
                        "version": 1,
                        "type": "Jupyter",
                        "subType": null,
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 7",
                        "hasTitleChange": false,
                        "input": {
                            "numExportRows": 1000,
                            "renames": []
                        },
                        "id": "dag_5CABD7531B05A85D_1555102717675_38",
                        "state": "Unused",
                        "configured": false,
                        "aggregates": [],
                        "parents": [
                            "dag_5CABD7531B05A85D_1555095773638_37"
                        ]
                    },
                    {
                        "version": 1,
                        "type": "filter",
                        "subType": null,
                        "table": "table_DF2_5CABD7531B05A85D_1555095768253_0_dag_5CABD7531B05A85D_1555107981101_36#t_1555108259739_1",
                        "display": {
                            "x": 0,
                            "y": 0
                        },
                        "description": "",
                        "title": "Node 7",
                        "hasTitleChange": false,
                        "input": {
                            "evalString": "eq(1, 1)"
                        },
                        "id": "dag_5CABD7531B05A85D_1555107981101_36",
                        "state": "Complete",
                        "error": "Requires 1 parents",
                        "configured": true,
                        "aggregates": [],
                        "parents": [
                            "dag_5CABD7531B05A85D_1555102509658_37"
                        ]
                    }
                ],
                "comments": [],
                "display": {
                    "width": 0,
                    "height": 0,
                    "scale": 1
                },
                "operationTime": 0
            };
            graph = new DagGraph();
            graph.create(graphMeta);
        });

        it("should align correctly", function() {
            let hasTips = $("#dagView").hasClass("showProgressTips");
            $("#dagView").removeClass("showProgressTips");
            let ret = DagView.getAutoAlignPositions(graph);
            expect(ret).to.deep.equal({
                "nodeInfos": [
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555102717675_38",
                        "position": {
                            "x": 460,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095773638_37",
                        "position": {
                            "x": 320,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095778205_38",
                        "position": {
                            "x": 180,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095954069_40",
                        "position": {
                            "x": 180,
                            "y": 100
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555097830382_36",
                        "position": {
                            "x": 40,
                            "y": 100
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555102509658_37",
                        "position": {
                            "x": 180,
                            "y": 160
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555107981101_36",
                        "position": {
                            "x": 320,
                            "y": 160
                        }
                    }
                ],
                "maxX": 440,
                "maxY": 140
            });

            $("#dagView").addClass("showProgressTips");
            ret = DagView.getAutoAlignPositions(graph);
            expect(ret).to.deep.equal({
                "nodeInfos": [
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555102717675_38",
                        "position": {
                            "x": 460,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095773638_37",
                        "position": {
                            "x": 320,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095778205_38",
                        "position": {
                            "x": 180,
                            "y": 40
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555095954069_40",
                        "position": {
                            "x": 180,
                            "y": 140
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555097830382_36",
                        "position": {
                            "x": 40,
                            "y": 140
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555102509658_37",
                        "position": {
                            "x": 180,
                            "y": 240
                        }
                    },
                    {
                        "type": "dagNode",
                        "id": "dag_5CABD7531B05A85D_1555107981101_36",
                        "position": {
                            "x": 320,
                            "y": 240
                        }
                    }
                ],
                "maxX": 440,
                "maxY": 220
            });
            if (!hasTips) {
                $("#dagView").removeClass("showProgressTips");
            }
        });
    });

    describe("copy/cut and paste", function() {
        let node1;
        let node2;
        let tabId;
        let copy;
        before(function() {
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            node1 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
            node2 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));
        });

        it("should copy", function() {
            DagViewManager.Instance.selectNodes(tabId, [node1.getId(), node2.getId()]);
            copy = DagViewManager.Instance.copyNodes([node1.getId(), node2.getId()]);
            copy = JSON.parse(copy);
            expect(copy.length).to.equal(2);
            expect(copy[0].type).to.equal("filter");
            expect(copy[0].display.x).to.equal(20);
            expect(copy[0].display.y).to.equal(20);
            expect(copy[0].nodeId.length).to.be.gt(10);
            expect(copy[0].parents.length).to.equal(0);

            expect(copy[1].type).to.equal("dataset");
            expect(copy[1].display.x).to.equal(220);
            expect(copy[1].display.y).to.equal(240);
            expect(copy[1].nodeId.length).to.be.gt(10);
            expect(copy[1].parents.length).to.equal(0);
        });

        it("should copy connected nodes", function() {
            DagViewManager.Instance.connectNodes(node2.getId(), node1.getId(), 0, tabId);
            copy = DagViewManager.Instance.copyNodes([node1.getId(), node2.getId()]);
            copy = JSON.parse(copy);
            expect(copy.length).to.equal(2);
            expect(copy[0].type).to.equal("filter");
            expect(copy[0].display.x).to.equal(20);
            expect(copy[0].display.y).to.equal(20);
            expect(copy[0].nodeId.length).to.be.gt(10);
            expect(copy[0].parents.length).to.equal(1);
            expect(copy[0].parents[0]).to.equal(node2.getId());

            expect(copy[1].type).to.equal("dataset");
            expect(copy[1].display.x).to.equal(220);
            expect(copy[1].display.y).to.equal(240);
            expect(copy[1].nodeId.length).to.be.gt(10);
            expect(copy[1].parents.length).to.equal(0);
        });

        it("should not copy parent id if selecting 1 node", function() {
            copy = DagViewManager.Instance.copyNodes([node1.getId()]);
            copy = JSON.parse(copy);
            expect(copy.length).to.equal(1);
            expect(copy[0].type).to.equal("filter");
            expect(copy[0].display.x).to.equal(20);
            expect(copy[0].display.y).to.equal(20);
            expect(copy[0].nodeId.length).to.be.gt(10);
            expect(copy[0].parents.length).to.equal(0);
        });

        it("cut should work", function() {
            expect($dfArea.find(".operator").length).to.equal(2);
            copy = DagViewManager.Instance.cutNodes([node1.getId(), node2.getId()]);
            copy = JSON.parse(copy);
            expect($dfArea.find(".operator").length).to.equal(0);

            expect(copy.length).to.equal(2);
            expect(copy[0].type).to.equal("filter");
            expect(copy[0].display.x).to.equal(20);
            expect(copy[0].display.y).to.equal(20);
            expect(copy[0].nodeId.length).to.be.gt(10);
            expect(copy[0].parents.length).to.equal(1);
            expect(copy[0].parents[0]).to.equal(node2.getId());

            expect(copy[1].type).to.equal("dataset");
            expect(copy[1].display.x).to.equal(220);
            expect(copy[1].display.y).to.equal(240);
            expect(copy[1].nodeId.length).to.be.gt(10);
            expect(copy[1].parents.length).to.equal(0);
        });

        it("paste should work", function() {
            expect($dfArea.find(".operator").length).to.equal(0);
            let dagView = DagViewManager.Instance.getActiveDagView();
            dagView.pasteNodes(copy);
            expect($dfArea.find(".operator").length).to.equal(2);
            let node1b = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
            let node2b = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));
            expect(node1b.getId()).to.not.equal(node1.getId());
            expect(node2b.getId()).to.not.equal(node2.getId());

            expect(node1b.getPosition().x).to.equal(node1.getPosition().x + 100);
            expect(node1b.getPosition().y).to.equal(node1.getPosition().y + 40);
            expect(node2b.getPosition().x).to.equal(node2.getPosition().x + 100);
            expect(node2b.getPosition().y).to.equal(node2.getPosition().y + 40);
        });

        it("paste validation should work", function() {
            let dagView = DagViewManager.Instance.getActiveDagView();
            let validate = dagView.validateAndPaste;
            validate("x");
            UnitTest.hasStatusBoxWithError("Cannot paste invalid format. Nodes must be in a valid JSON format.");

            validate('{"x": 1}');
            UnitTest.hasStatusBoxWithError("Dataflow nodes must be in an array.");

            validate('[{"x": 1}]');
            UnitTest.hasStatusBoxWithError("Node should have required property 'type'");

            validate('[{"type": "filter"}]');
            UnitTest.hasStatusBoxWithError("Filter node: Node should have required property 'display'");

            validate('[{"type": "filter", "display": {"x":20, "y":20}, "nodeId": "a", "input":null, "parents":[], "configured":true}]');
            UnitTest.hasStatusBoxWithError('Filter node: input should be object');

            validate('[{"type": "filter", "display": {"x":20, "y":20}, "nodeId": "a", "input":{}, "parents":["b", "c"], "configured":true}]');
            UnitTest.hasStatusBoxWithError('Filter node: parents should NOT have more than 1 items');

            expect($("#statusBox")).to.be.visible;
            StatusBox.forceHide();

            validate.call(dagView, '[{"type": "filter", "display": {"x":20, "y":20}, "nodeId": "a", "input":{}, "parents":["b"], "configured":true}]');
            expect($("#statusBox")).to.not.be.visible;
        });

        after(function(done) {
            Log.undo(4)
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            });
        });
    });

    describe("custom node", function() {
        let node1;
        let node2;
        let node3;
        let tabId;
        let customNode;
        before(function() {
            const newNodeInfo = {
                type: "map",
                display: {
                    x: 200,
                    y: 40
                }
            };
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            DagViewManager.Instance.newNode(newNodeInfo);
            node1 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
            node2 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));
            node3 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.map").data("nodeid"));
            DagViewManager.Instance.autoAlign(DagViewManager.Instance.getActiveDag().getTabId());
        });

        it ("should create custom node from 1 node", function() {
            expect($dfArea.find(".operator.filter").length).to.equal(1);
            expect($dfArea.find(".operator.custom").length).to.equal(0);
            DagViewManager.Instance.wrapCustomOperator([node1.getId()]);
            expect($dfArea.find(".operator.filter").length).to.equal(0);
            expect($dfArea.find(".operator.custom").length).to.equal(1);
            customNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.custom").data("nodeid"));
        });

        it("custom node should have correct properties", function() {
            expect(customNode.getPosition().x).to.equal(node1.getPosition().x);
            expect(customNode.getPosition().y).to.equal(node1.getPosition().y);
            expect(customNode.getParents().length).to.equal(0);
            expect(customNode.getChildren().length).to.equal(0);
            expect(customNode.getSubGraph().nodesMap.size).to.equal(3);
            const custFilters = customNode.getSubGraph().getNodesByType("filter");
            expect(custFilters.length).to.equal(1);
            expect(custFilters[0].getParents().length).to.equal(1);
            expect(custFilters[0].getParents()[0].type).to.equal("customInput");
            expect(custFilters[0].getChildren().length).to.equal(1);
            expect(custFilters[0].getChildren()[0].type).to.equal("customOutput");
        });

        it ("expand should work", function(done) {
            DagViewManager.Instance.expandCustomNode(customNode.getId())
            .then(function() {
                expect($dfArea.find(".operator.filter").length).to.equal(1);
                expect($dfArea.find(".operator.custom").length).to.equal(0);
                node1b = node1;
                node1 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
                expect(node1.getId()).to.not.equal(node1b.getId());
                expect(node1.getPosition().x).to.equal(node1b.getPosition().x);
                expect(node1.getPosition().y).to.equal(node1b.getPosition().y);
                expect(node1.getParents().length).to.equal(0);
                expect(node1.getChildren().length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // XXX TODO: Need to verify the correctness once the previous tests are fixed
        it.skip("share should work", function(done) {
            let optionsPassedIn;
            const oldAddOperator = DagCategoryBar.prototype.addOperator;
            DagCategoryBar.prototype.addOperator = (options) => {
                optionsPassedIn = options;
                return PromiseHelper.resolve('TestCustomNode');
            };

            DagViewManager.Instance.shareCustomOperator(customNode.getId())
            .then(() => {
                const expectedOptions = {
                    categoryType: DagCategoryType.Custom,
                    dagNode: customNode,
                    isFocusCategory: true
                };
                expect(optionsPassedIn).to.deep.equal(expectedOptions);
            })
            .fail(() => {
                assert.fail('Should not fail');
            })
            .always(() => {
                DagCategoryBar.prototype.addOperator = oldAddOperator;
                done();
            });
        });

        describe("wrap/expand node with 1 parent, 1 child", function() {
            before(function() {
                DagViewManager.Instance.connectNodes(node2.getId(), node1.getId(), 0, tabId);
                DagViewManager.Instance.connectNodes(node1.getId(), node3.getId(), 0, tabId);
            });

            it ("should create custom node", function() {
                expect($dfArea.find(".operator.filter").length).to.equal(1);
                expect($dfArea.find(".operator.custom").length).to.equal(0);
                DagViewManager.Instance.wrapCustomOperator([node1.getId()]);
                expect($dfArea.find(".operator.filter").length).to.equal(0);
                expect($dfArea.find(".operator.custom").length).to.equal(1);
                customNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.custom").data("nodeid"));
            });

            it("custom node should have correct properties", function() {
                expect(customNode.getPosition().x).to.equal(node1.getPosition().x);
                expect(customNode.getPosition().y).to.equal(node1.getPosition().y);
                expect(customNode.getParents().length).to.equal(1);
                expect(customNode.getParents()[0].getId()).to.equal(node2.getId());
                expect(customNode.getChildren().length).to.equal(1);
                expect(customNode.getChildren()[0].getId()).to.equal(node3.getId());

                expect(customNode.getSubGraph().nodesMap.size).to.equal(3);
                const custFilters = customNode.getSubGraph().getNodesByType("filter");
                expect(custFilters.length).to.equal(1);
                expect(custFilters[0].getParents().length).to.equal(1);
                expect(custFilters[0].getParents()[0].type).to.equal("customInput");
                expect(custFilters[0].getChildren().length).to.equal(1);
                expect(custFilters[0].getChildren()[0].type).to.equal("customOutput");
            });

            it ("expand should work", function(done) {
                DagViewManager.Instance.expandCustomNode(customNode.getId())
                .then(function() {
                    expect($dfArea.find(".operator.filter").length).to.equal(1);
                    expect($dfArea.find(".operator.custom").length).to.equal(0);
                    node1b = node1;
                    node1 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));
                    expect(node1.getId()).to.not.equal(node1b.getId());

                    expect(node1.getPosition().x).to.equal(node1b.getPosition().x);
                    expect(node1.getPosition().y).to.equal(node1b.getPosition().y);

                    expect(node1.getParents().length).to.equal(1);
                    expect(node1.getParents()[0].getId()).to.equal(node2.getId());

                    expect(node1.getChildren().length).to.equal(1);
                    expect(node1.getChildren()[0].getId()).to.equal(node3.getId());
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });
        });
    });

    describe("auto add node", function() {
        let node3;
        let node4;
        before(function() {
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            node3 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.map").data("nodeid"));
        });
        it("should add groupby node", function(done) {
            expect($dfArea.find(".operator").length).to.equal(3);
            expect($dfArea.find(".operator.groupBy").length).to.equal(0);
            DagViewManager.Instance.autoAddNode("groupBy");
            expect($dfArea.find(".operator").length).to.equal(4);
            expect($dfArea.find(".operator.groupBy").length).to.equal(1);
            node4 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.groupBy").data("nodeid"));
            expect(node4.getPosition().x).to.be.gt(100);
            expect(node4.getPosition().y).to.be.gt(40);
            expect(node4.getPosition().x).to.be.lt(10000);
            expect(node4.getPosition().y).to.be.lt(10000);
            expect(node4.getParents().length).to.equal(0);
            expect(node4.getChildren().length).to.equal(0);
            Log.undo()
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it ("should add groupby node as child of map node", function(done) {
            expect($dfArea.find(".operator").length).to.equal(3);
            expect($dfArea.find(".operator.groupBy").length).to.equal(0);
            DagViewManager.Instance.autoAddNode("groupBy", null, node3.getId(),
            {"groupBy":[""],"aggregate":[{"operator":"","sourceColumn":"","destColumn":"","distinct":false,"cast":null}],"includeSample":false,"joinBack":false,"icv":false,"groupAll":false,"newKeys":[],"dhtName":""});
            expect($dfArea.find(".operator").length).to.equal(4);
            expect($dfArea.find(".operator.groupBy").length).to.equal(1);
            node4 = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.groupBy").data("nodeid"));
            expect(node4.getParents().length).to.equal(1);
            expect(node4.getParents()[0].getId()).to.equal(node3.getId());
            expect(node4.getChildren().length).to.equal(0);

            Log.undo()
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            });
        });
    });

    describe("zoom", function() {
        it("should zoom in", function(){
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1);
            DagViewManager.Instance.zoom(null, 1.6);
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1.6);
        });
        it("should zoom out", function() {
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1.6);
            DagViewManager.Instance.zoom(false);
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1.5);
        });
        it("should zoom out", function() {
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1.5);
            DagViewManager.Instance.zoom(false);
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1);
        });
        it("should zoom out", function() {
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1);
            DagViewManager.Instance.zoom(false);
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(0.75);
        });
        it("should zoom in", function() {
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(0.75);
            DagViewManager.Instance.zoom(true);
            expect(DagViewManager.Instance.getActiveDag().getScale()).to.equal(1);
        });
    });

    describe("comment", function() {
        it("new comment should work", function() {
            expect($dfArea.find(".comment").length).to.equal(0);
            DagViewManager.Instance.newComment({
                display: {x: 60, y:50}, text: "hello"
            });
            expect($dfArea.find(".comment").length).to.equal(1);
            expect($dfArea.find(".comment").text()).to.equal("hello");
            expect($dfArea.find(".comment").css("left")).to.equal("60px");
            expect($dfArea.find(".comment").css("top")).to.equal("60px");
        });
        it("should remove comment", function(){
            expect($dfArea.find(".comment").length).to.equal(1);
            let commentId = $dfArea.find(".comment").data("nodeid");
            DagViewManager.Instance.removeNodes([commentId], tabId);
            expect($dfArea.find(".comment").length).to.equal(0);
        });
    });

    describe("sql node", function() {
        let datasetNode;
        let sqlNode;
        let synthesizeNode;
        let filter2Node;

        before(function() {
            console.log("SQL Node test");
            // setup dataset node for sql test should work
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            datasetNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));
            let loadArgs = "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"testXtest.08604.classes\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/indexJoin/classes/classes.json\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseJson\",\n                \"parserArgJson\": \"{}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}";

            datasetNode.setParam({"source":"testXtest.08604.classes",
                "prefix":"classes",
                "synthesize":false,
                "loadArgs": loadArgs,
                "schema":[{"name":"classes::class_name","type":"string"},{"name":"classes::class_id","type":"integer"}]
            });
            datasetNode.schema = [{"name":"class_name","type":"string"}
                ,{"name":"class_id","type":"integer"}];
        });

        it("inspect should work", function(done) {
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            datasetNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));

            const newNodeInfo = {
                type: "sql",
                display: {
                    x: 20,
                    y: 20
                }
            };
            DagViewManager.Instance.newNode(newNodeInfo);
            sqlNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.sql").data("nodeid"));
            DagViewManager.Instance.connectNodes(datasetNode.getId(), sqlNode.getId(), 0, tabId);
            DagViewManager.Instance.autoAlign(tabId);

            const xcQueryString = JSON.stringify([
                {
                    "operation": "XcalarApiSynthesize",
                    "args": {
                        "source": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904757568_0",
                        "dest": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                        "columns": [
                            {
                                "sourceColumn": "classes::class_name",
                                "destColumn": "CLASS_NAME",
                                "columnType": "DfString"
                            },
                            {
                                "sourceColumn": "classes::class_id",
                                "destColumn": "CLASS_ID",
                                "columnType": "DfInt64"
                            }
                        ],
                        "sameSession": true,
                        "numColumns": 2
                    }
                },
                {
                    "operation": "XcalarApiFilter",
                    "args": {
                        "source": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                        "dest": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759453_2",
                        "eval": [
                            {
                                "evalString": "gt(CLASS_ID,2)",
                                "newField": null
                            }
                        ]
                    }
                },
                {
                    "operation": "XcalarApiDeleteObjects",
                    "args": {
                        "namePattern": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                        "srcType": "Table"
                    }
                }
            ]);

            sqlNode.setXcQueryString(xcQueryString);
            sqlNode.setIdentifiers(new Map([[1, "a"]]));
            sqlNode.setTableSrcMap({"table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904757568_0": 1});
            sqlNode.setNewTableName("table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759453_2");
            sqlNode.setParam({
                "sqlQueryStr": "SELECT * FROM a WHERE class_id > 2",
                "identifiers": {
                    "1": "a"
                },
                "identifiersOrder": [
                    1
                ],
                "dropAsYouGo": true
            });
            sqlNode.updateSubGraph();
            sqlNode.beConfiguredState();
            let numTabs = $dagView.find(".dagTab").length;
            DagViewManager.Instance.inspectSQLNode(sqlNode.getId(), tabId)
            .then(function() {
                $dfArea = $dfWrap.find(".dataflowArea.active");
                expect($dagView.find(".dagTab").length).to.equal(numTabs + 1);
                expect($dfArea.find(".operator").length).to.equal(4);
                expect($dfArea.find(".operator.synthesize").length).to.equal(1);
                expect($dfArea.find(".operator.SQLSubInput").length).to.equal(1);
                expect($dfArea.find(".operator.SQLSubOutput").length).to.equal(1);
                synthesizeNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.synthesize").data("nodeid"));

                expect(synthesizeNode.getParents().length).to.equal(1);
                expect(synthesizeNode.getChildren().length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it ("validate inspect tab", function() {
            let inNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.SQLSubInput").data("nodeid"));
            let outNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.SQLSubOutput").data("nodeid"));
            let filter2Node = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));

            expect(synthesizeNode.getParents()[0].getId()).to.equal(inNode.getId());
            expect(synthesizeNode.getChildren()[0].getId()).to.equal(filter2Node.getId());
            expect(filter2Node.getChildren()[0].getId()).to.equal(outNode.getId());

            expect(inNode.getPosition().x).to.equal(40);
            expect(inNode.getPosition().y).to.equal(40);
            expect(synthesizeNode.getPosition().x).to.equal(180);
            expect(synthesizeNode.getPosition().y).to.equal(40);
            expect(filter2Node.getPosition().x).to.equal(320);
            expect(filter2Node.getPosition().y).to.equal(40);
            expect(outNode.getPosition().x).to.equal(460);
            expect(outNode.getPosition().y).to.equal(40);

            $dagView.find(".dagTab").last().find(".after").click();
            $dfArea = $dfWrap.find(".dataflowArea.active");
        });

        it("expand should work", function(done) {
            DagViewManager.Instance.expandSQLNode(sqlNode.getId())
            .then(() => {
                expect($dfArea.find(".operator").length).to.equal(5);
                synthesizeNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.synthesize").data("nodeid"));
                filter2Node = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").last().data("nodeid"));
                expect(synthesizeNode.getPosition().x).to.equal(sqlNode.getPosition().x);
                expect(synthesizeNode.getPosition().y).to.equal(sqlNode.getPosition().y);
                expect(filter2Node.getPosition().x).to.equal(sqlNode.getPosition().x + 140);
                expect(filter2Node.getPosition().y).to.equal(sqlNode.getPosition().y);

                expect(synthesizeNode.getParents().length).to.equal(1);
                expect(synthesizeNode.getParents()[0].getId()).to.equal(datasetNode.getId());
                expect(synthesizeNode.getChildren()[0].getId()).to.equal(filter2Node.getId());
                done();
            })
            .fail(() => {
                done("fail");
            })
        });

        it ("undo expand should work", function(done) {
            let prevx = synthesizeNode.getPosition().x;
            let prevy = synthesizeNode.getPosition().y;
            Log.undo()
            .then(() => {
                expect($dfArea.find(".operator").length).to.equal(4);
                sqlNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.sql").data("nodeid"));
                expect(prevx).to.equal(sqlNode.getPosition().x);
                expect(prevy).to.equal(sqlNode.getPosition().y);

                expect(sqlNode.getParents().length).to.equal(1);
                expect(sqlNode.getParents()[0].getId()).to.equal(datasetNode.getId());
                expect(sqlNode.getChildren().length).to.equal(0);

                return UnitTest.testFinish(function() {
                    return $(".dataflowArea.active.locked").length === 0;
                });
            })
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            })
        });

        // skipping because jenkins sometimes fails actually sql executions
        it.skip("execute should work", function(done) {
            DagViewManager.Instance.run([sqlNode.getId()])
            .then(() => {
                let $sqlNode = $dfArea.find(".operator.sql");
                expect($sqlNode.hasClass("state-Complete"));
                const $tip = $dfArea.find('.runStats[data-id="' + sqlNode.getId() + '"]');
                expect($tip.length).to.equal(1);
                expect($tip.find("tbody tr td").first().text()).to.equal("4"); // 4 rows

                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it.skip("inspect after execute should work", function(done) {
            let numTabs = $dagView.find(".dagTab").length;
            DagViewManager.Instance.inspectSQLNode(sqlNode.getId(), tabId)
            .then(function() {
                $dfArea = $dfWrap.find(".dataflowArea.active");
                expect($dagView.find(".dagTab").length).to.equal(numTabs + 1);
                expect($dfArea.find(".operator").length).to.equal(4);
                expect($dfArea.find(".operator.synthesize").length).to.equal(1);
                expect($dfArea.find(".operator.SQLSubInput").length).to.equal(1);
                expect($dfArea.find(".operator.SQLSubOutput").length).to.equal(1);

                let synthesizeNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.synthesize").data("nodeid"));
                let filterNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.filter").data("nodeid"));

                let $synthesizeNode = $dfArea.find(".operator.synthesize");
                expect($synthesizeNode.hasClass("state-Complete"));
                let $tip = $dfArea.find('.runStats[data-id="' + synthesizeNode.getId() + '"]');
                expect($tip.length).to.equal(1);
                expect($tip.find("tbody tr td").first().text()).to.equal("6"); // 4 rows

                let $filterNode = $dfArea.find(".operator.filter");
                expect($filterNode.hasClass("state-Complete"));
                $tip = $dfArea.find('.runStats[data-id="' + filterNode.getId() + '"]');
                expect($tip.length).to.equal(1);
                expect($tip.find("tbody tr td").first().text()).to.equal("4"); // 4 rows

                $dagView.find(".dagTab").last().find(".after").click();
                $dfArea = $dfWrap.find(".dataflowArea.active");

                done();
            })
            .fail(function() {
                done("fail");
            });
        });

    });

    describe("connecting/disconnecting from sql node", function() {
        let sqlNode;
        let mapNode;
        let datasetNode;
        before(function() {
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            sqlNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.sql").data("nodeid"));
            mapNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.map").data("nodeid"));
            datasetNode = DagViewManager.Instance.getActiveDag().getNode($dfArea.find(".operator.dataset").data("nodeid"));

        });

        it("connect should work", function() {
            expect(sqlNode.getParents().length).to.equal(1);
            let $sqlNode = $dfArea.find(".operator.sql .connector.in");
            let rect = $sqlNode[0].getBoundingClientRect();
            $sqlNode.trigger($.Event('mousedown', {which: 1, pageX: rect.x + 2, pageY: rect.y + 2}));

            $(document).trigger($.Event('mousemove', {
                pageX: (rect.x + 10) + (mapNode.getPosition().x - sqlNode.getPosition().x),
                pageY: (rect.y + 10) + (mapNode.getPosition().y - sqlNode.getPosition().y)
            }));

            $(document).trigger($.Event('mousemove', {
                pageX: (rect.x + 10) + (mapNode.getPosition().x - sqlNode.getPosition().x),
                pageY: (rect.y + 10) + (mapNode.getPosition().y - sqlNode.getPosition().y)
            }));

            $(document).trigger($.Event('mouseup', {
                pageX: (rect.x + 10) + (mapNode.getPosition().x - sqlNode.getPosition().x),
                pageY: (rect.y + 10) + (mapNode.getPosition().y - sqlNode.getPosition().y)
            }));

            expect(sqlNode.getParents().length).to.equal(2);
            expect(sqlNode.getParents()[0].getId()).to.equal(datasetNode.getId());
            expect(sqlNode.getParents()[1].getId()).to.equal(mapNode.getId());
            expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"]').length).to.equal(2);
            expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"][data-parentnodeId="' + datasetNode.getId() + '"][data-connectorindex="0"]').length).to.equal(1);
            expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"][data-parentnodeId="' + mapNode.getId() + '"][data-connectorindex="1"]').length).to.equal(1);
        });

        it("disconnecting first index should work", function() {
            DagViewManager.Instance.disconnectNodes(datasetNode.getId(), sqlNode.getId(), 0, tabId);
            expect(sqlNode.getParents().length).to.equal(1);
            expect(sqlNode.getParents()[0].getId()).to.equal(mapNode.getId());
            expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"]').length).to.equal(1);
            expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"][data-parentnodeId="' + mapNode.getId() + '"][data-connectorindex="0"]').length).to.equal(1);
        });

        it("undo disconnect first index should work", function(done) {
            Log.undo()
            .then(function() {
                expect(sqlNode.getParents().length).to.equal(2);
                expect(sqlNode.getParents()[0].getId()).to.equal(datasetNode.getId());
                expect(sqlNode.getParents()[1].getId()).to.equal(mapNode.getId());
                expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"]').length).to.equal(2);
                expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"][data-parentnodeId="' + datasetNode.getId() + '"][data-connectorindex="0"]').length).to.equal(1);
                expect($dfArea.find('.edge[data-childnodeid="' + sqlNode.getId() + '"][data-parentnodeId="' + mapNode.getId() + '"][data-connectorindex="1"]').length).to.equal(1);

                done();
            })
            .fail(function() {
                done("fail");
            });
        })
    });

    it("should reset dag", () => {
        UnitTest.onMinMode();
        DagViewManager.Instance.reset();
        UnitTest.hasAlertWithTitle(DagTStr.Reset);
        UnitTest.offMinMode();
    });


    after(function(done) {
        UserSettings.getPref = cachedUserPref;
        UnitTest.offMinMode();
        const dag = DagViewManager.Instance.getActiveDag();
        const nodes = dag.getAllNodes();
        let nodeIds = [];
        nodes.forEach((node) => {
            nodeIds.push(node.getId());
        });

        let dagTab =  DagTabManager.Instance.getTabById(tabId);
        DagViewManager.Instance.removeNodes(nodeIds, dag.getTabId())
        .then(function() {
            DagTabManager.Instance.removeTab(tabId);
            return dagTab.delete();
        })
        .always(function() {
            XcalarKeyPut = oldPut;
            done();
        });
    });

    it("_convertInNodeForSQLFunc should work", function() {
        let dagView = new DagView(null, new DagGraph(), new DagTabUser());
        // case 1
        let nodeInfo = {
            type: DagNodeType.IMDTable,
            nodeId: "test",
            display: {"x": 100, "y": 10},
            input: {source: "source"}
        };
        let res = dagView._convertInNodeForSQLFunc(nodeInfo);
        expect(res.type).to.equal(DagNodeType.SQLFuncIn);
        expect(res.nodeId).to.equal("test");
        expect(res.display.x).to.equal(100);
        expect(res.display.y).to.equal(10);
        expect(res.input.source).to.equal("source");

        // case 2
        nodeInfo = {
            type: DagNodeType.Dataset,
            nodeId: "test",
            input: {source: "source"}
        };
        res = dagView._convertInNodeForSQLFunc(nodeInfo);
        expect(res.type).to.equal(DagNodeType.SQLFuncIn);
        expect(res.nodeId).to.equal("test");
        expect(res.input.source).not.to.equal("source");

        // caser 3
        nodeInfo = {
            type: DagNodeType.Filter,
            nodeId: "test"
        };
        res = dagView._convertInNodeForSQLFunc(nodeInfo);
        expect(res).to.equal(nodeInfo);

        // case 4
        res = dagView._convertInNodeForSQLFunc(null);
        expect(res).to.equal(null);
    });
});