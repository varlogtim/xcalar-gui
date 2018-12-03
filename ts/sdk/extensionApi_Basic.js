/* Note (draft):
 * This is a draft sdk api for extension writers
 * Highly recommend new writers to read the note before start
 * Basic Steps to write extensions:
 * 1. Create two files: a .ext.js file and a .ext.py,
 *    two files should have the same name.
 *
 * 1.1. (just for now): Add the .ext.js file in extensions.html
 *
 * 2. In .ext.js file, create a module,
 *    module name must be a concat of UExt and the filename.
 *    The basic structure is:
    window.UExtFileName = (function(UExtFileName) {
        UExtFileName.buttons = [
            // fill in button stucture
        ];
        UExtFileName.actionFn = function(functionName) {
            // return a XcSDK.Extension Object
        }
        return UExtFileName;
    }({}));
 *
 * 3. Call new XcSDK.Extension() to create the object,
 *    and then implement beforeStart(), start() and afterFinish
 *    interface of the extension object
 *
 * Sample: Please read hello.js as a start example
 *
 * Advanced:
 *   1. Read extensionApi_Operations.js, understand the available operation
 *
 *   2. Read promiseApi.js and uderstand how promise works
 *
 *   3. Read tableApi.js and columnApi.js to see how to show
 *      the final tables and how to customerize the columns to display.
 */

window.XcSDK = window.XcSDK || {};
if (window.XcSDK.Extension == null) {
    window.XcSDK.Extension = function() {
        return this;
    };
}

