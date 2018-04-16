describe("User Setting Test", function() {
    describe("Baisc User Setting API Test", function() {
        it("UserSettings.getAllPrefs should work", function() {
            var res = UserSettings.getAllPrefs();
            expect(res).to.be.instanceof(UserPref);
        });

        it("UserSettings.getPref should work", function() {
            var res = UserSettings.getPref("activeMainTab");
            expect(res).not.to.be.null;
        });

        it("UserSettings.setPref should work", function() {
            var oldCache = UserSettings.getPref("activeMainTab");
            UserSettings.setPref("activeMainTab", "test");
            var res = UserSettings.getPref("activeMainTab");
            expect(res).to.equal("test");
            // change back
            UserSettings.setPref("activeMainTab", oldCache);

            // case 2
            oldCache = UserSettings.getPref("general");
            UserSettings.setPref("key", "test2", true);
            res = UserSettings.getPref("general");
            expect(res).to.have.property("key").and.to.equal("test2");
            UserSettings.setPref("general", oldCache);
        });

        it("UserSettings.logChange should work", function() {
            var oldFunc = KVStore.logChange;
            var test = false;
            KVStore.logChange = function() {
                test = true;
            };
            UserSettings.logChange();
            expect(test).to.be.true;

            KVStore.logChange = oldFunc;
        });
    });

    describe("UserSettings Commit Test", function() {
        var oldLogChange;
        var oldPut;
        var oldShowSuccess;
        var testKey;
        var successMsg;

        before(function() {
            oldLogChange = KVStore.logChange;
            oldPut =  KVStore.prototype.put;
            oldPutMutex =  KVStore.prototype.putWithMutex;
            oldShowSuccess = xcHelper.showSuccess;

            KVStore.logChange = function() {
                return;
            };

            KVStore.prototype.put = function() {
                testKey = this.key;
                return PromiseHelper.resolve();
            };

            KVStore.prototype.putWithMutex = function() {
                testKey = this.key;
                return PromiseHelper.resolve();
            };

            xcHelper.showSuccess = function(input) {
                successMsg = input;
            };
        });

        beforeEach(function() {
            testKey = null;
            successMsg = null;
        });

        it("should commit change", function(done) {
            UserSettings.logChange();

            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = function() {
                return false;
            };
            UserSettings.commit(true)
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gUserKey"));
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        it("should not commit again if no change", function(done) {
            UserSettings.commit(true)
            .then(function() {
                expect(testKey).to.be.null;
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("should handle fail case", function(done) {
            UserSettings.logChange();

            var oldFunc =  KVStore.prototype.put;
            var oldFail = xcHelper.showFail;
            var test = null;

            KVStore.prototype.put = function() {
                return PromiseHelper.reject("test");
            };

            xcHelper.showFail = function(input) {
                test = input;
            };

            UserSettings.commit(true)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(test).to.equal(FailTStr.SaveSettings);
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.prototype.put = oldFunc;
                xcHelper.showFail = oldFail;
            });
        });

        it("should commit dsChange in XcSupport case", function(done) {
            UserSettings.logChange();

            var oldCache = gXcSupport;
            gXcSupport = true;
            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gUserKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                gXcSupport = oldCache;
            });
        });

        it("should commit prefChange in XcSupport case", function(done) {
            // cause a change in user prefs
            $("#dataViewBtn").toggleClass("listView");

            var oldCache = gXcSupport;
            gXcSupport = true;

            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gSettingsKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                gXcSupport = oldCache;
               // do not change list view back until other test are done
            });
        });

        it("should commit admin settings", function(done) {
            UserSettings.logChange();

            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = function() {
                return true;
            };

            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gUserKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        it("should commit prefChange in Admin case", function(done) {
            // cause a change in user prefs, we're actually changing it back
            // since this is toggled a 2nd time
            $("#dataViewBtn").toggleClass("listView");

            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = function() {
                return true;
            };

            UserSettings.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gSettingsKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        after(function() {
            KVStore.logChange = oldLogChange;
            KVStore.prototype.put = oldPut;
            KVStore.prototype.putWithMutex = oldPutMutex;
            xcHelper.showSuccess = oldShowSuccess;
        });
    });

    describe("UserSettings UI Test", function() {
        it("should toggle showDataColBox", function() {
            var hideDataCol = UserSettings.getPref("hideDataCol");
            var $btn = $("#showDataColBox");
            // case 1
            $btn.click();
            expect(UserSettings.getPref("hideDataCol")).to.equal(!hideDataCol);
            // case 2
            $btn.click();
            expect(UserSettings.getPref("hideDataCol")).to.equal(hideDataCol);
        });

        it("should toggle enable table", function() {
            var enableTable = UserSettings.getPref("enableCreateTable") || false;
            var $btn = $("#enableCreateTable");
            // case 1
            $btn.click();
            expect(UserSettings.getPref("enableCreateTable"))
            .to.equal(!enableTable);
            // case 2
            $btn.click();
            expect(UserSettings.getPref("enableCreateTable"))
            .to.equal(enableTable);
        });

        it("should toggle hideSysOps", function() {
            var hideSysOps = UserSettings.getPref("hideSysOps") || false;
            var $btn = $("#hideSysOps");
            // case 1
            $btn.click();
            expect(UserSettings.getPref("hideSysOps")).to.equal(!hideSysOps);
            // case 2
            $btn.click();
            expect(UserSettings.getPref("hideSysOps")).to.equal(hideSysOps);
        });

        it("should click save button to save", function() {
            var oldFunc = KVStore.commit;
            var test = false;
            KVStore.commit = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            $("#userSettingsSave").click();
            expect(test).to.be.true;
            KVStore.commit = oldFunc;
        });

        it("revert Default settings should work", function() {
            var $button = $("#enableCreateTable");
            var checked = $button.hasClass("checked");
            $button.click();
            expect($button.hasClass("checked")).to.equal(!checked);
            $("#userSettingsDefault").click();

            var oldFunc = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.resolve();
            };
            expect($button.hasClass("checked")).to.equal(checked);

            KVStore.commit = oldFunc;
        });
    });
});