ThriftHandle = function(args) {
    this.transport = null;
    this.protocol = null;
    this.client = null;
};

function xcalarConnectThrift(hostname, port) {
    var thriftUrl = "http://" + hostname + ":" + port.toString() +
        "/thrift/service/XcalarApiService/";

    console.log("xcalarConnectThrift(thriftUrl = " + thriftUrl + ")") 

    var transport = new Thrift.Transport(thriftUrl);
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var thriftHandle = new ThriftHandle();
    thriftHandle.transport = transport;
    thriftHandle.protocol = protocol;
    thriftHandle.client = client;

    return thriftHandle;
}

function xcalarGetVersion(thriftHandle) {
    var deferred = jQuery.Deferred();

    console.log("xcalarGetVersion()");

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetVersion;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        deferred.resolve(result);
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
}

function xcalarLoad(thriftHandle, url, name, format, maxSampleSize, loadArgs) {
    var deferred = jQuery.Deferred();

    console.log("xcalarLoad(url = " + url + ", name = " + name + ", format = " +
                DfFormatTypeTStr[format] + ", maxSampleSize = " +
                maxSampleSize.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.dataset = new XcalarApiDatasetT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.dataset.datasetId = 0;
    workItem.input.loadInput.dataset.url = url;
    workItem.input.loadInput.dataset.name = name;
    workItem.input.loadInput.dataset.formatType = format;
    workItem.input.loadInput.maxSize = maxSampleSize;
    workItem.input.loadInput.loadArgs = loadArgs;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var loadOutput = result.output.loadOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            loadOutput.status = result.jobStatus;
        }
        if (loadOutput.status != StatusT.StatusOk) {
            deferred.reject(loadOutput.status);
        }
        deferred.resolve(loadOutput);
    })
    .fail(function(error) {
        console.log("xcalarLoad() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexDataset(thriftHandle, datasetId, keyName, dstTableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarIndexDataset(datasetId = " + datasetId.toString() +
                ", keyName = " + keyName + ", dstTableName = " +
                dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.srcTable = new XcalarApiTableT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.isTableBacked = false;
    workItem.input.indexInput.srcTable.tableName = "";
    workItem.input.indexInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.datasetId = datasetId;
    workItem.input.indexInput.keyName = keyName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var indexOutput = result.output.indexOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            indexOutput.status = result.jobStatus;
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexDataset() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexTable(thriftHandle, srcTableName, keyName, dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarIndexTable(srcTableName = " + srcTableName +
                ", keyName = " + keyName + ", dstTableName = " +
                dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.srcTable = new XcalarApiTableT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.isTableBacked = true;
    workItem.input.indexInput.srcTable.tableName = srcTableName;
    workItem.input.indexInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.datasetId = 0;
    workItem.input.indexInput.keyName = keyName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var indexOutput = result.output.indexOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            indexOutput.status = result.jobStatus;
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetCount(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetCount(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.tableInput = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiCountUnique;
    workItem.input.tableInput.tableName = tableName;
    workItem.input.tableInput.tableId = XcalarApiTableIdInvalidT;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var countOutput = result.output.countOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            countOutput.status = result.jobStatus;
        }
        // XXX Fix me if the checking is not right
        if (countOutput.status != StatusT.StatusOk) {
            deferred.reject(countOutput.status);
        }
        deferred.resolve(countOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetCount() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarShutdown(thriftHandle) {
    var deferred = jQuery.Deferred();
    console.log("xcalarShutdown()");

    var workItem = new XcalarApiWorkItemT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiShutdown;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarShutdown() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStats(nodeId = " + nodeId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStat;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var statOutput = result.output.statOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statOutput.status = result.jobStatus;
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarEditColumn(thriftHandle, datasetId, tableName, isDataset,
                          currFieldName, newFieldName, newFieldType) {
    var deferred = jQuery.Deferred();
    console.log("xcalarEditColumn(datasetId = " + datasetId.toString() +
                ", tableName = " + tableName.toString() + ", isDataset = " +
                isDataset.toString() + ", currFieldName = " +
                currFieldName.toString() + ", newFieldName = " +
                newFieldName.toString() + ", newFieldType = " +
                newFieldType.toString());

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.editColInput = new XcalarApiEditColInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiEditColumn;
    workItem.input.editColInput.datasetId = datasetId;
    workItem.input.editColInput.tableName = tableName;
    workItem.input.editColInput.isDataset = isDataset;
    workItem.input.editColInput.currFieldName = currFieldName;
    workItem.input.editColInput.newFieldName = newFieldName;
    workItem.input.editColInput.newFieldType = newFieldType;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var statusOutput = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statusOutput.status = result.jobStatus;
        }

        deferred.resolve(statusOutput);
    })
    .fail(function(error) {
        console.log("xcalarEditColumn() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStatsByGroupId(thriftHandle, nodeId, groupIdList) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStatsByGroupId(nodeId = " + nodeId.toString() +
                ", numGroupIds = ", + groupIdList.length.toString() + ", ...)");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statByGroupIdInput = new XcalarApiStatByGroupIdInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStatByGroupId;
    workItem.input.statByGroupIdInput.nodeId = nodeId;
    workItem.input.statByGroupIdInput.numGroupId = groupIdList.length;
    workItem.input.statByGroupIdInput.groupId = groupIdList;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var statOutput = result.output.statOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statOutput.status = result.jobStatus;
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatsByGroupId() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarResetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarResetStats(nodeId = " + nodeId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResetStat;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResetStats() caught exception:", error);
        deferred.reject(error);
    });
}

function xcalarGetStatGroupIdMap(thriftHandle, nodeId, numGroupId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStatGroupIdMap(nodeId = " + nodeId.toString() +
                ", numGroupId = " + numGroupId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStatGroupIdMap;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var statGroupIdMapOutput = result.output.statGroupIdMapOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statGroupIdMapOutput.status = result.jobStatus;
        }
        deferred.resolve(statGroupIdMapOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatGroupIdMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQuery(thriftHandle, query) {
    var deferred = jQuery.Deferred();

    console.log("xcalarQuery(query = " + query + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiQuery;
    workItem.input.queryInput = query;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var queryOutput = result.output.queryOutput;

        deferred.resolve(queryOutput);
    })
    .fail(function(error) {
        console.log("xcalarQuery() caught exception:", error);
        
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQueryState(thriftHandle, queryId) {
    var deferred = jQuery.Deferred();

    console.log("xcalarQueryState(queryId = " + queryId + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryStateInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiQueryState;
    workItem.input.queryStateInput.queryId = queryId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var queryStateOutput = result.output.queryStateOutput

        deferred.resolve(queryStateOutput);
    })
    .fail(function(error) {
        console.log("xcalarQueryState() caught exception:", error);
        
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDag(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarDag(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiDag;
    workItem.input.dagTableNameInput = tableName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var dagOutput = result.output.dagOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            var status = result.jobStatus;
            deferred.reject(status);
        } 
        else {
            console.log('status ok!', result);
            deferred.resolve(dagOutput);
        }   
    })
    .fail(function(error) {
        console.log("xcalarDag() caught exception: " + error);
        deferred.reject(error);
    })

    return (deferred.promise());
}

function xcalarListTables(thriftHandle, patternMatch) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListTables(patternMatch = " + patternMatch + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListTables;
    workItem.input.listTablesInput = patternMatch;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var listTablesOutput = result.output.listTablesOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listTablesOutput.numTables = 0;
        }
        deferred.resolve(listTablesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListDatasets(thriftHandle) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListDatasets()");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDatasets;

    var listDatasetsOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        listDatasetsOutput = result.output.listDatasetsOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listDatasetsOutput.status = result.jobStatus;
        }
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        console.log("xcalarListDatasets() caught exception:", error);

        var listDatasetsOutput = new XcalarApiListDatasetsOutputT();
        // XXX FIXME should add StatusT.StatusThriftProtocolError
        listDatasetsOutput.numDatasets = 0;

        deferred.resolve(listDatasetsOutput);
    });

    return (deferred.promise());
}

function xcalarMakeResultSetFromTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarMakeResultSetFromTable(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiMakeResultSetInputT();
    workItem.input.makeResultSetInput.table = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.fromTable = true;
    workItem.input.makeResultSetInput.table.tableName = tableName;
    workItem.input.makeResultSetInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.makeResultSetInput.datasetId = 0;

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        makeResultSetOutput = result.output.makeResultSetOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            makeResultSetOutput.status = result.jobStatus;
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
}

function xcalarMakeResultSetFromDataset(thriftHandle, datasetId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarMakeResultSetFromDataset(datasetId = " +
                datasetId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiMakeResultSetInputT();
    workItem.input.makeResultSetInput.table = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.fromTable = false;
    workItem.input.makeResultSetInput.table.tableName = "";
    workItem.input.makeResultSetInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.makeResultSetInput.datasetId = datasetId;

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        makeResultSetOutput = result.output.makeResultSetOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            makeResultSetOutput.status = result.jobStatus;
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
}

function xcalarResultSetNext(thriftHandle, resultSetId, numRecords) {
    var deferred = jQuery.Deferred();

    console.log("xcalarResultSetNext(resultSetId = " + resultSetId.toString() +
                ", numRecords = " + numRecords.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input.resultSetNextInput.resultSetId = resultSetId;
    workItem.input.resultSetNextInput.numRecords = numRecords;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var resultSetNextOutput = result.output.resultSetNextOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            resultSetNextOutput.status = result.jobStatus;
        }

        deferred.resolve(resultSetNextOutput);
    })
    .fail(function(error) {
        console.log("xcalarResultSetNext() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarJoin(thriftHandle, leftTableName, rightTableName, joinTableName,
                    joinType) {
    var deferred = jQuery.Deferred();
    console.log("xcalarJoin(leftTableName = " + leftTableName +
                ", rightTableName = " + rightTableName + ", joinTableName = " +
                joinTableName + ", joinType = " + OperatorsOpTStr[joinType] +
                ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.joinInput = new XcalarApiJoinInputT();
    workItem.input.joinInput.leftTable = new XcalarApiTableT();
    workItem.input.joinInput.rightTable = new XcalarApiTableT();
    workItem.input.joinInput.joinTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiJoin;
    workItem.input.joinInput.leftTable.tableName = leftTableName;
    workItem.input.joinInput.leftTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.rightTable.tableName = rightTableName;
    workItem.input.joinInput.rightTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinTable.tableName = joinTableName;
    workItem.input.joinInput.joinTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinType = joinType;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var joinOutput = result.output.joinOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            joinOutput.status = result.jobStatus;
        }

        deferred.resolve(joinOutput);
    })
    .fail(function(error) {
        console.log("xcalarJoin() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarFilter(thriftHandle, filterStr, srcTableName, dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarFilter(srcTableName = " + srcTableName +
                ", dstTableName = " + dstTableName + ", filterStr = " +
                filterStr + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.srcTable = new XcalarApiTableT();
    workItem.input.filterInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.srcTable.tableName = srcTableName;
    workItem.input.filterInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.dstTable.tableName = dstTableName;
    workItem.input.filterInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.filterStr = filterStr;

    var filterOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        filterOutput = result.output.filterOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            filterOutput.status = result.jobStatus;
        }

        deferred.resolve(filterOutput);
    })
    .fail(function(error) {
        console.log("xcalarFilter() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGroupBy(thriftHandle, srcTableName, dstTableName, groupByOp,
                       fieldName, newFieldName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGroupBy(srcTableName = " + srcTableName +
                ", dstTableName = " + dstTableName + ", groupByOp = " +
                OperatorsOpTStr[groupByOp] + ", fieldName = " + fieldName +
                ", newFieldName = " + newFieldName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.groupByInput = new XcalarApiGroupByInputT();
    workItem.input.groupByInput.table = new XcalarApiTableT();
    workItem.input.groupByInput.groupByTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGroupBy;
    workItem.input.groupByInput.table.tableName = srcTableName;
    workItem.input.groupByInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.groupByTable.tableName = dstTableName;
    workItem.input.groupByInput.groupByTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.groupByOp = groupByOp;
    workItem.input.groupByInput.fieldName = fieldName;
    workItem.input.groupByInput.newFieldName = newFieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var output = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            output.status = result.jobStatus;
        }
        deferred.resolve(output);
    })
    .fail(function(error) {
        console.log("xcalarGroupBy() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarResultSetAbsolute(thriftHandle, resultSetId, position) {
    var deferred = jQuery.Deferred();
    console.log("xcalarResultSetAbsolute(resultSetId = " +
                resultSetId.toString() + ", position = " +
                position.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetAbsoluteInput =
        new XcalarApiResultSetAbsoluteInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResultSetAbsolute;
    workItem.input.resultSetAbsoluteInput.resultSetId = resultSetId;
    workItem.input.resultSetAbsoluteInput.position = position;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.statusOutput;
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
}

function xcalarFreeResultSet(thriftHandle, resultSetId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarFreeResultSet(resultSetId = " +
                resultSetId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.freeResultSetInput = new XcalarApiFreeResultSetInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiFreeResultSet;
    workItem.input.freeResultSetInput.resultSetId = resultSetId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        // XXX FIXME bug 136
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResultSetAbsolute() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDeleteTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarDeleteTable(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.deleteTableInput =  new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiDeleteTable;
    workItem.input.deleteTableInput.tableName = tableName;
    workItem.input.deleteTableInput.tableId = XcalarApiTableIdInvalidT;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
            deferred.reject(status);
        } else {
            deferred.resolve(status);
        }
    })
    .fail(function(error) {
        console.log("xcalarDeleteTable() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetTableRefCount(thriftHandle, tableName) {
    console.log("xcalarGetTableRefCount(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableRefCountInput = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetTableRefCount;
    workItem.input.getTableRefCountInput.tableName = tableName;
    workItem.input.getTableRefCountInput.tableId = XcalarApiTableIdInvalidT;

    try {
        var result = thriftHandle.client.queueWork(workItem);
        var getTableRefCountOutput = result.output.getTableRefCountOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            getTableRefCountOutput.status = result.jobStatus;
        }
    } catch(ouch) {
        console.log("xcalarDeleteTable() caught exception: " + ouch);

        var getTableRefCountOutput = new XcalarApiGetTableRefCountOutputT();
        getTableRefCountOutput.status = StatusT.StatusThriftProtocolError;
    }

    return getTableRefCountOutput;
}

function xcalarBulkDeleteTables(thriftHandle, tableNamePattern) {
    var deferred = jQuery.Deferred();
    console.log("xcalarBulkDeleteTables(tableNamePattern = " +
                tableNamePattern + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiBulkDeleteTables;
    workItem.input.bulkDeleteTablesInput = tableNamePattern;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var deleteTablesOutput = result.output.deleteTablesOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            deleteTablesOutput.status = result.jobStatus;
        }
        deferred.resolve(deleteTablesOutput);
    })
    .fail(function(error) {
        console.log("xcalarBulkDeleteTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDestroyDataset(thriftHandle, datasetId) {
    var deferred = jQuery.Deferred();

    console.log("xcalarDestroyDataset(datasetId = " + datasetId + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.destroyDsInput = new XcalarApiDestroyDatasetInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiDestroyDataset;
    workItem.input.destroyDsInput.datasetId = datasetId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var status = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            console.log("xcalarDestroyDataset() failed with status code:" +
                        status);
            deferred.reject(status);
        } else {
            console.log("xcalarDestroyDataset() success!");
            deferred.resolve();
        }
    })
    .fail(function(ouch) { 
        console.log("xcalarDestroyDataset() caught exception: " + ouch);
        deferred.reject(status);
    });

    return (deferred.promise());
}

function xcalarApiMap(thriftHandle, newFieldName, evalStr, srcTableName,
                      dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarApiMap(newFieldName = " + newFieldName + ", evalStr = "
                + evalStr + ", srcTableName = " +
                srcTableName + ", dstTableName = " + dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.mapInput = new XcalarApiMapInputT();
    workItem.input.mapInput.srcTable = new XcalarApiTableT();
    workItem.input.mapInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMap;
    workItem.input.mapInput.evalStr = evalStr;
    workItem.input.mapInput.srcTable.tableName = srcTableName;
    workItem.input.mapInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.dstTable.tableName = dstTableName;
    workItem.input.mapInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.newFieldName = newFieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result){
        var mapOutput = result.output.mapOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            mapOutput.status = result.jobStatus;
        }
        deferred.resolve(mapOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarAggregate(thriftHandle, srcTableName, aggregateOp, fieldName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarAggregate(srcTableName = " + srcTableName +
                ", aggregateOp = " + OperatorsOpTStr[aggregateOp] +
                ", fieldName = " + fieldName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.aggregateInput = new XcalarApiAggregateInputT();
    workItem.input.aggregateInput.table = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiAggregate;
    workItem.input.aggregateInput.table.tableName = srcTableName;
    workItem.input.aggregateInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.aggregateInput.aggregateOp = aggregateOp;
    workItem.input.aggregateInput.fieldName = fieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var aggregateOutput = result.output.aggregateOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            aggregateOutput.status = result.jobStatus;
        }

        deferred.resolve(aggregateOutput.jsonAnswer);
    })
    .fail(function(error) {
        console.log("xcalarAggregate() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarExport(thriftHandle, tableName, fileName) {
    console.log("xcalarExport(tableName = " + tableName + ", fileName = " +
                fileName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.exportInput = new XcalarApiExportInputT();
    workItem.input.exportInput.srcTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiExport;
    workItem.input.exportInput.srcTable.tableName = tableName;
    workItem.input.exportInput.fileName = fileName;

    try {
        var result = thriftHandle.client.queueWork(workItem);
        var exportOutput = result.output.exportOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            exportOutput.status = result.jobStatus;
        }
    } catch (ouch) {
        console.log("xcalarExport() caught exception: " + ouch);

        var exportOutput = new XcalarApiExportOutputT();
        exportOutput.status = StatusT.StatusThriftProtocolError;
    }

    return exportOutput;
}

function xcalarListFiles(thriftHandle, url) {
    console.log("xcalarListFiles(url = " + url + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.listFilesInput = new XcalarApiListFilesInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiListFiles;
    workItem.input.listFilesInput.url = url;

    try {
        var result = thriftHandle.client.queueWork(workItem);
        var listFilesOutput = result.output.listFilesOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listFilesOutput.status = result.jobStatus;
        }
    } catch (ouch) {
        console.log("xcalarListFiles() caught exception: " + ouch);

        var listFilesOutput = new XcalarApiListFilesOutputT();
	listFilesOutput.status = StatusT.StatusThriftProtocolError;
        listFilesOutput.numFiles = 0;
    }

    return listFilesOutput;
}
