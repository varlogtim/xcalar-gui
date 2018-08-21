enum NodeDefType {
    element, text
}

/**
 * !!! Should only be called by OpPanelTemplateManager !!!
 * Factory to ceate virtual DOM definition from template.
 */
class OpPanelNodeDefFactory {

    public static createNodeDef(
        domNodeList: NodeDefDOMNodeList
    ): NodeDef[] {
        try {
            if (domNodeList == null) {
                return [];
            }

            const nodeDefList: NodeDef[] = [];
            for (const domNode of domNodeList) {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const nodeDef = this._createElementNodeDef(domNode as NodeDefDOMElement);
                    if (nodeDef != null) {
                        nodeDefList.push(nodeDef);
                    }
                } else if (domNode.nodeType === Node.TEXT_NODE) {
                    const nodeDef = this._createTextNodeDef(domNode as NodeDefDOMElement);
                    if (nodeDef != null) {
                        nodeDefList.push(nodeDef);
                    }
                } else {
                    console.error(`${domNode.nodeName} is skipped`);
                }
            }
            return nodeDefList;    
        } catch(e) {
            console.error('NodeDefFactory.createNodeDef', e);
            return [];
        }
    }

    private static _createTextNodeDef(domNode: NodeDefDOMElement) {
        try {
            if (domNode == null) {
                return null;
            }
            const textContent = domNode.textContent || '';
            if (textContent.length === 0) return null;
        
            const nodeDef: NodeDefText = { type: NodeDefType.text, text: []};
            const sep = '{{';
            for (const section of textContent.split(sep)) {
                if (section.length === 0) {
                    continue;
                }
                const closePos = section.indexOf('}}');
                if (closePos >= 0) {
                    const phName = section.substring(0, closePos).trim();
                    const text = section.substring(closePos + 2);
                    if (phName.length > 0) {
                        nodeDef.text.push( {name: phName} );
                    }
                    if (text != null && text.length > 0) {
                        nodeDef.text.push(this._replaceSpecialChar(text));
                    }
                } else {
                    nodeDef.text.push(this._replaceSpecialChar(section));
                }
            }
            return nodeDef;
        } catch(e) {
            console.error('NodeDefFactory._createTextNodeDef', e);
            return null;
        }
    }

    private static _replaceSpecialChar(text) {
        return text.replace('\\{', '{').replace('\\}', '}');
    }

    private static _createElementNodeDef(domNode: NodeDefDOMElement) {
        try {
            if (domNode == null) {
                return null;
            }
    
            const nodeDef: NodeDefElement = { type: NodeDefType.element, tag: domNode.nodeName };
        
            const attrNames = this._getAttributeNames(domNode);
            if (attrNames.length > 0) {
                nodeDef.attr = {};
                nodeDef.event = {};
                for (const attrName of attrNames) {
                    const attrValue = domNode.getAttribute(attrName);
                    if (attrName === 'class') {
                        const classString = attrValue.trim();
                        if (classString.length > 0) {
                            nodeDef.class = this._createClassDef(classString);
                        }
                    } else if (attrName === 'style') {
                        const styleString = attrValue.trim();
                        if (styleString.length > 0) {
                            nodeDef.style = styleString;
                        }
                    } else if (this._isEventHandler(attrName)) {
                        nodeDef.event[this._getEventName(attrName)] = attrValue.trim();
                    } else {
                        nodeDef.attr[attrName] = this._isPlaceholder(attrValue)
                            ? { name: this._getPlaceholderName(attrValue) }
                            : attrValue;
                    }
                }
            }
        
            const childNodeRaw = domNode.childNodes;
            const childNodes: NodeDefDOMNodeList = new Array(childNodeRaw.length);
            for (let i = 0; i < childNodeRaw.length; i ++) {
                childNodes[i] = childNodeRaw[i];
            }
            nodeDef.children = this.createNodeDef(childNodes);
        
            return nodeDef;
        } catch(e) {
            console.error('NodeDefFactory._createElementNodeDef', e);
            return null;
        }
    }

    private static _createClassDef(
        classString: string
    ): (string | NodeDefPlaceholder)[] {
        try {
            const classDef: (string | NodeDefPlaceholder)[] = [];
    
            const classList = classString.split(' ').filter( (word) => (word.length > 0) );
            for (const cls of classList) {
                if (this._isPlaceholder(cls)) {
                    classDef.push({ name: this._getPlaceholderName(cls) });
                } else {
                    classDef.push(cls);
                }
            }
            return classDef;
        } catch(e) {
            console.error('NodeDefFactory._createClassDef', e);
            return [];
        }
    }
    
    public static _getAttributeNames(
        domNode: NodeDefDOMElement
    ): string[] {
        if (domNode.getAttributeNames != null) {
            return domNode.getAttributeNames();
        } else {
            const attrs = domNode.attributes;
            const len = attrs.length;
            const names = new Array(len);
            for (let i = 0; i < len; i ++) {
                names[i] = attrs[i].name;
            }
            return names;
        }
    }
    
    private static _isPlaceholder(text: string): boolean {
        return text.indexOf('{{') === 0 && text.indexOf('}}') == text.length - 2;
    }
    
    private static _getPlaceholderName(text: string): string {
        return text.substring(2, text.length - 2);
    }
    
    private static _getEventName(attrName: string): string {
        return attrName.substring(1, attrName.length - 1);
    }
    
    private static _isEventHandler(attrName: string): boolean {
        return attrName[0] === '(' && attrName[attrName.length - 1] === ')';
    }
}