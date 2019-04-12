/**
 * The operation editing panel for Project operator
 */
class ProjectOpPanel extends BaseOpPanel implements IOpPanel {
    private _templateMgr = new OpPanelTemplateManager();
    private _$elemPanel: JQuery = null; // The DOM element of the panel
    private _$elemDeriveSelectAllWrap: JQuery = null;
    private _$elemDeriveSelectAllCheckbox: JQuery = null;
    private _dataModel: ProjectOpPanelModel = new ProjectOpPanelModel() ; // The key data structure
    protected _dagNode: DagNodeProject = null;
    protected codeMirrorOnlyColumns = true;

    // *******************
    // Constants
    // *******************
    private static readonly _templateIdDerivedColumn = 'xdtemp_projop_column_derive';
    private static readonly _templateIdFixedColumn = 'xdtemp_projop_column_nocheck';
    private static readonly _templateIdFlexSpace = 'xdtemp_projop_flexspace';
    private static readonly _templateIdPrefixGroup = 'xdtemp_projop_prefixed';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#projectOpPanel');
        this._$elemDeriveSelectAllWrap =
            ProjectOpPanel.findXCElement(this._$elemPanel, 'selAllDerive');
        this._$elemDeriveSelectAllCheckbox =
            ProjectOpPanel.findXCElement(this._$elemDeriveSelectAllWrap, 'selAllCheck');

