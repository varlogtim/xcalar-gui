class CreatePublishTableModal {
    private static _instance: CreatePublishTableModal;
    private _$modal: JQuery; // $("#createPublishTableModal")
    private _modalHelper: ModalHelper;
    private _columns: ProgCol[];
    private _tableName: string;
    private _$nameInput: JQuery; // $('#createPublishTableModal .IMDNameInput')
    private _$primaryKeys: JQuery; // $('#createPublishTableModal .IMDKey .primaryKeys')
    private _$publishColList: JQuery; // $('#createPublishTableModal .publishColumnsSection .cols')
    private _currentKeys: string[];


    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$modal = $("#createPublishTableModal");
        this._$nameInput = $('#createPublishTableModal .IMDNameInput');
        this._$primaryKeys = $('#createPublishTableModal .IMDKey .primaryKeys');
        this._$publishColList = $('#createPublishTableModal .publishColumnsSection .cols');
        this._columns = [];
        this._currentKeys = [""];
        this._modalHelper = new ModalHelper(this._$modal, {
            noEnter: true
        });
        this._addEventListeners();
    }

    /**
     * CreatePublishTableModal.Instance.show
     * @returns {boolean}
     * @param table
     */
    public show(tableName: string, columns: ProgCol[]): boolean {
        if (this._$modal.is(":visible")) {
            return false;
        }
        this._tableName = tableName;
        this._columns = columns;
        this._setupColumnHints();
        this._renderColumns();
        this._modalHelper.setup();
        return true;
    };

    private _setupColumnHints(): void {
        let $list: JQuery = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns');
        let html = '';
        this._columns.forEach((column: ProgCol) => {
            html += '<li data-value="$' + column.getBackColName() + '">' +
                column.getBackColName() + '</li>';
        });
        $list.empty();
        $list.append(html);
    }

    private _activateDropDown($list: JQuery, container: string) {
        let dropdownHelper: MenuHelper = new MenuHelper($list, {
            "onOpen": function() {
                var $lis = $list.find('li').sort(xcHelper.sortHTML);
                $lis.prependTo($list.find('ul'));
            },
            "container": container
        });
        dropdownHelper.setupListeners();
        new InputDropdownHint($list, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val, $input) {
                if (val === $.trim($input.val())) {
                    return;
                }
                $input.val(val);
            },
            "order": true
        });
    }

    private _getTypeIcon(type: ColumnType): string {
        return '<i class="icon type ' +
            xcHelper.getColTypeIcon(xcHelper.convertColTypeToFieldType(type)) +
            '"></i>';
    }

    private _renderColumns(): void {
        const columnList = this._columns
        if (columnList.length == 0) {
            this._$publishColList.empty();
            $("#publishTableModalColumns .noColsHint").show();
            $("#publishTableModalColumns .selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            html += '<li class="col' +
                '" data-colnum="' + colNum + '">' +
                this._getTypeIcon(column.getType()) +
                '<span class="text tooltipOverflow" ' +
                'data-original-title="' +
                    xcHelper.escapeDblQuoteForHTML(
                        xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                'data-toggle="tooltip" data-placement="top" ' +
                'data-container="body">' +
                    colName +
                '</span>' +
                '<div class="checkbox' + '">' +
                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                '</div>' +
            '</li>';
        });
        this._$publishColList.html(html);
        $("#publishTableModalColumns .selectAllWrap").show();
        $("#publishTableModalColumns .noColsHint").hide();
        if (this._$publishColList.find('.col .checked').length == this._$publishColList.find('.checkbox').length) {
            this._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }

        if (columnList.length > 9) {
            this._$publishColList.css("overflow-y", "auto");
        } else {
            this._$publishColList.css("overflow-y", "hidden");
        }
    }

    private _replicateColumnHints(): void {
        let $list: JQuery = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns');
        let toCopy: string = $list.eq(0).html();
        $list.empty();
        $list.append(toCopy);
    }

    private _addKeyField(): void {
        const self = this;
        let html = '<div class="primaryKeyList dropDownList">' +
            '<input class="text primaryKeyInput" type="text" value="" spellcheck="false">' +
            '<i class="icon xi-cancel"></i>' +
            '<div class="iconWrapper">' +
                '<i class="icon xi-arrow-down"></i>' +
            '</div>' +
            '<div class="list">' +
                '<ul class="primaryKeyColumns"></ul>' +
                '<div class="scrollArea top stopped" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-up"></i>' +
                '</div>' +
                '<div class="scrollArea bottom" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-down"></i>'
                '</div>' +
            '</div>' +
        '</div>';
        this._$primaryKeys.append(html);
        this._replicateColumnHints();
        let $list = $('#createPublishTableModal .IMDKey .primaryKeyList').last();
        this._activateDropDown($list, '.IMDKey .primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $li.closest('.primaryKeyList').find('.primaryKeyInput');
                let oldVal = $primaryKey.val();
                if (oldVal != "") {
                    $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                    self._toggleColumnKey(oldVal.substr(1), false);
                }
                $primaryKey.val("$" + $li.text());
                $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
                let index = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyInput').index($primaryKey);
                self._currentKeys[index] = $li.data("value");
                let colName: string = $li.text();
                self._toggleColumnKey(colName, true);
            }
        });
        expList.setupListeners();
        this._currentKeys.push("");
    }

    private _toggleColumnKey(colName: string, checked: boolean) {
        if (colName.includes("::")) {
            colName = colName.split("::")[1];
        }
        let $col = $('#createPublishTableModal .publishColumnsSection .cols')
            .find("[data-original-title='" + colName + "']");
        if ($col.length == 0) {
            return;
        }
        if (checked) {
            $col.parent().addClass("checked active");
            $col.siblings(".checkbox").addClass("checked active")
            if (this._$publishColList.find('.col .checked').length == this._$publishColList.find('.checkbox').length) {
                this._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked active");
            }
        } else {
            $col.parent().removeClass("checked active");
            $col.siblings(".checkbox").removeClass("checked active")
            this._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked active");
        }
    }


    private _addEventListeners(): void {
        const self = this;
        this._$modal.on("click", ".close, .cancel", function() {
            self._closeModal();
        });

        this._$modal.on("click", ".confirm", function() {
            self._submitForm();
        });

        this._$modal.on("click", ".addKeyArg", function() {
            self._addKeyField();
        });

        this._$modal.on('click', '.keyOptions .disableKey .checkbox', function () {
            let $box: JQuery = $(this);
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$modal.find('.IMDKey').removeClass("xc-disabled");
                self._$modal.find('.keyOptions .btnWrap').removeClass("xc-disabled");
            } else {
                $box.addClass("checked");
                self._$modal.find('.IMDKey').addClass("xc-disabled");
                self._$modal.find('.keyOptions .btnWrap').addClass("xc-disabled");
            }
        });

        this._$modal.on('click', '.primaryKeyList .xi-cancel', function() {
            const $key: JQuery = $(this).closest(".primaryKeyList");
            let oldVal = $key.find(".primaryKeyInput").val();
            if (oldVal != "") {
                $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                self._toggleColumnKey(oldVal.substr(1), false);
            }
            $key.remove();
        });

        let $list = $('#createPublishTableModal .IMDKey .primaryKeyList');
        this._activateDropDown($list, '#createPublishTableModal .IMDKey .primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $('#createPublishTableModal .IMDKey .primaryKeyList').eq(0).find('.primaryKeyInput');
                let oldVal: string = $primaryKey.val();
                if (oldVal != "") {
                    $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                    self._toggleColumnKey(oldVal.substr(1), false);
                }
                $primaryKey.val("$" + $li.text());
                $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
                let index = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyInput').index($primaryKey);
                self._currentKeys[index] = $li.data("value");
                let colName: string = $li.text();
                self._toggleColumnKey(colName, true);
            }
        });
        expList.setupListeners();

        this._$modal.find(".primaryKeyList").on('blur', '.primaryKeyInput', function() {
            let $input = $(this);
            let index = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyInput').index($input);
            let oldVal = self._currentKeys[index];
            if (oldVal != $input.val()) {
                $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                self._currentKeys[index] = $input.val();
                if (oldVal.charAt(0) === '$') {
                    oldVal = oldVal.substr(1);
                }
                self._toggleColumnKey(oldVal, false);
            }
        });

        $('#publishTableModalColumns .selectAllWrap').click(function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("active")) {
                return;
            }
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$publishColList.find('.checked').not(".active").removeClass("checked");
            } else {
                $box.addClass("checked");
                self._$publishColList.find('.col').addClass("checked");
                self._$publishColList.find('.checkbox').addClass("checked");
            }
        });

        $('#publishTableModalColumns .columnsWrap').on("click", ".col", function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            let $col: JQuery = $(this);
            event.stopPropagation();
            if ($box.hasClass("active")) {
                return;
            }
            if ($col.hasClass("checked")) {
                $col.removeClass("checked");
                $box.removeClass("checked");
                self._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
            } else {
                $col.addClass("checked");
                $box.addClass("checked");
                if (self._$publishColList.find('.col .checked').length == self._$publishColList.find('.checkbox').length) {
                    self._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
                }
            }
        });

    }

    private _closeModal(): void {
        this._modalHelper.clear();
        this._reset();
    }

    private _reset(): void {
        this._columns = [];
        this._currentKeys = [""]
        let $list: JQuery = $('#createPublishTableModal .IMDKey .primaryKeyList .primaryKeyColumns');
        $list.empty();
        $('#createPublishTableModal .IMDKey .primaryKeyList').not(':first').remove();
        $('#createPublishTableModal .IMDKey .primaryKeyInput').val("");
        this._$nameInput.val("");
    }

    private _submitForm(): void {
        let name: string = this._$nameInput.val().trim().toUpperCase();
        if (!xcHelper.isValidPublishedTableName(name)) {
            StatusBox.show(ErrTStr.InvalidPublishedTableName, this._$nameInput);
            return;
        }
        let keys: string[] = [];
        if (!this._$modal.find('.keyOptions .disableKey .checkbox').hasClass('checked')) {
            let $inputs: JQuery = this._$primaryKeys.find(".primaryKeyInput");
            for (let i = 0; i < $inputs.length; i++) {
                let val: string = $inputs.eq(i).val();
                if (val != "") {
                    keys.push(val);
                }
            }
        }
        let $cols = this._$publishColList.find(".col.checked");
        let columns: ProgCol[] = [];
        for (let i = 0; i < $cols.length; i++) {
            columns.push(this._columns[$cols.eq(i).data("colnum") - 1]);
        }
        if (!columns.length) {
            StatusBox.show(ErrTStr.NoColumns, this._$publishColList);
            return;
        }
        const $bg: JQuery = $("#initialLoadScreen");
        $bg.show();
        PTblManager.Instance.createTableFromView(keys, columns, this._tableName, name)
        .then(() => {
            this._closeModal();
            $bg.hide();
        })
        .fail((err) => {
            StatusBox.show(err, this._$modal.find(".confirm"));
            $bg.hide();
            return;
        })
    }
}
