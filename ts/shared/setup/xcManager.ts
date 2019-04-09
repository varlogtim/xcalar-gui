namespace xcManager {
    let setupStatus: string;

    /**
     * xcManager.setup
     * Sets up most services for XD
     */
    export function setup(): XDPromise<void> {
        setupStatus = SetupStatus["Setup"];
        // use promise for better unit test
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        gMinModeOn = true; // startup use min mode;
        $("body").addClass("xc-setup");
        $("#favicon").attr("href", paths.favicon);

        Compatible.check();
        xcGlobal.setup();
        setupThrift("");

        let xcSocket: XcSocket;
        let firstTimeUser: boolean;

        xcTimeHelper.setup()
        .then(() => {
            return hotPatch();
        })
        .then(function() {
            return XcUser.setCurrentUser();
        })
        .then(function() {
            XVM.setup();

            setupUserArea();
            xcTooltip.setup();
            CSHelp.setup();
            StatusBox.setup();
            StatusMessage.setup();
            BottomMenu.setup(); // async
            DataSourceManager.setup();
            TableComponent.setup();
            MonitorPanel.setup();
            JupyterPanel.setup();
            IMDPanel.setup();
            setupModals();
            TutorialsSetup.setup();
            Admin.initialize();
            xcSuggest.setup();
            DagParamPopup.setup();
            documentReadyGeneralFunction();

            xcSocket = setupSocket();
            try {
                // In case mixpanel is not loaded
                xcMixpanel.setup();
            } catch (error){
                console.log("mixpanel is not loaded");
            }
            return XVM.checkVersionAndLicense();
        })
        .then(function() {
            XVM.checkBuildNumber();
            return XVM.checkKVVersion();
        })
        .then(function(isFirstTimeUser) {
            firstTimeUser = isFirstTimeUser;
        })
        .then(function() {
            // First XD instance to run since cluster restart
            return oneTimeSetup();
        })
        .then(setupWKBKIndependentPanels)
        .then(setupSession) // restores info from kvStore
        .then(function() {
            return XVM.initializeMode();
        })
        .then(function() {
            $("#topMenuBarTabs").removeClass("xc-hidden");
            MainMenu.setup();
            setupModeArea();
            StatusMessage.updateLocation(false, "Loading Extensions");
            return ExtensionManager.setup();
        })
        .then(function() {
            StatusMessage.updateLocation(false, "Loading UDFs");

            return XDFManager.Instance.setup();
        })
        .then(function() {
            StatusMessage.updateLocation(false, "Loading Aggregates");
            return DagAggManager.Instance.setup();
        })
        .then(function() {
            setupOpPanels();
            // XXX TODO, hide these view in Dio
            JSONModal.setup();
            AggModal.setup();
            BottomMenu.initialize(); // async
            WorkbookPanel.initialize();
            window["ajv"] = new Ajv(); // json schema validator

            // const $sqlPanel = $("#monitor-query-history");
            // SqlQueryHistoryPanel.Card.getInstance().setup({
            //     $container: $sqlPanel,
            //     checkContainerVisible: () => {
            //         return $sqlPanel.hasClass('active');
            //     }
            // });
            SQLWorkSpace.Instance.setup();
            StatusMessage.updateLocation(false, "Restoring Dataflows");
            return setupDagPanel();
        })
        .then(setupTutorial)
        .then(function() {
            let promise = PTblManager.Instance.getTablesAsync();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(function() {
            // By default show panel
            if (XVM.isSQLMode()) {
                MainMenu.openPanel("sqlPanel");
            } else {
                MainMenu.openPanel("dagPanel");
                MainMenu.open(true);
            }
            if (firstTimeUser) {
                // show hint to create datasets if no tables have been created
                // in this workbook
                showDatasetHint();
            }
            StatusMessage.updateLocation(false, null);
            if (!isBrowserFirefox && !isBrowserIE) {
                gMinModeOn = false; // turn off min mode
            }

            setupStatus = SetupStatus["Success"];

            console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
            'background-color: #5CB2E8; ' +
            'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

            xcSocket.addEventsAfterSetup();
            // start heartbeat check
            XcSupport.heartbeatCheck();

            if(!window["isBrowserSupported"]) {
                Alert.error(AlertTStr.UnsupportedBrowser, "", {
                    msgTemplate: AlertTStr.BrowserVersions,
                    sizeToText: true
                });
            }
            deferred.resolve();
        })
        .fail(function(error) {
            $("body").addClass("xc-setup-error");
            setupStatus = SetupStatus["Fail"];
            handleSetupFail(error, firstTimeUser);
            deferred.reject(error);
        })
        .always(function() {
            $("body").removeClass("xc-setup");
            // get initial memory usage
            MemoryAlert.Instance.check();

            if (!gMinModeOn) {
                $("#initialLoadScreen").fadeOut(200, function() {
                    $("#initialLoadScreen").hide();
                    TableComponent.update();
                });
            } else {
                $("#initialLoadScreen").hide();
                TableComponent.update();
            }
        });

        return deferred.promise();
    };

    function handleSetupFail(error: string|object, firstTimeUser: boolean): void {
        // in case it's not setup yet
        $("#topMenuBarTabs").removeClass("xc-hidden");
        MainMenu.setup();
        QueryManager.setup();
        SupTicketModal.setup();
        Alert.setup();
        StatusMessage.setup();
        StatusBox.setup();
        xcTooltip.setup();
        let locationText: string = StatusMessageTStr.Error;
        const isNotNullObj: boolean = error && (typeof error === "object");
        if (error === WKBKTStr.NoWkbk){
            // when it's new workbook
            $("#initialLoadScreen").hide();
            WorkbookPanel.forceShow();
            locationText = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
            // start socket (no workbook is also a valid login case)
            let userExists: boolean = false;
            XcUser.CurrentUser.holdSession(null, false)
            .fail(function(err) {
                if (err === WKBKTStr.Hold) {
                    userExists = true;
                    WorkbookManager.gotoWorkbook(null, true);
                }
            })
            .always(function() {
                if (firstTimeUser && !userExists) {
                    Admin.addNewUser();
                    // when it's new user first time login
                    Alert.show(<Alert.AlertOptions>{
                        "title": DemoTStr.title,
                        "msg": NewUserTStr.msg,
                        "buttons": [{
                            "name": AlertTStr.Close,
                            "className": "cancel"
                        },
                        {
                            "name": NewUserTStr.openGuide,
                            "className": "confirm",
                            "func": function() {
                                const url: string = "https://discourse.xcalar.com/c/xcalar-training-videos";
                                window.open(url, "_blank");
                            }
                        }],
                        "noCancel": true
                    });
                }
                JupyterPanel.initialize(true);
            });
        } else if (error === WKBKTStr.Hold) {
            // when seesion is hold by others and user choose to not login
            WorkbookManager.gotoWorkbook(null, true);
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionNotFound)
        {
            locationText = WKBKTStr.NoOldWKBK;
            Alert.show({
                "title": WKBKTStr.NoOldWKBK,
                "instr": WKBKTStr.NoOldWKBKInstr,
                "msg": WKBKTStr.NoOldWKBKMsg,
                "lockScreen": true,
                "logout": true,
                "buttons": [{
                    "name": WKBKTStr.NewWKBK,
                    "func": function() {
                        WorkbookManager.inActiveAllWKBK();
                    }
                }],
                "hideButtons": ['downloadLog']
            });
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionUsrAlreadyExists)
        {
            locationText = ThriftTStr.SessionElsewhere;
            let errorMsg: string;
            try {
                const ip: string = error["log"].match(/IP address \'(.*)\'/)[1];
                errorMsg = xcHelper.replaceMsg(ThriftTStr.LogInDifferentWrap, {
                    ip: ip,
                    ip2: ip
                });
            } catch (e) {
                errorMsg = error["error"] + '\n' + ThriftTStr.LogInDifferent;
            }
            Alert.error(ThriftTStr.SessionElsewhere, errorMsg, {
                "lockScreen": true
            });
        } else {
            // when it's an error from backend we cannot handle
            let errorStruct: Alert.AlertErrorOptions = {"lockScreen": true};
            let title: string;
            if (!isNotNullObj ||
                !error["error"] ||
                typeof(error["error"]) !== "string")
            {
                title = ThriftTStr.SetupErr;
            } else {
                if (error["error"].includes("expired")) {
                    title = ThriftTStr.SetupErr;
                    errorStruct = {"lockScreen": true, "expired": true};
                } else if (error["error"].includes("Update required")) {
                    title = ThriftTStr.UpdateErr;
                    error = ErrTStr.Update;
                } else if (error["error"].includes("Connection")) {
                    title = ThriftTStr.CCNBEErr;
                    errorStruct["noLogout"] = true;
                } else {
                    title = ThriftTStr.SetupErr;
                }
            }
            locationText = StatusMessageTStr.Error;
            // check whether there's another alert that's already on the screen
            Alert.error(title, error, errorStruct);
        }
        StatusMessage.updateLocation(true, locationText);
    }

    /**
     * xcManager.isInSetup
     * returns true if the webpage is in setup mode
     */
    export function isInSetup(): boolean {
        return $("body").hasClass("xc-setup") ||
               $("body").hasClass("xc-setup-error");
    };

    /**
     * xcManager.getStatus
     * returns the setup status
     */
    export function getStatus(): string {
        return setupStatus;
    };

    /**
     * xcManager.isStatusFail
     * returns true if setup has failed
     */
    export function isStatusFail(): boolean {
        return (setupStatus === SetupStatus["Fail"]);
    };

    /**
     * xcManager.unload
     * unloads user's resources from XD
     * @param isAsync - boolean, if request is async
     * @param doNotLogout - if user should not be logged out durring unload
     */
    export function unload(isAsync: boolean = false, doNotLogout: boolean = false): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (isAsync) {
            // async unload should only be called in beforeload
            // this time, no commit, only free result set
            // as commit may only partially finished, which is dangerous
            SQLWorkSpace.Instance.save();
            return deferred.reject("Async unload");
        } else {
            SQLWorkSpace.Instance.save()
            .then(function() {
                return XcUser.CurrentUser.releaseSession();
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                xcManager.removeUnloadPrompt();
                if (doNotLogout) {
                    window["location"]["href"] = paths.index;
                } else {
                    logoutRedirect();
                }
                return deferred.resolve();
            });
        }

        return deferred.promise();
    };

    /**
     * xcManager.forceLogout
     * logs the user out with no confirmation modals
     */
    export function forceLogout(): void {
        xcManager.removeUnloadPrompt();
        logoutRedirect();
    };

    /**
     * xcManager.removeUnloadPrompt
     * Removes prompt for user unload.
     * @param markUser - boolean, if true record the time the user unloaded
     */
    export function removeUnloadPrompt(markUser: boolean = false): void {
        window.onbeforeunload = function() {
            if (markUser) {
                markUserUnload();
            }
        }; // Do not enable prompt
        window.onunload = function() {
            // do not call unload again, but keep auto-sending email for liveHelp
            // auto-send check is then implemented in liveHelpModal.js
            LiveHelpModal.userLeft();
        };
    };

    function markUserUnload(): void {
        const xcSocket: XcSocket = XcSocket.Instance;
        if (xcSocket.isResigered() && WorkbookManager.getLastActiveWKBK()) {
            xcSessionStorage.setItem(WorkbookManager.getLastActiveWKBK(), String(new Date().getTime()));
        }
    }

    function oneTimeSetup(): XDPromise<any> {
        function initLocks() {
            const keys: any = WorkbookManager.getGlobalScopeKeys(Durable.Version);
            const keyAttrs: object[] = [{
                "key": keys.gSettingsKey,
                "scope": gKVScope.GLOB
            }, {
                "key": keys.gSharedDSKey,
                "scope": gKVScope.GLOB
            }];
            const promises: XDPromise<void>[] = [];

            keyAttrs.forEach(function(keyAttr) {
                const mutex: Mutex = KVStore.genMutex(keyAttr["key"], keyAttr["scope"]);
                const concurrency: Concurrency = new Concurrency(mutex);
                promises.push(concurrency.initLock());
            });

            return PromiseHelper.when.apply(this, promises);
        }

        function actualOneTimeSetup(force: boolean = false): XDPromise<any> {
            let def: XDDeferred<any> = PromiseHelper.deferred();
            let markAsAlreadyInit: () => XDPromise<any> = function() {
                return XcalarKeyPut(GlobalKVKeys.InitFlag,
                                        InitFlagState.AlreadyInit, false,
                                        gKVScope.GLOB);
            };
            const initPhase: Function = function(): XDPromise<any> {
                const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();
                initLocks()
                .then(function() {
                    return markAsAlreadyInit();
                })
                .then(innerDeferred.resolve)
                .fail(function(error) {
                    if (force && error === ConcurrencyEnum.AlreadyInit) {
                        // we see this issue, patch a fix
                        markAsAlreadyInit()
                        .then(innerDeferred.resolve)
                        .fail(innerDeferred.reject);
                    } else {
                        innerDeferred.reject(error);
                    }
                });

                return innerDeferred.promise();
            };

            XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
            .then(function(ret) {
                if (!ret || ret.value !== InitFlagState.AlreadyInit) {
                    return initPhase();
                }
            })
            .then(def.resolve)
            .fail(def.reject);

            return def.promise();
        }

        function showForceAlert(deferred: XDDeferred<StatusT>): void {
            $("#initialLoadScreen").hide();
            Alert.show({
                title: AlertTStr.UnexpectInit,
                msg: AlertTStr.UnexpectInitMsg,
                hideButtons: ["cancel"],
                buttons: [{
                    name: CommonTxtTstr.Retry,
                    className: "retry",
                    func: function() {
                        $("#initialLoadScreen").show();
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.GLOB)
                            .then(function(ret) {
                                if (ret && ret.value ===
                                        InitFlagState.AlreadyInit) {
                                    return deferred.resolve();
                                } else {
                                    showForceAlert(deferred);
                                }
                            })
                            .fail(function(err) {
                                console.error(err);
                                showForceAlert(deferred);
                            });
                        }, 5000);
                    }
                },
                {
                    name: CommonTxtTstr.Overwrite,
                    className: "force",
                    func: function() {
                        $("#initialLoadScreen").show();
                        console.log("Force");
                        actualOneTimeSetup(true)
                        .then(function() {
                            // Force unlock
                            return XcalarKeyPut(
                                          GlobalKVKeys.XdFlag,
                                          "0", false, gKVScope.GLOB);
                        })
                        .then(deferred.resolve)
                        .fail(function(err) {
                            console.error(err, "SEVERE ERROR: Race " +
                                          "conditions ahead");
                            deferred.resolve();
                        });
                    }
                }]
            });
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
        .then(function(ret) {
            if (ret && ret.value === InitFlagState.AlreadyInit) {
                deferred.resolve();
            } else {
            // NOTE: Please do not follow this for generic concurrency use.
            // This is a one time setup where the lock init phase is part of the
            // backend startup process
                const globalMutex: Mutex = new Mutex(GlobalKVKeys.XdFlag, XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal);
                const concurrency: Concurrency = new Concurrency(globalMutex);
                concurrency.tryLock()
                .then(function() {
                    return actualOneTimeSetup();
                })
                .then(function() {
                    return concurrency.unlock();
                })
                .then(deferred.resolve)
                .fail(function(err) {
                    if (err === ConcurrencyEnum.OverLimit) {
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.GLOB)
                            .then(function(ret) {
                                if (ret &&
                                    ret.value === InitFlagState.AlreadyInit) {
                                    // All good
                                    deferred.resolve();
                                } else {
                                    showForceAlert(deferred);
                                }
                            })
                            .fail(function(err) {
                                console.error(err);
                                showForceAlert(deferred);
                            });
                        }, 5000);
                    } else {
                        showForceAlert(deferred);
                    }
                });
            }
        })
        .fail(function(err) {
            console.error("Error Setting up global flags. May have race " +
                          "conditions later. Letting it go through", err);
            deferred.resolve();
        });
        return deferred.promise();
    }

    function setupDagPanel(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTblManager.Instance.setup()
        .then(() => {
            DagNode.setup();
            CommentNode.setup();
            DagTab.setup();
            DagTabSQLFunc.setup();
            DagViewManager.Instance.setup();
            DagSearch.Instance.setup();
            return setupDagList();
        })
        .then(deferred.resolve)
        .fail((err) => {
            console.error("DagPanel Initialize Fail", err);
            deferred.reject(err);
        });
        return deferred.promise();
    }

    function setupDagList(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagList.Instance.setup()
        .then(() => {
            return PromiseHelper.alwaysResolve(DagTabManager.Instance.setup());
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            // TODO: Display error suggesting refresh
            console.error("DagList Initialize Fail", err);
            deferred.reject(err);
        });
        return deferred;
    }

    function setupOpPanels(): void {
        GeneralOpPanel.setup();
        MapOpPanel.Instance.setup();
        ProjectOpPanel.Instance.setup();
        ExplodeOpPanel.Instance.setup();
        DatasetOpPanel.Instance.setup();
        FilterOpPanel.Instance.setup();
        AggOpPanel.Instance.setup();
        GroupByOpPanel.Instance.setup();
        JoinOpPanel.Instance.setup();
        PublishIMDOpPanel.Instance.setup();
        UpdateIMDOpPanel.Instance.setup();
        ExportOpPanel.Instance.setup();
        IMDTableOpPanel.Instance.setup();
        JupyterOpPanel.Instance.setup();
        SQLOpPanel.Instance.setup();
        RoundOpPanel.Instance.setup();
        RowNumOpPanel.Instance.setup();
        SplitOpPanel.Instance.setup();
        SortOpPanel.Instance.setup();
    }

    function setupSession(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        WorkbookManager.setup()
        .then((wkbkId) => {
            return XcUser.CurrentUser.holdSession(wkbkId, false);
        })
        .then(() => {
            return JupyterPanel.initialize();
        })
        .then(() => {
            Authentication.setup();
            return KVStore.restoreWKBKInfo();
        }) // restores table info, dataset info, settings etc
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupConfigParams(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        MonitorConfig.refreshParams(true)
        .then(function(params) {
            try {
                const paraName: string = "maxinteractivedatasize";
                const size: number = Number(params[paraName].paramValue);
                setMaxSampleSize(size);
            } catch (error) {
                console.error("error case", error);
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function loadDynamicPath(): XDPromise<void> {
        const dynamicSrc: string = 'https://www.xcalar.com/xdscripts/dynamic.js';
        const randId: string = String(Math.ceil(Math.random() * 100000));
        const src: string = dynamicSrc + '?r=' + randId;
        return $.getScript(src);
    }

    function checkHotPathEnable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        adminTools.getHotPatch()
        .then(function(res) {
            if (res.hotPatchEnabled) {
                deferred.resolve();
            } else {
                console.info("Hot Patch is disabled");
                deferred.reject(null, true);
            }
        })
        .fail(function() {
            deferred.resolve(); // still  resolve it
        });

        return deferred.promise();
    }

    function hotPatch(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        checkHotPathEnable()
        .then(function() {
            return loadDynamicPath();
        })
        .then(function() {
            try {
                if (typeof XCPatch.patch !== 'undefined') {
                    const promise: XDPromise<void> = XCPatch.patch();
                    if (promise != null) {
                        return promise;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        })
        .then(deferred.resolve)
        .fail(function(error, isHotPatchDisabled) {
            if (!isHotPatchDisabled) {
                console.error("failed to get script", error);
            }
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function setupWKBKIndependentPanels(): XDPromise<void> {
        KVStore.setupUserAndGlobalKey();
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        setupConfigParams()
        .then(() => {
            return PromiseHelper.alwaysResolve(DSTargetManager.refreshTargets(true));
        })
        .then(() => {
            ExtensionPanel.setup();
        })
        .then(() => {
            TutorialPanel.Instance.setup();
        })
        .then(() => {
            return KVStore.restoreUserAndGlobalInfo();
        })
        .then(() => {
            FileBrowser.restore();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setMaxSampleSize(size: number): void {
        if (size != null) {
            gMaxSampleSize = size;
        }
    }

    // excludes alert modal wish is set up earlier
    function setupModals(): void {
        Alert.setup();
        Profile.setup();
        WorkbookPanel.setup();
        ExtModal.setup();
        LicenseModal.setup();
        SupTicketModal.setup();
        FileInfoModal.setup();
        WorkbookInfoModal.setup();
        LoginConfigModal.setup();
        LiveHelpModal.setup();
        JupyterFinalizeModal.setup();
        JupyterUDFModal.setup();
        FileListModal.setup();
        DSImportErrorModal.setup();
    }

    function setupUserArea(): void {
        setupUserBox();
        MemoryAlert.Instance.setup();
    }

    function setupUserBox(): void {
        const $menu: JQuery = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcUser.CurrentUser.getFullName());

        $("#userNameArea").click(function() {
            const $target: JQuery = $(this);
            xcHelper.dropdownOpen($target, $menu, <xcHelper.DropdownOptions>{
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
        });

        $menu.on("mouseup", ".help", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            const $tab: JQuery = $("#helpTab");
            if (!$tab.hasClass("active")) {
                $tab.click();
            }
        });

        $menu.on("mouseup", ".discourse", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            const win: Window = window.open('https://discourse.xcalar.com/', '_blank');
            if (win) {
                win.focus();
            } else {
                alert('Please allow popups for this website');
            }
        });

        $menu.on("mouseup", ".about", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            AboutModal.Instance.show();
        });

        $menu.on('mouseup', ".setup", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            MainMenu.openPanel("monitorPanel", "setupButton");
            MainMenu.open(true);
        });
        $menu.on("mouseup", ".liveHelp", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            LiveHelpModal.show();
        });

        $menu.on("mouseup", ".supTicket", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            SupTicketModal.show();
        });

        $("#logout").mouseup(function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            XcUser.CurrentUser.logout();
        });
    }

    /**
     * xcManager.setModeStatus
     * @param isSQLMode
     */
    export function setModeStatus(): void {
        let $modeArea: JQuery = $("#modeArea");
        let $container: JQuery = $("#container");
        let text: string;
        if (XVM.isSQLMode()) {
            text = ModeTStr.SQL;
            $modeArea.removeClass("on");
            xcTooltip.add($modeArea, {
                title: ModeTStr.SQLTooltip,
                placement: "bottom"
            });
            $container.addClass("sqlMode")
                    .removeClass("advMode");
        } else {
            text = ModeTStr.Advanced;
            $modeArea.addClass("on");
            xcTooltip.add($modeArea, {
                title: ModeTStr.AdvancedTooltip,
                placement: "bottom"
            });
            $container.removeClass("sqlMode")
                    .addClass("advMode");
        }
        $modeArea.find(".text").text(text);
    }

    function setupModeArea(): void {
        let $modeArea: JQuery = $("#modeArea").removeClass("xc-hidden");
        xcManager.setModeStatus();

        $modeArea.click(() => {
            if ($("#initialLoadScreen").is(":visible")) {
                return; // no switching when screen is locked
            }
            let modeToSwitch: XVM.Mode;
            if (XVM.isSQLMode()) {
                modeToSwitch = XVM.Mode.Advanced;
            } else {
                modeToSwitch = XVM.Mode.SQL;
            }
            XVM.setMode(modeToSwitch);
        });
    }

    function setupSocket(): XcSocket {
        const xcSocket: XcSocket = XcSocket.Instance;
        xcSocket.setup();
        return xcSocket;
    }

    function documentReadyGeneralFunction(): void {
        $(document).keydown(function(event: JQueryEventObject): void{
            let isPreventEvent: boolean;

            switch (event.which) {
                case keyCode.PageUp:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "pageUpdown", true);
                    break;
                case keyCode.Space:
                case keyCode.PageDown:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "pageUpdown", false);
                    break;
                case keyCode.Up:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "updown", true);
                    break;
                case keyCode.Down:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "updown", false);
                    break;
                case keyCode.Home:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "homeEnd", true);
                    break;
                case keyCode.End:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "homeEnd", false);
                    break;
                default:
                    TblFunc.keyEvent(event);
                    break;
            }

            if (isPreventEvent) {
                event.preventDefault();
            }
        });

        window.onbeforeunload = function(): string {
            xcManager.unload(true);
            markUserUnload();
            if (Log.hasUncommitChange()) {
                return CommonTxtTstr.LogoutWarn;
            } else {
                return CommonTxtTstr.LeaveWarn;
            }
        };
        window.onunload = function(): void {
            LiveHelpModal.userLeft();
        };

        let winResizeTimer: number;
        let resizing: boolean = false;
        let otherResize: boolean = false; // true if winresize is triggered by 3rd party code
        let modalSpecs: xcHelper.ModalSpec;
        const windowSpecs: xcHelper.WindowSpec = {
            winHeight: $(window).height(),
            winWidth: $(window).width()
        };

        $(window).resize(function(event: JQueryEventObject): void {
            if (!resizing) {
                xcMenu.close();
                resizing = true;
                const $modal: JQuery = $('.modalContainer:visible');
                if ($modal.length && !$modal.hasClass("noWinResize")) {
                    modalSpecs = {
                        $modal: $modal,
                        top: $modal.offset().top,
                        left: $modal.offset().left
                    };
                } else {
                    modalSpecs = null;
                }
            }

            if (event.target !== <any>window) {
                otherResize = true;
            } else {
                otherResize = false;
            }

            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(winResizeStop, 100);
        });

        function winResizeStop(): void {
            if (otherResize) {
                otherResize = false;
            } else {
                TblFunc.repositionOnWinResize();
                if (modalSpecs) {
                    xcHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
                MonitorLog.adjustTabNumber();
            }
            resizing = false;
        }

        // using this to keep window from scrolling on dragdrop
        $(window).scroll(function(): void {
            $(this).scrollLeft(0);
        });

        // using this to keep window from scrolling up and down;
        $('#container').scroll(function(): void {
            $(this).scrollTop(0);
        });

        $(document).mousedown(function(event: JQueryEventObject): void {
            if (window["isBrowserMicrosoft"] && event.shiftKey) {
                // prevents text from being selected on shift click
                const cachedFn: any = document.onselectstart;
                document.onselectstart = function() {
                    return false;
                };
                setTimeout(function() {
                    document.onselectstart = cachedFn;
                }, 0);
            }

            const $target: JQuery = $(event.target);
            gMouseEvents.setMouseDownTarget($target);
            const clickable: boolean = $target.closest('.menu').length > 0 ||
                            $target.closest('.clickable').length > 0 ||
                            $target.hasClass("highlightBox");
            if (!clickable && $target.closest('.dropdownBox').length === 0) {
                xcMenu.close();
                if (!$target.is(".xc-tableArea .viewWrap") &&
                    !$target.closest(".tableScrollBar").length) {
                    TblManager.unHighlightCells();
                }
            }

            if (!$('#modelingDagPanel').hasClass('active') ||
                DagTable.Instance.getTable() == null) {
                // if not on modelingDagPanel panel, or no tables then we're done
                return;
            }

            /*
            The spots you can click on where the fnBar and column DO NOT get
            cleared or deselected:
                - selected column header
                - selected column cells
                - the function bar
                - any menu list item
                - table scroll bar of the respective column's table
                - the draggable resizing area on the right side of the left panel
                - the draggable resizing area on the top of the QG panel
                - the maximize/close buttons on the QG panel
            */

            // if (!$target.closest(".header").length &&
            //     !$target.closest(".selectedCell").length &&
            //     !$target.closest(".menu").length &&
            //     // $target.attr("id") !== "mainFrame" &&
            //     !$target.hasClass("ui-resizable-handle") &&
            //     !$target.closest("li.column").length &&
            //     !$target.closest(".tableScrollBar").length) {

            //     $(".selectedCell").removeClass("selectedCell");
            // }
        });

        let dragCount: number = 0; // tracks document drag enters and drag leaves
        // as multiple enters/leaves get triggered by children
        $(document).on('dragenter', function(event: JQueryEventObject): void {
            const dt: any = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {

                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';

                $('.xc-fileDroppable').addClass('xc-fileDragging');
                dragCount++;
            }
        });

        $(document).on('dragover', function(event: JQueryEventObject): void {
            const dt = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';
            }
        });

        $(document).on('dragleave', function(event: JQueryEventObject): void {
            let dt: DataTransfer = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.includes('Files'))) {
                dragCount--;
                if (dragCount === 0) {
                    $('.xc-fileDroppable').removeClass('xc-fileDragging');
                }
            }
        });

        $(document).on('drop', function(event: JQueryEventObject): void {
            event.preventDefault();
            $('.xc-fileDroppable').removeClass('xc-fileDragging');
        });

        $(window).blur(function(): void {
            xcMenu.close();
        });

        setupMouseWheel();

        if (!window["isBrowserChrome"]) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

        window.onerror = function(msg: string|Event, url: string, line: number, column: number, error: Error): void {
            let mouseDownTargetHTML: string = "";
            const parentsHTML: string[] = [];
            const lastTargets: JQuery[] = gMouseEvents.getLastMouseDownTargets();
            const $lastTarget: JQuery = lastTargets[0];
            const prevTargetsHtml: string[][] = [];

            // get last 3 mousedown elements and parents
            if ($lastTarget && !$lastTarget.is(document)) {
                mouseDownTargetHTML = $lastTarget.clone().empty()[0].outerHTML;

                $lastTarget.parents().each(function() {
                    if (!this.tagName) {
                        return;
                    }
                    let html: string = "<" + this.tagName.toLowerCase();
                    $.each(this.attributes, function() {
                        if (this.specified) {
                            html += ' ' + this.name + '="' + this.value + '"';
                        }
                    });
                    html += ">";
                    parentsHTML.push(html);
                });

                for (let i = 1; i < lastTargets.length; i++) {
                    const prevTargetParents: string[] = [];
                    lastTargets[i].parents().addBack().each(function() {
                        if (!this.tagName) {
                            return;
                        }
                        let html: string = "<" + this.tagName.toLowerCase();
                        $.each(this.attributes, function() {
                            if (this.specified) {
                                html += ' ' + this.name + '="' + this.value +
                                        '"';
                            }
                        });
                        html += ">";
                        prevTargetParents.unshift(html);
                    });

                    prevTargetsHtml.push(prevTargetParents);
                }
            }

            const mouseDownTime: number = gMouseEvents.getLastMouseDownTime();
            let stack: string[] = null;
            if (error && error.stack) {
                stack = error.stack.split("\n");
            }

            let info: object = {
                "error": msg,
                "url": url,
                "line": line,
                "column": column,
                "lastMouseDown": {
                    "el": mouseDownTargetHTML,
                    "time": mouseDownTime,
                    "parents": parentsHTML,
                    "prevMouseDowns": prevTargetsHtml
                },
                "stack": stack,
                "txCache": xcHelper.deepCopy(Transaction.getCache()),
                "browser": window.navigator.userAgent,
                "platform": window.navigator.platform,
            };
            xcConsole.log(msg, url + ":" + line + ":" + column);

            Log.errorLog("Console error", null, null, info);

            // if debugOn, xcConsole.log will show it's own error
            // if no stack, then it's a custom error, don't show message
            if (!window["debugOn"] && stack &&
                !(isBrowserIE && (msg === "Unspecified error." ||
                    (stack[1] && stack[1].indexOf("__BROWSERTOOLS") > -1)))) {

                const promise = Log.commitErrors();

                if (typeof mixpanel !== "undefined") {
                    const timestamp: number = (new Date()).getTime();
                    mixpanel["track"]("XdCrash", {
                        "Timestamp": timestamp,
                        "errorMsg": JSON.stringify(info)
                    });
                }

                Alert.error(ErrTStr.RefreshBrowser, ErrTStr.RefreshBrowserDesc, <Alert.AlertErrorOptions>{
                    "lockScreen": true,
                    "buttons": [{
                        className: "refresh",
                        name: "Refresh",
                        func: function() {
                            // wait for commit to finish before refreshing
                            promise
                            .always(function() {
                                xcHelper.reload();
                            });
                        }
                    }]
                });
            }
        };
    }

    let logoutRedirect: Function = function(): void {
        let msalUser: string = null;
        let msalAgentApplication: Msal.UserAgentApplication = null;
        const config: any = getMsalConfigFromLocalStorage();

        if (config != null &&
            config.hasOwnProperty('msal') &&
            config.msal.hasOwnProperty('enabled') &&
            config.msal.enabled) {

            const msalLogger: Msal.Logger = new Msal.Logger(
                msalLoggerCallback,
                { level: Msal["LogLevel"].Verbose, correlationId: '12345' }
            );

            function msalLoggerCallback(_logLevel, message, _piiEnabled) {
                console.log(message);
            }

            function msalAuthCallback(_errorDesc, _token, _error, _tokenType) {
                // this callback function provided to UserAgentApplication
                // is intentionally empty because the logout callback does
                // not need to do anything
            }

            msalAgentApplication = new Msal.UserAgentApplication(
                config.msal.clientID,
                null,
                msalAuthCallback,
                { cacheLocation: 'sessionStorage', logger: msalLogger }
            );

            msalUser = msalAgentApplication.getUser();
        }

        if (msalUser != null) {
            msalAgentApplication.logout();
        } else {
            window["location"]["href"] = paths.dologout;
        }
    }

    function isRetinaDevice(): boolean {
        return window.devicePixelRatio > 1;
    }

    function setupTutorial(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gTutorialKey");
        let _kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        PromiseHelper.alwaysResolve(_kvStore.get())
        .then(function(tutorialFlag) {
            if (tutorialFlag == "true") {
                return processTutorialHelper();
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail((err) => {
            console.error(err);
            return deferred.resolve();
        });

        return deferred.promise();
    }

    function processTutorialHelper(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const tutTarget: string = "Tutorial Dataset Target";
        let datasetSources: Set<string> = new Set<string>();
        let dataKey: string = KVStore.getKey("gStoredDatasetsKey");
        let _dataKVStore: KVStore = new KVStore(dataKey, gKVScope.WKBK);
        let pubTables: StoredPubInfo[] = [];
        let promise: XDPromise<void>;
        // First, set up the tutorial data target if it doesnt exist
        if (DSTargetManager.getTarget(tutTarget) != null) {
            promise = PromiseHelper.resolve();
        } else {
            promise = XcalarTargetCreate("s3environ", tutTarget,
                {authenticate_requests: "false"})
                .then(() => {
                    return DSTargetManager.refreshTargets(true);
                });
        }
        promise
        .then(() => {
            // Then, load the stored datasets, if they exist
            return PromiseHelper.alwaysResolve(_dataKVStore.getAndParse())
        })
        .then((datasets: {[key: number]: StoredDataset}) => {
            if (datasets == null) {
                // This tutorial workbook doesn't have any stored datasets
                return PromiseHelper.resolve();
            }

            // Figure out what datasets already exist
            let existingDatasets: ListDSInfo[] = DS.listDatasets(false);
            let names: Set<string> = new Set<string>();
            for(let i = 0; i < existingDatasets.length; i++) {
                let eDs = existingDatasets[i];
                names.add(eDs.id);
            }
            // only load the needed datasets
            let loadArgs: OperationNode[] = [];
            try {
                for(let i = 0; i < datasets["size"]; i++) {
                    let node: OperationNode = JSON.parse(datasets[i].loadArgs)
                    let parsedName = xcHelper.parseDSName(node.args["dest"]);
                    parsedName.randId = parsedName.randId || "";
                    node.args["dest"] = xcHelper.wrapDSName(parsedName.dsName, parsedName.randId)
                    if (!names.has(node.args["dest"])) {
                        loadArgs.push(node);
                        datasetSources.add(parsedName.randId + "." + parsedName.dsName);
                    }
                    // Prepare needed published tables
                    let pubInfo = datasets[i].publish;
                    if (pubInfo != null) {
                        pubInfo.dsName = node.args["dest"];
                        pubTables.push(pubInfo);
                    }
                }
            } catch (e) {
                console.error(e);
                return deferred.reject();
            }

            let promises = [];
            for(let i = 0; i < loadArgs.length; i++) {
                promises.push(DS.restoreTutorialDS(loadArgs[i]));
            }
            return PromiseHelper.when(...promises);
        })
        .then(() => {
            // We need to cast old dataset node sources
            if (datasetSources.size == 0) {
                return PromiseHelper.resolve();
            }
            let dagTabs: DagTab[] = DagTabManager.Instance.getTabs();
            let graphs: DagGraph[] = dagTabs.map((tab: DagTab) => {
                return tab.getGraph();
            });
            for (let i = 0; i < graphs.length; i++) {
                let graph = graphs[i];
                if (graph == null) {
                    continue;
                }
                graph.reConfigureDatasetNodes(datasetSources);
            }
        })
        .then(() => {
            if (pubTables.length == 0) {
                return PromiseHelper.resolve([]);
            } else {
                return PTblManager.Instance.getTablesAsync();
            }
        })
        .then((tables: PbTblInfo[]) => {
            let pubNames: Set<string> = new Set<string>();
            for (let i = 0; i < tables.length; i++) {
                let table: PbTblInfo = tables[i];
                if (table == null) { continue };
                pubNames.add(table.name);
            }
            // Time to publish tutorial workbook tables
            let promises = [];
            for (let i = 0; i < pubTables.length; i++) {
                let info = pubTables[i];
                if (pubNames.has(info.pubName)) {
                    continue;
                }
                let schema = DS.getSchema(info.dsName);
                if (schema.error != null) {
                    continue;
                }
                promises.push(PTblManager.Instance.createTableFromDataset(info.dsName,
                    info.pubName, schema.schema,
                    info.pubKeys, !info.deleteDataset));
            }
            return PromiseHelper.when(...promises);
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(DS.refresh())
        })
        .then(deferred.resolve)
        .fail(deferred.reject)

        return deferred.promise();
    }

    function reImplementMouseWheel(e: JQueryEventObject): void {
        let deltaX: number = e.originalEvent["wheelDeltaX"] * -1;
        let deltaY: number = e.originalEvent["wheelDeltaY"];
        if (isNaN(deltaX)) {
            deltaX = e["deltaX"];
        }
        if (isNaN(deltaY)) {
            deltaY = e["deltaY"];
        }
        let x: number = Math.abs(deltaX);
        let y: number = Math.abs(deltaY);
        // iterate over the target and all its parents in turn
        const $target: JQuery = $(e.target);
        const $pathToRoot: JQuery = $target.add($target.parents());

        // this is to fix the issue when scroll table
        // both horizontally and verticall will move
        if ($target.closest(".dataTable").length) {
            if (y > x) {
                x = 0;
            } else if (x > y) {
                y = 0;
            }
        }
        $($pathToRoot.get().reverse()).each(function() {
            const $el: JQuery = $(this);
            let delta: number;

            if ($el.css("overflow") !== "hidden") {
                // do horizontal scrolling
                if (deltaX > 0) {
                    let scrollWidth: number = $el.prop("scrollWidth");
                    // because there is a rowReiszer in .idWrap,
                    // which wrongly detect the element as scrollable
                    // we just skip it
                    if ($el.closest(".dataTable").length) {
                        scrollWidth = 0;
                    }

                    const scrollLeftMax: number = scrollWidth - $el.outerWidth();
                    if ($el.scrollLeft() < scrollLeftMax) {
                        // we can scroll right
                        delta = scrollLeftMax - $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() + delta);
                    }
                } else {
                    if ($el.scrollLeft() > 0) {
                        // we can scroll left
                        delta = $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() - delta);
                    }
                }

                // do vertical scrolling
                if (deltaY < 0) {
                    const scrollHeight: number = $el.prop("scrollHeight");
                    const scrollTopMax: number = scrollHeight - $el.outerHeight();
                    if ($el.scrollTop() < scrollTopMax) {
                        // we can scroll down
                        delta = scrollTopMax - $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() + delta);
                    }
                } else {
                    if ($el.scrollTop() > 0) {
                        // we can scroll up
                        delta = $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() - delta);
                    }
                }
            }
        });
    }

    // Note: This including two cases in mac
    // Case 1: if it's Chrome in retina dispaly or fireforx
    // reimplement the wheel scroll to resolve the jitter issue
    // and the same time, it can prevent both back/forwad swipe
    // Case 2: for other cases, only prevent back swipe
    // (not found a good soution to also prevent forward)
    function setupMouseWheel(): void {
        $(window).on("mousewheel", function(event: JQueryEventObject): void {
            // This code is only valid for Mac
            if (!window["isSystemMac"]) {
                return;
            }

            const isBrowserToHandle: boolean = window["isBrowserChrome"]
                                || window["isBrowserFirefox"]
                                || window["isBrowserSafari"];
            if (!isBrowserToHandle) {
                return;
            }

            if ((window["isBrowserChrome"] && isRetinaDevice()
                || window["isBrowserFirefox"]) &&
                ($(event.target).closest(".dataTable").length))
            {
                reImplementMouseWheel(event);
                // prevent back/forward swipe
                event.preventDefault();
                return;
            }

            const $target: JQuery = $(event.target);
            const $parents: JQuery = $(event.target).parents().add($target);
            // If none of the parents can be scrolled left
            // when we try to scroll left
            const prevent_left: boolean = event["deltaX"] < 0 && $parents.filter(function() {
                return $(this).scrollLeft() > 0;
            }).length === 0;

            // If none of the parents can be scrolled up
            // when we try to scroll up
            const prevent_up: boolean = event["deltaY"] > 0 && $parents.filter(function() {
                return $(this).scrollTop() > 0;
            }).length === 0;
            // Prevent swipe scroll,
            // which would trigger the Back/Next page event
            if (prevent_left || prevent_up) {
                event.preventDefault();
            }
        });
    }

    function showDatasetHint() {
        var $numDatastores = $("#datastoreMenu .numDataStores:not(.tutor)");
        var numDatastores = parseInt($numDatastores.text());
        var msg;
        var $tab;
        if (numDatastores === 0) {
            msg = TooltipTStr.ShowDatasetHint;
            $tab = $('#dataStoresTab');
        } else if (DagList.Instance.getAllDags().size === 0) {
            msg = TooltipTStr.ShowDataflowHint;
            $tab = $("#modelingDataflowTab");
        } else {
            // no need to hint
            return;
        }


        var left = $tab.offset().left + $tab.outerWidth() + 7;
        var top = $tab.offset().top + 2;
        var $popup =
                $('<div id="showDatasetHint" class="tableDonePopupWrap" ' +
                    'style="top:' + top + 'px;left:' + left + 'px;">' +
                    '<div class="tableDonePopup datastoreNotify">' +
                    msg +
                    '<div class="close">+</div></div></div>');
        setTimeout(function() {
            if ($tab.hasClass("firstTouch") &&
                $("#modelingDataflowTab").hasClass("active")
            ) {
                showPopup();
            }
        }, 1000);

        function showPopup() {
            $("body").append($popup);
            $popup.find(".tableDonePopup").fadeIn(500);

            $popup.click(function(event) {
                if (!$(event.target).closest(".close").length) {
                    $('#dataStoresTab').click();
                    if (!$("#inButton").hasClass("active")) {
                        $('#inButton').click();
                    }
                }
                $("#showDatasetHint").remove();
            });
        }
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        let oldLogoutRedirect: Function;
        xcManager["__testOnly__"] = {
            handleSetupFail: handleSetupFail,
            reImplementMouseWheel: reImplementMouseWheel,
            oneTimeSetup: oneTimeSetup,
            fakeLogoutRedirect: function() {
                oldLogoutRedirect = logoutRedirect;
                logoutRedirect = function() {};
            },
            resetLogoutRedirect: function() {
                logoutRedirect = oldLogoutRedirect;
            }
        };
    }
    /* End Of Unit Test Only */
}
