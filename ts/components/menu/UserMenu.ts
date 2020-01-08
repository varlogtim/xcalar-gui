class UserMenu {
    private static _instance: UserMenu;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * UserMenu.Instance.setup
     */
    public setup() {
        const $menu: JQuery = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcUser.CurrentUser.getFullName());

        $("#userNameArea").click(function() {
            const $target: JQuery = $(this);
            if (XVM.isCloud()) {
                $menu.find(".credits").show();
            } else {
                $menu.find(".credits").hide();
            }
            MenuHelper.dropdownOpen($target, $menu, <DropdownOptions>{
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
            XcUser.creditUsageCheck();
        });

        $menu.on("mouseup", ".credits", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            window.open(paths.cloudCredit);
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
        });

        $menu.on('mouseup', ".preferences", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            MainMenu.openPanel("monitorPanel", "settingsButton");
        });

        $("#logout").mouseup(function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            if (XVM.isCloud()) {
                LogoutModal.Instance.show();
            } else {
                XcUser.CurrentUser.logout();
            }
        });
    }

    public updateCredits(origNum: number) {
        if (origNum == null) {
            let credits = "Credits: N/A";
            let $li: JQuery = $("#userMenu").find(".credits");
            $li.find(".num").text(credits);
            $li.removeClass("warning");
            return;
        }
        let num;
        try {
            if (origNum >= 1000) {
                num = Math.round(origNum);
            } else {
                num = origNum.toPrecision(3);
            }
        } catch (e) {
            console.error(e);
            return;
        }

        const credits: string = xcStringHelper.numToStr(num) + " Credits";
        let needsWarning: boolean = (origNum < XcUser.firstCreditWarningLimit);

        let $li: JQuery = $("#userMenu").find(".credits");
        $li.find(".num").text(credits);
        if (needsWarning) {
            if (!$li.hasClass("warning")) {
                // only show message if $li didn't previously have warning class
                MessageModal.Instance.show({
                    title: "You are running low on credits...",
                    msg: xcStringHelper.replaceMsg(AlertTStr.LowOnCredits, {
                        time: XcUser.firstCreditWarningTime,
                        path: paths.cloudCredit,
                        link: paths.cloudCredit
                    }),
                    sizeToText: true,
                    size: "medium",
                    isAlert: true
                });
            }
            $li.addClass("warning");
        } else {
            $li.removeClass("warning");
        }
    }
}
