describe("Workbook- Workbook Pane Test", function() {
    var $workbookPanel;
    var menuAction = function($box, action) {
        $box.find(".dropDown").click();
        $("#wkbkMenu").find("." + action).click();
    };

    before(function(){
        $workbookPanel = $("#workbookPanel");
        UnitTest.onMinMode();
    });

    describe("Basic Api Test", function() {
        it("Should show workbook", function(done) {
            WorkbookPanel.show();

            var checkFunc = function() {
                return $("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should hide workbook", function(done) {
            WorkbookPanel.hide(true);
            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should have noting happen if trigger hide again", function() {
            WorkbookPanel.hide();
            expect($workbookPanel.find(".workbookBox.active").length)
            .to.equal(0);
        });
    });

    describe("Basic Behavior Test", function() {
        it("Should show workbook from home button", function(done) {
            $("#homeBtn").click();
            var checkFunc = function() {
                return $("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should access monitor", function() {
            $workbookPanel.find(".monitorBtn, .monitorLink").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.true;
        });

        it("should click home button to back to workbook panel", function() {
            $("#homeBtn").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.false;
        });

        it("Should back to workbook", function() {
            // go to monitor screen again
            $workbookPanel.find(".monitorBtn, .monitorLink").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.true;

            $("#monitorPanel .backToWB").click();
            expect($("#container").hasClass("workbookMode")).to.be.true;
            expect($("#container").hasClass("monitorMode")).to.be.false;
        });

        it("should go to setup", function() {
            WorkbookPanel.goToSetup();
            expect($("#container").hasClass("setupMode")).to.be.true;

            $("#monitorPanel .backToWB").click();
            expect($("#container").hasClass("setupMode")).to.be.false;
        });

        it("should go to setup with firstTouch", function() {
            var oldFunc = MonitorConfig.refreshParams;
            var testArg = null;
            MonitorConfig.refreshParams = function(arg) {
                testArg = arg;
            };
            $("#monitor-setup").addClass("firstTouch");
            WorkbookPanel.goToSetup();
            expect($("#monitor-setup").hasClass("firstTouch")).to.be.false;
            expect(testArg).to.equal(true);
            expect($("#container").hasClass("setupMode")).to.be.true;

            $("#monitorPanel .backToWB").click();
            expect($("#container").hasClass("setupMode")).to.be.false;

            MonitorConfig.refreshParams = oldFunc;
        });

        it("should mouseenter to triger tooltipoverflow", function() {
            var $div = $('<div class="tooltipOverflow"><input></div>');
            var $workbookSection = $workbookPanel.find(".bottomSection");
            var oldFunc = xcTooltip.auto;
            var test = false;
            xcTooltip.auto = function() { test = true; };
            $workbookSection.append($div);
            $div.trigger(fakeEvent.mouseenter);
            expect(test).to.be.true;
            // clear up
            $div.remove();
            xcTooltip.auto = oldFunc;
        });

        it("should not close on no workbook case", function(done) {
            var $container = $("#container");
            var $dialogWrap = $("#dialogWrap").addClass("closeAttempt");
            var checkFunc = function() {
                return !$dialogWrap.hasClass("closeAttempt");
            };

            $container.addClass("noWorkbook");
            $("#homeBtn").click();

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($dialogWrap.hasClass("doneCloseAttempt")).to.be.true;
                expect($container.hasClass("workbookMode")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $container.removeClass("noWorkbook");
                $dialogWrap.removeClass("doneCloseAttempt");
            });
        });

        it("Should not show dataset hint", function() {
            $("#homeBtn").click();
            expect($("#showDatasetHint").length)
            .to.equal(0);
        });

        it("Should close workbook", function(done) {
            $("#homeBtn").click();

            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Edit Workbook Test", function() {
        var oldRename;
        var oldUpdateDescription;
        var workbookId;
        var workbook;

        before(function() {
            oldRename = WorkbookManager.renameWKBK;
            oldUpdateDescription = WorkbookManager.updateDescription;
            var workbooks = WorkbookManager.getWorkbooks();
            workbookId = Object.keys(workbooks)[0];
            workbook = workbooks[workbookId];
        });

        it("should edit nothing when no update", function(done) {
            var name = workbook.getName();
            var description = workbook.getDescription() || "";
            var test = false;

            WorkbookManager.updateDescription =
            WorkbookManager.renameWKBK = function() {
                test = true;
                return PromiseHelper.resolve(workbookId);
            };

            WorkbookPanel.edit(workbookId, name, description)
            .then(function() {
                expect(test).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should edit description", function(done) {
            var name = workbook.getName();
            var description = workbook.getDescription();
            var newDescription = description + "-test";
            var test = false;
            WorkbookManager.updateDescription = function() {
                test = true;
                return PromiseHelper.resolve(workbookId);
            };

            WorkbookPanel.edit(workbookId, name, newDescription)
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should update workbook name", function(done) {
            var name = xcHelper.randName("testModified");
            var test = false;
            WorkbookManager.renameWKBK = function() {
                test = true;
                return PromiseHelper.resolve(workbookId);
            };

            WorkbookPanel.edit(workbookId, name, workbook.getDescription())
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle error case", function(done) {
            var name = xcHelper.randName("testModified");
            var testError = "test error";
            WorkbookManager.renameWKBK = function() {
                return PromiseHelper.reject(testError);
            };

            WorkbookPanel.edit(workbookId, name, workbook.getDescription())
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(testError);
                done();
            });
        });

        after(function() {
            WorkbookManager.renameWKBK = oldRename;
            WorkbookManager.updateDescription = oldUpdateDescription;
        });
    });

    describe("Advanced Workbook Behavior Test", function() {
        // this.timeout(200000);
        var oldKVGet, oldKVPut, oldKVDelete;
        var oldXcalarPut, oldXcalarDelete;
        var oldWkbkNew, oldWkbkList, oldWkbkDelete;
        var fakeMap = {};
        var activeWkbkId;
        var oldRename;
        var oldXcalarDownloadWorkbook;
        var oldDownloadAsFile;

        before(function() {
            oldKVGet = KVStore.prototype.get;
            oldKVPut = KVStore.prototype.put;
            oldKVDelete = KVStore.prototype.delete;
            oldXcalarPut = XcalarKeyPut;
            oldXcalarDelete = XcalarKeyDelete;
            oldRename = WorkbookManager.renameWKBK;
            oldXcalarDownloadWorkbook = XcalarDownloadWorkbook;
            oldDownloadAsFile = xcHelper.downloadAsFile;

            XcalarKeyPut = function(key, value) {
                fakeMap[key] = value;
                return PromiseHelper.resolve();
            };

            XcalarKeyDelete = function(key) {
                delete fakeMap[key];
                return PromiseHelper.resolve();
            };

            KVStore.prototype.get = function(key) {
                return PromiseHelper.resolve(fakeMap[key]);
            };

            KVStore.prototype.put = XcalarKeyPut;
            KVStore.prototype.delete = XcalarKeyDelete;

            oldWkbkNew = XcalarNewWorkbook;
            oldWkbkList = XcalarListWorkbooks;
            oldWkbkDelete = XcalarDeleteWorkbook;

            XcalarNewWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarListWorkbooks = function() {
                return PromiseHelper.resolve({
                    "numSessions": 1,
                    "sessions": [{"state": "InActive"}]
                });
            };

            XcalarDeleteWorkbook = function() {
                return PromiseHelper.resolve();
            };

            activeWkbkId = WorkbookManager.getActiveWKBK();
        });

        beforeEach(function() {
            fakeMap = {};
        });

        it("Should force show the workbook", function() {
            WorkbookPanel.forceShow();
            expect($("#container").hasClass("noWorkbook")).to.be.true;
            $("#container").removeClass("noWorkbook");
        });

        it("should handle create workbook error case", function(done) {
            var name = xcHelper.randName("testWorkbook");
            var oldFunc = XcSupport.commitCheck;

            XcSupport.commitCheck = function() {
                return PromiseHelper.reject();
            };

            var $newWorkbookButton = $("#createWKBKbtn");
            $newWorkbookButton.click();

            UnitTest.hasStatusBoxWithError(WKBKTStr.CreateErr);
            done();

            XcSupport.commitCheck = oldFunc;
        });

        it("Should create new workbook", function(done) {
            var selector = ".workbookBox:not(.loading)";
            var wkbkNum = $workbookPanel.find(selector).length;
            var name = xcHelper.randName("testWorkbook");
            var $newWorkbookButton = $("#createWKBKbtn");
            var $workbookModal = $("#workbookInfoModal");

            //WorkbookPanel.createNewWorkbook(name);
            $newWorkbookButton.click();
            var checkFunc = function() {
                var diff = $workbookPanel.find(selector).length - wkbkNum;
                if (diff < 0) {
                    // error case
                    return null;
                }
                return (diff === 1);
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                /*var $input = $workbookPanel.find(".workbookBox .workbookName")
                    .filter(function() {
                        return $(this).val() === name;
                    });*/
                var $input = $workbookPanel.find(".focussed");
                var $box = $input.closest(".workbookBox");
                expect($box.length).to.equal(1);
                expect($box.find(".numWorksheets").text()).to.equal("1");
                expect($box.find(".isActive").text()).to.equal("Inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should update initial name", function(done) {
            var name = xcHelper.randName("testWorkbook");
            var $input = $workbookPanel.find(".focussed");
            var $box = $input.closest(".workbookBox");
            var workbookId = $box.attr("data-workbook-id");
            WorkbookManager.renameWKBK = function() {
                return PromiseHelper.resolve(workbookId);
            };
            $input.val(name);
            $input.trigger(fakeEvent.enter);
            $input.blur();

            var checkFunc = function() {
                return !$box.hasClass(".loading");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($input.val()).to.equal(name);
                done();
            })
            .fail(function() {
                done("fail");
            });

        });

        it("Should Download Workbook", function() {
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            var testWKBKName = $box.find(".workbookName").val();
            var called = false;

            XcalarDownloadWorkbook = function(name) {
                expect(name).to.equal(testWKBKName);
                called = true;
                return PromiseHelper.resolve("");
            };

            xcHelper.downloadAsFile = function() {
                return;
            }

            $box.find(".dropDown").click();
            $("#wkbkMenu").find(".download").click();
            $("#wkbkMenu").hide();

            expect(called).to.equal(true);
        });

        it("should handle duplicate error", function(done) {
            var selector = ".workbookBox:not(.loading)";
            var wkbkNum = $workbookPanel.find(selector).length;
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            var oldFunc = WorkbookManager.copyWKBK;

            WorkbookManager.copyWKBK = function() {
                return PromiseHelper.reject("test");
            };
            menuAction($box, "duplicate");

            UnitTest.testFinish(function() {
                return $("#statusBox").is(":visible");
            })
            .then(function() {
                UnitTest.hasStatusBoxWithError("test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                WorkbookManager.copyWKBK = oldFunc;
            });
        });

        it("Should duplicate workbook", function(done) {
            var selector = ".workbookBox:not(.loading)";
            var wkbkNum = $workbookPanel.find(selector).length;
            var $box = $workbookPanel.find(".workbookBox").eq(0);
            menuAction($box, "duplicate");

            var checkFunc = function() {
                var diff = $workbookPanel.find(selector).length - wkbkNum;
                if (diff < 0) {
                    // error case
                    return null;
                }

                if (diff === 1) {
                    // has a fadeIn animation, so need to wait for it
                    var $dupBox = $workbookPanel.find(".workbookBox").eq(1);
                    if ($dupBox.find(".workbookName").val()) {
                        return true;
                    }
                }
                return false;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var name = $box.find(".workbookName").val();
                var $dupBox = $workbookPanel.find(".workbookBox").eq(1);
                var dupName = $dupBox.find(".workbookName").val();

                expect(dupName.startsWith(name)).to.be.true;
                expect($dupBox.find(".numWorksheets").text()).to.equal($box.find(".numWorksheets").text());
                expect($dupBox.find(".isActive").text()).to.equal("Inactive");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not activate current workbook", function() {
            var oldHide = WorkbookPanel.hide;
            var test = false;
            WorkbookPanel.hide = function() { test = true; };

            var $box = $workbookPanel.find('[data-workbook-id="' +
                                            activeWkbkId + '"]');
            $box.find(".activate").click();
            expect(test).to.be.true;

            WorkbookPanel.hide = oldHide;
        });

        it("Should activate inactive workbook", function(done) {
            var oldGet = WorkbookManager.getActiveWKBK;
            var oldSwitch = WorkbookManager.switchWKBK;
            WorkbookManager.getActiveWKBK = function() {
                return null;
            };

            var test = false;
            WorkbookManager.switchWKBK = function() {
                test = true;
                return PromiseHelper.reject("test");
            };

            var $box = $workbookPanel.find('[data-workbook-id="' +
                                            activeWkbkId + '"]');
            $box.find(".activate").click();

            UnitTest.testFinish(function() {
                return test === true;
            })
            .then(function() {
                UnitTest.hasStatusBoxWithError("test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                WorkbookManager.getActiveWKBK = oldGet;
                WorkbookManager.switchWKBK = oldSwitch;
            });
        });

        it("should modify workbook", function() {
            var oldFunc = WorkbookInfoModal.show;
            var test = false;
            var $box = $workbookPanel.find('[data-workbook-id="' +
                                            activeWkbkId + '"]');

            WorkbookInfoModal.show = function() {
                test = true;
            };
            menuAction($box, "modify");
            expect(test).to.be.true;
            WorkbookInfoModal.show = oldFunc;
        });

        it("should show switch workbook modal", function() {
            var $workbookBox = $workbookPanel.find(".workbookBox:not(.active)").eq(0);

            $workbookBox.find(".activate").click();

            expect($("#alertModal").is(":visible")).to.be.true;
            $("#alertModal").find(".cancel").click();
            expect($("#alertModal").is(":visible")).to.be.false;
        });

        it("Should delete workbook", function(done) {
            // delete two test created workbooks one by one
            var promises = [];
            promises.push(deleteHelper.bind(this));
            promises.push(deleteHelper.bind(this));

            PromiseHelper.chain(promises)
            .then(function() {
                // need to refresh the panel
                WorkbookPanel.hide();
                WorkbookPanel.show(true);

                expect($workbookPanel.find(".workbookBox.active").length)
                .to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });

            function deleteHelper() {
                var $boxs = $workbookPanel.find(".workbookBox");
                var wkbkNum = $boxs.length;

                menuAction($boxs.eq(1), "delete");

                assert.isTrue($("#alertModal").is(":visible"));
                $("#alertModal").find(".confirm").click();

                var checkFunc = function() {
                    var diff = $workbookPanel.find(".workbookBox").length - wkbkNum;
                    if (diff > 0) {
                        // error case
                        return null;
                    }
                    return (diff === -1);
                };

                return UnitTest.testFinish(checkFunc);
            }
        });

        it("should deactive workbook", function(done) {
            var oldDeactivate = WorkbookManager.deactivate;
            var oldGet = WorkbookManager.getActiveWKBK;
            WorkbookManager.deactivate = function(workbookId) {
                var wkbk = WorkbookManager.getWorkbook(workbookId);
                wkbk.setResource(false);
                return PromiseHelper.resolve();
            };

            WorkbookManager.getActiveWKBK = function() {
                return null;
            };

            var $box = $workbookPanel.find('[data-workbook-id="' +
                                            activeWkbkId + '"]');
            menuAction($box, "deactivate");

            UnitTest.hasAlertWithTitle(WKBKTStr.Deactivate, {
                "confirm": true
            });

            var checkFunc = function() {
                var $newBox = $workbookPanel.find('[data-workbook-id="' +
                                                  activeWkbkId + '"]');
                return $newBox.hasClass("noResource");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                WorkbookManager.deactivate = oldDeactivate;
                WorkbookManager.getActiveWKBK = oldGet;
            });
        });

        it("Should close workbook", function(done) {
            $("#homeBtn").click();

            var checkFunc = function() {
                return !$("#container").hasClass("workbookMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($workbookPanel.is(":visible")).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            KVStore.prototype.get = oldKVGet;
            KVStore.prototype.put = oldKVPut;
            KVStore.prototype.delete = oldKVDelete;
            XcalarKeyPut = oldXcalarPut;
            XcalarKeyDelete = oldXcalarDelete;

            XcalarNewWorkbook = oldWkbkNew;
            XcalarListWorkbooks = oldWkbkList;
            XcalarDeleteWorkbook = oldWkbkDelete;
            WorkbookManager.renameWKBK = oldRename;

            XcalarDownloadWorkbook = oldXcalarDownloadWorkbook;
            xcHelper.downloadAsFile = oldDownloadAsFile;
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});