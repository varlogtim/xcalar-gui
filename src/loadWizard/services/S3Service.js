import * as crypto from 'crypto';
import * as Path from 'path';
import { XDSession } from './sdk/Session';
import * as DiscoverSchema from '../utils/discoverSchema';

// Import global functions. This should be modulized in the future
const {
    XcalarListFiles,
    ParseArgsT, DataSourceArgsT,
} = global;

const DS_PREFIX = 'LWDS';

// XXX TODO: Performance issue: result could be large
async function flattenFileDir(fileDirList) {
    const flattenFiles = new Map();

    for (const fod of fileDirList) {
        if (fod.directory) {
            const s3Files = await XcalarListFiles({
                "recursive": true,
                "targetName": "AWS Target",
                "path": fod.fullPath,
                "fileNamePattern": "*"
            });

            for (const file of s3Files.files) {
                const fullFilePath = Path.join(fod.fullPath, file.name);
                const isDirectory = file.attr.isDirectory ? true : false;

                flattenFiles.set(fullFilePath, {
                    fileId: fullFilePath,
                    fullPath: fullFilePath,
                    directory: isDirectory,
                    name: file.name,
                    sizeInBytes: file.attr.size,
                    type: isDirectory
                        ? 'directory'
                        : getFileExt(file.name)
                });
            }
        } else {
            flattenFiles.set(fod.fileId, {...fod});
        }
    }

    return flattenFiles;
}

async function listFiles(path, namePattern = '*') {
    const fileInfos = new Map();

    try {
        const s3Files = await XcalarListFiles({
            "recursive": false,
            "targetName": "AWS Target",
            "path": path,
            "fileNamePattern": namePattern
        });

        // XXX TODO: add comment about why slice(1)?
        for (const file of s3Files.files) {
            const fullFilePath = Path.join(path, file.name);
            const isDirectory = file.attr.isDirectory ? true : false;

            fileInfos.set(fullFilePath, {
                fileId: fullFilePath,
                fullPath: fullFilePath,
                directory: isDirectory,
                name: file.name,
                sizeInBytes: file.attr.size,
                type: isDirectory
                    ? 'directory'
                    : getFileExt(file.name)
            });
        }
    } catch(e) {
        console.error(e);
    }

    return fileInfos;
}

async function createKeyListTable({ bucketName='/xcfield/', namePattern='*', recursive=true }) {
    const finalTableName = getKeylistTableName(bucketName);
    const myDatasetName = DS_PREFIX + randomName();

    const session = new XDSession();
    await session.create();
    await session.activate();

    try {
        // Check if we already have a table
        const existingTable = await session.getPublishedTable({ name: finalTableName });
        if (existingTable != null) {
            return finalTableName;
        }

        // load key list to dataset
        const udfParserArgs = {
            's3_path': bucketName,
            's3_name_pattern': namePattern,
            's3_recursive': recursive
        }
        let parseArgs = new ParseArgsT()
        parseArgs.parserFnName = 'default:generateS3KeyList';
        parseArgs.parserArgJson = JSON.stringify(udfParserArgs);

        let dummySourceArgs = new DataSourceArgsT();
        dummySourceArgs.targetName = 'Default Shared Root';
        dummySourceArgs.path = '/etc/hosts';
        dummySourceArgs.fileNamePattern = '';
        dummySourceArgs.recursive = false;

        const keylistDataset = await session.createDataset({
            name: myDatasetName,
            sourceArgs: [dummySourceArgs],
            parseArgs: parseArgs
        });

        // Create published table from dataset
        const keylistTable = await keylistDataset.createPublishedTable(finalTableName);
        return keylistTable.getName();
    } catch(e) {
        console.error('ERROR: Creating published table: ', e);
    } finally {
        await session.destroy();
    }
}

async function getForensicsStats(bucketName, pathPrefix) {
    const fullPath = Path.join(bucketName, pathPrefix);
    const keyListTableName = getKeylistTableName(bucketName);
    const sql = `
        SELECT
            COUNT(*) as TOTAL_COUNT,
            MAX(LENGTH(path) - LENGTH(REPLACE(path, '/', ''))) AS MAX_DEPTH,
            MAX(CAST(size as int)) AS LARGEST_FILE_SIZE,
            MIN(CAST(size as int)) AS SMALLEST_FILE_SIZE,
            STDDEV(CAST(size as int)) AS STD_DEV,
            SUM(CASE WHEN path LIKE '%.csv' THEN 1 ELSE 0 END) AS CSV_COUNT,
            SUM(CASE WHEN path LIKE '%.json%' THEN 1 ELSE 0 END) AS JSON_COUNT,
            SUM(CASE WHEN path LIKE '%.parquet' THEN 1 ELSE 0 END) AS PARQUET_COUNT
        FROM ( SELECT * FROM ${keyListTableName} WHERE path LIKE '${fullPath}%')`;

    const session = new XDSession();
    const stats = {
        file: {
            count: 0,
            maxSize: 0,
            minSize: 0,
        },
        structure: {
            depth: 0
        },
        type: {
            csv: 0, json: 0, parquet: 0
        }
    }

    try {
        // Create temporary session
        await session.create();
        await session.activate();
        console.log(`Session for sql: ${session.sessionName}`);

        // execute sql
        const table = await session.executeSql(sql);
        console.log(`Sql result table: ${table.getName()}`);

        // fetch the result
        const cursor = table.createCursor();
        await cursor.open();
        const rows = await cursor.fetch(1);

        // Parse result
        if (rows.length > 0) {
            const result = JSON.parse(rows[0]);
            stats.file.count = result['TOTAL_COUNT'];
            stats.file.maxSize = result['LARGEST_FILE_SIZE'];
            stats.file.minSize = result['SMALLEST_FILE_SIZE'];
            stats.structure.depth = result['MAX_DEPTH'];
            stats.type.csv = result['CSV_COUNT'];
            stats.type.json = result['JSON_COUNT'];
            stats.type.parquet = result['PARQUET_COUNT'];
        }
    } catch(e) {
        console.error(e);
    } finally {
        await session.destroy();
    }

    return stats;
}

async function createTableFromSchema(tableName, filePaths, schema, inputSerialization) {
    const finalTableName = await DiscoverSchema.createTableFromSchema(
        tableName,
        filePaths,
        {
            numColumns: schema.length,
            columnsList: schema
        },
        inputSerialization
    );
    return finalTableName;
}

// === Helper functions: begin ===
function getKeylistTableName(fullPath) {
    const pathHash = crypto.createHash('md5').update(fullPath).digest('hex').toUpperCase();
    return `LW_KEYLIST_${pathHash}`;
}

function getFileExt(fileName) {
    return fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none';
}

function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}
// === Helper functions: end ===

// XXX TODO: it's something related to the state hook
// Need to split it from service code
import prettyBytes from 'pretty-bytes';
function populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile) {
    const fileList = [];
    for (const [ fileFullPath, fileInfo] of fileInfos.entries()) {
        const fileObj = {
            size: prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
        fileIdToFile[fileFullPath] = fileObj;
        fileList.push(fileObj);
    }

    setFileIdToFile(fileIdToFile);
    setData(fileList);
}

export {
    listFiles,
    createKeyListTable,
    getForensicsStats,
    populateFiles,
    flattenFileDir,
    createTableFromSchema
};