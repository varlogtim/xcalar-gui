import * as sqlManager from "./sqlManager"

// Deprecated
export function cleanAllTables(allIds: string[], checkTime: number): JQueryPromise<any> {
    let queryArray: XcalarDeleteQuery[] = [];
    for (let i: number = 0; i < allIds.length; i++) {
        let query: XcalarDeleteQuery = {
                        "operation": "XcalarApiDeleteObjects",
                        "args": {
                            "namePattern": allIds[i] + "*",
                            "srcType": "Table"
                        }
                    };
        queryArray.push(query);
    }
    xcConsole.log("deleting: ", JSON.stringify(allIds));
    return XIApi.deleteTables(1, queryArray, checkTime);
}

// Deprecated
function finalizeTable(publishArgsList: SQLPublishInput[], cleanup: boolean,
    checkTime: number): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    let res: SQLPublishReturnMsg[] = [];
    let promiseArray: any[] = [];
    let sqlTables: string[] = [];
    publishArgsList.forEach(function(publishArgs) {
        let innerDeferred: any = PromiseHelper.deferred();

            sqlManager.convertToDerivedColAndGetSchema(publishArgs.txId,
                                                      publishArgs.importTable,
                                                      publishArgs.sqlTable)
            .then(function(schema: any): void {
                res.push({
                    table: publishArgs.publishName,
                    schema: schema,
                    xcTableName: publishArgs.sqlTable
                });
                xcConsole.log("get schema", schema);
                sqlTables.push(publishArgs.sqlTable);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
        promiseArray.push(innerDeferred.promise());
    });
    let whenCallReturned: boolean = false;
    PromiseHelper.when.apply(this, promiseArray)
    .then(function(): JQueryPromise<any> {
        whenCallReturned = true;
        if (cleanup) {
            xcConsole.log("clean up after select");
            return cleanAllTables(sqlTables, checkTime);
        }
    })
    .then(function(): void {
        deferred.resolve(res);
    })
    .fail(function() {
        if (!whenCallReturned) {
            let args: IArguments = arguments;
            let error: any = null;
            for (let i: number = 0; i < args.length; i++) {
                if (args[i] && (args[i].error ||
                    args[i] === StatusTStr[StatusT.StatusCanceled])) {
                    error = args[i];
                    break;
                }
            }
            deferred.reject(error);
        } else {
            deferred.reject.apply(this, arguments);
        }
    });
    return deferred.promise();
}

// Already deprecated
export function sqlSelect(publishNames: string[], sessionPrefix: string, cleanup: boolean,
    checkTime: number): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    let publishArgsList: SQLPublishInput[] = [];
    sqlManager.connect("localhost")
    .then(function(): JQueryPromise<any> {
        xcConsole.log("Connected. Going to workbook...");
        return sqlManager.goToSqlWkbk();
    })
    .then(function(): XcalarSelectQuery[] {
        xcConsole.log("Selecting published tables: ", publishNames);
        publishArgsList = publishNames.map(function(name) {
            return {
                sqlTable: sessionPrefix + xcHelper.randName("SQL") +
                                                    Authentication.getHashId(),
                importTable: xcHelper.randName("importTable") +
                                                    Authentication.getHashId(),
                txId: 1,
                publishName: name
            };
        });
        return sqlManager.selectPublishedTables(publishArgsList, checkTime);
    })
    .then(function(): JQueryPromise<any> {
        xcConsole.log("Finalizing tables");
        finalizeTable(publishArgsList, cleanup, checkTime)
        .then(deferred.resolve)
        .fail(function(errors: any): void {
            deferred.reject(errors[0]);
        });
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

// deprecated
function getListOfPublishedTablesFromQuery(sqlStatement: string,
    listOfPubTables: string[]): string[] {
    let pubTablesUsed: string[] = []
    for (let table of listOfPubTables) {
        let regex: RegExp = new RegExp("\\b" + table + "\\b", "i");
        if (regex.test(sqlStatement)) {
            pubTablesUsed.push(table);
        }
    }
    return pubTablesUsed;
}

// Below is for unit test
function fakeSqlSelect(func: any): any {
    sqlSelect = func;
}
function fakeCleanAllTables(func: any): any {
    cleanAllTables = func;
}

if (process.env.NODE_ENV === "test") {
    exports.fakeSqlSelect = fakeSqlSelect;
    exports.fakeCleanAllTables = fakeCleanAllTables;
}