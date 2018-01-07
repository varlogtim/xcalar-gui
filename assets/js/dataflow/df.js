window.DF = (function($, DF) {
    var dataflows = {};
    var restored = false;
    var lastCreatedDF;

    DF.restore = function() {
        var deferred = jQuery.Deferred();
        var retMeta;
        var numRetinas;

        KVStore.getEmataInfo()
        .then(function(eMeta) {
            var ephMetaInfos;
            try {
                ephMetaInfos = new EMetaConstructor(eMeta);
            } catch (error) {
                return PromiseHelper.reject();
            }
            if (ephMetaInfos) {
                retMeta = ephMetaInfos.getDFMeta();
                return XcalarListRetinas();
            }
        })
        .then(function(list) {
            numRetinas = list.numRetinas;
            for (var i = 0; i < list.numRetinas; i++) {
                var retName = list.retinaDescs[i].retinaName;
                if (retName.indexOf("#") > -1) {
                    // These are retinas that are generated by retina replay
                    // Do not show them
                    // We do not allow uploading or creation of retinas with #
                    numRetinas--;
                    continue;
                }
                if (retName in retMeta) {
                    dataflows[retName] = retMeta[retName];
                } else {
                    console.warn("No meta for dataflow", retName);
                    dataflows[retName] = new Dataflow(retName);
                }
            }
            return XcalarListSchedules();
        })
        .then(function(list) {
            for (var i = 0; i < list.length; i++) {
                var retName = list[i].scheduleMain.retName;
                if (dataflows[retName] == null) {
                    console.error("error case");
                    continue;
                }

                var allOptions = $.extend({}, list[i].scheduleMain.options,
                             list[i].scheduleMain.substitutions,
                             list[i].scheduleMain.timingInfo);
                dataflows[retName].schedule = new SchedObj(allOptions);
            }

            if (numRetinas > 0) {
                DFCard.refreshDFList(true, true);
                var $listItem;
                if (lastCreatedDF) {
                    $listItem = DFCard.getDFListItem(lastCreatedDF);
                    lastCreatedDF = null;
                }
                if (!$listItem || !$listItem.length) {
                    $listItem = $("#dfMenu").find(".dataFlowGroup").eq(0);
                }
                $listItem.click();
            } else {
                DFCard.refreshDFList(true);
            }
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            restored = true;
        });

        return deferred.promise();
    };

    DF.wasRestored = function() {
        return restored;
    };

    // if df.restore hasn't been called, we will track the most recently
    // created df so we can focus on it later
    DF.setLastCreatedDF = function(dfName) {
        lastCreatedDF = dfName;
    };

    DF.refresh = function(retMeta) {
        // This call now has to return a promise
        var deferred = jQuery.Deferred();
        var retArray = [];

        XcalarListRetinas()
        .then(function(list) {
            for (var i = 0; i < list.numRetinas; i++) {
                var retName = list.retinaDescs[i].retinaName;
                if (retName.indexOf("#") > -1) {
                    // These are retinas that are generated by retina replay
                    // Do not show them
                    // We do not allow uploading or creation of retinas with #
                    continue;
                }
                retArray.push(XcalarGetRetina(retName));
            }

            return PromiseHelper.alwaysResolve(PromiseHelper.when.apply({}, retArray));
        })
        .then(function() {
            dataflows = {}; // Reset dataflow cache
            var retStructs = arguments;
            for (var i = 0; i < retStructs.length; i++) {
                if (retStructs[i] == null) {
                    continue;
                }
                if (!retStructs[i].retina) {
                    continue;
                }
                // Populate node information
                var retName = retStructs[i].retina.retinaDesc.retinaName;
                if (retName in retMeta) {
                    dataflows[retName] = retMeta[retName];
                } else {
                    console.warn("No meta for dataflow", retName);
                    dataflows[retName] = new Dataflow(retName);
                }

                updateDFInfo(retStructs[i]);

                dataflows[retName].updateParamMapInUsed();
            }
            return XcalarListSchedules();
        })
        .then(function(list) {
            for (var i = 0; i < list.length; i++) {
                var retName = list[i].scheduleMain.retName;
                if (dataflows[retName] == null) {
                    console.error("error case");
                    continue;
                }

                var allOptions = $.extend({}, list[i].scheduleMain.options,
                             list[i].scheduleMain.substitutions,
                             list[i].scheduleMain.timingInfo);
                dataflows[retName].schedule = new SchedObj(allOptions);
            }
            DFCard.refreshDFList(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    DF.commitAndBroadCast = function(modifiedDataflow) {
        KVStore.commit()
        .always(function() {
            XcSocket.sendMessage("refreshDataflow", modifiedDataflow);
        });
    };

    DF.getAllDataflows = function() {
        return (dataflows);
    };

    DF.getNumDataflows = function() {
        return (Object.keys(dataflows).length);
    };

    DF.getAllCommitKeys = function() {
        // Only commit stuff that we cannot recreate
        var deepCopy = xcHelper.deepCopy(dataflows);
        for (var df in deepCopy) {
            delete deepCopy[df].nodeIds;
            delete deepCopy[df].retinaNodes;
            delete deepCopy[df].columns;
            delete deepCopy[df].schedule;
        }
        return deepCopy;
    };

    DF.getDataflow = function(dataflowName) {
        return (dataflows[dataflowName]);
    };

    DF.addDataflow = function(dataflowName, dataflow, exportTables, srcTables,
                              options) {
        options = options || {};
        var deferred = jQuery.Deferred();

        var innerDef;
        if (options.isUpload) {
            innerDef = PromiseHelper.resolve();
        } else {
            innerDef = createRetina(dataflowName, exportTables, srcTables);
        }

        innerDef
        .then(function() {
            return XcalarGetRetina(dataflowName);
        })
        .then(function(retInfo) {
            dataflows[dataflowName] = dataflow;
            updateDFInfo(retInfo);
            // XXX TODO add sql
            DFCard.addDFToList(dataflowName);
            // no need to commit to kvstore since there's no info stored
            // in this new dataflow
            XcSocket.sendMessage("refreshDataflow", dataflowName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    DF.removeDataflow = function(dataflowName) {
        var deferred = jQuery.Deferred();
        var hasRemoveSched = false;

        DF.removeScheduleFromDataflow(dataflowName)
        .then(function() {
            hasRemoveSched = true;
            return XcalarDeleteRetina(dataflowName);
        })
        .then(function() {
            resolveDelete();
            deferred.resolve();
        })
        .fail(function(error) {
            if (typeof error === "object" &&
                error.status === StatusT.StatusRetinaNotFound)
            {
                resolveDelete();
                deferred.resolve();
            } else {
                if (hasRemoveSched) {
                    DF.commitAndBroadCast(dataflowName);
                }
                deferred.reject(error);
            }
        });

        return deferred.promise();

        function resolveDelete() {
            delete dataflows[dataflowName];
            DF.commitAndBroadCast(dataflowName);
        }
    };

    // For addining. modifying and removing the schedule
    DF.getSchedule = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if (dataflow) {
            return dataflow.schedule;
        }
    };

    DF.addScheduleToDataflow = function(dataflowName, allOptions) {
        var deferred = jQuery.Deferred();
        var dataflow = dataflows[dataflowName];
        var schedule;
        var substitutions;
        var options;
        var timingInfo;
        if (dataflow) {
            if (!dataflow.schedule) {
                schedule = new SchedObj(allOptions);
                substitutions = getSubstitutions(dataflowName,
                                    allOptions.activeSession);
                options = getOptions(allOptions);
                timingInfo = getTimingInfo(allOptions);
                XcalarCreateSched(dataflowName, dataflowName,
                    substitutions, options, timingInfo)
                .then(function() {
                    dataflow.schedule = schedule;
                    DF.commitAndBroadCast(dataflowName);
                    deferred.resolve();
                })
                .fail(deferred.reject);
            } else {
                schedule = dataflow.schedule;
                XcalarDeleteSched(dataflowName)
                .then(function() {
                    substitutions = getSubstitutions(dataflowName,
                                        allOptions.activeSession);
                    options = getOptions(allOptions);
                    timingInfo = getTimingInfo(allOptions);
                    return XcalarCreateSched(dataflowName, dataflowName,
                        substitutions, options, timingInfo);
                })
                .then(function() {
                    schedule.update(allOptions);
                    DF.commitAndBroadCast(dataflowName);
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else {
            console.warn("No such dataflow exist!");
            deferred.resolve();
        }
        return deferred.promise();
    };

    DF.updateScheduleForDataflow = function(dataflowName) {
        var deferred = jQuery.Deferred();
        var dataflow = dataflows[dataflowName];

        if (!dataflow) {
            return;
        }
        var option = DF.getAdvancedExportOption(dataflowName, true);
        var exportOptions = DF.getExportTarget(option.activeSession, dataflowName);
        dataflow.schedule.exportTarget = exportOptions.exportTarget;
        dataflow.schedule.exportLocation = exportOptions.exportLocation;

        var options = getOptions(dataflow.schedule);
        var timingInfo = getTimingInfo(dataflow.schedule);
        var substitutions = getSubstitutions(dataflowName, option.activeSession);

        XcalarUpdateSched(dataflowName, dataflowName,
            substitutions, options, timingInfo)
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    };

    DF.removeScheduleFromDataflow = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if (!dataflow) {
            var error = xcHelper.replaceMsg(DFTStr.NoTExists, {
                "df": dataflowName
            });
            return PromiseHelper.reject(error);
        }

        var deferred = jQuery.Deferred();
        XcalarDeleteSched(dataflowName)
        .then(function() {
            dataflow.schedule = null;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    DF.hasSchedule = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if (dataflow) {
            return dataflow.hasSchedule();
        } else {
            console.warn("No such dataflow exist!");
            return false;
        }
    };

    DF.hasDataflow = function(dataflowName) {
        return dataflows.hasOwnProperty(dataflowName);
    };

    DF.updateDF = function(dfName) {
        var deferred = jQuery.Deferred();
        var df = dataflows[dfName];

        XcalarGetRetina(dfName)
        .then(function(retStruct) {
            updateDFInfo(retStruct);
            return df.updateParamMapInUsed();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    function createRetina(retName, exportTables, srcTables) {
        var tableArray = []; // array of XcalarApiRetinaDstT
        var srcTableArray = [];

        for (var i = 0; i < exportTables.length; i++) {
            var retinaDstTable = new XcalarApiRetinaDstT();
            retinaDstTable.target = new XcalarApiNamedInputT();
            retinaDstTable.target.isTable = true;
            retinaDstTable.target.name = exportTables[i].tableName;
            var columns = [];

            for (var j = 0; j < exportTables[i].columns.length; j++) {
                var col = new ExColumnNameT();
                col.name = exportTables[i].columns[j].backCol; // Back col name
                col.headerAlias = exportTables[i].columns[j].frontCol;
                columns.push(col);
            }

            retinaDstTable.columns = columns;
            retinaDstTable.numColumns = columns.length;

            tableArray.push(retinaDstTable);
        }

        for (var i = 0; i < srcTables.length; i++) {
            var retinaSrcTable = new XcalarApiRetinaSrcTableT(
                                                       {source: srcTables[i],
                                                        dstName: srcTables[i]});
            retinaSrcTable.source.name = srcTables[i];
            srcTableArray.push(retinaSrcTable);
        }

        return XcalarMakeRetina(retName, tableArray, srcTableArray);
    }

    // called after retina is created to update the ids of dag nodes
    function updateDFInfo(retInfo) {
        var retina = retInfo.retina;
        var retName = retina.retinaDesc.retinaName;
        var dataflow = dataflows[retName];
        var nodes = retina.retinaDag.node;

        dataflow.retinaNodes = nodes;

        for (var i = 0; i < retina.retinaDag.numNodes; i++) {
            var tableName = nodes[i].name.name;
            dataflow.addNodeId(tableName, nodes[i].dagNodeId);
        }
    }

    function getSubstitutions(dataflowName, forceAddN) {
        var paramsArray = [];
        var dfObj = DF.getDataflow(dataflowName);
        var paramMap = dfObj.paramMap;
        var paramMapInUsed = dfObj.paramMapInUsed;

        for (var name in paramMap) {
            var p = new XcalarApiParameterT();
            if (paramMapInUsed[name]) {
                p.paramName = name;
                p.paramValue = paramMap[name];
                paramsArray.push(p);
            }
        }
        if (forceAddN && !paramMap.hasOwnProperty("N")) {
            p = new XcalarApiParameterT();
            p.paramName = "N";
            p.paramValue = 0;
            paramsArray.push(p);
        }
        return paramsArray;
    }

    function getOptions(allOptions) {
        var options = {
            "activeSession": allOptions.activeSession,
            "newTableName": allOptions.newTableName,
            "usePremadeCronString": allOptions.usePremadeCronString,
            "premadeCronString": allOptions.premadeCronString,
            "isPaused": allOptions.isPaused,
            "exportTarget": allOptions.exportTarget,
            "exportLocation": allOptions.exportLocation
        };
        return options;
    }
    function getTimingInfo(allOptions) {
        var timingInfo = {
            "startTime": allOptions.startTime,
            "dateText": allOptions.dateText,
            "timeText": allOptions.timeText,
            "repeat": allOptions.repeat,
            "modified": allOptions.modified,
            "created": allOptions.created
        };
        return timingInfo;
    }

    DF.getExportTarget = function(activeSession, dataflowName) {
        var options = {};
        options.exportTarget = null;
        options.exportLocation = null;
        if (activeSession) {
            options.exportLocation = "N/A";
            options.exportTarget = "XcalarForTable";
            return options;
        } else {
            var exportTarget = "Default";
            var df = DF.getDataflow(dataflowName);
            if (df) {
                var retinaNodes = df.retinaNodes;
                try {
                    exportTarget = retinaNodes[0].input.exportInput.targetName;
                    var exportTargetObj = DSExport.getTarget(exportTarget);
                    options.exportTarget = exportTargetObj.info.name;
                    options.exportLocation = exportTargetObj.info.formatArg;
                } catch (error) {
                    console.error(error);
                }
            }
            return options;
        }
    };

    DF.saveAdvancedExportOption = function(dataflowName, activeSessionOptions) {
        var df = DF.getDataflow(dataflowName);
        if (df) {
            df.activeSession = activeSessionOptions.activeSession;
            df.newTableName = activeSessionOptions.newTableName;
            df.nameWithHash = df.newTableName + Authentication.getHashId();
        }
    };

    DF.getAdvancedExportOption = function(dataflowName, withoutHashId) {
        var df = DF.getDataflow(dataflowName);
        var res = {
            "activeSession": false,
            "newTableName": ""
        };
        if (df) {
            if (df.activeSession) {
                var newTableName = withoutHashId ? df.newTableName :
                                                   df.nameWithHash;
                res.activeSession = df.activeSession;
                res.newTableName = newTableName;
            }
            return res;
        } else {
            return null;
        }
    };

    DF.deleteActiveSessionOption = function(dataflowName) {
        var df = DF.getDataflow(dataflowName);

        if (df) {
            delete df.activeSession;
            delete df.newTableName;
            delete df.nameWithHash;
        }
    };

    /* Unit Test Only */
    if (window.unitTestMode) {
        DF.__testOnly__ = {};
        DFParamModal.__testOnly__.getSubstitutions = getSubstitutions;
        DFParamModal.__testOnly__.updateDataflows = function(newDf) {
            var oldDataflows = [];
            for (var i in dataflows) {
                oldDataflows[i] = dataflows[i];
                delete dataflows[i];
            }
            for (var i in newDf) {
                dataflows[i] = newDf[i];
            }

            return oldDataflows;
        };
    }
    /* End Of Unit Test Only */


    return (DF);

}(jQuery, {}));
