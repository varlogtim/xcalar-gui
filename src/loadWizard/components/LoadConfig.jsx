import React from 'react';
import crypto from 'crypto';
import Path from 'path';
import SourceData from './SourceData';
import { BrowseDataSourceModal } from './BrowseDataSource';
import DiscoverSchemas from './DiscoverSchemas';
import CreateTables from './CreateTables';
import * as S3Service from '../services/S3Service';
import * as SchemaService from '../services/SchemaService';
import * as SetUtils from '../utils/SetUtils';

const { Alert } = global;

/**
 * UI texts for this component
 */
const Texts = {
    stepNameSourceData: "Select Data Source",
    stepNameFilterData: "Browse Data Source",
    stepNameSchemaDiscover: "Discover Schemas",
    stepNameCreateTables: "Create Tables"
};

/**
 * Step enum/name definition
 */
const stepEnum = {
    SourceData: 'SourceData',
    FilterData: 'FilterData',
    SchemaDiscovery: 'SchemaDiscovery',
    CreateTables: 'CreateTables'
}

const stepNames = new Map();
stepNames.set(stepEnum.SourceData, Texts.stepNameSourceData);
stepNames.set(stepEnum.FilterData, Texts.stepNameFilterData);
stepNames.set(stepEnum.SchemaDiscovery, Texts.stepNameSchemaDiscover);
stepNames.set(stepEnum.CreateTables, Texts.stepNameCreateTables);

function deleteEntry(setOrMap, key) {
    setOrMap.delete(key);
    return setOrMap;
}

function deleteEntries(setOrMap, keySet) {
    for (const key of keySet) {
        setOrMap.delete(key);
    }
    return setOrMap;
}

class LoadConfig extends React.Component {
    constructor(props) {
        super(props);
        // Initialize state
        const {
            onStepChange
        } = props;
        const defaultBucket = '/';
        const defaultHomePath = '';
        const defaultFileType = SchemaService.FileType.CSV;

        this.state = {
            currentStep: stepEnum.SourceData,

            // SourceData
            bucket: defaultBucket,
            homePath: defaultHomePath,
            fileType: defaultFileType,

            // BrowseDataSource
            browseShow: false,
            selectedFileDir: new Array(),

            // DiscoverSchemas
            discoverSchemaPolicy: SchemaService.MergePolicy.SUPERSET, // XXX TODO: UI
            discoverIsLoading: false,
            discoverFiles: new Map(), // Map<fileId, { fileId, fullPath, direcotry ... }
            discoverFileSchemas: new Map(),// Map<fileId, { name: schemaName, columns: [] }
            discoverCancelBatch: null, // () => {} Dynamic cancel function set by discoverAll
            discoverInProgressFileIds: new Set(), // Set<fileId>
            discoverFailedFiles: new Map(), // Map<fileId, errMsg>
            inputSerialization: SchemaService.defaultInputSerialization.get(defaultFileType),

            // CreateTable
            tableToCreate: new Map(), // Map<schemaName, tableName>, store a table name for user to update
            createInProgress: new Map(), // Map<schemaName, tableName>
            createFailed: new Map(), // Map<schemaName, errorMsg>
            createTables: new Map() // Map<schemaName, tableName>
        };

        // Hash the config for detecting config change
        this._initConfigHash = this._getConfigHash({
            selectedFileDir: this.state.selectedFileDir
        });

        // Event notification
        this._eventOnStepChange = onStepChange;

        // Instance members
        this._schemaWorker = new SchemaService.DiscoverWorker({
            mergePolicy: this.state.discoverSchemaPolicy,
            inputSerialization: { ...this.state.inputSerialization }
        });
    }

