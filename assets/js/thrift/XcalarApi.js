var runEntity = (typeof window !== 'undefined' && this === window ?
                                                              window : exports);

var userIdUnique = 1;
var userIdName = "test";

var verbose = true;
var superVerbose = true;

ThriftHandle = function(args) {
    this.transport = null;
    this.protocol = null;
    this.client = null;
};

WorkItem = function() {
    var workItem = new XcalarApiWorkItemT();
    workItem.userIdUnique = userIdUnique;
    workItem.userId = userIdName;
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    return (workItem);
};

xcalarConnectThrift = runEntity.xcalarConnectThrift = function(hostname) {
    // protocol needs to be part of hostname
    // If not it's assumed ot be http://

    // If you have special ports, it needs to be part of the hostname
    if (hostname.indexOf("http") === -1) {
        hostname = "http://" + hostname;
    }
    var thriftUrl = hostname + "/thrift/service/XcalarApiService/";

    console.log("xcalarConnectThrift(thriftUrl = " + thriftUrl + ")");

    var transport = new Thrift.Transport(thriftUrl);
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var thriftHandle = new ThriftHandle();
    thriftHandle.transport = transport;
    thriftHandle.protocol = protocol;
    thriftHandle.client = client;

    return (thriftHandle);
};

xcalarGetNumNodesWorkItem = runEntity.xcalarGetNumNodesWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiGetNumNodes;
    return (workItem);
};

xcalarGetNumNodes = runEntity.xcalarGetNumNodes = function(thriftHandle) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarGetNumNodes()");
    }
    var workItem = xcalarGetNumNodesWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getNumNodesOutput = result.output.outputResult.getNumNodesOutput;
        // No status
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarGetNumNodes() caught exception:", error);

        error = new XcalarApiGetNumNodesOutputT();
        error.version = "<unknown>";
        error.apiVersionSignatureFull = "<unknown>";
        error.apiVersionSignatureShort = 0;

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetVersionWorkItem = runEntity.xcalarGetVersionWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiGetVersion;
    return (workItem);
};

xcalarGetVersion = runEntity.xcalarGetVersion = function(thriftHandle) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarGetVersion()");
    }
    var workItem = xcalarGetVersionWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getVersionOutput = result.output.outputResult.getVersionOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = status.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getVersionOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetVersion() caught exception:", error);

        error = new XcalarApiGetVersionOutputT();
        error.version = "<unknown>";
        error.apiVersionSignatureFull = "<unknown>";
        error.apiVersionSignatureShort = 0;

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetLicenseWorkItem = runEntity.xcalarGetLicenseWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiGetLicense;
    return (workItem);
};

xcalarGetLicense = runEntity.xcalarGetLicense = function(thriftHandle) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarGetLicense()");
    }
    var workItem = xcalarGetLicenseWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getLicenseOutput = result.output.outputResult.getLicenseOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = status.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getLicenseOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetLicense() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetConfigParamsWorkItem = runEntity.xcalarGetConfigParamsWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiGetConfigParams;
    return (workItem);
};

xcalarGetConfigParams = runEntity.xcalarGetConfigParams = function(thriftHandle) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarGetConfigParams()");
    }
    var workItem = xcalarGetConfigParamsWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getConfigParamsOutput = result.output.outputResult.getConfigParamsOutput;
        // No status
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(getConfigParamsOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetConfigParams() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarSetConfigParamWorkItem = runEntity.xcalarSetConfigParamWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiSetConfigParam;
    workItem.input.setConfigParamInput = new XcalarApiSetConfigParamInputT();
    workItem.input.setConfigParamInput.paramName = paramName;
    workItem.input.setConfigParamInput.paramValue = paramValue;
    return (workItem);
};

xcalarSetConfigParam = runEntity.xcalarSetConfigParam = function(thriftHandle, paramName, paramValue) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarSetConfigParam(paramName = " + paramName +
                    ", paramValue = " + paramValue + ")");
    }
    var workItem = xcalarSetConfigParamWorkItem(paramName, paramValue);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarSetConfigParam() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarAppSetWorkItem = runEntity.xcalarAppSetWorkItem = function(name, hostType, duty, execStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.api = XcalarApisT.XcalarApiAppSet;

    workItem.input.appSetInput = new XcalarApiAppSetInputT();
    workItem.input.appSetInput.name = name;
    workItem.input.appSetInput.hostType = hostType;
    workItem.input.appSetInput.duty = duty;
    workItem.input.appSetInput.execStr = execStr;
    return (workItem);
};

xcalarAppSet = runEntity.xcalarAppSet = function(thriftHandle, name, hostType, duty, execStr) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAppSet(name = " + name +
                    ", hostType = " + hostType + ", duty = " +
                   duty + ")");
    }
    var workItem = xcalarAppSetWorkItem(name, hostType, duty, execStr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarAppSet() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarAppRunWorkItem = runEntity.xcalarAppRunWorkItem = function(name, isGlobal, inStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.api = XcalarApisT.XcalarApiAppRun;

    workItem.input.appRunInput = new XcalarApiAppRunInputT();
    workItem.input.appRunInput.name = name;
    workItem.input.appRunInput.isGlobal = isGlobal;
    workItem.input.appRunInput.inStr = inStr;

    return (workItem);
};

xcalarAppRun = runEntity.xcalarAppRun = function(thriftHandle, name, isGlobal, inStr) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAppRun(name = " + name + ", isGlobal = " + isGlobal +
                    ", inStr = " + inStr + ")");
    }
    var workItem = xcalarAppRunWorkItem(name, isGlobal, inStr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function (result) {
        var status = result.output.hdr.status;
        var appRunOutput = result.output.outputResult.appRunOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(appRunOutput);
    })
    .fail(function(error) {
        console.log("xcalarAppRun() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarAppReapWorkItem = runEntity.xcalarAppReapWorkItem = function(appGroupId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.api = XcalarApisT.XcalarApiAppReap;

    workItem.input.appReapInput = new XcalarApiAppReapInputT();
    workItem.input.appReapInput.appGroupId = appGroupId;

    return (workItem);
};

xcalarAppReap = runEntity.xcalarAppReap = function(thriftHandle, appGroupId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAppReap(appGroupId = " + appGroupId + ")");
    }
    var workItem = xcalarAppReapWorkItem(appGroupId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function (result) {
        var status = result.output.hdr.status;
        var appReapOutput = result.output.outputResult.appReapOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(appReapOutput);
        }
        deferred.resolve(appReapOutput);
    })
    .fail(function(error) {
        console.log("xcalarAppReap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarPreviewWorkItem = runEntity.xcalarPreviewWorkItem = function(url, fileNamePattern, recursive, numBytesRequested, offset) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    var inputObj = {"func" : "preview",
                    "url" : url,
                    "namePattern" : fileNamePattern,
                    "recursive" : recursive,
                    "offset" : offset,
                    "bytesRequested" : numBytesRequested};

    workItem.api = XcalarApisT.XcalarApiPreview;
    workItem.input.previewInput = new XcalarApiPreviewInputT();
    workItem.input.previewInput.inputJson = JSON.stringify(inputObj);
    return (workItem);
};

xcalarPreview = runEntity.xcalarPreview = function(thriftHandle, url, fileNamePattern, recursive, numBytesRequested, offset) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarPreview(url = " + url +
                    ", fileNamePattern = " + fileNamePattern +
                    ", recursive = " + recursive +
                    ", numBytesRequested = " + numBytesRequested +
                    ", offset =" + offset);
    }

    var workItem = xcalarPreviewWorkItem(url, fileNamePattern, recursive, numBytesRequested, offset);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var previewOutput = result.output.outputResult.previewOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        // previewOutput has a jsonOutput field which is a json formatted string
        // which has several fields of interest:
        // {"fileName" :
        //  "relPath" :
        //  "fullPath" :
        //  "base64Data" :
        //  "thisDataSize" :
        //  "totalDataSize" :
        //  }
        deferred.resolve(previewOutput);
    })
    .fail(function(error) {
        console.log("xcalarPreview() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarLoadWorkItem = runEntity.xcalarLoadWorkItem = function(url, name, format, maxSampleSize, loadArgs) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.dataset = new XcalarApiDatasetT();

    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.dataset.url = url;
    workItem.input.loadInput.dataset.name = name;
    workItem.input.loadInput.dataset.formatType = format;
    workItem.input.loadInput.loadArgs = loadArgs;
    workItem.input.loadInput.loadArgs.maxSize = maxSampleSize;
    return (workItem);
};

xcalarLoad = runEntity.xcalarLoad = function(thriftHandle, url, name, format, maxSampleSize, loadArgs) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarLoad(url = " + url + ", name = " + name +
                    ", format = " +
                    DfFormatTypeTStr[format] + ", maxSampleSize = " +
                    maxSampleSize.toString() + ", recursive = " +
		    loadArgs.recursive + ", fileNamePattern = " +
		    loadArgs.fileNamePattern + ")");
        if (format === DfFormatTypeT.DfFormatCsv) {
            console.log("loadArgs.csv.recordDelim = " + loadArgs.csv.recordDelim + ", " +
                        "loadArgs.csv.fieldDelim = " + loadArgs.csv.fieldDelim + ", " +
                        "loadArgs.csv.quoteDelim = " + loadArgs.csv.quoteDelim + ", " +
                        "loadArgs.csv.linesToSkip = " + loadArgs.csv.linesToSkip + ", " +
                        "loadArgs.csv.isCRLF = " + loadArgs.csv.isCRLF + ", " +
                        "loadArgs.csv.hasHeader = " + loadArgs.csv.hasHeader);
        }
    }

    var workItem = xcalarLoadWorkItem(url, name, format, maxSampleSize,
                                      loadArgs);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        var loadOutput = result.output.outputResult.loadOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status, loadOutput);
        }
        deferred.resolve(loadOutput);
    })
    .fail(function(error) {
        console.log("xcalarLoad() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

};

xcalarIndexDatasetWorkItem = runEntity.xcalarIndexDatasetWorkItem = function(datasetName, keyName, dstTableName,
                                    dhtName, fatptrPrefixName, ordering,
                                    keyType) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = false;
    workItem.input.indexInput.source.name = datasetName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;
    workItem.input.indexInput.dhtName = dhtName;
    workItem.input.indexInput.fatptrPrefixName = fatptrPrefixName;
    workItem.input.indexInput.ordering = ordering;
    workItem.input.indexInput.keyType = keyType;
    return (workItem);
};

xcalarIndexDataset = runEntity.xcalarIndexDataset = function(thriftHandle, datasetName, keyName, dstTableName,
                            dhtName, ordering, fatptrPrefixName, keyType) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarIndexDataset(datasetName = " + datasetName +
                    ", keyName = " + keyName + ", dstTableName = " +
                    dstTableName + ", fatptrPrefixName = " +
                    fatptrPrefixName + ", ordering = " + ordering +
                    ", keyType = " + keyType + ")");
    }

    var workItem = xcalarIndexDatasetWorkItem(datasetName, keyName,
                                              dstTableName, dhtName,
                                              fatptrPrefixName, ordering,
                                              keyType);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.outputResult.indexOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexDataset() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarIndexTableWorkItem = runEntity.xcalarIndexTableWorkItem = function(srcTableName, dstTableName, keyName, dhtName,
                                  ordering, keyType) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = true;
    workItem.input.indexInput.source.name = srcTableName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;
    workItem.input.indexInput.dhtName = dhtName;
    workItem.input.indexInput.ordering = ordering;
    workItem.input.indexInput.keyType = keyType;
    return (workItem);
};

