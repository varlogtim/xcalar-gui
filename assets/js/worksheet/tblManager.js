window.TblManager = (function($, TblManager) {
    /**
        This function takes in an array of newTable names to be added,
        an array of tableCols, worksheet that newTables will add to and an array
        of oldTable names that will be modified due to a function.
        Inside oldTables, if there is an anchor table, we move it to the start
        of the array. If there is a need for more than 1 piece of information,
        then oldTables need to be an array of structs
        txId is provided during a normal operation and is null during an undo,
        redo, or repeat etc.

        Possible Options:
        -focusWorkspace: boolean to determine whether we should focus back on
                            workspace, we focus on workspace when adding a table
                            from the datastores panel
        -afterStartup: boolean, default is true. Set to false if tables are
                      being added during page load
        -selectCol: number or array of numbers. column to be highlighted when
                    table is ready
        -isUndo: boolean, default is false. Set to true if this table is being
                  created from an undo operation,
        -position: int, used to place a table in a certain spot if not replacing
                        an older table. Currently has to be paired with undo
        -replacingDest: string, where to send old tables that are being replaced
    */
    TblManager.refreshTable = function(newTableNames, tableCols, oldTableNames,
                                       worksheet, txId, options)
    {
        if (txId != null && Transaction.checkCanceled(txId)) {
            return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
        }

        var deferred = jQuery.Deferred();
        var newTableName = newTableNames[0];
        var newTableId = xcHelper.getTableId(newTableName);
        var tablesToRemove = [];
        var tablesToReplace = [];

        options = options || {};
        oldTableNames = oldTableNames || [];

        if (typeof oldTableNames === "string") {
            oldTableNames = [oldTableNames];
        }

        // set table list into a transition state
        TableList.updatePendingState(true);

        // must get worksheet to add before async call,
        // otherwise newTable may add to wrong worksheet
        var tableAddedToWS = false;
        if (worksheet != null) {
            WSManager.addTable(newTableId, worksheet);
            tableAddedToWS = true;
        } else {
            worksheet = WSManager.getWSFromTable(newTableId);
            if (!worksheet) {
                worksheet = WSManager.getActiveWS();
                WSManager.addTable(newTableId, worksheet);
                tableAddedToWS = true;
            }
        }

        if (oldTableNames.length > 0) {
            // figure out which old table we will replace
            setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                               tablesToRemove);
        }

        // lock tables in case not locked during an undo/redo
        var tableLockStatuses = [];
        var isLocked;
        for (var i = 0; i < tablesToRemove.length; i++) {
            isLocked = gTables[tablesToRemove[i]].hasLock();
            tableLockStatuses.push(isLocked);
            if (!isLocked) {
                xcHelper.lockTable(tablesToRemove[i]);
            }
        }

        if (!tableCols || tableCols.length === 0) {
            if (!gTables[newTableId] || // Short circuit
                gTables[newTableId].status === TableType.Orphan) {
                TableList.removeTable(newTableName);
            }
            // if no tableCols provided but gTable exists,
            // columns are already set
        }

        setTableMeta(newTableName, tableCols)
        .then(function() {
            if (txId != null) {
                if (Transaction.checkCanceled(txId)) {
                    deferred.reject(StatusTStr[StatusT.StatusCanceled]);
                    return;
                } else {
                    // we cannot allow transactions to be canceled if
                    // we're about to add a table to the worksheet
                    Transaction.disableCancel(txId);
                }
            }

            if (options.focusWorkspace) {
                MainMenu.openPanel("workspacePanel", null, {
                    hideDF: true
                });
            }

            // append newly created table to the back, do not remove any tables
            var addTableOptions = {
                "afterStartup": true,
                "selectCol": options.selectCol,
                "isUndo": options.isUndo,
                "position": options.position,
                "from": options.from,
                "replacingDest": options.replacingDest,
                "ws": worksheet,
                "txId": txId
            };

            return addTable(newTableName, tablesToReplace, tablesToRemove,
                     addTableOptions);
        })
        .then(function() {
            if (options.focusWorkspace) {
                scrollAndFocusTable(newTableName);
            } else {
                var wsNum = WSManager.getActiveWS();
                if ($('.xcTableWrap.worksheet-' + wsNum)
                                   .find('.tblTitleSelected').length === 0) {
                    var tableId = xcHelper.getTableId(newTableName);
                    TblFunc.focusTable(tableId);
                }
            }
            for (var i = 0; i < tablesToRemove.length; i++) {
                if (!tableLockStatuses[i]) {
                    xcHelper.unlockTable(tablesToRemove[i]);
                }
            }
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("refresh tables fails!", error, newTableName);
            if (tableAddedToWS) {
                WSManager.removeTable(newTableId);
            }
            removeTableDisplay(newTableId);
            for (var i = 0; i < tablesToRemove.length; i++) {
                if (!tableLockStatuses[i]) {
                    xcHelper.unlockTable(tablesToRemove[i]);
                }
            }
            deferred.reject(error);
        })
        .always(function() {
            WSManager.removePending(newTableId, worksheet);
            TableList.updatePendingState(false);
        });

        return deferred.promise();
    };

    function setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                                tablesToRemove) {
        var oldTableIds = oldTableNames.map(xcHelper.getTableId);
        if (oldTableNames.length === 1) {
            // only have one table to remove
            tablesToReplace.push(oldTableNames[0]);
        } else {
            // find the first table in the worksheet,
            // that is the target worksheet
            // var targetTable;
            var wsTables = WSManager.getWSById(worksheet).tables;
            for (var i = 0, len = wsTables.length; i < len; i++) {
                var index = oldTableIds.indexOf(wsTables[i]);
                if (index > -1) {
                    tablesToReplace.push(oldTableNames[index]);
                    break;
                }
            }

            if (tablesToReplace.length === 0) {
                // If we're here, we could not find a table to be replaced in the
                // active worksheet, so the new table
                // will eventually just be appended to the active worksheet
                // The old tables will still be removed;
                console.warn("Current WS has no tables to replace");
                // tablesToReplace will remain an empty array
            }
        }

        oldTableIds.forEach(function(oldTableId) {
            if (!tablesToRemove.includes(oldTableId)) {
                // if oldTableId alredy exists (like self join)
                // not add again
                tablesToRemove.push(oldTableId);
                var progressCircle = $("#xcTableWrap-" + oldTableId)
                                        .find(".lockedTableIcon")
                                        .data("progresscircle");
                if (progressCircle) {
                    progressCircle.done();
                }
            }
        });
    }

    /*
        This functions adds new tables to the display and the dag at the same
        time.

        Possible Options:
        afterStartup: boolean to indicate if the table is added after page load
        selectCol: number or array of numbers. column to be highlighted when
                    table is ready,
        txId: string, used for tagging operations before creating dag
    */
    TblManager.parallelConstruct = function(tableId, tableToReplace, options) {
        options = options || {};
        var deferred  = jQuery.Deferred();
        var deferred1 = startBuildTable(tableId, tableToReplace, options);
        var deferred2 = createDag(tableId, tableToReplace, options);
        var table = gTables[tableId];

        PromiseHelper.when(deferred1, deferred2)
        .then(function() {
            var $xcTableWrap = $('#xcTableWrap-' + tableId);
            RowScroller.resize();
            $xcTableWrap.removeClass("building");
            $("#dagWrap-" + tableId).removeClass("building");
            afterBuild(tableId, options);
            if ($('#mainFrame').hasClass('empty')) {
                // first time to create table
                $('#mainFrame').removeClass('empty');
            }
            if (options.afterStartup) {
                var $existingTableList = $('#activeTablesList')
                                        .find('[data-id="' + tableId + '"]');
                if ($existingTableList.length) {
                    $existingTableList.closest('.tableInfo')
                                      .removeClass('hiddenWS')
                                      .removeAttr('data-toggle data-container' +
                                                  'title data-original-title');
                } else {
                    TableList.addTables([table], IsActive.Active);
                }
                // in case table showed up in temp list during its formation
                TableList.removeTable(table.getName(), TableType.Orphan);
            }
            var $visibleTables = $('.xcTable:visible');
            if ($visibleTables.length === 1 &&
                $visibleTables.is("#xcTable-" + tableId)) {
                TblFunc.focusTable(tableId);
            }

            // disallow dragging if only 1 table in worksheet
            TblFunc.checkTableDraggable();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    TblManager.setOrphanedList = function(tableMap) {
        var tables = [];
        for (var table in tableMap) {
            tables.push(table);
        }
        gOrphanTables = tables;
    };

    /*
        Sets gTable meta data, specially for orphan table
    */
    TblManager.setOrphanTableMeta = function(tableName, tableCols) {
        if (tableCols == null) {
            // at least have data col
            tableCols = [ColManager.newDATACol()];
        }

        var tableId = xcHelper.getTableId(tableName);
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "tableCols": tableCols,
            "status": TableType.Orphan
        });

        gTables[tableId] = table;
        TableList.addToOrphanList(tableName);

        return table;
    };

    // options:
    // remove: boolean, if true will remove table from html immediately - should
    //                  happen when not replacing a table
    // keepInWS: boolean, if true will not remove table from WSManager
    // noFocusWS: boolean, if true will not focus on tableId's Worksheet
    // force: boolean, if true will change table meta before async returns
    // removeAfter: boolean, if true will remove table html after freeing result
    //                      set
    TblManager.sendTableToOrphaned = function(tableId, options) {
        var deferred = jQuery.Deferred();
        options = options || {};
        if (options.remove) {
            removeTableDisplay(tableId);
        }
        var table = gTables[tableId];

        if (options.force) {
            tableCleanup(tableId, false, options);
        }

        table.freeResultset()
        .then(function() {
            if (options.removeAfter) {
                removeTableDisplay(tableId);
            }
            if (!options.force) {
                tableCleanup(tableId, false, options);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    TblManager.sendTableToTempList = function(tableId) {
        var deferred = jQuery.Deferred();
        var ws = WSManager.getWSFromTable(tableId);
        var tablePos = WSManager.getTableRelativePosition(tableId);

        var sqlOptions = {
            "operation": SQLOps.MakeTemp,
            "worksheetId": ws,
            "tablePos": tablePos,
            "tableId": tableId,
            "tableName": gTables[tableId].getName(),
            "htmlExclude": ["tableId", "tablePos", "worksheetId"]
        };

        var options =  {removeAfter: true,
                        noFocusWS: true};
        xcHelper.lockTable(tableId);

        TblManager.sendTableToOrphaned(tableId, options)
        .then(function() {
            Log.add(SQLTStr.MakeTemp, sqlOptions);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    };

    // options:
    //      remove: boolean, if true will remove table display from ws immediately
    //      force: boolean, if true will change table meta before async returns
    TblManager.sendTableToUndone = function(tableId, options) {
        var deferred = jQuery.Deferred();
        options = options || {};
        if (options.remove) {
            removeTableDisplay(tableId);
        } else {
            $("#xcTableWrap-" + tableId).addClass('tableToRemove');
            $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
        }

        var table = gTables[tableId];
        if (!table) {
            deferred.reject('table not found');
            console.warn('gTable not found to send to undone');
            return deferred.promise();
        }
        if (options.force) {
            tableCleanup(tableId, true, options);
        }

        table.freeResultset()
        .then(function() {
            if (!options.force) {
                tableCleanup(tableId, true, options);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // searches for this table in active and temp list and brings it to the
    // active WS if needed and focuses on it
    TblManager.findAndFocusTable = function(tableName) {
        var deferred = jQuery.Deferred();

        var wsId;
        var tableType;
        var tableId = xcHelper.getTableId(tableName);
        if (gTables[tableId]) {
            if (gTables[tableId].status === TableType.Active) {
                $('#workspaceTab').click();
                wsId = WSManager.getWSFromTable(tableId);
                $('#worksheetTab-' + wsId).trigger(fakeEvent.mousedown);

                if ($("#dagPanel").hasClass('full')) {
                    $('#dagPulloutTab').click();
                }
                var $tableWrap = $('#xcTableWrap-' + tableId);
                xcHelper.centerFocusedTable($tableWrap, false)
                .then(function() {
                    deferred.resolve();
                });
                $tableWrap.mousedown();
                return deferred.promise();
            } else if (WSManager.getWSFromTable(tableId) == null) {
                tableType = TableType.Orphan;
            } else if (gTables[tableId].status === TableType.Orphan) {
                tableType = TableType.Orphan;
            } else if (gTables[tableId].status === TableType.Undone) {
                tableType = TableType.Undone;
            } else {
                tableType = TableType.Orphan;
            }

            //xx currently we won't allow focusing on undone tables
            if (tableType === TableType.Undone) {
                deferred.reject({tableType: tableType});
            } else {
                $('#workspaceTab').click();
                wsId = WSManager.getActiveWS();
                WSManager.moveInactiveTable(tableId, wsId, tableType, true)
                .then( deferred.resolve)
                .fail(deferred.reject);
            }
        } else {
            XcalarGetTables(tableName)
            .then(function(ret) {
                if (ret.numNodes > 0) {
                    $('#workspaceTab').click();
                    wsId = WSManager.getActiveWS();
                    WSManager.moveInactiveTable(tableId, wsId, TableType.Orphan,
                                                true)
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.reject();
                }
            });
        }

        return deferred.promise();
    };

    // XXX not using options.keepInWS anymore
    // used for orphaned or undone tables
    function tableCleanup(tableId, isUndone, options) {
        var table = gTables[tableId];
        var wsId;
        if (!options.noFocusWS) {
            wsId = WSManager.getWSFromTable(tableId);
        }

        TableList.removeTable(tableId);
        WSManager.removeTable(tableId);

        if (isUndone) {
            table.beUndone();
        } else {
            table.beOrphaned();
        }

        table.updateTimeStamp();

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
            RowScroller.empty();
        }

        if ($('.xcTableWrap:not(.inActive)').length === 0) {
            RowScroller.empty();
        }

        if (!options.noFocusWS) {
            var activeWS = WSManager.getActiveWS();
            if (activeWS !== wsId) {
                WSManager.focusOnWorksheet(wsId);
            }
        }

        TblManager.alignTableEls();

        // disallow dragging if only 1 table in worksheet
        TblFunc.checkTableDraggable();
        TableList.addToOrphanList(table.getName());
    }

    // XXX consider passing in table names instead of tableIds to simplify
    //     orphan name vs active table id determination
    // noLog: boolean, if we are deleting undone tables, we do not log this
    //              transaction
    // will resolve if at least 1 table passes, even if others fail
    // if no failures, will not return info, but if partial or full fail
    // then it will return array of failures
    // options:
    //      lockedToTemp: boolean, if true will send locked tables to temp list
    TblManager.deleteTables = function(tables, tableType, noAlert, noLog, options) {
        // XXX not tested yet!!!
        var deferred = jQuery.Deferred();
        options = options || {};

        // tables is an array, it might be modifed
        // example: pass in gOrphanTables
        if (!(tables instanceof Array)) {
            tables = [tables];
        }

        tables = tables.filter(function(tableIdOrName) {
            return verifyTableType(tableIdOrName, tableType);
        });

        var splitTables = splitDroppableTables(tables, tableType);
        tables = splitTables.deleteable;
        var noDeleteTables = splitTables.noDelete;

        var txId;
        if (!noLog) {
            var sql = {
                "operation": SQLOps.DeleteTable,
                "tables": xcHelper.deepCopy(tables),
                "tableType": tableType
            };
            txId = Transaction.start({
                "operation": SQLOps.DeleteTable,
                "sql": sql,
                "steps": tables.length
            });
        }

        var defArray = [];
        var tableNames = [];

        if (tableType === TableType.Orphan) {
            // delete orphaned
            tables.forEach(function(tableName) {
                tableNames.push(tableName);
                var def = delOrphanedHelper(tableName, txId);
                defArray.push(def);
            });
        } else if (tableType === TableType.Undone) {
            tables.forEach(function(tableId) {
                tableNames.push(gTables[tableId].getName());
                var def = delUndoneTableHelper(tableId);
                defArray.push(def);
            });
        } else {
            tables.forEach(function(tableId) {
                tableNames.push(gTables[tableId].getName());
                var def = delTableHelper(tableId, tableType, txId);
                defArray.push(def);
            });
            if (options.lockedToTemp) {
                noDeleteTables.forEach(function(tableId) {
                    defArray.push(TblManager.sendTableToOrphaned(tableId,
                        {remove: true, noFocusWS: true, force: true}));
                });
            }
        }

        PromiseHelper.when.apply(window, defArray)
        .then(function() {
            if (noDeleteTables.length && !options.lockedToTemp) {
                rejectHandler(tableNames);
            } else {
                if (!noLog) {
                    Transaction.done(txId, {
                        "title": TblTStr.Del
                    });
                }

                if (tableType === TableType.Undone) {
                    KVStore.commit();
                }
                deferred.resolve(tableNames);
            }
        })
        .fail(function() {
            rejectHandler(arguments);
        });

        function rejectHandler(args) {
            var res = tableDeleteFailHandler(args, tableNames, noDeleteTables);
            res.errors = args;
            if (res.hasSuccess) {
                if (!noLog) {
                    sql.tables = res.successTables;
                    Transaction.done(txId, {
                        "sql": sql,
                        "title": TblTStr.Del
                    });

                    if (res.fails && !noAlert) {
                        Alert.error(StatusMessageTStr.PartialDeleteTableFail,
                                    res.errorMsg);
                    }
                }

                if (tableType === TableType.Undone) {
                    KVStore.commit();
                }
                deferred.resolve(res);
            } else {
                if (!noLog) {
                    Transaction.fail(txId, {
                        "error": res.errorMsg,
                        "failMsg": StatusMessageTStr.DeleteTableFailed,
                        "noAlert": noAlert
                    });
                }
                deferred.reject(res);
            }
        }

        return deferred.promise();
    };

    TblManager.makeTableNoDelete = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];

        if (!table) {
            if (tableId != null && !gTables.hasOwnProperty(tableId)) {
                table = new TableMeta({
                    "tableId": tableId,
                    "tableName": tableName,
                    "tableCols": [ColManager.newDATACol()],
                    "status": TableType.Orphan
                });
                gTables[tableId] = table;
            } else {
                // XXX no id, handle this by renaming?
                return null;
            }
        }
        table.addNoDelete();
        var $tableHeader = $("#xcTheadWrap-" + tableId);
        if (!$tableHeader.find(".lockIconWrap").length) {
            $tableHeader.find(".tableTitle")
                        .append('<div class="lockIconWrap">' +
                                '<div class="lockIcon"></div></div>');
            TblFunc.moveTableDropdownBoxes();
        }
        TableList.makeTableNoDelete(tableId);
        return table;
    };

    TblManager.removeTableNoDelete = function(tableId) {
        var table = gTables[tableId];
        table.removeNoDelete();
        var $tableHeader = $("#xcTheadWrap-" + tableId);
        $tableHeader.find(".lockIconWrap").remove();
        TableList.removeTableNoDelete(tableId);
        return table;
    };

    function verifyTableType(tableIdOrName, expectTableType) {
        var currentTableType = null;
        var tableId = null;

        if (expectTableType === TableType.Orphan) {
            tableId = xcHelper.getTableId(tableIdOrName);
        } else {
            tableId = tableIdOrName;
        }

        if (tableId != null && gTables.hasOwnProperty(tableId)) {
            currentTableType = gTables[tableId].getType();
        } else {
            currentTableType = TableType.Orphan;
        }

        if (currentTableType === expectTableType || (currentTableType ===
            TableType.Undone && expectTableType === TableType.Orphan)) {
            return true;
        } else {
            console.warn("Table", tableIdOrName, "'s' type mismatch",
                        "type is", currentTableType,
                        "expected type is", expectTableType);
            return false;
        }
    }

    TblManager.restoreTableMeta = function(tables) {
        // will delete older dropped tables if storing more than 1MB of
        // dropped table data
        var cleanUpDroppedTables = function() {
            var limit = 1 * MB;
            var droppedTablesStr = JSON.stringify(gDroppedTables);
            if (droppedTablesStr.length < limit) {
                return;
            }

            var pctToReduce = limit / droppedTablesStr.length;
            var dTableArray = [];
            var numTotalCols = 0;
            var hashTag = Authentication.getInfo().hashTag;
            var hashTagLen = hashTag.length;

            for (var id in gDroppedTables) {
                dTableArray.push(gDroppedTables[id]);
                numTotalCols += gDroppedTables[id].tableCols.length;
            }

            // estimate table size by column length
            var colLimit = Math.floor(numTotalCols * pctToReduce);

            dTableArray.sort(function(a, b) {
                var idNumA = a.tableId.slice(hashTagLen);
                var idNumB = b.tableId.slice(hashTagLen);
                return parseInt(idNumB) - parseInt(idNumA);
            });

            var colCount = 0;
            gDroppedTables = {};
            for (var i = 0; i < dTableArray.length; i++) {
                colCount += dTableArray[i].tableCols.length;
                if (colCount > colLimit) {
                    break;
                } else {
                    gDroppedTables[dTableArray[i].tableId] = dTableArray[i];
                }
            }
        };

        for (var tableId in tables) {
            var table = tables[tableId];

            if (table.hasLock()) {
                table.unlock();
                table.beOrphaned();
            }

            if (table.isDropped()) {
                table.beDropped(); // strips unnecessary data
                gDroppedTables[tableId] = table;
            } else {
                gTables[tableId] = table;
            }
        }

        cleanUpDroppedTables();
    };

    TblManager.pullRowsBulk = function(tableId, jsonData, startIndex,
                                       direction, rowToPrependTo) {
        // this function does some preparation for ColManager.pullAllCols()
        startIndex = startIndex || 0;
        var $table = $('#xcTable-' + tableId);
        var $trs = ColManager.pullAllCols(startIndex, jsonData, tableId,
                                            direction, rowToPrependTo);
        addRowListeners($trs);
        TblManager.adjustRowHeights($trs, startIndex, tableId);

        var idColWidth = xcHelper.getTextWidth($table.find('tr:last td:first'));
        var newWidth = Math.max(idColWidth, 22);
        var padding = 12;
        $table.find('th:first-child').width(newWidth + padding);
        TblFunc.matchHeaderSizes($table);
    };

    TblManager.adjustRowHeights = function($trs, rowIndex, tableId) {
        var rowObj = gTables[tableId].rowHeights;
        var numRows = $trs.length;
        var pageNum = Math.floor(rowIndex / gNumEntriesPerPage);
        var lastPageNum = pageNum + Math.ceil(numRows / gNumEntriesPerPage);
        var padding = 4;
        var $row;
        var $firstTd;
        var row;

        for (var i = pageNum; i < lastPageNum; i++) {
            if (rowObj[i]) {
                for (row in rowObj[i]) {
                    $row = $trs.filter(getRows);
                    $firstTd = $row.find('td.col0');
                    $firstTd.outerHeight(rowObj[i][row]);
                    $row.find('td > div')
                        .css('max-height', rowObj[i][row] - padding);
                    $firstTd.children('div').css('max-height', rowObj[i][row]);
                    $row.addClass('changedHeight');
                }
            }
        }
        function getRows() {
            return ($(this).hasClass('row' + (row - 1)));
        }
    };

    TblManager.getColHeadHTML = function(colNum, tableId, options) {
        options = options || {};

        var table = gTables[tableId];
        xcAssert(table != null);

        var progCol = table.getCol(colNum);
        xcAssert(progCol != null);

        var colName = progCol.getFrontColName();
        var width = progCol.getWidth();
        var columnClass = options.columnClass || "";
        var keys = table.getKeyName();
        var indexed = keys.includes(progCol.getBackColName());
        var sortIcon = '<i class="sortIcon"></i>'; // placeholder

        if (progCol.hasMinimized()) {
            width = 15;
            columnClass += " userHidden";
        }

        if (indexed) {
            columnClass += " indexedColumn";
            if (!table.showIndexStyle()) {
                columnClass += " noIndexStyle";
            }

            var order = table.getOrdering();
            if (order === XcalarOrderingT.XcalarOrderingAscending) {
                sortIcon = '<i class="sortIcon icon ' +
                            'xi-arrowtail-up fa-12"></i>';
            } else if (order === XcalarOrderingT.XcalarOrderingDescending) {
                sortIcon = '<i class="sortIcon icon ' +
                            'xi-arrowtail-down fa-12"></i>';
            }
        } else if (progCol.isEmptyCol()) {
            columnClass += " newColumn";
        }

        // remove the beginning and end space
        columnClass = columnClass.trim();

        var disabledProp;
        var editableClass;

        if (colName === "") {
            disabledProp = "";
            editableClass = " editable";
        } else {
            disabledProp = "disabled";
            editableClass = "";
        }
        colName = colName.replace(/"/g, "&quot;");

        // var tooltip = indexed ? ' title="Indexed Column" data-toggle="tooltip" ' +
        //                  'data-placement="top" data-container="body"': "";
        // xx conflicts with tablename on hover;
        var tooltip = "";

        var prefix = progCol.getPrefix();
        var prefixColor = "";
        var prefixClass = "prefix";

        if (prefix === "") {
            prefix = CommonTxtTstr.Immediates;
            prefixClass += " immediate";
        } else {
            prefixColor = TPrefix.getColor(prefix);
        }

        var th =
            '<th class="th ' + columnClass + ' col' + colNum + '"' +
            ' style="width:' + width + 'px;">' +
                '<div class="header' + editableClass + ' ">' +
                    '<div class="dragArea">' +
                        '<div class="iconHelper" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body">' +
                        '</div>' +
                    '</div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="topHeader" data-color="' + prefixColor + '">' +
                        sortIcon +
                        '<div class="' + prefixClass + '">' +
                            prefix +
                        '</div>' +
                        '<div class="dotWrap">' +
                            '<div class="dot"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left">' +
                            '<div class="iconHidden"></div>' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<div class="flexWrap flex-mid' + editableClass +
                            '"' + tooltip + '>' +
                            '<input class="editableHead tooltipOverflow ' +
                                'col' + colNum + '"' +
                                ' type="text"  value="' + colName + '"' +
                                ' size="15" spellcheck="false" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" ' +
                                'data-original-title="' + colName + '" ' +
                                disabledProp + '/>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return (th);
    };

    TblManager.hideWorksheetTable = function(tableId) {
        removeTableDisplay(tableId);
    };

    TblManager.hideTable = function(tableId) {
        var tableName = gTables[tableId].tableName;
        var $table = $('#xcTable-' + tableId);
        var tableHeight = $table.height();
        var $tableWrap = $('#xcTableWrap-' + tableId);
        if ($tableWrap.hasClass("tableHidden")) {
            return;
        }
        $tableWrap.addClass('tableHidden');
        var $dropdown = $tableWrap.find('.tableTitle .dropdownBox');
        xcTooltip.changeText($dropdown, tableName);

        var bottomBorderHeight = 5;
        $table.height(tableHeight + bottomBorderHeight);
        TblFunc.matchHeaderSizes($table);
        TblFunc.moveFirstColumn();

        Log.add(SQLTStr.MinimizeTable, {
            "operation": SQLOps.HideTable,
            "tableName": tableName,
            "tableId": tableId
        });
    };

    TblManager.unHideTable = function(tableId) {
        var $tableWrap = $('#xcTableWrap-' + tableId);
        if (!$tableWrap.hasClass("tableHidden")) {
            return;
        }
        $tableWrap.removeClass('tableHidden');
        var $dropdown = $tableWrap.find('.tableTitle .dropdownBox');
        xcTooltip.changeText($dropdown, TooltipTStr.ViewTableOptions);
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);

        var $table = $('#xcTable-' + tableId);
        $table.height('auto');
        TblFunc.matchHeaderSizes($table);
        TblFunc.moveFirstColumn();

        Log.add(SQLTStr.MaximizeTable, {
            "operation": SQLOps.UnhideTable,
            "tableName": gTables[tableId].tableName,
            "tableId": tableId
        });
    };

    TblManager.sortColumns = function(tableId, sortKey, direction) {
        var table = gTables[tableId];
        var oldOrder = []; // to save the old column order
        var order = (direction === "reverse") ? ColumnSortOrder.descending :
                                                ColumnSortOrder.ascending;
        var numCols = table.getNumCols();
        var dataCol = null;

        if (table.getCol(numCols).isDATACol()) {
            dataCol = table.removeCol(numCols);
            numCols--;
        }

        var colNumMap = {};
        var thLists = {};
        var noNameCols = [];
        var $table = $("#xcTable-" + tableId);
        // record original position of each column
        for (var colNum = 1; colNum <= numCols; colNum++) {
            var progCol = table.getCol(colNum);
            var colName = progCol.getFrontColName(true);

            // can't use map for columns with no name because of duplicates
            if (colName === "") {
                noNameCols.push(colNum);
            } else {
                colNumMap[colName] = colNum;
            }

            var $th = $table.find("th.col" + colNum);
            thLists[colNum] = $th;
        }

        table.sortCols(sortKey, order);

        var $rows = $table.find('tbody tr');
        var numRows = $rows.length;
        var noNameIndex = 0;
        // loop through each column
        for (var i = 0; i < numCols; i++) {
            var newColNum = i + 1;
            var newProgCol = table.getCol(newColNum);
            var newColName = newProgCol.getFrontColName(true);
            var oldColNum;
            if (newColName === "") {
                oldColNum = noNameCols[noNameIndex];
                noNameIndex++;
            } else {
                oldColNum = colNumMap[newColName];
            }
            var $thToMove = thLists[oldColNum];

            $thToMove.removeClass("col" + oldColNum)
                    .addClass("col" + newColNum)
                .find(".col" + oldColNum)
                .removeClass("col" + oldColNum)
                .addClass("col" + newColNum);

            // after move th, the position is different from the oldColNum
            var oldPos = $thToMove.index();
            $table.find("th").eq(i).after($thToMove);
            // loop through each row and order each td
            for (var j = 0; j < numRows; j++) {
                var $row = $rows.eq(j);
                var $tdToMove = $row.find("td").eq(oldPos);
                $tdToMove.removeClass("col" + oldColNum)
                         .addClass("col" + newColNum);
                $row.find("td").eq(i).after($tdToMove);
            }

            oldOrder.push(oldColNum - 1);
        }

        if (dataCol != null) {
            // if data col was removed from sort, put it back
            table.addCol(numCols + 1, dataCol);
            oldOrder.push(numCols);
        }

        TableList.updateTableInfo(tableId);

        Log.add(SQLTStr.SortTableCols, {
            "operation": SQLOps.SortTableCols,
            "tableName": table.tableName,
            "tableId": tableId,
            "sortKey": sortKey,
            "direction": direction,
            "originalOrder": oldOrder,
            "htmlExclude": ['originalOrder']
        });
    };

    // provide an order ex. [2,0,3,1];
    TblManager.orderAllColumns = function(tableId, order) {
        var progCols = gTables[tableId].tableCols;
        var numCols = order.length;
        var index;
        var newCols = [];
        var indices = [];

        var $table = $('#xcTable-' + tableId);
        var $ths = $table.find('th');
        var thHtml = $ths.eq(0)[0].outerHTML;
        var tdHtml = "";
        // var numRows = $table.find('tbody tr').length;
        var $th;

        // column headers
        for (var i = 0; i < numCols; i++) {
            index = order.indexOf(i);
            indices.push(index);
            newCols.push(progCols[index]);
            $th = $ths.eq(index + 1);
            $th.removeClass('col' + (index + 1));
            $th.addClass('col' + (i + 1));
            $th.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                .addClass('col' + (i + 1));
            thHtml += $th[0].outerHTML;

        }

        // column rows and tds
        var $tds;
        var $td;
        $table.find('tbody tr').each(function(rowNum) {
            tdHtml += '<tr class="row' + rowNum + '">';
            $tds = $(this).find('td');
            tdHtml += $tds.eq(0)[0].outerHTML;
            for (var i = 0; i < numCols; i++) {
                index = indices[i];
                $td = $tds.eq(index + 1);
                $td.removeClass('col' + (index + 1));
                $td.addClass('col' + (i + 1));
                $td.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                   .addClass('col' + (i + 1));
                tdHtml += $td[0].outerHTML;
            }
            tdHtml += '</tr>';
        });

        // update everything
        gTables[tableId].tableCols = newCols;
        $table.find('thead tr').html(thHtml);
        $table.find('tbody').html(tdHtml);

        TableList.updateTableInfo(tableId);
        addRowListeners($table.find('tbody'));
    };

    TblManager.resizeColumns = function(tableId, resizeTo, columnNums) {
        var table = gTables[tableId];
        var columns = [];
        var colNums = [];
        var allCols = false;
        if (columnNums !== undefined) {
            if (typeof columnNums !== "object") {
                colNums.push(columnNums);
            } else {
                colNums = columnNums;
            }
            colNums.forEach(function(colNum) {
                columns.push(table.getCol(colNum));
            });
        } else {
            allCols = true;
            columns = table.tableCols;
            colNums = columns.map(function(col, index) {
                return index + 1;
            });
        }

        var $th;
        var $table = $('#xcTable-' + tableId);
        var oldColumnWidths = [];
        var newWidths = [];
        var oldSizedTo = [];
        var wasHidden = [];

        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            $th = $table.find('th.col' + colNums[i]);
            columns[i].maximize();
            oldColumnWidths.push(columns[i].width);
            oldSizedTo.push(columns[i].sizedTo);
            columns[i].sizedTo = resizeTo;
            wasHidden.push($th.hasClass("userHidden"));
            var $tds = $table.find("td.col" + colNums[i]);
            $th.removeClass("userHidden");
            $tds.removeClass("userHidden");

            newWidths.push(TblFunc.autosizeCol($th, {
                "dblClick": true,
                "minWidth": 17,
                "unlimitedWidth": false,
                "includeHeader": (resizeTo === "header" || resizeTo === "all"),
                "fitAll": resizeTo === "all",
                "multipleCols": true
            }));
        }

        TblFunc.matchHeaderSizes($table);

        Log.add(SQLTStr.ResizeCols, {
            "operation": SQLOps.ResizeTableCols,
            "tableName": table.tableName,
            "tableId": tableId,
            "sizeTo": resizeTo,
            "columnNums": colNums,
            "oldColumnWidths": oldColumnWidths,
            "newColumnWidths": newWidths,
            "oldSizedTo": oldSizedTo,
            "wasHidden": wasHidden,
            "allCols": allCols,
            "htmlExclude": ["columnNums", "oldColumnWidths", "newColumnWidths",
                            "oldSizedTo", "wasHidden", "allCols"]
        });
    };

    // only used for undo / redos sizeToHeader/content/all
    TblManager.resizeColsToWidth = function(tableId, colNums, widths, sizeTo,
                                            wasHidden) {
        var $table = $('#xcTable-' + tableId);
        $table.find('.userHidden').removeClass('userHidden');
        var progCols = gTables[tableId].tableCols;
        var numCols = colNums.length;
        var colNum;
        for (var i = 0; i < numCols; i++) {
            colNum = colNums[i];
            if (!widths[i]) {
                console.warn('not found');
            }
            var $th = $table.find('th.col' + colNum);
            var width = widths[i];
            if (wasHidden && wasHidden[i]) {
                $th.addClass("userHidden");
                $table.find("td.col" + colNum).addClass("userHidden");
                progCols[colNum - 1].minimize();
                width = gHiddenColumnWidth;
            } else {
                progCols[colNum - 1].maximize();
            }
            $th.outerWidth(width);
            progCols[colNum - 1].width = widths[i];
            progCols[colNum - 1].sizedTo = sizeTo[i];
        }
        TblFunc.matchHeaderSizes($table);
    };

    TblManager.adjustRowFetchQuantity = function() {
        // cannot calculate mainFrame height directly because sometimes
        // it may not be visible
        var mainFrameTop = $('.mainPanel.active').find('.topBar')[0]
                                .getBoundingClientRect().bottom;
        var mainFrameBottom = $('#statusBar')[0].getBoundingClientRect().top;
        var mainFrameHeight = mainFrameBottom - mainFrameTop;
        var tableAreaHeight = mainFrameHeight - gFirstRowPositionTop;
        var maxVisibleRows = Math.ceil(tableAreaHeight / gRescol.minCellHeight);
        var buffer = 5;
        var rowsNeeded = maxVisibleRows + gNumEntriesPerPage + buffer;
        gMaxEntriesPerPage = Math.max(rowsNeeded, gMinRowsPerScreen);
        gMaxEntriesPerPage = Math.ceil(gMaxEntriesPerPage / 10) * 10;
        return gMaxEntriesPerPage;
    };

    TblManager.bookmarkRow = function(rowNum, tableId) {
        var $table = $('#xcTable-' + tableId);
        var $td = $table.find('.row' + rowNum + ' .col0');
        var table = gTables[tableId];

        $td.addClass('rowBookmarked');
        xcTooltip.changeText($td.find('.idSpan'), TooltipTStr.Bookmarked);
        xcTooltip.hideAll();
        RowScroller.addBookmark(rowNum, tableId);
        table.addBookmark(rowNum);

        Log.add(SQLTStr.BookmarkRow, {
            "operation": SQLOps.BookmarkRow,
            "tableId": tableId,
            "tableName": table.getName(),
            "rowNum": rowNum
        });
    };

    TblManager.unbookmarkRow = function(rowNum, tableId) {
        var $table = $('#xcTable-' + tableId);
        var $td = $table.find('.row' + rowNum + ' .col0');
        var table = gTables[tableId];

        $td.removeClass('rowBookmarked');
        xcTooltip.changeText($td.find('.idSpan'), TooltipTStr.Bookmark);
        xcTooltip.hideAll();
        RowScroller.removeBookmark(rowNum, tableId);
        table.removeBookmark(rowNum);

        Log.add(SQLTStr.RemoveBookmark, {
            "operation": SQLOps.RemoveBookmark,
            "tableId": tableId,
            "tableName": table.getName(),
            "rowNum": rowNum
        });
    };

    /*
     * options:
     *  jsonModal: if it's jsonModal
     *  isShift: if press shiftKey or not
     */
    TblManager.highlightCell = function($td, tableId, rowNum, colNum, options) {
        // draws a new div positioned where the cell is, intead of highlighting
        // the actual cell
        options = options || {};
        if (options.jsonModal &&
            $td.find('.jsonModalHighlightBox').length !== 0)
        {
            $td.find('.jsonModalHighlightBox').data().count++;
            return;
        }

        var divClass;
        if (options.jsonModal) {
            divClass = "jsonModalHighlightBox";
        } else {
            divClass = "highlightBox " + tableId;
        }

        if (options.isShift) {
            divClass += " shiftKey";
        } else {
            // this can be used as a base cell when user press shift
            // to select multi rows
            divClass += " noShiftKey";
        }

        var border = 5;
        var width = $td.outerWidth() - border;
        var height = $td.outerHeight();
        var styling = 'width:' + width + 'px;' +
                      'height:' + height + 'px;';
        // can't rely on width/height 100% because of IE

        var $highlightBox = $('<div class="' + divClass + '" ' +
                                'style="' + styling + '" data-count="1">' +
                            '</div>');

        $highlightBox.data("rowNum", rowNum)
                     .data("colNum", colNum)
                     .data("tableId", tableId);

        $td.append($highlightBox);
        $td.addClass("highlightedCell");
        if (!options.jsonModal) {
            var cells = gTables[tableId].highlightedCells;
            if (cells[rowNum] == null) {
                cells[rowNum] = {};
            }
            var cellInfo = {
                colNum: colNum,
                rowNum: rowNum,
                isUndefined: $td.find(".undefined").length > 0,
                val: $td.find(".originalData").text(),
                isNull: $td.find(".null").length > 0,
                isBlank: $td.find(".blank").length > 0
            };
            var $header = $("#xcTable-" + tableId)
                                        .find("th.col" + colNum + " .header");
            if ($header.hasClass("type-mixed")) {
                cellInfo.isMixed = true;
                cellInfo.type = ColManager.getCellType($td, tableId);
            }

            cells[rowNum][colNum] = cellInfo;
        }
    };

    TblManager.rehighlightCells = function(tableId) {
        var table = gTables[tableId];
        var $table = $("#xcTable-" + tableId);
        var lastRow = table.currentRowNumber - 1;
        var firstRow = lastRow - ($table.find("tbody tr").length - 1);
        for (var row in table.highlightedCells) {
            row = parseInt(row);
            if (row <= lastRow && row >= firstRow) {
                for (var colNum in table.highlightedCells[row]) {
                    var $td = $table.find(".row" + row + " .col" + colNum);
                    if (!$td.hasClass("highlightedCell")) {
                        TblManager.highlightCell($td, tableId, row, colNum);
                    }
                }
            }
        }
    };

    // if no tableId is passed in, will unhighlight all cells in any table
    TblManager.unHighlightCells = function(tableId) {
        if (tableId != null) {
            $("#xcTable-" + tableId).find(".highlightedCell")
                                    .removeClass(".highlightedCell")
                                    .find(".highlightBox").remove();
            gTables[tableId].highlightedCells = {};
            return;
        }

        var $highlightBoxs = $(".highlightBox");
        if (!$highlightBoxs.length) {
            if (gTables[gActiveTableId] &&
                !$.isEmptyObject(gTables[gActiveTableId].highlightedCells)) {
                // some highlight boxes may not be visible if scrolled
                gTables[gActiveTableId].highlightedCells = {};
            } else {
                return;
            }
        }
        var tIds = {};

        $highlightBoxs.each(function() {
            tIds[$(this).data("tableId")] = true;
        });

        $(".highlightedCell").removeClass("highlightedCell");
        $highlightBoxs.remove();

        for (var tId in tIds) {
            gTables[tId].highlightedCells = {};
        }
    };

    function unHighlightCell($td) {
        if (!$td.hasClass("highlightedCell")) {
            return;
        }
        $td.removeClass("highlightedCell");
        $td.find(".highlightBox").remove();
        var tableId = xcHelper.parseTableId($td.closest(".xcTable"));
        var colNum = xcHelper.parseColNum($td);
        var rowNum = xcHelper.parseRowNum($td.closest("tr"));
        var cells = gTables[tableId].highlightedCells;

        if (cells[rowNum]) {
            delete cells[rowNum][colNum];
            if ($.isEmptyObject(cells[rowNum])) {
                delete cells[rowNum];
            }
        }
    }

    TblManager.highlightColumn = function($el, keepOthersSelected,
                                          modalHighlight) {
        var index = xcHelper.parseColNum($el);
        var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
        var $table = $('#xcTable-' + tableId);
        if (!keepOthersSelected) {
            $('.selectedCell').removeClass('selectedCell');
        }
        $table.find('th.col' + index).addClass('selectedCell');
        $table.find('td.col' + index).addClass('selectedCell');
        if (modalHighlight) {
            $table.find('th.col' + index).addClass("modalHighlighted");
            $table.find('td.col' + index).addClass("modalHighlighted");
        }
    };

    function unhighlightColumn($el) {
        var index = xcHelper.parseColNum($el);
        var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
        var $table = $('#xcTable-' + tableId);
        $table.find('th.col' + index).removeClass('selectedCell');
        $table.find('td.col' + index).removeClass('selectedCell');
    }

    TblManager.updateHeaderAndListInfo = function(tableId) {
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        var $table = $('#xcTable-' + tableId);
        TblFunc.matchHeaderSizes($table);
    };

    TblManager.alignTableEls = function($tableWrap) {
        TblFunc.moveTableTitles($tableWrap);
        TblFunc.moveTableDropdownBoxes();
        TblFunc.moveFirstColumn();
    };

    TblManager.addWaitingCursor = function(tableId) {
        $('#xcTableWrap-' + tableId).append('<div class="tableCoverWaiting"></div>');
    };

    TblManager.removeWaitingCursor = function(tableId) {
        $('#xcTableWrap-' + tableId).find('.tableCoverWaiting').remove();
    };

    TblManager.freeAllResultSets = function() {
        // var promises = [];
        // Note from Cheng: use promise is not reliable to send all reqeust to backend
        for (var tableId in gTables) {
            gTables[tableId].freeResultset();
        }
    };

    TblManager.freeAllResultSetsSync = function() {
        var deferred = jQuery.Deferred();
        var promises = [];

        // if table does not exist and free the resultSetId, it crash the backend

        // check backend table name to see if it exists
        xcHelper.getBackTableSet()
        .then(function(backTableSet) {
            for (var tableId in gTables) {
                var table = gTables[tableId];
                var tableName = table.getName();

                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.error("Table not in backend!");
                    continue;
                }

                promises.push(table.freeResultset.bind(table));
            }
            return PromiseHelper.chain(promises);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // returns {
    //    hasSuccess:boolean,
    //    fails: [{tables: "tableName", error: "error"}]
    //    successTables: []
    // }
    function tableDeleteFailHandler(results, tables, noDeleteTables) {
        var hasSuccess = false;
        var fails = [];
        var numActualFails = 0; // as opposed to noDeleteTables
        var errorMsg = "";
        var tablesMsg = "";
        var noDeleteMsg = "";
        var failedTablesStr = "";
        var successTables = [];

        for (var i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: tables[i], error: results[i].error});
                failedTablesStr += tables[i] + ", ";
                numActualFails++;
            } else {
                hasSuccess = true;
                successTables.push(tables[i]);
            }
        }

        if (noDeleteTables.length) {
            var tableName;
            noDeleteTables.forEach(function(tIdOrName) {
                if (gTables[tIdOrName]) {
                    tableName = gTables[tIdOrName].getName();
                } else {
                    tableName = tIdOrName;
                }
                noDeleteMsg += tableName + ", ";
                fails.push({
                    "tables": tableName,
                    "error": ErrTStr.CannotDropLocked
                });
            });
            // remove last comma
            noDeleteMsg = noDeleteMsg.substr(0, noDeleteMsg.length - 2);
            if (noDeleteTables.length === 1) {
                noDeleteMsg = "Table " + noDeleteMsg + " was locked.\n";
            } else {
                noDeleteMsg = "Tables " + noDeleteMsg + " were locked.\n";
            }
        }

        var numFails = fails.length + noDeleteTables.length;
        if (numFails) {
            // remove last comma
            failedTablesStr = failedTablesStr.substr(0,
                              failedTablesStr.length - 2);
            if (numActualFails === 1) {
                tablesMsg += xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTablesStr
                });
            } else if (numActualFails > 1) {
                tablesMsg += ErrTStr.TablesNotDeleted + " " + failedTablesStr;
            }

            if (hasSuccess || noDeleteTables.length) {
                if (!numActualFails) {
                    errorMsg = noDeleteMsg;
                } else {
                    errorMsg = noDeleteMsg + fails[0].error + ". " + tablesMsg;
                }
            } else {
                errorMsg = fails[0].error + ". " + ErrTStr.NoTablesDeleted;
            }
        }

        return {
            "hasSuccess": hasSuccess,
            "fails": fails,
            "errorMsg": errorMsg,
            "successTables": successTables
        };
    }

    /**
        This function sets up new tables to be added to the display and
        removes old tables.

        newTableName is an string of tablename to be added
        tablesToReplace is an array of old tablenames to be replaced
        tablesToRemove is an array of tableIds to be removed later

        Possible Options:
        -afterStartup: boolean to indicate if these tables are added after
                      page load
        -selectCol: number or array of numbers, column to be selected once new
                    table is ready
        -isUndo: boolean, default is false. If true, we are adding this table
                through an undo,
        -replacingDest: string, where to send old tables that are being replaced
        -ws: string, worksheet id of where new table will go
        -txId: string, used for tagging dag operations
    */
    function addTable(newTableName, tablesToReplace, tablesToRemove, options) {
        var deferred = jQuery.Deferred();
        var newTableId = xcHelper.getTableId(newTableName);
        var oldId = xcHelper.getTableId(tablesToReplace[0]);
        options = options || {};

        tagOldTables(tablesToRemove);

        var parallelOptions = {
            afterStartup: options.afterStartup,
            selectCol: options.selectCol,
            wsId: options.ws,
            position: options.position,
            txId: options.txId
        };
        TblManager.parallelConstruct(newTableId, tablesToReplace[0],
                                    parallelOptions)
        .then(function() {
            gTables[newTableId].beActive();
            removeOldTables(tablesToRemove);

            var wasTableReplaced = false;

            if (options.isUndo && options.position != null) {
                WSManager.replaceTable(newTableId, null, null, {
                    position: options.position
                });
            } else if (tablesToReplace[0] == null) {
                WSManager.replaceTable(newTableId);
            } else {
                var tablePosition = WSManager.getTablePosition(oldId);

                if (tablePosition > -1) {
                    WSManager.replaceTable(newTableId, oldId, tablesToRemove, {
                        removeToDest: options.replacingDest
                    });
                    wasTableReplaced = true;
                } else {
                    WSManager.replaceTable(newTableId);
                }
            }

            var $existingTableList = $('#activeTablesList').find('[data-id="' +
                                              newTableId + '"]');
            if ($existingTableList.length) {
                $existingTableList.closest('.tableInfo')
                                  .removeClass('hiddenWS');
                xcTooltip.remove($existingTableList.closest('.tableInfo'));
            } else {
                TableList.addTables([gTables[newTableId]], IsActive.Active);
            }
            // in case table showed up in temp list during its formation
            TableList.removeTable(newTableName, TableType.Orphan);

            if (tablesToRemove) {
                var noFocusWS = tablesToRemove.length > 1;
                for (var i = 0; i < tablesToRemove.length; i++) {
                    if (wasTableReplaced && tablesToRemove[i] !== oldId) {
                        WSManager.removeTable(tablesToRemove[i], true);
                    }
                    if (gTables[tablesToRemove[i]].status === TableType.Active) {
                        if (options.from === "noSheet") {
                            TblManager.sendTableToOrphaned(tablesToRemove[i], {
                                force: true
                            });
                        } else {
                            if (options.replacingDest === TableType.Undone) {
                                TblManager.sendTableToUndone(tablesToRemove[i], {
                                    "noFocusWS": noFocusWS,
                                    "force": true
                                });
                            } else {
                                TblManager.sendTableToOrphaned(tablesToRemove[i], {
                                    "noFocusWS": noFocusWS,
                                    "force": true
                                });
                            }
                        }
                    }
                }
            }
            if (tablesToReplace.length === 1) {
                var oldTableId = xcHelper.getTableId(tablesToReplace[0]);
                animateTableId(newTableId, oldTableId);
            }
            FnBar.updateColNameCache();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function animateTableId(tableId, oldId) {
        var deferred = jQuery.Deferred();
        var $hashName = $("#xcTheadWrap-" + tableId).find(".hashName");
        var oldText = $hashName.text();
        var hashPart = "#" + tableId.substring(0, 2); // first 2 chars
        var sCntStr = oldId.substring(2);
        var eCntStr = tableId.substring(2);
        var charCnts = splitCntChars(Array.from(sCntStr), Array.from(eCntStr));

        $hashName.html(getHashAnimHtml(hashPart, charCnts));
        animateCharCnt($hashName)
        .then(function() {
            $hashName.text(oldText);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();

        function splitCntChars(sChars, eChars) {
            var eLen = eChars.length;
            var len = Math.max(sChars.length, eChars.length);
            // padding empty string to chars to the end
            sChars = sChars.concat(new Array(len - sChars.length).fill(""));
            eChars = eChars.concat(new Array(len - eChars.length).fill(""));

            var chars = sChars.map(function(sCh, i) {
                var eCh = eChars[i];
                var sNum = Number(sCh);
                var eNum = Number(eCh);
                var inc = (eNum > sNum) ? 1 : -1;
                var res = [sCh];

                while (sNum !== eNum) {
                    sNum += inc;
                    if (sNum === eNum) {
                        res.push(eCh);
                    } else {
                        res.push(sNum + ""); // change to string
                    }
                }
                return res;
            });
            // chars need to be the same len as eChars
            chars.splice(eLen);
            return chars;
        }

        function getHashAnimHtml(hashPart, charCnts) {
            return '<div class="hashPart">' + hashPart + '</div>' +
                    '<div class="animWrap">' +
                        '<div class="topPadding"></div>' +
                        charCnts.map(function(chartCnt) {
                            return '<div class="animPart">' +
                                        chartCnt.map(function(ch) {
                                            return '<div class="num">' +
                                                        ch +
                                                    '</div>';
                                        }).join("") +
                                    '</div>';
                        }).join("") +
                        '<div class="bottomPadding"></div>' +
                    '</div>';
        }

        function animateCharCnt($section) {
            var h = $section.height(); // 20px
            var defs = [];

            $section.find(".animPart").each(function(i) {
                var $part = $(this);
                var $nums = $part.find(".num");
                var animTime = 500;
                var delayFactor = 100;

                if ($nums.length > 1) {
                    var top = parseInt($part.css("top")) -
                              h * ($nums.length - 1);
                    var def = $part.animate({
                        "top": top + "px"
                    }, animTime)
                    .delay(delayFactor * i)
                    .promise();

                    defs.push(def);
                }
            });

            return PromiseHelper.when.apply(this, defs);
        }
    }

    function setTableMeta(tableName, tableCols) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var table;

        if (!gTables.hasOwnProperty(tableId)) {
            if (!tableCols || tableCols.length === 0) {
                 // at last have data col
                tableCols = [ColManager.newDATACol()];
            }

            table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "tableCols": tableCols,
                "status": TableType.Orphan
            });
        } else {
            table = gTables[tableId];
        }

        table.getMetaAndResultSet()
        .then(function() {
            // this is for the tableId not in gTables case
            gTables[tableId] = table;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function removeTableDisplay(tableId) {
        $("#xcTableWrap-" + tableId).remove();
        Dag.destruct(tableId);
        if (gActiveTableId === tableId) {
            gActiveTableId = null;
            RowScroller.empty();
        }
    }

    function tagOldTables(tablesToRemove) {
        if (!tablesToRemove) {
            return;
        }
        for (var i = 0; i < tablesToRemove.length; i++) {
            $("#xcTableWrap-" + tablesToRemove[i]).addClass("tableToRemove");
            $("#dagrap-" + tablesToRemove[i]).addClass("dagWrapToRemove");
        }
    }

    function removeOldTables(tablesToRemove) {
        if (!tablesToRemove) {
            return;
        }
        for (var i = 0; i < tablesToRemove.length; i++) {
            $("#xcTableWrap-" + tablesToRemove[i]).remove();
            $("#dagWrap-" + tablesToRemove[i]).remove();
        }
    }

    function scrollAndFocusTable(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        xcHelper.centerFocusedTable(tableId, true)
        .then(function() {
            RowScroller.genFirstVisibleRowNum();
        });
    }

    function createDag(tableId, tableToReplace, options) {
        var deferred = jQuery.Deferred();
        var promise;
        if (options.txId != null) {
            promise = DagFunction.tagNodes(options.txId);
        } else {
            promise = PromiseHelper.resolve();
        }

        PromiseHelper.alwaysResolve(promise)
        .then(function() {
            return Dag.construct(tableId, tableToReplace, options);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }


    /*
        Start the process of building table
        Possible Options:
        selectCol: number or array of numbers. column to be highlighted when
                    table is ready
        wsId
    */
    function startBuildTable(tableId, tableToReplace, options) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var $table;
        options = options || {};
        var initialTableBuilt = false;

        RowManager.getFirstPage(tableId)
        .then(function(jsonData) {
            // var oldId = xcHelper.getTableId(tableToReplace);
            table.currentRowNumber = jsonData.length;
            if (table.resultSetCount === 0) {
                options.isEmpty = true;
            }

            generateTableShell(tableId, tableToReplace, options);
            buildInitialTable(tableId, jsonData, options);
            initialTableBuilt = true;

            $table = $('#xcTable-' + tableId);
            var requiredNumRows = Math.min(gMaxEntriesPerPage,
                                              table.resultSetCount);
            var numRowsStillNeeded = requiredNumRows -
                                     $table.find('tbody tr').length;
            if (numRowsStillNeeded > 0) {
                var $firstRow = $table.find('tbody tr:first');
                var topRowNum;
                if (!$firstRow.length) {
                    // if no rows were built on initial fetch
                    topRowNum = 0;
                } else {
                    xcHelper.parseRowNum($firstRow);
                }
                var targetRow = table.currentRowNumber + numRowsStillNeeded;
                var info = {
                    "targetRow": targetRow,
                    "lastRowToDisplay": targetRow,
                    "bulk": false,
                    "dontRemoveRows": true,
                    "tableId": tableId,
                    "currentFirstRow": topRowNum,
                };

                return RowManager.addRows(table.currentRowNumber,
                                            numRowsStillNeeded,
                                            RowDirection.Bottom, info);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (!initialTableBuilt) {
                console.error("startBuildTable fails!", error);
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        })
        .always(function() {
            TblManager.removeWaitingCursor(tableId);
        });
        return deferred.promise();
    }

    function afterBuild(tableId, options) {
        var $table = $('#xcTable-' + tableId);
        var table = gTables[tableId];
        var $lastRow = $table.find('tr:last');
        var lastRowNum = xcHelper.parseRowNum($lastRow);
        table.currentRowNumber = lastRowNum + 1;
        if (options.selectCol != null &&
            $('.xcTableWrap:not(.tableToRemove) th.selectedCell').length === 0)
        {
            if (typeof options.selectCol === "object") {
                $table.find('th.col' + options.selectCol[0] +
                            ' .flexContainer').mousedown();
                for (var i = 0; i < options.selectCol.length; i++) {
                    var $th = $table.find('th.col' + options.selectCol[i]);
                    TblManager.highlightColumn($th, true);
                }
            } else {
                $table.find('th.col' + options.selectCol +
                        ' .flexContainer').mousedown();
            }
        }

        autoSizeDataCol(tableId);
        // position sticky row column on visible tables
        TblFunc.matchHeaderSizes($table);
    }


    /*
        Possible Options:
        selectCol: number or array of numbers. column to be highlighted when
                    table is ready
    */
    function buildInitialTable(tableId, jsonData, options) {
        var numRows = jsonData.length;
        var startIndex = 0;
        var $table = $('#xcTable-' + tableId);
        RowScroller.add(tableId);
        options = options || {};

        if (options.isEmpty && numRows === 0) {
            console.log('no rows found, ERROR???');
            $table.addClass('emptyTable');
            jsonData = [""];
        }

        TblManager.pullRowsBulk(tableId, jsonData, startIndex);
        addTableListeners(tableId);
        createTableHeader(tableId);
        TblManager.addColListeners($table, tableId);

        var activeWS = WSManager.getActiveWS();
        var tableWS = WSManager.getWSFromTable(tableId);
        if ((activeWS === tableWS) &&
            $('.xcTableWrap.worksheet-' + activeWS).length &&
            $('.xcTableWrap.worksheet-' + activeWS).find('.tblTitleSelected')
                                                   .length === 0) {
            // if active worksheet and no other table is selected;
            TblFunc.focusTable(tableId, true);
        }

        // highlights new cell if no other cell is selected
        if (options.selectCol != null) {
            if ($('.xcTable th.selectedCell').length === 0) {
                var mousedown = fakeEvent.mousedown;
                mousedown.bypassModal = true;
                if (typeof options.selectCol === "object") {
                    $table.find('th.col' + options.selectCol[0] +
                            ' .flexContainer').trigger(mousedown);
                    for (var i = 0; i < options.selectCol.length; i++) {
                        var $th = $table
                        .find('th.col' + options.selectCol[i]);
                        TblManager.highlightColumn($th, true);
                    }
                } else {
                    $table.find('th.col' + (options.selectCol) +
                                ' .flexContainer').trigger(mousedown);
                }
            }
        }

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
    }

    function createTableHeader(tableId) {
        var $xcTheadWrap = $('<div id="xcTheadWrap-' + tableId +
                             '" class="xcTheadWrap dataTable" ' +
                             'data-id="' + tableId + '" ' +
                             'style="top:0px;"></div>');
        var lockIcon = "";
        if (gTables[tableId].isNoDelete()) {
            lockIcon = '<div class="lockIconWrap"><div class="lockIcon">' +
                        '</div></div>';
        }

        $('#xcTableWrap-' + tableId).prepend($xcTheadWrap);
        var tableTitleClass = "";
        if (!$('.xcTable:visible').length) {
            tableTitleClass = " tblTitleSelected";
            $('.dagWrap.selected').removeClass('selected').addClass('notSelected');
            $('#dagWrap-' + tableId).removeClass('notSelected')
                                    .addClass('selected');
        }

        var html = '<div class="tableTitle ' + tableTitleClass + '">' +
                        '<div class="tableGrab"></div>' +
                        '<div class="labelWrap">' +
                            '<label class="text" ></label>' +
                        '</div>' +
                        '<div class="dropdownBox" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'title="' + TooltipTStr.ViewTableOptions +
                            '" >' +
                            '<span class="innerBox"></span>' +
                        '</div>' +
                        lockIcon +
                    '</div>';

        $xcTheadWrap.prepend(html);

        //  title's Format is tablename  [cols]
        updateTableHeader(tableId);

        // Event Listener for table title
        $xcTheadWrap.on({
            // must use keypress to prevent contenteditable behavior
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    event.stopPropagation();
                    renameTableHelper($(this));
                }
            },
            "keydown": function(event) {
                if (event.which === keyCode.Space) {
                    // XXX temporary do not allow space
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, ".tableTitle .text");

        $xcTheadWrap.on({
            "focus": function() {
                var $tableName = $(this);
                updateTableNameWidth($tableName);
                TblFunc.moveTableTitles();
            },
            "blur": function() {
                var tableId = $xcTheadWrap.data("id");
                updateTableHeader(tableId);
                TblFunc.moveTableTitles();
            },
            "input": function() {
                var $tableName = $(this);
                updateTableNameWidth($tableName);
                TblFunc.moveTableTitles($tableName.closest('.xcTableWrap'));
            }
        }, ".tableTitle .tableName");

        // trigger open table menu on .dropdownBox click
        $xcTheadWrap.on('click', '.dropdownBox', function(event) {
            var classes = "tableMenu";
            var $dropdown = $(this);
            var $tableWrap = $dropdown.closest('.xcTableWrap');


            if ($tableWrap.hasClass('tableLocked')) {
                classes += " locked";
            }

            if ($tableWrap.hasClass('tableHidden')) {
                classes += " tableHidden";
            }

            var options = {"classes": classes};

            if (event.rightClick) {
                options.mouseCoors = {
                    "x": event.pageX,
                    "y": $tableWrap.offset().top + 30
                };
            }

            xcHelper.dropdownOpen($dropdown, $('#tableMenu'), options);
        });

        // trigger open table menu on .dropdownBox right-click
        $xcTheadWrap.on('contextmenu', '.dropdownBox', function(event) {
            $(event.target).trigger('click');
            event.preventDefault(); // prevent default browser's rightclick menu
        });

        // trigger open table menu on .tableGrab click
        $xcTheadWrap.on('click', '.tableGrab', function(event) {
            var $target = $(this);
            // .noDropdown gets added during table drag
            if (!$target.hasClass('noDropdown') &&
                !$target.closest('.columnPicker').length) {
                var click = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.siblings('.dropdownBox').trigger(click);
                event.preventDefault();
            }
        });

        // trigger open table menu on .tableGrab right-click
        $xcTheadWrap.on('contextmenu', '.tableGrab, label.text', function(event) {
            var click = $.Event("click");
            click.rightClick = true;
            click.pageX = event.pageX;
            $xcTheadWrap.find(".dropdownBox").trigger(click);
            event.preventDefault();
        });

        // Change from $xcTheadWrap.find('.tableGrab').mousedown...
        $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
            // Not Mouse down
            if (event.which !== 1) {
                return;
            }
            TblAnim.startTableDrag($(this).parent(), event);
        });

        var $table = $('#xcTable-' + tableId);
        $table.width(0);
    }

    function updateTableHeader(tableId) {
        var table = gTables[tableId];
        var fullTableName = table.getName();
        var numCols = table.getNumCols() - 1; // skip DATA col
        var $tHead = $("#xcTheadWrap-" + tableId).find(".tableTitle .text");

        $tHead.data("cols", numCols)
              .data("title", fullTableName);

        var tableName = xcHelper.getTableName(fullTableName);
        var nameHtml =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off" spellcheck="false">' +
            '<span class="hashName">#' +
                tableId +
            '</span>';

        var numColHtml = '<span class="colNumBracket" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + CommonTxtTstr.NumCol + '">' +
                        ' [' + numCols + ']</span>';

        $tHead.html(nameHtml + numColHtml);
        var $tableName = $tHead.find('.tableName');
        updateTableNameWidth($tableName);
    }

    function updateTableNameWidth($tableName) {
        var width = xcHelper.getTextWidth($tableName, $tableName.val());
        $tableName.width(width + 1);
    }

    function addTableListeners(tableId) {
        var $xcTableWrap = $("#xcTableWrap-" + tableId);
        var oldId = gActiveTableId;
        $xcTableWrap.on("mousedown", ".lockedTableIcon", function() {
            // handlers fire in the order that it's bound in.
            // So we are going to handle this, which removes the background
            // And the handler below will move the focus onto this table
            var txId = $(this).data("txid");
            if (txId == null) {
                return;
            }
            xcTooltip.refresh($(".lockedTableIcon .iconPart"), 100);
            QueryManager.cancelQuery(txId);
            xcTooltip.hideAll();
        });

        $xcTableWrap.mousedown(function() {
            if (gActiveTableId === tableId ||
                $xcTableWrap.hasClass("tableLocked")) {
                return;
            } else {
                var focusDag;
                if (oldId !== tableId) {
                    focusDag = true;
                }
                TblFunc.focusTable(tableId, focusDag);
            }
        }).scroll(function() {
            $(this).scrollLeft(0); // prevent scrolling when colmenu is open
            $(this).scrollTop(0); // prevent scrolling when colmenu is open
        });

        var $rowGrab = $("#xcTbodyWrap-" + tableId).find(".rowGrab.last");
        $rowGrab.mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });
    }

    function addRowListeners($trs) {
        var $jsonEle = $trs.find(".jsonElement");
        $jsonEle.on("click", ".pop", showJSONModal);

        $trs.find(".rowGrab").mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });

        // bookmark (disabled)
        // $trs.find('.idSpan').click(function() {
        //     var tableId = xcHelper.parseTableId($(this).closest('table'));
        //     var table = gTables[tableId];
        //     if (table.resultSetCount === 0) {
        //         // no rows to bookmark
        //         return;
        //     }
        //     var rowNum = xcHelper.parseRowNum($(this).closest('tr'));
        //     if (table.bookmarks.indexOf(rowNum) < 0) {
        //         TblManager.bookmarkRow(rowNum, tableId);
        //     } else {
        //         TblManager.unbookmarkRow(rowNum, tableId);
        //     }
        // });

        function showJSONModal() {
            if ($('#mainFrame').hasClass('modalOpen') &&
                !$(this).closest('.xcTableWrap').hasClass('jsonModalOpen'))
            {
                return;
            }
            JSONModal.show($(this).closest(".jsonElement"));
        }
    }

    TblManager.addColListeners = function($table, tableId) {
        var $thead = $table.find('thead tr');
        var $tbody = $table.find("tbody");
        var lastSelectedCell;

        gTables[tableId].highlightedCells = {};

        // listeners on thead
        $thead.on("mousedown", ".flexContainer, .dragArea", function(event) {
            var $el = $(this);
            if ($("#container").hasClass("columnPicker") ||
                $("#container").hasClass("dfEditState") ||
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
                return;
            } else if ($el.closest('.dataCol').length !== 0) {
                return;
            }

            var $editableHead;
            if ($el.is('.dragArea')) {
                $editableHead = $el.closest('.header').find('.editableHead');
            } else {
                $editableHead = $el.find('.editableHead');
            }

            var colNum = xcHelper.parseColNum($editableHead);
            FnBar.focusOnCol($editableHead, tableId, colNum);

            var $target = $(event.target);
            var notDropDown = $target.closest('.dropdownBox').length === 0 &&
                                $target.closest(".dotWrap").length === 0;
            if ($table.find('.selectedCell').length === 0) {
                $('.selectedCell').removeClass('selectedCell');
                lastSelectedCell = $editableHead;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey) {
                 // do not unhighlight column if right-clicking
                if ($el.closest('.selectedCell').length > 0 &&
                    event.which !== 3) {
                    if (notDropDown) {
                        unhighlightColumn($editableHead);
                        FnBar.clear();
                        return;
                    }
                } else {
                    TblManager.highlightColumn($editableHead, true);
                }
            } else if (event.shiftKey) {
                if (lastSelectedCell && lastSelectedCell.length > 0) {
                    var preColNum = xcHelper.parseColNum(lastSelectedCell);
                    var lowNum = Math.min(preColNum, colNum);
                    var highNum = Math.max(preColNum, colNum);
                    var $th;
                    var $col;
                    var select = !$el.closest('th').hasClass('selectedCell');

                    // do not unhighlight column if right-clicking
                    if (!(event.which === 3 && !select)) {
                        for (var i = lowNum; i <= highNum; i++) {
                            $th = $table.find('th.col' + i);
                            $col = $th.find('.editableHead');
                            if ($col.length === 0) {
                                continue;
                            }

                            if (select) {
                                TblManager.highlightColumn($col, true);
                            } else if (notDropDown) {
                                unhighlightColumn($col);
                            }
                        }
                        if ($table.find('.selectedCell').length === 0) {
                            FnBar.clear();
                        }
                    }
                }
            } else {
                if ($el.closest('.selectedCell').length > 0) {
                    // when not on dropdown and is left click
                    if (notDropDown && event.which === 1) {
                        TblManager.highlightColumn($editableHead, false);
                        lastSelectedCell = null;
                    } else {
                        TblManager.highlightColumn($editableHead, true);
                    }
                } else {
                    TblManager.highlightColumn($editableHead, false);
                    lastSelectedCell = null;
                }
            }

            xcHelper.removeSelectionRange();
            lastSelectedCell = $editableHead;
        });

        $thead.contextmenu(function(event) {
            var $evTarget = $(event.target);
            var $header = $evTarget.closest('.header');
            if ($header.length) {
                var $dotWrap = $evTarget.closest('.dotWrap');
                if ($dotWrap.length) {
                    dotWrapClick($dotWrap);
                } else {
                    var $target = $header.find('.dropdownBox');
                    var click = $.Event("click");
                    click.rightClick = true;
                    click.pageX = event.pageX;
                    $target.trigger(click);
                }
                event.preventDefault();
            }
        });

        $thead.find(".rowNumHead").mousedown(function() {
            if ($thead.closest('.modalOpen').length ||
                $("#container").hasClass('columnPicker')) {
                return;
            }
            $thead.find('.editableHead').each(function() {
                TblManager.highlightColumn($(this), true);
            });
        });

        $thead.on("mousedown", ".topHeader .dotWrap", function() {
            var $th = $(this).closest('th');
            var colNum = xcHelper.parseColNum($th);
            FnBar.focusOnCol($th, tableId, colNum);
            TblManager.highlightColumn($th, false);
            lastSelectedCell = $th;
        });

        $thead.on("click", ".topHeader .dotWrap", function() {
            dotWrapClick($(this));
        });

        $thead.on("click", ".dropdownBox", function(event) {
            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
            var options = {};
            var $el = $(this);
            var $th = $el.closest("th");
            var isRightClick = event.rightClick;

            var colNum = xcHelper.parseColNum($th);
            var table = gTables[tableId];
            var progCol = table.tableCols[colNum - 1];
            var colType = progCol.getType();
            var isNewCol = false;

            xcTooltip.hideAll();
            resetColMenuInputs($el);

            options.colNum = colNum;
            options.classes = $el.closest('.header').attr('class');

            if ($th.hasClass('indexedColumn')) {
                options.classes += " type-indexed";
                var order = table.getOrdering();
                if (order === XcalarOrderingT.XcalarOrderingAscending) {
                    options.classes += " sortedAsc";
                } else if (order === XcalarOrderingT.XcalarOrderingDescending) {
                    options.classes += " sortedDesc";
                }
            }

            if ($th.hasClass('dataCol')) {
                $('.selectedCell').removeClass('selectedCell');
                FnBar.clear();
            }

            if ($th.hasClass('newColumn') ||
                options.classes.indexOf('type') === -1) {
                options.classes += " type-newColumn";
                isNewCol = true;
                if ($el.closest('.flexWrap').siblings('.editable').length) {
                    options.classes += " type-untitled";
                }
            }
            if ($th.hasClass("userHidden")) {
                // column is hidden
                options.classes += " type-hidden";
            }

            if ($el.closest('.xcTable').hasClass('emptyTable')) {
                options.classes += " type-emptyTable";
            }

            options.classes += " textAlign" + progCol.textAlign;
            if (progCol.format) {
                options.classes += " format-" + progCol.format;
            }

            options.classes += " sizedTo" + progCol.sizedTo;

            if ($('th.selectedCell').length > 1) {
                options.classes += " type-multiColumn";
                options.multipleColNums = [];
                var tableCols = table.tableCols;
                var types = {};
                var tempType = "type-" + colType;
                types[tempType] = true;

                var tempColNum;
                var hiddenDetected = false;
                $('th.selectedCell').each(function() {
                    tempColNum = xcHelper.parseColNum($(this));
                    options.multipleColNums.push(tempColNum);
                    if (!hiddenDetected && $(this).hasClass("userHidden")) {
                        hiddenDetected = true;
                        options.classes += " type-hidden";
                    }

                    tempType = "type-" + tableCols[tempColNum - 1].type;
                    if (!types.hasOwnProperty(tempType)) {
                        types[tempType] = true;
                        options.classes += " " + tempType;
                    }
                });
            } else {
                options.classes += " type-singleColumn";
            }

            if (isRightClick) {
                options.mouseCoors = {"x": event.pageX,
                                      "y": $el.offset().top + 34};
            } else {
                options.offsetX = 5;
            }
            setUnavailableClassesAndTips(colType, isNewCol);
            var $menu = $("#colMenu");
            xcHelper.dropdownOpen($el, $menu, options);
        });


        function setUnavailableClassesAndTips(colType, isNewCol) {
            var $menu = $("#colMenu");
            var $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                    ".join, .map, .operations, .profile, .corrAgg, " +
                    ".extensions, .changeDataType, .format, .roundToFixed");
            $lis.removeClass("unavailable");
            xcTooltip.remove($lis);
            if (colType === ColumnType.object || colType === ColumnType.array) {
                $lis = $menu.find(".groupby, .sort, .aggregate, .filter, .join, " +
                    ".map, .operations, .profile, .corrAgg, .extensions, " +
                    ".changeDataType, .format, .roundToFixed");
                $lis.addClass("unavailable");
                if (colType === ColumnType.object) {
                    xcTooltip.add($lis, {
                        title: ColTStr.NoOperateObject
                    });
                } else if (colType === ColumnType.array) {
                    xcTooltip.add($lis, {
                        title: ColTStr.NoOperateArray
                    });
                }
            } else if (isNewCol) {
                $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                    ".join, .operations, .profile, .corrAgg, .extensions, " +
                    ".changeDataType, .format, .roundToFixed, .project");
                $lis.addClass("unavailable");
                xcTooltip.add($lis, {
                    title: ErrTStr.InvalidOpNewColumn
                });
            } else if (colType === ColumnType.mixed) {
                $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                    ".join, .operations, .profile, .corrAgg,  " +
                    ".roundToFixed");
                $lis.addClass("unavailable");
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateGeneral
                });
            } else if ([ColumnType.integer, ColumnType.float, ColumnType.string,
                      ColumnType.boolean, ColumnType.number]
                      .indexOf(colType) === -1) {
                $lis.addClass("unavailable");
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateGeneral
                });
            }
        }

        $thead.on('mousedown', '.colGrab', function(event) {
            if (event.which !== 1) {
                return;
            }

            TblAnim.startColResize($(this), event);
        });

        $thead.on('mousedown', '.dragArea', function(event) {
            if (event.which !== 1) {
                return;
            }
            if (event.ctrlKey || event.shiftKey || event.metaKey) {
                if ($(event.target).is('.iconHelper')) {
                    return;
                }
            }
            var $headCol = $(this).parent().parent();

            TblAnim.startColDrag($headCol, event);
        });

        $thead.on('mousedown', '.editableHead', function(event) {
            if (event.which !== 1) {
                return;
            }
            if ($(this).closest('.editable').length) {
                return;
            }
            if ($("#container").hasClass('columnPicker') ||
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
                return;
            }
            if (isSystemMac && event.ctrlKey) {
                return;
            }
            var headCol = $(this).closest('th');

            TblAnim.startColDrag(headCol, event);
        });

        $thead.on("keydown", ".editableHead", function(event) {
            var $input = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("disabled")) {
                var colName = $input.val().trim();
                var colNum = xcHelper.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColName($input, tableId, colNum))
                {
                    return false;
                } else {
                    StatusBox.forceHide(); // hide previous error mesage if any
                }

                ColManager.renameCol(colNum, tableId, colName);
            }
        });

        $thead.on("blur", ".editableHead", function(event) {
            var $input = $(event.target);

            if (!$input.prop("disabled") &&
                $input.closest('.selectedCell').length === 0)
            {
                $input.val("");
                var $activeTarget = gMouseEvents.getLastMouseDownTarget();

                if (!$activeTarget.closest('.header')
                                  .find('.flex-mid')
                                  .hasClass('editable')) {
                    $('#fnBar').removeClass("disabled");
                }
            }
        });

        // listeners on tbody
        $tbody.on("mousedown", "td", function(event) {
            var $td = $(this);
            var $el = $td.children('.clickable');

            if ($("#container").hasClass('columnPicker') ||
                $("#container").hasClass('dfEditState') ||
                $("#mainFrame").hasClass("modalOpen"))
            {
                // not focus when in modal
                return;
            }

            if (event.which !== 1 || $el.length === 0) {
                return;
            }
            if ($td.hasClass('jsonElement')) {
                TblManager.unHighlightCells();
                if ($('#mainFrame').hasClass('modalOpen') &&
                    !$td.closest('.xcTableWrap').hasClass('jsonModalOpen'))
                {
                    return;
                }
                if ($(event.target).closest(".pop").length) {
                    return;
                }
            }

            var colNum = xcHelper.parseColNum($td);
            var rowNum = xcHelper.parseRowNum($td.closest("tr"));
            var isUnSelect = false;

            xcTooltip.hideAll();
            resetColMenuInputs($el);

            var $highlightBoxs = $(".highlightBox");

            var otherTIds = {};
            $highlightBoxs.each(function() {
                var cellTId = $(this).data("tableId");
                if (cellTId !== tableId) {
                    otherTIds[cellTId] = true;
                    $(this).closest("td").removeClass("highlightedCell");
                    $(this).remove();
                }
            });

            for (var tId in otherTIds) {
                gTables[tId].highlightedCells = {};
            }

            $highlightBoxs = $(".highlightBox");

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey)
            {
                // ctrl key: multi selection
                multiSelection();
            } else if (event.shiftKey) {
                // shift key: multi selection from minIndex to maxIndex
                var $lastNoShiftCell = $highlightBoxs.filter(function() {
                    return $(this).hasClass("noShiftKey");
                });

                if ($lastNoShiftCell.length === 0) {
                    singleSelection();
                } else {
                    var lastColNum = $lastNoShiftCell.data("colNum");

                    if (lastColNum !== colNum) {
                        // when colNum changes
                        multiSelection();
                    } else {
                        // re-hightlight shift key cell

                        $highlightBoxs.each(function() {
                            if ($(this).hasClass("shiftKey")) {
                                unHighlightCell($(this));
                            }
                        });

                        var $curTable  = $td.closest(".xcTable");
                        var baseRowNum = $lastNoShiftCell.data("rowNum");

                        var minIndex = Math.min(baseRowNum, rowNum);
                        var maxIndex = Math.max(baseRowNum, rowNum);

                        for (var r = minIndex; r <= maxIndex; r++) {
                            var $cell = $curTable.find(".row" + r + " .col" + colNum);
                            // in case double added hightlight to same cell
                            unHighlightCell($cell);

                            if (r === baseRowNum) {
                                TblManager.highlightCell($cell, tableId,
                                                         r, colNum);
                            } else {
                                TblManager.highlightCell($cell, tableId,
                                                         r, colNum,
                                                         {"isShift": true});
                            }
                        }
                    }
                }
            } else {
                // select single cell
                singleSelection();
            }

            xcHelper.dropdownOpen($el, $('#cellMenu'), {
                "colNum": colNum,
                "rowNum": rowNum,
                "classes": "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": event.pageY},
                "shiftKey": event.shiftKey,
                "isMultiCol": isMultiColumn(),
                "isUnSelect": isUnSelect,
                "floating": true
            });

            function singleSelection() {
                if ($highlightBoxs.length === 1 &&
                    $td.find('.highlightBox').length > 0)
                {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    TblManager.unHighlightCells();
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            }

            function multiSelection() {
                // remove old shiftKey and noShiftKey class
                $highlightBoxs.removeClass("shiftKey")
                            .removeClass("noShiftKey");

                if ($td.find('.highlightBox').length > 0) {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    if ($highlightBoxs.filter(function() {
                        return $(this).closest(".jsonElement").length;
                    }).length) {
                        TblManager.unHighlightCells();
                    }
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            }
        });

        var clicks = 0;
        var dblClickTimer;
        var $lastTd;

        // used for double clicks
        $tbody.on("mousedown", "td", function(event) {
            if (event.which !== 1) {
                return;
            }
            if ($("#container").hasClass("columnPicker") &&
                !$("#container").hasClass("dataflowState") &&
                 !$("#container").hasClass("projectState") ) {
                // not focus when in modal
                return;
            }
            var $td = $(this);
            if ($("#container").hasClass("dataflowState") &&
                $("#container").hasClass("projectState") &&
                !$td.hasClass("jsonElement")) {
                // no json modal for regular tds if form is open
                return;
            }

            clicks++;
            if (clicks === 2 && $td.is($lastTd)) {
                clicks = 0;
                clearTimeout(dblClickTimer);
                var colNum = xcHelper.parseColNum($td);
                if (colNum === 0) {
                    return;
                }
                var progCol = gTables[tableId].getCol(colNum);
                var type = progCol.getType();
                var showModal = false;
                if (type === ColumnType.object || type === ColumnType.array ||
                    $td.hasClass("truncated")) {
                    showModal = true;
                } else if (type === ColumnType.mixed) {
                    var cellType = ColManager.getCellType($td, tableId);
                    if (cellType === ColumnType.object ||
                        cellType === ColumnType.array) {
                        showModal = true;
                    }
                }
                if (showModal) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                    JSONModal.show($td, {type: type});
                }
            } else {
                clicks = 1;
                $lastTd = $td;
                dblClickTimer = setTimeout(function() {
                    clicks = 0;
                }, 500);
            }
        });

        $tbody[0].oncontextmenu = function(event) {
            var $el = $(event.target);
            var $td = $el.closest("td");
            var $div = $td.children('.clickable');
            var isDataTd = $td.hasClass('jsonElement');
            if ($div.length === 0) {
                // when click sth like row marker cell, rowGrab
                return false;
            }
            if ($("#container").hasClass('columnPicker') ||
                $("#container").hasClass('dfEditState') ||
                $("#mainFrame").hasClass("modalOpen"))
            {
                $el.trigger('click');
                // not focus when in modal
                return false;
            }

            var colNum = xcHelper.parseColNum($td);
            var rowNum = xcHelper.parseRowNum($td.closest("tr"));

            xcTooltip.hideAll();
            resetColMenuInputs($el);

            if ($td.find(".highlightBox").length === 0) {
                // same as singleSelection()
                TblManager.unHighlightCells();
                TblManager.highlightCell($td, tableId, rowNum, colNum);
            }

            xcHelper.dropdownOpen($div, $("#cellMenu"), {
                "colNum": colNum,
                "rowNum": rowNum,
                "classes": "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": event.pageY},
                "isMultiCol": isMultiColumn(),
                "isDataTd": isDataTd,
                "floating": true
            });

            return false;
        };

        $thead.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        function dotWrapClick($dotWrap) {
            var $dot = $dotWrap.find(".dot");
            var $topHeader = $dotWrap.closest(".topHeader");
            var x = $dot[0].getBoundingClientRect().left;
            var y = $topHeader[0].getBoundingClientRect().bottom;
            var $menu = $("#prefixColorMenu");
            var prefix = $topHeader.find(".prefix").text();
            var color = $topHeader.data("color");

            xcHelper.dropdownOpen($dotWrap, $menu, {
                "mouseCoors": {"x": x + 1, "y": y},
                "floating": true,
                "prefix": prefix,
                "color": color
            });
        }
    };

    // creates thead and cells but not the body of the table
    function generateTableShell(tableId, tableToReplace, options) {
        options = options || {};
        var oldTableId = xcHelper.getTableId(tableToReplace);
        // var isTableInActiveWS = WSManager.isTableInActiveWS(tableId);
        var isTableInActiveWS = false;
        var targetWS;
        if (options.wsId) {
            targetWS = options.wsId;
        } else if (oldTableId) {
            targetWS = WSManager.getWSFromTable(oldTableId);
        } else {
            targetWS = WSManager.getActiveWS();
        }

        if (WSManager.getActiveWS() === targetWS) {
            isTableInActiveWS = true;
        }

        var tableClasses = isTableInActiveWS ? "" : "inActive";
        tableClasses += " worksheet-" + targetWS;
        var xcTableWrap =
            '<div id="xcTableWrap-' + tableId + '"' +
                ' class="xcTableWrap tableWrap building ' + tableClasses + '" ' +
                'data-id="' + tableId + '">' +
                '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
                'data-id="' + tableId + '"></div>' +
                '<div class="tableScrollBar">' +
                    '<div class="sizer"></div>' +
                '</div>' +
            '</div>';
        // creates a new table, completed thead, and empty tbody
        if (options.atStartUp) {
            $("#mainFrame").append(xcTableWrap);
        } else if (oldTableId) {
            var $oldTable =  $("#xcTableWrap-" + oldTableId);
            $oldTable.after(xcTableWrap);
        } else {
            var position = xcHelper.getTableIndex(targetWS, options.position,
                                         '.xcTableWrap');
            if (position === 0) {
                $("#mainFrame").prepend(xcTableWrap);
            } else {
                var $prevTable = $(".xcTableWrap:not(.building)")
                                                .eq(position - 1);
                if ($prevTable.length) {
                    $prevTable.after(xcTableWrap);
                } else {
                    $("#mainFrame").append(xcTableWrap); // shouldn't happen
                }
            }
        }

        var tableShell = TblManager.generateTheadTbody(tableId);
        var tableHtml =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tableShell +
            '</table>' +
            '<div class="rowGrab last"></div>';

        $('#xcTbodyWrap-' + tableId).append(tableHtml);
    }

    function resetColMenuInputs($el) {
        var tableId = xcHelper.parseTableId($el.closest('.xcTableWrap'));
        var $menu = $('#colMenu-' + tableId);
        $menu.find('.gb input').val("groupBy");
        $menu.find('.numFilter input').val(0);
        $menu.find('.strFilter input').val("");
        $menu.find('.mixedFilter input').val("");
        $menu.find('.regex').next().find('input').val("*");
    }

    TblManager.generateTheadTbody = function(tableId) {
        var table = gTables[tableId];
        var newTableHtml =
            '<thead>' +
              '<tr>' +
                '<th style="width: 50px;" class="col0 th rowNumHead">' +
                  '<div class="header">' +
                    '<input value="" spellcheck="false" disabled title="' +
                    TooltipTStr.SelectAllColumns + '" ' +
                    'data-toggle="tooltip"' +
                    ' data-placement="top" data-container="body">' +
                  '</div>' +
                '</th>';

        var numCols = table.getNumCols();
        for (var colNum = 1; colNum <= numCols; colNum++) {
            var progCol = table.getCol(colNum);
            if (progCol.isDATACol()) {
                var width;
                var thClass = "";
                if (progCol.hasMinimized()) {
                    width = gHiddenColumnWidth;
                    thClass = " userHidden";
                } else {
                    width = progCol.getWidth();
                }
                if (!progCol.hasMinimized() && width === 'auto') {
                    width = 400;
                }
                newTableHtml += generateDataHeadHTML(colNum, thClass, width);
            } else {
                newTableHtml += TblManager.getColHeadHTML(colNum, tableId);
            }
        }

        newTableHtml += '</tr></thead><tbody></tbody>';

        return newTableHtml;
    };

    function generateDataHeadHTML(newColid, thClass, width) {
        var newTable =
            '<th class="col' + newColid + ' th dataCol' + thClass + '" ' +
                'style="width:' + width + 'px;">' +
                '<div class="header type-data">' +
                    '<div class="dragArea"></div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left"></div>' +
                        '<div class="flexWrap flex-mid">' +
                            '<input value="DATA" spellcheck="false" ' +
                                ' class="dataCol col' + newColid + '"' +
                                ' data-container="body"' +
                                ' data-toggle="tooltip" data-placement="top" ' +
                                '" title="raw data" disabled>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return (newTable);
    }

    function renameTableHelper($div) {
        var $tableName = $div.find(".tableName");
        var newName = $tableName.val().trim();
        var $th = $div.closest('.xcTheadWrap');
        var tableId = xcHelper.parseTableId($th);
        var newTableName = newName + "#" + tableId;
        var oldTableName = gTables[tableId].getName();

        if (newTableName === oldTableName) {
            $div.blur();
            return;
        }

        var isValid = xcHelper.tableNameInputChecker($tableName);
        if (isValid) {
            xcFunction.rename(tableId, newTableName)
            .then(function() {
                $div.blur();
            })
            .fail(function(error) {
                StatusBox.show(error, $div, false);
            });
        }
    }

    // returns arrays of deletable and non-deletable tables
    function splitDroppableTables(tables, tableType) {
        var deleteables = [];
        var nonDeletables = [];
        var tId;

        tables.forEach(function(tIdOrName) {
            if (tableType === TableType.Orphan) {
                tId = xcHelper.getTableId(tIdOrName);
            } else {
                tId = tIdOrName;
            }
            if (gTables[tId] && (gTables[tId].isNoDelete() ||
                gTables[tId].hasLock())) {
                nonDeletables.push(tIdOrName);
            } else {
                deleteables.push(tIdOrName);
            }
        });
        return {deleteable: deleteables, noDelete: nonDeletables};
    }

    // for deleting active tables
    function delTableHelper(tableId, tableType, txId) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
        var tableName = table.getName();
        xcHelper.lockTable(tableId);

        // Free the result set pointer that is still pointing to it
        table.freeResultset()
        .then(function() {
            return XIApi.deleteTable(txId, tableName);
        })
        .then(function() {
            Dag.makeInactive(tableId);
            removeTableDisplay(tableId);
            TableList.removeTable(tableId, TableType.Active);

            if (gActiveTableId === tableId) {
                gActiveTableId = null;
            }
            if ($('.xcTableWrap:not(.inActive)').length === 0) {
                RowScroller.empty();
            }

            TblManager.alignTableEls();
            // disallow dragging if only 1 table in worksheet
            TblFunc.checkTableDraggable();

            removeTableMeta(tableName);
            xcHelper.unlockTable(tableId);
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function delOrphanedHelper(tableName, txId) {
        var deferred = jQuery.Deferred();

        XIApi.deleteTable(txId, tableName)
        .then(function() {
            var tableIndex = gOrphanTables.indexOf(tableName);
            gOrphanTables.splice(tableIndex, 1);
            Dag.makeInactive(tableName, true);
            TableList.removeTable(tableName, TableType.Orphan);

            removeTableMeta(tableName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function delUndoneTableHelper(tableId) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.getName();

        XcalarDeleteTable(tableName)
        .then(function() {
            TableList.removeTable(tableName, TableType.Orphan);
            removeTableMeta(tableName);
            deferred.resolve();
        })
        .fail(function() {
            // remove the table from our records regardless
            // it will just go in the temp table list anyways
            removeTableMeta(tableName);
            deferred.reject();
        });

        return (deferred.promise());
    }

    function removeTableMeta(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] != null) {
            WSManager.removeTable(tableId);
            sendTableToDropped(gTables[tableId]);
            delete gTables[tableId];
            Profile.deleteCache(tableId);
        }
    }

    function sendTableToDropped(table) {
        if (table.getType() === TableType.Undone) {
            // has no descendents so we don't need to keep meta
            return;
        }
        table.beDropped();
        gDroppedTables[table.tableId] = table;
    }

    function autoSizeDataCol(tableId) {
        var progCols = gTables[tableId].tableCols;
        var numCols = progCols.length;
        var dataCol;
        var dataColIndex;
        for (var i = 0; i < numCols; i++) {
            if (progCols[i].isDATACol()) {
                dataCol = progCols[i];
                dataColIndex = i + 1;
                break;
            }
        }
        if (dataCol.width === "auto") {
            var winWidth = $(window).width();
            var maxWidth = 400;
            var minWidth = 200;
            if (winWidth > 1400) {
                maxWidth = 600;
            } else if (winWidth > 1100) {
                maxWidth = 500;
            }
            if (dataCol.hasMinimized()) {
                dataCol.width = minWidth;
                return;
            } else {
                dataCol.width = minWidth;
            }
            var $th = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            TblFunc.autosizeCol($th, {
                "fitAll": true,
                "minWidth": minWidth,
                "maxWidth": maxWidth
            });
        }
    }

    function isMultiColumn() {
        var lastColNum;
        var multiCol = false;
        var tId = gActiveTableId;
        if (!gTables[tId]) {
            return false;
        }

        for (var row in gTables[tId].highlightedCells) {
            for (var colNum in gTables[tId].highlightedCells[row]) {
                if (lastColNum == null) {
                    lastColNum = colNum;
                } else if (lastColNum !== colNum) {
                    multiCol = true;
                    break;
                }
            }
        }
        return (multiCol);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        TblManager.__testOnly__ = {};
        TblManager.__testOnly__.vefiryTableType = verifyTableType;
        TblManager.__testOnly__.setTablesToReplace = setTablesToReplace;
        TblManager.__testOnly__.animateTableId = animateTableId;
        TblManager.__testOnly__.tagOldTables = tagOldTables;
        TblManager.__testOnly__.removeOldTables = removeOldTables;
    }
    /* End Of Unit Test Only */

    return (TblManager);

}(jQuery, {}));
