import Path from 'path';
import React from "react";
import BucketChart from './BucketChart';
import FileListTable from './FileListTable'
import NavButtons from '../NavButtons'
import SelectedFilesArea from "./SelectedFilesArea"
import * as Modal from './Modal'
import * as SchemaService from '../../services/SchemaService'
import * as S3Service from '../../services/S3Service'

const Texts = {
    title: "Browse Data Source",
    loading: "Loading ...",
    navButtonLeft: 'Cancel',
    navButtonRight: 'Done'
};

function getSelectedIdsForCurrentView(fileMapViewing, selectedFiles) {
    const validIds = new Set(fileMapViewing.keys());
    if (validIds.size === 0) {
        return new Set();
    }

    const selectedIds = new Set();
    for (const { fileId } of selectedFiles) {
        if (validIds.has(fileId)) {
            selectedIds.add(fileId);
            if (validIds.size <= selectedIds.size) {
                break;
            }
        }
    }
    return selectedIds;
}

/**
 * Props:
 *          bucket, // string
            homePath, // string
            fileType, // SchemaService.FileType
            selectedFileDir, // Array<FileObject>
            onDone, // (Array<FileObject>) => void
            onCancel,

 */
class BrowseDataSource extends React.Component {
    constructor(props) {
        super(props);

        const { bucket, homePath, selectedFileDir } = props;
        this.state = {
            isLoading: true,
            path: Path.join(bucket, homePath),
            fileMapViewing: new Map(),
            selectedFileDir: selectedFileDir.map((v) => ({...v}))
        }
    }

    async componentDidMount() {
        // browsePath
        const success = await this._browsePath(this.state.path, this.props.fileType);
        if (!success) {
            this.props.onCancel();
        }
    }

    async _browsePath(newFullPath, fileType) {
        try {
            this.setState({
                isLoading: true
            });

            const fileTypeFilter = SchemaService.FileTypeFilter.get(fileType);
            const fileMap = await S3Service.listFiles(Path.join(newFullPath, '/'), ({ directory, type}) => {
                return directory || fileTypeFilter({ type: type });
            });
            this.setState({
                path: newFullPath,
                fileMapViewing: fileMap,
                isLoading: false
            });
            return true;
        } catch(e) {
            Alert.show({
                title: 'Browse path failed',
                msg: `${e.message || e.log || e.error || e}`,
                isAlert: true
            });
            console.error(e);
            return false;
        }
    }

    _selectFiles(fileIds) {
        const { selectedFileDir, fileMapViewing } = this.state;
        const selectedFiles = [...selectedFileDir];
        for (const fileId of fileIds) {
            const fileObj = fileMapViewing.get(fileId);
            if (fileObj == null) {
                console.error(`Selected file(${fileId}) not exist`);
                continue;
            }
            selectedFiles.push({...fileObj});
        }
        this.setState({
            selectedFileDir: selectedFiles
        });
    }

    _deselectFiles(fileIds) {
        const selectedFile = this.state.selectedFileDir.filter((f) => (!fileIds.has(f.fileId)));
        this.setState({
            selectedFileDir: selectedFile
        });
    }

    render() {
        const {
            bucket, // string
            homePath, // string
            fileType, // SchemaService.FileType
            onDone, // (Array<FileObject>) => void
            onCancel,
        } = this.props;

        const {
            isLoading,
            path,
            fileMapViewing,
            selectedFileDir
        } = this.state;

        const rootFullPath = Path.join(bucket, homePath);
        const currentFullPath = path;

        return (
            <div className="browseDataSourceScreen">
                <div className="fileBrowserPath">
                    <i className="icon xi-upload-folder xc-icon-action upFolderIcon"
                        data-toggle="tooltip"
                        data-placement="top"
                        data-container="body"
                        data-original-title="Go to parent directory"
                        onClick={() => {
                            if (rootFullPath === currentFullPath) {
                                return;
                            }
                            const parentPath = Path.dirname(currentFullPath);
                            this._browsePath(parentPath, fileType);
                        }}>
                    </i>
                    <input value={currentFullPath} readOnly></input>
                </div>
                {isLoading ? <span>{Texts.loading}</span> : null}
                <div className="fileListTableArea">
                    <div className="fileListTableWrap">
                        <FileListTable
                            fileMap={fileMapViewing}
                            selectedIds={getSelectedIdsForCurrentView(fileMapViewing, selectedFileDir)}
                            onPathChange={(newFullPath) => { this._browsePath(newFullPath, fileType); }}
                            onSelect={(fileIds) => { this._selectFiles(fileIds); }}
                            onDeselect={(fileIds) => { this._deselectFiles(fileIds); }}
                        />
                    </div>
                    <SelectedFilesArea
                        fileMap={fileMapViewing}
                        selectedFileDir={selectedFileDir}
                        onSelect={(fileIds) => { this._selectFiles(fileIds); }}
                        onDeselect={(fileIds) => { this._deselectFiles(fileIds); }}
                    />
                </div>
                <NavButtons
                    left={{ label: Texts.navButtonLeft, onClick: () => { onCancel() } }}
                    right={{
                        label: Texts.navButtonRight,
                        onClick: () => { onDone(selectedFileDir) }
                    }}
                />
                {selectedFileDir.length > 0 ? <BucketChart fileList={selectedFileDir}/> : null}
            </div>
        );
    }
}

function BrowseDataSourceModal(browseProps) {
    return (
        <Modal.Dialog>
            <Modal.Header onClose={browseProps.onCancel}>{Texts.title}</Modal.Header>
            <Modal.Body><BrowseDataSource {...browseProps} /></Modal.Body>
        </Modal.Dialog>
    );
}

export { BrowseDataSource, BrowseDataSourceModal };