xcalarIndexTable = runEntity.xcalarIndexTable = function(thriftHandle, srcTableName, keyName, dstTableName,
                          dhtName, ordering, keyType) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarIndexTable(srcTableName = " + srcTableName +
                   ", keyName = " + keyName + ", dstTableName = " +
                    dstTableName + ", dhtName = " + dhtName +
                    ", ordering = " + ordering +
                    ", keyType = " + keyType + ")");
    }

    var workItem = xcalarIndexTableWorkItem(srcTableName, dstTableName,
                                            keyName, dhtName, ordering,
                                            keyType);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.outputResult.indexOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetMetaWorkItem = runEntity.xcalarGetMetaWorkItem = function(datasetName, tableName, isPrecise) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableMetaInput = new XcalarApiGetTableMetaInputT();
    workItem.input.getTableMetaInput.tableNameInput = new XcalarApiNamedInputT();

    workItem.api = XcalarApisT.XcalarApiGetTableMeta;
    if (tableName === "") {
        workItem.input.getTableMetaInput.tableNameInput.isTable = false;
        workItem.input.getTableMetaInput.tableNameInput.name = datasetName;
        workItem.input.getTableMetaInput.isPrecise = isPrecise;
    } else {
        workItem.input.getTableMetaInput.tableNameInput.isTable = true;
        workItem.input.getTableMetaInput.tableNameInput.name = tableName;
        workItem.input.getTableMetaInput.isPrecise = isPrecise;
    }
    workItem.input.getTableMetaInput.tableNameInput.xid = XcalarApiXidInvalidT;

    return (workItem);
};

xcalarGetMetaInt = runEntity.xcalarGetMetaInt = function(thriftHandle, datasetName, tableName, isPrecise) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetMeta(tableName = " + tableName + ", " +
                    "datasetName =" + datasetName + ")");
    }

    var workItem = xcalarGetMetaWorkItem(datasetName, tableName, isPrecise);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var metaOutput = result.output.outputResult.getTableMetaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(metaOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetMeta() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetDatasetMeta = runEntity.xcalarGetDatasetMeta = function(thriftHandle, datasetName) {
    return (xcalarGetMetaInt(thriftHandle, datasetName, "", false));
};

xcalarGetTableMeta = runEntity.xcalarGetTableMeta = function(thriftHandle, tableName, isPrecise) {
    return (xcalarGetMetaInt(thriftHandle, "", tableName, isPrecise));
};

xcalarShutdownWorkItem = runEntity.xcalarShutdownWorkItem = function(force) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiShutdown;
    workItem.input.shutdownInput = force;
    return (workItem);
};

xcalarShutdown = runEntity.xcalarShutdown = function(thriftHandle, force) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarShutdown()");
    }

    var workItem = xcalarShutdownWorkItem(force);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarShutdown() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarStartNodesWorkItem = runEntity.xcalarStartNodesWorkItem = function(numNodes) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.startNodesInput = new XcalarApiStartNodesInputT();

    workItem.api = XcalarApisT.XcalarApiStartNodes;
    workItem.input.startNodesInput.numNodes = numNodes;
    return (workItem);
};

xcalarStartNodes = runEntity.xcalarStartNodes = function(thriftHandle, numNodes) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarStartNodes(numNodes = " + numNodes + ")");
    }

    var workItem = xcalarStartNodesWorkItem(numNodes);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarStartNodes() caught exception: "+error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetStatsWorkItem = runEntity.xcalarGetStatsWorkItem = function(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiGetStat;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
};

xcalarGetStats = runEntity.xcalarGetStats = function(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarGetStats(nodeId = " + nodeId.toString() + ")");
    }

    var workItem = xcalarGetStatsWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.outputResult.statOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarRenameNodeWorkItem = runEntity.xcalarRenameNodeWorkItem = function(oldName, newName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.renameNodeInput = new XcalarApiRenameNodeInputT();
    workItem.input.renameNodeInput.oldName = oldName;
    workItem.input.renameNodeInput.newName = newName;

    workItem.api = XcalarApisT.XcalarApiRenameNode;
    return (workItem);
};

xcalarRenameNode = runEntity.xcalarRenameNode = function(thriftHandle, oldName, newName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarRenameNode(oldName = " + oldName +
                    ", newName = " + newName + ")");
    }

    var workItem = xcalarRenameNodeWorkItem(oldName, newName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        // statusOutput is a status
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarRenameNode() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetStatsByGroupIdWorkItem = runEntity.xcalarGetStatsByGroupIdWorkItem = function(nodeIdList, groupIdList) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statByGroupIdInput = new XcalarApiStatByGroupIdInputT();

    workItem.api = XcalarApisT.XcalarApiGetStatByGroupId;
    workItem.input.statByGroupIdInput.numNodeId = nodeIdList.length;
    workItem.input.statByGroupIdInput.nodeId = nodeIdList;
    workItem.input.statByGroupIdInput.numGroupId = groupIdList.length;
    workItem.input.statByGroupIdInput.groupId = groupIdList;
    return (workItem);
};

xcalarGetStatsByGroupId = runEntity.xcalarGetStatsByGroupId = function(thriftHandle, nodeIdList, groupIdList) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetStatsByGroupId(nodeIds = " + nodeIdList.toString() +
                    ", numGroupIds = ", + groupIdList.length.toString() +
                    ", ...)");
    }

    var workItem = xcalarGetStatsByGroupIdWorkItem(nodeIdList, groupIdList);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.outputResult.statOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatsByGroupId() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarResetStatsWorkItem = runEntity.xcalarResetStatsWorkItem = function(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiResetStat;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
};

xcalarResetStats = runEntity.xcalarResetStats = function(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarResetStats(nodeId = " + nodeId.toString() + ")");
    }

    var workItem = xcalarResetStatsWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetStatGroupIdMapWorkItem = runEntity.xcalarGetStatGroupIdMapWorkItem = function(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiGetStatGroupIdMap;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
};

xcalarGetStatGroupIdMap = runEntity.xcalarGetStatGroupIdMap = function(thriftHandle, nodeId, numGroupId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetStatGroupIdMap(nodeId = " + nodeId.toString() +
                    ", numGroupId = " + numGroupId.toString() + ")");
    }

    var workItem = xcalarGetStatGroupIdMapWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statGroupIdMapOutput =
                                result.output.outputResult.statGroupIdMapOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statGroupIdMapOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatGroupIdMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarQueryWorkItem = runEntity.xcalarQueryWorkItem = function(queryName, queryStr, sameSession) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryInput = new XcalarApiQueryInputT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiQuery;
    workItem.input.queryInput.queryName = queryName;
    workItem.input.queryInput.queryStr = queryStr;
    workItem.input.queryInput.sameSession = sameSession;
    return (workItem);
};

