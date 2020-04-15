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

var kvStore = require("./xcalar/compute/localtypes/KvStore_pb");
var proto_empty = require("google-protobuf/google/protobuf/empty_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function KvStoreService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

KvStoreService.prototype = {
    lookup: async function(lookupRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(lookupRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.LookupRequest");
        //anyWrapper.pack(lookupRequest.serializeBinary(), "LookupRequest");

        var responseData = await this.client.execute("KvStore", "Lookup", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var lookupResponse =
        //    responseData.unpack(kvStore.LookupResponse.deserializeBinary,
        //                        "LookupResponse");
        var lookupResponse = kvStore.LookupResponse.deserializeBinary(specificBytes);
        return lookupResponse;
    },
    addOrReplace: async function(addOrReplaceRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(addOrReplaceRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.AddOrReplaceRequest");
        //anyWrapper.pack(addOrReplaceRequest.serializeBinary(), "AddOrReplaceRequest");

        var responseData = await this.client.execute("KvStore", "AddOrReplace", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    multiAddOrReplace: async function(multiAddOrReplaceRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(multiAddOrReplaceRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.MultiAddOrReplaceRequest");
        //anyWrapper.pack(multiAddOrReplaceRequest.serializeBinary(), "MultiAddOrReplaceRequest");

        var responseData = await this.client.execute("KvStore", "MultiAddOrReplace", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    deleteKey: async function(deleteKeyRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(deleteKeyRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.DeleteKeyRequest");
        //anyWrapper.pack(deleteKeyRequest.serializeBinary(), "DeleteKeyRequest");

        var responseData = await this.client.execute("KvStore", "DeleteKey", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    append: async function(appendRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(appendRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.AppendRequest");
        //anyWrapper.pack(appendRequest.serializeBinary(), "AppendRequest");

        var responseData = await this.client.execute("KvStore", "Append", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    setIfEqual: async function(setIfEqualRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(setIfEqualRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.SetIfEqualRequest");
        //anyWrapper.pack(setIfEqualRequest.serializeBinary(), "SetIfEqualRequest");

        var responseData = await this.client.execute("KvStore", "SetIfEqual", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    list: async function(listRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.ListRequest");
        //anyWrapper.pack(listRequest.serializeBinary(), "ListRequest");

        var responseData = await this.client.execute("KvStore", "List", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var listResponse =
        //    responseData.unpack(kvStore.ListResponse.deserializeBinary,
        //                        "ListResponse");
        var listResponse = kvStore.ListResponse.deserializeBinary(specificBytes);
        return listResponse;
    },
};

exports.KvStoreService = KvStoreService;
