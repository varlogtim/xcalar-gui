import { Router } from "express";
export const router = Router();
import * as serviceManager from "../controllers/serviceManager"
import * as support from "../utils/expServerSupport";
import * as xcConsole from "../utils/expServerXcConsole"
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import * as fs from "fs";
require("../utils/dag/dagUtils");

// Start of service calls
// Master request
router.post("/service/start",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Starting Xcalar as Master");
    let rawCookie = support.rawSessionCookie(req);
    support.masterExecuteAction("POST", "/service/start/slave", req.body, rawCookie)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/stop",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Stopping Xcalar as Master");
    let rawCookie = support.rawSessionCookie(req);
    support.masterExecuteAction("POST", "/service/stop/slave", req.body, rawCookie)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

// We call stop and then start instead of restart because xcalar service restart
// restarts each node individually rather than the nodes as a cluster. This causes
// the generation count on the nodes to be different.
router.post("/service/restart",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Restarting Xcalar as Master");
    let rawCookie = support.rawSessionCookie(req);
    let message1;
    let message2;
    function stop() {
        let deferred = jQuery.Deferred();
        support.masterExecuteAction("POST", "/service/stop/slave", req.body, rawCookie)
        .always(deferred.resolve);
        return deferred;
    }
    stop()
    .then(function(ret) {
        xcConsole.log("stop succeeds, start Xcalar as Master");
        let deferred = jQuery.Deferred();
        message1 = ret;
        support.masterExecuteAction("POST", "/service/start/slave", req.body, rawCookie)
        .always(deferred.resolve);
        return deferred;
    })
    .then(function(ret) {
        let deferred = jQuery.Deferred();
        message2 = ret;
        message2.logs = message1.logs + message2.logs;
        return deferred.resolve().promise();
    })
    .then(function() {
        if (message2.logs) {
            message2.logs = serviceManager.convertToBase64(message2.logs);
        }
        res.status(message2.status).send(message2);
    });
});

router.get("/service/status",
           function(req, res) {
    xcConsole.log("Getting Xcalar status as Master");
    let rawCookie = support.rawSessionCookie(req);
    // req.query for Ajax, req.body for sennRequest
    support.masterExecuteAction("GET", "/service/status/slave", req.query, rawCookie)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/bundle",
            [support.checkAuth], function(req, res) {
    xcConsole.log("Generating Support Bundle as Master");
    let rawCookie = support.rawSessionCookie(req);
    support.masterExecuteAction("POST", "/service/bundle/slave", req.body, rawCookie)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

// Slave request
router.post("/service/start/slave",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Starting Xcalar as Slave");
    support.slaveExecuteAction("POST", "/service/start/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/service/stop/slave",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Stopping Xcalar as Slave");
    support.slaveExecuteAction("POST", "/service/stop/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.get("/service/status/slave",
           [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Getting Xcalar status as Slave");
    support.slaveExecuteAction("GET", "/service/status/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/service/bundle/slave",
            [support.checkAuth], function(req, res) {
    xcConsole.log("Generating Support Bundle as Slave")
    support.slaveExecuteAction("POST", "/service/bundle/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
})
// Single node commands
router.delete("/service/sessionFiles",
              [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Removing Session Files");
    let filename =  req.body.filename;
    support.removeSessionFiles(filename)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.delete("/service/SHMFiles",
              [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Removing Files under folder SHM");
    support.removeSHM()
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/license",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Get License");
    support.getLicense()
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/ticket",
            [support.checkAuth], function(req, res) {
    xcConsole.log("File Ticket");
    let contents = req.body.contents;
    support.submitTicket(contents)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/gettickets",
            [support.checkAuth], function(req, res) {
    xcConsole.log("Get Tickets");
    let contents = req.body.contents;
    support.getTickets(contents)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/upgradeQuery", function(req, res) {
    xcConsole.log("Convert queries to dataflow 2.0");
    let reqBody = req.body;

    if (typeof reqBody === "string") {
        reqBody = JSON.parse(reqBody);
    }

    fs.readFile(reqBody.filename, 'utf8', (_err, contents) => {
        let converter = new DagQueryConverter(contents, true);
        let contentsOut = converter.getResult();
        // The converter returns an empty dataflow if error is caught
        if (typeof contentsOut === "object") {
            contentsOut = JSON.stringify(contentsOut);
        }
        fs.writeFile(reqBody.filenameOut, contentsOut, (_err) => {
            res.status(httpStatus.OK).send();
        });
    });
});

router.get("/service/hotPatch",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Find Hot Patch");
    support.getHotPatch()
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.post("/service/hotPatch",
            [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Set Hot Patch");
    let enableHotPatches = req.body.enableHotPatches;
    support.setHotPatch(enableHotPatches)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/matchedHosts",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Find matched Hosts");
    support.getMatchedHosts(req.query)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.get("/service/logs",
           [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Fetching Recent Logs as Master");
    let rawCookie = support.rawSessionCookie(req);
    support.masterExecuteAction("GET", "/service/logs/slave", req.query, rawCookie)
    .always(function(message) {
        if (message.logs) {
            message.logs = serviceManager.convertToBase64(message.logs);
        }
        res.status(message.status).send(message);
    });
});

router.get("/service/logs/slave",
           [support.checkAuthAdmin], function(req, res) {
    xcConsole.log("Fetching Recent Logs as Slave");
    support.slaveExecuteAction("GET", "/service/logs/slave", req.body)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.get("/service/getTime", function(req, res) {
    res.status(httpStatus.OK).send(JSON.stringify(Date.now()));
});
// End of service calls


// Below part is only for Unit Test
function fakeMasterExecuteAction(func: any) {
    support.masterExecuteAction = func;
}
function fakeSlaveExecuteAction(func: any) {
    support.slaveExecuteAction = func;
}
function fakeRemoveSessionFiles(func: any) {
    support.removeSessionFiles = func;
}
function fakeRemoveSHM(func: any) {
    support.removeSHM = func;
}
function fakeGetLicense(func: any) {
    support.getLicense = func;
}
function fakeSubmitTicket(func: any) {
    support.submitTicket = func;
}
function fakeGetMatchedHosts(func: any) {
    support.getMatchedHosts = func;
}
function fakeGetTickets(func: any) {
    support.getTickets = func;
}
function fakeGetHotPatch(func: any) {
    support.getHotPatch = func;
}
function fakeSetHotPatch(func: any) {
    support.setHotPatch = func;
}

if (process.env.NODE_ENV === "test") {
    exports.fakeMasterExecuteAction = fakeMasterExecuteAction;
    exports.fakeSlaveExecuteAction = fakeSlaveExecuteAction;
    exports.fakeRemoveSessionFiles = fakeRemoveSessionFiles;
    exports.fakeRemoveSHM = fakeRemoveSHM;
    exports.fakeGetLicense = fakeGetLicense;
    exports.fakeSubmitTicket = fakeSubmitTicket;
    exports.fakeGetMatchedHosts = fakeGetMatchedHosts;
    exports.fakeGetTickets = fakeGetTickets;
    exports.fakeGetHotPatch = fakeGetHotPatch;
    exports.fakeSetHotPatch = fakeSetHotPatch;
}