xcalarQuery = runEntity.xcalarQuery = function(thriftHandle, queryName, queryStr, sameSession) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQuery(query name= " + queryName +
                    " queryStr" + queryStr + ")");
    }
    var workItem = xcalarQueryWorkItem(queryName, queryStr, sameSession);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var queryOutput = result.output.outputResult.queryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(queryOutput);
    })
    .fail(function(error) {
        console.log("xcalarQuery() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarQueryStateWorkItem = runEntity.xcalarQueryStateWorkItem = function(queryName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryNameInputT();

    workItem.api = XcalarApisT.XcalarApiQueryState;
    workItem.input.queryStateInput.queryName = queryName;
    return (workItem);
};

xcalarQueryState = runEntity.xcalarQueryState = function(thriftHandle, queryName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQueryState(query name = " + queryName + ")");
    }

    var workItem = xcalarQueryStateWorkItem(queryName);

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var queryStateOutput = result.output.outputResult.queryStateOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(queryStateOutput);
    })
    .fail(function(error) {
        console.log("xcalarQueryState() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarQueryCancelWorkItem = runEntity.xcalarQueryCancelWorkItem = function(queryName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryNameInputT();

    workItem.api = XcalarApisT.XcalarApiQueryCancel;
    workItem.input.queryStateInput.queryName = queryName;
    return (workItem);
};

xcalarQueryCancel = runEntity.xcalarQueryCancel = function(thriftHandle, queryName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQueryCancel(query name = " + queryName + ")");
    }

    var workItem = xcalarQueryCancelWorkItem(queryName);

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarQueryCancel() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarQueryDeleteWorkItem = runEntity.xcalarQueryDeleteWorkItem = function(queryName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryNameInputT();

    workItem.api = XcalarApisT.XcalarApiQueryDelete;
    workItem.input.queryStateInput.queryName = queryName;
    return (workItem);
};

xcalarQueryDelete = runEntity.xcalarQueryDelete = function(thriftHandle, queryName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQueryDelete(query name = " + queryName + ")");
    }

    var workItem = xcalarQueryDeleteWorkItem(queryName);

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarQueryDelete() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetOpStatsWorkItem = runEntity.xcalarGetOpStatsWorkItem = function(dstDagName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiGetOpStats;
    workItem.input.dagTableNameInput = dstDagName;
    return (workItem);
};

xcalarApiGetOpStats = runEntity.xcalarApiGetOpStats = function(thriftHandle, dstDagName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiGetOpStats(dstDagName = " + dstDagName + ")");
    }
    var workItem = xcalarGetOpStatsWorkItem(dstDagName);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        var opStatsOutput = result.output.outputResult.opStatsOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(opStatsOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiGetOpStats() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarCancellationWorkItem = runEntity.xcalarCancellationWorkItem = function(dstDagName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiCancelOp;
    workItem.input.dagTableNameInput = dstDagName;
    return (workItem);
};

xcalarApiCancelOp = runEntity.xcalarApiCancelOp = function(thriftHandle, dstDagName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiCancelOp(dstDagName = " + dstDagName + ")");
    }
    var workItem = xcalarCancellationWorkItem(dstDagName);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarApiCancelOp() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarDagWorkItem = runEntity.xcalarDagWorkItem = function(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiGetDag;
    workItem.input.dagTableNameInput = tableName;
    return (workItem);
};

xcalarDag = runEntity.xcalarDag = function(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDag(tableName = " + tableName + ")");
    }

    var workItem = xcalarDagWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var dagOutput = result.output.outputResult.dagOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(dagOutput);
    })
    .fail(function(error) {
        console.log("xcalarDag() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarListDagNodesWorkItem = runEntity.xcalarListDagNodesWorkItem = function(patternMatch, srcType) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDagNodeInfo;
    workItem.input.listDagNodesInput = new XcalarApiDagNodeNamePatternInputT();
    workItem.input.listDagNodesInput.namePattern = patternMatch;
    workItem.input.listDagNodesInput.srcType = srcType;

    return (workItem);
};

xcalarListTables = runEntity.xcalarListTables = function(thriftHandle, patternMatch, srcType) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListTables(patternMatch = " + patternMatch + ")" +
                    " srcType = " + srcType);
    }

    var workItem = xcalarListDagNodesWorkItem(patternMatch, srcType);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listNodesOutput = result.output.outputResult.listNodesOutput;

        // No job specific status
        if (result.jobStatus != StatusT.StatusOk) {
            listNodesOutput.numTables = 0;
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(listNodesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarListDatasetsWorkItem = runEntity.xcalarListDatasetsWorkItem = function() {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDatasets;
    return (workItem);
};

xcalarListDatasets = runEntity.xcalarListDatasets = function(thriftHandle) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListDatasets()");
    }

    var workItem = xcalarListDatasetsWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listDatasetsOutput = result.output.outputResult.listDatasetsOutput;
        // No job specific status
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        console.log("xcalarListDatasets() caught exception:", error);

        var listDatasetsOutput = new XcalarApiListDatasetsOutputT();
        // XXX FIXME should add StatusT.StatusThriftProtocolError
        listDatasetsOutput.numDatasets = 0;

        deferred.reject(listDatasetsOutput);
    });

    return (deferred.promise());
};

xcalarMakeResultSetFromTableWorkItem = runEntity.xcalarMakeResultSetFromTableWorkItem = function(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = true;
    workItem.input.makeResultSetInput.name = tableName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;
    return (workItem);
};

xcalarMakeResultSetFromTable = runEntity.xcalarMakeResultSetFromTable = function(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeResultSetFromTable(tableName = " + tableName +
                    ")");
    }

    var workItem = xcalarMakeResultSetFromTableWorkItem(tableName);

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.outputResult.makeResultSetOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(makeResultSetOutput);
    })
    .fail(function(error) {
        console.log("xcalarMakeResultSetFromTable() caught exception:", error);

        makeResultSetOutput = new XcalarApiMakeResultSetOutputT();
        makeResultSetOutput.status = StatusT.StatusThriftProtocolError;

        deferred.reject(makeResultSetOutput);
    });

    return (deferred.promise());
};

xcalarMakeResultSetFromDatasetWorkItem = runEntity.xcalarMakeResultSetFromDatasetWorkItem = function(datasetName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = false;
    workItem.input.makeResultSetInput.name = datasetName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;
    return (workItem);
};

xcalarMakeResultSetFromDataset = runEntity.xcalarMakeResultSetFromDataset = function(thriftHandle, datasetName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeResultSetFromDataset(datasetName = " +
                    datasetName + ")");
    }

    var workItem = xcalarMakeResultSetFromDatasetWorkItem(datasetName);

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.outputResult.makeResultSetOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(makeResultSetOutput);
    })
    .fail(function(error) {
        console.log("xcalarMakeResultSetFromDataset() caught exception:",
                    error);

        makeResultSetOutput = new XcalarApiMakeResultSetOutputT();
        makeResultSetOutput.status = StatusT.StatusThriftProtocolError;

        deferred.reject(makeResultSetOutput);
    });

    return (deferred.promise());
};

xcalarResultSetNextWorkItem = runEntity.xcalarResultSetNextWorkItem = function(resultSetId, numRecords) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();

    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input.resultSetNextInput.resultSetId = resultSetId;
    workItem.input.resultSetNextInput.numRecords = numRecords;
    return (workItem);
};

xcalarResultSetNext = runEntity.xcalarResultSetNext = function(thriftHandle, resultSetId, numRecords) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarResultSetNext(resultSetId = " +
                    resultSetId +
                    ", numRecords = " + numRecords.toString() + ")");
    }

    var workItem = xcalarResultSetNextWorkItem(resultSetId, numRecords);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var resultSetNextOutput =
                                 result.output.outputResult.resultSetNextOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(resultSetNextOutput);
    })
    .fail(function(error) {
        console.log("xcalarResultSetNext() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarJoinWorkItem = runEntity.xcalarJoinWorkItem = function(leftTableName, rightTableName, joinTableName,
                            joinType, leftRenameMap, rightRenameMap,
                            collisionCheck) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.joinInput = new XcalarApiJoinInputT();
    workItem.input.joinInput.leftTable = new XcalarApiTableInputT();
    workItem.input.joinInput.rightTable = new XcalarApiTableInputT();
    workItem.input.joinInput.joinTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiJoin;
    workItem.input.joinInput.leftTable.tableName = leftTableName;
    workItem.input.joinInput.leftTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.rightTable.tableName = rightTableName;
    workItem.input.joinInput.rightTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinTable.tableName = joinTableName;
    workItem.input.joinInput.joinTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinType = joinType;
    workItem.input.joinInput.collisionCheck = collisionCheck;
    workItem.input.joinInput.renameMap = null;

    if (leftRenameMap == null) {
        workItem.input.joinInput.numLeftColumns = 0;
    } else {
        workItem.input.joinInput.numLeftColumns = leftRenameMap.length;
        workItem.input.joinInput.renameMap = leftRenameMap;
    }

    if (rightRenameMap == null) {
        workItem.input.joinInput.numRightColumns = 0;
    } else {
        workItem.input.joinInput.numRightColumns = rightRenameMap.length;
        if (workItem.input.joinInput.renameMap == null) {
            workItem.input.joinInput.renameMap = rightRenameMap;
        } else {
            workItem.input.joinInput.renameMap =
                workItem.input.joinInput.renameMap.concat(rightRenameMap);
        }
    }

    return (workItem);
};

xcalarJoin = runEntity.xcalarJoin = function(thriftHandle, leftTableName, rightTableName, joinTableName,
                    joinType, leftRenameMap, rightRenameMap, collisionCheck) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarJoin(leftTableName = " + leftTableName +
                    ", rightTableName = " + rightTableName +
                    ", joinTableName = " + joinTableName +
                    ", joinType = " + JoinOperatorTStr[joinType] +
                    ", leftRenameMap = [" + leftRenameMap + "]" +
                    ", rightRenameMap = [" + rightRenameMap + "]" +
                    ", collisionCheck = " + collisionCheck +
                    ")");
    }

    var workItem = xcalarJoinWorkItem(leftTableName, rightTableName,
                                      joinTableName, joinType,
                                      leftRenameMap, rightRenameMap,
                                      collisionCheck);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var joinOutput = result.output.outputResult.joinOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(joinOutput);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarJoin() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarProjectWorkItem = runEntity.xcalarProjectWorkItem = function(numColumns, columns,
                               srcTableName, dstTableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.projectInput = new XcalarApiProjectInputT();
    workItem.input.projectInput.srcTable = new XcalarApiTableInputT();
    workItem.input.projectInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiProject;
    workItem.input.projectInput.srcTable.tableName = srcTableName;
    workItem.input.projectInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.projectInput.dstTable.tableName = dstTableName;
    workItem.input.projectInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.projectInput.numColumns = numColumns;
    workItem.input.projectInput.columnNames = columns;
    return (workItem);
};

