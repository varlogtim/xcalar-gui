/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
goog.exportSymbol('proto.xcalar.compute.localtypes.Cgroup.CgRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Cgroup.CgResponse', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Cgroup.CgRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Cgroup.CgRequest.displayName = 'proto.xcalar.compute.localtypes.Cgroup.CgRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Cgroup.CgRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgRequest} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    jsoninput: msg.getJsoninput()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgRequest}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Cgroup.CgRequest;
  return proto.xcalar.compute.localtypes.Cgroup.CgRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgRequest}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setJsoninput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgRequest} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getJsoninput();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgRequest} The clone.
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Cgroup.CgRequest} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional string jsonInput = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.getJsoninput = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 1, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Cgroup.CgRequest.prototype.setJsoninput = function(value) {
  jspb.Message.setField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Cgroup.CgResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Cgroup.CgResponse.displayName = 'proto.xcalar.compute.localtypes.Cgroup.CgResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Cgroup.CgResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgResponse} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    jsonoutput: msg.getJsonoutput()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgResponse}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Cgroup.CgResponse;
  return proto.xcalar.compute.localtypes.Cgroup.CgResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgResponse}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setJsonoutput(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Cgroup.CgResponse} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getJsonoutput();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Cgroup.CgResponse} The clone.
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Cgroup.CgResponse} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional string jsonOutput = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.getJsonoutput = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 1, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Cgroup.CgResponse.prototype.setJsonoutput = function(value) {
  jspb.Message.setField(this, 1, value);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.Cgroup);
