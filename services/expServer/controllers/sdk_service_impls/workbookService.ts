import * as xcalar from "xcalar"
// Workbook.proto/Workbook_pb.js
const wkbk_pb : any = proto.xcalar.compute.localtypes.Workbook;

// DagHelper is in DagHelperIndex.js
// which is imported as a global var

function convertKvsToQuery(convertRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let kvsQueryList: string[] = convertRequest.getKvsstringList();
    let dataflowName: string = convertRequest.getDataflowname();
    let optimized: boolean = convertRequest.getOptimized();
    let listXdfsOutput: string = convertRequest.getListxdfsoutput();
    let userName: string = convertRequest.getUsername();
    let sessionId: string = convertRequest.getSessionid();
    let workbookName: string = convertRequest.getWorkbookname();
    // let txId = Transaction.start({"simulate": true});
    let cvtKvsToQueryResponse: any = new wkbk_pb.ConvertKvsToQueryResponse();

    cvtKvsToQueryResponse.setConverted(false);
    DagHelper.convertKvs(kvsQueryList, dataflowName, optimized, listXdfsOutput,
            userName, sessionId, workbookName)
    .then(function(convertedQuery: any): void {
        if (optimized) {
            let optimizedStr: string = JSON.stringify(convertedQuery)
            cvtKvsToQueryResponse.setResultstring(optimizedStr);
        } else {
            cvtKvsToQueryResponse.setResultstring(convertedQuery);
        }
        cvtKvsToQueryResponse.setConverted(true);
        deferred.resolve(cvtKvsToQueryResponse);
    })
    .fail(function(err) {
        // Unable to convert to a query.  Pass back the reason.
        let errStr: string = err.node.title + " (" + err.node.type + ") - " + err.type;
        cvtKvsToQueryResponse.setResultstring(errStr);
        deferred.resolve(cvtKvsToQueryResponse);
    });
    return deferred.promise();
}
export { convertKvsToQuery as ConvertKvsToQuery }