    async _createTableFromSchema(schemaName, tableName) {
        if (!tableName) {
            console.error('Table name empty');
            return;
        }

        // Find all the files in the schema <schemaName>
        const schemaInfo = {
            files: [],
            columns: null
        };
        for (const [fileId, { name: sName, columns }] of this.state.discoverFileSchemas) {
            if (sName === schemaName) {
                const fileInfo = this.state.discoverFiles.get(fileId);
                if (fileInfo != null) {
                    schemaInfo.files.push({
                        path: fileInfo.fullPath,
                        size: fileInfo.sizeInBytes
                    });
                    schemaInfo.columns = columns;
                };
            }
        }
        if (schemaInfo.columns == null) {
            console.error('Non-existing Schema: ', schemaName);
            return;
        }

        // State: cleanup and +loading
        this.setState({
            createInProgress: this.state.createInProgress.set(schemaName, tableName),
            createFailed: deleteEntry(this.state.createFailed, schemaName),
            createTables: deleteEntry(this.state.createTables, schemaName),
            tableToCreate: deleteEntry(this.state.tableToCreate, schemaName)
        });

        try {
            WorkbookManager.switchToXDInternalSession();
            // {table, complementTable}
            const res = await S3Service.createTableFromSchema(
                tableName,
                schemaInfo.files,
                schemaInfo.columns,
                this.state.inputSerialization
            );
            // State: -loading + created
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                createTables: this.state.createTables.set(schemaName, res)
            });
        } catch(e) {
            // State: -loading + failed
            let error = e.message || e.error || e;
            error = xcHelper.parseError(error);
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                createFailed: this.state.createFailed.set(schemaName, error),
            });
        } finally {
            WorkbookManager.resetXDInternalSession();
            // Fallback: -loading
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
            });
        }

    }

    // XXX this is copied from DSConfig
    _getNameFromPath(path) {
        if (path.charAt(path.length - 1) === "/") {
            // remove the last /
            path = path.substring(0, path.length - 1);
        }

        let paths = path.split("/");
        let splitLen = paths.length;
        let name = paths[splitLen - 1];
        name = name.toUpperCase();
        // strip the suffix dot part and only keep a-zA-Z0-9.
        let category = PatternCategory.PTblFix;
        name = xcHelper.checkNamePattern(category,
            PatternAction.Fix, name.split(".")[0], "_");

        if (!xcStringHelper.isStartWithLetter(name) && splitLen > 1) {
            // when starts with number
            let folderName = paths[splitLen - 2];
            folderName = folderName.toUpperCase();
            let prefix = xcHelper.checkNamePattern(category,
                PatternAction.Fix, folderName, "_");
            if (xcStringHelper.isStartWithLetter(prefix)) {
                name = prefix + name;
            }
        }

        if (!xcStringHelper.isStartWithLetter(name)) {
            // if still starts with number
            name = "source" + name;
        }
        name = name.toUpperCase();
        return PTblManager.Instance.getUniqName(name);
    }

    _convertSchemaMergeResult(schemas) {
        const fileSchemaMap = new Map();
        for (const [schemaName, { path, columns }] of schemas) {
            const schemaInfo = {
                name: schemaName,
                columns: columns.map((c) => ({...c}))
            };
            for (const filePath of path) {
                fileSchemaMap.set(filePath, schemaInfo);
            }
        }
        return fileSchemaMap;
    }

    async _discoverFileSchema(fileId) {
        const file = this.state.discoverFiles.get(fileId);
        if (file == null) {
            console.error('Discover unselected file:', fileId);
            return;
        }

        // State: +loading
        this.setState({
            discoverInProgressFileIds: this.state.discoverInProgressFileIds.add(fileId),
            discoverFailedFiles: deleteEntry(this.state.discoverFailedFiles, fileId)
        });

        try {
            await this._schemaWorker.discover([file.fullPath]);
            if (this._schemaWorker.getErrorFiles().has(fileId)) {
                // State: -loading +failed
                this.setState({
                    discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                    discoverFailedFiles: this.state.discoverFailedFiles.set(fileId, this._schemaWorker.getError(fileId) || 'Discover Failed')
                });
            } else {
                const fileSchemaMap = this._convertSchemaMergeResult(this._schemaWorker.getSchemas());
                // State: -loading +discovered
                this.setState({
                    discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                    discoverFileSchemas: fileSchemaMap
                });
            }
        } catch(e) {
            // State: -loading +failed
            this.setState({
                discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                discoverFailedFiles: this.state.discoverFailedFiles.set(fileId, e.message || e)
            });
        } finally {
            // Fallback: -loading
            this.setState({
                discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId)
            });
        }
    }

    async _discoverMultiFileSchema(fileIds) {
        const filePaths = new Array();
        for (const fileId of fileIds) {
            const file = this.state.discoverFiles.get(fileId);
            if (file == null) {
                console.error('Discover unselected file:', fileId);
                return;
            }
            filePaths.push(file.fullPath);
        }

        // State: +loading
        this.setState({
            discoverInProgressFileIds: SetUtils.union(this.state.discoverInProgressFileIds, new Set(fileIds)),
            discoverFailedFiles: deleteEntries(this.state.discoverFailedFiles, fileIds)
        });

        try {
            // Call service to discover files
            await this._schemaWorker.discover(filePaths);

            // Failed files
            const failedFileIds = SetUtils.intersection(this._schemaWorker.getErrorFiles(), fileIds);
            if (failedFileIds.size > 0) {
                // State: -loading +failed
                const { discoverFailedFiles, discoverInProgressFileIds } = this.state;
                for (const fileId of failedFileIds) {
                    discoverFailedFiles.set(fileId, this._schemaWorker.getError(fileId) || 'Discover Failed');
                }
                this.setState({
                    discoverInProgressFileIds: deleteEntries(discoverInProgressFileIds, failedFileIds),
                    discoverFailedFiles: discoverFailedFiles
                });
            }

            // Success files
            const successFileIds = SetUtils.diff(fileIds, failedFileIds);
            if (successFileIds.size > 0) {
                const fileSchemaMap = this._convertSchemaMergeResult(this._schemaWorker.getSchemas());
                // State: -loading +discovered
                this.setState({
                    discoverInProgressFileIds: deleteEntries(this.state.discoverInProgressFileIds, successFileIds),
                    discoverFileSchemas: fileSchemaMap
                });
            }
        } catch(e) {
            // State: -loading +failed
            const { discoverInProgressFileIds, discoverFailedFiles } = this.state;
            for (const fileId of fileIds) {
                discoverFailedFiles.set(fileId, e.message || e.error || e);
            }
            this.setState({
                discoverInProgressFileIds: deleteEntries(discoverInProgressFileIds, fileIds),
                discoverFailedFiles: discoverFailedFiles
            });
        } finally {
            // Fallback: -loading
            this.setState({
                discoverInProgressFileIds: deleteEntries(this.state.discoverInProgressFileIds, fileIds)
            });
        }
    }

    async _discoverAllFileSchemas() {
        if (this.state.discoverCancelBatch != null) {
            return;
        }

        let isCanceled = false;
        this.setState({
            discoverCancelBatch: () => {
                console.log('Cancel All');
                isCanceled = true;
            }
        });
        try {
            const stime = Date.now();
            const waitForTasks = async(tasks) => {
                while (tasks.length > 0) {
                    await tasks.pop();
                }
            }

            const {
                discoverFiles,
                discoverFileSchemas,
                discoverInProgressFileIds,
                discoverFailedFiles
            } = this.state;
            const batch = new Set();
            const batchSize = 128;
            const plevel = 16;
            const tasks = new Array();
            for (const [fileId] of discoverFiles.entries()) {
                if (isCanceled) {
                    break;
                }
                if (discoverFileSchemas.has(fileId) ||
                    discoverInProgressFileIds.has(fileId) ||
                    discoverFailedFiles.has(fileId)
                ) {
                    continue;
                }
                batch.add(fileId);
                if (batch.size >= batchSize) {
                    tasks.push(this._discoverMultiFileSchema(new Set(batch)));
                    batch.clear();
                    if (tasks.length >= plevel) {
                        await waitForTasks(tasks);
                    }
                }
            }
            if (batch.size > 0) {
                tasks.push(this._discoverMultiFileSchema(new Set(batch)));
                batch.clear();
                await waitForTasks(tasks);
            }
            const etime = Date.now();
            console.log(`DiscoverAll took ${Math.ceil((etime - stime)/100)/10} seconds`);
        } finally {
            this.setState({
                discoverCancelBatch: null
            });
        }
    }

    /**
     *
     * @param {*} fileSchemaMap Map<fileId, { name: schemaName, columns: [] }
     * @returns Map<schemaName, { path: [], columns: [] }>
     */
    _createSchemaFileMap(fileSchemaMap) {
        const schemaMap = new Map();
        for (const [fileId, { name: schemaName, columns }] of fileSchemaMap) {
            let schemaInfo = schemaMap.get(schemaName);
            if (schemaInfo == null) {
                schemaInfo = { path: [], columns: columns };
                schemaMap.set(schemaName, schemaInfo);
            }
            schemaInfo.path.push(fileId);
        }
        return schemaMap;
    }

    _getConfigHash({ selectedFileDir }) {
        const str = JSON.stringify([...selectedFileDir]);
        return crypto.createHash('md5').update(str).digest('hex');
    }

    _changeStep(newStep) {
        this.setState({
            currentStep: newStep
        });

        this._eventOnStepChange(newStep);
    }

    _isConfigChanged() {
        const { selectedFileDir } = this.state;
        const configHash = this._getConfigHash({
            selectedFileDir: selectedFileDir
        });
        return configHash !== this._initConfigHash;
    }

    _setBucket(bucket) {
        bucket = bucket.trim();
        const isBucketChanged = bucket === this.state.bucket;
        if (isBucketChanged) {
            if (this._isConfigChanged()) {
                // XXX TODO: unsaved changes, what should we do?
                console.log('Load config discarded');
            }
            this._resetBrowseResult();
        }
        this.setState({
            bucket: bucket
        });
    }

    _setPath(path) {
        path = path.trim();
        const isPathChanged = path === this.state.homePath;
        if (isPathChanged) {
            if (this._isConfigChanged()) {
                // XXX TODO: unsaved changes, what should we do?
                console.log('Load config discarded');
            }
            this._resetBrowseResult();
        }
        this.setState({
            homePath: path
        });
    }

    _resetBrowseResult(newFileType = null) {
        this.setState({
            selectedFileDir: new Array(), // Clear selected files/folders, XXX TODO: in case file type changes, we can preserve the folders
            discoverFiles: new Map(), // Clear flattern files
            discoverFileSchemas: new Map(), // Clear discovered schemas
            discoverInProgressFileIds: new Set(),
            discoverFailedFiles: new Map(),
            tableToCreate: new Map(),
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map() // Clear tables
        });
        let inputSerialization = this.state.inputSerialization;
        if (newFileType != null) {
            // Create the new input serialization according to the new fileType
            inputSerialization = SchemaService.defaultInputSerialization.get(newFileType);
            this.setState({
                inputSerialization: inputSerialization,
            });
        }
        return inputSerialization;
    }

    _setFileType(fileType) {
        if (fileType === this.state.fileType) {
            return false;
        }

        this.setState({
            fileType: fileType,
        });
        const inputSerialization = this._resetBrowseResult(fileType);
        this._schemaWorker.reset({inputSerialization: inputSerialization});
        return true;
    }

    _setSchemaPolicy(newPolicy) {
        const currentPolicy = this.state.discoverSchemaPolicy;
        if (currentPolicy === newPolicy) {
            return;
        }

        this.setState({
            discoverSchemaPolicy: newPolicy,
            discoverFileSchemas: new Map(), // Clear discovered schemas
            discoverInProgressFileIds: this._schemaWorker.getDiscoveredFiles(),
            discoverFailedFiles: new Map(),
            tableToCreate: new Map(),
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map() // Clear tables
        })

        // Merge schemas is cpu intensive, so update the UI first
        setTimeout(() => {
            try {
                const { discoverFiles } = this.state;
                this._schemaWorker.reset({ mergePolicy: newPolicy });
                this._schemaWorker.merge();
                // Successful files
                const fileSchemaMap = this._convertSchemaMergeResult(this._schemaWorker.getSchemas());
                // Failed files
                const errorDetails = this._schemaWorker.getErrors();
                const failedFiles = new Map(
                    [...SetUtils.intersection(this._schemaWorker.getErrorFiles(), discoverFiles)]
                        .map((fileId) => [fileId, errorDetails.get(fileId)])
                );
                this.setState({
                    discoverFileSchemas: fileSchemaMap,
                    discoverFailedFiles: failedFiles
                });
            } catch(e) {
                this._alert({
                    title: 'Error',
                    message: 'Discover schemas failed'
                });
                console.error(e);
            } finally {
                this.setState({
                    discoverInProgressFileIds: new Set()
                })
            }
        }, 0);
    }

    _setInputSerialization(newOption) {
        this.setState({
            inputSerialization: newOption,
            discoverFileSchemas: new Map(),
            discoverInProgressFileIds: new Set(),
            discoverFailedFiles: new Map(),
            tableToCreate: new Map(),
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map()
        });
        this._schemaWorker.reset({ inputSerialization: newOption });
    }

    _browseClose(selectedFileDir = null) {
        if (selectedFileDir == null) {
            this.setState({
                browseShow: false
            });
        } else {
            this.setState({
                browseShow: false,
                selectedFileDir: selectedFileDir
            });
        }
    }

    _browseOpen() {
        this.setState({
            browseShow: true
        });
    }

    async _flattenSelectedFiles(selectedFileDir) {
        try {
            this.setState({
                discoverIsLoading: true
            });
            const fileNamePattern = SchemaService.FileTypeNamePattern.get(this.state.fileType);
            const discoverFiles = await S3Service.flattenFileDir(selectedFileDir, fileNamePattern);

            // Sync discoverFileSchemas, discoverInProgressFileIds, discoverFailedFiles
            const removedFileIds = SetUtils.diff(this.state.discoverFiles.keys(), discoverFiles.keys());
            const discoverFileSchemas = this.state.discoverFileSchemas;
            const discoverInProgressFileIds = this.state.discoverInProgressFileIds;
            const discoverFailedFiles = this.state.discoverFailedFiles;
            for (const fileId of removedFileIds) {
                discoverFileSchemas.delete(fileId);
                discoverInProgressFileIds.delete(fileId);
                discoverFailedFiles.delete(fileId);
            }

            // Update state
            this.setState({
                discoverFiles: discoverFiles,
                discoverFileSchemas: discoverFileSchemas,
                discoverInProgressFileIds: discoverInProgressFileIds,
                discoverFailedFiles: discoverFailedFiles
            });
        } catch(e) {
            this._alert({
                title: 'Error',
                message: `${e.message || e.error || e}`
            });
            console.error(e);
            throw e;
        } finally {
            this.setState({
                discoverIsLoading: false
            });
        }
    }

    _alert({ title, message }) {
        try {
            Alert.show({
                title: title,
                msg: message,
                isAlert: true
            });
        } catch(_) {
            // Ignore the error
        }
    };

    render() {
        const {
            bucket,
            homePath,
            fileType,
            currentStep,
            selectedFileDir, // Output of Browse
            discoverFiles, // Input of Discover
            discoverFileSchemas, // Output of Discover/Input of CreateTable
            browseShow,
            discoverIsLoading,
            discoverCancelBatch,
        } = this.state;
        // const screenName = stepNames.get(currentStep);
        const onClickDiscoverAll = discoverCancelBatch == null
            ? () => { this._discoverAllFileSchemas(); }
            : null;

        const showBrowse = browseShow;
        const showDiscover = currentStep === stepEnum.SchemaDiscovery;
        const showCreate = currentStep === stepEnum.CreateTables && discoverFileSchemas.size > 0;

        return (
            <div className="container cardContainer">
                {/* <div className="cardHeader">
                    <header className="title">{screenName}</header>
                </div> */}
                {/* start of card main */}
                <div className="cardMain">
                    <SourceData
                        bucket={bucket}
                        path = {homePath}
                        fileType={fileType}
                        onClickBrowse={() => { this._browseOpen(); }}
                        onBucketChange={(newBucket) => { this._setBucket(newBucket); }}
                        onPathChange={(newPath) => { this._setPath(newPath); }}
                        onFileTypeChange={(newType) => {
                            if (this._setFileType(newType)) {
                                if (currentStep === stepEnum.SchemaDiscovery || currentStep === stepEnum.CreateTables) {
                                    this._browseOpen();
                                }
                            }
                        }}
                    />
                    {
                        showBrowse ? <BrowseDataSourceModal
                            bucket={bucket}
                            homePath={homePath}
                            fileType={fileType}
                            selectedFileDir={selectedFileDir}
                            onCancel={() => { this._browseClose(); }}
                            onDone={(selectedFileDir) => {
                                try {
                                    this._browseClose(selectedFileDir);
                                    this._flattenSelectedFiles(selectedFileDir);
                                    this._changeStep(stepEnum.SchemaDiscovery);
                                } catch(_) {
                                    // Do nothing
                                }
                            }}
                        /> : null
                    }
                    {
                        showDiscover ? <DiscoverSchemas
                            inputSerialization={this.state.inputSerialization}
                            schemaPolicy={this.state.discoverSchemaPolicy}
                            isLoading={discoverIsLoading}
                            discoverFiles={[...discoverFiles.values()]}
                            fileSchemas={discoverFileSchemas}
                            inProgressFiles={this.state.discoverInProgressFileIds}
                            failedFiles={this.state.discoverFailedFiles}
                            onDiscoverFile={(fileId) => { this._discoverFileSchema(fileId); }}
                            onClickDiscoverAll={onClickDiscoverAll}
                            onCancelDiscoverAll={discoverCancelBatch}
                            onInputSerialChange={(newConfig) => { this._setInputSerialization(newConfig); }}
                            onSchemaPolicyChange={(newPolicy) => { this._setSchemaPolicy(newPolicy); }}
                            onNextScreen = {() => { this._changeStep(stepEnum.CreateTables); }}
                        >
                            <SectionSeparate />
                            <SectionTitle>{Texts.stepNameSchemaDiscover}</SectionTitle>
                        </DiscoverSchemas> : null
                    }
                    {(() => {
                        if (!showCreate) {
                            return null;
                        }
                        const schemaFileMap = this._createSchemaFileMap(this.state.discoverFileSchemas);
                        schemaFileMap.forEach(({path}, schemaName) => {
                            if (!this.state.tableToCreate.has(schemaName)) {
                                const defaultTableName = this._getNameFromPath(path[0]);
                                this.state.tableToCreate.set(schemaName, defaultTableName);
                            }
                        });
                        return (
                            <CreateTables
                                schemas={schemaFileMap}
                                fileMetas={this.state.discoverFiles}
                                schemasInProgress={this.state.createInProgress}
                                schemasFailed={this.state.createFailed}
                                tablesInInput={this.state.tableToCreate}
                                tables={this.state.createTables}
                                onTableNameChange={(schemaName, newTableName) => {
                                    this.state.tableToCreate.set(schemaName, newTableName);
                                    this.setState({tableToCreate: this.state.tableToCreate});
                                }}
                                onClickCreateTable={(schemaName, tableName) => { this._createTableFromSchema(schemaName, tableName); }}
                                onPrevScreen = {() => { this._changeStep(stepEnum.SchemaDiscovery); }}
                            >
                                <SectionSeparate />
                                <SectionTitle>{Texts.stepNameCreateTables}</SectionTitle>
                            </CreateTables>
                        );
                    })()}
                </div>

                {/* end of card main */}
            </div>
        );
    }
}

function SectionSeparate() {
    return <div className="sep"></div>
}

function SectionTitle({children}) {
    return <div className="sectionTitle">{children}</div>
}

export { LoadConfig, stepEnum };