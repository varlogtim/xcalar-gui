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

var proto_empty = require("google-protobuf/google/protobuf/empty_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function FileService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

FileService.prototype = {
    remove: async function(removeRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(removeRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.File.RemoveRequest");
        //anyWrapper.pack(removeRequest.serializeBinary(), "RemoveRequest");

        var responseData = await this.client.execute("File", "Remove", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
};

exports.FileService = FileService;
