<% v = isCurCtor ? "" : "V" + version %>
<% checkFunc = isCurCtor ? "__isCurrentVersion" : "__isParentVersion"%>
<% assert = isCurCtor ? "xcAssert(__isCurrentVersion(options));" : ""%>
<% addVersion = isCurCtor ? "" : "self.version = version;" %>
(function createConstructors<%= v %>(win) {
    var parentVersion = <%= isCurCtor ? "currentVersion"  : version - 1 %>;
    var version = <%= isCurCtor ? "null" : version %>;

    <% if (isCurCtor) {%>
    var __isCurrentVersion = function(options) {
        return (options == null ||
                options.version == null ||
                options.version === currentVersion);
    };
    <%} else {%>
    var __isParentVersion = function(options) {
        return __isOldVersion(options, version);
    };
    <%}%>

    // kvStore.js
    win.METAConstructor<%= v %> = (function() {
        var _super = __getConstructor("METAConstructor", parentVersion);
        <% if (isCurCtor) {%>
        var METAKeys = new _super().getMetaKeys();
        <%}%>
        /* Attr:
            version: <%= version %>,
            METAKeys.TI: (obj) table meta
            METAKeys.WS: (obj) worksheet meta
            METAKeys.AGGS: (obj) agg meta
            METAKeys.CART: (obj) cart meta
            METAKeys.STATS: (obj) profile meta
            METAKeys.LOGC: (integer) log cursor position
            METAKeys.TPFX: (obj) table prefix meta
            METAKeys.QUERY: (obj) query meta
        */
        function METAConstructor<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                METAConstructor<%= v %>.restore(self, options, version);
            }
            return self;
        }

        __extends(METAConstructor<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function() {
                // basic thing to store
                this[METAKeys.TI] = saveTables();
                this[METAKeys.WS] = WSManager.getAllMeta();
                this[METAKeys.AGGS] = Aggregates.getAggs();
                this[METAKeys.CART] = DSCart.getCarts();
                this[METAKeys.STATS] = Profile.getCache();
                this[METAKeys.LOGC] = Log.getCursor();
                this[METAKeys.TPFX] = TPrefix.getCache();
                this[METAKeys.QUERY] = QueryManager.getCache();
                return this;

                function saveTables() {
                    var persistTables = xcHelper.deepCopy(gTables);

                    for (var tableId in persistTables) {
                        var table = persistTables[tableId];
                        delete table.currentRowNumber;
                        delete table.keyName;
                        delete table.resultSetMax;
                        delete table.numPages;
                        delete table.ordering;
                        delete table.scrollMeta;
                        if (table.backTableMeta) {
                            var metas = table.backTableMeta.metas;
                            for (var i = 0; i < metas.length; i++) {
                                delete metas[i].numPagesPerSlot;
                                delete metas[i].numRowsPerSlot;
                            }
                        }
                    }

                    $.extend(persistTables, gDroppedTables);
                    return persistTables;
                }
            },

            getTableMeta: function() {
                return this[METAKeys.TI];
            },

            getWSMeta: function() {
                return this[METAKeys.WS];
            },

            getAggMeta: function() {
                return this[METAKeys.AGGS];
            },

            getCartMeta: function() {
                return this[METAKeys.CART];
            },

            getStatsMeta: function() {
                return this[METAKeys.STATS];
            },

            getLogCMeta: function() {
                return this[METAKeys.LOGC];
            },

            getTpfxMeta: function() {
                return this[METAKeys.TPFX];
            },

            getQueryMeta: function() {
                return this[METAKeys.QUERY];
            }
            <%}%>
        });

        return METAConstructor<%= v %>;
    }());

    // kvStore.js
    win.EMetaConstructor<%= v %> = (function() {
        var _super = __getConstructor("EMetaConstructor", parentVersion);
        <% if (isCurCtor) {%>
        var EMetaKeys = new _super().getMetaKeys();
        <%}%>
        /* Attr:
            version: <%= version %>,
            EMetaKeys.DF: (obj) dataflow meta
        */
        function EMetaConstructor<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                EMetaConstructor<%= v %>.restore(self, options, version);
            }
            return self;
        }

        __extends(EMetaConstructor<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function() {
                // update
                this[EMetaKeys.DF] = DF.getAllCommitKeys();
                return this;
            },

            getDFMeta: function() {
                return this[EMetaKeys.DF];
            }
            <%}%>
        });

        return EMetaConstructor<%= v %>;
    }());

    // userSettings.js
    win.UserInfoConstructor<%= v %> = (function() {
        var _super = __getConstructor("UserInfoConstructor", parentVersion);
        <% if (isCurCtor) {%>
        var UserInfoKeys = new _super().getMetaKeys();
        <%}%>
        /* Attr:
            version: <%= version %>,
            UserInfoKeys.DS: (obj) datasets meta
            UserInfoKeys.PREF: (obj) user preference meta
        */
        function UserInfoConstructor<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                UserInfoConstructor<%= v %>.restore(self, options, version);
            }
            return self;
        }

        __extends(UserInfoConstructor<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function() {
                this[UserInfoKeys.DS] = DS.getHomeDir();
                this[UserInfoKeys.PREF] = UserSettings.getAllPrefs();
            },

            getPrefInfo: function() {
                return this[UserInfoKeys.PREF];
            },

            getDSInfo: function() {
                return this[UserInfoKeys.DS];
            }
            <%}%>
        });

        return UserInfoConstructor<%= v %>;
    }());

    // authentication.js
    win.XcAuth<%= v %> = (function() {
        var _super = __getConstructor("XcAuth", parentVersion);
        /* Attr:
            version: <%= version %>,
            idCount: (integer) current id num,
            hasTag: (string) 2 characters string
        */
        function XcAuth<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(XcAuth<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getHashTag: function() {
                return this.hashTag;
            },

            getIdCount: function() {
                return this.idCount;
            },

            incIdCount: function() {
                this.idCount++;
                return this.idCount;
            }
            <%}%>
        });

        return XcAuth<%= v %>;
    }());

    // log.js
    win.XcLog<%= v %> = (function() {
        var _super = __getConstructor("XcLog", parentVersion);
        /* Attr:
            version: <%= version %>,
            title: (string) log's title,
            options: (obj) log's options
            cli: (string, optional) cli log
            error: (any, optional) error log
            sqlType: (string, optional) log's type
            timestamp: (date) time
        */
        function XcLog<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(XcLog<%= v %>, _super, {
            <% if (isCurCtor) {%>
            isError: function() {
                if (this.sqlType === SQLType.Error) {
                    return true;
                } else {
                    return false;
                }
            },

            getOperation: function() {
                return this.options.operation;
            },

            getTitle: function() {
                return this.title;
            },

            getOptions: function() {
                return this.options;
            }
            <%}%>
        });

        return XcLog<%= v %>;
    }());

    // Constructor for table meta data
    win.TableMeta<%= v %> = (function() {
        var _super = __getConstructor("TableMeta", parentVersion);
        /* Attr
            version: <%= version %>,
            tableName: (string) table's name
            tableId: (string) table's id
            isLocked: (boolean) if table is locked
            noDelete: (boolean) if table should not be deleted
            status: (string) enums of TableType
            timeStamp: (date) last change time
            tableCols: (array) ProgCols
            bookmarks: (array) row bookmark cache
            rowHeights: (obj) row height cache
            currentRowNumber: (integer, not persist) current row number
            resultSetId: (string) result id
            icv: (string), icv table
            resultSetCount: (integer) total row num
            backTableMeta: (obj) backTableMeta, not persistent
            skewness: (num), not persistent

            keyName: (string, not persist) column on index
            resultSetMax: (integer, not persist) last row able to fetch
            numPages: (integer, not persist) num of pages

         * new attrs:
            indexTables: (obj) cache column's indexed table
            complement: (string), complement table
        */
        function TableMeta<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.tableCols = TableMeta<%= v %>.restoreProgCol(options.tableCols,
                                                            version);
                // XXX this is only for version 2!!!
                self.indexTables = options.indexTables || {};
                self.complement = options.complement || "";

                self.backTableMeta = options.backTableMeta || null;
            }

            return self;
        }

        __extends(TableMeta<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getId: function() {
                return this.tableId;
            },

            getName: function() {
                return this.tableName;
            },

            getTimeStamp: function() {
                return this.timeStamp;
            },

            updateTimeStamp: function() {
                this.timeStamp = xcHelper.getCurrentTimeStamp();
                return this;
            },

            lock: function() {
                this.isLocked = true;
            },

            unlock: function() {
                this.isLocked = false;
            },

            hasLock: function() {
                return this.isLocked;
            },

            getIndexTable: function(colName) {
                return this.indexTables[colName];
            },

            setIndexTable: function(colName, indexTable) {
                this.indexTables[colName] = indexTable;
            },

            removeIndexTable: function(colName) {
                delete this.indexTables[colName];
            },

            addNoDelete: function() {
                this.noDelete = true;
            },

            removeNoDelete: function() {
                this.noDelete = false;
            },

            isNoDelete: function() {
                return this.noDelete;
            },

            getMeta: function() {
                var deferred = jQuery.Deferred();
                var self = this;

                XcalarGetTableMeta(self.tableName)
                .then(function(tableMeta) {
                    if (tableMeta == null || tableMeta.valueAttrs == null) {
                        console.error("backend return error");
                        deferred.resolve();
                        return;
                    }

                    self.backTableMeta = tableMeta;
                    self.ordering = tableMeta.ordering;
                    self.keyName = xcHelper.getTableKeyFromMeta(tableMeta);
                    self._setSkewness();
                    // update immediates
                    var valueAttrs = [];
                    if (tableMeta.valueAttrs != null) {
                        valueAttrs = tableMeta.valueAttrs;
                    }

                    valueAttrs.forEach(function(valueAttr) {
                        if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                            // fat pointer
                            return;
                        }
                        var progCol = self.getColByBackName(valueAttr.name);
                        if (progCol != null) {
                            progCol.setImmediateType(valueAttr.type);
                        }
                    });

                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();
            },

            getAllCols: function(onlyValid) {
                if (onlyValid) { // ignores datacol and empty cols
                    return this.tableCols.filter(function(col) {
                        var name = col.backName.trim();
                        return name.length && !col.isDATACol();
                    });
                } else {
                    return this.tableCols;
                }
            },

            addCol: function(colNum, progCol) {
                var self = this;
                var index = colNum - 1;
                if (index < 0 || !progCol) {
                    return;
                }

                self.tableCols.splice(index, 0, progCol);
                var backColName = progCol.getBackColName();
                if (self.backTableMeta != null) {
                    var valueAttrs = self.backTableMeta.valueAttrs || [];
                    valueAttrs.some(function(valueAttr) {
                        if (valueAttr.name === backColName &&
                            valueAttr.type !== DfFieldTypeT.DfFatptr) {
                            progCol.setImmediateType(valueAttr.type);
                            // end loop
                            return true;
                        }
                    });
                } else {
                    console.error("no table meta!");
                }
            },

            removeCol: function(colNum) {
                var index = colNum - 1;
                if (index < 0 || this.tableCols[index] == null) {
                    return null;
                }

                var removed = this.tableCols[index];
                this.tableCols.splice(index, 1);
                return removed;
            },

            sortCols: function(sortKey, order) {
                sortKey = sortKey || ColumnSortType.name;

                this.tableCols.sort(function(a, b) {
                    if (sortKey === ColumnSortType.type) {
                        aVal = a.getType();
                        bVal = b.getType();
                    } else if (sortKey === ColumnSortType.prefix) {
                        aVal = a.getPrefix();
                        bVal = b.getPrefix();
                    } else {
                        // sort by name
                        aVal = a.getFrontColName();
                        bVal = b.getFrontColName();
                    }

                    var res = xcHelper.sortVals(aVal, bVal, order);
                    if (res === 0 && sortKey !== ColumnSortType.name) {
                        // when equal, sort by name
                        aVal = a.getFrontColName();
                        bVal = b.getFrontColName();
                        res = xcHelper.sortVals(aVal, bVal, order);
                    }

                    return res;
                });
            },

            updateResultset: function() {
                var deferred = jQuery.Deferred();
                var self = this;

                freeResultSetHelper()
                .then(function() {
                    return XcalarMakeResultSetFromTable(self.tableName);
                })
                .then(function(resultSet) {
                    // Note that this !== self in this scope
                    self.resultSetId = resultSet.resultSetId;
                    self.resultSetCount = resultSet.numEntries;
                    self.resultSetMax = resultSet.numEntries;
                    self.numPages = Math.ceil(self.resultSetCount /
                                                gNumEntriesPerPage);

                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();

                function freeResultSetHelper() {
                    var innerDeferred = jQuery.Deferred();

                    self.freeResultset()
                    .always(innerDeferred.resolve);

                    return innerDeferred.promise();
                }
            },

            getMetaAndResultSet: function() {
                var deferred = jQuery.Deferred();
                var self = this;

                self.updateResultset()
                .then(function() {
                    return self.getMeta();
                })
                .then(deferred.resolve)
                .fail(deferred.reject);

                return deferred.promise();
            },

            freeResultset: function() {
                var deferred = jQuery.Deferred();
                var self = this;

                if (self.resultSetId === -1) {
                    deferred.resolve();
                } else {
                    XcalarSetFree(self.resultSetId)
                    .then(function() {
                        self.resultSetId = -1;
                        deferred.resolve();
                    })
                    .fail(deferred.reject);
                }

                return deferred.promise();
            },

            getType: function() {
                return this.status;
            },

            getKeyName: function() {
                return this.keyName;
            },

            getOrdering: function() {
                return this.ordering;
            },

            __getColMeta: function(isImmediate, meta) {
                var res = [];
                if (this.backTableMeta != null &&
                    this.backTableMeta.hasOwnProperty("valueAttrs"))
                {
                    this.backTableMeta.valueAttrs.forEach(function(attr) {
                        var isTypeImmediate = (attr.type !== DfFieldTypeT.DfFatptr);
                        var shouldAddMeta = (isImmediate && isTypeImmediate)
                                            || (!isImmediate && !isTypeImmediate);
                        if (shouldAddMeta) {
                            if (meta == null) {
                                res.push(attr);
                            } else {
                                res.push(attr[meta]);
                            }
                        }
                    });
                }

                return res;
            },

            getImmediates: function() {
                return this.__getColMeta(true);
            },

            getFatPtr: function() {
                return this.__getColMeta(false);
            },

            getImmediateNames: function() {
                return this.__getColMeta(true, "name");
            },

            getFatPtrNames: function() {
                return this.__getColMeta(false, "name");
            },

            showIndexStyle: function() {
                var order = this.ordering;
                if (!gEnableIndexStyle &&
                    order !== XcalarOrderingT.XcalarOrderingAscending &&
                    order !== XcalarOrderingT.XcalarOrderingDescending) {
                    return false;
                } else {
                    return true;
                }
            },

            beActive: function() {
                this.status = TableType.Active;
                return this;
            },

            beOrphaned: function() {
                this.status = TableType.Orphan;
                return this;
            },

            beTrashed: function() {
                this.status = TableType.Trash;
                return this;
            },

            beUndone: function() {
                this.status = TableType.Undone;
                return this;
            },

            beDropped: function() {
                this.status = TableType.Dropped;
                var table = this;

                delete table.backTableMeta;
                delete table.bookmarks;
                delete table.currentRowNumber;
                delete table.highlightedCells;
                delete table.indexTables;
                delete table.isLocked;
                delete table.keyName;
                delete table.noDelete;
                delete table.numPages;
                delete table.ordering;
                delete table.resultSetId;
                delete table.resultSetMax;
                delete table.rowHeights;
                delete table.scrollMeta;
                delete table.skewness;
                delete table.timeStamp;

                if (!table.complement) {
                    delete table.complement;
                }
                if (!table.icv) {
                    delete table.icv;
                }
                // keeping resultSetCount, status, tableCols, tableId, tableName

                var col;
                for (var i = 0; i < table.tableCols.length; i++) {
                    col = table.tableCols[i];
                    delete col.decimal;
                    delete col.format;
                    delete col.isMinimized;
                    delete col.knownType;
                    delete col.sizedTo;
                    delete col.textAlign;
                    delete col.userStr;
                    delete col.width;
                    if (!col.immediate) { // delete if false
                        delete col.immediate;
                    }
                    // keep "isNewCol" property or it later gets set to true
                    // keeping prefix, name, backname, func, type, isNewCol
                }
                return this;
            },

            isActive: function() {
                return (this.status === TableType.Active);
            },

            isDropped: function() {
                return (this.status === TableType.Dropped);
            },

            getCol: function(colNum) {
                var tableCols = this.tableCols || [];
                if (colNum < 1 || colNum > tableCols.length) {
                    return null;
                }

                return tableCols[colNum - 1];
            },

            getNumCols: function() {
                var tableCols = this.tableCols || [];
                return tableCols.length;
            },

            getColNumByBackName: function(backColName) {
                var tableCols = this.tableCols || [];
                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.getBackColName() === backColName) {
                        return (i + 1);
                    }
                }
                return -1;
            },

            getColNumByFrontName: function(frontColName) {
                var tableCols = this.tableCols || [];
                var res = xcHelper.parsePrefixColName(frontColName);
                var prefix = res.prefix;
                var colName = res.name;

                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.isDATACol()) {
                        // skip DATA column
                        continue;
                    }

                    if (progCol.getPrefix() === prefix &&
                        progCol.getFrontColName() === colName)
                    {
                        // check fronColName
                        return (i + 1);
                    }
                }
                return -1;
            },

            getColByBackName: function(backColName) {
                // get progCol from backColName
                var tableCols = this.tableCols || [];
                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.isNewCol || progCol.isDATACol()) {
                        // skip new column and DATA column
                        continue;
                    } else if (progCol.getBackColName() === backColName) {
                        return progCol;
                    }
                }

                return null;
            },

            getColByFrontName: function(frontColName) {
                var tableCols = this.tableCols || [];
                var res = xcHelper.parsePrefixColName(frontColName);
                var prefix = res.prefix;
                var colName = res.name;

                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.isDATACol()) {
                        // skip DATA column
                        continue;
                    }

                    if (progCol.getPrefix() === prefix &&
                        progCol.getFrontColName() === colName)
                    {
                        // check fronColName
                        return progCol;
                    }
                }
                return null;
            },

            hasColWithBackName: function(backColName) {
                // this check if table has the backCol,
                // it does not check frontCol
                var tableCols = this.tableCols || [];
                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.isNewCol || progCol.isDATACol()) {
                        // skip new column and DATA column
                        continue;
                    } else if (progCol.getBackColName() === backColName) {
                        return true;
                    }
                }

                return false;
            },

            hasCol: function(colName, prefix, onlyCheckPulledCol) {
                // check both fronName and backName
                var self = this;
                var tableCols = this.tableCols || [];
                var hasBackMeta = (self.backTableMeta != null &&
                                  self.backTableMeta.valueAttrs != null);
                if (!onlyCheckPulledCol && prefix === "" && hasBackMeta) {
                    // when it's immediates, when use backMeta to check
                    var valueAttrs = self.backTableMeta.valueAttrs;
                    var found = valueAttrs.some(function(valueAttr) {
                        if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                            // fat pointer
                            return false;
                        }
                        if (colName === valueAttr.name) {
                            return true;
                        }
                    });

                    return found;
                }

                // when it's fatPtr or no back meta to check
                for (var i = 0, len = tableCols.length; i < len; i++) {
                    var progCol = tableCols[i];

                    if (progCol.isDATACol()) {
                        // skip DATA column
                        continue;
                    }

                    if (prefix != null && progCol.getPrefix() !== prefix) {
                        continue;
                    }

                    if (!progCol.isNewCol && progCol.getBackColName() === colName) {
                        // check backColName
                        return true;
                    }

                    if (progCol.getFrontColName() === colName) {
                        // check fronColName
                        return true;
                    }
                }

                return false;
            },

            addBookmark: function(rowNum) {
                xcAssert(Number.isInteger(rowNum));

                if (this.bookmarks.indexOf(rowNum) < 0) {
                    this.bookmarks.push(rowNum);
                } else {
                    // error case
                    console.error("Duplicate bookmark in", rowNum);
                }
            },

            removeBookmark: function(rowNum) {
                xcAssert(Number.isInteger(rowNum));

                var index = this.bookmarks.indexOf(rowNum);
                if (index >= 0) {
                    this.bookmarks.splice(index, 1);
                } else {
                    // error case
                    console.error("No bookmark in", rowNum);
                }
            },

            getColContents: function(colNum) {
                // Returns JSON array containing the current contents of the column
                // colName is front or back name
                // Returns null if column does not exist
                var self = this;
                var curId = self.getId();
                var $curTable = $("#xcTable-" + curId);
                if (self.getCol(colNum) === null) {
                    return null;
                }

                var colContents = [];

                $curTable.find("td.col" + colNum).each(function() {
                    var $textDiv = $(this).find(".originalData");
                    colContents.push($textDiv.text());
                });

                return colContents;
            },

            getRowDistribution: function() {
                return this.backTableMeta.metas.map(function(meta) {
                    return meta.numRows;
                });
            },

            _setSkewness: function() {
                // skew = 1/n * sum( ((xi - avg)/sd)^2 )
                // sd = sqrt(sum(xi - avg) / (n - 1))
                var skewness = null;
                var rows = this.getRowDistribution();
                var len = rows.length;
                var even = 1 / len;
                var total = rows.reduce(function(sum, value) {
                    return sum + value;
                }, 0);
                if (total === 1) {
                    // 1 row has no skewness
                    skewness = 0;
                } else {
                    // change to percantage
                    rows = rows.map(function(row) {
                        return row / total;
                    });

                    skewness = rows.reduce(function(sum, value) {
                        return sum + Math.abs(value - even);
                    }, 0);

                    skewness = Math.floor(skewness * 100);
                }
                this.skewness = skewness;
            },

            getSkewness: function() {
                return this.skewness;
            },

            getSize: function() {
                var sizes = this.backTableMeta.metas.map(function(meta) {
                    return meta.size;
                });
                var totalSize = sizes.reduce(function(sum, value) {
                    return sum + value;
                }, 0);
                return totalSize;
            },

            <%}%>
        });

        return TableMeta<%= v %>;

    }());

    // inner part of progCol
    win.ColFunc<%= v %> = (function() {
        var _super = __getConstructor("ColFunc", parentVersion);
        /* Attr
            version: <%= version %>,
            name: (string) col func's name
            args: (array) col func's arguments
        */
        function ColFunc<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(ColFunc<%= v %>, _super);

        return ColFunc<%= v %>;
    }());

    win.ProgCol<%= v %> = (function() {
        var _super = __getConstructor("ProgCol", parentVersion);
        /* Attr
            version: <%= version %>,
            name: (string) front column name
            backName: (string) back column name,
            prefix: (string, not persist) striped from backName
            immediate: (boolean) immdiate or fat ptr
            type: (string) enums in ColumnType
            knownType: (boolean) if the type is known or just a guess
            isNewCol: (boolean) if is new column
            isMinimized: (boolean) columns is hidden or not
            width: (number) column width
            format: (string) enums in ColFormat
            decimal: (integer) num of decimals
            sizedToHeader: (boolean) if size to header
            textAlign: (string) enums in ColTextAlign
            userStr: (string) user string
            func: (ColFunc) func info
        */
        function ProgCol<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.func = new ColFunc<%= v %>(options.func);
                self.sizedTo = options.sizedTo || "auto";
                delete self.sizedToHeader;
            }
            return self;
        }

        __extends(ProgCol<%= v %>, _super, {
            <% if (isCurCtor) {%>
            isDATACol: function() {
                if (this.name === "DATA" && this.func.name === "raw") {
                    return true;
                } else {
                    return false;
                }
            },

            isEmptyCol: function() {
                return this.isNewCol || this.name === "" || this.func.name === "";
            },

            isImmediate: function() {
                if (this.immediate === true) {
                    return true;
                } else {
                    return false;
                }
            },

            isKnownType: function() {
                if (!this.immediate) {
                    return false;
                } else {
                    return this.knownType;
                }
            },

            getFrontColName: function(includePrefix) {
                var name = this.name || "";
                if (includePrefix) {
                    name = xcHelper.getPrefixColName(this.prefix, name);
                }

                return name;
            },

            setFrontColName: function(name) {
                xcAssert(typeof name === "string" && name !== "");
                this.name = name;
            },

            getBackColName: function() {
                return this.backName;
            },

            setBackColName: function(backColName) {
                if (backColName == null) {
                    return;
                }

                this.backName = backColName;
                this.prefix = xcHelper.parsePrefixColName(backColName).prefix;
            },

            setImmediateType: function(typeId) {
                if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
                    // error case
                    console.error("Invalid typeId");
                    return;
                }

                var self = this;
                self.immediate = true;
                self.knownType = true;

                switch (typeId) {
                    case DfFieldTypeT.DfUnknown:
                        self.type = ColumnType.unknown;
                        break;
                    case DfFieldTypeT.DfString:
                        self.type = ColumnType.string;
                        break;
                    case DfFieldTypeT.DfInt32:
                    case DfFieldTypeT.DfInt64:
                    case DfFieldTypeT.DfUInt32:
                    case DfFieldTypeT.DfUInt32:
                        self.type = ColumnType.integer;
                        break;
                    case DfFieldTypeT.DfFloat32:
                    case DfFieldTypeT.DfFloat64:
                        self.type = ColumnType.float;
                        break;
                    case DfFieldTypeT.DfBoolean:
                        self.type = ColumnType.boolean;
                        break;
                    case DfFieldTypeT.DfMixed:
                        self.type = ColumnType.mixed;
                        break;
                    case DfFieldTypeT.DfFatptr:
                        console.error("Should not set fat pointer's type");
                        self.immediate = false;
                        self.knownType = false;
                        break;
                    default:
                        // console.warn("Unsupported type");
                        self.knownType = false;
                        break;
                }
            },

            getPrefix: function() {
                return this.prefix;
            },

            getType: function() {
                return this.type;
            },

            updateType: function(val) {
                var self = this;
                if (self.isEmptyCol()) {
                    return;
                } else if (self.isKnownType()) {
                    // don't check for knownType
                    return;
                } else {
                    self.type = xcHelper.parseColType(val, self.type);
                }
            },

            getDisplayWidth: function() {
                if (this.isMinimized) {
                    return gHiddenColumnWidth;
                } else {
                    return this.width;
                }
            },

            getWidth: function() {
                return this.width;
            },

            setWidth: function(width) {
                this.width = width;
            },

            getFormat: function() {
                if (this.format == null) {
                    return ColFormat.Default;
                } else {
                    return this.format;
                }
            },

            setFormat: function(format) {
                if (format === ColFormat.Default) {
                    this.format = null;
                } else {
                    this.format = format;
                }
            },

            getDecimal: function() {
                return this.decimal;
            },

            setDecimal: function(decimal) {
                this.decimal = decimal;
            },

            minimize: function() {
                this.isMinimized = true;
            },

            maximize: function() {
                this.isMinimized = false;
            },

            hasMinimized: function() {
                return this.isMinimized;
            },

            getTextAlign: function() {
                return this.textAlign;
            },

            setTextAlign: function(alignment) {
                if (alignment == null) {
                    return;
                }

                this.textAlign = alignment;
            },

            isNumberCol: function() {
                return (this.type === ColumnType.integer ||
                        this.type === ColumnType.float);
            },

            stringifyFunc: function() {
                var self = this;
                var str = "";

                parseFunc(self.func);

                function parseFunc(func) {
                    if (func.name) {
                        if (str !== "") {
                            str += "(";
                        }
                        str += func.name;
                    }

                    var args = func.args;
                    for (var i = 0; i < args.length; i++) {
                        if (typeof args[i] !== "object") {
                            if (i === 0) {
                                str += "(";
                            } else {
                                str += ",";
                            }
                            str += args[i];
                        } else if (typeof args[i] === "object") {
                            parseFunc(args[i]);
                        }
                        if (i === func.args.length - 1) {
                            str += ")";
                        }
                    }
                }
                return str;
            },

            parseFunc: function() {
                var self = this;
                if (!self.userStr) {
                    console.error("no userStr");
                    return;
                }

                var funcString = self.userStr;
                // Everything must be in a "name" = function(args) format
                // var open = funcString.indexOf("\"");
                // var close = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
                // var name = funcString.substring(open + 1, close);
                var funcSt = funcString.substring(funcString.indexOf("=") + 1);
                var func = {args: []};

                ColManager.parseFuncString(funcSt, func);
                self.func = new ColFunc(func.args[0]);
            },
            <%}%>
        });

        return ProgCol<%= v %>;
    }());

    // aggregates.js
    win.Agg<%= v %> = (function() {
        var _super = __getConstructor("Agg", parentVersion);
        /* Attr
            version: <%= version %>,
            op: (string) agg operation name
            value: (number/string) agg result
            tableId: (string) source table id
            backColName: (string) source column name
            dagName: (string) dst dag name
            aggname: aggregate name
        */
        function Agg<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(Agg<%= v %>, _super);

        return Agg<%= v %>;
    }());

    // userSettings.js
    win.GenSettings<%= v %> = (function() {
        var _super = __getConstructor("GenSettings", parentVersion);
        /* Attr
            version: <%= version %>,
            adminSettins: (obj) admin settings
            xcSettings: (obj) xcSttings
            baseSettings: (obj) baseSettings
        */
        function GenSettings<%= v %>(userConfigParms, options) {
            var self = _super.call(this, userConfigParms, options);
            <%= addVersion %>

            // XXX this is only for version 2!!!
            if (<%= checkFunc %>(options)) {
                var defaultSettings = {
                    "hideDataCol": false,
                    "monitorGraphInterval": 3, // in seconds
                    "commitInterval": 120, // in seconds
                    "enableCreateTable": false,
                    "hideSysOps": false,
                    "hideXcUDF": false
                };
                defaultSettings = $.extend({}, defaultSettings,
                                            userConfigParms);
                self.baseSettings = $.extend({}, defaultSettings,
                                            self.xcSettings,
                                            self.adminSettings);
            }

            return self;
        }

        __extends(GenSettings<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getPref: function(pref) {
                return this.baseSettings[pref];
            },
            getBaseSettings: function() {
                return this.baseSettings;
            },
            updateAdminSettings: function(settings) {
                var prevAdminSettings = this.adminSettings;
                this.adminSettings = $.extend({}, prevAdminSettings, settings);
            },
            cleanAdminSettings: function() {
                this.adminSettings = {};
            },
            updateXcSettings: function(settings) {
                var prevXcSettings = this.xcSettings;
                this.xcSettings = $.extend({}, prevXcSettings, settings);
            },
            getAdminAndXcSettings: function() {
                return new GenSettings(null, {
                    "adminSettings": this.adminSettings,
                    "xcSettings": this.xcSettings
                });
            }
            <%}%>
        });

        return GenSettings<%= v %>;
    }());

    // userSettings.js
    win.UserPref<%= v %> = (function() {
        var _super = __getConstructor("UserPref", parentVersion);
        /* Attr
            version: <%= version %>,
            datasetListView: (boolean) ds use list/grid view
            browserListView: (boolean) browser use list/grid view
            keepJoinTables: (boolean) keep tables to join or hide them
            activeMainTab: (string) which tab is in active
            general: (obj) holds general settings
        */
        function UserPref<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(UserPref<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function() {
                this.datasetListView = $("#dataViewBtn").hasClass("listView");
                this.browserListView = $("#fileBrowserGridView")
                                        .hasClass("listView");
                this.keepJoinTables = $("#joinView").find(".keepTablesCBWrap")
                                                     .find(".checkbox")
                                                     .hasClass("checked");
                this.sqlCollapsed = $("#log-TextArea")
                                     .find(".expanded").length === 0 &&
                                     $("#log-TextArea")
                                     .find(".collapsed").length !== 0;
                return this;
            }
            <%}%>
        });

        return UserPref<%= v %>;
    }());

    // dsCart.js
    // inner part of Cart
    win.CartItem<%= v %> = (function() {
        var _super = __getConstructor("CartItem", parentVersion);
        /* Attr:
            version: <%= version %>,
            colNum: (integer) column num
            value: (string) column name,
            type: (string) column type
        */
        function CartItem<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(CartItem<%= v %>, _super);

        return CartItem<%= v %>;
    }());

    // dsCart.js
    win.Cart<%= v %> = (function() {
        var _super = __getConstructor("Cart", parentVersion);
        /* Attr:
            version: <%= version %>,
            dsId: (string) dataset id,
            tableName: (string) tableName
            items: (array) list of CartItem
        */
        function Cart<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.items = Cart<%= v %>.restoreItem(options.items, version);
            }
            return self;
        }

        __extends(Cart<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getId: function() {
                return this.dsId;
            },

            getDSName: function() {
                var ds = DS.getDSObj(this.dsId);
                return ds.getFullName();
            },

            getTableName: function() {
                return this.tableName;
            },

            setTableName: function(tableName) {
                this.tableName = tableName;
            },

            getPrefix: function() {
                if (this.prefix) {
                    return this.prefix;
                } else {
                    return null;
                }
            },

            setPrefix: function(prefix) {
                this.prefix = prefix;
            },

            addItem: function(options) {
                var cartItem = new CartItem(options);
                this.items.push(cartItem);
            },

            removeItem: function(colNum) {
                this.items = this.items.filter(function(item) {
                    if (item.colNum === colNum) {
                        // filter out the item
                        return false;
                    } else {
                        return true;
                    }
                });
            },

            emptyItem: function() {
                this.items = [];
            }
            <%}%>
        });

        return Cart<%= v %>;
    }());

    win.WorksheetObj<%= v %> = (function() {
        var _super = __getConstructor("WorksheetObj", parentVersion);
        /* Attr
            version: <%= version %>,
            id: (string) worksheet id
            name: (string) worksheet name
            date: (string) create date
            tables: (array) list of active tables in the sheet
            archivedTables: (array) list of archived tables in the sheet
            orphanedTables: (array) list of orphaned tables in the sheet
            tempHiddenTables: (array) list of temp hidden tables
            undoneTables: (array) list of undone tables in the list
            lockedTables: (array, not persist) list of locked table in the sheet
        */
        function WorksheetObj<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.pendingTables = options.pendingTables || [];
            }
            return self;
        }

        __extends(WorksheetObj<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getId: function() {
                return this.id;
            },

            getName: function() {
                return this.name;
            },

            setName: function(name) {
                this.name = name;
            },

            addTable: function(tableId, tableType) {
                if (tableId == null) {
                    return false;
                }

                var tableArray = this[tableType];
                if (tableArray == null) {
                    return false;
                }

                if (tableArray.includes(tableId)) {
                    console.error(tableId, "already in worksheets!");
                    return false;
                }

                tableArray.push(tableId);
                return true;
            }
            <%}%>
        });

        return WorksheetObj<%= v %>;
    }());

    // worksheet.js
    win.WSMETA<%= v %> = (function() {
        var _super = __getConstructor("WSMETA", parentVersion);
        /* Attr:
            version: <%= version %>,
            wsInfos: (obj) set of WorksheetObj
            wsOrder: (array) worksheet order
            hiddenWS: (array) list of hidden worksheet
            noSheetTables: (array) list of tables not in any worksheets
            activeWS: (string) current active worksheet
        */
        function WSMETA<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.wsInfos = WSMETA<%= v %>.restoreWSInfos(options.wsInfos, version);
            }
            return self;
        }

        __extends(WSMETA<%= v %>, _super);

        return WSMETA<%= v %>;
    }());

    // workbook.js
    win.WKBK<%= v %> = (function() {
        var _super = __getConstructor("WKBK", parentVersion);
        /* Attr:
            version: <%= version %>,
            name: (string) workbook name
            id: (string) workbook id
            noMeta: (boolean) has meta or not
            srcUser: (string) who create the workbook
            curUser: (string) who is using the workbook
            created: (date) create time
            modified: (date) last modified time
            numWorksheets: (integer) num of worksheets in the workbook
         * new attrs:
            resource: (boolean) true if it has resource,
            description: (string) workbook description
        */
        function WKBK<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            if (<%= checkFunc %>(options)) {
                self.resource = options.resource || false;
                self.description = options.description;
            }
            return self;
        }

        __extends(WKBK<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function() {
                this.noMeta = false;
                // store modified data
                this.modified = xcHelper.getCurrentTimeStamp();
            },

            getId: function() {
                return this.id;
            },

            getName: function() {
                return this.name;
            },

            getDescription: function() {
                return this.description;
            },

            getCreateTime: function() {
                return this.created;
            },

            getModifyTime: function() {
                return this.modified;
            },

            getSrcUser: function() {
                return this.srcUser;
            },

            getNumWorksheets: function() {
                return this.numWorksheets;
            },

            isNoMeta: function() {
                return this.noMeta;
            },

            hasResource: function() {
                return this.resource;
            },

            setResource: function(resource) {
                this.resource = resource;
            },
            <%}%>
        });

        return WKBK<%= v %>;
    }());

    // profile.js
    win.ProfileAggInfo<%= v %> = (function() {
        var _super = __getConstructor("ProfileAggInfo", parentVersion);
        /* Attr:
            version: <%= version %>,
            max: (number/string) agg max
            min: (number/string) agg min
            count: (integer/string) agg count
            sum: (number/string) agg sum
            average: (number/string) agg average
            sd: (number/string) agg sd
        */
        function ProfileAggInfo<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        __extends(ProfileAggInfo<%= v %>, _super);

        return ProfileAggInfo<%= v %>;
    }());

    // profile.js
    win.ProfileStatsInfo<%= v %> = (function() {
        var _super = __getConstructor("ProfileStatsInfo", parentVersion);
        /* Attr:
            version: <%= version %>,
            unsorted: (boolean) if columns is sorted or not
            zeroQuartile: (number, optional): 0% row (first row)
            lowerQuartile: (number, optional): 25% row
            median: (number, optional): 50% row
            upperQuartile: (number, optional): 75% row
            fullQuartile: (number, optional): 100% row (last row)
        */
        function ProfileStatsInfo<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.key = options.key;
            }
            return self;
        }

        __extends(ProfileStatsInfo<%= v %>, _super);

        return ProfileStatsInfo<%= v %>;
    }());

    // profile.js
    win.ProfileGroupbyInfo<%= v %> = (function() {
        var _super = __getConstructor("ProfileGroupbyInfo", parentVersion);
        /* Attr:
            version: <%= version %>,
            isComplete: (boolean/string) true/false/running
            nullCount: (integer) how many null values
            allNull: (boolean) if all values are null
            buckes: (obj) a set of ProfileBucketInfo
        */
        function ProfileGroupbyInfo<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.buckets = ProfileGroupbyInfo<%= v %>.restoreBuckets(options.buckets,
                                                                    version);
            }
            return self;
        }

        __extends(ProfileGroupbyInfo<%= v %>, _super);

        return ProfileGroupbyInfo<%= v %>;
    }());

    // profile.js
    win.ProfileBucketInfo<%= v %> = (function() {
        var _super = __getConstructor("ProfileBucketInfo", parentVersion);
        /* Attr:
            version: <%= version %>,
            bucketSize: (number) size of the bucket
            table: (string) bucketing result table
            ascTable: (string) asc sort of table
            descTable: (string) desc sort of table
            colName: (string) column name
            max: (integer) max count
            sum: (integer) total row of table
        * new attrs:
            ztoa: (string) buckting result table in z to a order
        */
        function ProfileBucketInfo<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            // XXX this is only for version 2!!!
            if (<%= checkFunc %>(options)) {
                self.ztoa = options.ztoa || null;
            }

            return self;
        }

        __extends(ProfileBucketInfo<%= v %>, _super);

        return ProfileBucketInfo<%= v %>;
    }());

    // profile.js
    win.ProfileInfo<%= v %> = (function() {
        var _super = __getConstructor("ProfileInfo", parentVersion);
        /* Attr
            version: <%= version %>,
            id: (string) uniquely identify the obj
            colName: (string) column's name
            frontColName: (string, not persist) column's front name
            type: (string) column's type
            aggInfo: (ProfileAggInfo) agg info
            statsInfo: (ProfileStatsInfo) stats info
            groupByInfo: (ProfileGroupbyInfo) groupBy info
        */
        function ProfileInfo<%= v %>(options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                var restoreInfos = ProfileInfo<%= v %>.restoreInfos(options, version);
                self.aggInfo = restoreInfos.aggInfo;
                self.statsInfo = restoreInfos.statsInfo;
                self.groupByInfo = restoreInfos.groupByInfo;
            }
            return self;
        }

        __extends(ProfileInfo<%= v %>, _super, {
            <% if (isCurCtor) {%>
            addBucket: function(bucketNum, options) {
                this.groupByInfo.buckets[bucketNum] = new ProfileBucketInfo(options);
            },

            getId: function() {
                return this.id;
            }
            <%}%>
        });

        return ProfileInfo<%= v %>;
    }());

    /*** Start of DSObj ***/
    /* datastore.js */
    win.DSObj<%= v %> = (function() {
        var _super = __getConstructor("DSObj", parentVersion);
        /* Attr:
            version: <%= version %>,
            id: (number/string) uniquely identify dsObj
            names: (string) ds/folder's name
            user: (string) the user that creates it
            fullName: (string) fullName for ds, user.name,
                                        for folder, equal to name
            parentId: (number) parent folder's id
            isFolder (boolean) folder or ds
            uneditable: (boolean) if set true, no action for it
            eles: (array) its children DSObj
            totalChildren: (integer) total nummber of children
        */
        /* ds only attr:
            format: (string) data foramt of ds
            path: (string) point url of ds
            size: (string) ds's size
            numEntries: (integer) total records in ds
            resultSetId: (string) ds' resultId
            pattern: (string) path's pattern
            fieldDelim: (string) field delim
            lineDelim: (string) line delim
            hasHeader: (boolean) promote header or not
            moduleName: (string) udf's module
            funcName: (string) udf's func
            isRecur: (boolean) recursive or not
            previewSize: (integer) ds's previewSize
            quoteChar: (string) ds's quoteChar
            skipRows: (integer) how many rows to skip
            isRegex: (boolean) path is using regEx or not;
            headers: (array, optional) XXX temp fix to preserve CSV header order
            error: (string, optional) ds's error
            displayFormat (string) displayed format in ds table(Excel...)

            new attr:
                udfQuery: (object), extra udf args,
                locked: (boolean), is dataset locked or not
                targetName: (string), the src of targetName
        */
        function DSObj<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            // XXX this is only for version 2!!!
            if (<%= checkFunc %>(options)) {
                if (options.udfQuery) {
                    self.udfQuery = options.udfQuery;
                }

                if (options.locked != null) {
                    self.locked = options.locked;
                }
                if (options.targetName != null) {
                    self.targetName = options.targetName;
                }
            }
            return self;
        }

        __extends(DSObj<%= v %>, _super, {
            <% if (isCurCtor) {%>
            addToParent: function() {
                if (this.parentId !== DSObjTerm.homeParentId) {
                    var parent = DS.getDSObj(this.parentId);
                    parent.eles.push(this);
                    // update totalChildren of all ancestors
                    this.updateDSCount();
                }
            },

            getId: function() {
                return this.id;
            },

            getParentId: function() {
                return this.parentId;
            },

            getName: function() {
                return this.name;
            },

            getUser: function() {
                return this.user;
            },

            getFullName: function() {
                return this.fullName;
            },

            getFormat: function() {
                return this.format;
            },

            getDisplayFormat: function() {
                var self = this;
                if (self.displayFormat != null) {
                    return PromiseHelper.resolve(self.displayFormat);
                }

                var deferred = jQuery.Deferred();
                var dsName = parseDS(self.fullName);
                XcalarGetDag(dsName)
                .then(function(res) {
                    try {
                        var udf = res.node[0].input.loadInput.loadArgs
                                  .parseArgs.parserFnName;
                        if (udf === "default:openExcel") {
                            self.displayFormat = "Excel";
                        } else {
                            self.displayFormat = self.format;
                        }
                        deferred.resolve(self.displayFormat);
                    } catch (e) {
                        console.error(e);
                        deferred.resolve(self.format);
                    }
                })
                .fail(function(error) {
                    console.error(error);
                    deferred.resolve(self.format);
                });

                return deferred.promise();
            },

            getPath: function() {
                return this.path;
            },

            getPathWithPattern: function() {
                var path = this.path;
                if (this.pattern) {
                    path += " | " + DSFormTStr.Pattern + ": ";
                    var pattern = this.pattern;
                    if (this.isRegex) {
                        pattern = "re:" + pattern;
                    }

                    path += pattern;
                }

                return path;
            },

            getTargetName: function() {
                return this.targetName;
            },

            getPointArgs: function() {
                // loadURL, format, fullName,
                // fieldDelim, lineDelim, hasHeader,
                // moduleName, funcName, isRecur, previewSize,
                // quoteChar, skipRows, pattern
                var self = this;
                var pattern = xcHelper.getFileNamePattern(self.pattern,
                                                          self.isRegex);
                var options = {
                    "fieldDelim": self.fieldDelim,
                    "recordDelim": self.lineDelim,
                    "hasHeader": self.hasHeader,
                    "moduleName": self.moduleName,
                    "funcName": self.funcName,
                    "isRecur": self.isRecur,
                    "maxSampleSize": self.previewSize,
                    "quoteChar": self.quoteChar,
                    "skipRows": self.skipRows,
                    "fileNamePattern": pattern,
                    "udfQuery": self.udfQuery
                };
                return [self.path, self.format, self.fullName, options];
            },

            getNumEntries: function() {
                return this.numEntries;
            },

            getSize: function() {
                return this.size;
            },

            setSize: function(size) {
                this.size = xcHelper.sizeTranslator(size);
            },

            // this calculte how much size the dataset actually taken
            // should be bigger than the size return from load
            getMemoryTakenSize: function() {
                var self = this;
                var deferred = jQuery.Deferred();
                var dsName = self.fullName;

                XcalarGetDatasetMeta(dsName)
                .then(function(res) {
                    var size;
                    if (res != null && res.metas != null) {
                        var metas = res.metas;
                        size = 0;
                        // sum up size from all nodes
                        for (var i = 0, len = metas.length; i < len; i++) {
                            size += metas[i].size;
                        }
                        size = xcHelper.sizeTranslator(size);
                        if (self.size == null) {
                            // when not get the size
                            self.size = size;
                        }
                    }

                    deferred.resolve(size);
                })
                .fail(deferred.reject);

                return deferred.promise();
            },

            getError: function() {
                return this.error;
            },

            setError: function(error) {
                this.error = error;
            },

            setPreviewSize: function(previewSize) {
                if (this.isFolder || isNaN(previewSize)) {
                    console.error("error case!");
                    return;
                }

                this.previewSize = previewSize;
            },

            beFolder: function() {
                return this.isFolder;
            },

            beFolderWithDS: function() {
                return this.isFolder && this.totalChildren > 0;
            },

            isEditable: function() {
                return !this.uneditable;
            },

            lock: function() {
                if (!this.locked) {
                    this.locked = true;
                    var $grid = DS.getGrid(this.getId());
                    $grid.append('<div class="lockIcon"></div>');
                }
            },

            unlock: function() {
                this.locked = false;
                var $grid = DS.getGrid(this.getId());
                $grid.find(".lockIcon").remove();
            },

            isLocked: function() {
                return this.locked || false;
            },

            _makeResultSet: function() {
                var self = this;
                var deferred = jQuery.Deferred();

                XcalarMakeResultSetFromDataset(self.fullName)
                .then(function(result) {
                    self.resultSetId = result.resultSetId;
                    self.numEntries = result.numEntries;
                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();
            },

            _release: function() {
                var self = this;
                var resultSetId = self.resultSetId;
                if (resultSetId == null) {
                    return PromiseHelper.resolve();
                }

                var deferred = jQuery.Deferred();
                XcalarSetFree(resultSetId)
                .then(function() {
                    self.resultSetId = null;
                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();
            },

            fetch: function(rowToGo, rowsToFetch) {
                // rowToGo stats from 0
                var self = this;
                var deferred = jQuery.Deferred();

                fetchHelper()
                .then(parseHelper)
                .then(deferred.resolve)
                .fail(deferred.reject);

                return deferred.promise();

                function fetchHelper() {
                    var innerDeferred = jQuery.Deferred();

                    self._makeResultSet()
                    .then(function() {
                        if (self.numEntries <= 0) {
                            return PromiseHelper.resolve(null);
                        }

                        rowsToFetch = Math.min(self.numEntries, rowsToFetch);
                        return XcalarFetchData(self.resultSetId, rowToGo,
                                                rowsToFetch,
                                                self.numEntries, []);
                    })
                    .then(function(res) {
                        self._release()
                        .always(function() {
                            innerDeferred.resolve(res);
                        });
                    })
                    .fail(function(error) {
                        self._release()
                        .always(function() {
                            innerDeferred.reject(error);
                        });
                    });

                    return innerDeferred.promise();
                }

                function parseHelper(data) {
                    if (!data) {
                        return PromiseHelper.reject({"error": DSTStr.NoRecords});
                    }

                    var innerDeferred = jQuery.Deferred();
                    var value;
                    var json;
                    var uniqueJsonKey = {}; // store unique Json key
                    var jsonKeys = [];
                    var jsons = [];  // store all jsons

                    try {
                        for (var i = 0, len = data.length; i < len; i++) {
                            value = data[i];
                            json = jQuery.parseJSON(value);
                            jsons.push(json);
                            // get unique keys
                            for (var key in json) {
                                uniqueJsonKey[key] = true;
                            }
                        }

                        for (var uniquekey in uniqueJsonKey) {
                            jsonKeys.push(uniquekey);
                        }

                        jsonKeys = self._preserveHeaderOrder(jsonKeys);
                        innerDeferred.resolve(jsons, jsonKeys);

                    } catch (error) {
                        console.error(error, value);
                        innerDeferred.reject(error);
                    }

                    return innerDeferred.promise();
                }
            },

            // XXX temp fix to preserve CSV header order
            // Step 1. check if all headers exist in jsonKeys
            // Step 2. check if any extra headers in jsonKeys but not in headers
            _preserveHeaderOrder: function(jsonKeys) {
                if (!jsonKeys) {
                    return jsonKeys;
                }

                var headers = this.headers;
                if (headers == null) {
                    return jsonKeys;
                }

                var jsonKeyMap = {};
                var headerMap = {};
                var newHeaders = [];

                jsonKeys.forEach(function(key) {
                    jsonKeyMap[key] = true;
                });

                // Step 1. check if all headers exist in jsonKeys
                headers.forEach(function(header) {
                    if (jsonKeyMap.hasOwnProperty(header)) {
                        newHeaders.push(header);
                        headerMap[header] = true;
                    }
                });

                // Step 2. check if any extra headers in jsonKeys but not in headers
                jsonKeys.forEach(function(key) {
                    if (!headerMap.hasOwnProperty(key)) {
                        newHeaders.push(key);
                    }
                });

                return newHeaders;
            },

            // rename of dsObj
            rename: function(newName) {
                newName = newName.trim();

                if (newName === "") {
                    // not allow empty name
                    return false;
                }

                var self = this;
                var parent = DS.getDSObj(self.parentId);
                var error = xcHelper.replaceMsg(ErrWRepTStr.FolderConflict, {
                    "name": newName
                });
                //check name confliction
                var isValid = xcHelper.validate([
                    {
                        "$ele": DS.getGrid(self.id),
                        "error": ErrTStr.NoSpecialChar,
                        "check": function() {
                            return !xcHelper.checkNamePattern("folder", "check",
                                                              newName);
                        }
                    },
                    {
                        "$ele": DS.getGrid(self.id),
                        "error": error,
                        "check": function() {
                            return (parent.checkNameConflict(self.id, newName,
                                                             self.isFolder));
                        }
                    },
                    {
                        "$ele": DS.getGrid(self.id),
                        "error": ErrTStr.PreservedName,
                        "check": function() {
                            return newName === DSObjTerm.OtherUserFolder;
                        }
                    }
                ]);

                if (isValid) {
                    this.name = newName;
                    this.fullName = newName;
                    return true;
                } else {
                    return false;
                }
            },

            // Remove dsObj from parent
            removeFromParent: function() {
                var parent = DS.getDSObj(this.parentId);
                var index = parent.eles.indexOf(this);

                parent.eles.splice(index, 1);    // remove from parent
                // update totalChildren count of all ancestors
                this.updateDSCount(true);
                this.parentId = -1;

                return this;
            },

            // Move dsObj to new parent (insert or append when index < 0)
            // return true/false: Whether move succeed
            moveTo: function(newParent, index) {
                // not append to itself
                if (this.id === newParent.id) {
                    return false;
                }

                // not append to same parent again, but can insert
                if (index < 0 && this.parentId === newParent.id) {
                    return false;
                }

                // not append or insert to its own child
                var ele = newParent;
                while (ele != null && ele !== this) {
                    ele = DS.getDSObj(ele.parentId);
                }
                if (ele === this) {
                    return false;
                }

                var $grid = DS.getGrid(this.id);
                // check name conflict
                if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
                    StatusBox.show(ErrTStr.MVFolderConflict, $grid);
                    return false;
                }

                this.removeFromParent();
                this.parentId = newParent.id;

                if ((index != null) && (index >= 0)) {
                    newParent.eles.splice(index, 0, this);  // insert to parent
                } else {
                    newParent.eles.push(this);  // append to parent
                }

                $grid.attr("data-dsParentId", newParent.id);

                // update totalChildren of all ancestors
                this.updateDSCount();
                return true;
            },

            // Check if a dsObj's name has conflict in current folder
            checkNameConflict: function(id, name, isFolder) {
                // now only support check of folder

                // when this is not a folder
                if (!this.isFolder) {
                    console.error("Error call, only folder can call this function");
                    return false;
                }

                var eles = this.eles;

                for (var i = 0; i < eles.length; i++) {
                    var dsObj = eles[i];

                    if (dsObj.isFolder &&
                        dsObj.name === name &&
                        dsObj.id !== id &&
                        dsObj.isFolder === isFolder) {
                        return true;
                    }
                }

                return false;
            },

            // update ancestors totlal children
            updateDSCount: function(isMinus) {
                var parent = DS.getDSObj(this.parentId);

                while (parent != null) {
                    if (isMinus) {
                        parent.totalChildren -= this.totalChildren;
                    } else {
                        parent.totalChildren += this.totalChildren;
                    }
                    DS.getGrid(parent.id).find("> div.dsCount")
                                            .text(parent.totalChildren);
                    parent = DS.getDSObj(parent.parentId);
                }
            }
            <%}%>
        });

        return DSObj<%= v %>;
    }());
    /* End of DSObj */

    /* Start of Dataflow */
    /* dataflow.js */
    // a inner part of Dataflow
    // Stores the original values for the parameterized node
    win.RetinaNode<%= v %> = (function() {
        var _super = __getConstructor("RetinaNode", parentVersion);
        /* Attr:
            version: <%= version %>,
            paramType: (string) param's type
            paramValue: (string) param's value
            paramQuery: (array) list of param's query
        */
        function RetinaNode<%= v %>(options) {

            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                // changing paramValue from string to array of values
                if (!Array.isArray(self.paramValue)) {
                    self.paramValue = [self.paramValue];
                    if (self.paramType === XcalarApisT.XcalarApiBulkLoad) {
                        self.paramValue.push("");
                    } else if (self.paramType ===
                        XcalarApisT.XcalarApiExport)
                    {
                        self.paramValue.push("Default");
                    }
                }
            }
            return self;
        }
        __extends(RetinaNode<%= v %>, _super);

        return RetinaNode<%= v %>;
    }());

    win.Dataflow<%= v %> = (function() {
        var _super = __getConstructor("Dataflow", parentVersion);
        /* Attr
            version: <%= version %>,
            name: (string) Retina name
            columns: (array, not persist) Columns to export
            parameters: (array) array of parameters in Dataflow
            paramMap: (obj) map for parameters
            paramMapInUsed: (obj) map to record whether parameter is used
            nodeIds: (obj, not pesist) map of dagNames and dagIds
            retinaNodes: (obj, not persist) retina node info from backend
            parameterizedNodes: (obj) map of dagNodeIds to parameterized structs
            schedule: (SchedObj, not persist) schedule of the dataflow
        */
        function Dataflow<%= v %>(name, options) {
            options = options || {};
            <%= assert %>
            var self = _super.call(this, name, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                var restoreInfos = Dataflow<%= v %>.restoreInfos(options, version);
                self.parameterizedNodes = restoreInfos.parameterizedNodes;
                self.schedule = restoreInfos.schedule;
                self.paramMapInUsed = restoreInfos.paramMapInUsed || {};
            }
            return self;
        }

        __extends(Dataflow<%= v %>, _super, {
            <% if (isCurCtor) {%>

            addNodeId: function(tableName, nodeId) {
                this.nodeIds[tableName] = nodeId;
            },

            getNodeId: function(tableName) {
                return this.nodeIds[tableName];
            },

            addParameterizedNode: function(dagNodeId, oldParamNode, paramInfo, noParams) {
                this.parameterizedNodes[dagNodeId] = new RetinaNode(oldParamNode);
                this.updateParameterizedNode(dagNodeId, paramInfo, noParams);
            },

            colorNodes: function(dagNodeId, noParams) {
                var tableName;
                for (var name in this.nodeIds) {
                    if (this.nodeIds[name] === dagNodeId) {
                        tableName = name;
                        break;
                    }
                }

                if (!tableName) {
                    console.info("update must be called after add. Noop.");
                    return null;
                }

                var $nodeOrAction = $("#dataflowPanel")
                                    .find('[data-nodeid="' + dagNodeId + '"]');
                // Exception is for export.
                // XXX Consider attaching the id to the table
                // node instead of the operation during draw dag.
                // I think it will clean
                // up a lot of the exception cases here
                if ($nodeOrAction.prev().hasClass("filter")) {
                    $nodeOrAction = $nodeOrAction.prev();
                }
                if (noParams) {
                    $nodeOrAction.removeClass("hasParam");
                } else {
                    $nodeOrAction.addClass("hasParam");
                }
                return $nodeOrAction;
            },

            updateParameterizedNode: function(dagNodeId, paramInfo, noParams) {
                var $tableNode = this.colorNodes(dagNodeId, noParams);
                if ($tableNode == null) {
                    // error case
                    return;
                }
                if (paramInfo.paramType === XcalarApisT.XcalarApiExport) {
                    if (this.activeSession) {
                        updateExportName($tableNode, this.newTableName);
                        return;
                    } else {
                        updateExportName($tableNode, paramInfo.paramValue[0]);
                    }
                } else if (paramInfo.paramType === XcalarApisT.XcalarApiFilter)
                {
                    if (noParams) {
                        $tableNode.find(".opInfoText")
                                  .text($tableNode.data("column"));
                    } else {
                        $tableNode.find(".opInfoText")
                                  .text("<Parameterized>");
                    }
                }
                $tableNode.data("paramValue", paramInfo.paramValue);

                function updateExportName($tableNode, exportName) {
                    var $elem = $tableNode.find(".tableTitle");
                    var expName = xcHelper.stripCSVExt(exportName);
                    $elem.text(expName);
                    var text = xcHelper.convertToHtmlEntity(expName);
                    xcTooltip.changeText($elem, text);
                }
            },

            getParameterizedNode: function(dagNodeId) {
                return this.parameterizedNodes[dagNodeId];
            },

            addParameter: function(name) {
                xcAssert(!this.paramMap.hasOwnProperty(name), "Invalid name");
                this.parameters.push(name);
                this.paramMap[name] = null;
                this.paramMapInUsed[name] = false;
            },

            getParameter: function(paramName) {
                return this.paramMap[paramName];
            },

            updateParameters: function(params) {
                var paramMap = this.paramMap;
                var parameters = this.parameters;
                var paramMapInUsed = this.paramMapInUsed;

                if (params != null && params instanceof Array) {
                    params.forEach(function(param) {
                        var name = param.name;
                        var val  = param.val;
                        xcAssert(parameters.includes(name)
                            || systemParams.hasOwnProperty(name),"Invalid name");
                        if (!parameters.includes(name)) {
                            parameters.push(name);
                        }
                        paramMap[name] = val;
                        paramMapInUsed[name] = true;
                    });
                }
            },

            updateParamMapInUsed: function() {
                var parameters = this.parameters;
                var paramMap = this.paramMap;
                var paramMapInUsed = this.paramMapInUsed;
                var deferred = jQuery.Deferred();

                for (var name in paramMapInUsed) {
                    paramMapInUsed[name] = false;
                }
                XcalarListParametersInRetina(this.name)
                .then(function(data) {
                    var params = data.parameters;
                    for (var i = 0; i < params.length; i++) {
                        var name = params[i].paramName;
                        paramMapInUsed[name] = true;
                        if (!paramMap.hasOwnProperty(name)) {
                            paramMap[name] = systemParams.hasOwnProperty(name)?
                                             systemParams[name] : null;
                        }
                        if (!parameters.includes(name)) {
                            parameters.push(name);
                        }
                    }
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            },

            allUsedParamsWithValues: function() {
                var paramMap = this.paramMap;
                var paramMapInUsed = this.paramMapInUsed;

                for (var name in paramMapInUsed) {
                    if (paramMapInUsed[name]
                        && (!paramMap.hasOwnProperty(name)
                        || paramMap[name] === null)) {
                        console.error("param not in front meta!");
                        return false;
                    }
                }
                return true;
            },

            checkParamInUse: function(paramName) {
                var str = "<" + paramName + ">";
                var paramNodes = this.parameterizedNodes;

                for (var dagNodeId in paramNodes) {
                    var dagQuery = paramNodes[dagNodeId].paramQuery || [];
                    for (var i = 0, len = dagQuery.length; i < len; i++) {
                        if (dagQuery[i].indexOf(str) >= 0) {
                            return true;
                        }
                    }
                }
                return false;
            },

            removeParameter: function(name) {
                var index = this.parameters.indexOf(name);

                xcAssert((index >= 0), "Invalid name");

                this.parameters.splice(index, 1);
                delete this.paramMap[name];
                delete this.paramMapInUsed[name];
            },

            // Function for modify schedule in the object
            getSchedule: function() {
                return this.schedule;
            },

            setSchedule: function(schedule) {
                this.schedule = schedule;
            },

            removeSchedule: function() {
                this.schedule = null;
            },

            hasSchedule: function() {
                return this.schedule != null;
            }
            <%}%>
        });

        return Dataflow<%= v %>;
    }());
    /* End of Dataflow */

    /* Start of Schedule */
    win.SchedObj<%= v %> = (function() {
        var _super = __getConstructor("SchedObj", parentVersion);
        /* Attr:
            version: <%= version %>,
            startTime: (date) schedule start time
            dateText: (string) date text
            timeText: (string) time text
            repeat: (string) repate frequency
            modified: (date) the latest time when this schedule is modified
            created: (date) the time when this schedule is created
            activeSession: (boolean)
            newTableName: (String)
            usePremadeCronString: (boolean) whether to use user defined cron
            premadeCronString: (String) cron defined by the user
        newAttr:
            isPaused: (boolean) when the schedule is paused or not
            exportTarget: (String) export target
            exportLocation: (String) path for export Location
        */
        function SchedObj<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);
            <%= addVersion %>

            if (<%= checkFunc %>(options)) {
                self.isPaused = options.isPaused || false;
                self.exportTarget = options.exportTarget || null;
                self.exportLocation = options.exportLocation || null;
            }
            return self;
        }

        __extends(SchedObj<%= v %>, _super, {
            <% if (isCurCtor) {%>
            update: function(options) {
                options = options || {};
                this.startTime = options.startTime;
                this.dateText = options.dateText;
                this.timeText = options.timeText;
                this.repeat = options.repeat;
                this.modified = options.modified;
                this.activeSession = options.activeSession;
                this.newTableName = options.newTableName;
                this.usePremadeCronString = options.usePremadeCronString;
                this.premadeCronString = options.premadeCronString;
                this.isPaused = options.isPaused || false;
                this.exportTarget = options.exportTarget || null;
                this.exportLocation = options.exportLocation || null;
            }
            <%}%>
        });
        return SchedObj<%= v %>;
    }());
    /* End of SchedObj */

    /* Query */
    win.XcQuery<%= v %> = (function() {
        var _super = __getConstructor("XcQuery", parentVersion);
        /* Attr:
            version: <%= version %>,
            name: (string) queryName
            fullName: (string) fullName
            time: (date)
            elapsedTime: (integer) time used,
            opTime: (integer) backend time used,
            type: (sring) query type
            id:  (integer) query id
            numSteps: (integer) total steps in query
            currStep: (integer) current step
            outputTableName: (string) output table
            outputTableState: (string) output table state
            queryStr: (string) query string
            sqlNum: log's id
            state: (string) enums in QueryStateT
            cancelable: (boolean) can cancel or not
            subQueries: (array, not persist) list of XcSubQuery
        */
        function XcQuery<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            if (<%= checkFunc %>(options)) {
                self.opTime = options.opTime || 0;
                self.opTimeAdded = options.opTimeAdded || false;
                self.error = options.error;
                this.indexTables = []; // used to hold reused indexed tables
            }

            return self;
        }

        __extends(XcQuery<%= v %>, _super, {
            <% if (isCurCtor) {%>
            getName: function() {
                return this.name;
            },

            getFullName: function() {
                return this.fullName;
            },

            getId: function() {
                return this.id;
            },

            getTime: function() {
                return this.time;
            },

            getElapsedTime: function() {
                return this.elapsedTime;
            },

            setElapsedTime: function() {
                this.elapsedTime = Date.now() - this.time;
            },

            addOpTime: function(time) {
                this.opTimeAdded = true;
                this.opTime += time;
            },

            setOpTime: function(time) {
                this.opTimeAdded = true;
                this.opTime = time;
            },

            getOpTime: function() {
                if (this.opTimeAdded) {
                    return this.opTime;
                } else {
                    return CommonTxtTstr.NA;
                }
            },

            getQuery: function() {
                // XXX XcalarQueryState also return the query,
                // so maybe not store it into backend?
                if (this.queryStr) {
                    return this.queryStr;
                }

                if (this.subQueries.length) {
                    var queries = "";
                    for (var i = 0; i < this.subQueries.length; i++) {
                        queries += this.subQueries[i].query + ";";
                    }
                    return queries;
                } else {
                    return "";
                }
            },

            getOutputTableName: function() {
                var subQueries = this.subQueries;
                if (this.state === QueryStatus.Done) {
                    if (this.outputTableName) {
                        return this.outputTableName;
                    }
                    if (!subQueries.length) {
                        return null;
                    } else {
                        var lastSubQuery = subQueries[subQueries.length - 1];
                        if (this.outputTableState === "exported") {
                            this.outputTableName = lastSubQuery.exportFileName;
                            return this.outputTableName;
                        } else {
                            for (var i = subQueries.length - 1; i >= 0; i--) {
                                if (subQueries[i].name.indexOf("drop") !== 0) {
                                    this.outputTableName = subQueries[i]
                                                                .dstTable;
                                    return this.outputTableName;
                                }
                            }
                            return null;
                        }
                    }
                } else {
                    return null;
                }
            },
            // excludes src tables
            getAllTableNames: function(force) {
                var self = this;
                var tables = [];
                var subQueries = self.subQueries;
                if (force || self.state === QueryStatus.Done) {
                    var droppedTables = [];
                    var finalTable = self.getOutputTableName();
                    for (var i = subQueries.length - 1; i >= 0; i--) {
                        if (!subQueries[i].dstTable) {
                            continue;
                        }
                        if (subQueries[i].name.indexOf("drop") !== 0) {
                            tables.push(subQueries[i].dstTable);
                        } else {
                            droppedTables.push(subQueries[i].dstTable);
                        }
                    }
                    // XXX will not need to do this check once backend allows
                    // tagging of dropped tables
                    for (var i = 0; i < droppedTables.length; i++) {
                        var droppedTable = droppedTables[i];
                        if (droppedTable.endsWith("drop")) {
                            droppedTable = droppedTable.slice(0,
                                                       droppedTable.length - 4);
                        }
                        var indexOfDropped = tables.indexOf(droppedTable);
                        if (indexOfDropped !== -1) {
                            tables.splice(indexOfDropped, 1);
                        }
                    }
                    var indexOfFinalTable = tables.indexOf(finalTable);
                    if (indexOfFinalTable !== -1) {
                        tables.splice(indexOfFinalTable, 1);
                        tables.splice(0, 0, finalTable);
                    }
                }
                return tables;
            },

            addIndexTable: function(tableName) {
                if (this.indexTables.indexOf(tableName) === -1) {
                    this.indexTables.push(tableName);
                }
            },

            getIndexTables: function() {
                return this.indexTables;
            },

            getOutputTableState: function() {
                if (this.state === QueryStatus.Done) {
                    return this.outputTableState;
                } else {
                    return null;
                }
            },

            addSubQuery: function(subQuery) {
                this.subQueries.push(subQuery);
            },

            getState: function() {
                return this.state;
            },

            getStateString: function() {
                return QueryStateTStr[this.state];
            },

            check: function() {
                var self = this;
                var deferred = jQuery.Deferred();
                if (self.type === "xcQuery") {
                    XcalarQueryState(self.fullName)
                    .then(function(res) {
                        // self.state = res.queryState;
                        deferred.resolve(res);
                    })
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
                return deferred.promise();
            },

            run: function() {
                if (this.state === QueryStateT.qrNotStarted) {
                    return XcalarQuery(this.fullName, this.getQuery());
                } else {
                    var error = "cannot run query that with state:" +
                                this.getStateString();
                    return PromiseHelper.reject({
                        "error": error,
                        "state": this.state
                    });
                }
            },
            <%}%>
        });

        return XcQuery<%= v %>;
    }());
    /* End of Query */

    /* Start of KVVersion */
    win.KVVersion<%= v %> = (function() {
        var _super = __getConstructor("KVVersion", parentVersion);
        /* Attr:
            version: <%= version %>,
            stripEmail: (boolean) when set true,
                        will strip email address in username
        */
        function KVVersion<%= v %>(options) {
            var self = _super.call(this, options);
            <%= addVersion %>
            return self;
        }

        return KVVersion<%= v %>;
    }());
    /* End of KVVersionV1 */
}(window));
