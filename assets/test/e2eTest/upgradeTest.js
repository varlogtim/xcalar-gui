
const testConfig = {
    user: 'dftest',
    workbook: 'Test-Dataflow-Upgrade',
    isUpgrade: true,
    validation: [
        {dfName: 'DF Test (result)', nodeName: 'validation1'}
    ]
};

const execFunctions = require('./lib/execFunctions');
let datasetNodeId;
let secondSqlNodeId;

let testTabs = {}; // { id: string, nodes: [] }
const testTabMapping = new Map(); // WB tabName => newTabName
const testDfIdMapping = new Map(); // WB df_id => new df_id
const testTabDfMapping = new Map(); // tabName => dfId

function buildTestUrl(testConfig) {
    return `http://localhost:8888/testSuite.html?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${testConfig.user}&id=0`
}

function findValidateNodeIndex(linkOutName, nodeInfos) {
    for (let i = 0; i < nodeInfos.length; i ++) {
        const nodeInfo = nodeInfos[i];
        if (nodeInfo.type === 'link out' && nodeInfo.input.name === linkOutName) {
            return i;
        }
    }
    return -1;
}

module.exports = {
    '@tags': ["upgrade test", "allTests"],

    before: function(browser) {
        browser
            .url(buildTestUrl(testConfig))
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    after: function(browser) {
        if (testConfig.IMDNames && testConfig.IMDNames.length) {
            browser
            .click("#dataStoresTab")
            .click("#datastoreMenu .table .iconSection .refresh")
            .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
            .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + testConfig.IMDNames[0] + '"]', 10000)

            testConfig.IMDNames.forEach((IMDName) => {
                browser
                    .moveToElement('#datastoreMenu .grid-unit[data-id="' + IMDName + '"]', 20, 20)
                    .mouseButtonClick("right")
                    .moveToElement("#tableGridViewMenu li.delete", 10, 10)
                    .mouseButtonClick("left")
                    .click("#alertModal .confirm")
                    .waitForElementNotPresent('#datastoreMenu .grid-unit[data-id="' + IMDName + '"]');
            });
        }
        browser.deleteWorkbook(testConfig.workbook, testConfig.user);
    },

    'upload workbook': function(browser) {
        browser.uploadWorkbook(testConfig.workbook, testConfig.isUpgrade);
    },

    'activate workbook': function(browser) {
        browser
            .click(".workbookBox .content.activate")
            .pause(1000)
            .waitForElementNotVisible("#initialLoadScreen", 100000)

    },

    'activate tab': function(browser) {
        browser
            .click("#dagListSection .fileName .name")
            .waitForElementVisible('.dataflowArea.active.rendered', 100000);
    },

    'get tabs and nodes': function(browser) {
        browser.execute(execFunctions.getDataflowInfo, [], function(result) {
            testTabs = result.value;
        });
    },

    'clearAggs': function(browser) {
        browser.execute(function() {
            let aggs = DagAggManager.Instance.getAggMap();
            for (agg in aggs) {
                DagAggManager.Instance.removeAgg(agg);
            }
            setInterval(function() {

            })
            return true;
        }, [], null);
    },

    'addPublishIMDNode': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const parentNodes = testTabs[tabName].nodes.filter((node) => {
                return node.title === "b#52";
            });
            const nodes =[
                {
                    "type": "publishIMD",
                    "subType": null,
                    "display": {
                        "x": 1540,
                        "y": 140
                    },
                    "description": "",
                    "hasTitleChange": false,
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "parents": [parentNodes[0].id],
                    "id": "dag_5C747F5F163D7BE2_1551162688304_36"
                }
            ];
            browser.switchTab(newTabName)

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                    }
                );


            });
            browser.perform(() => {
                let input = {
                    "pubTableName": "PUBTESTE2E",
                    "primaryKeys": [
                        "$CLASS_ID_MAXINTEGER"
                    ],
                    "operator": "$CLASS_ID_MAXINTEGER"
                };

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + parentNodes[0].nodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${parentNodes[0].nodeId}"]`
                    + `[data-connectorindex="0"]`,
                    10);

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"]')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));

            });
        }
    },

    'config dataset schema': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const datasetNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "dataset";
            });

            browser.perform(() => {
                datasetNodes.forEach((nodeInfo) => {
                    input = nodeInfo.input;
                    if (input.prefix === "classes") {
                        input.schema = [
                            {
                                "name": "class_name",
                                "type": "string"
                            },
                            {
                                "name": "class_id",
                                "type": "integer"
                            }
                        ];
                    } else if (input.prefix === "schedule") {
                        input.schema =   [
                            {
                                "name": "class_id",
                                "type": "integer"
                            },
                            {
                                "name": "days",
                                "type": "array"
                            },
                            {
                                "name": "time",
                                "type": "string"
                            },
                            {
                                "name": "duration",
                                "type": "string"
                            },
                            {
                                "name": "teacher_id",
                                "type": "integer"
                            },
                            {
                                "name": "student_ids",
                                "type": "array"
                            }
                        ];
                    }
                    if (!nodeInfo.schema || !nodeInfo.schema.length) {
                        browser
                        .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"]')
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                        .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + nodeInfo.nodeId + '"] .main');
                    }
                });
            });
        }
    },

      // imdTable nodes depend on publishedIMD node to be executed first
    'config imdTable nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            browser.switchTab(newTabName);
            browser.executeNode(".operator.publishIMD");
            testConfig.IMDNames = ["PUBTESTE2E"];
            browser
            .click("#dataStoresTab")
            .click("#sourceTblButton")
            .click("#datastoreMenu .table .iconSection .refresh")
            .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
            .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + testConfig.IMDNames[0] + '"]', 10000)
            .click("#modelingDataflowTab");

            const imdNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "IMDTable";
            });
            imdNodes.forEach((nodeInfo) => {
                input = nodeInfo.input;
                input.schema = [
                    {
                        "name": "CLASS_ID",
                        "type": "integer"
                    },
                    {
                        "name": "CLASS_ID_MAXINTEGER",
                        "type": "integer"
                    },
                    {
                        "name": "CLASS_ID_CONCAT",
                        "type": "string"
                    },
                    {
                        "name": "XcalarRankOver",
                        "type": "integer"
                    },
                    {
                        "name": "XcalarOpCode",
                        "type": "integer"
                    },
                    {
                        "name": "XcalarBatchId",
                        "type": "integer"
                    }
                ];
                    browser
                    .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"]')
                    .clearValue("#IMDTableOpPanel .pubTableInput")
                    .setValue("#IMDTableOpPanel .pubTableInput", input.source)
                    .moveToElement("#pubTableList li:not(.xc-hidden)", 2, 2)
                    .mouseButtonUp("left")
                    .click("#IMDTableOpPanel .bottomSection .switch")
                    .waitForElementVisible("#IMDTableOpPanel .advancedEditor", 1000)
                    .click("#IMDTableOpPanel .next")
                    .submitAdvancedPanel("#IMDTableOpPanel", JSON.stringify(input, null, 4));
            });

        }
    },

    // 1.4.1 publish does a weird cast, so the fix is to turn a float into integer
    'config union nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const unionNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "set";
            });
            unionNodes.forEach((nodeInfo) => {
                let input = nodeInfo.input;
                input.columns[0][1].columnType = "integer";
                input.columns[1][1].columnType = "integer";
                browser
                .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"]')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
            });

        }
    },

    'execute': function(browser) {

        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const numOfNodes = testTabs[tabName].nodes.length;
            browser
                .switchTab(newTabName);
            browser.waitForElementNotPresent(".dataflowArea.active.locked");

            const unionNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "set";
            });
            const linkOutNode = testTabs[tabName].nodes.find((node) => {
                return node.type === "link out";
            });

            browser
                .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                    browser.assert.ok(result.value.length > 0);
                })
                .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                    browser.assert.ok(result.value.length < numOfNodes);
                });


            browser.executeNode('.operator[data-nodeid="' + unionNodes[0].nodeId + '"]');
            let selector = '.operator[data-nodeid="' + linkOutNode.nodeId + '"]';
            // optimized execution failing due to aggregate node

            browser
                .moveToElement(".dataflowArea.active " + selector, 30, 15)
                .mouseButtonClick('right')
                .waitForElementVisible("#dagNodeMenu", 1000)
                .moveToElement("#dagNodeMenu li.executeNodeOptimized", 10, 1)
                .waitForElementNotPresent(".dataflowArea.active.locked")
                .mouseButtonClick('left')
                .waitForElementPresent('.dataflowArea .operator[data-nodeid="' + linkOutNode.nodeId + '"].state-Complete', 50000);
        }
    },


    'loadExportedDataset': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const nodes =[
                {
                    "type": "dataset",
                    "subType": null,
                    "display": {
                        "x": 2160,
                        "y": 140
                    },
                    "description": "exportedDataset",
                    "hasTitleChange": false,
                    "input": {
                        "source": "dftest3.01359.upgradeTest",
                        "prefix": "upgradeTest",
                        "synthesize": false,
                        "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"dftest3.01359.upgradeTest\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/home/jenkins/export_test/upgradeTest.csv\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\r\\\\n\\\",\\\"fieldDelim\\\":\\\",\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"columnType\": \"DfFloat64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID\",\n                        \"destColumn\": \"CLASS_ID\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarOpCode\",\n                        \"destColumn\": \"XcalarOpCode\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_CONCAT\",\n                        \"destColumn\": \"CLASS_ID_CONCAT\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarRankOver\",\n                        \"destColumn\": \"XcalarRankOver\",\n                        \"columnType\": \"DfInt64\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "schema": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarOpCode",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XcalarRankOver",
                            "type": "integer"
                        }
                    ],
                    "parents": [],
                    "nodeId": "dag_5C764BC624079350_1551258374774_81"
                }

            ];
            browser.switchTab(newTabName);

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                        datasetNodeId = nodeId;
                    }
                );
            });
            browser.perform(() => {

                let input = {
                    "source": "dftest3.01359.upgradeTest",
                    "prefix": "upgradeTest",
                    "synthesize": false,
                    "schema": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarOpCode",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XcalarRankOver",
                            "type": "integer"
                        }
                    ],
                    "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"dftest3.01359.upgradeTest\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/home/jenkins/export_test/upgradeTest.csv\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\r\\\\n\\\",\\\"fieldDelim\\\":\\\",\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"columnType\": \"DfFloat64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID\",\n                        \"destColumn\": \"CLASS_ID\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarOpCode\",\n                        \"destColumn\": \"XcalarOpCode\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_CONCAT\",\n                        \"destColumn\": \"CLASS_ID_CONCAT\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarRankOver\",\n                        \"destColumn\": \"XcalarRankOver\",\n                        \"columnType\": \"DfInt64\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                }

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"]')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main');
            });
        }
    },

    // validate top dataflow
    'addSQLNode': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const firstParent = testTabs[tabName].nodes.find((node) => {
                return node.type === "set";
            });
            const nodes =[
                {
                    "type": "sql",
                    "subType": null,
                    "display": {
                        "x": 2300,
                        "y": 140
                    },
                    "description": "",
                    "hasTitleChange": false,
                    "input": {
                        "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                        "identifiers": {
                            "1": "testResults",
                            "2": "correctResults"
                        },
                        "identifiersOrder": [
                            1,
                            2
                        ],
                        "dropAsYouGo": true
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "tableSrcMap": {
                        "table_DF2_1551256519225_1_dag_1551256519261_43#t_1551258098932_50": 1,
                        "table_DF2_1551256519225_1_dag_5C764BC624079350_1551258374774_81#t_1551258519644_55": 2
                    },
                    "columns": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "backName": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "backName": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XCALAROPCODE",
                            "backName": "XCALAROPCODE",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "backName": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XCALARRANKOVER",
                            "backName": "XCALARRANKOVER",
                            "type": "integer"
                        }
                    ],
                    "parents": [firstParent.id, datasetNodeId],
                    "nodeId": "dag_5C764BC624079350_1551258719473_82"
                }
            ];
            browser.switchTab(newTabName)

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                    }
                );


            });
            browser.perform(() => {
                let input = {
                    "sqlQueryString": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                    "identifiers": {
                        "1": "testResults",
                        "2": "correctResults"
                    },
                    "identifiersOrder": [
                        1,
                        2
                    ],
                    "dropAsYouGo": true
                };

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + firstParent.nodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${firstParent.nodeId}"]`
                    + `[data-connectorindex="0"]`,
                    10);

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${datasetNodeId}"]`
                    + `[data-connectorindex="1"]`,
                    10);

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"]')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

            });
        }
    },

    'validate': function(browser) {
        // The validation nodes must be DFLinkOut
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            browser
                .switchTab(newTabName)
                .executeNode(".operator.sql")
                .moveToElement(`.dataflowArea.active .operator.sql .main`, 10, 20)
                .mouseButtonClick('right')
                .waitForElementVisible("#dagNodeMenu", 1000)
                .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
                .mouseButtonClick('left')
                .waitForElementVisible('#dagViewTableArea .totalRows', 20000)
                .getText('#dagViewTableArea .totalRows', ({value}) => {
                    browser.assert.equal(value, "0");
                });
        }
    },

    //validate bottom dataflow which came from embedded retina
    'add2ndSQLNode': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const firstParent = testTabs[tabName].nodes.filter((node) => {
                return node.type === "set";
            })[1];
            const nodes =[
                {
                    "type": "sql",
                    "subType": null,
                    "display": {
                        "x": 2300,
                        "y": 540
                    },
                    "description": "",
                    "hasTitleChange": false,
                    "input": {
                        "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                        "identifiers": {
                            "1": "testResults",
                            "2": "correctResults"
                        },
                        "identifiersOrder": [
                            1,
                            2
                        ],
                        "dropAsYouGo": true
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "tableSrcMap": {
                        "table_DF2_1551256519225_1_dag_1551256519261_43#t_1551258098932_50": 1,
                        "table_DF2_1551256519225_1_dag_5C764BC624079350_1551258374774_81#t_1551258519644_55": 2
                    },
                    "columns": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "backName": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "backName": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XCALAROPCODE",
                            "backName": "XCALAROPCODE",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "backName": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XCALARRANKOVER",
                            "backName": "XCALARRANKOVER",
                            "type": "integer"
                        }
                    ],
                    "parents": [firstParent.id, datasetNodeId],
                    "nodeId": "dag_5C764BC624079350_1551258719473_82"
                }
            ];
            browser.switchTab(newTabName)

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                        secondSqlNodeId = nodeId;
                    }
                );


            });
            browser.perform(() => {
                let input = {
                    "sqlQueryString": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                    "identifiers": {
                        "1": "testResults",
                        "2": "correctResults"
                    },
                    "identifiersOrder": [
                        1,
                        2
                    ],
                    "dropAsYouGo": true
                };

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + firstParent.nodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${firstParent.nodeId}"]`
                    + `[data-connectorindex="0"]`,
                    10);

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${datasetNodeId}"]`
                    + `[data-connectorindex="1"]`,
                    10);

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"]')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

            });
        }
    },

    'validate2ndSQL': function(browser) {
        // The validation nodes must be DFLinkOut
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            browser
                .switchTab(newTabName)
                .executeNode('.operator[data-nodeid="' + secondSqlNodeId + '"]')
                .moveToElement(`.dataflowArea.active ${'.operator[data-nodeid="' + secondSqlNodeId + '"]'} .main`, 10, 20)
                .mouseButtonClick('right')
                .waitForElementVisible("#dagNodeMenu", 1000)
                .moveToElement("#dagNodeMenu li.viewResult", 10, 1)
                .mouseButtonClick('left')
                .waitForElementVisible('#dagViewTableArea .totalRows', 20000)
                .getText('#dagViewTableArea .totalRows', ({value}) => {
                    browser.assert.equal(value, "0");
                });
        }
    }

}