xcalarProject = runEntity.xcalarProject = function(thriftHandle, numColumns, columns,
                       srcTableName, dstTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarProject(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName +
                    ", numColumns = " + numColumns +
                    ", columns = [" + columns + "]" +
                    ")");
    }

    var workItem = xcalarProjectWorkItem(numColumns, columns,
                                         srcTableName, dstTableName);

    var projectOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        projectOutput = result.output.outputResult.projectOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(projectOutput);
    })
    .fail(function(error) {
        console.log("xcalarProject() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarFilterWorkItem = runEntity.xcalarFilterWorkItem = function(srcTableName, dstTableName, filterStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.srcTable = new XcalarApiTableInputT();
    workItem.input.filterInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.srcTable.tableName = srcTableName;
    workItem.input.filterInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.dstTable.tableName = dstTableName;
    workItem.input.filterInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.filterStr = filterStr;
    return (workItem);
};

xcalarFilter = runEntity.xcalarFilter = function(thriftHandle, filterStr, srcTableName, dstTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarFilter(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ", filterStr = " +
                    filterStr + ")");
    }

    var workItem = xcalarFilterWorkItem(srcTableName, dstTableName, filterStr);

    var filterOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        filterOutput = result.output.outputResult.filterOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(filterOutput);
    })
    .fail(function(error) {
        console.log("xcalarFilter() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGroupByWorkItem = runEntity.xcalarGroupByWorkItem = function(srcTableName, dstTableName, groupByEvalStr,
                               newFieldName, includeSrcSample, icvMode) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.groupByInput = new XcalarApiGroupByInputT();
    workItem.input.groupByInput.srcTable = new XcalarApiTableInputT();
    workItem.input.groupByInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiGroupBy;
    workItem.input.groupByInput.srcTable.tableName = srcTableName;
    workItem.input.groupByInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.dstTable.tableName = dstTableName;
    workItem.input.groupByInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.evalStr = groupByEvalStr;
    workItem.input.groupByInput.newFieldName = newFieldName;
    workItem.input.groupByInput.includeSrcTableSample = includeSrcSample;
    workItem.input.groupByInput.icvMode = icvMode;
    return (workItem);
};

xcalarGroupByWithWorkItem = runEntity.xcalarGroupByWithWorkItem = function(thriftHandle, workItem) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGroupBy(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ", groupByEvalStr = " +
                    groupByEvalStr + ", newFieldName = " + newFieldName +
                    ", icvMode = " + icvMode + ")");
    }

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var groupByOutput = result.output.outputResult.groupByOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(groupByOutput);
    })
    .fail(function(error) {
        console.log("xcalarGroupBy() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarGroupBy = runEntity.xcalarGroupBy = function(thriftHandle, srcTableName, dstTableName, groupByEvalStr,
                       newFieldName, includeSrcSample, icvMode) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGroupBy(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ", groupByEvalStr = " +
                    groupByEvalStr + ", newFieldName = " + newFieldName +
                    ", icvMode = " + icvMode + ")");
    }

    var workItem = xcalarGroupByWorkItem(srcTableName, dstTableName,
                                         groupByEvalStr, newFieldName,
                                         includeSrcSample, icvMode);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var groupByOutput = result.output.outputResult.groupByOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(groupByOutput);
    })
    .fail(function(error) {
        console.log("xcalarGroupBy() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarResultSetAbsoluteWorkItem = runEntity.xcalarResultSetAbsoluteWorkItem = function(resultSetId, position) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetAbsoluteInput =
        new XcalarApiResultSetAbsoluteInputT();

    workItem.api = XcalarApisT.XcalarApiResultSetAbsolute;
    workItem.input.resultSetAbsoluteInput.resultSetId = resultSetId;
    workItem.input.resultSetAbsoluteInput.position = position;
    return (workItem);
};

xcalarResultSetAbsolute = runEntity.xcalarResultSetAbsolute = function(thriftHandle, resultSetId, position) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarResultSetAbsolute(resultSetId = " +
                    resultSetId + ", position = " +
                    position.toString() + ")");
    }
    var workItem = xcalarResultSetAbsoluteWorkItem(resultSetId, position);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResultSetAbsolute() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarFreeResultSetWorkItem = runEntity.xcalarFreeResultSetWorkItem = function(resultSetId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.freeResultSetInput = new XcalarApiFreeResultSetInputT();

    workItem.api = XcalarApisT.XcalarApiFreeResultSet;
    workItem.input.freeResultSetInput.resultSetId = resultSetId;
    return (workItem);
};

xcalarFreeResultSet = runEntity.xcalarFreeResultSet = function(thriftHandle, resultSetId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarFreeResultSet(resultSetId = " +
                    resultSetId + ")");
    }
    var workItem = xcalarFreeResultSetWorkItem(resultSetId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        // XXX FIXME bug 136
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResultSetAbsolute() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarDeleteDagNodesWorkItem = runEntity.xcalarDeleteDagNodesWorkItem = function(namePattern, srcType) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiDeleteObjects;
    workItem.input.deleteDagNodeInput = new XcalarApiDagNodeNamePatternInputT();
    workItem.input.deleteDagNodeInput.namePattern = namePattern;
    workItem.input.deleteDagNodeInput.srcType = srcType;
    return (workItem);
};

xcalarDeleteDagNodes = runEntity.xcalarDeleteDagNodes = function(thriftHandle, namePattern, srcType) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDeleteDagNodes(namePattern = " + namePattern + ")");
    }
    var workItem = xcalarDeleteDagNodesWorkItem(namePattern, srcType);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var deleteDagNodesOutput = result.output.outputResult.
                                                           deleteDagNodesOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(deleteDagNodesOutput);
    })
    .fail(function(error) {
        console.log("xcalarDeleteDagNodes() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetTableRefCountWorkItem = runEntity.xcalarGetTableRefCountWorkItem = function(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableRefCountInput = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiGetTableRefCount;
    workItem.input.getTableRefCountInput.tableName = tableName;
    workItem.input.getTableRefCountInput.tableId = XcalarApiTableIdInvalidT;
    return (workItem);
};

xcalarGetTableRefCount = runEntity.xcalarGetTableRefCount = function(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetTableRefCount(tableName = " + tableName + ")");
    }
    var workItem = xcalarGetTableRefCountWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getTableRefCountOutput =
                              result.output.outputResult.getTableRefCountOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getTableRefCountOutput);
    })
    .fail(function(error) {
        console.log("xcalarDeleteTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiMapWorkItem = runEntity.xcalarApiMapWorkItem = function(evalStr, srcTableName, dstTableName,
                              newFieldName, icvMode) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.mapInput = new XcalarApiMapInputT();
    workItem.input.mapInput.srcTable = new XcalarApiTableInputT();
    workItem.input.mapInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiMap;
    workItem.input.mapInput.evalStr = evalStr;
    workItem.input.mapInput.srcTable.tableName = srcTableName;
    workItem.input.mapInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.dstTable.tableName = dstTableName;
    workItem.input.mapInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.newFieldName = newFieldName;
    workItem.input.mapInput.icvMode = icvMode;
    return (workItem);
};

xcalarApiMapWithWorkItem = runEntity.xcalarApiMapWithWorkItem = function(thriftHandle, workItem) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        var mapInput = workItem.input.mapInput;
        var newFieldName = mapInput.newFieldName;
        var evalStr = mapInput.evalStr;
        var srcTableName = mapInput.srcTable.tableName;
        var dstTableName = mapInput.dstTable.tableName;
        var icvMode = mapInput.icvMode;
        console.log("xcalarApiMapWithWorkItem(newFieldName = " + newFieldName +
                    ", evalStr = " + evalStr + ", srcTableName = " +
                    srcTableName + ", dstTableName = " + dstTableName +
                    ", icvMode = " + icvMode + ")");
    }

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result){
        var mapOutput = result.output.outputResult.mapOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(mapOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiMap = runEntity.xcalarApiMap = function(thriftHandle, newFieldName, evalStr, srcTableName,
                      dstTableName, icvMode) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiMap(newFieldName = " + newFieldName +
                    ", evalStr = " + evalStr + ", srcTableName = " +
                    srcTableName + ", dstTableName = " + dstTableName +
                    ", icvMode = " + icvMode + ")");
    }

    var workItem = xcalarApiMapWorkItem(evalStr, srcTableName, dstTableName,
                                        newFieldName, icvMode);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result){
        var mapOutput = result.output.outputResult.mapOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(mapOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiGetRowNumWorkItem = runEntity.xcalarApiGetRowNumWorkItem = function(srcTableName, dstTableName,
                              newFieldName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.getRowNumInput = new XcalarApiGetRowNumInputT();
    workItem.input.getRowNumInput.srcTable = new XcalarApiTableInputT();
    workItem.input.getRowNumInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiGetRowNum;
    workItem.input.getRowNumInput.srcTable.tableName = srcTableName;
    workItem.input.getRowNumInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.getRowNumInput.dstTable.tableName = dstTableName;
    workItem.input.getRowNumInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.getRowNumInput.newFieldName = newFieldName;
    return (workItem);
};

xcalarApiGetRowNum = runEntity.xcalarApiGetRowNum = function(thriftHandle, newFieldName, srcTableName,
                      dstTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiGetRowNum(newFieldName = " + newFieldName +
                    ", srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ")");
    }

    var workItem = xcalarApiGetRowNumWorkItem(srcTableName, dstTableName,
                                        newFieldName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result){
        var getRowNumOutput = result.output.outputResult.getRowNumOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getRowNumOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiGetRowNum() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarAggregateWorkItem = runEntity.xcalarAggregateWorkItem = function(srcTableName, dstTableName, aggregateEvalStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.aggregateInput = new XcalarApiAggregateInputT();
    workItem.input.aggregateInput.srcTable = new XcalarApiTableInputT();
    workItem.input.aggregateInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiAggregate;
    workItem.input.aggregateInput.srcTable.tableName = srcTableName;
    workItem.input.aggregateInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.aggregateInput.dstTable.tableName = dstTableName;
    workItem.input.aggregateInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.aggregateInput.evalStr = aggregateEvalStr;
    return (workItem);
};

xcalarAggregate = runEntity.xcalarAggregate = function(thriftHandle, srcTableName, dstTableName, aggregateEvalStr) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAggregate(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName +
                    ", aggregateEvalStr = " + aggregateEvalStr + ")");
    }

    var workItem = xcalarAggregateWorkItem(srcTableName, dstTableName, aggregateEvalStr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var aggregateOutput = result.output.outputResult.aggregateOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(aggregateOutput.jsonAnswer);
    })
    .fail(function(error) {
        console.log("xcalarAggregate() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarAddExportTargetWorkItem = runEntity.xcalarAddExportTargetWorkItem = function(target) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiAddExportTarget;
    workItem.input.addTargetInput = target;
    return (workItem);
};

xcalarAddExportTarget = runEntity.xcalarAddExportTarget = function(thriftHandle, target) {
    var deferred = jQuery.Deferred();
    console.log("xcalarAddExportTarget(target.hdr.name = " + target.hdr.name +
                ", target.hdr.type = " + ExTargetTypeTStr[target.hdr.type] +
                ")");

    var workItem = xcalarAddExportTargetWorkItem(target);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarAddExportTarget() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarRemoveExportTargetWorkItem = runEntity.xcalarRemoveExportTargetWorkItem = function(hdr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiRemoveExportTarget;
    workItem.input.removeTargetInput = hdr;
    return (workItem);
};

xcalarRemoveExportTarget = runEntity.xcalarRemoveExportTarget = function(thriftHandle, targetHdr) {
    var deferred = jQuery.Deferred();
    console.log("xcalarRemoveExportTarget(targetHdr.name = " + targetHdr.name +
                ", targetHdr.type = " + ExTargetTypeTStr[targetHdr.type] +
                ")");

    var workItem = xcalarRemoveExportTargetWorkItem(targetHdr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarRemoveExportTarget() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarListExportTargetsWorkItem = runEntity.xcalarListExportTargetsWorkItem = function(typePattern, namePattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.listTargetsInput = new XcalarApiListExportTargetsInputT();

    workItem.api = XcalarApisT.XcalarApiListExportTargets;
    workItem.input.listTargetsInput.targetTypePattern = typePattern;
    workItem.input.listTargetsInput.targetNamePattern = namePattern;
    return (workItem);
};

xcalarListExportTargets = runEntity.xcalarListExportTargets = function(thriftHandle, typePattern, namePattern) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListExportTargets(typePattern = " + typePattern +
                ", namePattern = " + namePattern + ")");

    var workItem = xcalarListExportTargetsWorkItem(typePattern, namePattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listExportTargetsOutput =
            result.output.outputResult.listTargetsOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listExportTargetsOutput);
    })
    .fail(function(error) {
        console.log("xcalarListExportTargets() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarExportWorkItem = runEntity.xcalarExportWorkItem = function(tableName, target, specInput, createRule,
                              sorted, numColumns, columns, exportName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.exportInput = new XcalarApiExportInputT();
    workItem.input.exportInput.srcTable = new XcalarApiTableInputT();
    workItem.input.exportInput.meta = new ExExportMetaT();

    workItem.api = XcalarApisT.XcalarApiExport;
    workItem.input.exportInput.srcTable.tableName = tableName;
    workItem.input.exportInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.exportInput.exportName = exportName;
    workItem.input.exportInput.meta.target = target;
    workItem.input.exportInput.meta.specificInput = specInput;
    workItem.input.exportInput.meta.sorted = sorted;
    workItem.input.exportInput.meta.numColumns = numColumns;
    workItem.input.exportInput.meta.columns = columns;
    workItem.input.exportInput.meta.createRule = createRule;
    return (workItem);
};

xcalarExport = runEntity.xcalarExport = function(thriftHandle, tableName, target, specInput, createRule,
                      sorted, numColumns, columns, exportName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarExport(tableName = " + tableName +
                    ", target.type = " + ExTargetTypeTStr[target.type] +
                    ", target.name = " + target.name +
                    ", createRule = " + createRule +
                    ", specInput = " + JSON.stringify(specInput) +
                    ", sorted = " + sorted +
                    ", numColumns = " + numColumns +
                    ", columns = " + JSON.stringify(columns) +
                    ", exportName = " + exportName +
                    ")");
    }

    var workItem = xcalarExportWorkItem(tableName, target, specInput, createRule,
                                        sorted, numColumns, columns, exportName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarExport() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarListFilesWorkItem = runEntity.xcalarListFilesWorkItem = function(url, recursive, fileNamePattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.listFilesInput = new XcalarApiListFilesInputT();

    workItem.api = XcalarApisT.XcalarApiListFiles;
    workItem.input.listFilesInput.url = url;
    workItem.input.listFilesInput.recursive = recursive;
    workItem.input.listFilesInput.fileNamePattern = fileNamePattern;
    return (workItem);
};

xcalarListFiles = runEntity.xcalarListFiles = function(thriftHandle, url, recursive, fileNamePattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListFiles(url = " + url + ")");
    }

    var workItem = xcalarListFilesWorkItem(url, recursive, fileNamePattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listFilesOutput = result.output.outputResult.listFilesOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listFilesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListFiles() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiDeleteRetinaWorkItem = runEntity.xcalarApiDeleteRetinaWorkItem = function(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.api = XcalarApisT.XcalarApiDeleteRetina;
    workItem.input.deleteRetinaInput = retinaName;
    return (workItem);
};

xcalarApiDeleteRetina = runEntity.xcalarApiDeleteRetina = function(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiDeleteRetina(retinaName = " + retinaName + ")");
    }
    var workItem = xcalarApiDeleteRetinaWorkItem(retinaName);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarApiDeleteRetina() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarMakeRetinaWorkItem = runEntity.xcalarMakeRetinaWorkItem = function(retinaName, tableArray) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeRetinaInput = new XcalarApiMakeRetinaInputT();

    workItem.api = XcalarApisT.XcalarApiMakeRetina;
    workItem.input.makeRetinaInput.retinaName = retinaName;
    workItem.input.makeRetinaInput.numTables = tableArray.length;
    workItem.input.makeRetinaInput.tableArray = tableArray;
    return (workItem);
};

xcalarMakeRetina = runEntity.xcalarMakeRetina = function(thriftHandle, retinaName, tableArray) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeRetina(retinaName = " + retinaName +
                    ", tableArray = " + JSON.stringify(tableArray) + ")");
    }
    var workItem = xcalarMakeRetinaWorkItem(retinaName, tableArray);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarMakeRetina() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

};

xcalarListRetinasWorkItem = runEntity.xcalarListRetinasWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiListRetinas;
    return (workItem);
};

xcalarListRetinas = runEntity.xcalarListRetinas = function(thriftHandle) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListRetinas()");
    }

    var workItem = xcalarListRetinasWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listRetinasOutput = result.output.outputResult.listRetinasOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listRetinasOutput);
    })
    .fail(function(error) {
        console.log("xcalarListRetinas() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarGetRetinaWorkItem = runEntity.xcalarGetRetinaWorkItem = function(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiGetRetina;
    workItem.input.getRetinaInput = retinaName;
    return (workItem);
};

xcalarGetRetina = runEntity.xcalarGetRetina = function(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetRetina(retinaName = " + retinaName + ")");
    }
    var workItem = xcalarGetRetinaWorkItem(retinaName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getRetinaOutput = result.output.outputResult.getRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetRetina() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarUpdateRetinaWorkItem = runEntity.xcalarUpdateRetinaWorkItem = function(retinaName, dagNodeId, paramType,
                                    paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.updateRetinaInput = new XcalarApiUpdateRetinaInputT();

    workItem.api = XcalarApisT.XcalarApiUpdateRetina;
    workItem.input.updateRetinaInput.retinaName = retinaName;
    workItem.input.updateRetinaInput.dagNodeId = dagNodeId;

    workItem.input.updateRetinaInput.paramInput = new XcalarApiParamInputT();
    workItem.input.updateRetinaInput.paramInput.paramType = paramType;
    workItem.input.updateRetinaInput.paramInput.paramInputArgs = new XcalarApiParamInputArgsT();
    switch (paramType) {
    case XcalarApisT.XcalarApiBulkLoad:
        workItem.input.updateRetinaInput.paramInput.paramInputArgs.paramLoad =
            paramValue;
        break;
    case XcalarApisT.XcalarApiFilter:
        workItem.input.updateRetinaInput.paramInput.paramInputArgs.paramFilter =
            paramValue;
        break;
    case XcalarApisT.XcalarApiExport:
        workItem.input.updateRetinaInput.paramInput.paramInputArgs.paramExport =
            paramValue;
        break;
    }
    return (workItem);
};

xcalarUpdateRetina = runEntity.xcalarUpdateRetina = function(thriftHandle, retinaName, dagNodeId,
                            paramType, paramValue) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarUpdateRetina(retinaName = " + retinaName + ", " +
                    "dagNodeId = " + dagNodeId + ", paramType = " +
                    XcalarApisTStr[paramType] + ", paramValue = " + paramValue + ")");
    }
    var workItem = xcalarUpdateRetinaWorkItem(retinaName, dagNodeId, paramType,
                                              paramValue);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarUpdateRetina() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarExecuteRetinaWorkItem = runEntity.xcalarExecuteRetinaWorkItem = function(retinaName, parameters,
                                     exportToActiveSession, newTableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.executeRetinaInput = new XcalarApiExecuteRetinaInputT();
    workItem.input.executeRetinaInput.dstTable = new XcalarApiTableInputT();

    workItem.api = XcalarApisT.XcalarApiExecuteRetina;
    workItem.input.executeRetinaInput.retinaName = retinaName;
    workItem.input.executeRetinaInput.numParameters = parameters.length;
    workItem.input.executeRetinaInput.parameters = parameters;
    workItem.input.executeRetinaInput.exportToActiveSession = exportToActiveSession;
    workItem.input.executeRetinaInput.dstTable.tableName = newTableName;
    workItem.input.executeRetinaInput.dstTable.tableId = XcalarApiTableIdInvalidT;

    return (workItem);
};

xcalarExecuteRetina = runEntity.xcalarExecuteRetina = function(thriftHandle, retinaName, parameters,
                             exportToActiveSession, newTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarExecuteRetina(retinaName = " + retinaName +
                    "exportToActiveSession = " + exportToActiveSession +
                    "newTableName = " + newTableName + ")");
        for (var ii = 0; ii < parameters.length; ii++) {
            parameter = parameters[ii];
            console.log(parameter.parameterName + " = " + parameter.parameterValue);
        }
    }
    var workItem = xcalarExecuteRetinaWorkItem(retinaName, parameters,
                                               exportToActiveSession,
                                               newTableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var retinaOutput = result.output.outputResult.retinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(retinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarExecuteRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarListParametersInRetinaWorkItem = runEntity.xcalarListParametersInRetinaWorkItem = function(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiListParametersInRetina;
    workItem.input.listParametersInRetinaInput = retinaName;
    return (workItem);
};

xcalarListParametersInRetina = runEntity.xcalarListParametersInRetina = function(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListParametersInRetina(retinaName = " + retinaName +
                    ")");
    }

    var workItem = xcalarListParametersInRetinaWorkItem(retinaName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listParametersInRetinaOutput =
                        result.output.outputResult.listParametersInRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listParametersInRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarListParametersInRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarKeyLookupWorkItem = runEntity.xcalarKeyLookupWorkItem = function(scope, key) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyLookupInput = new XcalarApiKeyLookupInputT();
    workItem.input.keyLookupInput.scope = scope;
    workItem.input.keyLookupInput.key = key;
    workItem.api = XcalarApisT.XcalarApiKeyLookup;
    return (workItem);
};

xcalarKeyLookup = runEntity.xcalarKeyLookup = function(thriftHandle, scope, key) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarKeyLookup(scope = " + scope + ", key = " + key +
                    ")");
    }

    var workItem = xcalarKeyLookupWorkItem(scope, key);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var keyLookupOutput = result.output.outputResult.keyLookupOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(keyLookupOutput);
    })
    .fail(function(error) {
        console.log("xcalarKeyLookup() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarKeyAddOrReplaceWorkItem = runEntity.xcalarKeyAddOrReplaceWorkItem = function(scope, persist, key, value) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyAddOrReplaceInput = new XcalarApiKeyAddOrReplaceInputT();
    workItem.input.keyAddOrReplaceInput.scope = scope;
    workItem.input.keyAddOrReplaceInput.kvPair = new XcalarApiKeyValuePairT();

    workItem.api = XcalarApisT.XcalarApiKeyAddOrReplace;
    workItem.input.keyAddOrReplaceInput.persist = persist;
    workItem.input.keyAddOrReplaceInput.kvPair.key = key;
    workItem.input.keyAddOrReplaceInput.kvPair.value = value;
    return (workItem);
};

xcalarKeyAddOrReplace = runEntity.xcalarKeyAddOrReplace = function(thriftHandle, scope, key, value, persist) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        if (superVerbose) {
            console.log("xcalarKeyAddOrReplace(source = " + scope + ", key = " +
                        key + ", value = " + value + ", persist = " +
                        persist.toString() + ")");
        } else {
            console.log("xcalarKeyAddOrReplace(source = " + scope + ", key = " +
                        key + ", value = <superVerbose mode only>, persist = " +
                        persist.toString() + ")");
        }
    }

    var workItem = xcalarKeyAddOrReplaceWorkItem(scope, persist, key, value);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeyAddOrReplace() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarUpdateLicenseWorkItem = runEntity.xcalarUpdateLicenseWorkItem = function(licenseKey) {
    var workItem = new WorkItem();

    workItem.input = new XcalarApiInputT();
    workItem.input.updateLicenseInput = licenseKey;
    workItem.api = XcalarApisT.XcalarApiUpdateLicense;

    return(workItem);
}

xcalarUpdateLicense = runEntity.xcalarUpdateLicense = function(thriftHandle, licenseKey) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarUpdateLicense(licenseKey=" + licenseKey + ")");
    }

    var workItem = xcalarUpdateLicenseWorkItem(licenseKey);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {

        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarUpdateLicense() caught exception:", error);
        deferred.reject(error);
    });

    return(deferred.promise());
}

