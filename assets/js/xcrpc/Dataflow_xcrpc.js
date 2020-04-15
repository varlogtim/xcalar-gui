// **********************************************************************
// *** DO NOT EDIT!  This file was autogenerated by xcrpc             ***
// **********************************************************************
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//

var client = require("./Client");
var service = require('./xcalar/compute/localtypes/Service_pb');

var dataflow = require("./xcalar/compute/localtypes/Dataflow_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function DataflowService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

DataflowService.prototype = {
    filter: async function(filterRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(filterRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.FilterRequest");
        //anyWrapper.pack(filterRequest.serializeBinary(), "FilterRequest");

        var responseData = await this.client.execute("Dataflow", "Filter", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var filterResponse =
        //    responseData.unpack(dataflow.FilterResponse.deserializeBinary,
        //                        "FilterResponse");
        var filterResponse = dataflow.FilterResponse.deserializeBinary(specificBytes);
        return filterResponse;
    },
    aggregate: async function(aggregateRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(aggregateRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.AggregateRequest");
        //anyWrapper.pack(aggregateRequest.serializeBinary(), "AggregateRequest");

        var responseData = await this.client.execute("Dataflow", "Aggregate", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var aggregateResponse =
        //    responseData.unpack(dataflow.AggregateResponse.deserializeBinary,
        //                        "AggregateResponse");
        var aggregateResponse = dataflow.AggregateResponse.deserializeBinary(specificBytes);
        return aggregateResponse;
    },
    aggregateWithEvalStr: async function(aggregateEvalStrRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(aggregateEvalStrRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest");
        //anyWrapper.pack(aggregateEvalStrRequest.serializeBinary(), "AggregateEvalStrRequest");

        var responseData = await this.client.execute("Dataflow", "AggregateWithEvalStr", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var aggregateResponse =
        //    responseData.unpack(dataflow.AggregateResponse.deserializeBinary,
        //                        "AggregateResponse");
        var aggregateResponse = dataflow.AggregateResponse.deserializeBinary(specificBytes);
        return aggregateResponse;
    },
    map: async function(mapRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(mapRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.MapRequest");
        //anyWrapper.pack(mapRequest.serializeBinary(), "MapRequest");

        var responseData = await this.client.execute("Dataflow", "Map", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var mapResponse =
        //    responseData.unpack(dataflow.MapResponse.deserializeBinary,
        //                        "MapResponse");
        var mapResponse = dataflow.MapResponse.deserializeBinary(specificBytes);
        return mapResponse;
    },
    genRowNum: async function(genRowNumRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(genRowNumRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.GenRowNumRequest");
        //anyWrapper.pack(genRowNumRequest.serializeBinary(), "GenRowNumRequest");

        var responseData = await this.client.execute("Dataflow", "GenRowNum", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var genRowNumResponse =
        //    responseData.unpack(dataflow.GenRowNumResponse.deserializeBinary,
        //                        "GenRowNumResponse");
        var genRowNumResponse = dataflow.GenRowNumResponse.deserializeBinary(specificBytes);
        return genRowNumResponse;
    },
    project: async function(projectRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(projectRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ProjectRequest");
        //anyWrapper.pack(projectRequest.serializeBinary(), "ProjectRequest");

        var responseData = await this.client.execute("Dataflow", "Project", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var projectResponse =
        //    responseData.unpack(dataflow.ProjectResponse.deserializeBinary,
        //                        "ProjectResponse");
        var projectResponse = dataflow.ProjectResponse.deserializeBinary(specificBytes);
        return projectResponse;
    },
    join: async function(joinRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(joinRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.JoinRequest");
        //anyWrapper.pack(joinRequest.serializeBinary(), "JoinRequest");

        var responseData = await this.client.execute("Dataflow", "Join", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var joinResponse =
        //    responseData.unpack(dataflow.JoinResponse.deserializeBinary,
        //                        "JoinResponse");
        var joinResponse = dataflow.JoinResponse.deserializeBinary(specificBytes);
        return joinResponse;
    },
    unionOp: async function(unionRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(unionRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.UnionRequest");
        //anyWrapper.pack(unionRequest.serializeBinary(), "UnionRequest");

        var responseData = await this.client.execute("Dataflow", "UnionOp", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var unionResponse =
        //    responseData.unpack(dataflow.UnionResponse.deserializeBinary,
        //                        "UnionResponse");
        var unionResponse = dataflow.UnionResponse.deserializeBinary(specificBytes);
        return unionResponse;
    },
    groupBy: async function(groupByRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(groupByRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.GroupByRequest");
        //anyWrapper.pack(groupByRequest.serializeBinary(), "GroupByRequest");

        var responseData = await this.client.execute("Dataflow", "GroupBy", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var groupByResponse =
        //    responseData.unpack(dataflow.GroupByResponse.deserializeBinary,
        //                        "GroupByResponse");
        var groupByResponse = dataflow.GroupByResponse.deserializeBinary(specificBytes);
        return groupByResponse;
    },
    indexFromDataset: async function(indexFromDatasetRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(indexFromDatasetRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest");
        //anyWrapper.pack(indexFromDatasetRequest.serializeBinary(), "IndexFromDatasetRequest");

        var responseData = await this.client.execute("Dataflow", "IndexFromDataset", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var indexFromDatasetResponse =
        //    responseData.unpack(dataflow.IndexFromDatasetResponse.deserializeBinary,
        //                        "IndexFromDatasetResponse");
        var indexFromDatasetResponse = dataflow.IndexFromDatasetResponse.deserializeBinary(specificBytes);
        return indexFromDatasetResponse;
    },
    index: async function(indexRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(indexRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.IndexRequest");
        //anyWrapper.pack(indexRequest.serializeBinary(), "IndexRequest");

        var responseData = await this.client.execute("Dataflow", "Index", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var indexResponse =
        //    responseData.unpack(dataflow.IndexResponse.deserializeBinary,
        //                        "IndexResponse");
        var indexResponse = dataflow.IndexResponse.deserializeBinary(specificBytes);
        return indexResponse;
    },
    sort: async function(sortRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(sortRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.SortRequest");
        //anyWrapper.pack(sortRequest.serializeBinary(), "SortRequest");

        var responseData = await this.client.execute("Dataflow", "Sort", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var sortResponse =
        //    responseData.unpack(dataflow.SortResponse.deserializeBinary,
        //                        "SortResponse");
        var sortResponse = dataflow.SortResponse.deserializeBinary(specificBytes);
        return sortResponse;
    },
    synthesize: async function(synthesizeRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(synthesizeRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.SynthesizeRequest");
        //anyWrapper.pack(synthesizeRequest.serializeBinary(), "SynthesizeRequest");

        var responseData = await this.client.execute("Dataflow", "Synthesize", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var synthesizeResponse =
        //    responseData.unpack(dataflow.SynthesizeResponse.deserializeBinary,
        //                        "SynthesizeResponse");
        var synthesizeResponse = dataflow.SynthesizeResponse.deserializeBinary(specificBytes);
        return synthesizeResponse;
    },
    execute: async function(executeRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(executeRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ExecuteRequest");
        //anyWrapper.pack(executeRequest.serializeBinary(), "ExecuteRequest");

        var responseData = await this.client.execute("Dataflow", "Execute", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var executeResponse =
        //    responseData.unpack(dataflow.ExecuteResponse.deserializeBinary,
        //                        "ExecuteResponse");
        var executeResponse = dataflow.ExecuteResponse.deserializeBinary(specificBytes);
        return executeResponse;
    },
};

exports.DataflowService = DataflowService;
