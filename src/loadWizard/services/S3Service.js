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
const defaultFileNameRegex = '.*';
const defaultFileNameGlob = '*';
const defaultFileNamePattern = defaultFileNameGlob;

async function listFiles(path, targetName = "AWS Target", filter = (fileInfo) => true) {
    const fileInfos = new Map();
    const s3Files = await listFilesWithPattern({
        targetName: targetName,
        path: path,
        fileNamePattern: '*',
        isRecursive: false,
        filter: filter
    });

    for (const file of s3Files) {
        fileInfos.set(file.fullPath, file);
    }

    return fileInfos;
}

async function listFilesWithPattern({
    targetName, path,
    fileNamePattern = defaultFileNamePattern,
    isRecursive = false,
    filter = (fileInfo) => true
}) {
    const s3Files = await XcalarListFiles({
        "recursive": isRecursive,
        "targetName": targetName,
        "path": path,
        "fileNamePattern": fileNamePattern
    });

    return s3Files.files.map((file) => createFileInfo({
        path: path, file: file, targetName: targetName
    })).filter((file) => filter(file));
}

function createFileInfo({path, file, targetName}) {
    const fullFilePath = Path.join(path, file.name);
    const isDirectory = file.attr.isDirectory ? true : false;
    const fileInfo = {
        fileId: fullFilePath,
        targetName: targetName,
        fullPath: fullFilePath,
        directory: isDirectory,
        name: file.name,
        sizeInBytes: file.attr.size,
        type: isDirectory
            ? 'directory'
            : getFileExt(file.name)
    };
    return fileInfo;
}

async function createKeyListTable({ bucketName='/xcfield/' }) {
    bucketName = Path.join("/", bucketName, "/");
    const finalTableName = getKeylistTableName(bucketName);
    const myDatasetName = DS_PREFIX + randomName();

    const session = new XDSession();
    await session.create();
    await session.activate();

    try {
        // Check if we already have a table
        const existingTable = await session.getPublishedTable({ name: finalTableName });
        if (existingTable != null) {
            await existingTable.activate();
            return finalTableName;
        }

        // load key list to dataset
        const parserArgs = {
            moduleName: 'default',
            funcName: 'generateS3KeyList',
            udfQuery: {
                's3_path': bucketName,
                's3_name_pattern': '*',
                's3_recursive': true
            }
        };

        const sourceArgs = [{
            targetName: 'Default Shared Root',
            path: '/etc/hosts', // Dummy path
            fileNamePattern: '',
            recursive: false
        }];

        const keylistDataset = await session.createDataset({
            name: myDatasetName,
            sourceArgs: sourceArgs,
            parseArgs: parserArgs
        });

        // Create published table from dataset
        const keylistTable = await keylistDataset.createPublishedTable(finalTableName);
        return keylistTable.getName();
    } catch(e) {
        console.error('ERROR: Creating published table: ', e);
        throw e;
    } finally {
        await session.destroy();
    }
}

