// Tests for dagTabs.

describe('DagTab Optimized Test', function() {
    var $dagTabs;
    var $newTabButton;
    var oldPut;
    var tabId;
    var tab;
    var queryNodes;
    var cachedQueryStateFn;
    let queryStateCalled = false;

    before(function(done) {
        if (XVM.isSQLMode()) {
            $("#modeArea").click();
        }
        console.log("dag tab optimized test");
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.onMinMode();
        var dagTabManager = DagTabManager.Instance;
        let newTabId = dagTabManager.newTab();
        UnitTest.testFinish(() => {
            return $('.dataflowArea[data-id="' + newTabId + '"]').hasClass("active");
        })
        .then(() => {
            $dagTabArea = $("#dagTabSectionTabs");
            $newTabButton = $("#tabButton");
            $dagTabs = $("#dagTabSectionTabs .dagTab")
            tabId = "xcRet_" + Date.now();
            cachedQueryStateFn = XcalarQueryState;
            DagTabProgress.progressCheckInterval = 1000;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    describe("DagTabOptimized constructor", function(){
        it("should create new tab", function() {
            queryNodes = [
                {
                    "operation": "XcalarApiBulkLoad",
                    "comment": "",
                    "tag": "",
                    "state": "Created",
                    "args": {
                        "dest": ".XcalarDS.name.123.classes",
                        "loadArgs": {
                            "sourceArgsList": [
                                {
                                    "targetName": "Default Shared Root",
                                    "path": "/netstore/datasets/indexJoin/classes/classes.json",
                                    "fileNamePattern": "",
                                    "recursive": false
                                }
                            ],
                            "parseArgs": {
                                "parserFnName": "default:parseJson",
                                "parserArgJson": "{}",
                                "fileNameFieldName": "",
                                "recordNumFieldName": "",
                                "allowFileErrors": false,
                                "allowRecordErrors": false,
                                "schema": []
                            },
                            "size": 10737418240
                        }
                    },
                    "annotations": {}
                },
                {
                    "operation": "XcalarApiIndex",
                    "comment": "",
                    "tag": "",
                    "state": "Created",
                    "args": {
                        "source": ".XcalarDS.name.123.classes",
                        "dest": "table_1",
                        "key": [
                            {
                                "name": "xcalarRecordNum",
                                "keyFieldName": "xcalarRecordNum",
                                "type": "DfInt64",
                                "ordering": "Unordered"
                            }
                        ],
                        "prefix": "classes",
                        "dhtName": "",
                        "delaySort": false,
                        "broadcast": false
                    },
                    "annotations": {}
                },
                {
                    "operation": "XcalarApiExport",
                    "comment": "",
                    "tag": "",
                    "state": "Created",
                    "args": {
                        "source": "table_1",
                        "dest": ".XcalarLRQExport.table_1",
                        "columns": [
                            {
                                "columnName": "classes::class_name",
                                "headerName": "class_name"
                            },
                            {
                                "columnName": "classes::class_id",
                                "headerName": "class_id"
                            }
                        ],
                        "driverName": "do_nothing",
                        "driverParams": "{}"
                    },
                    "annotations": {}
                }
            ];
            const oldGenId = DagNode.generateId;
            let count = 0;
            DagNode.generateId = function() {
                count++;
                return "nodeId-" + count;
            };
            const executor = new DagGraphExecutor([], new DagGraph(), {});
            tab = new DagTabOptimized({
                id: tabId,
                name: "testTab",
                queryNodes: queryNodes,
                executor: executor
            });
            const graph = tab.getGraph();
            expect(graph instanceof DagSubGraph).to.be.true;
            tab.setGraph(tab.getGraph());
            DagNode.generateId = oldGenId;
        });

        it("get graph should work", function() {
            const graph = tab.getGraph();
            expect(graph instanceof DagSubGraph).to.be.true;
            const nodes = graph.getAllNodes();
            expect(nodes.size).to.equal(2);
            expect(nodes.get("nodeId-1") instanceof DagNodeExport).to.be.true;
            expect(nodes.get("nodeId-3") instanceof DagNodeDataset).to.be.true;
            expect(graph._tableNameToDagIdMap[".XcalarLRQExport.table_1"]).to.equal("nodeId-1");
            expect(graph._tableNameToDagIdMap["table_1"]).to.equal("nodeId-3");
            expect(graph._tableNameToDagIdMap[".XcalarDS.name.123.classes"]).to.equal("nodeId-3");
        });

        it("path should be correct", function() {
            expect(tab.getPath()).to.equal("Optimized Dataflows (SDK Use Only)/testTab");
        });

        it("getQueryName should work", function() {
            expect(tab.getQueryName()).to.equal(tabId);
        });

        after(function() {
            DagTabManager.Instance.removeTab(tabId);
        });
    });

    describe("new tab focus and progress checking", function() {
        it("new tab should start checking", function(done) {
            tabId = tabId + "_1";
            let cachedFn = XcalarQueryState;
            queryStateCalled = false;
            XcalarQueryState = function(queryName) {
                expect(queryName).to.equal(tabId);
                queryStateCalled = true;
                return PromiseHelper.resolve({
                    queryState: QueryStateT.qrProcessing,
                    queryGraph: {node: []}
                });
            };
            const executor = new DagGraphExecutor([], new DagGraph(), {});

            const oldGenId = DagNode.generateId;
            let count = 0;
            DagNode.generateId = function() {
                count++;
                return "nodeId-" + count;
            };

            tab = DagTabManager.Instance.newOptimizedTab(tabId, "testTab", queryNodes, executor);
            DagNode.generateId = oldGenId;
            let graph = tab.getGraph();
            expect(graph instanceof DagSubGraph).to.be.true;
            const nodes = graph.getAllNodes();
            expect(nodes.size).to.equal(2);

            expect(nodes.get("nodeId-1") instanceof DagNodeExport).to.be.true;
            expect(nodes.get("nodeId-3") instanceof DagNodeDataset).to.be.true;
            expect(graph._tableNameToDagIdMap[".XcalarLRQExport.table_1"]).to.equal("nodeId-1");
            expect(graph._tableNameToDagIdMap["table_1"]).to.equal("nodeId-3");
            expect(graph._tableNameToDagIdMap[".XcalarDS.name.123.classes"]).to.equal("nodeId-3");

            expect(tab._isDoneExecuting).to.be.false;
            expect(tab._isFocused).to.be.true;
            expect(tab._isDeleted).to.be.false;
            expect(tab._inProgress).to.be.true;
            expect(tab._hasQueryStateGraph).to.be.false;
            expect(tab._queryCheckId).to.equal(0);
            expect(DagViewManager.Instance.getActiveArea().find(".operator").length).to.equal(2);

            UnitTest.testFinish(function(){
                return queryStateCalled === true;
            })
            .then(function() {
                expect(tab._isDoneExecuting).to.be.false;
                expect(tab._isFocused).to.be.true;
                expect(tab._isDeleted).to.be.false;
                expect(tab._inProgress).to.be.true;
                expect(tab._hasQueryStateGraph).to.be.true;

                graph = tab.getGraph();
                expect(graph instanceof DagSubGraph).to.be.true;
                const nodes = graph.getAllNodes();
                expect(nodes.size).to.equal(0);
                expect(DagViewManager.Instance.getActiveArea().find(".operator").length).to.equal(0);

                XcalarQueryState = cachedFn;
                done();
            })
            .fail(function() {
                done("fail")
            });
        });
        it("should stop executing when unfocused", function(done) {
            let cachedFn = XcalarQueryState;
            queryStateCalled = false;
            XcalarQueryState = function(queryName) {
                expect(queryName).to.equal(tabId);
                queryStateCalled = true;
                return PromiseHelper.resolve({
                    queryState: QueryStateT.qrProcessing,
                    queryGraph: {node: []}
                })
            };
            UnitTest.testFinish(function(){
                return queryStateCalled === true;
            })
            .then(function() {
                expect(queryStateCalled).to.be.true;
                queryStateCalled = false;
                tab.unfocus();
                expect(tab._queryCheckId).to.equal(1);
                return UnitTest.timeoutPromise(3000);
            })
            .then(function() {
                expect(queryStateCalled).to.be.false;
                XcalarQueryState = cachedFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should update progress of nodes when focused", function(done) {
            expect(DagViewManager.Instance.getActiveArea().find(".operator").length).to.equal(0);
            tab._hasQueryStateGraph = false;
            tab.focus();

            const oldGenId = DagNode.generateId;
            let count = 0;
            DagNode.generateId = function() {
                count++;
                return "nodeId-" + count;
            };

            queryStateCalled = false;
            XcalarQueryState = function(queryName) {
                expect(queryName).to.equal(tabId);
                queryStateCalled = true;
                return PromiseHelper.resolve({
                    queryState: QueryStateT.qrProcessing,
                    queryGraph: {node: [
                        {
                            "name": {
                                "name": "table_1"
                            },
                            "tag": "",
                            "comment": "",
                            "dagNodeId": "2",
                            "api": 3,
                            "state": 5,
                            "numWorkCompleted": 6,
                            "numWorkTotal": 6,
                            "elapsed": {
                                "milliseconds": 13
                            },
                            "inputSize": 533024,
                            "input": {
                                "indexInput": {
                                    "source": ".XcalarLRQ.751205.XcalarDS.name.123.classes",
                                    "dest": "table_1",
                                    "key": [
                                        {
                                            "name": "xcalarRecordNum",
                                            "type": "DfInt64",
                                            "keyFieldName": "xcalarRecordNum",
                                            "ordering": "Random"
                                        }
                                    ],
                                    "prefix": "classes",
                                    "dhtName": "",
                                    "delaySort": false,
                                    "broadcast": false
                                }
                            },
                            "numRowsTotal": 6,
                            "numNodes": 2,
                            "numRowsPerNode": [
                                3,
                                3
                            ],
                            "sizeTotal": 0,
                            "sizePerNode": [],
                            "numTransPagesReceivedPerNode": [
                                0,
                                1
                            ],
                            "numParents": 1,
                            "parents": [
                                "1"
                            ],
                            "numChildren": 1,
                            "children": [
                                "3"
                            ],
                            "log": "",
                            "status": 312
                        },
                        {
                            "name": {
                                "name": ".XcalarLRQExport.table_1"
                            },
                            "tag": "",
                            "comment": "",
                            "dagNodeId": "3",
                            "api": 121,
                            "state": 3,
                            "numWorkCompleted": 3,
                            "numWorkTotal": 6,
                            "elapsed": {
                                "milliseconds": 9
                            },
                            "inputSize": 34384,
                            "input": {
                                "synthesizeInput": {
                                    "source": "table_1",
                                    "dest": ".XcalarLRQExport.table_1",
                                    "columns": [
                                        {
                                            "sourceColumn": "classes--class_name",
                                            "destColumn": "class_name",
                                            "columnType": "DfUnknown"
                                        },
                                        {
                                            "sourceColumn": "classes--class_id",
                                            "destColumn": "class_id",
                                            "columnType": "DfUnknown"
                                        }
                                    ],
                                    "sameSession": false
                                }
                            },
                            "numRowsTotal": 6,
                            "numNodes": 2,
                            "numRowsPerNode": [
                                4,
                                2
                            ],
                            "sizeTotal": 0,
                            "sizePerNode": [],
                            "numTransPagesReceivedPerNode": [
                                0,
                                0
                            ],
                            "numParents": 1,
                            "parents": [
                                "2"
                            ],
                            "numChildren": 0,
                            "children": [],
                            "log": "",
                            "status": 312
                        },
                        {
                            "name": {
                                "name": ".XcalarLRQ.751205.XcalarDS.name.123.classes"
                            },
                            "tag": "",
                            "comment": "",
                            "dagNodeId": "1",
                            "api": 2,
                            "state": 5,
                            "numWorkCompleted": 262144,
                            "numWorkTotal": 262144,
                            "elapsed": {
                                "milliseconds": 172
                            },
                            "inputSize": 1317752,
                            "input": {
                                "loadInput": {
                                    "dest": ".XcalarLRQ.751205.XcalarDS.name.123.classes",
                                    "loadArgs": {
                                        "sourceArgsList": [
                                            {
                                                "targetName": "Default Shared Root",
                                                "path": "/netstore/datasets/indexJoin/classes/classes.json",
                                                "fileNamePattern": "",
                                                "recursive": false
                                            }
                                        ],
                                        "parseArgs": {
                                            "parserFnName": "default:parseJson",
                                            "parserArgJson": "{}",
                                            "fileNameFieldName": "",
                                            "recordNumFieldName": "",
                                            "allowRecordErrors": false,
                                            "allowFileErrors": false,
                                            "schema": []
                                        },
                                        "size": 9223372036854776000
                                    },
                                    "dagNodeId": "751218"
                                }
                            },
                            "numRowsTotal": 6,
                            "numNodes": 2,
                            "numRowsPerNode": [
                                6,
                                0
                            ],
                            "sizeTotal": 0,
                            "sizePerNode": [],
                            "numTransPagesReceivedPerNode": [
                                0,
                                0
                            ],
                            "numParents": 0,
                            "parents": [],
                            "numChildren": 1,
                            "children": [
                                "2"
                            ],
                            "log": "",
                            "status": 312
                        }
                    ]}
                })
            };

            UnitTest.testFinish(function(){
                return queryStateCalled === true;
            })
            .then(function() {
                let graph = tab.getGraph();
                expect(graph instanceof DagSubGraph).to.be.true;
                const nodes = graph.getAllNodes();
                expect(nodes.size).to.equal(2);

                expect(nodes.get("nodeId-1") instanceof DagNodeSynthesize).to.be.true;
                expect(nodes.get("nodeId-3") instanceof DagNodeDataset).to.be.true;

                expect(graph._tableNameToDagIdMap[".XcalarLRQExport.table_1"]).to.equal("nodeId-1");
                expect(graph._tableNameToDagIdMap["table_1"]).to.equal("nodeId-3");
                expect(graph._tableNameToDagIdMap[".XcalarLRQ.751205.XcalarDS.name.123.classes"]).to.equal("nodeId-3");

                const $dfArea = DagViewManager.Instance.getActiveArea();
                expect($dfArea.find(".operator").length).to.equal(2);
                expect($dfArea.find(".operator.dataset").attr('transform')).to.equal("translate(140,140)");

                expect($dfArea.find(".operator.synthesize").attr('transform')).to.equal("translate(280,140)");
                expect($dfArea.find(".operator.synthesize").find(".opProgress").text()).to.equal("50%");

                expect($dfArea.find(".runStats").length).to.equal(2);
                expect($dfArea.find(".runStats").eq(0).hasClass("Processing")).to.be.true;
                expect($dfArea.find(".runStats").eq(0).hasClass("Ready")).to.be.false;
                expect($dfArea.find(".runStats").eq(1).hasClass("Ready")).to.be.true;
                expect($dfArea.find(".runStats").eq(1).hasClass("Processing")).to.be.false;
                expect($dfArea.find(".runStats").eq(0).text().trim().replace(/ /gi, "").replace(/\n/gi, "")).to.equal("RowsTimeSkew69ms33");
                expect($dfArea.find(".runStats").eq(1).text().trim().replace(/ /gi, "").replace(/\n/gi, "")).to.equal("RowsTimeSkew6185ms100");

                DagNode.generateId = oldGenId;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should still be polling", function(done) {
            queryStateCalled = false;
            UnitTest.testFinish(function(){
                return queryStateCalled === true;
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should stop polling when finished", function(done) {
            expect(tab._isDoneExecuting).to.be.false;
            expect(tab._isFocused).to.be.true;
            expect(tab._isDeleted).to.be.false;
            expect(tab._inProgress).to.be.true;
            expect(tab._hasQueryStateGraph).to.be.true;

            XcalarQueryState = function(queryName) {
                expect(queryName).to.equal(tabId);
                queryStateCalled = true;
                return PromiseHelper.resolve({
                    queryState: QueryStateT.qrFinished,
                    queryGraph: {node: []},
                    elapsed: {milliseconds: 60}
                });
            };

            queryStateCalled = false;
            UnitTest.testFinish(function(){
                return queryStateCalled === true;
            })
            .then(function() {
                queryStateCalled = false;
                expect(tab._isDoneExecuting).to.be.true;
                expect(tab._inProgress).to.be.false;
                return UnitTest.timeoutPromise(3000);
            })
            .then(function() {
                expect(queryStateCalled).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("public functions", function() {
        it("load should work", function(done) {
            var called = false;
            var cacheFn = XcalarGetRetinaJson;
            XcalarGetRetinaJson = function() {
                called = true;
                return PromiseHelper.resolve({
                    query:  queryNodes = [
                        {
                            "operation": "XcalarApiBulkLoad",
                            "comment": "",
                            "tag": "",
                            "state": "Created",
                            "args": {
                                "dest": ".XcalarDS.name.123.classes",
                                "loadArgs": {
                                    "sourceArgsList": [
                                        {
                                            "targetName": "Default Shared Root",
                                            "path": "/netstore/datasets/indexJoin/classes/classes.json",
                                            "fileNamePattern": "",
                                            "recursive": false
                                        }
                                    ],
                                    "parseArgs": {
                                        "parserFnName": "default:parseJson",
                                        "parserArgJson": "{}",
                                        "fileNameFieldName": "",
                                        "recordNumFieldName": "",
                                        "allowFileErrors": false,
                                        "allowRecordErrors": false,
                                        "schema": []
                                    },
                                    "size": 10737418240
                                }
                            },
                            "annotations": {}
                        },
                        {
                            "operation": "XcalarApiIndex",
                            "comment": "",
                            "tag": "",
                            "state": "Created",
                            "args": {
                                "source": ".XcalarDS.name.123.classes",
                                "dest": "table_1",
                                "key": [
                                    {
                                        "name": "xcalarRecordNum",
                                        "keyFieldName": "xcalarRecordNum",
                                        "type": "DfInt64",
                                        "ordering": "Unordered"
                                    }
                                ],
                                "prefix": "classes",
                                "dhtName": "",
                                "delaySort": false,
                                "broadcast": false
                            },
                            "annotations": {}
                        }
                    ]

                });
            };

            tab.load()
            .then(function() {
                expect(called).to.be.true;
                const graph = tab.getGraph();
                const nodes = graph.getAllNodes();
                expect(nodes.size).to.equal(1);
                XcalarGetRetinaJson = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delete should work", function(done) {
            var called = false;
            var cacheFn = XcalarDeleteRetina;
            XcalarDeleteRetina = function() {
                called = true;
                return PromiseHelper.resolve();
            };


            expect(tab._isDoneExecuting).to.be.false;
            expect(tab._isFocused).to.be.true;
            expect(tab._isDeleted).to.be.false;
            expect(tab._queryCheckId).to.equal(1);

            tab.delete()
            .then(function() {
                expect(called).to.be.true;
                expect(tab._isDoneExecuting).to.be.false;
                expect(tab._isFocused).to.be.false;
                expect(tab._isDeleted).to.be.true;
                expect(tab._queryCheckId).to.equal(2);
                XcalarDeleteRetina = cacheFn;
                done();
            })
            .fail(function() {
                done("fail")
            })
        });
    });


    after(function() {
        $dagTabs = $("#dagTabSectionTabs .dagTab");
        $dagTabs.last().find(".after").click();
        $dagTabs.last().find(".after").click();
        XcalarKeyPut = oldPut;
        DagTabProgress.progressCheckInterval = 2000;
        XcalarQueryState = cachedQueryStateFn;
    });
});
