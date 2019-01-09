class DagTabPublished extends DagTab {
    public static readonly PATH = "/Published/";
    private static readonly _prefixUDF: string = "published dataflow";
    // XXX TODO: encrypt it
    private static readonly _secretUser: string = ".xcalar.published.df";
    private static readonly _delim: string = "_Xcalar_";
    private static readonly _dagKey: string = "DF2";
    private static readonly _optimizedKey: string = "DF2Optimized";
    private static _currentSession: string;

    private _version: number;
    /**
     * DagTabPublished.restore
     */
    public static restore(): XDPromise<DagTabPublished[]> {
        const deferred: XDDeferred<DagTabPublished[]> = PromiseHelper.deferred();
        const dags: DagTabPublished[] = [];

        DagTabPublished._listSession()
        .then((res: {sessions: any[]}) => {
            const promises: XDPromise<void>[] = [];
            res.sessions.map((sessionInfo) => {
                const name: string = sessionInfo.name;
                if (!name.startsWith(".temp")) {
                    // filter out .temp dataflows
                    const id: string = sessionInfo.sessionId;
                    const dagTab: DagTabPublished = new DagTabPublished(name, id);
                    dags.push(dagTab);

                    if (sessionInfo.state === "Inactive") {
                        const promise = this._activateSessionAndResetDag(dagTab);
                        promises.push(promise);
                    }
                }
            });

            return PromiseHelper.when(...promises);
        })
        .then(() => {
            deferred.resolve(dags);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * @returns string
     */
    public static getSecretUser(): string {
        return this._secretUser;
    }

    /**
     * @returns string
     */
    public static getDelim(): string {
        return this._delim;
    }

    /**
     * @returns string
     */
    public static getPrefixUDF(): string {
        return this._prefixUDF;
    }

    private static _listSession(): XDPromise<{sessions: any[]}> {
        this._switchSession(null);
        const promise = XcalarListWorkbooks("*", true);
        this._resetSession();
        return promise;
    }

    private static _switchSession(sessionToSwitch: string): void {
        this._currentSession = sessionName;
        const user: XcUser = new XcUser(this._secretUser);
        XcUser.setUserSession(user);
        setSessionName(sessionToSwitch);
    }

    private static _resetSession(): void {
        XcUser.resetUserSession();
        setSessionName(this._currentSession);
    }

    // because published tab is shared, so once it detects as inactivate,
    // will activate it and rest graph immediately
    private static _activateSessionAndResetDag(dagTab: DagTabPublished): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        dagTab._activateWKBK()
        .then(() => {
            return dagTab.load(true);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(() => {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    public constructor(name: string, id?: string, graph?: DagGraph) {
        name = name.replace(new RegExp(DagTabPublished._delim, "g"), "/");
        if (graph != null) {
            // should be a deep copy
            graph = graph.clone();
        }
        super(name, id, graph);
        this._kvStore = new KVStore(DagTabPublished._dagKey, gKVScope.WKBK);
        this._version = 0;
    }

    public getName(): string {
        return this._name;
    }

    public getPath(): string {
        return DagTabPublished.PATH + this.getName();
    }

    public getUDFContext(): {
        udfUserName: string,
        udfSessionName: string
    } {
        return {
            udfUserName: DagTabPublished._secretUser,
            udfSessionName: this._getWKBKName()
        };
    }

    public getUDFDisplayPathPrefix(): string {
        return "/workbook/" + DagTabPublished._secretUser + "/" + this._getWKBKName() + "/";
    }

    /**
     * Get node's UDF resolutions in a published dataflow
     * @param dagNode 
     * @description
     * All UDFs are stored in a secret user's namespace in shared dataflow cases.
     * So get the correct resolution of UDFs would be tricky:
     * 1. Switch the user seesion to the secret user
     * 2. Call API to get the resolutions
     * 3. Switch back to regular user session
     */
    public getNodeUDFResolution(dagNode: DagNodeMap): XDPromise<Map<string, string>> {
        if (dagNode == null) {
            return PromiseHelper.reject('DagNode is null');
        }
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = dagNode.getModuleResolutions();
        // Do not wait for the API done,
        // or there could be chances unexpected API calls happening before reset session
        DagTabPublished._resetSession();
        
        return promise;
    }

    public load(reset?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((dagInfo, graph) => {
            this._version = dagInfo.version;
            if (reset) {
                this._resethHelper(graph);
            }
            this.setGraph(graph);
            if (reset) {
                return this._writeToKVStore();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    public save(): XDPromise<void> {
        if (this._disableSaveLock > 0) {
            return PromiseHelper.resolve();
        }

        const oldVersion: number = this._version;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((dagInfo) => {
            // when version not match, cannot save
            if (dagInfo == null || dagInfo.version !== this._version) {
                return PromiseHelper.reject();
            }

            this._version++;
            this._writeToKVStore();
        })
        .then(() => {
            this._trigger("save");
            Log.commit();
            KVStore.logSave(true);
            deferred.resolve();
        })
        .fail((error) => {
            this._version = oldVersion;
            deferred.reject(error);
        })

        return deferred.promise();
    }

    public delete(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._deleteTableHelper()
        .then(() => {
            return this._deleteWKBK();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (error.status === StatusT.StatusSessionNotFound) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public upload(content: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabPublished._switchSession(null);
        XcalarUploadWorkbook(this._getWKBKName(), content, "")
        .then((sessionId) => {
            this._id = sessionId;
            deferred.resolve();
        })
        .fail(deferred.reject);

        DagTabPublished._resetSession();
        return deferred.promise();
    }

    public download(name: string, optimized?: boolean): XDPromise<void> {
        let fileName: string = name || this.getShortName();
        fileName += gDFSuffix;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const writeOptimizedArgsDef: XDPromise<void> = optimized ?
        this._writeOptimizedRetinaArgs() : PromiseHelper.resolve();

        writeOptimizedArgsDef
        .then(() => {
            DagTabPublished._switchSession(null);
            const promise = XcalarDownloadWorkbook(this._getWKBKName(), "");
            DagTabPublished._resetSession();
            return promise;
        })
        .then((file) => {
            xcHelper.downloadAsFile(fileName, file.sessionContent, true);
            if (optimized) {
                return PromiseHelper.alwaysResolve(this._removeOptimizedRetainArgs());
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public publish(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasCreatWKBK: boolean = false;
        this._createWKBK()
        .then((sessionId: string) => {
            hasCreatWKBK = true;
            this._id = sessionId;
            return this._activateWKBK();
        })
        .then(() => {
            return this._writeToKVStore();
        })
        .then(() => {
            return this._uploadLocalUDFToShared();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (typeof error === "string") {
                error = {log: error};
            }
            if (hasCreatWKBK) {
                // if fails and workbook has created
                // delete it as a rollback
                this._deleteWKBK();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public clone(newTabName): XDPromise<void> {
        const wkbkName: string = this._getWKBKName();
        DagTabPublished._switchSession(wkbkName);
        const promise = XcalarNewWorkbook(newTabName, true, wkbkName);
        DagTabPublished._resetSession();
        return promise;
    }

    public copyUDFToLocal(overwrite: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const id: string = this._id;
        let udfPathPrefix: string = `/workbook/${DagTabPublished._secretUser}/${id}/udf/`;
        const udfPattern: string = udfPathPrefix + "*";

        XcalarListXdfs(udfPattern, "User*")
        .then((res) => {
            const udfAbsolutePaths = {};
            const prefixLen: number = udfPathPrefix.length;
            res.fnDescs.forEach((fnDesc) => {
                const path = fnDesc.fnName.split(":")[0];
                const moduelName = path.substring(prefixLen);
                udfAbsolutePaths[path] = moduelName;
            });
            return this._downloadShareadUDFToLocal(udfAbsolutePaths, overwrite)
        })
        .then(() => {
            UDFFileManager.Instance.refresh(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _loadFromKVStore(): XDPromise<any> {
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = super._loadFromKVStore();
        DagTabPublished._resetSession();
        return promise;
    }

    // save meta
    // XXX TODO: add socket to lock other users
    protected _writeToKVStore(): XDPromise<any> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const json = this._getJSON();
        if (json == null) {
            return PromiseHelper.reject("Invalid dataflow structure");
        }
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = super._writeToKVStore(json);
        DagTabPublished._resetSession();
        return promise;
    }

    protected _getJSON(): {
        name: string,
        id: string,
        dag: DagGraphInfo,
        autoSave: boolean,
        version: number,
        unsaved?: boolean
    } {
        const json: {
            name: string,
            id: string,
            dag: DagGraphInfo,
            autoSave: boolean,
            version: number
        } = <any>super._getJSON();
        json.version = this._version;
        return json;
    }

    private _getWKBKName(name?: string): string {
        name = name || this._name;
        return name.replace(/\//g, DagTabPublished._delim);
    }

    private _createWKBK(): XDPromise<string> {
        DagTabPublished._switchSession(null);
        const promise = XcalarNewWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _activateWKBK(): XDPromise<void> {
        DagTabPublished._switchSession(null);
        const promise = XcalarActivateWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _deleteWKBK(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // XXX TODO Should not require deactivate (bug 14090)
        PromiseHelper.alwaysResolve(this._deactivateHelper())
        .then(() => {
            DagTabPublished._switchSession(null);
            const promise = XcalarDeleteWorkbook(this._getWKBKName());
            DagTabPublished._resetSession();
            return promise;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deactivateHelper(): XDPromise<void> {
        DagTabPublished._switchSession(null);
        const promise = XcalarDeactivateWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _uploadLocalUDFToShared(): XDPromise<void> {
        let downloadHelper = (moduleName: string): XDPromise<string> => {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const udfPath = UDFFileManager.Instance.getCurrWorkbookPath() + moduleName;
            UDFFileManager.Instance.getEntireUDF(udfPath)
            .then((udfStr: string) => {
                deferred.resolve(udfStr);
            })
            .fail((error, isDownloadErr) => {
                if (isDownloadErr) {
                    // when download udf has error
                    deferred.reject(error);
                } else {
                    // when the local udf not exist, it should be a gloal one
                    deferred.resolve(null);
                }
            });

            return deferred.promise();
        };

        let upload = (moduleName: string): XDPromise<void> => {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            downloadHelper(moduleName)
            .then((udfStr) => {
                if (udfStr == null) {
                    // nothing to upload
                    return;
                }
                // XXX TODO: use absolute path
                DagTabPublished._switchSession(this._getWKBKName());
                const promise = XcalarUploadPython(moduleName, udfStr);
                DagTabPublished._resetSession();
                return promise;
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }

        const udfSet: Set<string> = this._dagGraph.getUsedUDFModules();
        const promises: XDPromise<void>[] = [];
        udfSet.forEach((moduleName) => {
            if (moduleName !== "default") {
                promises.push(upload(moduleName));
            }
        });
        return PromiseHelper.when(...promises);
    }

    private _downloadShareadUDFToLocal(
        udfAbsolutePaths: object,
        overwrite: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const failures: string[] = [];

        let upload = (udfPath: string, moduleName: string): XDPromise<void> => {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let udfStr: string = null;
            XcalarDownloadPython(udfPath)
            .then((res) => {
                udfStr = res;
                if (udfStr == null) {
                    // nothing to upload
                    return;
                }

                let promise = null;
                if (overwrite) {
                    promise = XcalarUploadPython(moduleName, udfStr);
                } else {
                    promise = XcalarUploadPythonRejectDuplicate(moduleName, udfStr);
                }
                return promise;
            })
            .then(() => {
                innerDeferred.resolve();
            })
            .fail((error) => {
                console.error("Upload UDF to local fails", error);
                failures.push(moduleName + ": " + error.error);
                innerDeferred.resolve(); // still resolve it
            });

            return innerDeferred.promise();
        }

        const promises: XDPromise<void>[] = [];
        for (let path in udfAbsolutePaths) {
            promises.push(upload(path, udfAbsolutePaths[path]));
        }

        PromiseHelper.when(...promises)
        .then(() => {
            if (failures.length > 0) {
                deferred.reject({
                    error: failures.join("\n")
                });
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject)
        return deferred.promise();
    }

    private _getOptimizedRetinaArgsKVStore(): KVStore {
        return new KVStore(DagTabPublished._optimizedKey, gKVScope.WKBK);
    }

    private _writeOptimizedRetinaArgs(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagGraph.getRetinaArgs()
        .then((res) => {
            const kvStore = this._getOptimizedRetinaArgsKVStore();
            DagTabPublished._switchSession(this._getWKBKName());
            const promise = kvStore.put(JSON.stringify(res), true, true);
            DagTabPublished._resetSession();
            return promise;
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            deferred.reject({
                error: error.type
            });
        });

        return deferred.promise();
    }

    private _removeOptimizedRetainArgs(): XDPromise<void> {
        const kvStore = this._getOptimizedRetinaArgsKVStore();
        return kvStore.delete();
    }
}