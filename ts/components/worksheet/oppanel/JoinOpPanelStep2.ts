class JoinOpPanelStep2 {
    private _$elem: JQuery = null;
    private _modelRef: JoinOpPanelModel = null;
    private _templateMgr = new OpPanelTemplateManager();
    private _componentFactory: OpPanelComponentFactory;
    private _opSectionSelector = "#joinOpPanel .opSection";
    private _onDataChange = () => {};
    private static readonly _templateIds = {
        renameRow: 'templateRenameRow',
        renameList: 'templateRenameList',
        renameTable: 'templateRenameTable',
        renameSection: 'templateColumnRename',
        columnRow: 'templateColumn',
        columnList: 'templateColumnList',
        columnTable: 'templateColumnTable',
        columnSelectSection: 'templateColumnSelect',
        columnKeepAll: 'templateKeepAll'
    };

    public constructor(props: {
        container: JQuery
    }) {
        const { container } = props;
        this._$elem = BaseOpPanel.findXCElement(container, 'joinSecondStep');
        const templateIds = JoinOpPanelStep2._templateIds;
        for (const template of Object.keys(templateIds)) {
            this._templateMgr.loadTemplate(templateIds[template], this._$elem);
        }
        this._componentFactory = new OpPanelComponentFactory(this._opSectionSelector);
    }

    public updateUI(props: {
        modelRef: JoinOpPanelModel,
        onDataChange: () => void
    }): void {
        const { modelRef, onDataChange } = props;
        this._modelRef = modelRef;
        this._onDataChange = onDataChange;
        this._updateUI();
    }

    private _updateUI() {
        if (this._modelRef.getCurrentStep() !== 2 || this._modelRef.isAdvMode()) {
            this._$elem.hide();
            return;
        }
        this._$elem.show();

        const findXCElement = BaseOpPanel.findXCElement;

        // Column Selector
        const elemColSelContainer = findXCElement(this._$elem, 'columnSelectSection')[0];
        this._templateMgr.updateDOM(
            elemColSelContainer,
            <NodeDefDOMElement[]>this._createColumnSelectSection()
        );

        // Column Rename
        const elemColRenameContainer = findXCElement(this._$elem, 'columnRenameSection')[0];
        this._templateMgr.updateDOM(
            elemColRenameContainer,
            <NodeDefDOMElement[]>this._createColumnRenameSection()
        );
    }

    private _createPrefixRenameTable(
        prefixCollisionLeft: Set<string>,
        prefixCollisionRight: Set<string>
    ): HTMLElement[] {
        const prefixLeftList = this._modelRef.getRenames({
            isPrefix: true, isLeft: true
        });
        const prefixRightList = this._modelRef.getRenames({
            isPrefix: true, isLeft: false
        });
        if (prefixLeftList.length === 0 && prefixRightList.length === 0) {
            return [];
        }

        const elements = this._templateMgr.createElements(
            JoinOpPanelStep2._templateIds.renameTable,
            {
                'renameHeader': OpPanelTStr.JoinPanelRenameTitlePrefix,
                'APP-LEFTRENAME': this._createRenameList({
                    isLeft: true, isPrefix: true,
                    renameInfoList: prefixLeftList,
                    collisionNames: prefixCollisionLeft
                }),
                'APP-RIGHTRENAME': this._createRenameList({
                    isLeft: false, isPrefix: true,
                    renameInfoList: prefixRightList,
                    collisionNames: prefixCollisionRight
                })
            }
        );
        return elements;
    }

    private _createDerivedRenameTable(
        columnCollisionLeft: Set<string>,
        columnCollisionRight: Set<string>
    ): HTMLElement[] {
        const derivedLeftList = this._modelRef.getRenames({
            isLeft: true, isPrefix: false
        });
        const derivedRightList = this._modelRef.getRenames({
            isLeft: false, isPrefix: false
        });
        if (derivedLeftList.length === 0 && derivedRightList.length === 0) {
            return [];
        }

        const elements = this._templateMgr.createElements(
            JoinOpPanelStep2._templateIds.renameTable,
            {
                'renameHeader': OpPanelTStr.JoinPanelRenameTitleDerived,
                'APP-LEFTRENAME': this._createRenameList({
                    isLeft: true, isPrefix: false,
                    renameInfoList: derivedLeftList,
                    collisionNames: columnCollisionLeft
                }),
                'APP-RIGHTRENAME': this._createRenameList({
                    isLeft: false, isPrefix: false,
                    renameInfoList: derivedRightList,
                    collisionNames: columnCollisionRight
                })
            }
        );
        return elements;
    }

    private _createColumnRenameSection(): HTMLElement[] {
        const {
            columnLeft: columnCollisionMap, prefixLeft: prefixCollisionMap
        } = this._modelRef.getCollisionNames();
        // Keep only one collision error to show
        let numCollisionsToShow = 1;
        const collisionPrefix: Set<string> = new Set();
        const collisionColumns: Set<string> = new Set();
        for (const name of prefixCollisionMap.keys()) {
            if (numCollisionsToShow <= 0) {
                break;
            }
            collisionPrefix.add(name);
            numCollisionsToShow --;
        }
        for (const name of columnCollisionMap.keys()) {
            if (numCollisionsToShow <= 0) {
                break;
            }
            collisionColumns.add(name);
            numCollisionsToShow --;
        }
        

        const elemTablePrefix = this._createPrefixRenameTable(
            collisionPrefix, collisionPrefix
        );
        const elemTableDerived = this._createDerivedRenameTable(
            collisionColumns, collisionColumns
        );

        if ((elemTablePrefix == null || elemTablePrefix.length === 0)
            && (elemTableDerived == null || elemTableDerived.length === 0)
        ) {
            return [];
        }

        const templateId = JoinOpPanelStep2._templateIds.renameSection;
        const elements = this._templateMgr.createElements(templateId, {
            'APP-PREFIXRENAME': elemTablePrefix,
            'APP-DERIVEDRENAME': elemTableDerived
        });
        return elements;
    }

    private _setupBatchRename($container: JQuery, isLeft: boolean, isPrefix: boolean): void {
        $container.find(".menu").each(function() {
            xcMenu.add($(this), {"keepOpen": true});
        });

        $container.off('click', '.option');
        $container.on("click", ".option", function(event) {
            var $target = $(event.target);
            var $menu = $target.closest(".optionWrap").find(".menu");
            $menu.find("input").val("");

            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": 0, "y": -71},
                "floating": true
            });
            return false;
        });
        $container.on("click", ".copyAll", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._batchRename({ isLeft: isLeft, isPrefix: isPrefix });
            this._onDataChange();
        });

        $container.on("click", ".copyAppend", function(event) {
            if (event.which !== 1) {
                return;
            }
            $(this).find("input").focus();
        });

        $container.on("input", ".copyAppend input", (event) => {
            const suffix = $(event.target).val();
            this._batchRename({ isLeft: isLeft, isPrefix: isPrefix, suffix: suffix});
            this._onDataChange();
        });
    }

    private _createRenameList(props: {
        isLeft: boolean,
        isPrefix: boolean,
        renameInfoList: JoinOpRenameInfo[], // !!! Items in list are references !!!
        collisionNames: Set<string>
    }) {
        const { isLeft, renameInfoList, isPrefix, collisionNames } = props;

        if (renameInfoList == null || renameInfoList.length === 0) {
            return [];
        }

        // Create rename rows
        const nodeRowList: NodeDefDOMElement[] = [];
        for (const renameInfo of renameInfoList) {
            const isDetached = isPrefix
                ? (this._modelRef.isPrefixDetached(renameInfo.source, isLeft))
                : (this._modelRef.isColumnDetached(renameInfo.source, isLeft));

                const renameRow = this._templateMgr.createElements(
                JoinOpPanelStep2._templateIds.renameRow,
                {
                    oldName: renameInfo.source,
                    newName: renameInfo.dest,
                    colErrCss: isDetached ? 'text-detach' : '',
                    onClickRename: () => {
                        this._autoRenameColumn(renameInfo, renameInfo.source, isLeft);
                        this._onDataChange();
                    },
                    onNameChange: (e) => {
                        this._renameColumn(renameInfo, e.target.value.trim());
                        this._onDataChange();
                    },
                    'APP-ERRMSG': collisionNames.has(renameInfo.source)
                        ? this._componentFactory.createErrorMessage({
                            msgText: isPrefix
                                ? ErrTStr.PrefixConflict
                                : ErrTStr.ColumnConflict
                        })
                        : null
                }
            );

            for (const row of renameRow) {
                nodeRowList.push(row);
            }
        }

        // Create rename table
        const nodeTable = this._templateMgr.createElements(
            JoinOpPanelStep2._templateIds.renameList,
            {
                'oldColTitle': isLeft
                    ? OpPanelTStr.JoinPanelRenameColOldLeft
                    : OpPanelTStr.JoinPanelRenameColOldRight,
                'newColTitle': OpPanelTStr.JoinPanelRenameColNew,
                'APP-RENAMES': nodeRowList, 
            }
        )

        // Setup batch rename
        this._setupBatchRename($(nodeTable[0]), isLeft, isPrefix);
        return nodeTable;
    }

    private _createColumnRow(props: ColumnWithActionProps): HTMLElement[] {
        if (props == null) {
            return null;
        }

        const templateId = JoinOpPanelStep2._templateIds.columnRow;
        const actionIconMap = {
            add: 'xi-plus', remove: 'xi-close-no-circle'
        };

        const { onClickAction = () => {}, actionType, columnProps, onElementMountDone } = props;

        const elements = this._templateMgr.createElements(templateId, {
            cssClickable: actionType === 'none' ? '' : 'column-clickable',
            onClickAction: onClickAction,
            cssActionType: actionIconMap[actionType] || '',
            cssColType: `type-${columnProps.colType}`,
            colType: columnProps.colType,
            colName: columnProps.colName,
        });
        if (onElementMountDone != null) {
            OpPanelTemplateManager.setNodeMountDoneListener(elements, onElementMountDone);
        }

        return elements;
    }

    private _createColumnList(props: ColumnListWithActionProps): HTMLElement[] {
        if (props == null) {
            return null;
        }

        const templateId = JoinOpPanelStep2._templateIds.columnList;
        const { title, columnList = [], onElementMountDone, cssExtra = '' } = props;

        const columnRows = [];
        columnList.forEach((colProp) => {
            const row = this._createColumnRow(colProp) || [];
            row.forEach((e) => columnRows.push(e));
        });
        const elements = this._templateMgr.createElements(templateId, {
            title: title,
            cssExtra: cssExtra,
            'APP-COLUMNS': columnRows
        });
        if (onElementMountDone != null) {
            OpPanelTemplateManager.setNodeMountDoneListener(elements, onElementMountDone);
        }

        return elements;
    }

    private _createColumnTable(props: { isSelected: boolean }): HTMLElement[] {
        const { isSelected } = props;

        const columns: {
            leftSelectable: JoinOpColumnInfo[], rightSelectable: JoinOpColumnInfo[],
            leftFixed?: JoinOpColumnInfo[], rightFixed?: JoinOpColumnInfo[]
        } = isSelected
            ? this._modelRef.getSelectedColumns()
            : this._modelRef.getUnSelectedColumns();
        if (columns.leftSelectable.length === 0 && columns.leftFixed == null
            && columns.rightSelectable.length === 0 && columns.rightFixed == null) {
            return null;
        }
        const isLeftTableOnly = this._modelRef.isLeftColumnsOnly();
        const tableTitle = isSelected
            ? OpPanelTStr.JoinPanelColumnTableTitleKeep
            : OpPanelTStr.JoinPanelColumnTableTitleDrop;
        const actionType = isSelected ? 'remove' : 'add';
        const leftListTitle = OpPanelTStr.JoinPanelColumnListTitleLeft;
        const rightListTitle = OpPanelTStr.JoinPanelColumnListTitleRight;
        const actionFunc = isSelected
            ? (colName) => {
                xcTooltip.hideAll();
                this._removeSelectedColumn(colName);
                this._onDataChange();
            }
            : (colName) => {
                xcTooltip.hideAll();
                this._addSelectedColumn(colName);
                this._onDataChange();
            }

        // Child component: left column list
        const leftFixedColProps = columns.leftFixed == null
            ? []
            : columns.leftFixed.map((colInfo) => ({
                actionType: 'none',
                columnProps: {
                    colName: colInfo.name, colType: colInfo.type
                }
            }));
        const elemLeftList = this._createColumnList({
            title: leftListTitle,
            cssExtra: isLeftTableOnly ? 'columnList-full' : '',
            columnList: leftFixedColProps.concat(
                columns.leftSelectable.map((colInfo) => ({
                    onClickAction: () => actionFunc({left: colInfo.name}),
                    actionType: actionType,
                    columnProps: {
                        colName: colInfo.name, colType: colInfo.type
                    }
                }))
            )
        });

        // Child component: right column list
        const rightFixedColProps = columns.rightFixed == null
            ? []
            : columns.rightFixed.map((colInfo) => ({
                actionType: 'none',
                columnProps: {
                    colName: colInfo.name, colType: colInfo.type
                }
            }));
        const elemRightList = isLeftTableOnly ? [] : this._createColumnList({
            title: rightListTitle,
            columnList: rightFixedColProps.concat(
                columns.rightSelectable.map((colInfo) => ({
                    onClickAction: () => actionFunc({right: colInfo.name}),
                    actionType: actionType,
                    columnProps: {
                        colName: colInfo.name, colType: colInfo.type
                    }
                }))
            )
        });

        // Component: column table
        const templateId = JoinOpPanelStep2._templateIds.columnTable;
        const elements = this._templateMgr.createElements(templateId, {
            tableTitle: tableTitle,
            'APP-LEFT': elemLeftList,
            'APP-RIGHT': elemRightList
        });

        return elements;
    }

    private _createColumnSelectSection(): HTMLElement[] {
        const isKeepAll = this._modelRef.isKeepAllColumns();
        const elemTableKeep = isKeepAll ? null : this._createColumnTable({ isSelected: true });
        const elemTableDrop = isKeepAll ? null : this._createColumnTable({ isSelected: false });

        const templateId = JoinOpPanelStep2._templateIds.columnSelectSection;
        const elements = this._templateMgr.createElements(templateId, {
            'APP-KEEPALL': this._createColumnKeepAll(),
            'APP-TABLEKEEP': elemTableKeep,
            'APP-TABLEDROP': elemTableDrop
        });
        return elements;
    }

    private _createColumnKeepAll(): HTMLElement[] {
        const isKeepAll = this._modelRef.isKeepAllColumns();
        const templateId = JoinOpPanelStep2._templateIds.columnKeepAll;
        const elements = this._templateMgr.createElements(templateId, {
            onClickKeepAll: () => {
                this._setKeepAllColumns(!isKeepAll);
                this._onDataChange();
            },
            cssChecked: isKeepAll ? 'checked' : '',
            title: OpPanelTStr.JoinPanelColumnKeepAllCBText
        });
        return elements;
    }

    // Data model manipulation === start
    private _renameColumn(renameInfo: JoinOpRenameInfo, newName: string) {
        renameInfo.dest = newName;
    }

    private _autoRenameColumn(
        renameInfo: JoinOpRenameInfo, orignName: string, isLeft: boolean
    ) {

        const nameMap = {};
        const {
            left: leftNames, right: rightNames
        } = this._modelRef.getResolvedNames(renameInfo.isPrefix);
        if (isLeft) {
            removeName(leftNames, orignName);
        } else {
            removeName(rightNames, orignName);
        }
        const nameList = leftNames.concat(rightNames);
        for (const name of nameList) {
            nameMap[name.dest] = true;
        }

        const newName = xcHelper.autoName(orignName, nameMap, Object.keys(nameMap).length);
        renameInfo.dest = newName;

        function removeName(list, name) {
            for (let i = 0; i < list.length; i ++) {
                if (list[i].source === name) {
                    list.splice(i, 1);
                    return;
                }
            }
        }
    }

    private _batchRename(options: {
        isLeft: boolean, isPrefix: boolean, suffix?: string
    }) {
        const { isLeft, isPrefix, suffix } = options;
        this._modelRef.batchRename({
            isLeft: isLeft,
            isPrefix: isPrefix,
            suffix: suffix
        });
    }

    private _addSelectedColumn(colName: { left: string, right: string }) {
        this._modelRef.addSelectedColumn(colName);
        this._modelRef.updateRenameInfo();
    }

    private _removeSelectedColumn(colName: { left: string, right: string }) {
        this._modelRef.removeSelectedColumn(colName);
        this._modelRef.updateRenameInfo();
    }

    private _setKeepAllColumns(isKeepAll: boolean): void {
        this._modelRef.setKeepAllColumns(isKeepAll);
        this._modelRef.updateRenameInfo();
    }
    // Data model manipulation === end
}