        // Load Templates
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdDerivedColumn,
            this._$elemPanel
        );
        this._templateMgr.loadTemplateFromString(
            ProjectOpPanel._templateIdFlexSpace,
            '<div class="flexSpace"></div>'
        )
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdFixedColumn,
            this._$elemPanel
        );
        this._templateMgr.loadTemplate(
            ProjectOpPanel._templateIdPrefixGroup,
            this._$elemPanel
        );

        super.setup(this._$elemPanel);
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeProject, options?): void {
        this._dagNode = dagNode;
        this._dataModel = ProjectOpPanelModel.fromDag(dagNode);
        let error: string;
        try {
            this._updateUI();
        } catch (e) {
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }
        this._updateColumns();
        super.showPanel(null, options);
        if (error) {
            this._startInAdvancedMode(error);
        }
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    /**
     * refetch source columns
     * @param info
     */
    public refreshColumns(): void {
        this._dataModel = ProjectOpPanelModel.refreshColumns(this._dataModel, this._dagNode);
        this._updateColumns();
        this._updateUI();
    }

    private _updateUI() {
        this._renderDerivedColumns();
        this._renderPrefixedColumns();

        // Setup event listeners
        this._setupEventListener();
    }

    /**
     * Render derived column list
     */
    private _renderDerivedColumns(): void {
        const columnList = this._dataModel.derivedList;

        // Clear the current DOM
        // this._$elemDerivedContainer.empty();

        // Render column list
        const nodeList: NodeDefDOMElement[] = []
        for (let i = 0; i < columnList.length; i ++) {
            const column = columnList[i];
            const colName = column.name;
            const colType = this._dataModel.getColumnType(colName);
            const domList = this._templateMgr.createElements(
                ProjectOpPanel._templateIdDerivedColumn,
                {
                    'origTitle': xcStringHelper.escapeDblQuoteForHTML(
                        xcStringHelper.escapeHTMLSpecialChar(colName)
                    ),
                    'checkClass': column.isSelected? 'checked': '',
                    'colName': colName,
                    'onColClick': this._onDerivedColumnClick(i),
                    'colType': colType,
                    'colTypeClass': `type-${colType}`
                }
            );
            for (const dom of domList) {
                nodeList.push(dom);
            }
        }
        for (let i = 0; i < 10; i ++) {
            const spaceDom = this._templateMgr.createElements(ProjectOpPanel._templateIdFlexSpace);
            for (const dom of spaceDom) {
                nodeList.push(dom);
            }
        }
        const elemDerivedContainer = ProjectOpPanel.findXCElement(this._$elemPanel, 'derivedContainer')[0];
        this._templateMgr.updateDOM(elemDerivedContainer, nodeList);

        // SelectAll checkbox for derived columns
        this.toggleCheckbox(this._$elemDeriveSelectAllCheckbox, this._dataModel.isAllDerivedSelected);
        this._$elemDeriveSelectAllWrap.off();
        this._$elemDeriveSelectAllWrap.on(
            'click',
            this._onSelectAllClick()
        );

        // Handle empty case
        const $elemDerivedSection = this._$elemPanel.find('.derivedSection');
        if (columnList.length === 0) {
            $elemDerivedSection.addClass('empty');
        } else {
            $elemDerivedSection.removeClass('empty');
        }
    }

    /**
     * Render the prefixed columns UI
     */
    private _renderPrefixedColumns(): void {
        const prefixList = this._dataModel.prefixedList;

        // Create prefix sections
        const nodeList = [];
        for (let prefixIndex = 0; prefixIndex < prefixList.length; prefixIndex ++) {
            const prefixInfo = prefixList[prefixIndex];

            // Create column group
            const groupDom = this._templateMgr.createElements(
                ProjectOpPanel._templateIdPrefixGroup,
                {
                    'prefixTip': ProjectTStr.prefixTip,
                    'prefix': prefixInfo.prefix,
                    'textSelectAll': CommonTxtTstr.SelectAll,
                    'selAllCss': prefixInfo.isSelected? 'checked': '',
                    'onSelAllClick': this._onPrefixSelectClick(prefixIndex)
                }
            );

            // Create columns DOM
            const $columnContainer = ProjectOpPanel.findXCElement($(groupDom), 'columnContainer');
            for (const column of prefixInfo.columnList) {
                const colType = this._dataModel.getColumnType(column.name);
                const columnDom = this._templateMgr.createElements(
                    ProjectOpPanel._templateIdFixedColumn,
                    {
                        'origTitle': xcStringHelper.escapeDblQuoteForHTML(
                            xcStringHelper.escapeHTMLSpecialChar(column.name)
                        ),
                        'colName': xcHelper.parsePrefixColName(column.name).name,
                        'colType': colType,
                        'colTypeClass': `type-${colType}`
                    }
                );
                for (const dom of columnDom) {
                    $columnContainer.append(dom);
                }
            }

            // Append DOM to container
            for (const dom of groupDom) {
                nodeList.push(dom);
            }
        }
        const elemPrefixedContainer = ProjectOpPanel.findXCElement(
           this._$elemPanel,
           'prefixContainer'
        )[0];
        this._templateMgr.updateDOM(elemPrefixedContainer, nodeList);

       // Handle empty case
       const $elemPrefixedSection = this._$elemPanel.find('.prefixedSection');
       if (prefixList.length === 0) {
            $elemPrefixedSection.addClass('empty');
        } else {
            $elemPrefixedSection.removeClass('empty');
        }
    }

    /**
     * Validate form values & save data
     * @param dagNode DagNode object
     * @returns true: success; false: failed validation
     */
    private _submitForm(dagNode: DagNodeProject): boolean {
        if (this._isAdvancedMode()) {
            const $elemEditor = this._$elemPanel.find(".advancedEditor");
            try {
                this._dataModel = this._convertAdvConfigToModel();
                const selectedCounts = this._dataModel.getSelectedCount();
                if (selectedCounts.derived + selectedCounts.prefixed === 0) {
                    StatusBox.show(ErrTStr.NoColumns, $elemEditor);
                    return false;
                }
            } catch(e) {
                StatusBox.show(e, $elemEditor);
                return false;
            }
        } else {
            // Validate: At least one column should be selected
            const selectedCounts = this._dataModel.getSelectedCount();
            if (selectedCounts.derived + selectedCounts.prefixed === 0) {
                StatusBox.show(
                    ErrTStr.NoColumns,
                    this._$elemPanel.find(".cols:visible").last()
                );
                return false;
            }
        }

        // save data
        dagNode.setParam(this._dataModel.toDag());
        return true;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        // Clear existing event handlers
        this._$elemPanel.off();

        // Close icon & Cancel button
        this._$elemPanel.on(
            'click',
            '.close, .cancel',
            () => { this.close() }
        );

        // Submit button
        this._$elemPanel.on(
            'click',
            '.submit',
            () => {
                if (this._submitForm(this._dagNode)) {
                    this.close(true);
                }
            }
        );
    }

    /**
     * Event Handler Factory: onClick for column div
     * @param colIndex The index of the column in data model
     * @returns event handler function
     */
    private _onDerivedColumnClick(
        colIndex: number
    ): () => any {
        return () => {
            // Flip the state
            const isSelected = !this._dataModel.derivedList[colIndex].isSelected;
            // Update the data model
            this._dataModel.derivedList[colIndex].isSelected = isSelected;
            // Update UI
            this._updateUI();
        };
    }

    /**
     * Event Handler Factory: onClick for derived column SelectAll checkbox
     */
    private _onSelectAllClick(): () => any {
        return () => {
            const isAllSelected = !this._dataModel.isAllDerivedSelected;
            this._dataModel.selectAllDerived(isAllSelected);
            this._updateUI();
        };
    }

    /**
     * Event Handler Factory: onClick for prefixed column SelectAll checkbox
     * @param prefixIndex The index of corresponding data in the data model
     */
    private _onPrefixSelectClick(
        prefixIndex: number
    ): () => any {
        return () => {
            const isSelected = !this._dataModel.prefixedList[prefixIndex].isSelected;
            this._dataModel.prefixedList[prefixIndex].isSelected = isSelected;
            this._updateUI();
        }
    }

    private _updateColumns(): void {
        this.allColumns = [];
        const colSets = this._dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        }) || [];
        const seen = {};
        colSets.forEach(cols => {
            cols.forEach(progCol => {
                if (!seen[progCol.getBackColName()]) {
                    seen[progCol.getBackColName()] = true;
                    this.allColumns.push(progCol);
                }
            });
        });
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeProjectInputStruct = this._dataModel.toDag();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                this._dataModel = this._convertAdvConfigToModel();
                this._updateUI();
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _convertAdvConfigToModel() {
        const dagInput: DagNodeProjectInputStruct = <DagNodeProjectInputStruct>JSON.parse(this._editor.getValue());

        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(dagInput);
            if (error) {
                throw new Error(error.error);
            }
        }

        const colMap = this._dataModel.columnMap;
        return ProjectOpPanelModel.fromDagInput(colMap, dagInput);
    }
}