xcalarKeyAppendWorkItem = runEntity.xcalarKeyAppendWorkItem = function(scope, key, suffix) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyAppendInput = new XcalarApiKeyAppendInputT();
    workItem.input.keyAppendInput.scope = scope;
    workItem.input.keyAppendInput.key = key;
    workItem.input.keyAppendInput.suffix = suffix;
    workItem.api = XcalarApisT.XcalarApiKeyAppend;
    return (workItem);
};

xcalarKeyAppend = runEntity.xcalarKeyAppend = function(thriftHandle, scope, key, suffix) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        if (superVerbose) {
            console.log("xcalarKeyAppend(scope = " + scope + ", key = " + key +
                        ", suffix = " + suffix + ")");
        } else {
            console.log("xcalarKeyAppend(scope = " + scope + ", key = " + key +
                        ", suffix = <superVerbose mode only>)");
        }
    }

    var workItem = xcalarKeyAppendWorkItem(scope, key, suffix);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeyAppend() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarKeySetIfEqualWorkItem = runEntity.xcalarKeySetIfEqualWorkItem = function(scope, persist, keyCompare, valueCompare,
                                     valueReplace, keySecondary, valueSecondary)
{
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keySetIfEqualInput = new XcalarApiKeySetIfEqualInputT();
    workItem.api = XcalarApisT.XcalarApiKeySetIfEqual;

    workItem.input.keySetIfEqualInput.scope = scope;
    workItem.input.keySetIfEqualInput.keyCompare = keyCompare;
    workItem.input.keySetIfEqualInput.valueCompare = valueCompare;
    workItem.input.keySetIfEqualInput.valueReplace = valueReplace;

    if (keySecondary) {
        workItem.input.keySetIfEqualInput.countSecondaryPairs = 1;
        workItem.input.keySetIfEqualInput.keySecondary = keySecondary;
        workItem.input.keySetIfEqualInput.valueSecondary = valueSecondary;
    } else {
        // keySecondary is "", undefined, or null.
        workItem.input.keySetIfEqualInput.countSecondaryPairs = 0;
    }

    return (workItem);
};

