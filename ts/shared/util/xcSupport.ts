namespace XcSupport {
    var _commitCheckTimer: number;

    var _connectionCheckTimer: number;
    var _heartbeatLock: number = 0;

    function autoSave(): XDPromise<void> {
        if (Log.hasUncommitChange() || KVStore.hasUnCommitChange()) {
            return KVStore.commit();
        } else {
            return PromiseHelper.resolve();
        }
    }

    function checkXcalarState(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcUser.CurrentUser.commitCheck(true)
            .then(() => {
                return MemoryAlert.Instance.check(false);
            })
            .then(() => {
                return autoSave();
            })
            .then(deferred.resolve)
            .fail(deferred.reject)

        return deferred.promise();
    }

    function checkXcalarConnection(): XDPromise<boolean> {
        // if we get this status, there may not be a connection to the backend
        // if xcalargetversion doesn't work then it's very probably that
        // there is no connection so alert.
        return XVM.checkVersion(true);
    }

    function checkConnectionTrigger(cnt: number, alertId: string): void {
        const interval: number = 1000; // 1s/update
        const connectionCheckInterval: number = 10000; // 10s/check

        const mod: number = Math.floor(connectionCheckInterval / interval);
        cnt = cnt % mod;

        const shouldCheck: boolean = (cnt === 0);
        const timeRemain: number = (connectionCheckInterval - cnt * interval) / 1000;

        let msg: string = AlertTStr.NoConnect + " ";
        msg += shouldCheck
            ? AlertTStr.Connecting
            : xcHelper.replaceMsg(AlertTStr.TryConnect, {
                second: timeRemain
            });

        Alert.updateMsg(alertId, msg);

        clearTimeout(_connectionCheckTimer);

        _connectionCheckTimer = <any>setTimeout(() => {
            if (shouldCheck) {
                // if fail, continue to another check
                checkXcalarConnection()
                    .then((versionMatch) => {
                        clearTimeout(_connectionCheckTimer);
                        // reload browser if connection back
                        const hardLoad: boolean = !versionMatch;
                        xcHelper.reload(hardLoad);
                    })
                    .fail(() => {
                        checkConnectionTrigger(cnt + 1, alertId);
                    });
            } else {
                checkConnectionTrigger(cnt + 1, alertId);
            }
        }, interval);
    }

    /**
     * XcSupport.heartbeatCheck
     */
    export function heartbeatCheck(): boolean {
        if (WorkbookManager.getActiveWKBK() == null) {
            console.info("no active workbook, not check");
            return false;
        }

        let isChecking: boolean = false;
        // 2 mins each check by default
        let commitCheckInterval: number =
            (UserSettings.getPref('commitInterval') * 1000) || 120000;

        clearInterval(_commitCheckTimer);
        _commitCheckTimer = <any>setInterval(() => {
            if (KVStore.getKey("commitKey") == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            // last time not finishing
            if (isChecking) {
                console.warn("Last time's check not finishing yet!");
                return;
            }

            isChecking = true;
            checkXcalarState()
                .always(() => {
                    isChecking = false;
                });

        }, commitCheckInterval);
        return true;
    }

    /**
     * XcSupport.stopHeartbeatCheck
     */
    export function stopHeartbeatCheck(): void {
        clearInterval(_commitCheckTimer);
        _commitCheckTimer = null;
        _heartbeatLock++;
        // console.log("lock to", heartbeatLock);
    }

    /**
     * XcSupport.restartHeartbeatCheck
     */
    export function restartHeartbeatCheck(): boolean {
        if (_heartbeatLock === 0) {
            console.error("wrong trigger, must combine with stopHeartbeatCheck");
            return false;
        }
        _heartbeatLock--;
        // console.log("unlock to", heartbeatLock);
        if (_heartbeatLock > 0) {
            console.info("heart beat is locked");
            return false;
        }

        return XcSupport.heartbeatCheck();
    }

    /**
     * XcSupport.hasHeartbeatCheck
     */
    export function hasHeartbeatCheck(): boolean {
        return (_commitCheckTimer != null);
    }

    /**
     * XcSupport.checkConnection
     */
    export function checkConnection() {
        checkXcalarConnection()
            .fail(() => {
                const error: object = { error: ThriftTStr.CCNBE };
                const id: string = Alert.error(ThriftTStr.CCNBEErr, error, {
                    lockScreen: true,
                    noLogout: true
                });
                Log.backup();

                checkConnectionTrigger(10, id);
            });
    }

    /**
     * XcSupport.downloadLRQ
     */
    export function downloadLRQ(lrqName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarExportRetina(lrqName)
            .then((a) => {
                xcHelper.downloadAsFile(lrqName + ".tar.gz", a.retina, true);
                deferred.resolve();
            })
            .fail((error) => {
                Alert.error(DFTStr.DownloadErr, error);
                deferred.reject(error);
            });

        return deferred.promise();
    }

    /**
     * XcSupport.getRunTimeBreakdown
     * @param dfName
     */
    export function getRunTimeBreakdown(dfName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarQueryState(dfName)
            .then((ret) => {
                const nodeArray: any[] = ret.queryGraph.node;
                for (let i = 0; i < nodeArray.length; i++) {
                    console.log(XcalarApisTStr[nodeArray[i].api] + " - " +
                        nodeArray[i].name.name + ": " +
                        nodeArray[i].elapsed.milliseconds + "ms");
                }
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    if (typeof window !== "undefined" && window["unitTestMode"]) {
        XcSupport["__testOnly__"] = {
            checkXcalarState: checkXcalarState
        }
    }
}
