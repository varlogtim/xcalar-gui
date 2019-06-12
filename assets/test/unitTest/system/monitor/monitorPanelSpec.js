describe("MonitorPanel Test", function() {
    var $mainTabCache;
    var $monitorPanel;
    var $monitorMenu;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $monitorPanel = $("#monitor-system");
        $monitorMenu = $("#monitorMenu-sys");
        $("#systemButton").click();
    });

    describe("monitor tabs", function() {
        it("settings button should work", function() {
            $("#settingsButton").click();
            expect($("#monitor-settings").hasClass("active")).to.be.true;
        });
        it("extensionSettingButton should work", function() {
            $("#extensionSettingButton").click();
            expect($("#monitor-extension").hasClass("active")).to.be.true;
        });
    });

    describe("toggling graph switches", function() {
        it("switching should work", function() {
            var $area0 = $monitorPanel.find(".area0");
            var $area1 = $monitorPanel.find(".area1");

            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area0)).to.be.gt(
                                $monitorPanel.find(".area").index($area1));


            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
        });
    });

    describe("list interactions", function() {
        it("toggling monitor system lists should work", function() {
            var $listInfo = $("#monitorMenu-sys").find(".listInfo").eq(0);
            var wasActive = $listInfo.closest(".listWrap").hasClass("active");
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.not.equal(wasActive);
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.equal(wasActive);
        });

        it("toggling monitor setup lists should work", function() {
            var $listInfo = $("#monitorMenu-setup").find(".listInfo").eq(0);
            var wasActive = $listInfo.closest(".listWrap").hasClass("active");
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.not.equal(wasActive);
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.equal(wasActive);
        });

        it("monitor-delete button should work", function() {
            var shown = false;
            var cache = DeleteTableModal.Instance.show;
            DeleteTableModal.Instance.show = function() {
                shown = true;
            };

            $("#monitor-delete").click();
            expect(shown).to.be.true;

            DeleteTableModal.Instance.show = cache;
        });
    });

    describe("tab switching", function() {
        it("tab switching should work", function() {
            if (!$("#monitorTab").hasClass("active")) {
                $("#monitorTab .mainTab").click();
            }
            // open up panel
            if (!$("#mainMenu").hasClass("open")) {
                $("#monitorTab .mainTab").click();
            }
            if (!$("#monitorMenu .menuSection.settings").is(":visible")) {
                $("#settingsButton").click();
            }
            expect($("#monitor-settings").is(":visible")).to.be.true;
            expect($("#monitor-queries").is(":visible")).to.be.false;

            $("#queriesButton").click();

            expect($("#monitor-settings").is(":visible")).to.be.false;
            expect($("#monitor-queries").is(":visible")).to.be.true;
        });
    });

    it("MonitorPanel.inActive should work", function() {
        var monitorGraph = MonitorPanel.getGraph();
        var cache = monitorGraph.clear;
        var called = false;
        monitorGraph.clear = function() {
            called = true;
        };

        MonitorPanel.inActive();
        expect(called).to.be.true;
        monitorGraph.clear = cache;
    });

    after(function() {
        $mainTabCache.click();
    });
});