xcalarKeySetIfEqual = runEntity.xcalarKeySetIfEqual = function(thriftHandle, scope, persist, keyCompare,
                             valueCompare, valueReplace, keySecondary,
                             valueSecondary) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        if (superVerbose) {
            console.log("xcalarKeySetIfEqual(scope = " + scope +
                        ", persist = " + persist + ", keyCompare = " +
                        keyCompare + ", valueCompare = " + valueCompare +
                        ", valueReplace = " + valueReplace +
                        ", keySecondary = " + keySecondary +
                        ", valueSecondary = " + valueSecondary + ")");
        } else {
            console.log("xcalarKeySetIfEqual(scope = " + scope +
                        ", persist = " + persist + ", keyCompare = " +
                        keyCompare +
                        ", valueCompare = <superVerbose mode only>" +
                        ", valueReplace = <superVerbose mode only>" +
                        ", keySecondary = " + keySecondary +
                        ", valueSecondary = <superVerbose mode only>" + ")");

        }
    }

    var workItem = xcalarKeySetIfEqualWorkItem(scope, persist, keyCompare,
                                               valueCompare, valueReplace,
                                               keySecondary, valueSecondary);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeySetIfEqual() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarKeyDeleteWorkItem = runEntity.xcalarKeyDeleteWorkItem = function(scope, key) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyDeleteInput = new XcalarApiKeyDeleteInputT();

    workItem.api = XcalarApisT.XcalarApiKeyDelete;
    workItem.input.keyDeleteInput.scope = scope;
    workItem.input.keyDeleteInput.key = key;
    return (workItem);
};

xcalarKeyDelete = runEntity.xcalarKeyDelete = function(thriftHandle, scope, key) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarKeyDelete(scope = " + scope + ", key = " +
                    key + ")");
    }

    var workItem = xcalarKeyDeleteWorkItem(scope, key);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeyLookup() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiTopWorkItem = runEntity.xcalarApiTopWorkItem = function(measureIntervalInMs) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.topInput = new XcalarApiTopInputT();

    workItem.api = XcalarApisT.XcalarApiTop;
    workItem.input.topInput.measureIntervalInMs = measureIntervalInMs;
    return (workItem);
};

