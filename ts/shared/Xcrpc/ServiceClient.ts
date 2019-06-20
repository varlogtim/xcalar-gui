import { XceClient as ApiClient } from 'xcalar';
import { KVStoreService } from './KVStore/KVStoreService';
import { LicenseService } from './License/LicenseService';
import { QueryService } from './Query/QueryService';
import { UDFService} from './UDF/UDFService';
import { PublishedTableService } from './PublishedTable/PublishedTableService';
import { TableService } from './Table/TableService';
import { DataflowService } from './Dataflow/DataflowService';
import { GetQueryService } from './Operator/GetQueryService';
import { OperatorService } from './Operator/OperatorService';
import { TargetService } from './Target/TargetService';

class ServiceClient {
    private _apiClient: ApiClient;

    constructor(endpoint: string) {
        this._apiClient = new ApiClient(endpoint);
    }

    public getKVStoreService(): KVStoreService {
        return new KVStoreService(this._apiClient);
    }

    public getLicenseService(): LicenseService {
        return new LicenseService(this._apiClient);
    }

    public getPublishedTableService(): PublishedTableService {
        return new PublishedTableService(this._apiClient);
    }

    public getQueryService(): QueryService {
        return new QueryService(this._apiClient);
    }

    public getUDFService(): UDFService {
        return new UDFService(this._apiClient);
    }

    public getTableService(): TableService {
        return new TableService(this._apiClient);
    }

    public getGetQueryService(): GetQueryService {
        return new GetQueryService();
    }

    public getDataflowService(): DataflowService {
        return new DataflowService(this._apiClient);
    }

    public getOperatorService(): OperatorService {
        return new OperatorService(this._apiClient);
    }

    public getTargetService(): TargetService {
        return new TargetService(this._apiClient);
    }
}

export { ServiceClient };