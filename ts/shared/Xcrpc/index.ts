/**
 * This file is the entry point for both NodeJS module package and webpack browserify
 *
 * For NodeJS, it defines the interface of the xcalarsdk module(name is defined
 * in ./package.json)
 * For webpack, it defines the interface of the Xcrpc namespace(name is defined
 * in /webpack.config.js, interface is defined in ./Xcrpc.d.ts);
 */

// Common libraries
// These are top-level functions
export * from './ServiceClient';
export * from './ServiceClientFactory';
import * as Error from './ServiceError';
export { Error };
export { EnumMap } from 'xcalar';
import * as Debug from './Common/Debug';
export { Debug };

// Services
// Wrap the services in its own namesapce to avoid name confliction
import * as KVStore from './KVStore/KVStoreService';
export { KVStore };
import * as License from './License/LicenseService';
export { License };
import * as Query from './Query/QueryService';
export { Query };
import * as PublishedTable from './PublishedTable/PublishedTableService';
export { PublishedTable };
import * as Table from './Table/TableService';
export { Table };
import * as Dataflow from './Dataflow/DataflowService';
export { Dataflow };
import * as GetQuery from './Operator/GetQueryService';
export { GetQuery };
import * as Dataset from './Dataset/DatasetService';
export { Dataset };
import * as Operator from './Operator/OperatorService';
export { Operator };
import * as Target from './Target/TargetService';
export { Target }
import * as DagNode from './DagNode/DagNodeService';
export { DagNode };
