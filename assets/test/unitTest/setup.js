// setup should happen before load test files
// --badil: will stop when first test fails
mocha.setup({
    "ui": "bdd",
    "bail": true
});
// global
expect = chai.expect;
assert = chai.assert


function setup() {
    $(document).ready(function() {
        mocha.run();
        console.log("Setup coder coverage!!!");
    });

    $("#hideXC").click(function() {
        $("#xc").hide();
    });

    $("#showXC").click(function() {
        $("#xc").show();
    });

    $('#backXC').click(function() {
        freeAllResultSetsSync()
        .then(Support.releaseSession)
        .then(function() {
            removeUnloadPrompt();
            window.location = paths.indexAbsolute;
        })
        .fail(function(error) {
            console.error(error);
        });
    });

    $('#toggleTestSize').click(function() {
        $('#mocha').toggleClass('small');
    });

    $('#toggleXCSize').click(function() {
        $('#xc').toggleClass('large');
    });
}

function findTestTableId(tableName) {
    if (tableName == null) {
        // this is generated in dsTableSpec.js,
        // which is the basic table we use
        tableName = 'unitTest-fakeYelp';
    }

    var tableId;

    $('.xcTableWrap').each(function() {
        if ($(this).find('.tableName').val().indexOf('unitTest-fakeYelp') > -1) {
            tableId = $(this).find('.hashName').text().slice(1);
            return false;
        }
    });

    if (tableId == null) {
        throw "Cannot find table: " + tableName;
    }

    return tableId;
}

var testDatasets = {
    "sp500": {
        url: "file:///netstore/datasets/sp500.csv",
        protocol: "file:///",
        path: "netstore/datasets/sp500.csv",
        format: "CSV",
        fieldDelim: "\t",
        lineDelim: "\n",
        hasHeader: false,
        moduleName: "",
        funcName: ""
    },

    "schedule": {
        url: "file:///var/tmp/qa/indexJoin/schedule/",
        protocol: "file:///",
        path: "var/tmp/qa/indexJoin/schedule/",
        format: "JSON",
        moduleName: "",
        funcName: ""
    },

    "fakeYelp": {
        url: "file:///netstore/datasets/unittest/test_yelp.json",
        protocol: "file:///",
        path: "netstore/datasets/unittest/test_yelp.json",
        format: "JSON",
        moduleName: "",
        funcName: ""
    }
};
