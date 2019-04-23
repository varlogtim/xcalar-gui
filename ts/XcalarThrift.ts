const has_require: boolean = (typeof require !== "undefined" && typeof nw === "undefined");
let tHandle: ThriftHandler;

const funcFailPercentage: {[key: string]: number} = {};
const defaultFuncFailPercentage: number = 0.0;
let errorInjection: boolean = true;

namespace TypeCheck {
    export function isNumber(value: any): value is number {
        return typeof value === 'number';
    }
    export function isString(value: any): value is string {
        return typeof value === 'string';
    }
    export function isFunction(value: any): value is Function {
        return typeof value === 'function';
    }
    export function isObject(value: any): value is object {
        return typeof value === 'object';
    }
    export function isXcalarApiError(value: any): value is XcalarApiError {
        return (
            value != null && typeof value === "object" && (
                value.xcalarStatus !== 'undefined' ||
                value.httpStatus !== 'undefined' ||
                value.status !== 'undefined' ||
                value.output !== 'undefined' ||
                value.log !== 'undefined'
            )
        );
    }
}

class ThriftError {
    public status: StatusT;
    public httpStatus: number;
    public error: string;
    public log: string;
    public output: any;
}

class KeyInfo {
    public name: string;
    public type: DfFieldTypeT | string;
    public keyFieldName: string;
    public ordering: XcalarOrderingT;
    public constructor(
        {name, type, keyFieldName, ordering}: {
            name: string,
            type?: DfFieldTypeT | string,
            keyFieldName?: string,
            ordering: XcalarOrderingT}
    ) {
        this.name = name;
        this.type = type;
        this.keyFieldName = keyFieldName;
        this.ordering = ordering;
    }
}

getTHandle = function(): ThriftHandler {
    return tHandle;
};

setupThrift = function(hostname: string): void {
    if (typeof window !== 'undefined') {
        setupHostName();
        hostname = (window as any).hostname;
    } else {
        hostname = hostname + ":9090";
    }
    tHandle = xcalarConnectThrift(hostname);
};

setupHostName = function(): void {
    /*
        href example:
            protocol:/host:port/index.html?workbook=a
            protocol:/host:port/subFolder/index.html?workbook=a
            protocol:/host:port/?workbook=a
            protocol:/host:port/subFolder/?workbook=a
    */
    let hostname: string = (window as any).hostname;
    if (hostname == null || hostname === "") {
        hostname = window.location.href;
        if (hostname.lastIndexOf(".html") > -1) {
            const index: number = hostname.lastIndexOf("/");
            hostname = hostname.substring(0, index);
        } else if (hostname.lastIndexOf("/?") > -1) {
            const index: number = hostname.lastIndexOf("/?");
            hostname = hostname.substring(0, index);
        }
    }
    // protocol needs to be part of hostname
    // If not it's assumed to be http://
    const protocol: string = window.location.protocol;

    // If you have special ports, it needs to be part of the hostname
    if (protocol.startsWith("http") && !hostname.startsWith(protocol)) {
        hostname = "https://" + hostname.split("://")[1];
    }

    // If host name ends with a trailing /, remove it because it gets added
    // later in XcalarApi.js
    if (hostname.charAt(hostname.length - 1) === "/") {
        hostname = hostname.substring(0, hostname.length-1);
    }
    (window as any).hostname = hostname;

    if ((window as any).planServer == null ||
        (window as any).planServer === "") {
        (window as any).planServer = hostname + "/sql";
    }

    if ((window as any).jupyterNotebooksPath == null ||
        (window as any).jupyterNotebooksPath === "") {
        // window.jupyterNotebooksPath = "var/opt/xcalar/jupyterNotebooks/";
        (window as any).jupyterNotebooksPath = "jupyterNotebooks/";
    }
};

// ========================== HELPER FUNCTIONS ============================= //
// called if a XcalarThrift.js function returns an error
function thriftLog(
    errorTitle: string,
    ...errResList: (XcalarApiError | number | string) []
): ThriftError {
    const oldHttpStatus: any = httpStatus;
    const errorLists: ThriftError[] = [];
    const title: string = errorTitle || "thrift call";
    // check all errors
    for (let errRes of errResList) {
        if (errRes == null) {
            continue;
        }
        let error: string = null;
        // Error from other thriftLog output or caused by Xcalar operation fails
        let status: StatusT | number = null;
        // Exist with xcalarStatus
        let log: string = null;
        // Error caused by http connection fails
        let httpStatus: number = null;
        var output: any = null;

        if (TypeCheck.isNumber(errRes)) {
            // case that didn't handled in xcalarApi.js
            status = errRes;
        } else if (TypeCheck.isXcalarApiError(errRes)) {
            // Return by other thriftLog output XcalarApi.js
            status = (errRes.status != null)
                        ? errRes.status
                        : errRes.xcalarStatus;
            if (status === StatusT.StatusUdfExecuteFailed) {
                log = parseUDFLog(errRes.log);
            } else {
                log = parseLog(errRes.log);
            }
            httpStatus = errRes.httpStatus;
            output = errRes.output;
        } else {
            // when error is string, Manually defined in xcalarThrift.js
            error = errRes as string;
        }


        if (status == null && httpStatus == null && error == null) {
            // console.log("not an error");
            // not an error
            continue;
        }

        let msg: string;

        if (status != null) {
            // special case when error is Success
            if (status === StatusT.StatusOk) {
                error = "Unknown Error";
            } else {
                error = StatusTStr[status];
            }
            msg = title + " failed with status " + status + " : " +
                    StatusTStr[status];
        } else if (httpStatus != null) {
            error = "Proxy Error with http status code: " + httpStatus;
            msg = title + " failed with network exception. Http status : " +
                    httpStatus;
        } else {
            msg = title + " failed: " + error;
        }

        if (status !== StatusT.StatusCanceled) {
            console.error('(╯°□°）╯︵ ┻━┻', msg);
        }

        const thriftError: ThriftError = new ThriftError();
        thriftError.status = status;
        thriftError.httpStatus = httpStatus;
        thriftError.error = "Error: " + error;
        thriftError.log = log;
        thriftError.output = output;
        errorLists.push(thriftError);

        if (has_require) {
            return thriftError;
        } else if (status === StatusT.StatusOk || httpStatus === 0) {
            XcSupport.checkConnection();
            return thriftError;
        } else if (httpStatus === oldHttpStatus.Unauthorized) {
            HTTPService.Instance.error(httpStatus);
            return thriftError;
        } else {
            // XXX We might need to include connection status 502 (Proxy error)
            if (status === StatusT.StatusConnReset ||
                status === StatusT.StatusConnRefused) {
                // This is bad, connection was lost so UI cannot do anything
                // LOCK THE SCREEN
                if (!xcManager.isInSetup()) {
                    // set up time has it's own handler
                    const alertError = {"error": ThriftTStr.CCNBE};
                    Alert.error(ThriftTStr.CCNBEErr, alertError, {
                        "lockScreen": true
                    });
                }

                Log.backup();
                return thriftError;
            }
        }
    }

    // case other than connection reset and no mem,
    // return first error
    return errorLists.length ? errorLists[0] : new ThriftError();

}

function parseLog(log: string): string {
    if (!log) {
        return log;
    }
    let res: string = log;
    const splits = log.split(/Line \d+:/);
    if (splits.length === 2) {
        res = splits[1].trim();
    }
    res = res.replace(/\\n/g, "\n"); // turn "\n" string into new line char
    return res;
}

function parseUDFLog(log: string): string {
    let res: string = log;
    try {
        const match: string[] = res.match(/ValueError:(.+)/);
        if (match && match.length >= 2) {
            res = match[1].trim();
            res = res.split('\\n')[0]; // strip ending unuseful chars
            if (res.endsWith("\\")) {
                res = res.substring(0, res.length - 1);
            }
            res = res.replace(/\\n/g, "\n"); // turn "\n" string into new line char
            return res;
        }
        res = res.replace(/\\n/g, "\n"); // turn "\n" string into new line char
    } catch (e) {
        console.error("parse error", e);
    }

    return res;
}

function fakeApiCall<T>(ret?: T): XDPromise<T> {
    return PromiseHelper.resolve(ret? ret: {});
}

function parseWorkbookId(res: any): string {
    let sessionId: string = null;
    try {
        sessionId = res.output.outputResult.sessionNewOutput.sessionId;
    } catch (e) {
        console.error(e);
    }
    return sessionId;
}
function parseDS(dsName: string): string {
    return (gDSPrefix + dsName);
}

function indexKeyMap(keyInfo: KeyInfo): XcalarApiKeyT {
    return new XcalarApiKeyT({
        name: keyInfo.name,
        type: DfFieldTypeTStr[keyInfo.type],
        keyFieldName: keyInfo.keyFieldName,
        ordering: XcalarOrderingTStr[keyInfo.ordering]
    });
}

function colInfoMap(colInfo: ColRenameInfo) {
    var map = new XcalarApiColumnT();
    map.sourceColumn = colInfo.orig;
    map.destColumn = colInfo.new;
    map.columnType = DfFieldTypeTStr[colInfo.type];
    return map;
}

// XXX hack way to add the key, should use a better way
function addKeyAttrToQuery(query: string, key: string[][]): string {
    if (key == null) {
        return query;
    }
    try {
        let parsedQuery = JSON.parse(query);
        parsedQuery.args.key = key;
        query = JSON.stringify(parsedQuery);
    } catch(e) {
        console.error(e);
    }
    return query;
}
// Should check if the function returns a promise
// but that would require an extra function call
if (!has_require) {
    (window as any).Function.prototype.bind = function(): Function {
        const fn: Function = this;
        const args: any[] = Array.prototype.slice.call(arguments);
        const obj: Function = args.shift();
        return (function() {
            return (fn.apply(obj,
                    args.concat(Array.prototype.slice.call(arguments))));
        });
    };
}