async function getForensicsStats(bucket, pathPrefix) {
    let bucketName = bucket
    bucketName = Path.join("/", bucket, "/");
    let fullPath = Path.join(bucketName, pathPrefix);
    fullPath = Path.join(fullPath, "/");
    const keyListTableName = getKeylistTableName(bucketName);
    const sql = `SELECT * FROM (SELECT * FROM
        (SELECT *,(TOTAL_COUNT-CSV_COUNT-JSON_COUNT-PARQUET_COUNT-NOEXT_COUNT) AS UNSUPPORTED_COUNT FROM
        (SELECT
            COUNT(*) as TOTAL_COUNT,
            MAX(LENGTH(PATH) - LENGTH(REPLACE(PATH, '/', ''))) AS MAX_DEPTH,
            STDDEV(CAST(SIZE as int)) AS STD_DEV,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.csv' THEN 1 ELSE 0 END) AS CSV_COUNT,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.json%' THEN 1 ELSE 0 END) AS JSON_COUNT,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.parquet' THEN 1 ELSE 0 END) AS PARQUET_COUNT,
            SUM(CASE WHEN LOWER(PATH) NOT LIKE '\%.\%' THEN 1 ELSE 0 END) AS NOEXT_COUNT
        FROM ( SELECT * FROM ${keyListTableName} WHERE PATH LIKE '${fullPath}\%'))) JOIN (
            SELECT a.PATH LARGEST_FILE, a.SIZE LARGEST_FILE_SIZE
               FROM ${keyListTableName} a
               INNER JOIN (
                    SELECT MAX(CAST(SIZE AS INT)) LARGEST_FILE_SIZE
                    FROM ${keyListTableName} WHERE PATH LIKE '${fullPath}\%'
            ) b ON a.SIZE = b.LARGEST_FILE_SIZE
        )) JOIN (
            SELECT a.PATH SMALLEST_FILE, a.SIZE SMALLEST_FILE_SIZE
               FROM ${keyListTableName} a
               INNER JOIN (
                    SELECT MIN(CAST(SIZE AS INT)) SMALLEST_FILE_SIZE
                    FROM ${keyListTableName} WHERE PATH LIKE '${fullPath}\%'
            ) b ON a.SIZE = b.SMALLEST_FILE_SIZE
        )`;

    const childrenSql = `
        WITH FILTERLIST AS
        (
           SELECT LENGTH(REPLACE(PATH, '${fullPath}', '')) - LENGTH(REPLACE(REPLACE(PATH, '${fullPath}', ''), '/', '')) AS DIFFLEN, * FROM ${keyListTableName} where PATH like '${fullPath}\%' and PATH NOT LIKE '${fullPath}\%/'
        ),
        DIRLIST AS
        (
            SELECT REPLACE(PATH, SUBSTRING_INDEX(PATH, '/', -1), '') PATH, 'True' ISDIR, SIZE, MTIME FROM ${keyListTableName} WHERE PATH LIKE '${fullPath}\%'
        ),
        DIRCHILDREN AS (
            SELECT * FROM DIRLIST WHERE (LENGTH(REPLACE(PATH, '${fullPath}', '')) - LENGTH(REPLACE(REPLACE(PATH, '${fullPath}', ''), '/', ''))) = 1
        ),
        UNIONCHILDREN AS
        (
            SELECT PATH, SIZE, ISDIR FROM FILTERLIST WHERE DIFFLEN = 0
                UNION
            SELECT DISTINCT PATH, 0 SIZE, ISDIR FROM DIRCHILDREN
        )
        SELECT sxdf_concatDelim("|", '', FALSE, COLLECT_LIST(CONCAT(PATH, "|"))) AS CHILDREN FROM UNIONCHILDREN`;

    const session = new XDSession();
    const stats = {
        file: {
            count: 0,
            maxSize: 0,
            minSize: 0,
            largestFile: '',
            smallestFile: '',
            children: ''
        },
        structure: {
            depth: 0
        },
        type: {
            csv: 0, json: 0, parquet: 0, unsupported: 0, noext: 0
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
        const ctable = await session.executeSql(childrenSql);
        console.log(`Sql result table: ${ctable.getName()}`);

        // fetch the result
        const cursor = table.createCursor();
        await cursor.open();
        const rows = await cursor.fetch(1);
        const ccursor = ctable.createCursor();
        await ccursor.open();
        const crows = await ccursor.fetch(1);

        // Parse result
        if (rows.length > 0) {
            const result = JSON.parse(rows[0]);
            stats.file.count = result['TOTAL_COUNT'];
            stats.file.maxSize = result['LARGEST_FILE_SIZE'];
            stats.file.minSize = result['SMALLEST_FILE_SIZE'];
            stats.file.largestFile = result['LARGEST_FILE'];
            stats.file.smallestFile = result['SMALLEST_FILE'];
            stats.structure.depth = result['MAX_DEPTH'];
            stats.type.csv = result['CSV_COUNT'];
            stats.type.json = result['JSON_COUNT'];
            stats.type.parquet = result['PARQUET_COUNT'];
            stats.type.unsupported = result['UNSUPPORTED_COUNT'];
            stats.type.noext = result['NOEXT_COUNT'];
        }
        if (crows.length > 0) {
            const result = JSON.parse(crows[0]);
            stats.file.children = result['CHILDREN'];
        }
    } finally {
        await session.destroy();
    }

    return stats;
}

/**
 *
 * @param {string} tableName
 * @param {[{ path:string, size:number }]} fileInfos [{ path, size }]
 * @param {[{name, mapping, type}]} schema
 * @param {*} inputSerialization
 */
async function createTableFromSchema(tableName, fileInfos, schema, inputSerialization, progressCB) {
    const finalTableName = await DiscoverSchema.createTableFromSchema(
        tableName,
        fileInfos,
        {
            numColumns: schema.length,
            columns: schema
        },
        inputSerialization,
        progressCB
    );
    return finalTableName;
}

// === Helper functions: begin ===
function getKeylistTableName(fullPath) {
    const pathHash = crypto.createHash('md5').update(fullPath).digest('hex').toUpperCase();
    return `LW_KEYLIST_${pathHash}`;
}

const CompressionExt = ['.gz', '.bz2']

function getFileExt(fileName) {
    for (const ext of CompressionExt) {
        const newfile = fileName.endsWith(ext) ? fileName.slice(0, -ext.length) : fileName
        fileName = newfile
        if (newfile != fileName) { break; }
    }

    return (fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none').toLowerCase();
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
    defaultFileNamePattern,
    listFiles,
    listFilesWithPattern,
    createKeyListTable,
    getForensicsStats,
    populateFiles,
    createTableFromSchema
};
