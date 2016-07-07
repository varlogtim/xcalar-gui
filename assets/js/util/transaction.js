window.Transaction = (function(Transaction, $) {
    var txCache = {};
    var txIdCount = 0;

    Transaction.start = function(options) {
        options = options || {};
        var msgId;
        var operation = options.operation;

        if (options.msg != null) {
            msgId = StatusMessage.addMsg({
                "msg"      : options.msg,
                "operation": operation
            });
        }

        var curId = txIdCount;
        var txLog = new TXLog({
            "msgId"    : msgId,
            "operation": operation,
            "sql"      : options.sql
        });

        txCache[curId] = txLog;

        var numSubQueries;
        if (options.steps != null) {
            if (!isNaN(options.steps) || options.steps < 1) {
                numSubQueries = options.steps;
            } else {
                numSubQueries = -1;
            }
            if (options.functionName) {
                operation += " " + options.functionName;
            }
            QueryManager.addQuery(curId, operation, numSubQueries);
        }

        txIdCount++;
        return curId;
    };

    Transaction.done = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }

        options = options || {};

        var txLog = txCache[txId];
        // add success msg
        var msgId = txLog.getMsgId();

        if (msgId != null) {
            var noNotification = options.noNotification || false;
            var tableId = options.msgTable;
            var msgOptions = options.msgOptions;

            StatusMessage.success(msgId, noNotification, tableId, msgOptions);
        }

        // add sql
        var willCommit = !options.noCommit;
        if (!options.noSql) {

            var cli = txLog.getCli();
            // if has new sql, use the new one, otherwise, use the cached one
            var sql = options.sql || txLog.getSQL();
            var title = options.title || txLog.getOperation();
            title = xcHelper.capitalize(title);

            SQL.add(title, sql, cli, willCommit);
        }

        QueryManager.queryDone(txId);

        // remove transaction
        removeTX(txId);

        // commit
        if (willCommit) {
            KVStore.commit();
        }
    };

    Transaction.fail = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }

        options = options || {};

        var txLog = txCache[txId];
        // add fail msg
        var msgId = txLog.getMsgId();
        var failMsg = options.failMsg;

        if (msgId != null) {
            StatusMessage.fail(failMsg, msgId);
        }

        // add error sql
        var error = options.error;
        var sql = options.sql || txLog.getSQL();
        var cli = txLog.getCli();
        var title = options.title || failMsg;
        if (!title) {
            title = txLog.getOperation();
        }
        title = xcHelper.capitalize(title);

        SQL.errorLog(title, sql, cli, error);
        QueryManager.fail(txId);

        // add alert(optional)
        if (!options.noAlert) {
            var alertTitle = failMsg || CommonTxtTstr.OpFail;
            Alert.error(alertTitle, error);
        }
    };

    Transaction.cancel = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }

        options = options || {};

        var txLog = txCache[txId];
        // cancel msg
        var msgId = txLog.getMsgId();
        if (msgId != null) {
            StatusMessage.cancel(msgId);
        }

        // add sql
        var cli = txLog.getCli();

        if (cli !== "") {
            // if cli is empty, no need to log
            var sql = options.sql || txLog.getSQL();
            var title = options.title || txLog.getOperation();
            title = xcHelper.capitalize(title);

            SQL.errorLog(title, sql, cli, SQLType.Cancel);
        }

        removeTX(txId);
        QueryManager.removeQuery(txId);
    };

    Transaction.log = function(txId, cli, dstTableName) {
        if (!isValidTX(txId)) {
            return;
        }

        var tx = txCache[txId];
        tx.addCli(cli);

        if (dstTableName) {
            QueryManager.subQueryDone(txId, dstTableName);
        }
    };

    Transaction.startSubQuery = function(txId, name, dstTable, query) {
        var subQueries = xcHelper.parseQuery(query);
        if (dstTable && subQueries.length === 1) {
            QueryManager.addSubQuery(txId, name, dstTable, query);
        } else if (subQueries.length) {
            for (var i = 0; i < subQueries.length; i++) {
                QueryManager.addSubQuery(txId, subQueries[i].name,
                                            subQueries[i].dstTable,
                                            subQueries[i].query, name);
            }
        }
    };

    // Transaction.errorLog = function(txId) {
    //     if (!isValidTX(txId)) {
    //         console.warn("transaction does't exist!");
    //         return;
    //     }
    // };

    function isValidTX(txId) {
        if (txId == null || !txCache.hasOwnProperty(txId)) {
            console.error("transaction does't exist!");
            return false;
        }

        return true;
    }

    function removeTX(txId) {
        delete txCache[txId];
    }

    // tx is short for transaction
    function TXLog(options) {
        this.msgId = options.msgId || null;
        this.operation = options.operation;
        this.cli = "";
        this.sql = options.sql || null;

        return this;
    }

    TXLog.prototype = {
        "getMsgId": function() {
            return this.msgId;
        },

        "getCli": function() {
            return this.cli;
        },

        "getSQL": function() {
            return this.sql;
        },

        "getOperation": function() {
            return this.operation;
        },

        "addCli": function(cli) {
            // XXX the ";" should be remove after backend change!
            this.cli += cli + ";";
        }
    };


    return (Transaction);
}({}, jQuery));