function fetchDataHelper(
    resultSetId: string,
    rowPosition: number,
    rowsToFetch: number,
    totalRows: number,
    data: any[],
    tryCnt: number
): XDPromise<any[]> {
    const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
    // row position start with 0
    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function() {
        return XcalarGetNextPage(resultSetId, rowsToFetch);
    })
    .then(function(tableOfEntries) {
        const values: any[] = tableOfEntries.values;
        const numValues: number = tableOfEntries.numValues;
        let numStillNeeds: number = 0;

        if (numValues < rowsToFetch) {
            if (rowPosition + numValues >= totalRows) {
                numStillNeeds = 0;
            } else {
                numStillNeeds = rowsToFetch - numValues;
            }
        }

        values.forEach(function(value) {
            data.push(value);
        });

        if (numStillNeeds > 0) {
            console.info("fetch not finish", numStillNeeds);
            if (tryCnt >= 20) {
                console.warn("Too may tries, stop");
                return PromiseHelper.resolve();
            }

            let newPosition: number;
            if (numStillNeeds === rowsToFetch) {
                // fetch 0 this time
                newPosition = rowPosition + 1;
                console.warn("cannot fetch position", rowPosition);
            } else {
                newPosition = rowPosition + numValues;
            }

            return XcalarFetchData(resultSetId, newPosition, numStillNeeds,
                                totalRows, data, tryCnt + 1);
        }
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function checkForDatasetLoad(
    def: XDDeferred<any>,
    sqlString: string,
    dsName: string,
    txId: number
): void {
    // Using setInterval will have issues because of the deferred
    // GetDatasets call inside here. Do not use it.
    function checkIter(
        def1: XDDeferred<{}>,
        sqlString1: string,
        dsName1: string,
        txId1: number
    ): void {
        XcalarGetDatasets()
        .then(function(ret) {
            let loadDone = false;
            let nameNodeFound = false;
            ret = ret.datasets;
            for (var i = 0; i < ret.length; i++) {
                if (ret[i].name === dsName1) {
                    nameNodeFound = true;
                    if (ret[i].loadIsComplete) {
                        loadDone = true;
                    } else {
                        break;
                    }
                }
            }
            if (!nameNodeFound) {
                // The load FAILED because the dag node is gone
                const thriftError: ThriftError = thriftLog("XcalarLoad failed!");
                def1.reject(thriftError);
            } else {
                if (loadDone) {
                    Transaction.log(txId1, sqlString1, parseDS(dsName1));
                    def1.resolve({});
                } else {
                    setTimeout(checkIter.bind(null, def1, sqlString1,
                                              dsName1, txId1), 1000);
                }
            }
        });
    }

    setTimeout(checkIter.bind(null, def, sqlString, dsName, txId),
               1000);
}

function parseLoadError(error: object): object | string {
    let res: string | object = error;
    try {
        res = error['errorString'];
        // check  if has XcalarException
        let match: string[] = (res as string).match(/XcalarException:(.+)/);
        if (match && match.length >= 2) {
            const resNum: number = parseInt(match[1].trim());
            if (StatusTStr[resNum] != null) {
                return StatusTStr[resNum];
            }
        }

        // check if has ValueError
        match = (res as string).match(/ValueError:(.+)/);
        if (match && match.length >= 2) {
            res = match[1].trim();
            res = res.split('\n')[0]; // strip ending unuseful chars
            return res;
        }
    } catch (e) {
        console.error("parse error", e);
    }

    return res;
}
// ======================== ERROR INJECTION TESTING =========================//
function getFailPercentage(funcName: string): number {
    if (funcFailPercentage.hasOwnProperty(funcName)) {
        return (funcFailPercentage[funcName]);
    } else {
        return (defaultFuncFailPercentage);
    }
}

function insertError(
    argCallee: Function,
    deferred: any
): boolean {
    if (errorInjection) {
        let functionName: string = argCallee.toString()
                           .substr('function '.length);
        functionName = functionName.substr(0, functionName.indexOf('('));
        const failPercent: number = getFailPercentage(functionName);
        if (Math.random() < failPercent) {
            // FAILED!
            const waitTime: number = Math.floor(Math.random() * 10000);
            console.log("WaitTime is ", waitTime, "ms");
            setTimeout(function(): void {
                deferred.reject(thriftLog(functionName,
                                          "Error Injection"));
            }, waitTime);
            return (true);
        }
    }
    return (false);
}

// ========================= MAIN FUNCTIONS  =============================== //
XcalarGetVersion = function(
    connectionCheck: boolean
): XDPromise<XcalarApiGetVersionOutputT | {}> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiGetVersionOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetVersion(tHandle)
    .then(deferred.resolve)
    .fail(function(error: XcalarApiError) {
        if (connectionCheck) {
            // don't call thriftLog or else it may call XcalarGetVersion again
            deferred.reject("ConnectionCheck Failed", error);
        } else {
            deferred.reject(thriftLog("XcalarGetVersion()", error));
        }
    });

    return deferred.promise();
};

XcalarGetLicense = function(): XDPromise<proto.xcalar.compute.localtypes.License.GetResponse> {
    return PromiseHelper.convertToJQuery(Xcrpc.getClient("DEFAULT")
                                              .getLicenseService().getLicense());
};

XcalarUpdateLicense = function(
    newLicense: string
): XDPromise<void> {
    return PromiseHelper.convertToJQuery(Xcrpc.getClient("DEFAULT")
                        .getLicenseService().updateLicense(newLicense));
};

XcalarGetNodeName = function(
    nodeId: number
): XDPromise<string | {}> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<string> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetIpAddr(tHandle, nodeId)
    .then(function(ret) {
        deferred.resolve(ret.ipAddr);
    })
    .fail(function(error: XcalarApiError) {
        const thriftError: ThriftError = thriftLog("XcalarGetNodeName", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

interface XcalarPreviewOutput {
    fileName: string,
    relPath: string,
    fullPath: string,
    base64Data: string,
    thisDataSize: number,
    totalDataSize: number,
    buffer: string
}
/*
 * sourceArgs:
 *  targetName: "Default Shared Root"
 *  path: some path
 *  fileNamePattern: ""
 *  recursive: false
 */
XcalarPreview = function(
    sourceArgs: XcalarApiPreivewInputSource,
    numBytesRequested: number,
    offset: number
): XDPromise<XcalarPreviewOutput | {}> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (offset == null) {
        offset = 0;
    }

    const deferred: XDDeferred<XcalarPreviewOutput> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (sourceArgs.fileNamePattern == null) {
        sourceArgs.fileNamePattern = "";
    }
    if (!(sourceArgs.recursive === true)) {
        sourceArgs.recursive = false;
    }

    xcalarPreview(tHandle, sourceArgs, numBytesRequested, offset)
    .then(function(ret) {
        // previewOutput has a jsonOutput field which is a json formatted string
        // which has several fields of interest:
        // {"fileName" :
        //  "relPath" :
        //  "fullPath" :
        //  "base64Data" :
        //  "thisDataSize" :
        //  "totalDataSize" :
        //  }
        let retStruct: XcalarPreviewOutput;
        try {
            retStruct = JSON.parse(ret.outputJson);
            const decoded = Base64.decode(retStruct.base64Data);
            // var decoded = atob(retStruct.base64Data);
            retStruct.buffer = decoded;
            deferred.resolve(retStruct);
        } catch (error) {
            console.error(error.stack);
            const thriftError: ThriftError = thriftLog("XcalarPreview", error);
            deferred.reject(thriftError);
        }
    })
    .fail(function(error: XcalarApiError) {
        if (error && error.log) {
            error.log = error.log.replace(/\\n/g, "\n");
        }
        const thriftError: ThriftError = thriftLog("XcalarPreview", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

interface XcalarLoadInputOptions {
    sources?: any[],
    format?: string,
    fieldDelim?: string,
    recordDelim?: string,
    hasHeader?: boolean,
    moduleName?: string,
    funcName?: string,
    quoteChar?: string,
    skipRows?: number,
    typedColumns?: any[],
    schemaMode?: CsvSchemaModeT,
    udfQuery?: object,
    advancedArgs?: object
}

/* Helper function
 * options (example):
    {
        "sources": [{
            "targetName": "Default Shared Root",
            "path": "..",
            "recursive": false,
            "fileNamePattern": "Default Shared Root"
        }, ...],
        "format": "CSV",
        "fieldDelim": "",
        "recordDelim": "\n",
        "hasHeader": false, // Deprecated
        "schemaMode": CsvSchemaModeT.[CsvSchemaModeNoneProvided|CsvSchemaModeUseHeader|CsvSchemaModeUseLoadInput]
        "moduleName": udfModule,
        "funcName": udfFunc,
        "quoteChar": gDefaultQDelim,
        "skipRows": 0,
        "udfQuery": udfQuery,
        "typedColumns": [
            {
                "colName": "foo",
                "colType": [DfString|DfFloat64|DfInt64]
            }, ...
        ]
    }
 */
XcalarParseDSLoadArgs = function(options: XcalarLoadInputOptions): {
    sourceArgsList: DataSourceArgsT[],
    parseArgs: ParseArgsT,
    size: number
} {
    try {
        options = options || {};

        const sources: any[] = options.sources;
        const format: string = options.format;
        let fieldDelim: string = options.fieldDelim;
        let recordDelim: string = options.recordDelim;
        const hasHeader: boolean = options.hasHeader === true ? true: false;
        const moduleName: string = options.moduleName;
        const funcName: string = options.funcName;
        const quoteChar: string = options.quoteChar;
        let skipRows: number = options.skipRows;
        let typedColumns: any[] = options.typedColumns || [];
        let schemaMode: CsvSchemaModeT | string;

        if (format === "CSV" && typedColumns.length) {
            schemaMode = CsvSchemaModeT.CsvSchemaModeUseLoadInput;
            typedColumns = typedColumns.map(function(col) {
                const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(col.colType);
                return new XcalarApiColumnT({
                    columnType: DfFieldTypeTStr[type],
                    sourceColumn: col.colName,
                    destColumn: col.colName
                });
            });

            if (hasHeader) {
                skipRows++;
            }
        } else if (options.hasOwnProperty("hasHeader")) {
            schemaMode = (options.hasHeader) ?
                        CsvSchemaModeT.CsvSchemaModeUseHeader :
                        CsvSchemaModeT.CsvSchemaModeNoneProvided;
        } else {
            schemaMode = options.schemaMode;
        }

        schemaMode = CsvSchemaModeTStr[schemaMode];

        let parserFnName: string;
        let parserArgJson: object = {};
        if (moduleName !== "" && funcName !== "") {
            // udf case
            parserFnName = moduleName + ":" + funcName;
            if (options.udfQuery && TypeCheck.isObject(options.udfQuery)) {
                parserArgJson = options.udfQuery;
            }
        } else {
            // csv args
            // {
            //     "recordDelim": recordDelim,
            //     "quoteDelim": quoteDelim,
            //     "linesToSkip": linesToSkip,
            //     "fieldDelim": fieldDelim,
            //     "isCRLF": isCrlf,
            //     "hasHeader": hasHeader,
            // }
            switch (format) {
                case ("JSON"):
                    parserFnName = "default:parseJson";
                    break;
                case ("TEXT"):
                    // recordDelim = "\n";
                    // No field delim
                    fieldDelim = ""; // jshint ignore:line
                    // fallthrough
                case ("CSV"):
                    parserFnName = "default:parseCsv";
                    parserArgJson['recordDelim'] = recordDelim;
                    parserArgJson['fieldDelim'] = fieldDelim;
                    parserArgJson['isCRLF'] = false;
                    parserArgJson['linesToSkip'] = skipRows;
                    parserArgJson['quoteDelim'] = quoteChar;
                    parserArgJson['hasHeader'] = hasHeader;
                    parserArgJson['schemaFile'] = ""; // Not used yet. Wait for backend to implement;
                    parserArgJson['schemaMode'] = schemaMode;
                    break;
                default:
                    console.error("Error Format");
                    return null;
            }
        }

        const sourceArgsList: DataSourceArgsT[] = sources.map(function(source) {
            const sourceArgs: DataSourceArgsT = new DataSourceArgsT();
            sourceArgs.targetName = source.targetName;
            sourceArgs.path = source.path;
            sourceArgs.fileNamePattern = source.fileNamePattern || "";
            sourceArgs.recursive = source.recursive || false;
            return sourceArgs;
        });

        const parseArgs: ParseArgsT = new ParseArgsT();
        parseArgs.parserFnName = parserFnName;
        parseArgs.parserArgJson = JSON.stringify(parserArgJson);
        const advancedArgs = options.advancedArgs || {};
        parseArgs.allowRecordErrors = advancedArgs['allowRecordErrors'] || false;
        parseArgs.allowFileErrors = advancedArgs['allowFileErrors'] || false;
        parseArgs.fileNameFieldName = advancedArgs['fileName'] || "";
        parseArgs.recordNumFieldName = advancedArgs['rowNumName'] || "";
        parseArgs.schema = typedColumns;

        const maxSampleSize: number = gMaxSampleSize;
        if (maxSampleSize > 0) {
            console.log("Max sample size set to: ", maxSampleSize);
        }

        return {
            sourceArgsList: sourceArgsList,
            parseArgs: parseArgs,
            size: maxSampleSize
        };
    } catch (e) {
        console.error(e);
        return null;
    }
};



XcalarDatasetCreate = function(
    datasetName: string,
    options: XcalarLoadInputOptions
) {

    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    const args = XcalarParseDSLoadArgs(options);
    if (args == null) {
        return PromiseHelper.reject({error: "Error Parse Args"});
    }

    xcalarDatasetCreate(tHandle, datasetName, args.sourceArgsList, args.parseArgs, args.size)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarDatasetCreate", error);
       deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarDatasetRestore = function(
    datasetName: string,
    args: any
) {

    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const sourceArgsList: DataSourceArgsT[] = args.sourceArgsList.map(function(source) {
        const sourceArgs: DataSourceArgsT = new DataSourceArgsT();
        sourceArgs.targetName = source.targetName;
        sourceArgs.path = source.path;
        sourceArgs.fileNamePattern = source.fileNamePattern || "";
        sourceArgs.recursive = source.recursive || false;
        return sourceArgs;
    });

    const parseArgs: ParseArgsT = new ParseArgsT();
    parseArgs.parserFnName = args.parseArgs.parserFnName;
    parseArgs.parserArgJson = args.parseArgs.parserArgJson;
    parseArgs.allowRecordErrors = args.parseArgs.allowRecordErrors;
    parseArgs.allowFileErrors = args.parseArgs.allowFileErrors;
    parseArgs.fileNameFieldName = args.parseArgs.fileNameFieldName;
    parseArgs.recordNumFieldName = args.parseArgs.recordNumFieldName;
    parseArgs.schema = args.parseArgs.schema.map((col) => {
        return new XcalarApiColumnT({
            columnType: col.columnType,
            sourceColumn: col.sourceColumn,
            destColumn: col.destColumn
        });
    });

    const maxSampleSize: number = gMaxSampleSize;
    if (maxSampleSize > 0) {
        console.log("Max sample size set to: ", maxSampleSize);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    xcalarDatasetCreate(tHandle, datasetName, sourceArgsList, parseArgs, maxSampleSize)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarDatasetRestore", error);
       deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarDatasetActivate = function(
    datasetName: string,
    txId: number
): XDPromise<any> {
    return XcalarDatasetLoad(datasetName, null, txId);
};

XcalarDatasetLoad = function(
    datasetName: string,
    options: XcalarLoadInputOptions,
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    let def: XDPromise<any>;
    let args = {sourceArgsList: null, parseArgs: null, size: null};
    if (options != null) {
        args = XcalarParseDSLoadArgs(options);
    }
    if (args == null) {
        return PromiseHelper.reject({error: "Error Parse Args"});
    }

    const dsName: string = parseDS(datasetName);
    const workItem: WorkItem = xcalarLoadWorkItem(dsName, args.sourceArgsList, args.parseArgs, args.size);
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarLoad(tHandle, dsName, args.sourceArgsList, args.parseArgs, args.size);
    }
    const query: string = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, "Import Dataset", dsName, query);
    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dsName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        if (error && error.log) {
            error.log = error.log.replace(/\\n/g, "\n");
        }
        const thriftError: ThriftError = thriftLog("XcalarLoad", error);
        if (has_require) {
            deferred.reject(thriftError);
        } else if (thriftError.httpStatus != null) {
            // 502 = Bad Gateway server error
            // Thrift time out
            // Just pretend like nothing happened and quietly listDatasets
            // in intervals until the load is complete. Then do the ack/fail
            checkForDatasetLoad(deferred, query, datasetName, txId);
        } else {
            let loadError: string = null;
            if (thriftError.output && thriftError.output.errorString) {
                // This has a valid error struct that we can use
                console.error("error in import", thriftError.output);
                loadError = xcStringHelper.replaceMsg(DSTStr.LoadErr, {
                    "error": parseLoadError(thriftError.output)
                });

                if (thriftError.output.errorFile) {
                    loadError = xcStringHelper.replaceMsg(DSTStr.LoadErrFile, {
                        "file": thriftError.output.errorFile
                    }) + "\n" + loadError;
                }
            }
            deferred.reject(thriftError, loadError);
        }
    });

    return deferred.promise();
};

XcalarDatasetDeactivate = function(
    datasetname: string,
    txId: number
): XDPromise<void> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    const dsNameBeforeParse: string = datasetname;
    const dsName: string = parseDS(datasetname);

    releaseAllResultsets()
    .then(function() {
        const promise = xcalarDeleteDagNodes(tHandle, dsName, SourceTypeT.SrcDataset);
        return PromiseHelper.alwaysResolve(promise);
    })
    .then(function() {
        return xcalarDatasetUnload(tHandle, dsName);
    })
    .then(function() {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            deferred.resolve();
        }
    })
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarDatasetDeactivate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();

    function releaseAllResultsets(): XDPromise<void> {
        // always resolve to continue the deletion
        const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();

        XcalarGetDatasetMeta(dsNameBeforeParse)
        .then(function(res) {
            if (res && res.resultSetIds) {
                const resultSetIds: string[] = res.resultSetIds;
                const promises: XDPromise<StatusT>[] = [];
                for (let i = 0; i < resultSetIds.length; i++) {
                    promises.push(XcalarSetFree(resultSetIds[i]));
                }
                return PromiseHelper.when.apply(this, promises);
            }
        })
        .then(innerDeferred.resolve)
        .fail(innerDeferred.resolve);

        return innerDeferred.promise();
    }
};

XcalarDatasetDelete = function(
    datasetName: string,
    txId: number
): XDPromise<void> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }

    const deferred: XDDeferred<void> = PromiseHelper.deferred();
    const dsName: string = parseDS(datasetName);

    xcalarDatasetDelete(tHandle, dsName)
    .then(function() {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            deferred.resolve();
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDatasetDelete", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

XcalarDatasetGetLoadArgs = function(datasetName: string) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    const dsName: string = parseDS(datasetName);
    xcalarDatasetGetMeta(tHandle, dsName)
    .then((res) => {
        deferred.resolve(res.datasetMeta);
    })
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarDatasetGetLoadArgs", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

XcalarDatasetDeleteLoadNode = function(datasetName: string, wkbkName: string): XDPromise<void> {
    const deferred: XDDeferred<void> = PromiseHelper.deferred();
    const currentSession: string = sessionName;
    setSessionName(wkbkName);

    XcalarGetDSNode(datasetName)
    .then((res: {nodeInfo: {name: string}[]}) => {
        try {
            const promises = [];
            const dsName: string = parseDS(datasetName);
            res.nodeInfo.forEach((nodeInfo) => {
                if (nodeInfo.name === datasetName) {
                    setSessionName(wkbkName);
                    let promise = xcalarDeleteDagNodes(tHandle, dsName, SourceTypeT.SrcDataset);
                    setSessionName(currentSession);
                    promises.push(promise);
                }
            });
            return PromiseHelper.when(...promises);
        } catch (e) {
            console.error(e);
        }
    })
    .then(deferred.resolve)
    .fail((error) => {
        const thriftError: ThriftError = thriftLog("XcalarDatasetDeleteLoadNode", error);
        deferred.reject(thriftError);
    });

    setSessionName(currentSession);
    return deferred.promise();
}

XcalarAddLocalFSExportTarget = function(
    targetName: string,
    path: string,
    txId: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    const target: ExExportTargetT = new ExExportTargetT();
    target.hdr = new ExExportTargetHdrT();
    target.hdr.name = targetName;
    target.hdr.type = ExTargetTypeT.ExTargetSFType;
    target.specificInput = new ExAddTargetSpecificInputT();
    target.specificInput.sfInput = new ExAddTargetSFInputT();
    target.specificInput.sfInput.url = "/" + path;

    xcalarAddExportTarget(tHandle, target)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarAddExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarAddUDFExportTarget = function(
    targetName: string,
    path: string,
    udfName: string,
    txId: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    const target: ExExportTargetT = new ExExportTargetT();
    target.hdr = new ExExportTargetHdrT();
    target.hdr.name = targetName;
    target.hdr.type = ExTargetTypeT.ExTargetUDFType;
    target.specificInput = new ExAddTargetSpecificInputT();
    target.specificInput.udfInput = new ExAddTargetUDFInputT();
    target.specificInput.udfInput.url = "/" + path;
    target.specificInput.udfInput.appName = udfName;

    xcalarAddExportTarget(tHandle, target)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarAddExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarRemoveExportTarget = function(
    targetName: string,
    targetType: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    const hdr = new ExExportTargetHdrT();
    hdr.name = targetName;
    hdr.type = targetType;

    xcalarRemoveExportTarget(tHandle, hdr)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarRemoveExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// typePattern: "*", "file", "udf"
XcalarListExportTargets = function(
    typePattern: string,
    namePattern: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    // var workItem = xcalarListExportTargetsWorkItem(typePattern, namePattern);
    xcalarListExportTargets(tHandle, typePattern, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListExportTargets", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarExport = function(
    tableName: string,
    driverName: string,
    driverParams: {},
    columns: XcalarApiExportColumnT[],
    exportName: string,
    txId?: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var workItem = xcalarExportWorkItem(tableName, driverName, driverParams, columns, exportName);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarExport(tHandle, tableName, driverName, driverParams, columns, exportName);
    }
    let query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'export', exportName, query);

    def
    .then(function(ret) {
        Transaction.log(txId, query, exportName, ret.timeElapsed);
        deferred.resolve(ret);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarExport", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/** Creates a driver for a target. Similar to uploadUdf call.
 * @param driverName Name of the driver
 * @param driverSource Source code (python) of the driver
 */
XcalarDriverCreate = function(
    driverName: string,
    driverSource: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDriverCreate(tHandle, driverName, driverSource)
    .then(deferred.resolve)
    .fail(function (error) {
        var thriftError = thriftLog("XcalarDriverCreate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/** Deletes a driver for a target.
 * @param driverName Name of the driver
 */
XcalarDriverDelete = function(
    driverName: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDriverDelete(tHandle, driverName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDriverDelete", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/** Lists all drivers for targets.
 */
XcalarDriverList = function(): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDriverList(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDriverList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarIndexFromDataset = function(
    datasetName: string,
    key: string,
    tableName: string,
    prefix: any,
    txId: number
): XDPromise<XcalarApiNewTableOutputT> {
    // Note: datasetName must be of the form username.hashId.dsName
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    datasetName = parseDS(datasetName);
    let dhtName: string = ""; // Index dataset can only use empty dhtName

    const keyInfo: XcalarApiKeyT = indexKeyMap({
        name: key,
        type: DfFieldTypeT.DfUnknown,
        keyFieldName: "",
        ordering: XcalarOrderingT.XcalarOrderingUnordered
    });
    const keyArray = [keyInfo];
    const workItem = xcalarIndexWorkItem(datasetName, tableName, keyArray,
                                        prefix, dhtName);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarIndex(tHandle, datasetName, tableName, keyArray,
                          prefix, dhtName);
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, "index from DS", tableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, tableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarIndexFromDataset", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// keys example:
// [{name: "review_count", ordering: XcalarOrderingT.XcalarOrderingAscending}]
XcalarIndexFromTable = function(
    srcTablename: string,
    keys: {
        name: string,
        type: ColumnType,
        keyFieldName: string,
        ordering: XcalarOrderingT
    }[],
    dstTableName: string,
    dhtName: string,
    txId: number
): XDPromise<{ ret?: XcalarApiNewTableOutputT, newKeys?: any[] }>{
    const deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    let query: string;
    let newKeys: any[] = [];

    if (!(keys instanceof Array)) {
        keys = [keys];
    }

    dhtName = dhtName || "";
    const isFakeApiCall = Transaction.isSimulate(txId);
    // XXX TODO, remove the dependencise of xcHelper
    xcHelper.getKeyInfos(keys, srcTablename, isFakeApiCall)
    .then(function(keyInfos: KeyInfo[]) {
        const keyArray = keyInfos.map(function(keyInfo) {
            newKeys.push(keyInfo['keyFieldName']);
            return indexKeyMap(keyInfo);
        });
        const workItem = xcalarIndexWorkItem(srcTablename,
                                           dstTableName, keyArray, "", dhtName);
        let def: XDPromise<any>;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            if ([null, undefined].indexOf(tHandle) !== -1) {
                return PromiseHelper.resolve(null);
            }
            def = xcalarIndex(tHandle, srcTablename, dstTableName,
                              keyArray, "", dhtName);
        }
        query = XcalarGetQuery(workItem);
        if (txId) {
            Transaction.startSubQuery(txId, "index", dstTableName, query);
        }
        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId) {
                Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            }
            deferred.resolve({
                ret: ret,
                newKeys: newKeys
            });
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarIndexFromTable", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarDeleteTable = function(
    tableName: string,
    txId?: number,
    isRetry?: boolean,
    deleteCompletely?: boolean
): XDPromise<XcalarApiDeleteDagNodeOutputT> {
    const deferred: XDDeferred<XcalarApiDeleteDagNodeOutputT> = PromiseHelper.deferred();

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    const workItem = xcalarDeleteDagNodesWorkItem(tableName,
                                        SourceTypeT.SrcTable, deleteCompletely);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarDeleteDagNodes(tHandle, tableName, SourceTypeT.SrcTable,
                                   deleteCompletely);
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'drop table', tableName + "drop", query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            // txId may be null if deleting an undone table or performing a
            // deletion not triggered by the user (i.e. clean up)
            if (txId != null) {
                Transaction.log(txId, query, tableName + "drop", ret.timeElapsed);
            }
            if (typeof MonitorGraph !== "undefined") {
                MonitorGraph.tableUsageChange();
            }
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDeleteTable", error);
        if (!isRetry && thriftError.status === StatusT.StatusDgNodeInUse) {
            forceReleaseTable(error.output)
            .then(function() {
                return XcalarDeleteTable(tableName, txId, true);
            })
            .then(deferred.resolve)
            .fail(function() {
                deferred.reject(thriftError);
            });
        } else if (thriftError.status === StatusT.StatusDagNodeNotFound) {
            // if not found, then doesn't exist so it's essentially deleted
            deferred.resolve();
        } else {
            deferred.reject(thriftError);
        }
    });

    return deferred.promise();
};

XcalarDeleteConstants = function(
    constantPattern: string,
    txId: number
): XDPromise<XcalarApiDeleteDagNodeOutputT> {
    const deferred: XDDeferred<XcalarApiDeleteDagNodeOutputT> = PromiseHelper.deferred();

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    const workItem = xcalarDeleteDagNodesWorkItem(constantPattern,
                                                SourceTypeT.SrcConstant);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarDeleteDagNodes(tHandle, constantPattern,
                                    SourceTypeT.SrcConstant);
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'drop constants',
                              constantPattern + "drop", query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId != null) {
                Transaction.log(txId, query, constantPattern + "drop",
                                ret.timeElapsed);
            }
            if (typeof MonitorGraph !== "undefined") {
                MonitorGraph.tableUsageChange();
            }
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeleteConstants", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

function forceReleaseTable(deleteOutput: any): XDPromise<any> {
    try {
        const promises: XDPromise<StatusT>[] = [];
        deleteOutput.statuses.forEach(function(status) {
            status.refs.forEach(function(ref) {
                promises.push(XcalarSetFree(ref.xid));
            });
        });
        return PromiseHelper.when.apply(this, promises);
    } catch (e) {
        console.error(e);
        return PromiseHelper.reject();
    }
}

XcalarRenameTable = function(
    oldTableName: string,
    newTableName: string,
    txId: number
): XDPromise<StatusT> {
    if (oldTableName == null || oldTableName === "" ||
        newTableName == null || newTableName === "") {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    const workItem = xcalarRenameNodeWorkItem(oldTableName, newTableName);

    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarRenameNode(tHandle, oldTableName, newTableName);
    }

    const query: string = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'renameTable', newTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarRenameTable", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarFetchData = function(
    resultSetId: string,
    rowPosition: number,
    rowsToFetch: number,
    totalRows: number,
    data?: any[],
    tryCnt?: number,
    maxNumRowsPerCall?: number
): XDPromise<any[]> {
    const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
    if (tryCnt == null) {
        tryCnt = 0;
    }

    if (data == null) {
        data = [];
    }

    if (!maxNumRowsPerCall) {
        maxNumRowsPerCall = rowsToFetch;
    }

    const promiseArray: XDPromise<any>[] = [];
    for (let i = 0; i < Math.ceil(rowsToFetch / maxNumRowsPerCall); i++) {
        let numRows = maxNumRowsPerCall;
        if (i === Math.ceil(rowsToFetch / maxNumRowsPerCall) - 1) {
            numRows = rowsToFetch - i * maxNumRowsPerCall;
        }
        promiseArray.push(fetchDataHelper.bind({}, resultSetId,
                                            rowPosition + i * maxNumRowsPerCall,
                                               numRows, totalRows,
                                               data, tryCnt));
    }

    PromiseHelper.chain(promiseArray)
    .then(function() {
        deferred.resolve(data);
    })
    .fail(deferred.reject);

    return deferred.promise();
};

XcalarGetConfigParams = function(): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetConfigParams(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetConfigParams", error);
        Log.errorLog("Get Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSetConfigParams = function(
    pName: string,
    pValue: string
): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarSetConfigParam(tHandle, pName, pValue)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSetConfigParams", error);
        Log.errorLog("Set Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/** Sets parameters for the runtime schedulers.
 * Example:
 * let latScheduler = new XcalarApiSchedParamT({schedName: "LatencyScheduler",
 *                      cpusReservedInPercent: 70})
 * let thScheduler = new XcalarApiSchedParamT({schedName: "ThroughputScheduler",
 *                      cpusReservedInPercent: 30})
 * XcalarRunTimeSetParam([latScheduler, thScheduler])
 *
 * Note that you can only set these if you have more than 32 CPUs.
 * @param schedParams Array of XcalarApiSchedParam, one for each scheduler.
 */
XcalarRuntimeSetParam = function(
    schedParams: XcalarApiSchedParamT[]
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarRuntimeSetParam(tHandle, schedParams)
    .then(deferred.resolve)
    .fail(function (error) {
        var thriftError = thriftLog("XcalarRuntimeSetParam", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/** Gets parameters for the runtime schedulers.
 */
XcalarRuntimeGetParam = function(): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarRuntimeGetParam(tHandle)
    .then(deferred.resolve)
    .fail(function (error) {
        var thriftError = thriftLog("XcalarRuntimeGetParam", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// XXX NOT TESTED
XcalarGetDatasetCount = function(dsName: string): XDPromise<number> {
    const deferred: XDDeferred<number> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        XcalarGetDatasetMeta(dsName)
        .then(function(metaOut) {
            let totEntries = 0;
            for (let i = 0; i < metaOut.metas.length; i++) {
                totEntries += metaOut.metas[i].numRows;
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            const thriftError = thriftLog("XcalarGetDatasetCount", error);
            Log.errorLog("Get Dataset Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
};

XcalarGetDatasetMeta = function(dsName: string): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    dsName = parseDS(dsName);

    xcalarGetDatasetMeta(tHandle, dsName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetDatasetMeta", error);
        Log.errorLog("Get Dataset Meta", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTableMeta = function(
    tableName: string
): XDPromise<XcalarApiGetTableMetaOutputT> {
    const deferred: XDDeferred<XcalarApiGetTableMetaOutputT>
        = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(null);
    } else {
        const isPrecise = false; // Set to true if you are collecting stats from
                               // the backend about xdb pages and hashslots.
        xcalarGetTableMeta(tHandle, tableName, isPrecise)
        .then(deferred.resolve)
        .fail(function(error) {
            const thriftError = thriftLog("XcalarGetTableMeta", error);
            Log.errorLog("Get Table Meta", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }
    return deferred.promise();
};

// Not being called. We just use make result set's output
XcalarGetTableCount = function(
    tableName: string
): XDPromise<number> {
    const deferred: XDDeferred<number> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        xcalarGetTableMeta(tHandle, tableName)
        .then(function(metaOut) {
            let totEntries = 0;
            for (let i = 0; i<metaOut.metas.length; i++) {
                totEntries += metaOut.metas[i].numRows;
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            const thriftError = thriftLog("XcalarGetTableCount", error);
            Log.errorLog("Get Table Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
};

XcalarGetDatasets = function(): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListDatasets(tHandle)
    .then(function(listDatasetsOutput: any) {
        const datasets: any[] = xcHelper.parseListDSOutput(listDatasetsOutput.datasets);
        listDatasetsOutput.datasets = datasets;
        listDatasetsOutput.numDatasets = datasets.length;
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        const thriftError: ThriftError = thriftLog("XcalarGetDatasets", error);
        Log.errorLog("Get Datasets", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetDatasetUsers = function(
    dsName: string
): XDPromise<XcalarApiDatasetUserT[]> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiDatasetUserT[]> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    dsName = parseDS(dsName);
    xcalarListDatasetUsers(tHandle, dsName)
    .then(function(listDatasetUsersOutput) {
        deferred.resolve(listDatasetUsersOutput.user); // Array of users
        // Empty array if no users
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetDatasetUsers", error);
        Log.errorLog("Get Dataset Users", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetDatasetsInfo = function(
    datasetsNamePattern?: string
): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.reject();
    }
    if (datasetsNamePattern == null) {
        datasetsNamePattern = "*";
    } else {
        datasetsNamePattern = parseDS(datasetsNamePattern);
    }
    return xcalarGetDatasetsInfo(tHandle, datasetsNamePattern);
};

XcalarGetConstants = function(
    constantName?: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    let patternMatch: string;

    if (constantName == null) {
        patternMatch = "*";
    } else {
        patternMatch = constantName;
    }
    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcConstant)
    .then(function(ret) {
        deferred.resolve(ret.nodeInfo);
        // Return struct is an array of
        // {dagNodeId: integer, // Ignore
        //  name: string,     // Name of constant. Will start with gAggVarPrefix
        //  state: integer}     // State of dag node.Read with DgDagStateTStr[x]
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetConstants", error);
        Log.errorLog("Get Constants", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTables = function(tableName?: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    let patternMatch: string;

    if (tableName == null) {
        patternMatch = "*";
    } else {
        patternMatch = tableName;
    }

    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcTable)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetTables", error);
        Log.errorLog("Get Tables", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetDSNode = function(datasetName?: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    let patternMatch: string;
    if (datasetName == null) {
        patternMatch = "*";
    } else {
        patternMatch = gDSPrefix + datasetName;
    }

    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcDataset)
    .then(function(ret) {
        const nodeInfo = xcHelper.parseListDSOutput(ret.nodeInfo);
        ret.nodeInfo = nodeInfo;
        ret.numNodes = nodeInfo.length;
        deferred.resolve(ret);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetDSNode", error);
        Log.errorLog("Get DS Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarShutdown = function(force?: boolean): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    if (force == null) {
        force = false;
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarShutdown(tHandle, force)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarShutdown", error);
        Log.errorLog("Shutdown Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// No corresponding thrift API
// let XcalarStartNodes = function(numNodes: number) {
//     if (tHandle == null) {
//         return PromiseHelper.resolve(null);
//     }
//     var deferred = PromiseHelper.deferred();
//     if (insertError(arguments.callee, deferred)) {
//         return (deferred.promise());
//     }

//     xcalarStartNodes(tHandle, numNodes)
//     .then(deferred.resolve)
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarStartNodes", error);
//         Log.errorLog("Start Nodes", null, null, thriftError);
//         deferred.reject(thriftError);
//     });
//     return (deferred.promise());
// };

XcalarGetStats = function(nodeId: number): XDPromise<any> {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarGetStats(tHandle, nodeId)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetStats", error);
        Log.errorLog("Get Stats", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTableRefCount = function(tableName: string): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetTableRefCount(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetTableRefCount", error);
        Log.errorLog("GetTable Ref Count", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarMakeResultSetFromTable = function(
    tableName: string
): XDPromise<XcalarApiMakeResultSetOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<XcalarApiMakeResultSetOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarMakeResultSetFromTable(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarMakeResultSetFromTable: " + tableName, error);
        Log.errorLog("MakeResultSetFromTable: " + tableName, null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarMakeResultSetFromDataset = function(
    datasetName: string,
    getErrorDataset: boolean
): XDPromise<XcalarApiMakeResultSetOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<XcalarApiMakeResultSetOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName, getErrorDataset)
    .then(function(ret) {
        if (ret.numEntries < 0) {
            ret.numEntries = 0;
        }
        deferred.resolve(ret);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarMakeResultSetFromDataset", error);
        Log.errorLog("MakeResultSetFromDataset", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());

};

XcalarSetAbsolute = function(
    resultSetId: string,
    position: number
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetAbsolute(tHandle, resultSetId, position)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSetAbsolute", error);
        Log.errorLog("Set Absolute", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetNextPage = function(
    resultSetId: string,
    numEntries: number
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetNext(tHandle, resultSetId, numEntries)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetNextPage", error);
        Log.errorLog("Get Next Page", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSetFree = function(
    resultSetId: string
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarFreeResultSet(tHandle, resultSetId)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSetFree", error);
        Log.errorLog("Set Free", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

function generateFilterString(
    operator: string,
    value1: string,
    value2: string,
    value3?: string
): string {
    let filterStr = "";
    //XX change this so it accepts any number of values
    switch (operator) {
        case ("Greater Than"):
            filterStr = "gt(" + value1 + ", " + value2 + ")";
            break;
        case ("Greater Than Equal To"):
            filterStr = "ge(" + value1 + ", " + value2 + ")";
            break;
        case ("Equals"):
            filterStr = "eq(" + value1 + ", " + value2 + ")";
            break;
        case ("Less Than"):
            filterStr = "lt(" + value1 + ", " + value2 + ")";
            break;
        case ("Less Than Equal To"):
            filterStr = "le(" + value1 + ", " + value2 + ")";
            break;
        case ("Exclude number"):
            filterStr = "neq(" + value1 + ", " + value2 + ")";
            break;
        case ("Exclude string"):
            filterStr = "not(like(" + value1 + ', "' + value2 + '"))';
            break;
        case ("regex"):
            filterStr = "regex(" + value1 + ', "' + value2 + '")';
            break;
        case ("like"):
            filterStr = "like(" + value1 + ', "' + value2 + '")';
            break;
        case ("Custom"):
            filterStr = value1;
            break;
        default:
            if (value3 != null) {
                filterStr = operator + "(" + value1 + ", " + value2 +
                            ", " + value3 + ")";
            } else if (value2 == null) {
                filterStr = operator + "(" + value1 + ")";
            } else {
                filterStr = operator + '(' + value1 + ', ' + value2 + ')';
            }
            break;
    }

    return (filterStr);
}

XcalarFilter = function(
    evalStr: string,
    srcTablename: string,
    dstTablename: string,
    txId: number
): XDPromise<any> {
    const deferred = PromiseHelper.deferred();
    let query: string;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr === "") {
        deferred.reject("Unknown op " + evalStr);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen)
    {
        deferred.reject(thriftLog("XcalarFilter", "Eval string too long"));
        return (deferred.promise());
    }

    const workItem = xcalarFilterWorkItem(srcTablename, dstTablename, evalStr);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarFilter(tHandle, evalStr, srcTablename, dstTablename);
    }
    query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'filter', dstTablename, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTablename, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarFilter", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarMapWithInput = function(
    txId: number,
    inputStruct: XcalarApiMapInputT
): XDPromise<any> {
    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    const workItem = xcalarApiMapWorkItem([""], null, null, [""]);
    workItem.input.mapInput = inputStruct;

    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarApiMapWithWorkItem(tHandle, workItem);
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'map', inputStruct.dest, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, inputStruct.dest,
                            ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarMap", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarMap = function(
    newFieldNames: string[] | string,
    evalStrs: string[] | string,
    srcTablename: string,
    dstTablename: string,
    icvMode: boolean,
    txId: number
): XDPromise<any> {
    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }
    if (!icvMode) {
        icvMode = false;
    }

    newFieldNames = (newFieldNames instanceof Array)
                    ? newFieldNames
                    : [newFieldNames];
    evalStrs = (evalStrs instanceof Array)
                ? evalStrs
                : [evalStrs];
    if (newFieldNames.length !== evalStrs.length) {
        return PromiseHelper.reject(thriftLog("XcalarMap", "invalid args"));
    }

    for (let i = 0; i < evalStrs.length; i++) {
        if (evalStrs[i].length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject(thriftLog("XcalarMap",
                                                  "Eval string too long"));
        }
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;
    const workItem = xcalarApiMapWorkItem(
        evalStrs as string[],
        srcTablename,
        dstTablename,
        newFieldNames as string[],
        icvMode);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarApiMap(
            tHandle,
            newFieldNames as string[],
            evalStrs as string[],
            srcTablename,
            dstTablename,
            icvMode);
    }
    query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'map', dstTablename, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTablename, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarMap", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarAggregate = function(
    evalStr: string,
    dstAggName: string,
    srcTablename: string,
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr === "") {
        // deferred.reject("bug!:" + op); // where op comes from ???
        deferred.reject("bug!: evalStr is empty");
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStirngLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    const workItem = xcalarAggregateWorkItem(srcTablename, dstAggName, evalStr);

    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarAggregate(tHandle, srcTablename, dstAggName, evalStr);
    }
    query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'aggregate', dstAggName, query);
    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstAggName, ret.timeElapsed);
            deferred.resolve(ret, dstAggName);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarAggregate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/**
    leftColInfos/rightColInfos:
        example: [{orig: "sourcCol", new: "destCol", type: DfFieldTypeT.DfFloat64}]
    options contain
        evalString: filter string for cross joins
*/
XcalarJoin = function(
    left: string,
    right: string,
    dst: string,
    joinType: JoinOperatorT,
    leftColInfos: ColRenameInfo[],
    rightColInfos: ColRenameInfo[],
    options: {evalString: string, keepAllColumns: boolean, nullSafe: boolean, key: string[][]},
    txId: number
): XDPromise<any> {
    // If this flag is set to false, then any column that is not in left columns
    // or right columns will be dropped. This should eventually be set to false.
    // Alternatively it should be exposed to the user.
    let { keepAllColumns = true, evalString = '', nullSafe = false, key = null } = (options || {});

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    let leftColumns: XcalarApiColumnT[] = [];
    let rightColumns: XcalarApiColumnT[] = [];

    if (leftColInfos) {
        leftColumns = leftColInfos.map(colInfoMap);
    }

    if (rightColInfos) {
        rightColumns = rightColInfos.map(colInfoMap);
    }

    const workItem = xcalarJoinWorkItem(left, right, dst,
                                        joinType, leftColumns,
                                        rightColumns, evalString,
                                        keepAllColumns, nullSafe);

    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarJoin(tHandle, left, right, dst,
                            joinType, leftColumns, rightColumns,
            evalString, keepAllColumns);
    }
    query = XcalarGetQuery(workItem);
    // XXX hack way to add the key, should use a better way
    query = addKeyAttrToQuery(query, key);
    Transaction.startSubQuery(txId, 'join', dst, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dst, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarJoin", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarGroupByWithInput = function(
    txId: number,
    inputStruct: XcalarApiGroupByInputT
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    const workItem = xcalarGroupByWorkItem("", "", [], []);
    workItem.input.groupByInput = inputStruct;

    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarGroupByWithWorkItem(tHandle, workItem);
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'groupBy',
                            inputStruct.dest, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, inputStruct.dest,
                            ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGroupBy", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGroupByWithEvalStrings = function(
    newColNames: string[] | string,
    evalStrs: string[] | string,
    tableName: string,
    newTableName: string,
    incSample?: boolean,
    icvMode?: boolean,
    newKeyFieldName?: string,
    groupAll?: boolean,
    txId?: number
): XDPromise<any> {
    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }
    newKeyFieldName = newKeyFieldName || "";
    incSample = incSample || false;
    icvMode = icvMode || false;

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;

    newColNames = (newColNames instanceof Array) ? newColNames : [newColNames];
    evalStrs = (evalStrs instanceof Array) ? evalStrs : [evalStrs];

    if (evalStrs.length !== newColNames.length) {
        return PromiseHelper.reject("invalid args");
    }

    for (let i = 0; i < evalStrs.length; i++) {
        if (evalStrs[i].length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject("Eval string too long");
        }
    }

    const workItem = xcalarGroupByWorkItem(
        tableName,
        newTableName,
        evalStrs as string[],
        newColNames as string[],
        incSample, icvMode, newKeyFieldName, groupAll);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall({
            "tableName": newTableName
        });
    } else {
        def = xcalarGroupBy(tHandle,
            tableName,
            newTableName,
            evalStrs as string[],
            newColNames as string[],
            incSample, icvMode, newKeyFieldName, groupAll);
    }
    query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'groupBy', newTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, newTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGroupBy", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarGroupBy = function(
    operators: string[] | string,
    newColNames: string[] | string,
    aggColNames: string[] | string,
    tableName: string,
    newTableName: string,
    incSample: boolean,
    icvMode: boolean,
    newKeyFieldName: string,
    groupAll: boolean,
    txId: number
): XDPromise<any> {
    const evalStrs: string[] = [];

    operators = (operators instanceof Array) ? operators : [operators];
    newColNames = (newColNames instanceof Array) ? newColNames : [newColNames];
    aggColNames = (aggColNames instanceof Array) ? aggColNames : [aggColNames];
    if (operators.length !== newColNames.length ||
        operators.length !== aggColNames.length) {
        return PromiseHelper.reject("invalid args");
    }

    for (let i = 0; i < operators.length; i++) {
        let op = operators[i];
        if (!op) {
            // XXX to do, check if the operator is valid as XIApi.genAggStr
            return PromiseHelper.reject("Wrong operator! " + operators);
        }
        op = op.slice(0, 1).toLowerCase() + op.slice(1);
        const evalStr = op + "(" + aggColNames[i] + ")";
        evalStrs.push(evalStr);
    }
    return XcalarGroupByWithEvalStrings(newColNames, evalStrs, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName,
                       groupAll, txId);
};

XcalarProject = function(
    columns: string[],
    tableName: string,
    dstTableName: string,
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    const workItem = xcalarProjectWorkItem(columns.length, columns,
        tableName, dstTableName);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarProject(tHandle, columns.length, columns,
            tableName, dstTableName);
    }
    query = XcalarGetQuery(workItem); // XXX May not work? Have't tested
    Transaction.startSubQuery(txId, 'project', dstTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarProject", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// rename map is an arry of array
// if unionType is unionExcept or unionIntersect, it's actually the named
// operation and not union
// unionType is unionStandard, unionIntersect, unionExcept
XcalarUnion = function(
    tableNames: string[],
    newTableName: string,
    colInfos: ColRenameInfo[][],
    dedup: boolean = false,
    unionType: UnionOperatorT = UnionOperatorT.UnionStandard,
    indexKeys: string[][],
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    let query: string;
    const columns: XcalarApiColumnT[][] = colInfos.map((renameListForOneTable) => {
        return renameListForOneTable.map(colInfoMap);
    });
    const workItem = xcalarUnionWorkItem(tableNames, newTableName, columns,
                                        dedup, unionType);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarUnion(tHandle, tableNames, newTableName, columns, dedup, unionType);
    }
    query = XcalarGetQuery(workItem);
    // XXX hack way to add the key, should use a better way
    query = addKeyAttrToQuery(query, indexKeys);
    Transaction.startSubQuery(txId, 'union', newTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, newTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarUnion", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarGenRowNum = function(
    srcTableName: string,
    dstTableName: string,
    newFieldName: string,
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // DO NOT GET THE UNSORTED TABLE NAMEEE! We actually want the sorted order
    const workItem = xcalarApiGetRowNumWorkItem(srcTableName, dstTableName,
                                              newFieldName);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarApiGetRowNum(tHandle, newFieldName, srcTableName,
                                  dstTableName);
    }
    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'genRowNum', dstTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
             // XXX This part doesn't work yet
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGenRowNum", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarArchiveTable = function(
    srcTableNames: string[],
    txId?: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // const workItem = xcalarArchiveTablesWorkItem(srcTableNames, true); // TODO: unused?
    xcalarArchiveTables(tHandle, srcTableNames)
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            // XXX This part doesn't work yet
            //Transaction.log(txId, query, srcTableNames, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarArchiveTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// PSA!!! This place does not check for unsorted table. So the caller
// must make sure that the first table that is being passed into XcalarQuery
// is an unsorted table! Otherwise backend may crash
// txId does not need to be passed in if xcalarquery not called inside a transaction
XcalarQuery = function(
    queryName: string,
    queryString: string,
    txId: number,
    options?: {
        bailOnError?: boolean,
        udfUserName?: string,
        udfSessionName?: string
    }
): XDPromise<void> {
    /* some test case :
        Format:
            JSON.stringify([{"operation":"XcalarApiFilter",
                            "args":{"source":"gdelt#LR0",
                                    "dest":"test",
                                    "eval":[{"evalString":"eq(gdelt::column1, \"20080514\")","newField":null}]
                                    }
                            }])
    */
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<void> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        console.info('cancelation detected');
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    options = options || {};
    let bailOnError: boolean = options.bailOnError;
    // Default behavior is true so if null or undefined, then should be set to true
    if (bailOnError == null) {
        bailOnError = true; // Stop running query on error
    }

    const schedName:string = ""; // New backend flag
    const udfUserName: string = options.udfUserName;
    const udfSessionName: string = options.udfSessionName;
    xcalarQuery(tHandle, queryName, queryString, true, bailOnError,
        schedName, true, udfUserName, udfSessionName)
    .then(function() {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId != null) {
                Transaction.startSubQuery(txId, queryName, null, queryString);
            }
            deferred.resolve();
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarQuery", error);
        Log.errorLog("XcalarQuery", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// for queries or retinas
XcalarQueryState = function(
    queryName: string,
    statusesToIgnore?: any[]
): XDPromise<XcalarApiQueryStateOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiQueryStateOutputT> = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryState(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = queryStateErrorStatusHandler(error, statusesToIgnore);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

function queryStateErrorStatusHandler(
    error: XcalarApiError,
    statusesToIgnore: any[]
): ThriftError {
    let thriftError: ThriftError;
    const status = error.xcalarStatus;
    if (statusesToIgnore && statusesToIgnore.indexOf(status) > -1) {
        thriftError = new ThriftError();
        thriftError.status = status;
        thriftError.error = "Error:" + StatusTStr[status];
    } else {
        thriftError = thriftLog("XcalarQueryState", error);
        Log.errorLog("XcalarQueryState", null, null, thriftError);
    }

    return (thriftError);
}

// used to check when a query finishes or when a queryCancel finishes
XcalarQueryCheck = function(
    queryName: string,
    canceling: boolean,
    txId?: number,
    options?: {
        checkTime?: number,
        noCleanup?: boolean
    }
): XDPromise<XcalarApiQueryStateOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiQueryStateOutputT> = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    options = options || {};
    let noCleanup: boolean = options.noCleanup;

    let checkTime = options.checkTime || 1000; // 1s per check
    if (canceling) {
        checkTime = options.checkTime || 2000;
    }
    cycle();

    function cycle() {
        setTimeout(function() {
            XcalarQueryState(queryName)
            .then(function(queryStateOutput) {
                Transaction.update(txId, queryStateOutput);
                // var nodeStatuses =
                //         getDagNodeStatuses(queryStateOutput.queryGraph.node);
                const state = queryStateOutput.queryState;
                if (state === QueryStateT.qrFinished ||
                    state === QueryStateT.qrCancelled) {
                    addThriftErrorLogToQueryOutput(queryStateOutput);
                    if (noCleanup) {
                        deferred.resolve(queryStateOutput);
                    } else {
                        // clean up query when done
                        XcalarQueryDelete(queryName)
                        .always(function() {
                            deferred.resolve(queryStateOutput);
                        });
                    }
                } else if (state === QueryStateT.qrError) {
                    // clean up query when done
                    XcalarQueryDelete(queryName)
                    .always(function() {
                        deferred.reject(queryStateOutput.queryStatus, queryStateOutput);
                    });
                } else {
                    cycle();
                }
            })
            .fail(function() {
                if (canceling) {
                    XcalarQueryDelete(queryName);
                }
                deferred.reject.apply(this, arguments);
            });
        }, checkTime);
    }

    function addThriftErrorLogToQueryOutput(queryStateOutput) {
        try {
            queryStateOutput.queryGraph.node.forEach((node) => {
                if (node.status != null && node.status !== StatusT.StatusOk) {
                    node.thriftError = thriftLog("XcalarQuery", node.status);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    return (deferred.promise());
};

XcalarQueryWithCheck = function(
    queryName: string,
    queryString: string,
    txId: number,
    options?: {
        bailOnError?: boolean,
        checkTime?: number,
        noCleanup?: boolean,
        udfUserName: string,
        udfSessionName: string
    }
): XDPromise<XcalarApiQueryStateOutputT> {
    const deferred: XDDeferred<XcalarApiQueryStateOutputT> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    XcalarQuery(queryName, queryString, txId, options)
    .then(function() {
        return XcalarQueryCheck(queryName, undefined, txId, options);
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            const timeElapsed = ret.elapsed.milliseconds;
            Transaction.log(txId, queryString, undefined, timeElapsed, {
                queryName: queryName
            });
            deferred.resolve.apply(this, arguments);
        }
    })
    .fail(function(error, queryStateOutput) {
        if (TypeCheck.isNumber(error)) {
            error = {
                status: error,
                log: createQueryStateOutputLog(queryStateOutput)
            }
        }
        const thriftError = thriftLog("XcalarQuery" + queryName, error);
        deferred.reject(thriftError, queryStateOutput);
    });

    return (deferred.promise());
};

function createQueryStateOutputLog(queryOutput: XcalarApiQueryStateOutputT): string {
    let nodes = queryOutput.queryGraph.node;
    let log = "Error Log: ";
    try {
        for (let i = 0; i < queryOutput.queryGraph.numNodes; i++) {
            let node = nodes[i];
            let node_log;
            if (node.status === StatusT.StatusUdfExecuteFailed) {
                node_log = parseUDFLog(node.log);
            } else {
                node_log = parseLog(node.log);
            }
            if (node_log) {
                log += ("Node number " + i + ": Log: " + node_log + "\n ");
            }
        }
    } catch (e) {
        console.error(e);
        log = "Unable to parse query log";
    }
    if (log === "Error Log: ") {
        log = "";
    }
    return log;
}

function queryErrorStatusHandler(
    error: XcalarApiError,
    statusesToIgnore: number[],
    opOrQuery: string
): ThriftError {
    let thriftError: ThriftError;
    if (statusesToIgnore && error
        && (error.xcalarStatus !== undefined)
        && statusesToIgnore.indexOf(error.xcalarStatus) > -1) {
        thriftError = {
            status: error.xcalarStatus,
            error: "Error:" + StatusTStr[error.xcalarStatus]
        } as ThriftError;
    } else {
        thriftError = thriftLog("XcalarCancel" + opOrQuery, error);
        Log.errorLog("Cancel " + opOrQuery, null, null, thriftError);
    }

    return (thriftError);
}

XcalarQueryCancel = function(
    queryName: string,
    statusesToIgnore?: number[]
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryCancel(tHandle, queryName)
    .then(function() {
        deferred.resolve.apply(this, arguments);
    })
    .fail(function(error) {
        const thriftError = queryErrorStatusHandler(error, statusesToIgnore,
                                                  "Query");
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarQueryDelete = function(queryName: string): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryDelete(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarQueryDelete" + queryName, error);
        Log.errorLog("Xcalar Query Delete " + queryName, null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarQueryList = function(namePattern) {
    if ([null].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryList(tHandle, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalraQueryList" + namePattern, error);
        Log.errorLog("Xcalar Query List " + namePattern, null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/**
 * XcalarCancelOp
 * @param {Array} statusesToIgnore - array of status numbers to ignore
 *      (when attempting to cancel a query, we cancel all future subqueries
 *      even when the dstTableName doesn't exist yet -- this produces errors)
 */
XcalarCancelOp = function(
    dstTableName: string,
    statusesToIgnore?: number[]
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiCancelOp(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = queryErrorStatusHandler(error, statusesToIgnore,
                                                  "Op");
        deferred.reject(thriftError);
    });

    return (deferred.promise());

};

XcalarGetDag = function(tableName: string): XDPromise<XcalarApiDagOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiDagOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDag(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetDag", error);
        Log.errorLog("Get Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarTagDagNodes = function(
    tagName: string,
    dagNodeNames: string[] | string
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (typeof(dagNodeNames) === "string") {
        dagNodeNames = [dagNodeNames];
    }

    const dagNodes: XcalarApiNamedInputT[] = [];
    for (let i = 0; i < dagNodeNames.length; i++) {
        const namedInput = new XcalarApiNamedInputT();
        namedInput.name = dagNodeNames[i];
        // XXX can also use nodeId
        dagNodes.push(namedInput);
    }
    xcalarTagDagNodes(tHandle, tagName, dagNodes)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTagDagNodes", error);
        Log.errorLog("Tag Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarCommentDagNodes = function(
    comment: string,
    dagNodeNames: string[] | string
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (typeof(dagNodeNames) === "string") {
        dagNodeNames = [dagNodeNames];
    }

    xcalarCommentDagNodes(tHandle, comment, dagNodeNames.length, dagNodeNames)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarCommentDagNodes", error);
        Log.errorLog("Comment Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

class XcalarListFilesInputArgs {
    public recursive?: boolean;
    public targetName?: string;
    public path?: string;
    public fileNamePattern?: string;
}
/*
 * sourceArgs:
 *  targetname: "Default Shared Root",
 *  path: "/",
 *  fileNampattern: ""
 *  recursive: false
 */
XcalarListFiles = function(
    args: XcalarListFilesInputArgs
): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    const recursive = (args.recursive === true) ? true : false;
    // var namePatternArray = getNamePattern(path, recursive);
    const sourceArgs = new DataSourceArgsT();
    sourceArgs.targetName = args.targetName;
    sourceArgs.path = args.path;
    sourceArgs.fileNamePattern = args.fileNamePattern;
    sourceArgs.recursive = recursive;

    xcalarListFiles(tHandle, sourceArgs)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarListFiles", error);
        Log.errorLog("List Files", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSynthesize = function(
    tableName: string,
    dstTableName: string,
    colInfos: ColRenameInfo[],
    sameSession: boolean,
    txId: number
): XDPromise<any> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let query: string;

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    const columnArray = colInfos.map(colInfoMap);
    const workItem = xcalarApiSynthesizeWorkItem(tableName, dstTableName, columnArray, sameSession);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarApiSynthesize(tHandle, tableName, dstTableName, columnArray);
    }
    query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, "synthesize", dstTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSynthesize", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// XXX TODO THIS NEEDS TO HAVE A Log.add
// This tableArray is an array of structs.
// Each struct is of the form: numColumns, tableName, columnNames
// TableName is of the form namedInput columnNames is just an array of strings
// that correspond to the column names
// If you have 2 DFs in your DF, put the last table of both DFs into the
// tableArray
// When you call makeRetina, we duplicate the DAG, append an export DAG node,
// and give it all new DagNodeIds. So when you call updateRetina, make sure to
// pass in the DagNodeIds that are part of this new Retina instead of the
// original DAG
XcalarMakeRetina = function(
    retName: string,
    tableArray: XcalarApiRetinaDstT[],
    srcTables: XcalarApiRetinaSrcTableT[],
    txId: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1 ||
        retName === "" || retName == null ||
        tableArray == null || tableArray.length <= 0)
    {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarMakeRetinaWorkItem(retName, tableArray);
    xcalarMakeRetina(tHandle, retName, tableArray, srcTables)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarMakeRetina", error);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListRetinas = function(namePattern?: string): XDPromise<any> {
    // XXX This function is wrong because it does not take in a tablename even
    // though it should. Hence we just assume that all retinas belong to the
    // leftmost table.
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    if (namePattern == null) {
        namePattern = "*";
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListRetinas(tHandle, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarListRetinas", error);
        Log.errorLog("List Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetRetina = function(retName: string): XDPromise<any> {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetRetina", error);
        Log.errorLog("Get Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetRetinaJson = function(retName: string): XDPromise<object> {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<object> = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetinaJson(tHandle, retName)
    .then(function(ret) {
        const json = JSON.parse(ret.retinaJson);
        deferred.resolve(json);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetRetinaJson", error);
        Log.errorLog("Get Retina Json", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

// XXX TODO THIS NEEDS TO HAVE Log.add

// paramType must be either of the following:
// XcalarApisT.XcalarApiBulkLoad,
// XcalarApisT.XcalarApiFilter,
// XcalarApisT.XcalarApiExport

// paramValue is what the parameterized part is called
// For example, in load, the path is parameterizable, and your url can
// be something like "file:///<directory>/<subDir>/file<number>.csv" <- paramValue
// For eval string, you will pass in something like "filter(gt(column1, \"hello\""))"
// replaced with "filter(<opera>(<colName>, <val>))"
// val = \"hello\"
// <argument> is used to denote a parameter
XcalarUpdateRetina = function(
    retName: string,
    tableNames: string[],
    paramValues,
    comments: string,
    txId: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    XcalarGetRetinaJson(retName)
    .then(function(retJson) {
        const queries = (retJson as {query: any[]}).query;

        for (let i = 0; i < queries.length; i++) {
            const args = queries[i].args;
            const tableIndex = tableNames.indexOf(args.dest);
            if (tableIndex > -1) {
                if (paramValues !== null &&
                    paramValues[tableIndex] != null) {
                    queries[i].args = paramValues[tableIndex];
                }
                if (comments != null) {
                    queries[i].comment = comments[tableIndex];
                }
            }
        }

        return xcalarUpdateRetina(tHandle, retName, JSON.stringify(retJson));
    })
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarUpdateRetina", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// TODO: No corresponding api
// Don't call this for now. When bohan's change for 8137 is fixed, we will
// no longer call updateRetina for export changes and instead switch to this
// let XcalarUpdateRetinaExport = function(
//     retName: string,
//     dagNodeId,
//     target,
//     specInput,
//     createRule,
//     sorted
// ) {
//     if ([null, undefined].indexOf(tHandle) !== -1) {
//         return PromiseHelper.resolve(null);
//     }

//     var deferred = PromiseHelper.deferred();
//     if (insertError(arguments.callee, deferred)) {
//         return (deferred.promise());
//     }

//     xcalarUpdateRetinaExport(tHandle, retName, dagNodeId, target, specInput,
//         createRule, sorted)
//     .then(deferred.resolve)
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarUpdateRetinaExport", error);
//         Log.errorLog("Update Retina Export Node", null, null, thriftError);
//         deferred.reject(thriftError);
//     });
//     return (deferred.promise());
// };

// XXX TODO Log.add
// param has 2 string values: param.paramName, param.paramValue
// params is an array of param.
// For example, if my paramValue was "filter(<opera>(<colName>, <val>))"
// then, params = [{"paramName":"opera", "paramValue":"lt"},
// {"pN":"colName", "pV":"column5"}, {, "pV":"\"hello\""}]
XcalarExecuteRetina = function(
    retName: string,
    params: XcalarApiParameterT[],
    options: {
        activeSession?: boolean,
        newTableName?: string,
        queryName?: string,
        udfUserName?: string,
        udfSessionName?: string
    },
    txId: number
): XDPromise<any> {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    options = options || {};
    // If activeSession is true, it exports to the
    // current active session and creates a table
    // with newTableName

    const activeSession: boolean = options.activeSession || false;
    const newTableName: string = options.newTableName || "";
    const queryName: string = options.queryName || undefined;
    const udfUserName: string = options.udfUserName || undefined;
    const udfSessionName: string = options.udfSessionName || undefined;

    const schedName: string = ""; // This is for IMD, invoked via APIs.
    const workItem = xcalarExecuteRetinaWorkItem(retName, params, activeSession,
        newTableName, queryName, schedName, udfUserName, udfSessionName);
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarExecuteRetina(tHandle, retName, params, activeSession,
            newTableName, queryName, schedName, udfUserName, udfSessionName);
    }

    const query = XcalarGetQuery(workItem);
    const transactionOptions = {
        retName: retName
    };
    Transaction.startSubQuery(txId, SQLOps.Retina, retName, query,
                                  transactionOptions);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, retName, ret.timeElapsed,
                            transactionOptions);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarExecuteRetina", error);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListParametersInRetina = function(retName: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListParametersInRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarListParametersInRetina", error);
        Log.errorLog("ListParametersInRetina", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeleteRetina = function(
    retName: string,
    txId: number
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarApiDeleteRetinaWorkItem(retName);
    xcalarApiDeleteRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarApiDeleteRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarImportRetina = function(
    retinaName: string,
    overwrite: boolean,
    retina?: string,
    retinaJson?: string,
    udfUserName?: string,
    udfSessionName?: string,
    txId?: number
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    let loadRetinaJson: boolean = false;
    if (retinaJson != null) {
        retina = null;
        loadRetinaJson = true;
    } else {
        retinaJson = null;
    }
    xcalarApiImportRetina(tHandle, retinaName, overwrite, retina, loadRetinaJson, retinaJson, udfUserName, udfSessionName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarImportRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarExportRetina = function(
    retName: string,
    txId: number
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarApiExportRetinaWorkItem(retName);
    xcalarApiExportRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarExportRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarDeleteSched = function(
    scheduleKey: string
): XDPromise<boolean> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deleteInput = {
        "scheduleKey": scheduleKey
    };

    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleDelete", true, JSON.stringify(deleteInput))
    .then(function(result) {
        let innerParsed: string;
        try {
            // App results are formatted this way
            const outerParsed: string[] = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        let defRes: boolean;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        const thriftError = thriftLog("XcalarDeleteSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

class XcalarScheduleOptions {
    activeSession?: boolean;
    newTableName?: string;
    usePremadeCronString?: boolean;
    premadeCronString?: string;
    isPaused?: boolean;
    exportTarget?: any;
    exportLocation?: any;
}
class XcalarScheduleTimingInfo {
    startTime?: number;
    dateText?: string;
    timeText?: string;
    repeat?: any;
    modified?: number;
    created?: any;
}
class XcalarScheduleObj {
    scheduleKey: string;
    retName: string;
    substitutions: XcalarApiParameterT[];
    options: XcalarScheduleOptions;
    timingInfo: XcalarScheduleTimingInfo;
}

XcalarCreateSched = function(
    scheduleKey: string,
    retName: string,
    substitutions: XcalarApiParameterT[],
    options: XcalarScheduleOptions,
    timingInfo: XcalarScheduleTimingInfo
): XDPromise<boolean> {
    // Substitutions is the exact same format as the params argument to
    // xcalarExecuteRetina.  If that changes, this implementation will change
    // well to follow.
    // options is the same as the output of getAdvancedExportOption in dfCard
    // Additionally, options can also include "usePremadeCronString" : true
    // In which case there MUST also be a "premadeCronString" present in options
    // which MUST be of the form of a valid cron string:
    // e.g. "* * * * *". "1-2, */4 * 4,7 *", etc.
    // As of right now, activeSession and newTableName do nothing
    // Example:
    // var options = {
    //     "activeSession": false,
    //     "newTableName": "",
    //     "usePremadeCronString": true,
    //     "premadeCronString": "* * 3 * *"
    // }
    // timingInfo format is identical to a similar struct in scheduleView.js:
    //   var timingInfo = {
    //        "startTime": startTime, // In milliseconds
    //        "dateText": date, // String
    //        "timeText": time, // String
    //        "repeat": repeat, // element in scheduleFreq in Scheduler
    //        "modified": currentTime, // In milliseconds
    //    };

    const appInObj: XcalarScheduleObj = {
        "scheduleKey": scheduleKey,
        "retName": retName,
        "substitutions": substitutions,
        "options": options,
        "timingInfo": timingInfo
    };
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleCreate", true, JSON.stringify(appInObj))
    .then(function(result) {
        let innerParsed: string;
        try {
            // App results are formatted this way
            const outerParsed: string[] = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        let defRes: boolean;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else if (innerParsed === "-3") {
            // Schedule with that ID already exists
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        const thriftError = thriftLog("XcalarCreateSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUpdateSched = function(
    scheduleKey: string,
    retName: string,
    substitutions: XcalarApiParameterT[],
    options: XcalarScheduleOptions,
    timingInfo: XcalarScheduleTimingInfo
): XDPromise<boolean> {
    // Substitutions is the exact same format as the params argument to
    // xcalarExecuteRetina.  If that changes, this implementation will change
    // well to follow.
    // options is the same as the output of getAdvancedExportOption in dfCard
    // Additionally, options can also include "usePremadeCronString" : true
    // In which case there MUST also be a "premadeCronString" present in options
    // which MUST be of the form of a valid cron string:
    // e.g. "* * * * *". "1-2, */4 * 4,7 *", etc.
    // As of right now, activeSession and newTableName do nothing
    // Example:
    // var options = {
    //     "activeSession": false,
    //     "newTableName": "",
    //     "usePremadeCronString": true,
    //     "premadeCronString": "* * 3 * *"
    // }
    // timingInfo format is identical to a similar struct in scheduleView.js:
    //   var timingInfo = {
    //        "startTime": startTime, // In milliseconds
    //        "dateText": date, // String
    //        "timeText": time, // String
    //        "repeat": repeat, // element in scheduleFreq in Scheduler
    //        "modified": currentTime, // In milliseconds
    //    };

    const appInObj = {
        "scheduleKey": scheduleKey,
        "retName": retName,
        "substitutions": substitutions,
        "options": options,
        "timingInfo": timingInfo
    };
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleUpdate", true, JSON.stringify(appInObj))
    .then(function(result) {
        let innerParsed: string;
        try {
            // App results are formatted this way
            const outerParsed: string[] = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        let defRes: boolean;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else if (innerParsed === "-3") {
            // Schedule with that ID already exists
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        var thriftError = thriftLog("XcalarUpdateSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

type XcalarListSchedulesOutput = XcalarListScheduleObj[];
class XcalarListScheduleObj {
    scheduleMain: XcalarScheduleObj;
    scheduleResults: {
        startTime: number,
        parameters: any,
        status: StatusT,
        endTime: number,
        exportLoc: string
    };
}
XcalarListSchedules = function(
    scheduleKey?: string,
    hasRunResults?: boolean
): XDPromise<XcalarListSchedulesOutput> {
    // scheduleKey can be an *exact* schedule key,
    // or emptystring, in which case all schedules are listed
    // No support for patterns yet
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarListSchedulesOutput> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    const listInput = {
        "scheduleKey": scheduleKey,
        "hasRunResults": hasRunResults
    };

    XcalarAppExecute("ScheduleList", true, JSON.stringify(listInput))
    // XcalarAppExecute("listschedule", true, JSON.stringify(listInput))
    .then(function(result) {
        let innerParsed: XcalarListSchedulesOutput;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        // InnerParsed is an array of objects that have fields "scheduleMain"
        // and "scheduleResults".  "scheduleMain" is an object of the form
        // of the input obj to XcalarCreateSched.  "scheduleResults" is
        // an object of the form
        // resultObj = {
        //     "startTime" : milliseconds
        //     "parameters": parameters
        //     "status" : StatusT
        //     "endTime" : milliseconds
        //     "exportLoc" : "Default"
        // }
        deferred.resolve(innerParsed);
    })
    .fail(function(error1) {
        const thriftError = thriftLog("XcalarListSchedule", error1);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarPauseSched = function(scheduleKey: string): XDPromise<boolean> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const pauseInput = {
        "scheduleKey": scheduleKey
    };

    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
    XcalarAppExecute("SchedulePause", true, JSON.stringify(pauseInput))
    .then(function(result) {
        let innerParsed: string;
        try {
            // App results are formatted this way
            const outerParsed: string[] = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        let defRes: boolean;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarPauseSched", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarResumeSched = function(scheduleKey: string): XDPromise<boolean> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const resumeInput = {
        "scheduleKey": scheduleKey
    };

    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleResume", true, JSON.stringify(resumeInput))
    .then(function(result) {
        let innerParsed: string;
        try {
            // App results are formatted this way
            const outerParsed: string[] = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        let defRes: boolean;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarResumeSched", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarKeyLookup = function(
    key: string,
    scope: number
): XDPromise<XcalarApiKeyLookupOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiKeyLookupOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    xcalarKeyLookup(tHandle, scope, key)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeyLookup", error);
        // it's normal to find an unexisted key.
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            console.warn("Status", error, "Key, not found");
            deferred.resolve(null);
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Lookup", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeyList = function(
    keyRegex: string,
    scope: number
): XDPromise<XcalarApiKeyListOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiKeyListOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    xcalarKeyList(tHandle, scope, keyRegex)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeyList", error);
        Log.errorLog("Key List", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarKeyPut = function(
    key: string,
    value: string,
    persist: boolean,
    scope: number
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    if (key == null) {
        return PromiseHelper.reject("key is not defined");
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (persist == null) {
        persist = false;
    }

    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    xcalarKeyAddOrReplace(tHandle, scope, key, value, persist)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeyPut", error);
        Log.errorLog("Key Put", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarKeyDelete = function(
    key: string,
    scope: number
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    xcalarKeyDelete(tHandle, scope, key)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeyDelete", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve();
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn(thriftError, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Delete", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeySetIfEqual = function(
    scope: number,
    persist: boolean,
    keyCompare: string,
    oldValue: string,
    newValue: string
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeySetIfEqual(tHandle, scope, persist, keyCompare, oldValue, newValue)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeySetIfEqual", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve(null, true);
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null, true);
        } else {
            Log.errorLog("Key Set If Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeySetBothIfEqual = function(
    scope: number,
    persist: boolean,
    keyCompare: string,
    oldValue: string,
    newValue: string,
    otherKey: string,
    otherValue: string
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeySetIfEqual(tHandle, scope, persist, keyCompare, oldValue, newValue,
                        otherKey, otherValue)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeySetBothIfEqual", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve();
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Set If Both Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());

};

XcalarKeyAppend = function(
    key: string,
    stuffToAppend: string,
    persist: boolean,
    scope: number
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    xcalarKeyAppend(tHandle, scope, key, stuffToAppend)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarKeyAppend", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound ||
            thriftError.status === StatusT.StatusKvStoreNotFound)
        {
            console.info("Append fails as key or kvStore not found, put key instead");
            // if append fails because key not found, put value instead
            xcalarKeyAddOrReplace(tHandle, scope, key, stuffToAppend, persist)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            Log.errorLog("Key Append", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarGetOpStats = function(
    dstTableName: string
): XDPromise<XcalarApiOpStatsOutT> {
    if (!dstTableName) {
        console.warn('no dsttablename');
    }
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiOpStatsOutT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetOpStats(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetOpStats", error);
        Log.errorLog("XcalarGetOpStats", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarApiTop = function(
    measureIntervalInMs?: number
): XDPromise<XcalarApiTopOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    measureIntervalInMs = measureIntervalInMs ||
                          XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs;

    const deferred: XDDeferred<XcalarApiTopOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiTop(tHandle, measureIntervalInMs, 0)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarApiTop", error);
        Log.errorLog("XcalarApiTop", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetMemoryUsage = function(
    userName: string,
    userId: number
): XDPromise<XcalarApiGetMemoryUsageOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiGetMemoryUsageOutputT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetMemoryUsage(tHandle, userName, userId)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarApiGetMemoryUsage", error);
        Log.errorLog("XcalarApiGetMemoryUsage", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetAllTableMemory = function(): XDPromise<number> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<number> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    XcalarGetTables()
    .then(function(ret) {
        const tableArray: any[] = ret.nodeInfo;
        let totalSize = 0;
        for (let i = 0; i<tableArray.length; i++) {
            totalSize += ret.nodeInfo[i].size;
        }
        deferred.resolve(totalSize);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetAllMemory", error);
        Log.errorLog("XcalarGetAllMemory", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListXdfs = function(
    fnNamePattern: string,
    categoryPattern: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiListXdfs(tHandle, fnNamePattern, categoryPattern)
    .then(function(listXdfsOutput) {
        // xx remove findMinIdx until backend fixes crashes
        for (var i = 0; i < listXdfsOutput.fnDescs.length; i++) {
            if (listXdfsOutput.fnDescs[i].fnName === "findMinIdx") {
                listXdfsOutput.fnDescs.splice(i , 1);
                listXdfsOutput.numXdfs--;
                i--;
            } else {
                (listXdfsOutput.fnDescs[i] as any).displayName =
                    listXdfsOutput.fnDescs[i].fnName.split("/").pop();
            }
        }
        deferred.resolve(listXdfsOutput);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarListXdf", error);
        Log.errorLog("List Xdf", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUdfGetRes = function(
    scope: number,
    moduleName: string
): XDPromise<string> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    if (scope == null) {
        scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
    }

    const deferred: XDDeferred<string> = PromiseHelper.deferred();
    xcalarApiUdfGetRes(tHandle, scope, moduleName)
    .then(function(ret: XcalarApiUdfGetResOutputT) {
        deferred.resolve(ret.udfResPath);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarUdfGetRes", error);
        Log.errorLog("Get UDF Resolution", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarUploadPythonRejectDuplicate = function(
    moduleName: string,
    pythonStr: string
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfAdd(tHandle, UdfTypeT.UdfTypePython, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        if (error && error.output && error.output.error &&
            error.output.error.message &&
            error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        const thriftError = thriftLog("XcalarUdfUpload", error);
        Log.errorLog("Upload Python", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUploadPython = function(
    moduleName: string,
    pythonStr: string,
    absolutePath: boolean,
    checkBlank?: boolean
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName && !absolutePath) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }

    xcalarApiUdfAdd(tHandle, UdfTypeT.UdfTypePython, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        let thriftError = thriftLog("XcalarUploadPython", error);
        if (thriftError.status === StatusT.StatusUdfModuleAlreadyExists) {
            XcalarUpdatePython(moduleName, pythonStr, absolutePath)
            .then(function() {
                deferred.resolve();
            })
            .fail(function(error2) {
                if (error2 && error2.output &&
                    error2.output.error &&
                    error2.output.error.message &&
                    error2.output.error.message.length > 0) {
                    error2 = error2.output.error.message;
                }
                thriftError = thriftLog("XcalarUpdateAfterUpload", error2);
                Log.errorLog("Update of Upload Python", null, null,
                             thriftError);
                deferred.reject(thriftError);
            });
            return;
            // here do the update call
        } else if (!checkBlank && thriftError.status === StatusT.StatusUdfModuleEmpty) {
            // This is not an error because extensions may upload
            // empty udfs. So just go ahead and resolve
            deferred.resolve();
            return;
        }

        // all other case

        if (error && error.output && error.output.error &&
            error.output.error.message &&
            error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        thriftError = thriftLog("XcalarUdfUpload", error);
        Log.errorLog("Upload Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUpdatePython = function(
    moduleName: string,
    pythonStr: string,
    absolutePath?: boolean
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName && !absolutePath) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfUpdate(tHandle, UdfTypeT.UdfTypePython, moduleName,
                       pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        if (error && error.output
            && error.output.error
            && error.output.error.message
            && error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        const thriftError = thriftLog("XcalarUpdatePython", error);
        Log.errorLog("Update Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeletePython = function (
    moduleName: string,
    absolutePath?: string
): XDPromise<StatusT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName && !absolutePath) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfDelete(tHandle, moduleName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDeletePython", error);
        Log.errorLog("Delete Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDownloadPython = function(
    moduleName: string
): XDPromise<string> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<string> = PromiseHelper.deferred();
    // fromWhichWorkbook can be null

    xcalarApiUdfGet(tHandle, moduleName)
    .then(function(output) {
        deferred.resolve(output.source);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDownloadPython", error);
        Log.errorLog("Download Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

// TODO: No corresponding api
// let XcalarMemory = function() {
//     if ([null, undefined].indexOf(tHandle) !== -1) {
//         return PromiseHelper.resolve(null);
//     }
//     var deferred = PromiseHelper.deferred();
//     if (insertError(arguments.callee, deferred)) {
//         return (deferred.promise());
//     }

//     xcalarApiMemory(tHandle, null)
//     .then(function(output) {
//         deferred.resolve(output);
//     })
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarMemory", error);
//         Log.errorLog("XcalarMemory", null, null, thriftError);
//         deferred.reject(thriftError);
//     });
//     return (deferred.promise());
// };

XcalarGetQuery = function(workItem: WorkItem): string {
    return xcalarApiGetQuery(tHandle, workItem);
};

XcalarNewWorkbook = function(
    newWorkbookName: string,
    isCopy: boolean,
    copyFromWhichWorkbook: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    xcalarApiSessionNew(tHandle, newWorkbookName, isCopy,
                        copyFromWhichWorkbook)
    .then(function(res) {
        const sessionId: string = parseWorkbookId(res);
        deferred.resolve(sessionId);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarNewWorkbook", error);
        Log.errorLog("New Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeleteWorkbook = function(workbookName: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    xcalarApiSessionDelete(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDeleteWorkbook", error);
        Log.errorLog("Delete Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeactivateWorkbook = function(
    workbookName: string,
    noCleanup: boolean
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    xcalarApiSessionInact(tHandle, workbookName, noCleanup)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDeactivateWorkbook", error);
        Log.errorLog("InActive Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListWorkbooks = function(
    pattern: string,
    allowIncomplete: boolean
): XDPromise<XcalarApiSessionListOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiSessionListOutputT> = PromiseHelper.deferred();

    xcalarApiSessionList(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        if (error.xcalarStatus === StatusT.StatusSessListIncomplete && allowIncomplete) {
            console.error("Error: Incomplete session list (failed to read some sessions).");
            deferred.resolve(error["sessionList"]);
        } else {
            const thriftError = thriftLog("XcalarListWorkbooks", error);
            Log.errorLog("List Workbooks", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });
    return (deferred.promise());
};

XcalarSaveWorkbooks = function(
    workbookName: string
): XDPromise<XcalarApiSessionListOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiSessionListOutputT> = PromiseHelper.deferred();

    xcalarApiSessionPersist(tHandle, workbookName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSaveWorkbooks", error);
        Log.errorLog("Save Workbooks", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarActivateWorkbook = function(workbookName: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionActivate(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarActivateWorkbook", error);
        Log.errorLog("Activate Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

XcalarRenameWorkbook = function(
    newName: string,
    oldName: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionRename(tHandle, newName, oldName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarRenameWorkbook", error);
        Log.errorLog("Rename Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUploadWorkbook = function(
    workbookName: string,
    workbookContent: string,
    pathToAdditionalFiles: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    xcalarApiSessionUpload(tHandle, workbookName, workbookContent, pathToAdditionalFiles)
    .then(function(res) {
        const sessionId: string = parseWorkbookId(res);
        deferred.resolve(sessionId);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarUploadWorkbook", error);
        Log.errorLog("Upload Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDownloadWorkbook = function(
    workbookName: string,
    pathToAdditionalFiles: string
): XDPromise<XcalarApiSessionDownloadOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiSessionDownloadOutputT> = PromiseHelper.deferred();

    xcalarApiSessionDownload(tHandle, workbookName, pathToAdditionalFiles)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarDownloadWorkbook", error);
        Log.errorLog("Upload Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDetachWorkbook = function(userToDetachFrom: string): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    xcalarApiUserDetach(tHandle, userToDetachFrom)
    .then(deferred.resolve)
    .fail(function (error) {
        const thriftError = thriftLog("XcalarDetachWorkbook", error);
        Log.errorLog("Detach Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

XcalarGetStatGroupIdMap = function(
    nodeId: number,
    numGroupId: number
): XDPromise<XcalarApiGetStatGroupIdMapOutputT> {
    // nodeId is the node (be 0, 1, 2, 3, 4)
    // numGroupId is the max number of statue you want to return
    if (tHandle == null) {
        return PromiseHelper.resolve();
    }

    const deferred: XDDeferred<XcalarApiGetStatGroupIdMapOutputT> = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return deferred.promise();
    }

    xcalarGetStatGroupIdMap(tHandle, nodeId, numGroupId)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarGetStatGroupIdMap", error);
        Log.errorLog("Get StatGroupIdMap", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarSupportGenerate = function(
    miniBundle: boolean,
    supportId: number
): XDPromise<XcalarApiSupportGenerateOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiSupportGenerateOutputT> = PromiseHelper.deferred();
    xcalarApiSupportGenerate(tHandle, miniBundle, supportId)
    .then(function(ret) {
        console.log("Support bundle path: " + ret.bundlePath);
        console.log("Support bundle id: " + ret.supportId);
        console.log("Support bundle set: " + ret.supportBundleSent);
        deferred.resolve(ret);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarSupportGenerate", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppSet = function(
    name: string,
    hostType: string,
    duty: string,
    execStr: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    xcalarAppSet(tHandle, name, hostType, duty, execStr)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarAppSet", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppRun = function(
    name: string,
    isGlobal: boolean,
    inStr: string
): XDPromise<XcalarApiAppRunOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiAppRunOutputT> = PromiseHelper.deferred();
    xcalarAppRun(tHandle, name, isGlobal, inStr)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarAppRun", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppReap = function(
    name: string, // TODO: unused?
    appGroupId: string,
    cancel?: boolean
): XDPromise<XcalarApiAppReapOutputT> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    const deferred: XDDeferred<XcalarApiAppReapOutputT> = PromiseHelper.deferred();
    if (!cancel) {
        cancel = false;
    }
    xcalarAppReap(tHandle, appGroupId, cancel)
    .then(deferred.resolve)
    .fail(function(error) {
        let outError: any;
        if (typeof error === "object" && error.errStr) {
            try {
                outError = JSON.parse(error.errStr)[0][0];
            } catch (e) {
                outError = error;
            }
        } else {
            outError = thriftLog("XcalarAppReap", error);
        }
        Log.errorLog("App Reap", null, null, outError);
        deferred.reject(outError);
    });
    return (deferred.promise());
};

XcalarAppExecute = function(
    name: string,
    isGlobal: boolean,
    inStr: string
): XDPromise<XcalarApiAppReapOutputT> {
    const deferred: XDDeferred<any> = PromiseHelper.deferred();

    XcalarAppRun(name, isGlobal, inStr)
    .then(function(ret) {
        const appGroupId = ret.appGroupId;
        return XcalarAppReap(name, appGroupId);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
};

// TODO: No corresponding api
// let XcalarDemoFileCreate = function(fileName) {
//     var deferred = PromiseHelper.deferred();

//     xcalarDemoFileCreate(tHandle, fileName)
//     .then(function(retJson) {
//         if (retJson && retJson.error && retJson.error.length > 0) {
//             var thriftError = thriftLog("XcalarDemoFileCreate", retJson.error);
//             Log.errorLog("Create Demo File", null, null, thriftError);
//             deferred.reject(thriftError);
//         } else {
//             deferred.resolve(retJson);
//         }
//     })
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarDemoFileCreate", error);
//         Log.errorLog("Create Demo File", null, null, thriftError);
//         deferred.reject(thriftError);
//     });

//     return (deferred.promise());
// };

// TODO: No corresponding api
// Max size 45MB
// XcalarDemoFileAppend = function(fileName, fileContents) {
//     var deferred = PromiseHelper.deferred();
//     if (fileContents.length > gUploadChunkSize) {
//         return PromiseHelper.reject("File chunk must be less than 45MB");
//     }

//     xcalarDemoFileAppend(tHandle, fileName, fileContents)
//     .then(function(retJson) {
//         if (retJson && retJson.error && retJson.error.length > 0) {
//             var thriftError = thriftLog("XcalarDemoFileAppend", retJson.error);
//             Log.errorLog("Append to demo file", null, null, thriftError);
//             deferred.reject(thriftError);
//         } else {
//             deferred.resolve(retJson);
//         }
//     })
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarDemoFileAppend", error);
//         Log.errorLog("Append to demo file", null, null, thriftError);
//         deferred.reject(thriftError);
//     });

//     return (deferred.promise());
// };

// TODO: No corresponding api
// XcalarDemoFileDelete = function(fileName) {
//     var deferred = PromiseHelper.deferred();
//     xcalarDemoFileDelete(tHandle, fileName)
//     .then(function(retJson) {
//         if (retJson && retJson.error && retJson.error.length > 0) {
//             var thriftError = thriftLog("XcalarDemoFileDelete", retJson.error);
//             Log.errorLog("Delete demo file", null, null, thriftError);
//             deferred.reject(thriftError);
//         } else {
//             deferred.resolve(retJson);
//         }
//     })
//     .fail(function(error) {
//         var thriftError = thriftLog("XcalarDemoFileDelete", error);
//         Log.errorLog("Delete demo file", null, null, thriftError);
//         deferred.reject(thriftError);
//     });

//     return (deferred.promise());
// };

XcalarLogLevelGet = function(): XDPromise<XcalarApiLogLevelGetOutputT> {
    const deferred: XDDeferred<XcalarApiLogLevelGetOutputT> = PromiseHelper.deferred();
    xcalarLogLevelGet(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarLogLevelGet", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarLogLevelSet = function(
    loglevel: number,
    logFlush: number
): XDPromise<StatusT> {
    const deferred: XDDeferred<StatusT> = PromiseHelper.deferred();
    xcalarLogLevelSet(tHandle, loglevel, logFlush)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarLogLevelSet", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/*
 * targetName: "mgmtdtest target";
 * targetType: "shared";
 * targetParams = {"mountpoint": "/netstore"};
 */
XcalarTargetCreate = function(
    targetType: string,
    targetName: string,
    targetParams: object
): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    xcalarTargetCreate(tHandle, targetType, targetName, targetParams)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTargetCreate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetDelete = function(targetName: string): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    xcalarTargetDelete(tHandle, targetName)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTargetDelete", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetList = function(): XDPromise<any[]> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
    xcalarTargetList(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTargetList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetTypeList = function(): XDPromise<any[]> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
    xcalarTargetTypeList(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTargetTypeList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// IMD APIs
XcalarListPublishedTables = function(
    pubPatternMatch: string,
    getSelects: boolean = true,
    getUpdates: boolean = true,
    updateStartBatchId: number = -1
): XDPromise<XcalarApiListTablesOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiListTablesOutputT> = jQuery.Deferred();
    // Note that the arguments are not in the same order. This is deliberate for
    // programmer UX.
    xcalarListPublishedTables(tHandle, pubPatternMatch, getUpdates,
        updateStartBatchId, getSelects)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarListPublishedTables", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUnpublishTable = function(
    pubTableName: string,
    inactivateOnly: boolean
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = jQuery.Deferred();
    xcalarUnpublish(tHandle, pubTableName, inactivateOnly)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarUnpublishTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarPublishTable = function(
    srcTableName: string,
    pubTableName: string,
    txId?: number
): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = jQuery.Deferred();

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    const unixTS = 0; // TODO: Resolve whether XCE will stamp this instead
    const workItem = xcalarApiPublishWorkItem(srcTableName, pubTableName, unixTS, false);
    let def: XDPromise<any> = xcalarApiPublish(tHandle, srcTableName, pubTableName, unixTS, false);

    let query: string = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'publishTable', pubTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, pubTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarPublishTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUpdateTable = function(
    deltaTableNames: string[] | string,
    pubTableNames: string[] | string
): XDPromise<XcalarApiUpdateOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<XcalarApiUpdateOutputT> = jQuery.Deferred();
    const unixTS = null;
    xcalarApiUpdate(tHandle, deltaTableNames, pubTableNames, unixTS, false)
    .then(deferred.resolve)
    .fail(function(error) {
        const thriftError = thriftLog("XcalarTargetTypeList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/**
 * limitRows: set the return of row for each node
 */
XcalarRefreshTable = function(
    pubTableName: string,
    dstTableName: string,
    minBatch: number,
    maxBatch: number,
    txId: number,
    filterString: string,
    columnInfo: RefreshColInfo[],
    limitRows?: number
): XDPromise<XcalarApiNewTableOutputT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    let columns: XcalarApiColumnT[] = null;
    if (columnInfo != null) {
        columns = [];
        columnInfo.forEach((col) => {
            columns.push(new XcalarApiColumnT(col));
        });
    }

    const workItem = xcalarApiSelectWorkItem(pubTableName, dstTableName,
        minBatch, maxBatch, filterString, columns, limitRows);

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    let def: XDPromise<any>;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        def = xcalarApiSelect(tHandle, pubTableName, dstTableName, maxBatch, minBatch,
            filterString, columns, limitRows)
    }

    const query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, SQLOps.RefreshTables, dstTableName, query);

    // Note max and min places are switched because the API is a little strange
    def
    .then(function(ret) {
        Transaction.log(txId, query, dstTableName, (ret as any).timeElapsed);
        deferred.resolve.apply(this, arguments);
    })
    .fail(function(error) {
        const thriftError = thriftLog("XcalarRefreshTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarRestoreTable = function(pubTableName: string): XDPromise<any> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = jQuery.Deferred();
    xcalarRestoreTable(tHandle, pubTableName)
        .then(deferred.resolve)
        .fail(function (error) {
            const thriftError = thriftLog("XcalarRestoreTable", error);
            deferred.reject(thriftError);
        });

    return deferred.promise();
};

XcalarCoalesce = function(pubTableName: string): XDPromise<StatusT> {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<StatusT> = jQuery.Deferred();
    xcalarCoalesce(tHandle, pubTableName)
        .then(deferred.resolve)
        .fail(function (error) {
            const thriftError = thriftLog("XcalarCoalesce", error);
            deferred.reject(thriftError);
        });

    return deferred.promise();
}

/** Changes the ownership for a Published table. This happens becauses today
 * published tables have owners and only the owners are allowed to perform
 * certain actions on the table. Only one user can perform this action at any
 * time. Hence in order for another user to perform the action, the ownership
 * has to be reassigned.
 * @param publishTableName Name of the Published table
 * @param userIdName User id of the user to assign to
 * @param sessionName Session of the user to assign the ownership to
 */
XcalarPublishTableChangeOwner = function(
    publishTableName: string,
    userIdName: string,
    sessionName: string
): XDPromise<any> {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    const deferred: XDDeferred<any> = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarPtChangeOwner(tHandle, publishTableName, userIdName, sessionName)
    .then(deferred.resolve)
    .fail(function (error) {
        var thriftError = thriftLog("xcalarPtChangeOwner", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

if (typeof exports !== "undefined") {
    exports.TypeCheck = TypeCheck;
    exports.colInfoMap = colInfoMap;
}
