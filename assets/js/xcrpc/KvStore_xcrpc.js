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

var jQuery;
// Explicitly check if this code is running under nodejs
if ((typeof process !== 'undefined') &&
    (typeof process.versions !== 'undefined') &&
    (typeof process.versions.node !== 'undefined')) {
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    const { window } = new JSDOM();
    jQuery = require("jquery")(window);
} else {
    jQuery = require('jquery');
};
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
    lookup: function(lookupRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(lookupRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.LookupRequest");
        //anyWrapper.pack(lookupRequest.serializeBinary(), "LookupRequest");

        var response = this.client.execute("KvStore", "Lookup", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var lookupResponse =
            //    responseData.unpack(kvStore.LookupResponse.deserializeBinary,
            //                        "LookupResponse");
            var lookupResponse = kvStore.LookupResponse.deserializeBinary(specificBytes);
            deferred.resolve(lookupResponse);
        })
        .fail(function(error) {
            console.log("lookup fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
    addOrReplace: function(addOrReplaceRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(addOrReplaceRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.AddOrReplaceRequest");
        //anyWrapper.pack(addOrReplaceRequest.serializeBinary(), "AddOrReplaceRequest");

        var response = this.client.execute("KvStore", "AddOrReplace", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            deferred.resolve(empty);
        })
        .fail(function(error) {
            console.log("addOrReplace fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
    deleteKey: function(deleteKeyRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(deleteKeyRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.DeleteKeyRequest");
        //anyWrapper.pack(deleteKeyRequest.serializeBinary(), "DeleteKeyRequest");

        var response = this.client.execute("KvStore", "DeleteKey", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            deferred.resolve(empty);
        })
        .fail(function(error) {
            console.log("deleteKey fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
    append: function(appendRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(appendRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.AppendRequest");
        //anyWrapper.pack(appendRequest.serializeBinary(), "AppendRequest");

        var response = this.client.execute("KvStore", "Append", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            deferred.resolve(empty);
        })
        .fail(function(error) {
            console.log("append fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
    setIfEqual: function(setIfEqualRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(setIfEqualRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.SetIfEqualRequest");
        //anyWrapper.pack(setIfEqualRequest.serializeBinary(), "SetIfEqualRequest");

        var response = this.client.execute("KvStore", "SetIfEqual", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            deferred.resolve(empty);
        })
        .fail(function(error) {
            console.log("setIfEqual fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
    list: function(listRequest) {
        var deferred = jQuery.Deferred();
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.KvStore.ListRequest");
        //anyWrapper.pack(listRequest.serializeBinary(), "ListRequest");

        var response = this.client.execute("KvStore", "List", anyWrapper)
        .then(function(responseData) {
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var listResponse =
            //    responseData.unpack(kvStore.ListResponse.deserializeBinary,
            //                        "ListResponse");
            var listResponse = kvStore.ListResponse.deserializeBinary(specificBytes);
            deferred.resolve(listResponse);
        })
        .fail(function(error) {
            console.log("list fail:" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    },
};

exports.KvStoreService = KvStoreService;