xcalarApiTop = runEntity.xcalarApiTop = function(thriftHandle, measureIntervalInMs) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiTop(measureIntervalInMs = ", measureIntervalInMs,
                    ")");
    }

    var workItem = xcalarApiTopWorkItem(measureIntervalInMs);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var topOutput = result.output.outputResult.topOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            topOutput = new XcalarApiTopOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(topOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiTop() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiMemoryWorkItem = runEntity.xcalarApiMemoryWorkItem = function(tagName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.memoryInput = new XcalarApiMemoryInputT();

    workItem.api = XcalarApisT.XcalarApiMemory;
    workItem.input.memoryInput.tagName = tagName;
    return (workItem);
};

xcalarApiMemory = runEntity.xcalarApiMemory = function(thriftHandle, tagName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiMemory(tagName = ", tagName, ")");
    }

    var workItem = xcalarApiMemoryWorkItem(tagName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var memOutput = result.output.outputResult.memoryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            memOutput = new XcalarApiMemoryOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(memOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMemory() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionNewWorkItem = runEntity.xcalarApiSessionNewWorkItem = function(sessionName, fork, forkedSessionName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionNewInput = new XcalarApiSessionNewInputT();

    workItem.api = XcalarApisT.XcalarApiSessionNew;
    workItem.input.sessionNewInput.sessionName = sessionName;
    workItem.input.sessionNewInput.fork = fork;
    workItem.input.sessionNewInput.forkedSessionName = forkedSessionName;
    return (workItem);
};

xcalarApiSessionNew = runEntity.xcalarApiSessionNew = function(thriftHandle, sessionName, fork,
                             forkedSessionName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionNew(sessionName = ", sessionName, ", ",
                    "fork = ", fork, ", ",
                    "forkedSessionName = ", forkedSessionName, ")");
    }
    var workItem = xcalarApiSessionNewWorkItem(sessionName, fork,
                                               forkedSessionName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionNew() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionDeleteWorkItem = runEntity.xcalarApiSessionDeleteWorkItem = function(pattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionDeleteInput = new XcalarApiSessionDeleteInputT();

    workItem.api = XcalarApisT.XcalarApiSessionDelete;
    workItem.input.sessionDeleteInput.sessionName = pattern;
      // not actually used by delete...
    workItem.input.sessionDeleteInput.noCleanup = false;
    return (workItem);
};

xcalarApiSessionDelete = runEntity.xcalarApiSessionDelete = function(thriftHandle, pattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionDelete(pattern = " + pattern + ")");
    }
    var workItem = xcalarApiSessionDeleteWorkItem(pattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionDelete() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionInfoWorkItem = runEntity.xcalarApiSessionInfoWorkItem = function(name) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionInfoInput = new XcalarApiSessionInfoInputT();

    workItem.api = XcalarApisT.XcalarApiSessionInfo;
    workItem.input.sessionInfoInput.sessionName = name;
    return (workItem);
};

xcalarApiSessionInfo = runEntity.xcalarApiSessionInfo = function(thriftHandle, name) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionInfo(name = )", name);
    }
    var workItem = xcalarApiSessionInfoWorkItem(name);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result.output.outputResult.sessionInfoOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionInfo() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionInactWorkItem = runEntity.xcalarApiSessionInactWorkItem = function(name, noCleanup) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionDeleteInput = new XcalarApiSessionDeleteInputT();

    workItem.api = XcalarApisT.XcalarApiSessionInact;
    workItem.input.sessionDeleteInput.sessionName = name;
    workItem.input.sessionDeleteInput.noCleanup = noCleanup;
    return (workItem);
};

// noCleanup = true means that the datasets and tables belonging to the
// session will not be dropped when the session is made inactive
xcalarApiSessionInact = runEntity.xcalarApiSessionInact = function(thriftHandle, name, noCleanup) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionInact(name = )", name);
    }
    var workItem = xcalarApiSessionInactWorkItem(name, noCleanup);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionInact() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionListWorkItem = runEntity.xcalarApiSessionListWorkItem = function(pattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiSessionList;
    workItem.input.sessionListInput = pattern;
    return (workItem);
};

xcalarApiSessionList = runEntity.xcalarApiSessionList = function(thriftHandle, pattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionList(pattern = )", pattern);
    }

    var workItem = xcalarApiSessionListWorkItem(pattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var sessionListOutput = result.output.outputResult.sessionListOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }

        if (status != StatusT.StatusOk && status != StatusT.StatusSessionNotFound) {
            deferred.reject(status);
        }

        deferred.resolve(sessionListOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionList() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionPersistWorkItem = runEntity.xcalarApiSessionPersistWorkItem = function(pattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionDeleteInput = new XcalarApiSessionDeleteInputT();

    workItem.api = XcalarApisT.XcalarApiSessionPersist;
    workItem.input.sessionDeleteInput.sessionName = pattern;
     // not actually used by persist
    workItem.input.sessionDeleteInput.noCleanup = false;
    return (workItem);
};

xcalarApiSessionPersist = runEntity.xcalarApiSessionPersist = function(thriftHandle, pattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionPersist(pattern = )", pattern);
    }

    var workItem = xcalarApiSessionPersistWorkItem(pattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        var sessionListOutput = result.output.outputResult.sessionListOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionListOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionPersist() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

// noCleanup = true means the tables and datasets will not be dropped
// when the old session is made inactive
xcalarApiSessionSwitchWorkItem = runEntity.xcalarApiSessionSwitchWorkItem = function(sessionName, origSessionName,
                                        noCleanup) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionSwitchInput = new XcalarApiSessionSwitchInputT();

    workItem.api = XcalarApisT.XcalarApiSessionSwitch;
    workItem.input.sessionSwitchInput.sessionName = sessionName;
    workItem.input.sessionSwitchInput.origSessionName = origSessionName;
    workItem.input.sessionSwitchInput.noCleanup = noCleanup;
    return (workItem);
};

xcalarApiSessionSwitch = runEntity.xcalarApiSessionSwitch = function(thriftHandle, sessionName, origSessionName,
                                noCleanup) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionSwitch(sessionName = ", sessionName, ", ",
                    "origSessionName = ", origSessionName,
                    "bypass clean up = ", noCleanup, ")");
    }
    var workItem = xcalarApiSessionSwitchWorkItem(sessionName, origSessionName,
                                                  noCleanup);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionSwitch() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSessionRenameWorkItem = runEntity.xcalarApiSessionRenameWorkItem = function(sessionName, origSessionName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionRenameInput = new XcalarApiSessionRenameInputT();

    workItem.api = XcalarApisT.XcalarApiSessionRename;
    workItem.input.sessionRenameInput.sessionName = sessionName;
    workItem.input.sessionRenameInput.origSessionName = origSessionName;
    return (workItem);
};

xcalarApiSessionRename = runEntity.xcalarApiSessionRename = function(thriftHandle, sessionName, origSessionName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionRename(sessionName = ", sessionName, ", ",
                    "origSessionName = ", origSessionName);
    }

    var workItem = xcalarApiSessionRenameWorkItem(sessionName, origSessionName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionRename() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiListXdfsWorkItem = runEntity.xcalarApiListXdfsWorkItem = function(fnNamePattern, categoryPattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.listXdfsInput = new XcalarApiListXdfsInputT();

    workItem.api = XcalarApisT.XcalarApiListXdfs;
    workItem.input.listXdfsInput.fnNamePattern = fnNamePattern;
    workItem.input.listXdfsInput.categoryPattern = categoryPattern;
    return (workItem);
};

xcalarApiListXdfs = runEntity.xcalarApiListXdfs = function(thriftHandle, fnNamePattern, categoryPattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiListXdfs(fnNamePattern = ", fnNamePattern, ", ",
                    "categoryPattern = ", categoryPattern, ")");
    }
    var workItem = xcalarApiListXdfsWorkItem(fnNamePattern, categoryPattern);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listXdfsOutput = result.output.outputResult.listXdfsOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            listXdfsOutput = new XcalarApiListXdfsOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(listXdfsOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiListXdfs() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiUdfAddUpdateWorkItem = runEntity.xcalarApiUdfAddUpdateWorkItem = function(api, type, moduleName, source)
{
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.udfAddUpdateInput = new UdfModuleSrcT();

    workItem.api = api;

    workItem.input.udfAddUpdateInput.type = type;
    workItem.input.udfAddUpdateInput.moduleName = moduleName;
    workItem.input.udfAddUpdateInput.source = source;

    return (workItem);
};

xcalarApiUdfAdd = runEntity.xcalarApiUdfAdd = function(thriftHandle, type, moduleName, source)
{
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiUdfAdd(type = ", type, ", moduleName = ",
                    moduleName, ", ", "source = ", source, ")");
    }
    var workItem = xcalarApiUdfAddUpdateWorkItem(XcalarApisT.XcalarApiUdfAdd,
                                                 type, moduleName, source);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        var udfAddUpdateOutput = result.output.outputResult.udfAddUpdateOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status, udfAddUpdateOutput);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarApiUdfAdd() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiUdfUpdate = runEntity.xcalarApiUdfUpdate = function(thriftHandle, type, moduleName, source)
{
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiUdfUpdate(moduleName = ", moduleName,
                    ", ", "source = ", source, ")");
    }
    var workItem = xcalarApiUdfAddUpdateWorkItem(XcalarApisT.XcalarApiUdfUpdate,
                                                 type, moduleName, source);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        var udfAddUpdateOutput = result.output.outputResult.udfAddUpdateOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status, udfAddUpdateOutput);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarApiUdfUpdate() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiUdfDeleteWorkItem = runEntity.xcalarApiUdfDeleteWorkItem = function(moduleName)
{
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.udfDeleteInput = new XcalarApiUdfDeleteInputT();

    workItem.api = XcalarApisT.XcalarApiUdfDelete;

    workItem.input.udfDeleteInput.moduleName = moduleName;

    return (workItem);
};

xcalarApiUdfDelete = runEntity.xcalarApiUdfDelete = function(thriftHandle, moduleName)
{
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiUdfDelete(moduleName = ", moduleName, ")");
    }
    var workItem = xcalarApiUdfDeleteWorkItem(moduleName);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarApiUdfDelete() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiUdfGetWorkItem = runEntity.xcalarApiUdfGetWorkItem = function(moduleName)
{
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.udfGetInput = new XcalarApiUdfGetInputT();

    workItem.api = XcalarApisT.XcalarApiUdfGet;

    workItem.input.udfGetInput.moduleName = moduleName;

    return (workItem);
};

xcalarApiUdfGet = runEntity.xcalarApiUdfGet = function(thriftHandle, moduleName)
{
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiUdfGet(moduleName = ", moduleName, ")");
    }
    var workItem = xcalarApiUdfGetWorkItem(moduleName);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(result.output.outputResult.udfGetOutput);
    })
    .fail(function(error) {
        console.log(JSON.stringify(error));
        console.log("xcalarApiUdfGet() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiGetQuery = runEntity.xcalarApiGetQuery = function(thriftHandle, workItem) {
    var deferred = jQuery.Deferred();
    workItem.origApi = workItem.api;
    workItem.api = XcalarApisT.XcalarApiGetQuery;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getQueryOutput = result.output.outputResult.getQueryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            getQueryOutput = new XcalarApiGetQueryOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(getQueryOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiGetQuery() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiCreateDhtWorkItem = runEntity.xcalarApiCreateDhtWorkItem = function(dhtName, upperBound, lowerBound, ordering) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.createDhtInput = new XcalarApiCreateDhtInputT();
    workItem.input.createDhtInput.dhtArgs = new DhtArgsT();

    workItem.api = XcalarApisT.XcalarApiCreateDht;
    workItem.input.createDhtInput.dhtName = dhtName;
    workItem.input.createDhtInput.dhtArgs.upperBound = upperBound;
    workItem.input.createDhtInput.dhtArgs.lowerBound = lowerBound;
    workItem.input.createDhtInput.dhtArgs.ordering = ordering;

    return (workItem);
};

xcalarApiCreateDht = runEntity.xcalarApiCreateDht = function(thriftHandle, dhtName, upperBound, lowerBound, ordering) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiCreateDht(dhtName = " + dhtName + ", upperBound = " +
                    upperBound + ", lowerBound = " + lowerBound +
                    ", ordering = " + ordering + ")");
    }

    var workItem = xcalarApiCreateDhtWorkItem(dhtName, upperBound, lowerBound, ordering);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarApiCreateDht() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiDeleteDhtWorkItem = runEntity.xcalarApiDeleteDhtWorkItem = function(dhtName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.deleteDhtInput = new XcalarApiDeleteDhtInputT();

    workItem.api = XcalarApisT.XcalarApiDeleteDht;
    workItem.input.deleteDhtInput.dhtName = dhtName;

    return (workItem);
};

xcalarApiDeleteDht = runEntity.xcalarApiDeleteDht = function(thriftHandle, dhtName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiDeleteDht(dhtName = " + dhtName + ")");
    }

    var workItem = xcalarApiDeleteDhtWorkItem(dhtName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk &&
            status != StatusT.StatusNsNotFound) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarApiDeleteDht() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiSupportGenerateWorkItem = runEntity.xcalarApiSupportGenerateWorkItem = function() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiSupportGenerate;
    return (workItem);
};

xcalarApiSupportGenerate = runEntity.xcalarApiSupportGenerate = function(thriftHandle) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSupportGenerate()");
    }

    var workItem = xcalarApiSupportGenerateWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk &&
            status != StatusT.StatusNsNotFound) {
            deferred.reject(status);
        }

        deferred.resolve(result.output.outputResult.supportGenerateOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSupportGenerate() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiImportRetinaWorkItem = runEntity.xcalarApiImportRetinaWorkItem = function(retinaName, overwrite, retina) {
    var workItem = new WorkItem();
    var encodedRetina = btoa(retina);
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiImportRetina;
    workItem.input.importRetinaInput = new XcalarApiImportRetinaInputT();
    workItem.input.importRetinaInput.retinaName = retinaName;
    workItem.input.importRetinaInput.overwriteExistingUdf = overwrite;
    workItem.input.importRetinaInput.retinaCount = encodedRetina.length;
    workItem.input.importRetinaInput.retina = encodedRetina;

    return (workItem);
};

xcalarApiImportRetina = runEntity.xcalarApiImportRetina = function(thriftHandle, retinaName, overwrite, retina) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarApiImportRetina(retinaName = " + retinaName +
                    ", overwrite = " + overwrite + ")");
    }

    var workItem = xcalarApiImportRetinaWorkItem(retinaName, overwrite, retina);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var importRetinaOutput = result.output.outputResult.importRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(importRetinaOutput);
    })
    .fail(function (error) {
        console.log("xcalarApiImportRetina() caught exception: ", error);
        deferred.reject(error);
    });
    return (deferred.promise());
};

