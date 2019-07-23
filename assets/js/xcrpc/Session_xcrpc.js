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

var session = require("./xcalar/compute/localtypes/Session_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function SessionService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

SessionService.prototype = {
    create: async function(createRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(createRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.CreateRequest");
        //anyWrapper.pack(createRequest.serializeBinary(), "CreateRequest");

        try {
            var responseData = await this.client.execute("Session", "Create", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var createResponse =
            //    responseData.unpack(session.CreateResponse.deserializeBinary,
            //                        "CreateResponse");
            var createResponse = session.CreateResponse.deserializeBinary(specificBytes);
            return createResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.CreateResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    inact: async function(inactRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(inactRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.InactRequest");
        //anyWrapper.pack(inactRequest.serializeBinary(), "InactRequest");

        try {
            var responseData = await this.client.execute("Session", "Inact", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var inactResponse =
            //    responseData.unpack(session.InactResponse.deserializeBinary,
            //                        "InactResponse");
            var inactResponse = session.InactResponse.deserializeBinary(specificBytes);
            return inactResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.InactResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    persist: async function(persistRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(persistRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.PersistRequest");
        //anyWrapper.pack(persistRequest.serializeBinary(), "PersistRequest");

        try {
            var responseData = await this.client.execute("Session", "Persist", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var persistResponse =
            //    responseData.unpack(session.PersistResponse.deserializeBinary,
            //                        "PersistResponse");
            var persistResponse = session.PersistResponse.deserializeBinary(specificBytes);
            return persistResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.PersistResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    activate: async function(activateRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(activateRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.ActivateRequest");
        //anyWrapper.pack(activateRequest.serializeBinary(), "ActivateRequest");

        try {
            var responseData = await this.client.execute("Session", "Activate", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var activateResponse =
            //    responseData.unpack(session.ActivateResponse.deserializeBinary,
            //                        "ActivateResponse");
            var activateResponse = session.ActivateResponse.deserializeBinary(specificBytes);
            return activateResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.ActivateResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    upload: async function(uploadRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(uploadRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.UploadRequest");
        //anyWrapper.pack(uploadRequest.serializeBinary(), "UploadRequest");

        try {
            var responseData = await this.client.execute("Session", "Upload", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var uploadResponse =
            //    responseData.unpack(session.UploadResponse.deserializeBinary,
            //                        "UploadResponse");
            var uploadResponse = session.UploadResponse.deserializeBinary(specificBytes);
            return uploadResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.UploadResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    list: async function(listRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.ListRequest");
        //anyWrapper.pack(listRequest.serializeBinary(), "ListRequest");

        try {
            var responseData = await this.client.execute("Session", "List", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var listResponse =
            //    responseData.unpack(session.ListResponse.deserializeBinary,
            //                        "ListResponse");
            var listResponse = session.ListResponse.deserializeBinary(specificBytes);
            return listResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.ListResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    downloadSession: async function(downloadRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(downloadRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.DownloadRequest");
        //anyWrapper.pack(downloadRequest.serializeBinary(), "DownloadRequest");

        try {
            var responseData = await this.client.execute("Session", "DownloadSession", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var downloadResponse =
            //    responseData.unpack(session.DownloadResponse.deserializeBinary,
            //                        "DownloadResponse");
            var downloadResponse = session.DownloadResponse.deserializeBinary(specificBytes);
            return downloadResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.DownloadResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    deleteSession: async function(deleteRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(deleteRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Session.DeleteRequest");
        //anyWrapper.pack(deleteRequest.serializeBinary(), "DeleteRequest");

        try {
            var responseData = await this.client.execute("Session", "DeleteSession", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var deleteResponse =
            //    responseData.unpack(session.DeleteResponse.deserializeBinary,
            //                        "DeleteResponse");
            var deleteResponse = session.DeleteResponse.deserializeBinary(specificBytes);
            return deleteResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = session.DeleteResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
};

exports.SessionService = SessionService;
