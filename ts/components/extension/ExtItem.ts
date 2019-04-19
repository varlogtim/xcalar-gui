
class ExtItem {
    private appName: string;
    private version: string;
    private XDVersion: string;
    private description: string;
    private author: string;
    private image: string;
    private main: string;
    private website: string;
    // XXX quick hack, if we later want to have multiple category
    // then keep the structure, otherwise, can refactor to remove
    // category related code
    private category: string;

    public constructor(options) {
        options = options || {};
        this.appName = options.appName;
        this.version = options.version;
        this.description = options.description;
        this.author = options.author;
        this.image = options.image;
        this.main = options.main;
        this.website = options.website;
        // XXX quick hack, if we later want to have multiple category
        // then keep the structure, otherwise, can refactor to remove
        // category related code
        this.category = options.category || ExtTStr.XcCategory;
        this.XDVersion = options.XDVersion;
    }

    public getName(): string {
        return this.appName;
    }

    public getMainName(): string {
        const name: string = this.getName();
        if (this.main) {
            return this.main + " (" + name + ")";
        } else {
            return name;
        }
    }

    public getCategory(): string {
        return this.category;
    }

    public getAuthor(): string {
        return this.author || "N/A";
    }

    public getDescription(): string {
        return this.description || "";
    }

    public getVersion(): string {
        return this.version || "N/A";
    }

    public getXDVersion(): string {
        return this.XDVersion || "N/A";
    }

    public getImage(): string {
        if (this.image == null) {
            return "";
        }

        return this.image;
    }

    public setImage(newImage): void {
        this.image = newImage;
    }

    public getWebsite(): string {
        return this.website;
    }

    public isInstalled(): boolean {
        const $extLists: JQuery = $("#extension-lists");
        if ($extLists.find(".error").length) {
            return this.__findInstallFindScript();
        } else {
            const name: string = this.getName();
            const $li: JQuery = $extLists.find(".item").filter(function() {
                return $(this).find(".name").text() === name;
            });
            return ($li.length > 0);
        }
    }

    private __findInstallFindScript(): boolean {
        let exist: boolean = false;
        const name: string = this.getName() + ".ext.js";

        $("#extension-ops-script script").each(function() {
            const src: string = $(this).attr("src");
            if (src && src.includes(name)) {
                exist = true;
                // end loop
                return false;
            }
        });
        return exist;
    }
}