const testConfig = {
    user: 'dftest',
    workbook: 'Test-Dataflow-1',
    validation: [
        {dfName: 'DF Test(result)', nodeName: 'validation1'}
    ]
};

const execFunctions = require('./lib/execFunctions');

let testTabs = {}; // wbTabName => { id: string, nodes: NodeInfo[] }
const testTabMapping = new Map(); // WB tabName => replay tabName
const testDfIdMapping = new Map(); // WB df_id => replay df_id
const testTabDfMapping = new Map(); // tabName => dfId
const testReplayNodes = new Map(); // replayTabName => [{ nodeId: string, ELEMENT: string }, ...]

function buildTestUrl(testConfig) {
    return `http://localhost:8888/testSuite.html?
        test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${testConfig.user}&id=0`
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
    '@tags': ["workbook replay2",  "allTests"],

    before: function(browser) {
        browser
            .url(buildTestUrl(testConfig))
            .waitForElementVisible('#container.noWorkbook', 10000);
    },

    after: function(browser) {
        browser.deleteWorkbook(browser.globals.finalWorkbookName, testConfig.user);
    },

    'upload and enter workbook': function(browser) {
        browser.uploadAndEnterWorkbook(testConfig.workbook);
    },

    'get tabs and nodes': function(browser) {
        browser.execute(execFunctions.getDataflowInfo, [], function(result) {
            testTabs = result.value;
        });
    },

    'new tabs': function(browser) {
        browser.waitForElementNotVisible("#initialLoadScreen", 100000);
        const tabNames = Object.keys(testTabs);
        let newTabIndex = tabNames.length + 1;
        for (const tabName of tabNames) {
            const selector = `#dagTabSectionTabs .dagTab:nth-child(${newTabIndex}).active`;
            browser
                .click('#tabButton')
                .waitForElementPresent(selector, 2000)
                .getText(`${selector} div.name`, function(result) {
                    testTabMapping.set(tabName, result.value);
                })
                .execute(function(tabIndex) {
                    const tab = DagTabManager.Instance.getTabByIndex(tabIndex);
                    return tab.getId();
                }, [newTabIndex - 1], function(result) {
                    testDfIdMapping.set(testTabs[tabName].id, result.value);
                    testTabDfMapping.set(tabName, testTabs[tabName].id); // uploaded df
                    testTabDfMapping.set(testTabMapping.get(tabName), result.value); // replayed df
                });

            newTabIndex ++;
        }
    },

    'recreate nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = testTabMapping.get(tabName);
            browser.switchTab(newTabName)
            .recreateNodes(testTabs[tabName].nodes, testTabDfMapping.get(tabName), testDfIdMapping,
                ({ IMDNames, nodeElemIDs, nodeIDs }) => {
                    const replayNodes = [];
                    for (let i = 0; i < nodeElemIDs.length; i ++) {
                        replayNodes.push({
                            nodeId: nodeIDs[i], ELEMENT: nodeElemIDs[i]
                        });
                    }
                    testReplayNodes.set(newTabName, replayNodes);
                }
            );
        }
    },

    // imdTable nodes depend on publishedIMD node to be executed first
    'config imdTable nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = testTabMapping.get(tabName);
            browser.switchTab(newTabName);

            testTabs[tabName].nodes.forEach((node, i) => {
                let input = JSON.parse(JSON.stringify(node.input));
                if (node.type === "IMDTable") {
                    browser
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(8000) // need to check for listTables call to resolve
                        .setValue("#IMDTableOpPanel .pubTableInput", input.source)
                        .pause(1000)
                        .moveToElement("#pubTableList li:not(.xc-hidden)", 2, 2)
                        .mouseButtonUp("left")
                        .click("#IMDTableOpPanel .next")
                        .submitAdvancedPanel("#IMDTableOpPanel", JSON.stringify(input, null, 4));
                } else if (node.type === "export") {
                    pause = 6000;
                    input.driverArgs.file_path = "/home/jenkins/export_test/datasetTest.csv";
                    browser
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(pause)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
                }

            });
        }
    },

    'execute': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = testTabMapping.get(tabName);
            const numOfNodes = testTabs[tabName].nodes.length;
            browser
                .switchTab(newTabName)
                .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                    browser.assert.ok(result.value.length > 0);
                })
                .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                    browser.assert.ok(result.value.length < numOfNodes);
                })
                .executeAll(numOfNodes * 10000)
                .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                    browser.assert.equal(result.value.length, 0);
                })
                .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                    browser.assert.equal(result.value.length, numOfNodes);
                });
        }
    },

    'cleanup': function(browser) {

    },

    'validate': function(browser) {
        // The validation nodes must be DFLinkOut
        for (const {dfName, nodeName} of testConfig.validation) {
            const newTabName = testTabMapping.get(dfName);
            const nodeIndex = findValidateNodeIndex(nodeName, testTabs[dfName].nodes);
            browser
                .switchTab(newTabName)
                .moveToElement(`.dataflowArea.active .operator:nth-child(${nodeIndex + 1}) .main`, 10, 20)
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
};