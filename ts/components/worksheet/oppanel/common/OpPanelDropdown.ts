/**
 * Dropdown component
 * @description
 * Support building menu items on-the-fly(via a JS array)
 */
class OpPanelDropdown {
    private _$elem: JQuery = null;
    private _repo: OpPanelDataRepo;
    private _inputId: string = '';
    private _ulId: string = '';
    private _cssSelected = '';
    private static _fieldNameValue = 'xcval';
    private _setTitleFunc: ($elemTitle: JQuery, text: string) => void = null;

    /**
     * Class Constructuor
     * @param props.container JQuery object of the dropdown container
     * @param props.inputXcId The value of data-xcid html attribute of the input/div, which shows the selected menu text
     * @param props.ulXcId The data-xcid value of the UL tag
     * @param props.cssSelected OPTIONAL. CSS class name which will be set on the selected menu item
     * @param props.setTitleFunc OPTIONAL. The function to set the input/div text
     */
    constructor(props: {
        container: JQuery,
        inputXcId: string,
        ulXcId: string,
        cssSelected?: string,
        setTitleFunc?: ($elemTitle: JQuery, text: string) => void
    }) {
        const {container, inputXcId, ulXcId, cssSelected = 'selected', setTitleFunc} = props;
        this._repo = new OpPanelDataRepo();
        this._$elem = container;
        this._inputId = inputXcId;
        this._ulId = ulXcId;
        this._cssSelected = cssSelected;
        if (setTitleFunc != null) {
            this._setTitleFunc = setTitleFunc;
        } else {
            this._setTitleFunc = OpPanelDropdown._defaultSetTitleFunc;
        }
    }

    /**
     * Update the UI according to the given data model
     * @param props.menuItems The menu items to show in the dropdown
     * @param props.onSelectCallback Callback function of menu item selecting
     * @description
     * Performance: The UI update will be skipped, if the data model doesn't change from the previous update
     */
    public updateUI(props: {
        menuItems?: OpPanelDropdownMenuItem[],
        onSelectCallback?: OpPanelDropdownMenuSelectCallback
    }): void {
        if (this._repo.push(props)) {
            // console.log(`no change: ${props.menuItems[0].text}`);
            return;
        }

        const { menuItems = [], onSelectCallback = null } = (props || {});
        // Create <li> elements
        const $input = BaseOpPanel.findXCElement(this._$elem, this._inputId);
        const $liList = this._createMenuItems({
            $input: $input,
            menuItems: menuItems
        });

        // Add menu items to DOM
        const $ul = BaseOpPanel.findXCElement(this._$elem, this._ulId);
        $ul.empty();
        if ($liList.length > 0) {
            $ul.append($liList);
        }

        // Setup event listener
        this._$elem.off();
        const menuList = new MenuHelper( this._$elem, {
            onSelect: this._onMenuItemSelect({
                onSelectCallback: onSelectCallback
            })
        });
        menuList.setupListeners();
    }

    private static _defaultSetTitleFunc($elemTitle: JQuery, text: string) {
        $elemTitle.val(text);
    }

    private _onMenuItemSelect({onSelectCallback}: {
        onSelectCallback?: OpPanelDropdownMenuSelectCallback
    }): ($li: JQuery) => void {
        return ($li: JQuery) => {
            if (onSelectCallback != null) {
                onSelectCallback($li.data(OpPanelDropdown._fieldNameValue));
            }
        };
    }

    private _createMenuItems({$input, menuItems}: {
        $input: JQuery,
        menuItems: OpPanelDropdownMenuItem[]    
    }): JQuery[] {
        return menuItems.map( (menuInfo) => {
            // Create HTML element
            const $menuItem = menuInfo.isNotMenuItem
                ? BaseOpPanel.createElement('div')
                : BaseOpPanel.createElement('li')
            // Set data-xcval attribute
            if (menuInfo.value != null) {
                $menuItem.data(OpPanelDropdown._fieldNameValue, menuInfo.value);
            }
            // Set text
            $menuItem.text(menuInfo.text);
            // Set CSS classes
            if (menuInfo.cssClass != null) {
                $menuItem.addClass(menuInfo.cssClass.join(' '));
            }
            // Set input box value & select menu item
            if (menuInfo.isSelected) {
                this._setTitleFunc($input, menuInfo.text);
                $menuItem.addClass(this._cssSelected);
            }
            return $menuItem;
        });
    }
}