window.XcSDK.Extension.prototype = (function() {
    // inner helper function
    function deleteTempTable(txId, tableName) {
        var deferred = PromiseHelper.deferred();
        XIApi.deleteTable(txId, tableName)
        .then(function() {
            const tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                delete gTables[tableId];
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    var prototype = {
        getUsername: function() {
            return userIdName;
        },

        // user interface
        beforeStart: function() {
            // interface for user to implement
            return PromiseHelper.resolve();
        },

        start: function() {
            // interface for user to implement
            return PromiseHelper.resolve();
        },

        afterFinish: function() {
            // interface for user to implement
            return PromiseHelper.resolve();
        },

        // getter and setter function for inner attribute
        getArgs: function() {
            return this.args;
        },

        getTriggerTable: function() {
            return this.table;
        },

        getTable: function(tableName) {
            var tables = this.newTables.concat(this.table);
            for (var i = 0, len = tables.length; i < len; i++) {
                if (tables[i].getName() === tableName) {
                    return tables[i];
                }
            }
            return null;
        },

        setAttribute: function(attrName, value) {
            if (this.attrs.hasOwnProperty(attrName)) {
                var error = attrName + " already exits in extension";
                throw error;
            }

            this.attrs[attrName] = value;
        },

        getAttribute: function(attrName) {
            return this.attrs[attrName];
        },

        createUniqueCol: function(tableName, colName, onlyCheckPulledCols) {
            if (colName != null) {
                colName = colName.replace('::', '_');
            }
            var tableId = xcHelper.getTableId(tableName);
            return xcHelper.getUniqColName(tableId, colName,
                onlyCheckPulledCols);
        },

        // some helper function for table name and column name
        createTableName: function(prefix, suffix, sourceName) {
            // currently we only allow users to add prefix and suffix
            var name;
            if (sourceName != null) {
                name = xcHelper.getTableName(sourceName);
            } else {
                name = this.tableNameRoot;
            }

            if (prefix != null) {
                name = prefix + name;
            }

            if (suffix != null) {
                name = name + suffix;
            }

            name += Authentication.getHashId();

            return name;
        },

        createTempTableName: function(prefix, suffix) {
            if (prefix == null) {
                prefix = ".temp";
            } else {
                prefix = ".temp" + prefix;
            }

            return this.createTableName(prefix, suffix);
        },

        createNewTable: function(tableName) {
            var self = this;
            var newTables = self.newTables;
            for (var i = 0, len = newTables; i < len; i++) {
                if (newTables[i].name === tableName) {
                    return newTables[i];
                }
            }

            var newTable = new XcSDK.Table(tableName, self.worksheet, this.modelingMode);
            self.newTables.push(newTable);
            return newTable;
        },

        createColumnName: function() {
            return xcHelper.randName("randCol");
        },

        stripColumnName: function(colName) {
            return xcHelper.stripColName(colName);
        },

        createTempConstant: function() {
            return xcHelper.randName("tempAgg");
        },

        getConstant: function(aggName) {
            return gAggVarPrefix + aggName;
        },

        convertPrefixColumn: function(colName) {
            return xcHelper.parsePrefixColName(colName).name;
        },

        // basically execution function
        initialize: function(tableOrName, worksheet, args, modelingMode) {
            // Important: User cannot change this function!!!
            this.args = args;
            this.worksheet = worksheet;
            if (tableOrName instanceof XcSDK.Table) {
                this.table = tableOrName;
                var tableName = this.table.getName();
            } else {
                var tableName = tableOrName;
                this.table = new XcSDK.Table(tableName, worksheet, this.modelingMode);
            }
            var nameSplits = tableName.split("#");
            this.tableNameRoot = nameSplits[0];
            this.tableId = nameSplits[1];
            this.newTables = [];
            this.tempAggs = [];
            this.attrs = {};
            this.modelingMode = modelingMode || false;
        },

        dropTable: function(tableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            deleteTempTable(self.txId, tableName)
            .then(function() {
                // remove table from newTables so that runAfterFinish does not
                // try to drop the table again after extension finishes
                var i = self.newTables.findIndex(function(table) {
                    return table.getName() === tableName;
                });
                self.newTables.splice(i, 1);
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        runBeforeStart: function(extButton) {
            // Important: User cannot change this function!!!
            // it will check args to make sure all args exists
            // and then call beforeStart
            var args = this.getArgs();
            if (args == null) {
                return PromiseHelper.reject(ErrTStr.InvalidExtParam);
            }

            if (extButton != null && (extButton instanceof Array)) {
                for (var i = 0, len = extButton.length; i < len; i++) {
                    var argName = extButton[i].fieldClass;
                    if (argName != null && !args.hasOwnProperty(argName)) {
                        return PromiseHelper.reject(ErrTStr.InvalidExtParam);
                    }
                }
            }

            var deferred = this.beforeStart();
            // If a single argument is passed to jQuery.when and
            // it is not a Deferred, it will be treated as a resolved Deferred
            // and any doneCallbacks attached will be executed immediately.
            if (deferred == null || !jQuery.isFunction(deferred.promise)) {
                console.warn("The beforestart function is not a promise!");
                return jQuery.when(deferred);
            } else {
                return deferred.promise();
            }
        },

        run: function(txId) {
            // Important: User cannot change this function!!!
            if (txId == null) {
                return PromiseHelper.reject(ErrTStr.InvalidExtParam);
            }

            var self = this;
            self.txId = txId;

            var deferred = self.start();

            if (deferred == null || !jQuery.isFunction(deferred.promise)) {
                console.warn("The start function is not a promise!");
                return jQuery.when(deferred);
            } else {
                return deferred.promise();
            }
        },

        runAfterFinish: function() {
            // Important: User cannot change this function!!!
            // this will trigger afterFinish()
            // and delete all tables that starts with .temp
            var deferred = PromiseHelper.deferred();
            var afterFinishDeferred = this.afterFinish();
            var self = this;
            var txId = self.txId;
            var newTables = self.newTables;
            var tempAggs = self.tempAggs;

            if (afterFinishDeferred == null ||
                !jQuery.isFunction(afterFinishDeferred.promise))
            {
                console.warn("The afterFinish function is not a promise!");
            }

            jQuery.when(afterFinishDeferred)
            .then(function() {
                // clear .temp table
                var finalActiveTables = [];
                var finalReplaces = {};
                var promises = [];

                tempAggs.forEach(function(tempAgg) {
                    promises.push(deleteTempTable(txId, tempAgg));
                });

                for (var i = 0, len = newTables.length; i < len; i++) {
                    var xcTable = newTables[i];
                    var tableName = xcTable.getName();
                    if (tableName.startsWith(".temp")) {
                        // a paraell delete of temp table
                        // promises.push(deleteTempTable(txId, tableName));
                    } else if (xcTable.isInWorksheet()) {
                        var tablesToReplace = xcTable.getTablesToReplace();
                        if (tablesToReplace != null) {
                            finalReplaces[tableName] = tablesToReplace;
                        } else {
                            finalActiveTables.push(tableName);
                        }
                    }
                }

                PromiseHelper.when.apply(null, promises)
                .always(function() {
                    deferred.resolve(finalActiveTables, finalReplaces);
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    };

    return jQuery.extend(XcSDK.Extension.prototype, prototype);
}());
