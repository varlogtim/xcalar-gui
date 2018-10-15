class DFUploadModal {
    private static _instance: DFUploadModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _file: File;
    private _modalHelper: ModalHelper;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
        this._setupDragDrop();
    }

    public show(): void {
        this._modalHelper.setup();
    }

    private _getModal(): JQuery {
        return $("#dfUploadModal");
    }

    private _getDestPathInput(): JQuery {
        return this._getModal().find(".dest .path");
    }

    private _getBrowseButton(): JQuery {
        return this._getModal().find(".source input.browse");
    }

    private _close() {
        const $modal: JQuery = this._getModal();
        this._modalHelper.clear();
        this._file = null;
        $modal.find("input").val("");
        $modal.find(".confirm").addClass("btn-disabled");
        xcTooltip.enable($modal.find(".buttonTooltipWrap"));
    }

    private _validate(): {tab: DagTabShared} {
        const $pathInput: JQuery = this._getDestPathInput();
        const path: string = $pathInput.val().trim();
        const splits: string[] = path.split("/");
        const shortName: string = splits[splits.length - 1];
        const isValid: boolean = xcHelper.validate([{
            $ele: $pathInput
        }, {
            $ele: $pathInput,
            error: DFTStr.NoEmptyDestName,
            check: () => {
                return !shortName;
            }
        }, {
            $ele: $pathInput,
            error: ErrTStr.DFNameIllegal,
            check: () => {
                return !xcHelper.checkNamePattern(PatternCategory.Dataflow,
                    PatternAction.Check, shortName);
            }
        }, {
            $ele: $pathInput,
            error: DFTStr.DupDataflowName,
            check: () => {
                return !DagList.Instance.isUniqueName(path);
            }
        }])

        if (!isValid) {
            return null;
        }
        const uploadTab: DagTabShared = new DagTabShared(path);
        return {
            tab: uploadTab
        };
    }

    private _submitForm(): XDPromise<void> {
        const res: {tab: DagTabShared} = this._validate();
        if (res == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $confirmBtn: JQuery = this._getModal().find(".confirm");
        xcHelper.disableSubmit($confirmBtn);

        const tab: DagTabShared = res.tab;
        const file: File = this._file;
        let timer: number = null;

        this._checkFileSize(file)
        .then(() => {
            timer = window.setTimeout(() => {
                this._lock();
            }, 1000);
            return this._readFile(file);
        })
        .then((fileContent) => {
            return tab.upload(fileContent);
        })
        .then(() => {
            xcHelper.showSuccess(SuccessTStr.Upload);
            this._close();
            DagList.Instance.refresh();
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            clearTimeout(timer);
            this._unlock();
            xcHelper.enableSubmit($confirmBtn);
        });

        return deferred.promise();
    }

    private _lock() {
        this._getModal().addClass("locked");
    }

    private _unlock() {
        this._getModal().removeClass("locked");
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookPanel.ts
    private _checkFileSize(file: File): XDPromise<void> {
        if (file == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const size: number = file.size;
        const sizeLimit: number = 5 * MB; // 5MB
        if (size <= sizeLimit) {
            deferred.resolve();
        } else {
            const msg: string = xcHelper.replaceMsg(ErrWRepTStr.LargeFileUpload, {
                size: xcHelper.sizeTranslator(sizeLimit)
            });
            Alert.show({
                title: null,
                msg: msg,
                onConfirm: deferred.resolve,
                onCancel: function() {
                    deferred.reject(null, null, true);
                }
            });
        }
        return  deferred.promise();
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookManager.ts
    private _readFile(file: File): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        const reader: FileReader = new FileReader();

        reader.onload = function(event: any) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event: any) {
            const error: DOMException = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }


    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });
        
        // click dest browse button
        $modal.find(".dest .browse").click(() => {
            this._browseDestPath();
        });

        // click source's browse button
        const $browseBtn: JQuery = this._getBrowseButton();
        $modal.find(".source button.browse").click((event) => {
            $(event.currentTarget).blur();
            $browseBtn.click();
            return false;
        });

        $modal.find(".source .path").mousedown(() => {
            $browseBtn.click();
            return false;
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        $browseBtn.change((event) => {
            const path: string = $(event.currentTarget).val();
            if (path === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            this._changeFilePath(path);
        });
    }

    private _changeFilePath(path: string, fileInfo?: File) {
        path = path.replace(/C:\\fakepath\\/i, '');
        this._file = fileInfo || (<any>this._getBrowseButton()[0]).files[0];
        let fileName: string = path.substring(0, path.indexOf("."))
        .toLowerCase().replace(/ /g, "");

        const $modal: JQuery = this._getModal();
        const $sourcePathInput: JQuery = $modal.find(".source .path");
        $sourcePathInput.val(path);
        this._setDestPath(fileName);
        const $confirmBtn: JQuery = $modal.find(".confirm");
        const $tooltipWrap: JQuery = $modal.find(".buttonTooltipWrap");
        if (path.endsWith(".tar.gz")) {
            $confirmBtn.removeClass("btn-disabled");
            xcTooltip.disable($tooltipWrap);
        } else {
            $confirmBtn.addClass("btn-disabled");
            xcTooltip.enable($tooltipWrap);
            StatusBox.show(ErrTStr.RetinaFormat, $sourcePathInput, false, {
                side: "bottom"
            });
        }
    }

    private _setDestPath(name: string): void {
        name = <string>xcHelper.checkNamePattern(PatternCategory.Dataflow,
            PatternAction.Fix, name);
        const path: string = this._getUniquePath(name);
        this._getDestPathInput().val(path);
    }

    private _getUniquePath(name: string): string {
        const userName: string = XcUser.CurrentUser.getName().replace(/\//g, "_");
        let path: string = `${userName}/${name}`;
        let cnt = 0;
        while (!DagList.Instance.isUniqueName(path)) {
            path = `${userName}/${name}(${++cnt})`;
        }
        return path;
    }

    private _browseDestPath(): void {
        let rootPath: string = DagTabShared.PATH;
        rootPath = rootPath.substring(0, rootPath.length - 1); // /Shared/
        let fileLists: {path: string, id: string}[] = DagList.Instance.list();
        fileLists = fileLists.filter((fileObj) => {
            if (fileObj.path.startsWith(rootPath)) {
                fileObj.path = fileObj.path.substring(rootPath.length);
                return true;
            }
            return false;
        });
        // lock modal
        this._lock();
        const defaultPath: string = this._getDestPathInput().val().trim();
        const options = {
            rootPath: rootPath,
            defaultPath: defaultPath,
            onConfirm: (path, name) => {
                if (path) {
                    path = path + "/" + name;
                } else {
                    // when in the root
                    path = name;
                }
                this._getDestPathInput().val(path);
            },
            onClose: () => {
                // unlock modal
                this._unlock();
            }
        };
        DFBrowserModal.Instance.show(fileLists, options);
    }

    private _setupDragDrop(): void {
        new DragDropUploader({
            $container: this._getModal(),
            text: "Drop a dataflow file to upload",
            onDrop: (file) => {
                this._changeFilePath(file.name, file);
            },
            onError: (error) => {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }
}