xcalarApiExportRetinaWorkItem = runEntity.xcalarApiExportRetinaWorkItem = function(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiExportRetina;
    workItem.input.exportRetinaInput = new XcalarApiExportRetinaInputT();
    workItem.input.exportRetinaInput.retinaName = retinaName;
    return (workItem);
};

xcalarApiExportRetina = runEntity.xcalarApiExportRetina = function(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarApiExportRetina(retinaName = " + retinaName + ")");
    }

    var workItem = xcalarApiExportRetinaWorkItem(retinaName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var exportRetinaOutput = result.output.outputResult.exportRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        exportRetinaOutput.retina = atob(exportRetinaOutput.retina);
        exportRetinaOutput.retinaCount = exportRetinaOutput.retina.length;

        deferred.resolve(exportRetinaOutput);
    })
    .fail(function (error) {
        console.log("xcalarApiExportRetina() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiStartFuncTestWorkItem = runEntity.xcalarApiStartFuncTestWorkItem = function(parallel, runAllTests, runOnAllNodes, testNamePatterns) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiStartFuncTests;
    workItem.input.startFuncTestInput = new XcalarApiStartFuncTestInputT();
    workItem.input.startFuncTestInput.parallel = parallel;
    workItem.input.startFuncTestInput.runAllTests = runAllTests;
    workItem.input.startFuncTestInput.runOnAllNodes = runOnAllNodes;
    workItem.input.startFuncTestInput.testNamePatterns = testNamePatterns;
    workItem.input.startFuncTestInput.numTestPatterns = testNamePatterns.length;

    return (workItem);
};

xcalarApiStartFuncTest = runEntity.xcalarApiStartFuncTest = function(thriftHandle, parallel, runOnAllNodes, runAllTests, testNamePatterns) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarApiStartFuncTest(parallel = ", parallel, ", runAllTests = ",
                    runAllTests, ", runOnAllNodes = ", runOnAllNodes,
                    ", testNamePatterns = ", testNamePatterns, ")");
    }

    var workItem = xcalarApiStartFuncTestWorkItem(parallel, runAllTests, runOnAllNodes, testNamePatterns);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var startFuncTestOutput = result.output.outputResult.startFuncTestOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(startFuncTestOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiStartFuncTest() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiListFuncTestWorkItem = runEntity.xcalarApiListFuncTestWorkItem = function(namePattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiListFuncTests;
    workItem.input.listFuncTestInput = new XcalarApiListFuncTestInputT();
    workItem.input.listFuncTestInput.namePattern = namePattern;

    return (workItem);
};

xcalarApiListFuncTest = runEntity.xcalarApiListFuncTest = function(thriftHandle, namePattern) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarApiListFuncTest(namePattern = ", namePattern, ")");
    }

    var workItem = xcalarApiListFuncTestWorkItem(namePattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listFuncTestOutput = result.output.outputResult.listFuncTestOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(listFuncTestOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiListFuncTest() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarApiDeleteDatasetsWorkItem = runEntity.xcalarApiDeleteDatasetsWorkItem = function(datasetNamePattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiDeleteDatasets;
    workItem.input.deleteDatasetsInput = datasetNamePattern;

    return (workItem);
};

xcalarApiDeleteDatasets = runEntity.xcalarApiDeleteDatasets = function (thriftHandle, datasetNamePattern) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarApiDeleteDatasets(datasetNamePattern = ", datasetNamePattern, ")");
    }

    var workItem = xcalarApiDeleteDatasetsWorkItem(datasetNamePattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var deleteDatasetsOutput = result.output.outputResult.deleteDatasetsOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(deleteDatasetsOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiDeleteDatasets() caught exceptions: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarDemoFileWorkItem = runEntity.xcalarDemoFileWorkItem = function(inJson) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiDemoFile;
    workItem.input.demoFileInput = new XcalarApiDemoFileInputT();
    workItem.input.demoFileInput.inputJson = inJson;
    return (workItem);
};

xcalarDemoFileCreate = runEntity.xcalarDemoFileCreate = function(thriftHandle, fileName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDemoFileCreate(fileName = " + fileName +
                                         ")");
    }

    var inputObj = {"func": "demoCreate", "fileName": fileName};

    var workItem = xcalarDemoFileWorkItem(JSON.stringify(inputObj));

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var demoFileOutput = result.output.outputResult.demoFileOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        // demoFileOutput has a outputJson field which is a json formatted string
        // with a field called 'error' if something went wrong
        deferred.resolve(JSON.parse(demoFileOutput.outputJson));
    })
    .fail(function(error) {
        console.log("xcalarDemoFileCreate() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarDemoFileAppend = runEntity.xcalarDemoFileAppend = function(thriftHandle, fileName, fileContents) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDemoFileAppend(fileName = " + fileName +
                                         "fileContents = " + fileContents +
                                         ")");
    }

    var inputObj = {"func": "demoAppend",
                    "fileName": fileName,
                    "data": btoa(fileContents)};

    var workItem = xcalarDemoFileWorkItem(JSON.stringify(inputObj));

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var demoFileOutput = result.output.outputResult.demoFileOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        // demoFileOutput has a outputJson field which is a json formatted string
        // with a field called 'error' if something went wrong
        deferred.resolve(JSON.parse(demoFileOutput.outputJson));
    })
    .fail(function(error) {
        console.log("xcalarDemoFileAppend() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

xcalarDemoFileDelete = runEntity.xcalarDemoFileDelete = function(thriftHandle, fileName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDemoFileDelete(fileName = " + fileName +
                                         ")");
    }

    var inputObj = {"func": "demoDelete", "fileName": fileName};

    var workItem = xcalarDemoFileWorkItem(JSON.stringify(inputObj));

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var demoFileOutput = result.output.outputResult.demoFileOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        // demoFileOutput has a outputJson field which is a json formatted string
        // with a field called 'error' if something went wrong
        deferred.resolve(JSON.parse(demoFileOutput.outputJson));
    })
    .fail(function(error) {
        console.log("xcalarDemoFileDelete() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
};

XcalarApiLicenseUpdateWorkItem = runEntity.xcalarApiLicenseUpdateWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiLicenseUpdateInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiDagTableNameWorkItem = runEntity.xcalarApiDagTableNameWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiDagTableNameInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiSessionListScalarWorkItem = runEntity.xcalarApiSessionListScalarWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiSessionListScalarInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiSessionListArrayWorkItem = runEntity.xcalarApiSessionListArrayWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiSessionListArrayInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiExExportTargetWorkItem = runEntity.xcalarApiExExportTargetWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiExExportTargetInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiExExportTargetHdrWorkItem = runEntity.xcalarApiExExportTargetHdrWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiExExportTargetHdrInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiPackedWorkItem = runEntity.xcalarApiPackedWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiPackedInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiDagNodeNamePatternDeleteWorkItem = runEntity.xcalarApiDagNodeNamePatternDeleteWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiDagNodeNamePatternDeleteInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};

XcalarApiAddParameterToRetinaWorkItem = runEntity.xcalarApiAddParameterToRetinaWorkItem = function(paramName, paramValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiAddParameterToRetinaInputT();

    // NOOP
    return ("NOT_IMPLEMENTED");
};
