describe("UserMenu Test", function() {
    var $menu;

    before(function() {
        $menu = $("#userMenu");
    });

    it("should click username area to open dropdown", function() {
        $("#userNameArea").click();
        assert.isTrue($menu.is(":visible"));

        $("#userNameArea").click();
        assert.isFalse($menu.is(":visible"));
    });


    it("should mouseup .about to open about modal", function() {
        var oldFunc = AboutModal.Instance.show;
        var test = false;
        AboutModal.Instance.show = function() { test = true; };
        // normal moouseup not work
        $menu.find(".about").mouseup();
        expect(test).to.be.false;
        $menu.find(".about").trigger(fakeEvent.mouseup);
        expect(test).to.be.true;
        // clear up
        AboutModal.Instance.show = oldFunc;
    });

    // it("should mouseup .setup to open setup panel", function() {
    //     var oldOpenPanel = MainMenu.openPanel;
    //     var oldOpen = MainMenu.open;
    //     var test1 = test2 = test3 = false;
    //     var noWorkbook = $("#container").hasClass("noWorkbook");

    //     MainMenu.openPanel = function() { test2 = true; };
    //     MainMenu.open = function() { test3 = true; };

    //     // normal moouseup not work
    //     $menu.find(".setup").mouseup();
    //     expect(test1).to.be.false;
    //     expect(test2).to.be.false;
    //     expect(test3).to.be.false;

    //     // case 1
    //     $("#container").addClass("noWorkbook");
    //     $menu.find(".setup").trigger(fakeEvent.mouseup);
    //     expect(test1).to.be.true;
    //     expect(test2).to.be.false;
    //     expect(test3).to.be.false;

    //     // case 2
    //     test1 = false;
    //     $("#container").removeClass("noWorkbook");
    //     $menu.find(".setup").trigger(fakeEvent.mouseup);
    //     expect(test1).to.be.false;
    //     expect(test2).to.be.true;
    //     expect(test3).to.be.true;

    //     // clear up
    //     MainMenu.openPanel = oldOpenPanel;
    //     MainMenu.open = oldOpen;
    //     if (noWorkbook) {
    //         $("#container").addClass("noWorkbook");
    //     }
    // });

    // XXX hide in 2.2
    // XXX TODO: enable it when it's ready to support
    // it("should mouseup .liveHelp to open about modal", function() {
    //     var oldFunc = LiveHelpModal.Instance.show;
    //     var test = false;
    //     LiveHelpModal.Instance.show = function() { test = true; };
    //     // normal moouseup not work
    //     $menu.find(".liveHelp").mouseup();
    //     expect(test).to.be.false;
    //     $menu.find(".liveHelp").trigger(fakeEvent.mouseup);
    //     expect(test).to.be.true;
    //     // clear up
    //     LiveHelpModal.Instance.show = oldFunc;
    // });

    it("should mouseup logout button to sign out", function() {
        var oldFunc = xcManager.unload;
        var test = false;
        xcManager.unload = function() {
            test = true;
            return PromiseHelper.resolve()
        };
        var oldIsCloud = XVM.isCloud;
        XVM.isCloud = () => false;
        // normal moouseup not work
        $("#logout").mouseup();
        expect(test).to.be.false;
        $("#logout").trigger(fakeEvent.mouseup);
        expect(test).to.be.true;

        xcManager.unload = oldFunc;
        XVM.isCloud = oldIsCloud;
    });

    it("clicking on credits should show alert", () => {
        var oldFunc = window.open;
        var called = false;
        window.open = () => called = true;
        $menu.find(".credits").mouseup();
        expect(called).to.be.false;
        $menu.find(".credits").trigger(fakeEvent.mouseup);
        expect(called).to.be.true;
        window.open = oldFunc;
    });

    it("should update credits", () => {
        UserMenu.Instance.updateCredits();
        expect($menu.find(".credits .num").text()).to.equal("Credits: N/A");

        UserMenu.Instance.updateCredits(1504.6);
        expect($menu.find(".credits .num").text()).to.equal("1,505 Credits");

        UserMenu.Instance.updateCredits(1504.4);
        expect($menu.find(".credits .num").text()).to.equal("1,504 Credits");

        let cacheLimit = XcUser.firstCreditWarningLimit;
        XcUser.firstCreditWarningLimit = 100;
        expect($menu.find(".credits").hasClass("warning")).to.be.false;
        expect($("#messageModal").is(":visible")).to.be.false;

        UserMenu.Instance.updateCredits(50);
        expect($menu.find(".credits .num").text()).to.equal("50 Credits");
        expect($menu.find(".credits").hasClass("warning")).to.be.true;
        expect($("#messageModal").is(":visible")).to.be.true;
        $("#messageModal").find(".close").click();

        XcUser.firstCreditWarningLimit = cacheLimit;
    });


});