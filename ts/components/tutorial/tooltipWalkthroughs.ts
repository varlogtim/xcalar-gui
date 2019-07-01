namespace TooltipWalkthroughs {

    let SQLModeName = "SQL Mode";
    let ADVModeName = "Advanced Mode";

    // TODO: Add flight tests for whenever this file has added walkthroughs.

    export function newUserPopup(): void {
        TooltipManager.start({
                tooltipTitle: DemoTStr.title,
                background: false,
                startScreen: TooltipStartScreen.Workbooks,
                isSingleTooltip: true
            },
            [{
                highlight_div: "#workbookPanel .tutBox",
                interact_div: "#workbookPanel .tutBox",
                text: "If this is your first time using Xcalar design, the above panel contains many resources to help get you started.",
                type: TooltipType.Click
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: false
            }
        );
    }

    export function emergencyPopup(): void {
        TooltipManager.start({
            tooltipTitle: "Warning",
            background: false,
            startScreen: null,
            isSingleTooltip: true
        },
        [{
            highlight_div: "#homeBtn",
            interact_div: "#homeBtn",
            text: "Something has gone wrong while executing this tooltip walkthrough. Please try again later.",
            type: TooltipType.Click
        }],
        0,
        {
            closeOnModalClick: true,
            includeNumbering: false
        }
        );
    }


    export function SQLModeWalkthrough(): void {
        // NOTE: If this is changed, please change the associated unit test
        TooltipManager.start({
                tooltipTitle: "SQL Mode",
                background: true,
                startScreen: TooltipStartScreen.SQLWorkspace
            },
            [{
                highlight_div: "#menuBar",
                text: "The menu bar enables access to various features within Xcalar Design.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                text: "This icon enables you to import data, create tables, and create data targets.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#sqlTab",
                text: "SQL query statements can be created and executed within the SQL workspace.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#monitorTab",
                text: "The monitor tab provides various tools for monitoring Xcalar, managing files, and changing settings.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab .mainTab",
                text: "Let's get started with importing a table. Click this icon to open it.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#sourceTblButton",
                interact_div: "#sourceTblButton",
                text: "To create a new table, click this Tables icon.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dsForm-path .cardMain",
                text: "This panel enables you to locate your data.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-target",
                text: "The data target is the storage location of your data.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#filePath",
                text: "The file path is the path to your data source, in relation to the target. ",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .cardMain .browse",
                text: "Clicking this browse button allows you to browse the location at the file path for your file(s).",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .btn-submit",
                text: "To load the dataset at the path, click this button.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlWorkSpace",
                interact_div: "#sqlWorkSpace",
                text: "Let's go back to the SQL Workspace. Click this button to go there instantly.",
                type: TooltipType.Click,
            },
            {
                highlight_div: "#sqlEditorSpace",
                text: "The SQL Editor Space is where you can write, store, and modify SQL Query Statements.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlTableListerArea",
                text: "This area provides information on available tables and result sets.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlWorkSpacePanel .historySection",
                text: "This area displays the execution history of your SQL statements.",
                type: TooltipType.Text,
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: true
            }
        );
    }

    export function AdvModeWalkthrough(): void {
        // NOTE: If this is changed, please change the associated unit test
        TooltipManager.start({
                tooltipTitle: "Advanced Mode",
                background: true,
                startScreen: TooltipStartScreen.ADVModeDataflow
            },
            [{
                highlight_div: "#dagButton",
                text: "Temporary placeholder Text",
                type: TooltipType.Text
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: true
            }
        );
    }

    /**
     * Returns a list of available walkthroughs in {name, description} objects.
     */
    export function getAvailableWalkthroughs(): {name: string, description: string}[] {
        // XXX TODO: Integrate with tutorial workbooks
        let builtInWalkthroughs = [{
            name: SQLModeName,
            description: "Tour of the SQL Mode UI"
        }, {
            name: ADVModeName,
            description: "Tour of the Advanced Mode UI"
        }];
        return builtInWalkthroughs;
    }

    /**
     * Given a walkthrough name, starts the corresponding walkthrough.
     * @param name
     */
    export function startWalkthrough(name: string): string {
        if (WorkbookPanel.isWBMode()) {
            if (WorkbookManager.getActiveWKBK() != null) {
                // if we're in a workbook, but on the workbook screen, we just go back to it
                $("#homeBtn").click();
            } else {
                // If we aren't in a workbook, we need to open one.
                return TooltipTStr.TooltipNoWorkbook;
            }
        }
        switch(name) {
            case (SQLModeName):
                SQLModeWalkthrough();
                break;
            case (ADVModeName):
                AdvModeWalkthrough();
                break;
            default:
                // XXX TODO: Case for tutorial walkthrough
                break;
        }
        return "";
    }
}