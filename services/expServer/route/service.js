var express = require('express');
var router = express.Router();
var support = require('../expServerSupport.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;

function convertToBase64(logs) {
    return new Buffer(logs).toString('base64');
}
// Start of service calls
// Master request
router.post("/service/start", function(req, res) {
    xcConsole.log("Starting Xcalar as Master");
    support.masterExecuteAction("POST", "/service/start/slave", req.body)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/stop", function(req, res) {
    xcConsole.log("Stopping Xcalar as Master");
    support.masterExecuteAction("POST", "/service/stop/slave", req.body)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

// We call stop and then start instead of restart because xcalar service restart
// restarts each node individually rather than the nodes as a cluster. This causes
// the generation count on the nodes to be different.
router.post("/service/restart", function(req, res) {
    xcConsole.log("Restarting Xcalar as Master");
    var message1;
    var message2;
    function stop() {
        var deferred = jQuery.Deferred();
        support.masterExecuteAction("POST", "/service/stop/slave", req.body)
        .always(deferred.resolve);
        return deferred;
    }
    stop()
    .then(function(ret) {
        var deferred = jQuery.Deferred();
        message1 = ret;
        support.masterExecuteAction("POST", "/service/start/slave", req.body)
        .always(deferred.resolve);
        return deferred;
    })
    .then(function(ret) {
        var deferred = jQuery.Deferred();
        message2 = ret;
        message2.logs = message1.logs + message2.logs;
        return deferred.resolve().promise();
    })
    .then(function() {
        if (message2.logs) {
            message2.logs = convertToBase64(message2.logs);
        }
        res.status(message2.status).send(message2);
    });
});

router.get("/service/status", function(req, res) {
    xcConsole.log("Getting Xcalar status as Master");
    // req.query for Ajax, req.body for sennRequest
    support.masterExecuteAction("GET", "/service/status/slave", req.query)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

// Slave request
router.post("/service/start/slave", function(req, res) {
    xcConsole.log("Starting Xcalar as Slave");
    support.slaveExecuteAction("POST", "/service/start/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/service/stop/slave", function(req, res) {
    xcConsole.log("Stopping Xcalar as Slave");
    support.slaveExecuteAction("POST", "/service/stop/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.get("/service/status/slave", function(req, res) {
    xcConsole.log("Getting Xcalar status as Slave");
    support.slaveExecuteAction("GET", "/service/status/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

// Single node commands
router.delete("/service/sessionFiles", function(req, res) {
    xcConsole.log("Removing Session Files");
    var filename =  req.body.filename;
    support.removeSessionFiles(filename)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.delete("/service/SHMFiles", function(req, res) {
    xcConsole.log("Removing Files under folder SHM");
    support.removeSHM()
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/license", function(req, res) {
    xcConsole.log("Get License");
    support.getLicense()
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/ticket", function(req, res) {
    xcConsole.log("File Ticket");
    var contents = req.body.contents;
    support.submitTicket(contents)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/logs", function(req, res) {
    xcConsole.log("Fetching Recent Logs as Master");
    support.masterExecuteAction("GET", "/service/logs/slave", req.query)
    .always(function(message) {
        if (message.logs) {
            message.logs = convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/logs/slave", function(req, res) {
    xcConsole.log("Fetching Recent Logs as Slave");
    support.slaveExecuteAction("GET", "/service/logs/slave", req.body)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});
// End of service calls

function unitTest() {
    responseReplace();
    function responseReplace() {
        support.removeSessionFiles = fakeResponseRSF;
        support.removeSHM = fakeResponseSHM;
        support.getLicense = fakeResponseLicense;
        support.submitTicket = fakeResponseSubmitTicket;
        support.masterExecuteAction = fakeResponseMasterExecuteAction;
        support.slaveExecuteAction = fakeResponseSlaveExecuteAction;
    }

    function fakeResponseRSF() {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Fake response remove Session Files!"
        };
        return deferred.resolve(retMsg).promise();
    }
    function fakeResponseSHM() {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Fake response remove SHM Files!"
        };
        return deferred.resolve(retMsg).promise();
    }
    function fakeResponseLicense() {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Fake response get License!"
        };
        return deferred.resolve(retMsg).promise();
    }
    function fakeResponseSubmitTicket() {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Fake response submit Ticket!"
        };
        return deferred.resolve(retMsg).promise();
    }
    function fakeResponseMasterExecuteAction(action, slaveUrl) {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Master: Fake response! " + slaveUrl
        };
        return deferred.resolve(retMsg).promise();
    }
    function fakeResponseSlaveExecuteAction(action, slaveUrl) {
        var deferred = jQuery.Deferred();
        var retMsg = {
            "status": httpStatus.OK,
            "logs": "Slave: Fake response! " + slaveUrl
        };
        return deferred.resolve(retMsg).promise();
    }
}
exports.unitTest = unitTest;

// Export router
exports.router = router;