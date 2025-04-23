/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.labapi = (function() {

    /**
     * Namespace labapi.
     * @exports labapi
     * @namespace
     */
    var labapi = {};

    labapi.LabAPI = (function() {

        /**
         * Constructs a new LabAPI service.
         * @memberof labapi
         * @classdesc Represents a LabAPI
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function LabAPI(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (LabAPI.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = LabAPI;

        /**
         * Creates new LabAPI service using the specified rpc implementation.
         * @function create
         * @memberof labapi.LabAPI
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {LabAPI} RPC service. Useful where requests and/or responses are streamed.
         */
        LabAPI.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link labapi.LabAPI#getRecentLocallyBuiltBlocks}.
         * @memberof labapi.LabAPI
         * @typedef GetRecentLocallyBuiltBlocksCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {labapi.GetRecentLocallyBuiltBlocksResponse} [response] GetRecentLocallyBuiltBlocksResponse
         */

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @function getRecentLocallyBuiltBlocks
         * @memberof labapi.LabAPI
         * @instance
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest} request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @param {labapi.LabAPI.GetRecentLocallyBuiltBlocksCallback} callback Node-style callback called with the error, if any, and GetRecentLocallyBuiltBlocksResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(LabAPI.prototype.getRecentLocallyBuiltBlocks = function getRecentLocallyBuiltBlocks(request, callback) {
            return this.rpcCall(getRecentLocallyBuiltBlocks, $root.labapi.GetRecentLocallyBuiltBlocksRequest, $root.labapi.GetRecentLocallyBuiltBlocksResponse, request, callback);
        }, "name", { value: "GetRecentLocallyBuiltBlocks" });

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @function getRecentLocallyBuiltBlocks
         * @memberof labapi.LabAPI
         * @instance
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest} request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @returns {Promise<labapi.GetRecentLocallyBuiltBlocksResponse>} Promise
         * @variation 2
         */

        return LabAPI;
    })();

    labapi.GetRecentLocallyBuiltBlocksRequest = (function() {

        /**
         * Properties of a GetRecentLocallyBuiltBlocksRequest.
         * @memberof labapi
         * @interface IGetRecentLocallyBuiltBlocksRequest
         * @property {string|null} [network] GetRecentLocallyBuiltBlocksRequest network
         */

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksRequest.
         * @memberof labapi
         * @classdesc Represents a GetRecentLocallyBuiltBlocksRequest.
         * @implements IGetRecentLocallyBuiltBlocksRequest
         * @constructor
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest=} [properties] Properties to set
         */
        function GetRecentLocallyBuiltBlocksRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentLocallyBuiltBlocksRequest network.
         * @member {string} network
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @instance
         */
        GetRecentLocallyBuiltBlocksRequest.prototype.network = "";

        /**
         * Creates a new GetRecentLocallyBuiltBlocksRequest instance using the specified properties.
         * @function create
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest=} [properties] Properties to set
         * @returns {labapi.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest instance
         */
        GetRecentLocallyBuiltBlocksRequest.create = function create(properties) {
            return new GetRecentLocallyBuiltBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.network);
            return writer;
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message, length delimited. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {labapi.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.labapi.GetRecentLocallyBuiltBlocksRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.network = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {labapi.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentLocallyBuiltBlocksRequest message.
         * @function verify
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentLocallyBuiltBlocksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            return null;
        };

        /**
         * Creates a GetRecentLocallyBuiltBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {labapi.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         */
        GetRecentLocallyBuiltBlocksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.labapi.GetRecentLocallyBuiltBlocksRequest)
                return object;
            var message = new $root.labapi.GetRecentLocallyBuiltBlocksRequest();
            if (object.network != null)
                message.network = String(object.network);
            return message;
        };

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {labapi.GetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentLocallyBuiltBlocksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.network = "";
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            return object;
        };

        /**
         * Converts this GetRecentLocallyBuiltBlocksRequest to JSON.
         * @function toJSON
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentLocallyBuiltBlocksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksRequest
         * @function getTypeUrl
         * @memberof labapi.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentLocallyBuiltBlocksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/labapi.GetRecentLocallyBuiltBlocksRequest";
        };

        return GetRecentLocallyBuiltBlocksRequest;
    })();

    labapi.GetRecentLocallyBuiltBlocksResponse = (function() {

        /**
         * Properties of a GetRecentLocallyBuiltBlocksResponse.
         * @memberof labapi
         * @interface IGetRecentLocallyBuiltBlocksResponse
         * @property {Array.<beacon_slots.ILocallyBuiltSlotBlocks>|null} [slotBlocks] GetRecentLocallyBuiltBlocksResponse slotBlocks
         */

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksResponse.
         * @memberof labapi
         * @classdesc Represents a GetRecentLocallyBuiltBlocksResponse.
         * @implements IGetRecentLocallyBuiltBlocksResponse
         * @constructor
         * @param {labapi.IGetRecentLocallyBuiltBlocksResponse=} [properties] Properties to set
         */
        function GetRecentLocallyBuiltBlocksResponse(properties) {
            this.slotBlocks = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentLocallyBuiltBlocksResponse slotBlocks.
         * @member {Array.<beacon_slots.ILocallyBuiltSlotBlocks>} slotBlocks
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @instance
         */
        GetRecentLocallyBuiltBlocksResponse.prototype.slotBlocks = $util.emptyArray;

        /**
         * Creates a new GetRecentLocallyBuiltBlocksResponse instance using the specified properties.
         * @function create
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksResponse=} [properties] Properties to set
         * @returns {labapi.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse instance
         */
        GetRecentLocallyBuiltBlocksResponse.create = function create(properties) {
            return new GetRecentLocallyBuiltBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slotBlocks != null && message.slotBlocks.length)
                for (var i = 0; i < message.slotBlocks.length; ++i)
                    $root.beacon_slots.LocallyBuiltSlotBlocks.encode(message.slotBlocks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message, length delimited. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {labapi.IGetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {labapi.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.labapi.GetRecentLocallyBuiltBlocksResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.slotBlocks && message.slotBlocks.length))
                            message.slotBlocks = [];
                        message.slotBlocks.push($root.beacon_slots.LocallyBuiltSlotBlocks.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {labapi.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentLocallyBuiltBlocksResponse message.
         * @function verify
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentLocallyBuiltBlocksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slotBlocks != null && message.hasOwnProperty("slotBlocks")) {
                if (!Array.isArray(message.slotBlocks))
                    return "slotBlocks: array expected";
                for (var i = 0; i < message.slotBlocks.length; ++i) {
                    var error = $root.beacon_slots.LocallyBuiltSlotBlocks.verify(message.slotBlocks[i]);
                    if (error)
                        return "slotBlocks." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GetRecentLocallyBuiltBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {labapi.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         */
        GetRecentLocallyBuiltBlocksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.labapi.GetRecentLocallyBuiltBlocksResponse)
                return object;
            var message = new $root.labapi.GetRecentLocallyBuiltBlocksResponse();
            if (object.slotBlocks) {
                if (!Array.isArray(object.slotBlocks))
                    throw TypeError(".labapi.GetRecentLocallyBuiltBlocksResponse.slotBlocks: array expected");
                message.slotBlocks = [];
                for (var i = 0; i < object.slotBlocks.length; ++i) {
                    if (typeof object.slotBlocks[i] !== "object")
                        throw TypeError(".labapi.GetRecentLocallyBuiltBlocksResponse.slotBlocks: object expected");
                    message.slotBlocks[i] = $root.beacon_slots.LocallyBuiltSlotBlocks.fromObject(object.slotBlocks[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {labapi.GetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentLocallyBuiltBlocksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.slotBlocks = [];
            if (message.slotBlocks && message.slotBlocks.length) {
                object.slotBlocks = [];
                for (var j = 0; j < message.slotBlocks.length; ++j)
                    object.slotBlocks[j] = $root.beacon_slots.LocallyBuiltSlotBlocks.toObject(message.slotBlocks[j], options);
            }
            return object;
        };

        /**
         * Converts this GetRecentLocallyBuiltBlocksResponse to JSON.
         * @function toJSON
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentLocallyBuiltBlocksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksResponse
         * @function getTypeUrl
         * @memberof labapi.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentLocallyBuiltBlocksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/labapi.GetRecentLocallyBuiltBlocksResponse";
        };

        return GetRecentLocallyBuiltBlocksResponse;
    })();

    return labapi;
})();

$root.beacon_slots = (function() {

    /**
     * Namespace beacon_slots.
     * @exports beacon_slots
     * @namespace
     */
    var beacon_slots = {};

    beacon_slots.BeaconSlots = (function() {

        /**
         * Constructs a new BeaconSlots service.
         * @memberof beacon_slots
         * @classdesc Represents a BeaconSlots
         * @extends $protobuf.rpc.Service
         * @constructor
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         */
        function BeaconSlots(rpcImpl, requestDelimited, responseDelimited) {
            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
        }

        (BeaconSlots.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = BeaconSlots;

        /**
         * Creates new BeaconSlots service using the specified rpc implementation.
         * @function create
         * @memberof beacon_slots.BeaconSlots
         * @static
         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
         * @returns {BeaconSlots} RPC service. Useful where requests and/or responses are streamed.
         */
        BeaconSlots.create = function create(rpcImpl, requestDelimited, responseDelimited) {
            return new this(rpcImpl, requestDelimited, responseDelimited);
        };

        /**
         * Callback as used by {@link beacon_slots.BeaconSlots#getRecentLocallyBuiltBlocks}.
         * @memberof beacon_slots.BeaconSlots
         * @typedef GetRecentLocallyBuiltBlocksCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {beacon_slots.GetRecentLocallyBuiltBlocksResponse} [response] GetRecentLocallyBuiltBlocksResponse
         */

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @function getRecentLocallyBuiltBlocks
         * @memberof beacon_slots.BeaconSlots
         * @instance
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest} request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @param {beacon_slots.BeaconSlots.GetRecentLocallyBuiltBlocksCallback} callback Node-style callback called with the error, if any, and GetRecentLocallyBuiltBlocksResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(BeaconSlots.prototype.getRecentLocallyBuiltBlocks = function getRecentLocallyBuiltBlocks(request, callback) {
            return this.rpcCall(getRecentLocallyBuiltBlocks, $root.beacon_slots.GetRecentLocallyBuiltBlocksRequest, $root.beacon_slots.GetRecentLocallyBuiltBlocksResponse, request, callback);
        }, "name", { value: "GetRecentLocallyBuiltBlocks" });

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @function getRecentLocallyBuiltBlocks
         * @memberof beacon_slots.BeaconSlots
         * @instance
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest} request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @returns {Promise<beacon_slots.GetRecentLocallyBuiltBlocksResponse>} Promise
         * @variation 2
         */

        /**
         * Callback as used by {@link beacon_slots.BeaconSlots#getRecentValidatorBlocks}.
         * @memberof beacon_slots.BeaconSlots
         * @typedef GetRecentValidatorBlocksCallback
         * @type {function}
         * @param {Error|null} error Error, if any
         * @param {beacon_slots.GetRecentValidatorBlocksResponse} [response] GetRecentValidatorBlocksResponse
         */

        /**
         * Calls GetRecentValidatorBlocks.
         * @function getRecentValidatorBlocks
         * @memberof beacon_slots.BeaconSlots
         * @instance
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest} request GetRecentValidatorBlocksRequest message or plain object
         * @param {beacon_slots.BeaconSlots.GetRecentValidatorBlocksCallback} callback Node-style callback called with the error, if any, and GetRecentValidatorBlocksResponse
         * @returns {undefined}
         * @variation 1
         */
        Object.defineProperty(BeaconSlots.prototype.getRecentValidatorBlocks = function getRecentValidatorBlocks(request, callback) {
            return this.rpcCall(getRecentValidatorBlocks, $root.beacon_slots.GetRecentValidatorBlocksRequest, $root.beacon_slots.GetRecentValidatorBlocksResponse, request, callback);
        }, "name", { value: "GetRecentValidatorBlocks" });

        /**
         * Calls GetRecentValidatorBlocks.
         * @function getRecentValidatorBlocks
         * @memberof beacon_slots.BeaconSlots
         * @instance
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest} request GetRecentValidatorBlocksRequest message or plain object
         * @returns {Promise<beacon_slots.GetRecentValidatorBlocksResponse>} Promise
         * @variation 2
         */

        return BeaconSlots;
    })();

    beacon_slots.Geo = (function() {

        /**
         * Properties of a Geo.
         * @memberof beacon_slots
         * @interface IGeo
         * @property {string|null} [city] Geo city
         * @property {string|null} [country] Geo country
         * @property {string|null} [continent] Geo continent
         * @property {number|null} [latitude] Geo latitude
         * @property {number|null} [longitude] Geo longitude
         */

        /**
         * Constructs a new Geo.
         * @memberof beacon_slots
         * @classdesc Represents a Geo.
         * @implements IGeo
         * @constructor
         * @param {beacon_slots.IGeo=} [properties] Properties to set
         */
        function Geo(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Geo city.
         * @member {string} city
         * @memberof beacon_slots.Geo
         * @instance
         */
        Geo.prototype.city = "";

        /**
         * Geo country.
         * @member {string} country
         * @memberof beacon_slots.Geo
         * @instance
         */
        Geo.prototype.country = "";

        /**
         * Geo continent.
         * @member {string} continent
         * @memberof beacon_slots.Geo
         * @instance
         */
        Geo.prototype.continent = "";

        /**
         * Geo latitude.
         * @member {number} latitude
         * @memberof beacon_slots.Geo
         * @instance
         */
        Geo.prototype.latitude = 0;

        /**
         * Geo longitude.
         * @member {number} longitude
         * @memberof beacon_slots.Geo
         * @instance
         */
        Geo.prototype.longitude = 0;

        /**
         * Creates a new Geo instance using the specified properties.
         * @function create
         * @memberof beacon_slots.Geo
         * @static
         * @param {beacon_slots.IGeo=} [properties] Properties to set
         * @returns {beacon_slots.Geo} Geo instance
         */
        Geo.create = function create(properties) {
            return new Geo(properties);
        };

        /**
         * Encodes the specified Geo message. Does not implicitly {@link beacon_slots.Geo.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.Geo
         * @static
         * @param {beacon_slots.IGeo} message Geo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Geo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.city != null && Object.hasOwnProperty.call(message, "city"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.city);
            if (message.country != null && Object.hasOwnProperty.call(message, "country"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.country);
            if (message.continent != null && Object.hasOwnProperty.call(message, "continent"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.continent);
            if (message.latitude != null && Object.hasOwnProperty.call(message, "latitude"))
                writer.uint32(/* id 4, wireType 1 =*/33).double(message.latitude);
            if (message.longitude != null && Object.hasOwnProperty.call(message, "longitude"))
                writer.uint32(/* id 5, wireType 1 =*/41).double(message.longitude);
            return writer;
        };

        /**
         * Encodes the specified Geo message, length delimited. Does not implicitly {@link beacon_slots.Geo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.Geo
         * @static
         * @param {beacon_slots.IGeo} message Geo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Geo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Geo message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.Geo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.Geo} Geo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Geo.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.Geo();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.city = reader.string();
                        break;
                    }
                case 2: {
                        message.country = reader.string();
                        break;
                    }
                case 3: {
                        message.continent = reader.string();
                        break;
                    }
                case 4: {
                        message.latitude = reader.double();
                        break;
                    }
                case 5: {
                        message.longitude = reader.double();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Geo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.Geo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.Geo} Geo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Geo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Geo message.
         * @function verify
         * @memberof beacon_slots.Geo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Geo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.city != null && message.hasOwnProperty("city"))
                if (!$util.isString(message.city))
                    return "city: string expected";
            if (message.country != null && message.hasOwnProperty("country"))
                if (!$util.isString(message.country))
                    return "country: string expected";
            if (message.continent != null && message.hasOwnProperty("continent"))
                if (!$util.isString(message.continent))
                    return "continent: string expected";
            if (message.latitude != null && message.hasOwnProperty("latitude"))
                if (typeof message.latitude !== "number")
                    return "latitude: number expected";
            if (message.longitude != null && message.hasOwnProperty("longitude"))
                if (typeof message.longitude !== "number")
                    return "longitude: number expected";
            return null;
        };

        /**
         * Creates a Geo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.Geo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.Geo} Geo
         */
        Geo.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.Geo)
                return object;
            var message = new $root.beacon_slots.Geo();
            if (object.city != null)
                message.city = String(object.city);
            if (object.country != null)
                message.country = String(object.country);
            if (object.continent != null)
                message.continent = String(object.continent);
            if (object.latitude != null)
                message.latitude = Number(object.latitude);
            if (object.longitude != null)
                message.longitude = Number(object.longitude);
            return message;
        };

        /**
         * Creates a plain object from a Geo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.Geo
         * @static
         * @param {beacon_slots.Geo} message Geo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Geo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.city = "";
                object.country = "";
                object.continent = "";
                object.latitude = 0;
                object.longitude = 0;
            }
            if (message.city != null && message.hasOwnProperty("city"))
                object.city = message.city;
            if (message.country != null && message.hasOwnProperty("country"))
                object.country = message.country;
            if (message.continent != null && message.hasOwnProperty("continent"))
                object.continent = message.continent;
            if (message.latitude != null && message.hasOwnProperty("latitude"))
                object.latitude = options.json && !isFinite(message.latitude) ? String(message.latitude) : message.latitude;
            if (message.longitude != null && message.hasOwnProperty("longitude"))
                object.longitude = options.json && !isFinite(message.longitude) ? String(message.longitude) : message.longitude;
            return object;
        };

        /**
         * Converts this Geo to JSON.
         * @function toJSON
         * @memberof beacon_slots.Geo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Geo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Geo
         * @function getTypeUrl
         * @memberof beacon_slots.Geo
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Geo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.Geo";
        };

        return Geo;
    })();

    beacon_slots.Node = (function() {

        /**
         * Properties of a Node.
         * @memberof beacon_slots
         * @interface INode
         * @property {string|null} [name] Node name
         * @property {string|null} [username] Node username
         * @property {beacon_slots.IGeo|null} [geo] Node geo
         */

        /**
         * Constructs a new Node.
         * @memberof beacon_slots
         * @classdesc Represents a Node.
         * @implements INode
         * @constructor
         * @param {beacon_slots.INode=} [properties] Properties to set
         */
        function Node(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Node name.
         * @member {string} name
         * @memberof beacon_slots.Node
         * @instance
         */
        Node.prototype.name = "";

        /**
         * Node username.
         * @member {string} username
         * @memberof beacon_slots.Node
         * @instance
         */
        Node.prototype.username = "";

        /**
         * Node geo.
         * @member {beacon_slots.IGeo|null|undefined} geo
         * @memberof beacon_slots.Node
         * @instance
         */
        Node.prototype.geo = null;

        /**
         * Creates a new Node instance using the specified properties.
         * @function create
         * @memberof beacon_slots.Node
         * @static
         * @param {beacon_slots.INode=} [properties] Properties to set
         * @returns {beacon_slots.Node} Node instance
         */
        Node.create = function create(properties) {
            return new Node(properties);
        };

        /**
         * Encodes the specified Node message. Does not implicitly {@link beacon_slots.Node.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.Node
         * @static
         * @param {beacon_slots.INode} message Node message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Node.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
            if (message.username != null && Object.hasOwnProperty.call(message, "username"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.username);
            if (message.geo != null && Object.hasOwnProperty.call(message, "geo"))
                $root.beacon_slots.Geo.encode(message.geo, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Node message, length delimited. Does not implicitly {@link beacon_slots.Node.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.Node
         * @static
         * @param {beacon_slots.INode} message Node message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Node.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Node message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.Node
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.Node} Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Node.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.Node();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.name = reader.string();
                        break;
                    }
                case 2: {
                        message.username = reader.string();
                        break;
                    }
                case 3: {
                        message.geo = $root.beacon_slots.Geo.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Node message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.Node
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.Node} Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Node.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Node message.
         * @function verify
         * @memberof beacon_slots.Node
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Node.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.username != null && message.hasOwnProperty("username"))
                if (!$util.isString(message.username))
                    return "username: string expected";
            if (message.geo != null && message.hasOwnProperty("geo")) {
                var error = $root.beacon_slots.Geo.verify(message.geo);
                if (error)
                    return "geo." + error;
            }
            return null;
        };

        /**
         * Creates a Node message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.Node
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.Node} Node
         */
        Node.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.Node)
                return object;
            var message = new $root.beacon_slots.Node();
            if (object.name != null)
                message.name = String(object.name);
            if (object.username != null)
                message.username = String(object.username);
            if (object.geo != null) {
                if (typeof object.geo !== "object")
                    throw TypeError(".beacon_slots.Node.geo: object expected");
                message.geo = $root.beacon_slots.Geo.fromObject(object.geo);
            }
            return message;
        };

        /**
         * Creates a plain object from a Node message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.Node
         * @static
         * @param {beacon_slots.Node} message Node
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Node.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.name = "";
                object.username = "";
                object.geo = null;
            }
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.username != null && message.hasOwnProperty("username"))
                object.username = message.username;
            if (message.geo != null && message.hasOwnProperty("geo"))
                object.geo = $root.beacon_slots.Geo.toObject(message.geo, options);
            return object;
        };

        /**
         * Converts this Node to JSON.
         * @function toJSON
         * @memberof beacon_slots.Node
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Node.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Node
         * @function getTypeUrl
         * @memberof beacon_slots.Node
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Node.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.Node";
        };

        return Node;
    })();

    beacon_slots.Proposer = (function() {

        /**
         * Properties of a Proposer.
         * @memberof beacon_slots
         * @interface IProposer
         * @property {number|Long|null} [slot] Proposer slot
         * @property {number|Long|null} [proposerValidatorIndex] Proposer proposerValidatorIndex
         */

        /**
         * Constructs a new Proposer.
         * @memberof beacon_slots
         * @classdesc Represents a Proposer.
         * @implements IProposer
         * @constructor
         * @param {beacon_slots.IProposer=} [properties] Properties to set
         */
        function Proposer(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Proposer slot.
         * @member {number|Long} slot
         * @memberof beacon_slots.Proposer
         * @instance
         */
        Proposer.prototype.slot = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Proposer proposerValidatorIndex.
         * @member {number|Long} proposerValidatorIndex
         * @memberof beacon_slots.Proposer
         * @instance
         */
        Proposer.prototype.proposerValidatorIndex = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new Proposer instance using the specified properties.
         * @function create
         * @memberof beacon_slots.Proposer
         * @static
         * @param {beacon_slots.IProposer=} [properties] Properties to set
         * @returns {beacon_slots.Proposer} Proposer instance
         */
        Proposer.create = function create(properties) {
            return new Proposer(properties);
        };

        /**
         * Encodes the specified Proposer message. Does not implicitly {@link beacon_slots.Proposer.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.Proposer
         * @static
         * @param {beacon_slots.IProposer} message Proposer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Proposer.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slot != null && Object.hasOwnProperty.call(message, "slot"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.slot);
            if (message.proposerValidatorIndex != null && Object.hasOwnProperty.call(message, "proposerValidatorIndex"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.proposerValidatorIndex);
            return writer;
        };

        /**
         * Encodes the specified Proposer message, length delimited. Does not implicitly {@link beacon_slots.Proposer.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.Proposer
         * @static
         * @param {beacon_slots.IProposer} message Proposer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Proposer.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Proposer message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.Proposer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.Proposer} Proposer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Proposer.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.Proposer();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slot = reader.int64();
                        break;
                    }
                case 2: {
                        message.proposerValidatorIndex = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Proposer message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.Proposer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.Proposer} Proposer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Proposer.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Proposer message.
         * @function verify
         * @memberof beacon_slots.Proposer
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Proposer.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (!$util.isInteger(message.slot) && !(message.slot && $util.isInteger(message.slot.low) && $util.isInteger(message.slot.high)))
                    return "slot: integer|Long expected";
            if (message.proposerValidatorIndex != null && message.hasOwnProperty("proposerValidatorIndex"))
                if (!$util.isInteger(message.proposerValidatorIndex) && !(message.proposerValidatorIndex && $util.isInteger(message.proposerValidatorIndex.low) && $util.isInteger(message.proposerValidatorIndex.high)))
                    return "proposerValidatorIndex: integer|Long expected";
            return null;
        };

        /**
         * Creates a Proposer message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.Proposer
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.Proposer} Proposer
         */
        Proposer.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.Proposer)
                return object;
            var message = new $root.beacon_slots.Proposer();
            if (object.slot != null)
                if ($util.Long)
                    (message.slot = $util.Long.fromValue(object.slot)).unsigned = false;
                else if (typeof object.slot === "string")
                    message.slot = parseInt(object.slot, 10);
                else if (typeof object.slot === "number")
                    message.slot = object.slot;
                else if (typeof object.slot === "object")
                    message.slot = new $util.LongBits(object.slot.low >>> 0, object.slot.high >>> 0).toNumber();
            if (object.proposerValidatorIndex != null)
                if ($util.Long)
                    (message.proposerValidatorIndex = $util.Long.fromValue(object.proposerValidatorIndex)).unsigned = false;
                else if (typeof object.proposerValidatorIndex === "string")
                    message.proposerValidatorIndex = parseInt(object.proposerValidatorIndex, 10);
                else if (typeof object.proposerValidatorIndex === "number")
                    message.proposerValidatorIndex = object.proposerValidatorIndex;
                else if (typeof object.proposerValidatorIndex === "object")
                    message.proposerValidatorIndex = new $util.LongBits(object.proposerValidatorIndex.low >>> 0, object.proposerValidatorIndex.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a Proposer message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.Proposer
         * @static
         * @param {beacon_slots.Proposer} message Proposer
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Proposer.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.slot = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slot = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.proposerValidatorIndex = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.proposerValidatorIndex = options.longs === String ? "0" : 0;
            }
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (typeof message.slot === "number")
                    object.slot = options.longs === String ? String(message.slot) : message.slot;
                else
                    object.slot = options.longs === String ? $util.Long.prototype.toString.call(message.slot) : options.longs === Number ? new $util.LongBits(message.slot.low >>> 0, message.slot.high >>> 0).toNumber() : message.slot;
            if (message.proposerValidatorIndex != null && message.hasOwnProperty("proposerValidatorIndex"))
                if (typeof message.proposerValidatorIndex === "number")
                    object.proposerValidatorIndex = options.longs === String ? String(message.proposerValidatorIndex) : message.proposerValidatorIndex;
                else
                    object.proposerValidatorIndex = options.longs === String ? $util.Long.prototype.toString.call(message.proposerValidatorIndex) : options.longs === Number ? new $util.LongBits(message.proposerValidatorIndex.low >>> 0, message.proposerValidatorIndex.high >>> 0).toNumber() : message.proposerValidatorIndex;
            return object;
        };

        /**
         * Converts this Proposer to JSON.
         * @function toJSON
         * @memberof beacon_slots.Proposer
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Proposer.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Proposer
         * @function getTypeUrl
         * @memberof beacon_slots.Proposer
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Proposer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.Proposer";
        };

        return Proposer;
    })();

    beacon_slots.BlockData = (function() {

        /**
         * Properties of a BlockData.
         * @memberof beacon_slots
         * @interface IBlockData
         * @property {number|Long|null} [slot] BlockData slot
         * @property {string|null} [slotStartDateTime] BlockData slotStartDateTime
         * @property {number|Long|null} [epoch] BlockData epoch
         * @property {string|null} [epochStartDateTime] BlockData epochStartDateTime
         * @property {string|null} [blockRoot] BlockData blockRoot
         * @property {string|null} [blockVersion] BlockData blockVersion
         * @property {number|Long|null} [blockTotalBytes] BlockData blockTotalBytes
         * @property {number|Long|null} [blockTotalBytesCompressed] BlockData blockTotalBytesCompressed
         * @property {string|null} [parentRoot] BlockData parentRoot
         * @property {string|null} [stateRoot] BlockData stateRoot
         * @property {number|Long|null} [proposerIndex] BlockData proposerIndex
         * @property {string|null} [eth1DataBlockHash] BlockData eth1DataBlockHash
         * @property {string|null} [eth1DataDepositRoot] BlockData eth1DataDepositRoot
         * @property {string|null} [executionPayloadBlockHash] BlockData executionPayloadBlockHash
         * @property {number|Long|null} [executionPayloadBlockNumber] BlockData executionPayloadBlockNumber
         * @property {string|null} [executionPayloadFeeRecipient] BlockData executionPayloadFeeRecipient
         * @property {number|Long|null} [executionPayloadBaseFeePerGas] BlockData executionPayloadBaseFeePerGas
         * @property {number|Long|null} [executionPayloadBlobGasUsed] BlockData executionPayloadBlobGasUsed
         * @property {number|Long|null} [executionPayloadExcessBlobGas] BlockData executionPayloadExcessBlobGas
         * @property {number|Long|null} [executionPayloadGasLimit] BlockData executionPayloadGasLimit
         * @property {number|Long|null} [executionPayloadGasUsed] BlockData executionPayloadGasUsed
         * @property {string|null} [executionPayloadStateRoot] BlockData executionPayloadStateRoot
         * @property {string|null} [executionPayloadParentHash] BlockData executionPayloadParentHash
         * @property {number|Long|null} [executionPayloadTransactionsCount] BlockData executionPayloadTransactionsCount
         * @property {number|Long|null} [executionPayloadTransactionsTotalBytes] BlockData executionPayloadTransactionsTotalBytes
         * @property {number|Long|null} [executionPayloadTransactionsTotalBytesCompressed] BlockData executionPayloadTransactionsTotalBytesCompressed
         */

        /**
         * Constructs a new BlockData.
         * @memberof beacon_slots
         * @classdesc Represents a BlockData.
         * @implements IBlockData
         * @constructor
         * @param {beacon_slots.IBlockData=} [properties] Properties to set
         */
        function BlockData(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlockData slot.
         * @member {number|Long} slot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.slot = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData slotStartDateTime.
         * @member {string} slotStartDateTime
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.slotStartDateTime = "";

        /**
         * BlockData epoch.
         * @member {number|Long} epoch
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.epoch = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData epochStartDateTime.
         * @member {string} epochStartDateTime
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.epochStartDateTime = "";

        /**
         * BlockData blockRoot.
         * @member {string} blockRoot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.blockRoot = "";

        /**
         * BlockData blockVersion.
         * @member {string} blockVersion
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.blockVersion = "";

        /**
         * BlockData blockTotalBytes.
         * @member {number|Long} blockTotalBytes
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.blockTotalBytes = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData blockTotalBytesCompressed.
         * @member {number|Long} blockTotalBytesCompressed
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.blockTotalBytesCompressed = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData parentRoot.
         * @member {string} parentRoot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.parentRoot = "";

        /**
         * BlockData stateRoot.
         * @member {string} stateRoot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.stateRoot = "";

        /**
         * BlockData proposerIndex.
         * @member {number|Long} proposerIndex
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.proposerIndex = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData eth1DataBlockHash.
         * @member {string} eth1DataBlockHash
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.eth1DataBlockHash = "";

        /**
         * BlockData eth1DataDepositRoot.
         * @member {string} eth1DataDepositRoot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.eth1DataDepositRoot = "";

        /**
         * BlockData executionPayloadBlockHash.
         * @member {string} executionPayloadBlockHash
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadBlockHash = "";

        /**
         * BlockData executionPayloadBlockNumber.
         * @member {number|Long} executionPayloadBlockNumber
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadBlockNumber = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadFeeRecipient.
         * @member {string} executionPayloadFeeRecipient
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadFeeRecipient = "";

        /**
         * BlockData executionPayloadBaseFeePerGas.
         * @member {number|Long} executionPayloadBaseFeePerGas
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadBaseFeePerGas = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadBlobGasUsed.
         * @member {number|Long} executionPayloadBlobGasUsed
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadBlobGasUsed = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadExcessBlobGas.
         * @member {number|Long} executionPayloadExcessBlobGas
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadExcessBlobGas = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadGasLimit.
         * @member {number|Long} executionPayloadGasLimit
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadGasLimit = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadGasUsed.
         * @member {number|Long} executionPayloadGasUsed
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadGasUsed = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadStateRoot.
         * @member {string} executionPayloadStateRoot
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadStateRoot = "";

        /**
         * BlockData executionPayloadParentHash.
         * @member {string} executionPayloadParentHash
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadParentHash = "";

        /**
         * BlockData executionPayloadTransactionsCount.
         * @member {number|Long} executionPayloadTransactionsCount
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadTransactionsCount = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadTransactionsTotalBytes.
         * @member {number|Long} executionPayloadTransactionsTotalBytes
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadTransactionsTotalBytes = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockData executionPayloadTransactionsTotalBytesCompressed.
         * @member {number|Long} executionPayloadTransactionsTotalBytesCompressed
         * @memberof beacon_slots.BlockData
         * @instance
         */
        BlockData.prototype.executionPayloadTransactionsTotalBytesCompressed = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new BlockData instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BlockData
         * @static
         * @param {beacon_slots.IBlockData=} [properties] Properties to set
         * @returns {beacon_slots.BlockData} BlockData instance
         */
        BlockData.create = function create(properties) {
            return new BlockData(properties);
        };

        /**
         * Encodes the specified BlockData message. Does not implicitly {@link beacon_slots.BlockData.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BlockData
         * @static
         * @param {beacon_slots.IBlockData} message BlockData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlockData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slot != null && Object.hasOwnProperty.call(message, "slot"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.slot);
            if (message.slotStartDateTime != null && Object.hasOwnProperty.call(message, "slotStartDateTime"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.slotStartDateTime);
            if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.epoch);
            if (message.epochStartDateTime != null && Object.hasOwnProperty.call(message, "epochStartDateTime"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.epochStartDateTime);
            if (message.blockRoot != null && Object.hasOwnProperty.call(message, "blockRoot"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.blockRoot);
            if (message.blockVersion != null && Object.hasOwnProperty.call(message, "blockVersion"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.blockVersion);
            if (message.blockTotalBytes != null && Object.hasOwnProperty.call(message, "blockTotalBytes"))
                writer.uint32(/* id 7, wireType 0 =*/56).int64(message.blockTotalBytes);
            if (message.blockTotalBytesCompressed != null && Object.hasOwnProperty.call(message, "blockTotalBytesCompressed"))
                writer.uint32(/* id 8, wireType 0 =*/64).int64(message.blockTotalBytesCompressed);
            if (message.parentRoot != null && Object.hasOwnProperty.call(message, "parentRoot"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.parentRoot);
            if (message.stateRoot != null && Object.hasOwnProperty.call(message, "stateRoot"))
                writer.uint32(/* id 10, wireType 2 =*/82).string(message.stateRoot);
            if (message.proposerIndex != null && Object.hasOwnProperty.call(message, "proposerIndex"))
                writer.uint32(/* id 11, wireType 0 =*/88).int64(message.proposerIndex);
            if (message.eth1DataBlockHash != null && Object.hasOwnProperty.call(message, "eth1DataBlockHash"))
                writer.uint32(/* id 12, wireType 2 =*/98).string(message.eth1DataBlockHash);
            if (message.eth1DataDepositRoot != null && Object.hasOwnProperty.call(message, "eth1DataDepositRoot"))
                writer.uint32(/* id 13, wireType 2 =*/106).string(message.eth1DataDepositRoot);
            if (message.executionPayloadBlockHash != null && Object.hasOwnProperty.call(message, "executionPayloadBlockHash"))
                writer.uint32(/* id 14, wireType 2 =*/114).string(message.executionPayloadBlockHash);
            if (message.executionPayloadBlockNumber != null && Object.hasOwnProperty.call(message, "executionPayloadBlockNumber"))
                writer.uint32(/* id 15, wireType 0 =*/120).int64(message.executionPayloadBlockNumber);
            if (message.executionPayloadFeeRecipient != null && Object.hasOwnProperty.call(message, "executionPayloadFeeRecipient"))
                writer.uint32(/* id 16, wireType 2 =*/130).string(message.executionPayloadFeeRecipient);
            if (message.executionPayloadBaseFeePerGas != null && Object.hasOwnProperty.call(message, "executionPayloadBaseFeePerGas"))
                writer.uint32(/* id 17, wireType 0 =*/136).int64(message.executionPayloadBaseFeePerGas);
            if (message.executionPayloadBlobGasUsed != null && Object.hasOwnProperty.call(message, "executionPayloadBlobGasUsed"))
                writer.uint32(/* id 18, wireType 0 =*/144).int64(message.executionPayloadBlobGasUsed);
            if (message.executionPayloadExcessBlobGas != null && Object.hasOwnProperty.call(message, "executionPayloadExcessBlobGas"))
                writer.uint32(/* id 19, wireType 0 =*/152).int64(message.executionPayloadExcessBlobGas);
            if (message.executionPayloadGasLimit != null && Object.hasOwnProperty.call(message, "executionPayloadGasLimit"))
                writer.uint32(/* id 20, wireType 0 =*/160).int64(message.executionPayloadGasLimit);
            if (message.executionPayloadGasUsed != null && Object.hasOwnProperty.call(message, "executionPayloadGasUsed"))
                writer.uint32(/* id 21, wireType 0 =*/168).int64(message.executionPayloadGasUsed);
            if (message.executionPayloadStateRoot != null && Object.hasOwnProperty.call(message, "executionPayloadStateRoot"))
                writer.uint32(/* id 22, wireType 2 =*/178).string(message.executionPayloadStateRoot);
            if (message.executionPayloadParentHash != null && Object.hasOwnProperty.call(message, "executionPayloadParentHash"))
                writer.uint32(/* id 23, wireType 2 =*/186).string(message.executionPayloadParentHash);
            if (message.executionPayloadTransactionsCount != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsCount"))
                writer.uint32(/* id 24, wireType 0 =*/192).int64(message.executionPayloadTransactionsCount);
            if (message.executionPayloadTransactionsTotalBytes != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsTotalBytes"))
                writer.uint32(/* id 25, wireType 0 =*/200).int64(message.executionPayloadTransactionsTotalBytes);
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsTotalBytesCompressed"))
                writer.uint32(/* id 26, wireType 0 =*/208).int64(message.executionPayloadTransactionsTotalBytesCompressed);
            return writer;
        };

        /**
         * Encodes the specified BlockData message, length delimited. Does not implicitly {@link beacon_slots.BlockData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BlockData
         * @static
         * @param {beacon_slots.IBlockData} message BlockData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlockData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlockData message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BlockData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BlockData} BlockData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlockData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BlockData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slot = reader.int64();
                        break;
                    }
                case 2: {
                        message.slotStartDateTime = reader.string();
                        break;
                    }
                case 3: {
                        message.epoch = reader.int64();
                        break;
                    }
                case 4: {
                        message.epochStartDateTime = reader.string();
                        break;
                    }
                case 5: {
                        message.blockRoot = reader.string();
                        break;
                    }
                case 6: {
                        message.blockVersion = reader.string();
                        break;
                    }
                case 7: {
                        message.blockTotalBytes = reader.int64();
                        break;
                    }
                case 8: {
                        message.blockTotalBytesCompressed = reader.int64();
                        break;
                    }
                case 9: {
                        message.parentRoot = reader.string();
                        break;
                    }
                case 10: {
                        message.stateRoot = reader.string();
                        break;
                    }
                case 11: {
                        message.proposerIndex = reader.int64();
                        break;
                    }
                case 12: {
                        message.eth1DataBlockHash = reader.string();
                        break;
                    }
                case 13: {
                        message.eth1DataDepositRoot = reader.string();
                        break;
                    }
                case 14: {
                        message.executionPayloadBlockHash = reader.string();
                        break;
                    }
                case 15: {
                        message.executionPayloadBlockNumber = reader.int64();
                        break;
                    }
                case 16: {
                        message.executionPayloadFeeRecipient = reader.string();
                        break;
                    }
                case 17: {
                        message.executionPayloadBaseFeePerGas = reader.int64();
                        break;
                    }
                case 18: {
                        message.executionPayloadBlobGasUsed = reader.int64();
                        break;
                    }
                case 19: {
                        message.executionPayloadExcessBlobGas = reader.int64();
                        break;
                    }
                case 20: {
                        message.executionPayloadGasLimit = reader.int64();
                        break;
                    }
                case 21: {
                        message.executionPayloadGasUsed = reader.int64();
                        break;
                    }
                case 22: {
                        message.executionPayloadStateRoot = reader.string();
                        break;
                    }
                case 23: {
                        message.executionPayloadParentHash = reader.string();
                        break;
                    }
                case 24: {
                        message.executionPayloadTransactionsCount = reader.int64();
                        break;
                    }
                case 25: {
                        message.executionPayloadTransactionsTotalBytes = reader.int64();
                        break;
                    }
                case 26: {
                        message.executionPayloadTransactionsTotalBytesCompressed = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BlockData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BlockData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BlockData} BlockData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlockData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlockData message.
         * @function verify
         * @memberof beacon_slots.BlockData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlockData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (!$util.isInteger(message.slot) && !(message.slot && $util.isInteger(message.slot.low) && $util.isInteger(message.slot.high)))
                    return "slot: integer|Long expected";
            if (message.slotStartDateTime != null && message.hasOwnProperty("slotStartDateTime"))
                if (!$util.isString(message.slotStartDateTime))
                    return "slotStartDateTime: string expected";
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                if (!$util.isInteger(message.epoch) && !(message.epoch && $util.isInteger(message.epoch.low) && $util.isInteger(message.epoch.high)))
                    return "epoch: integer|Long expected";
            if (message.epochStartDateTime != null && message.hasOwnProperty("epochStartDateTime"))
                if (!$util.isString(message.epochStartDateTime))
                    return "epochStartDateTime: string expected";
            if (message.blockRoot != null && message.hasOwnProperty("blockRoot"))
                if (!$util.isString(message.blockRoot))
                    return "blockRoot: string expected";
            if (message.blockVersion != null && message.hasOwnProperty("blockVersion"))
                if (!$util.isString(message.blockVersion))
                    return "blockVersion: string expected";
            if (message.blockTotalBytes != null && message.hasOwnProperty("blockTotalBytes"))
                if (!$util.isInteger(message.blockTotalBytes) && !(message.blockTotalBytes && $util.isInteger(message.blockTotalBytes.low) && $util.isInteger(message.blockTotalBytes.high)))
                    return "blockTotalBytes: integer|Long expected";
            if (message.blockTotalBytesCompressed != null && message.hasOwnProperty("blockTotalBytesCompressed"))
                if (!$util.isInteger(message.blockTotalBytesCompressed) && !(message.blockTotalBytesCompressed && $util.isInteger(message.blockTotalBytesCompressed.low) && $util.isInteger(message.blockTotalBytesCompressed.high)))
                    return "blockTotalBytesCompressed: integer|Long expected";
            if (message.parentRoot != null && message.hasOwnProperty("parentRoot"))
                if (!$util.isString(message.parentRoot))
                    return "parentRoot: string expected";
            if (message.stateRoot != null && message.hasOwnProperty("stateRoot"))
                if (!$util.isString(message.stateRoot))
                    return "stateRoot: string expected";
            if (message.proposerIndex != null && message.hasOwnProperty("proposerIndex"))
                if (!$util.isInteger(message.proposerIndex) && !(message.proposerIndex && $util.isInteger(message.proposerIndex.low) && $util.isInteger(message.proposerIndex.high)))
                    return "proposerIndex: integer|Long expected";
            if (message.eth1DataBlockHash != null && message.hasOwnProperty("eth1DataBlockHash"))
                if (!$util.isString(message.eth1DataBlockHash))
                    return "eth1DataBlockHash: string expected";
            if (message.eth1DataDepositRoot != null && message.hasOwnProperty("eth1DataDepositRoot"))
                if (!$util.isString(message.eth1DataDepositRoot))
                    return "eth1DataDepositRoot: string expected";
            if (message.executionPayloadBlockHash != null && message.hasOwnProperty("executionPayloadBlockHash"))
                if (!$util.isString(message.executionPayloadBlockHash))
                    return "executionPayloadBlockHash: string expected";
            if (message.executionPayloadBlockNumber != null && message.hasOwnProperty("executionPayloadBlockNumber"))
                if (!$util.isInteger(message.executionPayloadBlockNumber) && !(message.executionPayloadBlockNumber && $util.isInteger(message.executionPayloadBlockNumber.low) && $util.isInteger(message.executionPayloadBlockNumber.high)))
                    return "executionPayloadBlockNumber: integer|Long expected";
            if (message.executionPayloadFeeRecipient != null && message.hasOwnProperty("executionPayloadFeeRecipient"))
                if (!$util.isString(message.executionPayloadFeeRecipient))
                    return "executionPayloadFeeRecipient: string expected";
            if (message.executionPayloadBaseFeePerGas != null && message.hasOwnProperty("executionPayloadBaseFeePerGas"))
                if (!$util.isInteger(message.executionPayloadBaseFeePerGas) && !(message.executionPayloadBaseFeePerGas && $util.isInteger(message.executionPayloadBaseFeePerGas.low) && $util.isInteger(message.executionPayloadBaseFeePerGas.high)))
                    return "executionPayloadBaseFeePerGas: integer|Long expected";
            if (message.executionPayloadBlobGasUsed != null && message.hasOwnProperty("executionPayloadBlobGasUsed"))
                if (!$util.isInteger(message.executionPayloadBlobGasUsed) && !(message.executionPayloadBlobGasUsed && $util.isInteger(message.executionPayloadBlobGasUsed.low) && $util.isInteger(message.executionPayloadBlobGasUsed.high)))
                    return "executionPayloadBlobGasUsed: integer|Long expected";
            if (message.executionPayloadExcessBlobGas != null && message.hasOwnProperty("executionPayloadExcessBlobGas"))
                if (!$util.isInteger(message.executionPayloadExcessBlobGas) && !(message.executionPayloadExcessBlobGas && $util.isInteger(message.executionPayloadExcessBlobGas.low) && $util.isInteger(message.executionPayloadExcessBlobGas.high)))
                    return "executionPayloadExcessBlobGas: integer|Long expected";
            if (message.executionPayloadGasLimit != null && message.hasOwnProperty("executionPayloadGasLimit"))
                if (!$util.isInteger(message.executionPayloadGasLimit) && !(message.executionPayloadGasLimit && $util.isInteger(message.executionPayloadGasLimit.low) && $util.isInteger(message.executionPayloadGasLimit.high)))
                    return "executionPayloadGasLimit: integer|Long expected";
            if (message.executionPayloadGasUsed != null && message.hasOwnProperty("executionPayloadGasUsed"))
                if (!$util.isInteger(message.executionPayloadGasUsed) && !(message.executionPayloadGasUsed && $util.isInteger(message.executionPayloadGasUsed.low) && $util.isInteger(message.executionPayloadGasUsed.high)))
                    return "executionPayloadGasUsed: integer|Long expected";
            if (message.executionPayloadStateRoot != null && message.hasOwnProperty("executionPayloadStateRoot"))
                if (!$util.isString(message.executionPayloadStateRoot))
                    return "executionPayloadStateRoot: string expected";
            if (message.executionPayloadParentHash != null && message.hasOwnProperty("executionPayloadParentHash"))
                if (!$util.isString(message.executionPayloadParentHash))
                    return "executionPayloadParentHash: string expected";
            if (message.executionPayloadTransactionsCount != null && message.hasOwnProperty("executionPayloadTransactionsCount"))
                if (!$util.isInteger(message.executionPayloadTransactionsCount) && !(message.executionPayloadTransactionsCount && $util.isInteger(message.executionPayloadTransactionsCount.low) && $util.isInteger(message.executionPayloadTransactionsCount.high)))
                    return "executionPayloadTransactionsCount: integer|Long expected";
            if (message.executionPayloadTransactionsTotalBytes != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytes"))
                if (!$util.isInteger(message.executionPayloadTransactionsTotalBytes) && !(message.executionPayloadTransactionsTotalBytes && $util.isInteger(message.executionPayloadTransactionsTotalBytes.low) && $util.isInteger(message.executionPayloadTransactionsTotalBytes.high)))
                    return "executionPayloadTransactionsTotalBytes: integer|Long expected";
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytesCompressed"))
                if (!$util.isInteger(message.executionPayloadTransactionsTotalBytesCompressed) && !(message.executionPayloadTransactionsTotalBytesCompressed && $util.isInteger(message.executionPayloadTransactionsTotalBytesCompressed.low) && $util.isInteger(message.executionPayloadTransactionsTotalBytesCompressed.high)))
                    return "executionPayloadTransactionsTotalBytesCompressed: integer|Long expected";
            return null;
        };

        /**
         * Creates a BlockData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BlockData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BlockData} BlockData
         */
        BlockData.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BlockData)
                return object;
            var message = new $root.beacon_slots.BlockData();
            if (object.slot != null)
                if ($util.Long)
                    (message.slot = $util.Long.fromValue(object.slot)).unsigned = false;
                else if (typeof object.slot === "string")
                    message.slot = parseInt(object.slot, 10);
                else if (typeof object.slot === "number")
                    message.slot = object.slot;
                else if (typeof object.slot === "object")
                    message.slot = new $util.LongBits(object.slot.low >>> 0, object.slot.high >>> 0).toNumber();
            if (object.slotStartDateTime != null)
                message.slotStartDateTime = String(object.slotStartDateTime);
            if (object.epoch != null)
                if ($util.Long)
                    (message.epoch = $util.Long.fromValue(object.epoch)).unsigned = false;
                else if (typeof object.epoch === "string")
                    message.epoch = parseInt(object.epoch, 10);
                else if (typeof object.epoch === "number")
                    message.epoch = object.epoch;
                else if (typeof object.epoch === "object")
                    message.epoch = new $util.LongBits(object.epoch.low >>> 0, object.epoch.high >>> 0).toNumber();
            if (object.epochStartDateTime != null)
                message.epochStartDateTime = String(object.epochStartDateTime);
            if (object.blockRoot != null)
                message.blockRoot = String(object.blockRoot);
            if (object.blockVersion != null)
                message.blockVersion = String(object.blockVersion);
            if (object.blockTotalBytes != null)
                if ($util.Long)
                    (message.blockTotalBytes = $util.Long.fromValue(object.blockTotalBytes)).unsigned = false;
                else if (typeof object.blockTotalBytes === "string")
                    message.blockTotalBytes = parseInt(object.blockTotalBytes, 10);
                else if (typeof object.blockTotalBytes === "number")
                    message.blockTotalBytes = object.blockTotalBytes;
                else if (typeof object.blockTotalBytes === "object")
                    message.blockTotalBytes = new $util.LongBits(object.blockTotalBytes.low >>> 0, object.blockTotalBytes.high >>> 0).toNumber();
            if (object.blockTotalBytesCompressed != null)
                if ($util.Long)
                    (message.blockTotalBytesCompressed = $util.Long.fromValue(object.blockTotalBytesCompressed)).unsigned = false;
                else if (typeof object.blockTotalBytesCompressed === "string")
                    message.blockTotalBytesCompressed = parseInt(object.blockTotalBytesCompressed, 10);
                else if (typeof object.blockTotalBytesCompressed === "number")
                    message.blockTotalBytesCompressed = object.blockTotalBytesCompressed;
                else if (typeof object.blockTotalBytesCompressed === "object")
                    message.blockTotalBytesCompressed = new $util.LongBits(object.blockTotalBytesCompressed.low >>> 0, object.blockTotalBytesCompressed.high >>> 0).toNumber();
            if (object.parentRoot != null)
                message.parentRoot = String(object.parentRoot);
            if (object.stateRoot != null)
                message.stateRoot = String(object.stateRoot);
            if (object.proposerIndex != null)
                if ($util.Long)
                    (message.proposerIndex = $util.Long.fromValue(object.proposerIndex)).unsigned = false;
                else if (typeof object.proposerIndex === "string")
                    message.proposerIndex = parseInt(object.proposerIndex, 10);
                else if (typeof object.proposerIndex === "number")
                    message.proposerIndex = object.proposerIndex;
                else if (typeof object.proposerIndex === "object")
                    message.proposerIndex = new $util.LongBits(object.proposerIndex.low >>> 0, object.proposerIndex.high >>> 0).toNumber();
            if (object.eth1DataBlockHash != null)
                message.eth1DataBlockHash = String(object.eth1DataBlockHash);
            if (object.eth1DataDepositRoot != null)
                message.eth1DataDepositRoot = String(object.eth1DataDepositRoot);
            if (object.executionPayloadBlockHash != null)
                message.executionPayloadBlockHash = String(object.executionPayloadBlockHash);
            if (object.executionPayloadBlockNumber != null)
                if ($util.Long)
                    (message.executionPayloadBlockNumber = $util.Long.fromValue(object.executionPayloadBlockNumber)).unsigned = false;
                else if (typeof object.executionPayloadBlockNumber === "string")
                    message.executionPayloadBlockNumber = parseInt(object.executionPayloadBlockNumber, 10);
                else if (typeof object.executionPayloadBlockNumber === "number")
                    message.executionPayloadBlockNumber = object.executionPayloadBlockNumber;
                else if (typeof object.executionPayloadBlockNumber === "object")
                    message.executionPayloadBlockNumber = new $util.LongBits(object.executionPayloadBlockNumber.low >>> 0, object.executionPayloadBlockNumber.high >>> 0).toNumber();
            if (object.executionPayloadFeeRecipient != null)
                message.executionPayloadFeeRecipient = String(object.executionPayloadFeeRecipient);
            if (object.executionPayloadBaseFeePerGas != null)
                if ($util.Long)
                    (message.executionPayloadBaseFeePerGas = $util.Long.fromValue(object.executionPayloadBaseFeePerGas)).unsigned = false;
                else if (typeof object.executionPayloadBaseFeePerGas === "string")
                    message.executionPayloadBaseFeePerGas = parseInt(object.executionPayloadBaseFeePerGas, 10);
                else if (typeof object.executionPayloadBaseFeePerGas === "number")
                    message.executionPayloadBaseFeePerGas = object.executionPayloadBaseFeePerGas;
                else if (typeof object.executionPayloadBaseFeePerGas === "object")
                    message.executionPayloadBaseFeePerGas = new $util.LongBits(object.executionPayloadBaseFeePerGas.low >>> 0, object.executionPayloadBaseFeePerGas.high >>> 0).toNumber();
            if (object.executionPayloadBlobGasUsed != null)
                if ($util.Long)
                    (message.executionPayloadBlobGasUsed = $util.Long.fromValue(object.executionPayloadBlobGasUsed)).unsigned = false;
                else if (typeof object.executionPayloadBlobGasUsed === "string")
                    message.executionPayloadBlobGasUsed = parseInt(object.executionPayloadBlobGasUsed, 10);
                else if (typeof object.executionPayloadBlobGasUsed === "number")
                    message.executionPayloadBlobGasUsed = object.executionPayloadBlobGasUsed;
                else if (typeof object.executionPayloadBlobGasUsed === "object")
                    message.executionPayloadBlobGasUsed = new $util.LongBits(object.executionPayloadBlobGasUsed.low >>> 0, object.executionPayloadBlobGasUsed.high >>> 0).toNumber();
            if (object.executionPayloadExcessBlobGas != null)
                if ($util.Long)
                    (message.executionPayloadExcessBlobGas = $util.Long.fromValue(object.executionPayloadExcessBlobGas)).unsigned = false;
                else if (typeof object.executionPayloadExcessBlobGas === "string")
                    message.executionPayloadExcessBlobGas = parseInt(object.executionPayloadExcessBlobGas, 10);
                else if (typeof object.executionPayloadExcessBlobGas === "number")
                    message.executionPayloadExcessBlobGas = object.executionPayloadExcessBlobGas;
                else if (typeof object.executionPayloadExcessBlobGas === "object")
                    message.executionPayloadExcessBlobGas = new $util.LongBits(object.executionPayloadExcessBlobGas.low >>> 0, object.executionPayloadExcessBlobGas.high >>> 0).toNumber();
            if (object.executionPayloadGasLimit != null)
                if ($util.Long)
                    (message.executionPayloadGasLimit = $util.Long.fromValue(object.executionPayloadGasLimit)).unsigned = false;
                else if (typeof object.executionPayloadGasLimit === "string")
                    message.executionPayloadGasLimit = parseInt(object.executionPayloadGasLimit, 10);
                else if (typeof object.executionPayloadGasLimit === "number")
                    message.executionPayloadGasLimit = object.executionPayloadGasLimit;
                else if (typeof object.executionPayloadGasLimit === "object")
                    message.executionPayloadGasLimit = new $util.LongBits(object.executionPayloadGasLimit.low >>> 0, object.executionPayloadGasLimit.high >>> 0).toNumber();
            if (object.executionPayloadGasUsed != null)
                if ($util.Long)
                    (message.executionPayloadGasUsed = $util.Long.fromValue(object.executionPayloadGasUsed)).unsigned = false;
                else if (typeof object.executionPayloadGasUsed === "string")
                    message.executionPayloadGasUsed = parseInt(object.executionPayloadGasUsed, 10);
                else if (typeof object.executionPayloadGasUsed === "number")
                    message.executionPayloadGasUsed = object.executionPayloadGasUsed;
                else if (typeof object.executionPayloadGasUsed === "object")
                    message.executionPayloadGasUsed = new $util.LongBits(object.executionPayloadGasUsed.low >>> 0, object.executionPayloadGasUsed.high >>> 0).toNumber();
            if (object.executionPayloadStateRoot != null)
                message.executionPayloadStateRoot = String(object.executionPayloadStateRoot);
            if (object.executionPayloadParentHash != null)
                message.executionPayloadParentHash = String(object.executionPayloadParentHash);
            if (object.executionPayloadTransactionsCount != null)
                if ($util.Long)
                    (message.executionPayloadTransactionsCount = $util.Long.fromValue(object.executionPayloadTransactionsCount)).unsigned = false;
                else if (typeof object.executionPayloadTransactionsCount === "string")
                    message.executionPayloadTransactionsCount = parseInt(object.executionPayloadTransactionsCount, 10);
                else if (typeof object.executionPayloadTransactionsCount === "number")
                    message.executionPayloadTransactionsCount = object.executionPayloadTransactionsCount;
                else if (typeof object.executionPayloadTransactionsCount === "object")
                    message.executionPayloadTransactionsCount = new $util.LongBits(object.executionPayloadTransactionsCount.low >>> 0, object.executionPayloadTransactionsCount.high >>> 0).toNumber();
            if (object.executionPayloadTransactionsTotalBytes != null)
                if ($util.Long)
                    (message.executionPayloadTransactionsTotalBytes = $util.Long.fromValue(object.executionPayloadTransactionsTotalBytes)).unsigned = false;
                else if (typeof object.executionPayloadTransactionsTotalBytes === "string")
                    message.executionPayloadTransactionsTotalBytes = parseInt(object.executionPayloadTransactionsTotalBytes, 10);
                else if (typeof object.executionPayloadTransactionsTotalBytes === "number")
                    message.executionPayloadTransactionsTotalBytes = object.executionPayloadTransactionsTotalBytes;
                else if (typeof object.executionPayloadTransactionsTotalBytes === "object")
                    message.executionPayloadTransactionsTotalBytes = new $util.LongBits(object.executionPayloadTransactionsTotalBytes.low >>> 0, object.executionPayloadTransactionsTotalBytes.high >>> 0).toNumber();
            if (object.executionPayloadTransactionsTotalBytesCompressed != null)
                if ($util.Long)
                    (message.executionPayloadTransactionsTotalBytesCompressed = $util.Long.fromValue(object.executionPayloadTransactionsTotalBytesCompressed)).unsigned = false;
                else if (typeof object.executionPayloadTransactionsTotalBytesCompressed === "string")
                    message.executionPayloadTransactionsTotalBytesCompressed = parseInt(object.executionPayloadTransactionsTotalBytesCompressed, 10);
                else if (typeof object.executionPayloadTransactionsTotalBytesCompressed === "number")
                    message.executionPayloadTransactionsTotalBytesCompressed = object.executionPayloadTransactionsTotalBytesCompressed;
                else if (typeof object.executionPayloadTransactionsTotalBytesCompressed === "object")
                    message.executionPayloadTransactionsTotalBytesCompressed = new $util.LongBits(object.executionPayloadTransactionsTotalBytesCompressed.low >>> 0, object.executionPayloadTransactionsTotalBytesCompressed.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a BlockData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BlockData
         * @static
         * @param {beacon_slots.BlockData} message BlockData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlockData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.slot = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slot = options.longs === String ? "0" : 0;
                object.slotStartDateTime = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.epoch = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.epoch = options.longs === String ? "0" : 0;
                object.epochStartDateTime = "";
                object.blockRoot = "";
                object.blockVersion = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.blockTotalBytes = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.blockTotalBytes = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.blockTotalBytesCompressed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.blockTotalBytesCompressed = options.longs === String ? "0" : 0;
                object.parentRoot = "";
                object.stateRoot = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.proposerIndex = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.proposerIndex = options.longs === String ? "0" : 0;
                object.eth1DataBlockHash = "";
                object.eth1DataDepositRoot = "";
                object.executionPayloadBlockHash = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadBlockNumber = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadBlockNumber = options.longs === String ? "0" : 0;
                object.executionPayloadFeeRecipient = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadBaseFeePerGas = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadBaseFeePerGas = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadBlobGasUsed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadBlobGasUsed = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadExcessBlobGas = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadExcessBlobGas = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadGasLimit = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadGasLimit = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadGasUsed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadGasUsed = options.longs === String ? "0" : 0;
                object.executionPayloadStateRoot = "";
                object.executionPayloadParentHash = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadTransactionsCount = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadTransactionsCount = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadTransactionsTotalBytes = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadTransactionsTotalBytes = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.executionPayloadTransactionsTotalBytesCompressed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadTransactionsTotalBytesCompressed = options.longs === String ? "0" : 0;
            }
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (typeof message.slot === "number")
                    object.slot = options.longs === String ? String(message.slot) : message.slot;
                else
                    object.slot = options.longs === String ? $util.Long.prototype.toString.call(message.slot) : options.longs === Number ? new $util.LongBits(message.slot.low >>> 0, message.slot.high >>> 0).toNumber() : message.slot;
            if (message.slotStartDateTime != null && message.hasOwnProperty("slotStartDateTime"))
                object.slotStartDateTime = message.slotStartDateTime;
            if (message.epoch != null && message.hasOwnProperty("epoch"))
                if (typeof message.epoch === "number")
                    object.epoch = options.longs === String ? String(message.epoch) : message.epoch;
                else
                    object.epoch = options.longs === String ? $util.Long.prototype.toString.call(message.epoch) : options.longs === Number ? new $util.LongBits(message.epoch.low >>> 0, message.epoch.high >>> 0).toNumber() : message.epoch;
            if (message.epochStartDateTime != null && message.hasOwnProperty("epochStartDateTime"))
                object.epochStartDateTime = message.epochStartDateTime;
            if (message.blockRoot != null && message.hasOwnProperty("blockRoot"))
                object.blockRoot = message.blockRoot;
            if (message.blockVersion != null && message.hasOwnProperty("blockVersion"))
                object.blockVersion = message.blockVersion;
            if (message.blockTotalBytes != null && message.hasOwnProperty("blockTotalBytes"))
                if (typeof message.blockTotalBytes === "number")
                    object.blockTotalBytes = options.longs === String ? String(message.blockTotalBytes) : message.blockTotalBytes;
                else
                    object.blockTotalBytes = options.longs === String ? $util.Long.prototype.toString.call(message.blockTotalBytes) : options.longs === Number ? new $util.LongBits(message.blockTotalBytes.low >>> 0, message.blockTotalBytes.high >>> 0).toNumber() : message.blockTotalBytes;
            if (message.blockTotalBytesCompressed != null && message.hasOwnProperty("blockTotalBytesCompressed"))
                if (typeof message.blockTotalBytesCompressed === "number")
                    object.blockTotalBytesCompressed = options.longs === String ? String(message.blockTotalBytesCompressed) : message.blockTotalBytesCompressed;
                else
                    object.blockTotalBytesCompressed = options.longs === String ? $util.Long.prototype.toString.call(message.blockTotalBytesCompressed) : options.longs === Number ? new $util.LongBits(message.blockTotalBytesCompressed.low >>> 0, message.blockTotalBytesCompressed.high >>> 0).toNumber() : message.blockTotalBytesCompressed;
            if (message.parentRoot != null && message.hasOwnProperty("parentRoot"))
                object.parentRoot = message.parentRoot;
            if (message.stateRoot != null && message.hasOwnProperty("stateRoot"))
                object.stateRoot = message.stateRoot;
            if (message.proposerIndex != null && message.hasOwnProperty("proposerIndex"))
                if (typeof message.proposerIndex === "number")
                    object.proposerIndex = options.longs === String ? String(message.proposerIndex) : message.proposerIndex;
                else
                    object.proposerIndex = options.longs === String ? $util.Long.prototype.toString.call(message.proposerIndex) : options.longs === Number ? new $util.LongBits(message.proposerIndex.low >>> 0, message.proposerIndex.high >>> 0).toNumber() : message.proposerIndex;
            if (message.eth1DataBlockHash != null && message.hasOwnProperty("eth1DataBlockHash"))
                object.eth1DataBlockHash = message.eth1DataBlockHash;
            if (message.eth1DataDepositRoot != null && message.hasOwnProperty("eth1DataDepositRoot"))
                object.eth1DataDepositRoot = message.eth1DataDepositRoot;
            if (message.executionPayloadBlockHash != null && message.hasOwnProperty("executionPayloadBlockHash"))
                object.executionPayloadBlockHash = message.executionPayloadBlockHash;
            if (message.executionPayloadBlockNumber != null && message.hasOwnProperty("executionPayloadBlockNumber"))
                if (typeof message.executionPayloadBlockNumber === "number")
                    object.executionPayloadBlockNumber = options.longs === String ? String(message.executionPayloadBlockNumber) : message.executionPayloadBlockNumber;
                else
                    object.executionPayloadBlockNumber = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadBlockNumber) : options.longs === Number ? new $util.LongBits(message.executionPayloadBlockNumber.low >>> 0, message.executionPayloadBlockNumber.high >>> 0).toNumber() : message.executionPayloadBlockNumber;
            if (message.executionPayloadFeeRecipient != null && message.hasOwnProperty("executionPayloadFeeRecipient"))
                object.executionPayloadFeeRecipient = message.executionPayloadFeeRecipient;
            if (message.executionPayloadBaseFeePerGas != null && message.hasOwnProperty("executionPayloadBaseFeePerGas"))
                if (typeof message.executionPayloadBaseFeePerGas === "number")
                    object.executionPayloadBaseFeePerGas = options.longs === String ? String(message.executionPayloadBaseFeePerGas) : message.executionPayloadBaseFeePerGas;
                else
                    object.executionPayloadBaseFeePerGas = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadBaseFeePerGas) : options.longs === Number ? new $util.LongBits(message.executionPayloadBaseFeePerGas.low >>> 0, message.executionPayloadBaseFeePerGas.high >>> 0).toNumber() : message.executionPayloadBaseFeePerGas;
            if (message.executionPayloadBlobGasUsed != null && message.hasOwnProperty("executionPayloadBlobGasUsed"))
                if (typeof message.executionPayloadBlobGasUsed === "number")
                    object.executionPayloadBlobGasUsed = options.longs === String ? String(message.executionPayloadBlobGasUsed) : message.executionPayloadBlobGasUsed;
                else
                    object.executionPayloadBlobGasUsed = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadBlobGasUsed) : options.longs === Number ? new $util.LongBits(message.executionPayloadBlobGasUsed.low >>> 0, message.executionPayloadBlobGasUsed.high >>> 0).toNumber() : message.executionPayloadBlobGasUsed;
            if (message.executionPayloadExcessBlobGas != null && message.hasOwnProperty("executionPayloadExcessBlobGas"))
                if (typeof message.executionPayloadExcessBlobGas === "number")
                    object.executionPayloadExcessBlobGas = options.longs === String ? String(message.executionPayloadExcessBlobGas) : message.executionPayloadExcessBlobGas;
                else
                    object.executionPayloadExcessBlobGas = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadExcessBlobGas) : options.longs === Number ? new $util.LongBits(message.executionPayloadExcessBlobGas.low >>> 0, message.executionPayloadExcessBlobGas.high >>> 0).toNumber() : message.executionPayloadExcessBlobGas;
            if (message.executionPayloadGasLimit != null && message.hasOwnProperty("executionPayloadGasLimit"))
                if (typeof message.executionPayloadGasLimit === "number")
                    object.executionPayloadGasLimit = options.longs === String ? String(message.executionPayloadGasLimit) : message.executionPayloadGasLimit;
                else
                    object.executionPayloadGasLimit = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadGasLimit) : options.longs === Number ? new $util.LongBits(message.executionPayloadGasLimit.low >>> 0, message.executionPayloadGasLimit.high >>> 0).toNumber() : message.executionPayloadGasLimit;
            if (message.executionPayloadGasUsed != null && message.hasOwnProperty("executionPayloadGasUsed"))
                if (typeof message.executionPayloadGasUsed === "number")
                    object.executionPayloadGasUsed = options.longs === String ? String(message.executionPayloadGasUsed) : message.executionPayloadGasUsed;
                else
                    object.executionPayloadGasUsed = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadGasUsed) : options.longs === Number ? new $util.LongBits(message.executionPayloadGasUsed.low >>> 0, message.executionPayloadGasUsed.high >>> 0).toNumber() : message.executionPayloadGasUsed;
            if (message.executionPayloadStateRoot != null && message.hasOwnProperty("executionPayloadStateRoot"))
                object.executionPayloadStateRoot = message.executionPayloadStateRoot;
            if (message.executionPayloadParentHash != null && message.hasOwnProperty("executionPayloadParentHash"))
                object.executionPayloadParentHash = message.executionPayloadParentHash;
            if (message.executionPayloadTransactionsCount != null && message.hasOwnProperty("executionPayloadTransactionsCount"))
                if (typeof message.executionPayloadTransactionsCount === "number")
                    object.executionPayloadTransactionsCount = options.longs === String ? String(message.executionPayloadTransactionsCount) : message.executionPayloadTransactionsCount;
                else
                    object.executionPayloadTransactionsCount = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadTransactionsCount) : options.longs === Number ? new $util.LongBits(message.executionPayloadTransactionsCount.low >>> 0, message.executionPayloadTransactionsCount.high >>> 0).toNumber() : message.executionPayloadTransactionsCount;
            if (message.executionPayloadTransactionsTotalBytes != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytes"))
                if (typeof message.executionPayloadTransactionsTotalBytes === "number")
                    object.executionPayloadTransactionsTotalBytes = options.longs === String ? String(message.executionPayloadTransactionsTotalBytes) : message.executionPayloadTransactionsTotalBytes;
                else
                    object.executionPayloadTransactionsTotalBytes = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadTransactionsTotalBytes) : options.longs === Number ? new $util.LongBits(message.executionPayloadTransactionsTotalBytes.low >>> 0, message.executionPayloadTransactionsTotalBytes.high >>> 0).toNumber() : message.executionPayloadTransactionsTotalBytes;
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytesCompressed"))
                if (typeof message.executionPayloadTransactionsTotalBytesCompressed === "number")
                    object.executionPayloadTransactionsTotalBytesCompressed = options.longs === String ? String(message.executionPayloadTransactionsTotalBytesCompressed) : message.executionPayloadTransactionsTotalBytesCompressed;
                else
                    object.executionPayloadTransactionsTotalBytesCompressed = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadTransactionsTotalBytesCompressed) : options.longs === Number ? new $util.LongBits(message.executionPayloadTransactionsTotalBytesCompressed.low >>> 0, message.executionPayloadTransactionsTotalBytesCompressed.high >>> 0).toNumber() : message.executionPayloadTransactionsTotalBytesCompressed;
            return object;
        };

        /**
         * Converts this BlockData to JSON.
         * @function toJSON
         * @memberof beacon_slots.BlockData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlockData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BlockData
         * @function getTypeUrl
         * @memberof beacon_slots.BlockData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BlockData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BlockData";
        };

        return BlockData;
    })();

    beacon_slots.AttestationWindow = (function() {

        /**
         * Properties of an AttestationWindow.
         * @memberof beacon_slots
         * @interface IAttestationWindow
         * @property {number|Long|null} [startMs] AttestationWindow startMs
         * @property {number|Long|null} [endMs] AttestationWindow endMs
         * @property {Array.<number|Long>|null} [validatorIndices] AttestationWindow validatorIndices
         */

        /**
         * Constructs a new AttestationWindow.
         * @memberof beacon_slots
         * @classdesc Represents an AttestationWindow.
         * @implements IAttestationWindow
         * @constructor
         * @param {beacon_slots.IAttestationWindow=} [properties] Properties to set
         */
        function AttestationWindow(properties) {
            this.validatorIndices = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AttestationWindow startMs.
         * @member {number|Long} startMs
         * @memberof beacon_slots.AttestationWindow
         * @instance
         */
        AttestationWindow.prototype.startMs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * AttestationWindow endMs.
         * @member {number|Long} endMs
         * @memberof beacon_slots.AttestationWindow
         * @instance
         */
        AttestationWindow.prototype.endMs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * AttestationWindow validatorIndices.
         * @member {Array.<number|Long>} validatorIndices
         * @memberof beacon_slots.AttestationWindow
         * @instance
         */
        AttestationWindow.prototype.validatorIndices = $util.emptyArray;

        /**
         * Creates a new AttestationWindow instance using the specified properties.
         * @function create
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {beacon_slots.IAttestationWindow=} [properties] Properties to set
         * @returns {beacon_slots.AttestationWindow} AttestationWindow instance
         */
        AttestationWindow.create = function create(properties) {
            return new AttestationWindow(properties);
        };

        /**
         * Encodes the specified AttestationWindow message. Does not implicitly {@link beacon_slots.AttestationWindow.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {beacon_slots.IAttestationWindow} message AttestationWindow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AttestationWindow.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.startMs != null && Object.hasOwnProperty.call(message, "startMs"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.startMs);
            if (message.endMs != null && Object.hasOwnProperty.call(message, "endMs"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.endMs);
            if (message.validatorIndices != null && message.validatorIndices.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (var i = 0; i < message.validatorIndices.length; ++i)
                    writer.int64(message.validatorIndices[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified AttestationWindow message, length delimited. Does not implicitly {@link beacon_slots.AttestationWindow.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {beacon_slots.IAttestationWindow} message AttestationWindow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AttestationWindow.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AttestationWindow message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.AttestationWindow} AttestationWindow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AttestationWindow.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.AttestationWindow();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.startMs = reader.int64();
                        break;
                    }
                case 2: {
                        message.endMs = reader.int64();
                        break;
                    }
                case 3: {
                        if (!(message.validatorIndices && message.validatorIndices.length))
                            message.validatorIndices = [];
                        if ((tag & 7) === 2) {
                            var end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.validatorIndices.push(reader.int64());
                        } else
                            message.validatorIndices.push(reader.int64());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an AttestationWindow message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.AttestationWindow} AttestationWindow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AttestationWindow.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AttestationWindow message.
         * @function verify
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AttestationWindow.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.startMs != null && message.hasOwnProperty("startMs"))
                if (!$util.isInteger(message.startMs) && !(message.startMs && $util.isInteger(message.startMs.low) && $util.isInteger(message.startMs.high)))
                    return "startMs: integer|Long expected";
            if (message.endMs != null && message.hasOwnProperty("endMs"))
                if (!$util.isInteger(message.endMs) && !(message.endMs && $util.isInteger(message.endMs.low) && $util.isInteger(message.endMs.high)))
                    return "endMs: integer|Long expected";
            if (message.validatorIndices != null && message.hasOwnProperty("validatorIndices")) {
                if (!Array.isArray(message.validatorIndices))
                    return "validatorIndices: array expected";
                for (var i = 0; i < message.validatorIndices.length; ++i)
                    if (!$util.isInteger(message.validatorIndices[i]) && !(message.validatorIndices[i] && $util.isInteger(message.validatorIndices[i].low) && $util.isInteger(message.validatorIndices[i].high)))
                        return "validatorIndices: integer|Long[] expected";
            }
            return null;
        };

        /**
         * Creates an AttestationWindow message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.AttestationWindow} AttestationWindow
         */
        AttestationWindow.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.AttestationWindow)
                return object;
            var message = new $root.beacon_slots.AttestationWindow();
            if (object.startMs != null)
                if ($util.Long)
                    (message.startMs = $util.Long.fromValue(object.startMs)).unsigned = false;
                else if (typeof object.startMs === "string")
                    message.startMs = parseInt(object.startMs, 10);
                else if (typeof object.startMs === "number")
                    message.startMs = object.startMs;
                else if (typeof object.startMs === "object")
                    message.startMs = new $util.LongBits(object.startMs.low >>> 0, object.startMs.high >>> 0).toNumber();
            if (object.endMs != null)
                if ($util.Long)
                    (message.endMs = $util.Long.fromValue(object.endMs)).unsigned = false;
                else if (typeof object.endMs === "string")
                    message.endMs = parseInt(object.endMs, 10);
                else if (typeof object.endMs === "number")
                    message.endMs = object.endMs;
                else if (typeof object.endMs === "object")
                    message.endMs = new $util.LongBits(object.endMs.low >>> 0, object.endMs.high >>> 0).toNumber();
            if (object.validatorIndices) {
                if (!Array.isArray(object.validatorIndices))
                    throw TypeError(".beacon_slots.AttestationWindow.validatorIndices: array expected");
                message.validatorIndices = [];
                for (var i = 0; i < object.validatorIndices.length; ++i)
                    if ($util.Long)
                        (message.validatorIndices[i] = $util.Long.fromValue(object.validatorIndices[i])).unsigned = false;
                    else if (typeof object.validatorIndices[i] === "string")
                        message.validatorIndices[i] = parseInt(object.validatorIndices[i], 10);
                    else if (typeof object.validatorIndices[i] === "number")
                        message.validatorIndices[i] = object.validatorIndices[i];
                    else if (typeof object.validatorIndices[i] === "object")
                        message.validatorIndices[i] = new $util.LongBits(object.validatorIndices[i].low >>> 0, object.validatorIndices[i].high >>> 0).toNumber();
            }
            return message;
        };

        /**
         * Creates a plain object from an AttestationWindow message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {beacon_slots.AttestationWindow} message AttestationWindow
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AttestationWindow.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.validatorIndices = [];
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.startMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.startMs = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.endMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.endMs = options.longs === String ? "0" : 0;
            }
            if (message.startMs != null && message.hasOwnProperty("startMs"))
                if (typeof message.startMs === "number")
                    object.startMs = options.longs === String ? String(message.startMs) : message.startMs;
                else
                    object.startMs = options.longs === String ? $util.Long.prototype.toString.call(message.startMs) : options.longs === Number ? new $util.LongBits(message.startMs.low >>> 0, message.startMs.high >>> 0).toNumber() : message.startMs;
            if (message.endMs != null && message.hasOwnProperty("endMs"))
                if (typeof message.endMs === "number")
                    object.endMs = options.longs === String ? String(message.endMs) : message.endMs;
                else
                    object.endMs = options.longs === String ? $util.Long.prototype.toString.call(message.endMs) : options.longs === Number ? new $util.LongBits(message.endMs.low >>> 0, message.endMs.high >>> 0).toNumber() : message.endMs;
            if (message.validatorIndices && message.validatorIndices.length) {
                object.validatorIndices = [];
                for (var j = 0; j < message.validatorIndices.length; ++j)
                    if (typeof message.validatorIndices[j] === "number")
                        object.validatorIndices[j] = options.longs === String ? String(message.validatorIndices[j]) : message.validatorIndices[j];
                    else
                        object.validatorIndices[j] = options.longs === String ? $util.Long.prototype.toString.call(message.validatorIndices[j]) : options.longs === Number ? new $util.LongBits(message.validatorIndices[j].low >>> 0, message.validatorIndices[j].high >>> 0).toNumber() : message.validatorIndices[j];
            }
            return object;
        };

        /**
         * Converts this AttestationWindow to JSON.
         * @function toJSON
         * @memberof beacon_slots.AttestationWindow
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AttestationWindow.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AttestationWindow
         * @function getTypeUrl
         * @memberof beacon_slots.AttestationWindow
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AttestationWindow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.AttestationWindow";
        };

        return AttestationWindow;
    })();

    beacon_slots.AttestationsData = (function() {

        /**
         * Properties of an AttestationsData.
         * @memberof beacon_slots
         * @interface IAttestationsData
         * @property {Array.<beacon_slots.IAttestationWindow>|null} [windows] AttestationsData windows
         * @property {number|Long|null} [maximumVotes] AttestationsData maximumVotes
         */

        /**
         * Constructs a new AttestationsData.
         * @memberof beacon_slots
         * @classdesc Represents an AttestationsData.
         * @implements IAttestationsData
         * @constructor
         * @param {beacon_slots.IAttestationsData=} [properties] Properties to set
         */
        function AttestationsData(properties) {
            this.windows = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AttestationsData windows.
         * @member {Array.<beacon_slots.IAttestationWindow>} windows
         * @memberof beacon_slots.AttestationsData
         * @instance
         */
        AttestationsData.prototype.windows = $util.emptyArray;

        /**
         * AttestationsData maximumVotes.
         * @member {number|Long} maximumVotes
         * @memberof beacon_slots.AttestationsData
         * @instance
         */
        AttestationsData.prototype.maximumVotes = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new AttestationsData instance using the specified properties.
         * @function create
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {beacon_slots.IAttestationsData=} [properties] Properties to set
         * @returns {beacon_slots.AttestationsData} AttestationsData instance
         */
        AttestationsData.create = function create(properties) {
            return new AttestationsData(properties);
        };

        /**
         * Encodes the specified AttestationsData message. Does not implicitly {@link beacon_slots.AttestationsData.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {beacon_slots.IAttestationsData} message AttestationsData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AttestationsData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.windows != null && message.windows.length)
                for (var i = 0; i < message.windows.length; ++i)
                    $root.beacon_slots.AttestationWindow.encode(message.windows[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.maximumVotes != null && Object.hasOwnProperty.call(message, "maximumVotes"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.maximumVotes);
            return writer;
        };

        /**
         * Encodes the specified AttestationsData message, length delimited. Does not implicitly {@link beacon_slots.AttestationsData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {beacon_slots.IAttestationsData} message AttestationsData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AttestationsData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AttestationsData message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.AttestationsData} AttestationsData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AttestationsData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.AttestationsData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.windows && message.windows.length))
                            message.windows = [];
                        message.windows.push($root.beacon_slots.AttestationWindow.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.maximumVotes = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an AttestationsData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.AttestationsData} AttestationsData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AttestationsData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AttestationsData message.
         * @function verify
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AttestationsData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.windows != null && message.hasOwnProperty("windows")) {
                if (!Array.isArray(message.windows))
                    return "windows: array expected";
                for (var i = 0; i < message.windows.length; ++i) {
                    var error = $root.beacon_slots.AttestationWindow.verify(message.windows[i]);
                    if (error)
                        return "windows." + error;
                }
            }
            if (message.maximumVotes != null && message.hasOwnProperty("maximumVotes"))
                if (!$util.isInteger(message.maximumVotes) && !(message.maximumVotes && $util.isInteger(message.maximumVotes.low) && $util.isInteger(message.maximumVotes.high)))
                    return "maximumVotes: integer|Long expected";
            return null;
        };

        /**
         * Creates an AttestationsData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.AttestationsData} AttestationsData
         */
        AttestationsData.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.AttestationsData)
                return object;
            var message = new $root.beacon_slots.AttestationsData();
            if (object.windows) {
                if (!Array.isArray(object.windows))
                    throw TypeError(".beacon_slots.AttestationsData.windows: array expected");
                message.windows = [];
                for (var i = 0; i < object.windows.length; ++i) {
                    if (typeof object.windows[i] !== "object")
                        throw TypeError(".beacon_slots.AttestationsData.windows: object expected");
                    message.windows[i] = $root.beacon_slots.AttestationWindow.fromObject(object.windows[i]);
                }
            }
            if (object.maximumVotes != null)
                if ($util.Long)
                    (message.maximumVotes = $util.Long.fromValue(object.maximumVotes)).unsigned = false;
                else if (typeof object.maximumVotes === "string")
                    message.maximumVotes = parseInt(object.maximumVotes, 10);
                else if (typeof object.maximumVotes === "number")
                    message.maximumVotes = object.maximumVotes;
                else if (typeof object.maximumVotes === "object")
                    message.maximumVotes = new $util.LongBits(object.maximumVotes.low >>> 0, object.maximumVotes.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from an AttestationsData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {beacon_slots.AttestationsData} message AttestationsData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AttestationsData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.windows = [];
            if (options.defaults)
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.maximumVotes = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.maximumVotes = options.longs === String ? "0" : 0;
            if (message.windows && message.windows.length) {
                object.windows = [];
                for (var j = 0; j < message.windows.length; ++j)
                    object.windows[j] = $root.beacon_slots.AttestationWindow.toObject(message.windows[j], options);
            }
            if (message.maximumVotes != null && message.hasOwnProperty("maximumVotes"))
                if (typeof message.maximumVotes === "number")
                    object.maximumVotes = options.longs === String ? String(message.maximumVotes) : message.maximumVotes;
                else
                    object.maximumVotes = options.longs === String ? $util.Long.prototype.toString.call(message.maximumVotes) : options.longs === Number ? new $util.LongBits(message.maximumVotes.low >>> 0, message.maximumVotes.high >>> 0).toNumber() : message.maximumVotes;
            return object;
        };

        /**
         * Converts this AttestationsData to JSON.
         * @function toJSON
         * @memberof beacon_slots.AttestationsData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AttestationsData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AttestationsData
         * @function getTypeUrl
         * @memberof beacon_slots.AttestationsData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AttestationsData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.AttestationsData";
        };

        return AttestationsData;
    })();

    beacon_slots.BlobTimingMap = (function() {

        /**
         * Properties of a BlobTimingMap.
         * @memberof beacon_slots
         * @interface IBlobTimingMap
         * @property {Object.<string,number|Long>|null} [timings] BlobTimingMap timings
         */

        /**
         * Constructs a new BlobTimingMap.
         * @memberof beacon_slots
         * @classdesc Represents a BlobTimingMap.
         * @implements IBlobTimingMap
         * @constructor
         * @param {beacon_slots.IBlobTimingMap=} [properties] Properties to set
         */
        function BlobTimingMap(properties) {
            this.timings = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlobTimingMap timings.
         * @member {Object.<string,number|Long>} timings
         * @memberof beacon_slots.BlobTimingMap
         * @instance
         */
        BlobTimingMap.prototype.timings = $util.emptyObject;

        /**
         * Creates a new BlobTimingMap instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {beacon_slots.IBlobTimingMap=} [properties] Properties to set
         * @returns {beacon_slots.BlobTimingMap} BlobTimingMap instance
         */
        BlobTimingMap.create = function create(properties) {
            return new BlobTimingMap(properties);
        };

        /**
         * Encodes the specified BlobTimingMap message. Does not implicitly {@link beacon_slots.BlobTimingMap.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {beacon_slots.IBlobTimingMap} message BlobTimingMap message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobTimingMap.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timings != null && Object.hasOwnProperty.call(message, "timings"))
                for (var keys = Object.keys(message.timings), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 0 =*/8).int64(keys[i]).uint32(/* id 2, wireType 0 =*/16).int64(message.timings[keys[i]]).ldelim();
            return writer;
        };

        /**
         * Encodes the specified BlobTimingMap message, length delimited. Does not implicitly {@link beacon_slots.BlobTimingMap.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {beacon_slots.IBlobTimingMap} message BlobTimingMap message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobTimingMap.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlobTimingMap message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BlobTimingMap} BlobTimingMap
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobTimingMap.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BlobTimingMap(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (message.timings === $util.emptyObject)
                            message.timings = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = 0;
                        value = 0;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.int64();
                                break;
                            case 2:
                                value = reader.int64();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.timings[typeof key === "object" ? $util.longToHash(key) : key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BlobTimingMap message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BlobTimingMap} BlobTimingMap
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobTimingMap.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlobTimingMap message.
         * @function verify
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlobTimingMap.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.timings != null && message.hasOwnProperty("timings")) {
                if (!$util.isObject(message.timings))
                    return "timings: object expected";
                var key = Object.keys(message.timings);
                for (var i = 0; i < key.length; ++i) {
                    if (!$util.key64Re.test(key[i]))
                        return "timings: integer|Long key{k:int64} expected";
                    if (!$util.isInteger(message.timings[key[i]]) && !(message.timings[key[i]] && $util.isInteger(message.timings[key[i]].low) && $util.isInteger(message.timings[key[i]].high)))
                        return "timings: integer|Long{k:int64} expected";
                }
            }
            return null;
        };

        /**
         * Creates a BlobTimingMap message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BlobTimingMap} BlobTimingMap
         */
        BlobTimingMap.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BlobTimingMap)
                return object;
            var message = new $root.beacon_slots.BlobTimingMap();
            if (object.timings) {
                if (typeof object.timings !== "object")
                    throw TypeError(".beacon_slots.BlobTimingMap.timings: object expected");
                message.timings = {};
                for (var keys = Object.keys(object.timings), i = 0; i < keys.length; ++i)
                    if ($util.Long)
                        (message.timings[keys[i]] = $util.Long.fromValue(object.timings[keys[i]])).unsigned = false;
                    else if (typeof object.timings[keys[i]] === "string")
                        message.timings[keys[i]] = parseInt(object.timings[keys[i]], 10);
                    else if (typeof object.timings[keys[i]] === "number")
                        message.timings[keys[i]] = object.timings[keys[i]];
                    else if (typeof object.timings[keys[i]] === "object")
                        message.timings[keys[i]] = new $util.LongBits(object.timings[keys[i]].low >>> 0, object.timings[keys[i]].high >>> 0).toNumber();
            }
            return message;
        };

        /**
         * Creates a plain object from a BlobTimingMap message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {beacon_slots.BlobTimingMap} message BlobTimingMap
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlobTimingMap.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults)
                object.timings = {};
            var keys2;
            if (message.timings && (keys2 = Object.keys(message.timings)).length) {
                object.timings = {};
                for (var j = 0; j < keys2.length; ++j)
                    if (typeof message.timings[keys2[j]] === "number")
                        object.timings[keys2[j]] = options.longs === String ? String(message.timings[keys2[j]]) : message.timings[keys2[j]];
                    else
                        object.timings[keys2[j]] = options.longs === String ? $util.Long.prototype.toString.call(message.timings[keys2[j]]) : options.longs === Number ? new $util.LongBits(message.timings[keys2[j]].low >>> 0, message.timings[keys2[j]].high >>> 0).toNumber() : message.timings[keys2[j]];
            }
            return object;
        };

        /**
         * Converts this BlobTimingMap to JSON.
         * @function toJSON
         * @memberof beacon_slots.BlobTimingMap
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlobTimingMap.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BlobTimingMap
         * @function getTypeUrl
         * @memberof beacon_slots.BlobTimingMap
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BlobTimingMap.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BlobTimingMap";
        };

        return BlobTimingMap;
    })();

    beacon_slots.BlockArrivalTime = (function() {

        /**
         * Properties of a BlockArrivalTime.
         * @memberof beacon_slots
         * @interface IBlockArrivalTime
         * @property {number|Long|null} [slotTime] BlockArrivalTime slotTime
         * @property {string|null} [metaClientName] BlockArrivalTime metaClientName
         * @property {string|null} [metaClientGeoCity] BlockArrivalTime metaClientGeoCity
         * @property {string|null} [metaClientGeoCountry] BlockArrivalTime metaClientGeoCountry
         * @property {string|null} [metaClientGeoContinentCode] BlockArrivalTime metaClientGeoContinentCode
         */

        /**
         * Constructs a new BlockArrivalTime.
         * @memberof beacon_slots
         * @classdesc Represents a BlockArrivalTime.
         * @implements IBlockArrivalTime
         * @constructor
         * @param {beacon_slots.IBlockArrivalTime=} [properties] Properties to set
         */
        function BlockArrivalTime(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlockArrivalTime slotTime.
         * @member {number|Long} slotTime
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         */
        BlockArrivalTime.prototype.slotTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlockArrivalTime metaClientName.
         * @member {string} metaClientName
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         */
        BlockArrivalTime.prototype.metaClientName = "";

        /**
         * BlockArrivalTime metaClientGeoCity.
         * @member {string} metaClientGeoCity
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         */
        BlockArrivalTime.prototype.metaClientGeoCity = "";

        /**
         * BlockArrivalTime metaClientGeoCountry.
         * @member {string} metaClientGeoCountry
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         */
        BlockArrivalTime.prototype.metaClientGeoCountry = "";

        /**
         * BlockArrivalTime metaClientGeoContinentCode.
         * @member {string} metaClientGeoContinentCode
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         */
        BlockArrivalTime.prototype.metaClientGeoContinentCode = "";

        /**
         * Creates a new BlockArrivalTime instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {beacon_slots.IBlockArrivalTime=} [properties] Properties to set
         * @returns {beacon_slots.BlockArrivalTime} BlockArrivalTime instance
         */
        BlockArrivalTime.create = function create(properties) {
            return new BlockArrivalTime(properties);
        };

        /**
         * Encodes the specified BlockArrivalTime message. Does not implicitly {@link beacon_slots.BlockArrivalTime.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {beacon_slots.IBlockArrivalTime} message BlockArrivalTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlockArrivalTime.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slotTime != null && Object.hasOwnProperty.call(message, "slotTime"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.slotTime);
            if (message.metaClientName != null && Object.hasOwnProperty.call(message, "metaClientName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.metaClientName);
            if (message.metaClientGeoCity != null && Object.hasOwnProperty.call(message, "metaClientGeoCity"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.metaClientGeoCity);
            if (message.metaClientGeoCountry != null && Object.hasOwnProperty.call(message, "metaClientGeoCountry"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.metaClientGeoCountry);
            if (message.metaClientGeoContinentCode != null && Object.hasOwnProperty.call(message, "metaClientGeoContinentCode"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.metaClientGeoContinentCode);
            return writer;
        };

        /**
         * Encodes the specified BlockArrivalTime message, length delimited. Does not implicitly {@link beacon_slots.BlockArrivalTime.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {beacon_slots.IBlockArrivalTime} message BlockArrivalTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlockArrivalTime.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlockArrivalTime message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BlockArrivalTime} BlockArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlockArrivalTime.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BlockArrivalTime();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slotTime = reader.int64();
                        break;
                    }
                case 2: {
                        message.metaClientName = reader.string();
                        break;
                    }
                case 3: {
                        message.metaClientGeoCity = reader.string();
                        break;
                    }
                case 4: {
                        message.metaClientGeoCountry = reader.string();
                        break;
                    }
                case 5: {
                        message.metaClientGeoContinentCode = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BlockArrivalTime message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BlockArrivalTime} BlockArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlockArrivalTime.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlockArrivalTime message.
         * @function verify
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlockArrivalTime.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slotTime != null && message.hasOwnProperty("slotTime"))
                if (!$util.isInteger(message.slotTime) && !(message.slotTime && $util.isInteger(message.slotTime.low) && $util.isInteger(message.slotTime.high)))
                    return "slotTime: integer|Long expected";
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                if (!$util.isString(message.metaClientName))
                    return "metaClientName: string expected";
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                if (!$util.isString(message.metaClientGeoCity))
                    return "metaClientGeoCity: string expected";
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                if (!$util.isString(message.metaClientGeoCountry))
                    return "metaClientGeoCountry: string expected";
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                if (!$util.isString(message.metaClientGeoContinentCode))
                    return "metaClientGeoContinentCode: string expected";
            return null;
        };

        /**
         * Creates a BlockArrivalTime message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BlockArrivalTime} BlockArrivalTime
         */
        BlockArrivalTime.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BlockArrivalTime)
                return object;
            var message = new $root.beacon_slots.BlockArrivalTime();
            if (object.slotTime != null)
                if ($util.Long)
                    (message.slotTime = $util.Long.fromValue(object.slotTime)).unsigned = false;
                else if (typeof object.slotTime === "string")
                    message.slotTime = parseInt(object.slotTime, 10);
                else if (typeof object.slotTime === "number")
                    message.slotTime = object.slotTime;
                else if (typeof object.slotTime === "object")
                    message.slotTime = new $util.LongBits(object.slotTime.low >>> 0, object.slotTime.high >>> 0).toNumber();
            if (object.metaClientName != null)
                message.metaClientName = String(object.metaClientName);
            if (object.metaClientGeoCity != null)
                message.metaClientGeoCity = String(object.metaClientGeoCity);
            if (object.metaClientGeoCountry != null)
                message.metaClientGeoCountry = String(object.metaClientGeoCountry);
            if (object.metaClientGeoContinentCode != null)
                message.metaClientGeoContinentCode = String(object.metaClientGeoContinentCode);
            return message;
        };

        /**
         * Creates a plain object from a BlockArrivalTime message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {beacon_slots.BlockArrivalTime} message BlockArrivalTime
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlockArrivalTime.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.slotTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slotTime = options.longs === String ? "0" : 0;
                object.metaClientName = "";
                object.metaClientGeoCity = "";
                object.metaClientGeoCountry = "";
                object.metaClientGeoContinentCode = "";
            }
            if (message.slotTime != null && message.hasOwnProperty("slotTime"))
                if (typeof message.slotTime === "number")
                    object.slotTime = options.longs === String ? String(message.slotTime) : message.slotTime;
                else
                    object.slotTime = options.longs === String ? $util.Long.prototype.toString.call(message.slotTime) : options.longs === Number ? new $util.LongBits(message.slotTime.low >>> 0, message.slotTime.high >>> 0).toNumber() : message.slotTime;
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                object.metaClientName = message.metaClientName;
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                object.metaClientGeoCity = message.metaClientGeoCity;
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                object.metaClientGeoCountry = message.metaClientGeoCountry;
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                object.metaClientGeoContinentCode = message.metaClientGeoContinentCode;
            return object;
        };

        /**
         * Converts this BlockArrivalTime to JSON.
         * @function toJSON
         * @memberof beacon_slots.BlockArrivalTime
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlockArrivalTime.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BlockArrivalTime
         * @function getTypeUrl
         * @memberof beacon_slots.BlockArrivalTime
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BlockArrivalTime.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BlockArrivalTime";
        };

        return BlockArrivalTime;
    })();

    beacon_slots.BlobArrivalTime = (function() {

        /**
         * Properties of a BlobArrivalTime.
         * @memberof beacon_slots
         * @interface IBlobArrivalTime
         * @property {number|Long|null} [slotTime] BlobArrivalTime slotTime
         * @property {string|null} [metaClientName] BlobArrivalTime metaClientName
         * @property {string|null} [metaClientGeoCity] BlobArrivalTime metaClientGeoCity
         * @property {string|null} [metaClientGeoCountry] BlobArrivalTime metaClientGeoCountry
         * @property {string|null} [metaClientGeoContinentCode] BlobArrivalTime metaClientGeoContinentCode
         * @property {number|Long|null} [blobIndex] BlobArrivalTime blobIndex
         */

        /**
         * Constructs a new BlobArrivalTime.
         * @memberof beacon_slots
         * @classdesc Represents a BlobArrivalTime.
         * @implements IBlobArrivalTime
         * @constructor
         * @param {beacon_slots.IBlobArrivalTime=} [properties] Properties to set
         */
        function BlobArrivalTime(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlobArrivalTime slotTime.
         * @member {number|Long} slotTime
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.slotTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BlobArrivalTime metaClientName.
         * @member {string} metaClientName
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.metaClientName = "";

        /**
         * BlobArrivalTime metaClientGeoCity.
         * @member {string} metaClientGeoCity
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.metaClientGeoCity = "";

        /**
         * BlobArrivalTime metaClientGeoCountry.
         * @member {string} metaClientGeoCountry
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.metaClientGeoCountry = "";

        /**
         * BlobArrivalTime metaClientGeoContinentCode.
         * @member {string} metaClientGeoContinentCode
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.metaClientGeoContinentCode = "";

        /**
         * BlobArrivalTime blobIndex.
         * @member {number|Long} blobIndex
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         */
        BlobArrivalTime.prototype.blobIndex = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new BlobArrivalTime instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {beacon_slots.IBlobArrivalTime=} [properties] Properties to set
         * @returns {beacon_slots.BlobArrivalTime} BlobArrivalTime instance
         */
        BlobArrivalTime.create = function create(properties) {
            return new BlobArrivalTime(properties);
        };

        /**
         * Encodes the specified BlobArrivalTime message. Does not implicitly {@link beacon_slots.BlobArrivalTime.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {beacon_slots.IBlobArrivalTime} message BlobArrivalTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobArrivalTime.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slotTime != null && Object.hasOwnProperty.call(message, "slotTime"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.slotTime);
            if (message.metaClientName != null && Object.hasOwnProperty.call(message, "metaClientName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.metaClientName);
            if (message.metaClientGeoCity != null && Object.hasOwnProperty.call(message, "metaClientGeoCity"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.metaClientGeoCity);
            if (message.metaClientGeoCountry != null && Object.hasOwnProperty.call(message, "metaClientGeoCountry"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.metaClientGeoCountry);
            if (message.metaClientGeoContinentCode != null && Object.hasOwnProperty.call(message, "metaClientGeoContinentCode"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.metaClientGeoContinentCode);
            if (message.blobIndex != null && Object.hasOwnProperty.call(message, "blobIndex"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.blobIndex);
            return writer;
        };

        /**
         * Encodes the specified BlobArrivalTime message, length delimited. Does not implicitly {@link beacon_slots.BlobArrivalTime.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {beacon_slots.IBlobArrivalTime} message BlobArrivalTime message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobArrivalTime.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlobArrivalTime message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BlobArrivalTime} BlobArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobArrivalTime.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BlobArrivalTime();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slotTime = reader.int64();
                        break;
                    }
                case 2: {
                        message.metaClientName = reader.string();
                        break;
                    }
                case 3: {
                        message.metaClientGeoCity = reader.string();
                        break;
                    }
                case 4: {
                        message.metaClientGeoCountry = reader.string();
                        break;
                    }
                case 5: {
                        message.metaClientGeoContinentCode = reader.string();
                        break;
                    }
                case 6: {
                        message.blobIndex = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BlobArrivalTime message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BlobArrivalTime} BlobArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobArrivalTime.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlobArrivalTime message.
         * @function verify
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlobArrivalTime.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slotTime != null && message.hasOwnProperty("slotTime"))
                if (!$util.isInteger(message.slotTime) && !(message.slotTime && $util.isInteger(message.slotTime.low) && $util.isInteger(message.slotTime.high)))
                    return "slotTime: integer|Long expected";
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                if (!$util.isString(message.metaClientName))
                    return "metaClientName: string expected";
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                if (!$util.isString(message.metaClientGeoCity))
                    return "metaClientGeoCity: string expected";
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                if (!$util.isString(message.metaClientGeoCountry))
                    return "metaClientGeoCountry: string expected";
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                if (!$util.isString(message.metaClientGeoContinentCode))
                    return "metaClientGeoContinentCode: string expected";
            if (message.blobIndex != null && message.hasOwnProperty("blobIndex"))
                if (!$util.isInteger(message.blobIndex) && !(message.blobIndex && $util.isInteger(message.blobIndex.low) && $util.isInteger(message.blobIndex.high)))
                    return "blobIndex: integer|Long expected";
            return null;
        };

        /**
         * Creates a BlobArrivalTime message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BlobArrivalTime} BlobArrivalTime
         */
        BlobArrivalTime.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BlobArrivalTime)
                return object;
            var message = new $root.beacon_slots.BlobArrivalTime();
            if (object.slotTime != null)
                if ($util.Long)
                    (message.slotTime = $util.Long.fromValue(object.slotTime)).unsigned = false;
                else if (typeof object.slotTime === "string")
                    message.slotTime = parseInt(object.slotTime, 10);
                else if (typeof object.slotTime === "number")
                    message.slotTime = object.slotTime;
                else if (typeof object.slotTime === "object")
                    message.slotTime = new $util.LongBits(object.slotTime.low >>> 0, object.slotTime.high >>> 0).toNumber();
            if (object.metaClientName != null)
                message.metaClientName = String(object.metaClientName);
            if (object.metaClientGeoCity != null)
                message.metaClientGeoCity = String(object.metaClientGeoCity);
            if (object.metaClientGeoCountry != null)
                message.metaClientGeoCountry = String(object.metaClientGeoCountry);
            if (object.metaClientGeoContinentCode != null)
                message.metaClientGeoContinentCode = String(object.metaClientGeoContinentCode);
            if (object.blobIndex != null)
                if ($util.Long)
                    (message.blobIndex = $util.Long.fromValue(object.blobIndex)).unsigned = false;
                else if (typeof object.blobIndex === "string")
                    message.blobIndex = parseInt(object.blobIndex, 10);
                else if (typeof object.blobIndex === "number")
                    message.blobIndex = object.blobIndex;
                else if (typeof object.blobIndex === "object")
                    message.blobIndex = new $util.LongBits(object.blobIndex.low >>> 0, object.blobIndex.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a BlobArrivalTime message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {beacon_slots.BlobArrivalTime} message BlobArrivalTime
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlobArrivalTime.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.slotTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slotTime = options.longs === String ? "0" : 0;
                object.metaClientName = "";
                object.metaClientGeoCity = "";
                object.metaClientGeoCountry = "";
                object.metaClientGeoContinentCode = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.blobIndex = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.blobIndex = options.longs === String ? "0" : 0;
            }
            if (message.slotTime != null && message.hasOwnProperty("slotTime"))
                if (typeof message.slotTime === "number")
                    object.slotTime = options.longs === String ? String(message.slotTime) : message.slotTime;
                else
                    object.slotTime = options.longs === String ? $util.Long.prototype.toString.call(message.slotTime) : options.longs === Number ? new $util.LongBits(message.slotTime.low >>> 0, message.slotTime.high >>> 0).toNumber() : message.slotTime;
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                object.metaClientName = message.metaClientName;
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                object.metaClientGeoCity = message.metaClientGeoCity;
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                object.metaClientGeoCountry = message.metaClientGeoCountry;
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                object.metaClientGeoContinentCode = message.metaClientGeoContinentCode;
            if (message.blobIndex != null && message.hasOwnProperty("blobIndex"))
                if (typeof message.blobIndex === "number")
                    object.blobIndex = options.longs === String ? String(message.blobIndex) : message.blobIndex;
                else
                    object.blobIndex = options.longs === String ? $util.Long.prototype.toString.call(message.blobIndex) : options.longs === Number ? new $util.LongBits(message.blobIndex.low >>> 0, message.blobIndex.high >>> 0).toNumber() : message.blobIndex;
            return object;
        };

        /**
         * Converts this BlobArrivalTime to JSON.
         * @function toJSON
         * @memberof beacon_slots.BlobArrivalTime
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlobArrivalTime.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BlobArrivalTime
         * @function getTypeUrl
         * @memberof beacon_slots.BlobArrivalTime
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BlobArrivalTime.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BlobArrivalTime";
        };

        return BlobArrivalTime;
    })();

    beacon_slots.BlobArrivalTimes = (function() {

        /**
         * Properties of a BlobArrivalTimes.
         * @memberof beacon_slots
         * @interface IBlobArrivalTimes
         * @property {Array.<beacon_slots.IBlobArrivalTime>|null} [arrivalTimes] BlobArrivalTimes arrivalTimes
         */

        /**
         * Constructs a new BlobArrivalTimes.
         * @memberof beacon_slots
         * @classdesc Represents a BlobArrivalTimes.
         * @implements IBlobArrivalTimes
         * @constructor
         * @param {beacon_slots.IBlobArrivalTimes=} [properties] Properties to set
         */
        function BlobArrivalTimes(properties) {
            this.arrivalTimes = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlobArrivalTimes arrivalTimes.
         * @member {Array.<beacon_slots.IBlobArrivalTime>} arrivalTimes
         * @memberof beacon_slots.BlobArrivalTimes
         * @instance
         */
        BlobArrivalTimes.prototype.arrivalTimes = $util.emptyArray;

        /**
         * Creates a new BlobArrivalTimes instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {beacon_slots.IBlobArrivalTimes=} [properties] Properties to set
         * @returns {beacon_slots.BlobArrivalTimes} BlobArrivalTimes instance
         */
        BlobArrivalTimes.create = function create(properties) {
            return new BlobArrivalTimes(properties);
        };

        /**
         * Encodes the specified BlobArrivalTimes message. Does not implicitly {@link beacon_slots.BlobArrivalTimes.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {beacon_slots.IBlobArrivalTimes} message BlobArrivalTimes message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobArrivalTimes.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.arrivalTimes != null && message.arrivalTimes.length)
                for (var i = 0; i < message.arrivalTimes.length; ++i)
                    $root.beacon_slots.BlobArrivalTime.encode(message.arrivalTimes[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified BlobArrivalTimes message, length delimited. Does not implicitly {@link beacon_slots.BlobArrivalTimes.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {beacon_slots.IBlobArrivalTimes} message BlobArrivalTimes message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobArrivalTimes.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlobArrivalTimes message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BlobArrivalTimes} BlobArrivalTimes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobArrivalTimes.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BlobArrivalTimes();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.arrivalTimes && message.arrivalTimes.length))
                            message.arrivalTimes = [];
                        message.arrivalTimes.push($root.beacon_slots.BlobArrivalTime.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BlobArrivalTimes message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BlobArrivalTimes} BlobArrivalTimes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobArrivalTimes.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlobArrivalTimes message.
         * @function verify
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlobArrivalTimes.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.arrivalTimes != null && message.hasOwnProperty("arrivalTimes")) {
                if (!Array.isArray(message.arrivalTimes))
                    return "arrivalTimes: array expected";
                for (var i = 0; i < message.arrivalTimes.length; ++i) {
                    var error = $root.beacon_slots.BlobArrivalTime.verify(message.arrivalTimes[i]);
                    if (error)
                        return "arrivalTimes." + error;
                }
            }
            return null;
        };

        /**
         * Creates a BlobArrivalTimes message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BlobArrivalTimes} BlobArrivalTimes
         */
        BlobArrivalTimes.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BlobArrivalTimes)
                return object;
            var message = new $root.beacon_slots.BlobArrivalTimes();
            if (object.arrivalTimes) {
                if (!Array.isArray(object.arrivalTimes))
                    throw TypeError(".beacon_slots.BlobArrivalTimes.arrivalTimes: array expected");
                message.arrivalTimes = [];
                for (var i = 0; i < object.arrivalTimes.length; ++i) {
                    if (typeof object.arrivalTimes[i] !== "object")
                        throw TypeError(".beacon_slots.BlobArrivalTimes.arrivalTimes: object expected");
                    message.arrivalTimes[i] = $root.beacon_slots.BlobArrivalTime.fromObject(object.arrivalTimes[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a BlobArrivalTimes message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {beacon_slots.BlobArrivalTimes} message BlobArrivalTimes
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlobArrivalTimes.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.arrivalTimes = [];
            if (message.arrivalTimes && message.arrivalTimes.length) {
                object.arrivalTimes = [];
                for (var j = 0; j < message.arrivalTimes.length; ++j)
                    object.arrivalTimes[j] = $root.beacon_slots.BlobArrivalTime.toObject(message.arrivalTimes[j], options);
            }
            return object;
        };

        /**
         * Converts this BlobArrivalTimes to JSON.
         * @function toJSON
         * @memberof beacon_slots.BlobArrivalTimes
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlobArrivalTimes.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BlobArrivalTimes
         * @function getTypeUrl
         * @memberof beacon_slots.BlobArrivalTimes
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BlobArrivalTimes.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BlobArrivalTimes";
        };

        return BlobArrivalTimes;
    })();

    beacon_slots.FullTimings = (function() {

        /**
         * Properties of a FullTimings.
         * @memberof beacon_slots
         * @interface IFullTimings
         * @property {Object.<string,beacon_slots.IBlockArrivalTime>|null} [blockSeen] FullTimings blockSeen
         * @property {Object.<string,beacon_slots.IBlobArrivalTimes>|null} [blobSeen] FullTimings blobSeen
         * @property {Object.<string,beacon_slots.IBlockArrivalTime>|null} [blockFirstSeenP2p] FullTimings blockFirstSeenP2p
         * @property {Object.<string,beacon_slots.IBlobArrivalTimes>|null} [blobFirstSeenP2p] FullTimings blobFirstSeenP2p
         */

        /**
         * Constructs a new FullTimings.
         * @memberof beacon_slots
         * @classdesc Represents a FullTimings.
         * @implements IFullTimings
         * @constructor
         * @param {beacon_slots.IFullTimings=} [properties] Properties to set
         */
        function FullTimings(properties) {
            this.blockSeen = {};
            this.blobSeen = {};
            this.blockFirstSeenP2p = {};
            this.blobFirstSeenP2p = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * FullTimings blockSeen.
         * @member {Object.<string,beacon_slots.IBlockArrivalTime>} blockSeen
         * @memberof beacon_slots.FullTimings
         * @instance
         */
        FullTimings.prototype.blockSeen = $util.emptyObject;

        /**
         * FullTimings blobSeen.
         * @member {Object.<string,beacon_slots.IBlobArrivalTimes>} blobSeen
         * @memberof beacon_slots.FullTimings
         * @instance
         */
        FullTimings.prototype.blobSeen = $util.emptyObject;

        /**
         * FullTimings blockFirstSeenP2p.
         * @member {Object.<string,beacon_slots.IBlockArrivalTime>} blockFirstSeenP2p
         * @memberof beacon_slots.FullTimings
         * @instance
         */
        FullTimings.prototype.blockFirstSeenP2p = $util.emptyObject;

        /**
         * FullTimings blobFirstSeenP2p.
         * @member {Object.<string,beacon_slots.IBlobArrivalTimes>} blobFirstSeenP2p
         * @memberof beacon_slots.FullTimings
         * @instance
         */
        FullTimings.prototype.blobFirstSeenP2p = $util.emptyObject;

        /**
         * Creates a new FullTimings instance using the specified properties.
         * @function create
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {beacon_slots.IFullTimings=} [properties] Properties to set
         * @returns {beacon_slots.FullTimings} FullTimings instance
         */
        FullTimings.create = function create(properties) {
            return new FullTimings(properties);
        };

        /**
         * Encodes the specified FullTimings message. Does not implicitly {@link beacon_slots.FullTimings.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {beacon_slots.IFullTimings} message FullTimings message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FullTimings.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.blockSeen != null && Object.hasOwnProperty.call(message, "blockSeen"))
                for (var keys = Object.keys(message.blockSeen), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlockArrivalTime.encode(message.blockSeen[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.blobSeen != null && Object.hasOwnProperty.call(message, "blobSeen"))
                for (var keys = Object.keys(message.blobSeen), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlobArrivalTimes.encode(message.blobSeen[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.blockFirstSeenP2p != null && Object.hasOwnProperty.call(message, "blockFirstSeenP2p"))
                for (var keys = Object.keys(message.blockFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlockArrivalTime.encode(message.blockFirstSeenP2p[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.blobFirstSeenP2p != null && Object.hasOwnProperty.call(message, "blobFirstSeenP2p"))
                for (var keys = Object.keys(message.blobFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlobArrivalTimes.encode(message.blobFirstSeenP2p[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Encodes the specified FullTimings message, length delimited. Does not implicitly {@link beacon_slots.FullTimings.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {beacon_slots.IFullTimings} message FullTimings message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        FullTimings.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a FullTimings message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.FullTimings} FullTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FullTimings.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.FullTimings(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (message.blockSeen === $util.emptyObject)
                            message.blockSeen = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlockArrivalTime.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blockSeen[key] = value;
                        break;
                    }
                case 2: {
                        if (message.blobSeen === $util.emptyObject)
                            message.blobSeen = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlobArrivalTimes.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blobSeen[key] = value;
                        break;
                    }
                case 3: {
                        if (message.blockFirstSeenP2p === $util.emptyObject)
                            message.blockFirstSeenP2p = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlockArrivalTime.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blockFirstSeenP2p[key] = value;
                        break;
                    }
                case 4: {
                        if (message.blobFirstSeenP2p === $util.emptyObject)
                            message.blobFirstSeenP2p = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlobArrivalTimes.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blobFirstSeenP2p[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a FullTimings message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.FullTimings} FullTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        FullTimings.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a FullTimings message.
         * @function verify
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        FullTimings.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.blockSeen != null && message.hasOwnProperty("blockSeen")) {
                if (!$util.isObject(message.blockSeen))
                    return "blockSeen: object expected";
                var key = Object.keys(message.blockSeen);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlockArrivalTime.verify(message.blockSeen[key[i]]);
                    if (error)
                        return "blockSeen." + error;
                }
            }
            if (message.blobSeen != null && message.hasOwnProperty("blobSeen")) {
                if (!$util.isObject(message.blobSeen))
                    return "blobSeen: object expected";
                var key = Object.keys(message.blobSeen);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlobArrivalTimes.verify(message.blobSeen[key[i]]);
                    if (error)
                        return "blobSeen." + error;
                }
            }
            if (message.blockFirstSeenP2p != null && message.hasOwnProperty("blockFirstSeenP2p")) {
                if (!$util.isObject(message.blockFirstSeenP2p))
                    return "blockFirstSeenP2p: object expected";
                var key = Object.keys(message.blockFirstSeenP2p);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlockArrivalTime.verify(message.blockFirstSeenP2p[key[i]]);
                    if (error)
                        return "blockFirstSeenP2p." + error;
                }
            }
            if (message.blobFirstSeenP2p != null && message.hasOwnProperty("blobFirstSeenP2p")) {
                if (!$util.isObject(message.blobFirstSeenP2p))
                    return "blobFirstSeenP2p: object expected";
                var key = Object.keys(message.blobFirstSeenP2p);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlobArrivalTimes.verify(message.blobFirstSeenP2p[key[i]]);
                    if (error)
                        return "blobFirstSeenP2p." + error;
                }
            }
            return null;
        };

        /**
         * Creates a FullTimings message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.FullTimings} FullTimings
         */
        FullTimings.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.FullTimings)
                return object;
            var message = new $root.beacon_slots.FullTimings();
            if (object.blockSeen) {
                if (typeof object.blockSeen !== "object")
                    throw TypeError(".beacon_slots.FullTimings.blockSeen: object expected");
                message.blockSeen = {};
                for (var keys = Object.keys(object.blockSeen), i = 0; i < keys.length; ++i) {
                    if (typeof object.blockSeen[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.FullTimings.blockSeen: object expected");
                    message.blockSeen[keys[i]] = $root.beacon_slots.BlockArrivalTime.fromObject(object.blockSeen[keys[i]]);
                }
            }
            if (object.blobSeen) {
                if (typeof object.blobSeen !== "object")
                    throw TypeError(".beacon_slots.FullTimings.blobSeen: object expected");
                message.blobSeen = {};
                for (var keys = Object.keys(object.blobSeen), i = 0; i < keys.length; ++i) {
                    if (typeof object.blobSeen[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.FullTimings.blobSeen: object expected");
                    message.blobSeen[keys[i]] = $root.beacon_slots.BlobArrivalTimes.fromObject(object.blobSeen[keys[i]]);
                }
            }
            if (object.blockFirstSeenP2p) {
                if (typeof object.blockFirstSeenP2p !== "object")
                    throw TypeError(".beacon_slots.FullTimings.blockFirstSeenP2p: object expected");
                message.blockFirstSeenP2p = {};
                for (var keys = Object.keys(object.blockFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    if (typeof object.blockFirstSeenP2p[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.FullTimings.blockFirstSeenP2p: object expected");
                    message.blockFirstSeenP2p[keys[i]] = $root.beacon_slots.BlockArrivalTime.fromObject(object.blockFirstSeenP2p[keys[i]]);
                }
            }
            if (object.blobFirstSeenP2p) {
                if (typeof object.blobFirstSeenP2p !== "object")
                    throw TypeError(".beacon_slots.FullTimings.blobFirstSeenP2p: object expected");
                message.blobFirstSeenP2p = {};
                for (var keys = Object.keys(object.blobFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    if (typeof object.blobFirstSeenP2p[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.FullTimings.blobFirstSeenP2p: object expected");
                    message.blobFirstSeenP2p[keys[i]] = $root.beacon_slots.BlobArrivalTimes.fromObject(object.blobFirstSeenP2p[keys[i]]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a FullTimings message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {beacon_slots.FullTimings} message FullTimings
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        FullTimings.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults) {
                object.blockSeen = {};
                object.blobSeen = {};
                object.blockFirstSeenP2p = {};
                object.blobFirstSeenP2p = {};
            }
            var keys2;
            if (message.blockSeen && (keys2 = Object.keys(message.blockSeen)).length) {
                object.blockSeen = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blockSeen[keys2[j]] = $root.beacon_slots.BlockArrivalTime.toObject(message.blockSeen[keys2[j]], options);
            }
            if (message.blobSeen && (keys2 = Object.keys(message.blobSeen)).length) {
                object.blobSeen = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blobSeen[keys2[j]] = $root.beacon_slots.BlobArrivalTimes.toObject(message.blobSeen[keys2[j]], options);
            }
            if (message.blockFirstSeenP2p && (keys2 = Object.keys(message.blockFirstSeenP2p)).length) {
                object.blockFirstSeenP2p = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blockFirstSeenP2p[keys2[j]] = $root.beacon_slots.BlockArrivalTime.toObject(message.blockFirstSeenP2p[keys2[j]], options);
            }
            if (message.blobFirstSeenP2p && (keys2 = Object.keys(message.blobFirstSeenP2p)).length) {
                object.blobFirstSeenP2p = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blobFirstSeenP2p[keys2[j]] = $root.beacon_slots.BlobArrivalTimes.toObject(message.blobFirstSeenP2p[keys2[j]], options);
            }
            return object;
        };

        /**
         * Converts this FullTimings to JSON.
         * @function toJSON
         * @memberof beacon_slots.FullTimings
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        FullTimings.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for FullTimings
         * @function getTypeUrl
         * @memberof beacon_slots.FullTimings
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        FullTimings.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.FullTimings";
        };

        return FullTimings;
    })();

    beacon_slots.SlimTimings = (function() {

        /**
         * Properties of a SlimTimings.
         * @memberof beacon_slots
         * @interface ISlimTimings
         * @property {Object.<string,number|Long>|null} [blockSeen] SlimTimings blockSeen
         * @property {Object.<string,beacon_slots.IBlobTimingMap>|null} [blobSeen] SlimTimings blobSeen
         * @property {Object.<string,number|Long>|null} [blockFirstSeenP2p] SlimTimings blockFirstSeenP2p
         * @property {Object.<string,beacon_slots.IBlobTimingMap>|null} [blobFirstSeenP2p] SlimTimings blobFirstSeenP2p
         */

        /**
         * Constructs a new SlimTimings.
         * @memberof beacon_slots
         * @classdesc Represents a SlimTimings.
         * @implements ISlimTimings
         * @constructor
         * @param {beacon_slots.ISlimTimings=} [properties] Properties to set
         */
        function SlimTimings(properties) {
            this.blockSeen = {};
            this.blobSeen = {};
            this.blockFirstSeenP2p = {};
            this.blobFirstSeenP2p = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SlimTimings blockSeen.
         * @member {Object.<string,number|Long>} blockSeen
         * @memberof beacon_slots.SlimTimings
         * @instance
         */
        SlimTimings.prototype.blockSeen = $util.emptyObject;

        /**
         * SlimTimings blobSeen.
         * @member {Object.<string,beacon_slots.IBlobTimingMap>} blobSeen
         * @memberof beacon_slots.SlimTimings
         * @instance
         */
        SlimTimings.prototype.blobSeen = $util.emptyObject;

        /**
         * SlimTimings blockFirstSeenP2p.
         * @member {Object.<string,number|Long>} blockFirstSeenP2p
         * @memberof beacon_slots.SlimTimings
         * @instance
         */
        SlimTimings.prototype.blockFirstSeenP2p = $util.emptyObject;

        /**
         * SlimTimings blobFirstSeenP2p.
         * @member {Object.<string,beacon_slots.IBlobTimingMap>} blobFirstSeenP2p
         * @memberof beacon_slots.SlimTimings
         * @instance
         */
        SlimTimings.prototype.blobFirstSeenP2p = $util.emptyObject;

        /**
         * Creates a new SlimTimings instance using the specified properties.
         * @function create
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {beacon_slots.ISlimTimings=} [properties] Properties to set
         * @returns {beacon_slots.SlimTimings} SlimTimings instance
         */
        SlimTimings.create = function create(properties) {
            return new SlimTimings(properties);
        };

        /**
         * Encodes the specified SlimTimings message. Does not implicitly {@link beacon_slots.SlimTimings.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {beacon_slots.ISlimTimings} message SlimTimings message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SlimTimings.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.blockSeen != null && Object.hasOwnProperty.call(message, "blockSeen"))
                for (var keys = Object.keys(message.blockSeen), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 0 =*/16).int64(message.blockSeen[keys[i]]).ldelim();
            if (message.blobSeen != null && Object.hasOwnProperty.call(message, "blobSeen"))
                for (var keys = Object.keys(message.blobSeen), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlobTimingMap.encode(message.blobSeen[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.blockFirstSeenP2p != null && Object.hasOwnProperty.call(message, "blockFirstSeenP2p"))
                for (var keys = Object.keys(message.blockFirstSeenP2p), i = 0; i < keys.length; ++i)
                    writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 0 =*/16).int64(message.blockFirstSeenP2p[keys[i]]).ldelim();
            if (message.blobFirstSeenP2p != null && Object.hasOwnProperty.call(message, "blobFirstSeenP2p"))
                for (var keys = Object.keys(message.blobFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.BlobTimingMap.encode(message.blobFirstSeenP2p[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Encodes the specified SlimTimings message, length delimited. Does not implicitly {@link beacon_slots.SlimTimings.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {beacon_slots.ISlimTimings} message SlimTimings message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SlimTimings.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SlimTimings message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.SlimTimings} SlimTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SlimTimings.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.SlimTimings(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (message.blockSeen === $util.emptyObject)
                            message.blockSeen = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = 0;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.int64();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blockSeen[key] = value;
                        break;
                    }
                case 2: {
                        if (message.blobSeen === $util.emptyObject)
                            message.blobSeen = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlobTimingMap.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blobSeen[key] = value;
                        break;
                    }
                case 3: {
                        if (message.blockFirstSeenP2p === $util.emptyObject)
                            message.blockFirstSeenP2p = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = 0;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = reader.int64();
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blockFirstSeenP2p[key] = value;
                        break;
                    }
                case 4: {
                        if (message.blobFirstSeenP2p === $util.emptyObject)
                            message.blobFirstSeenP2p = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.BlobTimingMap.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.blobFirstSeenP2p[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SlimTimings message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.SlimTimings} SlimTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SlimTimings.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SlimTimings message.
         * @function verify
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SlimTimings.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.blockSeen != null && message.hasOwnProperty("blockSeen")) {
                if (!$util.isObject(message.blockSeen))
                    return "blockSeen: object expected";
                var key = Object.keys(message.blockSeen);
                for (var i = 0; i < key.length; ++i)
                    if (!$util.isInteger(message.blockSeen[key[i]]) && !(message.blockSeen[key[i]] && $util.isInteger(message.blockSeen[key[i]].low) && $util.isInteger(message.blockSeen[key[i]].high)))
                        return "blockSeen: integer|Long{k:string} expected";
            }
            if (message.blobSeen != null && message.hasOwnProperty("blobSeen")) {
                if (!$util.isObject(message.blobSeen))
                    return "blobSeen: object expected";
                var key = Object.keys(message.blobSeen);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlobTimingMap.verify(message.blobSeen[key[i]]);
                    if (error)
                        return "blobSeen." + error;
                }
            }
            if (message.blockFirstSeenP2p != null && message.hasOwnProperty("blockFirstSeenP2p")) {
                if (!$util.isObject(message.blockFirstSeenP2p))
                    return "blockFirstSeenP2p: object expected";
                var key = Object.keys(message.blockFirstSeenP2p);
                for (var i = 0; i < key.length; ++i)
                    if (!$util.isInteger(message.blockFirstSeenP2p[key[i]]) && !(message.blockFirstSeenP2p[key[i]] && $util.isInteger(message.blockFirstSeenP2p[key[i]].low) && $util.isInteger(message.blockFirstSeenP2p[key[i]].high)))
                        return "blockFirstSeenP2p: integer|Long{k:string} expected";
            }
            if (message.blobFirstSeenP2p != null && message.hasOwnProperty("blobFirstSeenP2p")) {
                if (!$util.isObject(message.blobFirstSeenP2p))
                    return "blobFirstSeenP2p: object expected";
                var key = Object.keys(message.blobFirstSeenP2p);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.BlobTimingMap.verify(message.blobFirstSeenP2p[key[i]]);
                    if (error)
                        return "blobFirstSeenP2p." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SlimTimings message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.SlimTimings} SlimTimings
         */
        SlimTimings.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.SlimTimings)
                return object;
            var message = new $root.beacon_slots.SlimTimings();
            if (object.blockSeen) {
                if (typeof object.blockSeen !== "object")
                    throw TypeError(".beacon_slots.SlimTimings.blockSeen: object expected");
                message.blockSeen = {};
                for (var keys = Object.keys(object.blockSeen), i = 0; i < keys.length; ++i)
                    if ($util.Long)
                        (message.blockSeen[keys[i]] = $util.Long.fromValue(object.blockSeen[keys[i]])).unsigned = false;
                    else if (typeof object.blockSeen[keys[i]] === "string")
                        message.blockSeen[keys[i]] = parseInt(object.blockSeen[keys[i]], 10);
                    else if (typeof object.blockSeen[keys[i]] === "number")
                        message.blockSeen[keys[i]] = object.blockSeen[keys[i]];
                    else if (typeof object.blockSeen[keys[i]] === "object")
                        message.blockSeen[keys[i]] = new $util.LongBits(object.blockSeen[keys[i]].low >>> 0, object.blockSeen[keys[i]].high >>> 0).toNumber();
            }
            if (object.blobSeen) {
                if (typeof object.blobSeen !== "object")
                    throw TypeError(".beacon_slots.SlimTimings.blobSeen: object expected");
                message.blobSeen = {};
                for (var keys = Object.keys(object.blobSeen), i = 0; i < keys.length; ++i) {
                    if (typeof object.blobSeen[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.SlimTimings.blobSeen: object expected");
                    message.blobSeen[keys[i]] = $root.beacon_slots.BlobTimingMap.fromObject(object.blobSeen[keys[i]]);
                }
            }
            if (object.blockFirstSeenP2p) {
                if (typeof object.blockFirstSeenP2p !== "object")
                    throw TypeError(".beacon_slots.SlimTimings.blockFirstSeenP2p: object expected");
                message.blockFirstSeenP2p = {};
                for (var keys = Object.keys(object.blockFirstSeenP2p), i = 0; i < keys.length; ++i)
                    if ($util.Long)
                        (message.blockFirstSeenP2p[keys[i]] = $util.Long.fromValue(object.blockFirstSeenP2p[keys[i]])).unsigned = false;
                    else if (typeof object.blockFirstSeenP2p[keys[i]] === "string")
                        message.blockFirstSeenP2p[keys[i]] = parseInt(object.blockFirstSeenP2p[keys[i]], 10);
                    else if (typeof object.blockFirstSeenP2p[keys[i]] === "number")
                        message.blockFirstSeenP2p[keys[i]] = object.blockFirstSeenP2p[keys[i]];
                    else if (typeof object.blockFirstSeenP2p[keys[i]] === "object")
                        message.blockFirstSeenP2p[keys[i]] = new $util.LongBits(object.blockFirstSeenP2p[keys[i]].low >>> 0, object.blockFirstSeenP2p[keys[i]].high >>> 0).toNumber();
            }
            if (object.blobFirstSeenP2p) {
                if (typeof object.blobFirstSeenP2p !== "object")
                    throw TypeError(".beacon_slots.SlimTimings.blobFirstSeenP2p: object expected");
                message.blobFirstSeenP2p = {};
                for (var keys = Object.keys(object.blobFirstSeenP2p), i = 0; i < keys.length; ++i) {
                    if (typeof object.blobFirstSeenP2p[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.SlimTimings.blobFirstSeenP2p: object expected");
                    message.blobFirstSeenP2p[keys[i]] = $root.beacon_slots.BlobTimingMap.fromObject(object.blobFirstSeenP2p[keys[i]]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a SlimTimings message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {beacon_slots.SlimTimings} message SlimTimings
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SlimTimings.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults) {
                object.blockSeen = {};
                object.blobSeen = {};
                object.blockFirstSeenP2p = {};
                object.blobFirstSeenP2p = {};
            }
            var keys2;
            if (message.blockSeen && (keys2 = Object.keys(message.blockSeen)).length) {
                object.blockSeen = {};
                for (var j = 0; j < keys2.length; ++j)
                    if (typeof message.blockSeen[keys2[j]] === "number")
                        object.blockSeen[keys2[j]] = options.longs === String ? String(message.blockSeen[keys2[j]]) : message.blockSeen[keys2[j]];
                    else
                        object.blockSeen[keys2[j]] = options.longs === String ? $util.Long.prototype.toString.call(message.blockSeen[keys2[j]]) : options.longs === Number ? new $util.LongBits(message.blockSeen[keys2[j]].low >>> 0, message.blockSeen[keys2[j]].high >>> 0).toNumber() : message.blockSeen[keys2[j]];
            }
            if (message.blobSeen && (keys2 = Object.keys(message.blobSeen)).length) {
                object.blobSeen = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blobSeen[keys2[j]] = $root.beacon_slots.BlobTimingMap.toObject(message.blobSeen[keys2[j]], options);
            }
            if (message.blockFirstSeenP2p && (keys2 = Object.keys(message.blockFirstSeenP2p)).length) {
                object.blockFirstSeenP2p = {};
                for (var j = 0; j < keys2.length; ++j)
                    if (typeof message.blockFirstSeenP2p[keys2[j]] === "number")
                        object.blockFirstSeenP2p[keys2[j]] = options.longs === String ? String(message.blockFirstSeenP2p[keys2[j]]) : message.blockFirstSeenP2p[keys2[j]];
                    else
                        object.blockFirstSeenP2p[keys2[j]] = options.longs === String ? $util.Long.prototype.toString.call(message.blockFirstSeenP2p[keys2[j]]) : options.longs === Number ? new $util.LongBits(message.blockFirstSeenP2p[keys2[j]].low >>> 0, message.blockFirstSeenP2p[keys2[j]].high >>> 0).toNumber() : message.blockFirstSeenP2p[keys2[j]];
            }
            if (message.blobFirstSeenP2p && (keys2 = Object.keys(message.blobFirstSeenP2p)).length) {
                object.blobFirstSeenP2p = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.blobFirstSeenP2p[keys2[j]] = $root.beacon_slots.BlobTimingMap.toObject(message.blobFirstSeenP2p[keys2[j]], options);
            }
            return object;
        };

        /**
         * Converts this SlimTimings to JSON.
         * @function toJSON
         * @memberof beacon_slots.SlimTimings
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SlimTimings.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SlimTimings
         * @function getTypeUrl
         * @memberof beacon_slots.SlimTimings
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SlimTimings.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.SlimTimings";
        };

        return SlimTimings;
    })();

    beacon_slots.BeaconSlotData = (function() {

        /**
         * Properties of a BeaconSlotData.
         * @memberof beacon_slots
         * @interface IBeaconSlotData
         * @property {number|Long|null} [slot] BeaconSlotData slot
         * @property {string|null} [network] BeaconSlotData network
         * @property {string|null} [processedAt] BeaconSlotData processedAt
         * @property {number|Long|null} [processingTimeMs] BeaconSlotData processingTimeMs
         * @property {beacon_slots.IBlockData|null} [block] BeaconSlotData block
         * @property {beacon_slots.IProposer|null} [proposer] BeaconSlotData proposer
         * @property {string|null} [entity] BeaconSlotData entity
         * @property {Object.<string,beacon_slots.INode>|null} [nodes] BeaconSlotData nodes
         * @property {beacon_slots.ISlimTimings|null} [timings] BeaconSlotData timings
         * @property {beacon_slots.IAttestationsData|null} [attestations] BeaconSlotData attestations
         */

        /**
         * Constructs a new BeaconSlotData.
         * @memberof beacon_slots
         * @classdesc Represents a BeaconSlotData.
         * @implements IBeaconSlotData
         * @constructor
         * @param {beacon_slots.IBeaconSlotData=} [properties] Properties to set
         */
        function BeaconSlotData(properties) {
            this.nodes = {};
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BeaconSlotData slot.
         * @member {number|Long} slot
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.slot = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BeaconSlotData network.
         * @member {string} network
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.network = "";

        /**
         * BeaconSlotData processedAt.
         * @member {string} processedAt
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.processedAt = "";

        /**
         * BeaconSlotData processingTimeMs.
         * @member {number|Long} processingTimeMs
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.processingTimeMs = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * BeaconSlotData block.
         * @member {beacon_slots.IBlockData|null|undefined} block
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.block = null;

        /**
         * BeaconSlotData proposer.
         * @member {beacon_slots.IProposer|null|undefined} proposer
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.proposer = null;

        /**
         * BeaconSlotData entity.
         * @member {string} entity
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.entity = "";

        /**
         * BeaconSlotData nodes.
         * @member {Object.<string,beacon_slots.INode>} nodes
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.nodes = $util.emptyObject;

        /**
         * BeaconSlotData timings.
         * @member {beacon_slots.ISlimTimings|null|undefined} timings
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.timings = null;

        /**
         * BeaconSlotData attestations.
         * @member {beacon_slots.IAttestationsData|null|undefined} attestations
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         */
        BeaconSlotData.prototype.attestations = null;

        /**
         * Creates a new BeaconSlotData instance using the specified properties.
         * @function create
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {beacon_slots.IBeaconSlotData=} [properties] Properties to set
         * @returns {beacon_slots.BeaconSlotData} BeaconSlotData instance
         */
        BeaconSlotData.create = function create(properties) {
            return new BeaconSlotData(properties);
        };

        /**
         * Encodes the specified BeaconSlotData message. Does not implicitly {@link beacon_slots.BeaconSlotData.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {beacon_slots.IBeaconSlotData} message BeaconSlotData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BeaconSlotData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slot != null && Object.hasOwnProperty.call(message, "slot"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.slot);
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.network);
            if (message.processedAt != null && Object.hasOwnProperty.call(message, "processedAt"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.processedAt);
            if (message.processingTimeMs != null && Object.hasOwnProperty.call(message, "processingTimeMs"))
                writer.uint32(/* id 4, wireType 0 =*/32).int64(message.processingTimeMs);
            if (message.block != null && Object.hasOwnProperty.call(message, "block"))
                $root.beacon_slots.BlockData.encode(message.block, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.proposer != null && Object.hasOwnProperty.call(message, "proposer"))
                $root.beacon_slots.Proposer.encode(message.proposer, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.entity != null && Object.hasOwnProperty.call(message, "entity"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.entity);
            if (message.nodes != null && Object.hasOwnProperty.call(message, "nodes"))
                for (var keys = Object.keys(message.nodes), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 8, wireType 2 =*/66).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.beacon_slots.Node.encode(message.nodes[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.timings != null && Object.hasOwnProperty.call(message, "timings"))
                $root.beacon_slots.SlimTimings.encode(message.timings, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.attestations != null && Object.hasOwnProperty.call(message, "attestations"))
                $root.beacon_slots.AttestationsData.encode(message.attestations, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified BeaconSlotData message, length delimited. Does not implicitly {@link beacon_slots.BeaconSlotData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {beacon_slots.IBeaconSlotData} message BeaconSlotData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BeaconSlotData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BeaconSlotData message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.BeaconSlotData} BeaconSlotData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BeaconSlotData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.BeaconSlotData(), key, value;
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slot = reader.int64();
                        break;
                    }
                case 2: {
                        message.network = reader.string();
                        break;
                    }
                case 3: {
                        message.processedAt = reader.string();
                        break;
                    }
                case 4: {
                        message.processingTimeMs = reader.int64();
                        break;
                    }
                case 5: {
                        message.block = $root.beacon_slots.BlockData.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.proposer = $root.beacon_slots.Proposer.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        message.entity = reader.string();
                        break;
                    }
                case 8: {
                        if (message.nodes === $util.emptyObject)
                            message.nodes = {};
                        var end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            var tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.beacon_slots.Node.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.nodes[key] = value;
                        break;
                    }
                case 9: {
                        message.timings = $root.beacon_slots.SlimTimings.decode(reader, reader.uint32());
                        break;
                    }
                case 10: {
                        message.attestations = $root.beacon_slots.AttestationsData.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a BeaconSlotData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.BeaconSlotData} BeaconSlotData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BeaconSlotData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BeaconSlotData message.
         * @function verify
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BeaconSlotData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (!$util.isInteger(message.slot) && !(message.slot && $util.isInteger(message.slot.low) && $util.isInteger(message.slot.high)))
                    return "slot: integer|Long expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            if (message.processedAt != null && message.hasOwnProperty("processedAt"))
                if (!$util.isString(message.processedAt))
                    return "processedAt: string expected";
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (!$util.isInteger(message.processingTimeMs) && !(message.processingTimeMs && $util.isInteger(message.processingTimeMs.low) && $util.isInteger(message.processingTimeMs.high)))
                    return "processingTimeMs: integer|Long expected";
            if (message.block != null && message.hasOwnProperty("block")) {
                var error = $root.beacon_slots.BlockData.verify(message.block);
                if (error)
                    return "block." + error;
            }
            if (message.proposer != null && message.hasOwnProperty("proposer")) {
                var error = $root.beacon_slots.Proposer.verify(message.proposer);
                if (error)
                    return "proposer." + error;
            }
            if (message.entity != null && message.hasOwnProperty("entity"))
                if (!$util.isString(message.entity))
                    return "entity: string expected";
            if (message.nodes != null && message.hasOwnProperty("nodes")) {
                if (!$util.isObject(message.nodes))
                    return "nodes: object expected";
                var key = Object.keys(message.nodes);
                for (var i = 0; i < key.length; ++i) {
                    var error = $root.beacon_slots.Node.verify(message.nodes[key[i]]);
                    if (error)
                        return "nodes." + error;
                }
            }
            if (message.timings != null && message.hasOwnProperty("timings")) {
                var error = $root.beacon_slots.SlimTimings.verify(message.timings);
                if (error)
                    return "timings." + error;
            }
            if (message.attestations != null && message.hasOwnProperty("attestations")) {
                var error = $root.beacon_slots.AttestationsData.verify(message.attestations);
                if (error)
                    return "attestations." + error;
            }
            return null;
        };

        /**
         * Creates a BeaconSlotData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.BeaconSlotData} BeaconSlotData
         */
        BeaconSlotData.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.BeaconSlotData)
                return object;
            var message = new $root.beacon_slots.BeaconSlotData();
            if (object.slot != null)
                if ($util.Long)
                    (message.slot = $util.Long.fromValue(object.slot)).unsigned = false;
                else if (typeof object.slot === "string")
                    message.slot = parseInt(object.slot, 10);
                else if (typeof object.slot === "number")
                    message.slot = object.slot;
                else if (typeof object.slot === "object")
                    message.slot = new $util.LongBits(object.slot.low >>> 0, object.slot.high >>> 0).toNumber();
            if (object.network != null)
                message.network = String(object.network);
            if (object.processedAt != null)
                message.processedAt = String(object.processedAt);
            if (object.processingTimeMs != null)
                if ($util.Long)
                    (message.processingTimeMs = $util.Long.fromValue(object.processingTimeMs)).unsigned = false;
                else if (typeof object.processingTimeMs === "string")
                    message.processingTimeMs = parseInt(object.processingTimeMs, 10);
                else if (typeof object.processingTimeMs === "number")
                    message.processingTimeMs = object.processingTimeMs;
                else if (typeof object.processingTimeMs === "object")
                    message.processingTimeMs = new $util.LongBits(object.processingTimeMs.low >>> 0, object.processingTimeMs.high >>> 0).toNumber();
            if (object.block != null) {
                if (typeof object.block !== "object")
                    throw TypeError(".beacon_slots.BeaconSlotData.block: object expected");
                message.block = $root.beacon_slots.BlockData.fromObject(object.block);
            }
            if (object.proposer != null) {
                if (typeof object.proposer !== "object")
                    throw TypeError(".beacon_slots.BeaconSlotData.proposer: object expected");
                message.proposer = $root.beacon_slots.Proposer.fromObject(object.proposer);
            }
            if (object.entity != null)
                message.entity = String(object.entity);
            if (object.nodes) {
                if (typeof object.nodes !== "object")
                    throw TypeError(".beacon_slots.BeaconSlotData.nodes: object expected");
                message.nodes = {};
                for (var keys = Object.keys(object.nodes), i = 0; i < keys.length; ++i) {
                    if (typeof object.nodes[keys[i]] !== "object")
                        throw TypeError(".beacon_slots.BeaconSlotData.nodes: object expected");
                    message.nodes[keys[i]] = $root.beacon_slots.Node.fromObject(object.nodes[keys[i]]);
                }
            }
            if (object.timings != null) {
                if (typeof object.timings !== "object")
                    throw TypeError(".beacon_slots.BeaconSlotData.timings: object expected");
                message.timings = $root.beacon_slots.SlimTimings.fromObject(object.timings);
            }
            if (object.attestations != null) {
                if (typeof object.attestations !== "object")
                    throw TypeError(".beacon_slots.BeaconSlotData.attestations: object expected");
                message.attestations = $root.beacon_slots.AttestationsData.fromObject(object.attestations);
            }
            return message;
        };

        /**
         * Creates a plain object from a BeaconSlotData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {beacon_slots.BeaconSlotData} message BeaconSlotData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BeaconSlotData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.objects || options.defaults)
                object.nodes = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.slot = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slot = options.longs === String ? "0" : 0;
                object.network = "";
                object.processedAt = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.processingTimeMs = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.processingTimeMs = options.longs === String ? "0" : 0;
                object.block = null;
                object.proposer = null;
                object.entity = "";
                object.timings = null;
                object.attestations = null;
            }
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (typeof message.slot === "number")
                    object.slot = options.longs === String ? String(message.slot) : message.slot;
                else
                    object.slot = options.longs === String ? $util.Long.prototype.toString.call(message.slot) : options.longs === Number ? new $util.LongBits(message.slot.low >>> 0, message.slot.high >>> 0).toNumber() : message.slot;
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            if (message.processedAt != null && message.hasOwnProperty("processedAt"))
                object.processedAt = message.processedAt;
            if (message.processingTimeMs != null && message.hasOwnProperty("processingTimeMs"))
                if (typeof message.processingTimeMs === "number")
                    object.processingTimeMs = options.longs === String ? String(message.processingTimeMs) : message.processingTimeMs;
                else
                    object.processingTimeMs = options.longs === String ? $util.Long.prototype.toString.call(message.processingTimeMs) : options.longs === Number ? new $util.LongBits(message.processingTimeMs.low >>> 0, message.processingTimeMs.high >>> 0).toNumber() : message.processingTimeMs;
            if (message.block != null && message.hasOwnProperty("block"))
                object.block = $root.beacon_slots.BlockData.toObject(message.block, options);
            if (message.proposer != null && message.hasOwnProperty("proposer"))
                object.proposer = $root.beacon_slots.Proposer.toObject(message.proposer, options);
            if (message.entity != null && message.hasOwnProperty("entity"))
                object.entity = message.entity;
            var keys2;
            if (message.nodes && (keys2 = Object.keys(message.nodes)).length) {
                object.nodes = {};
                for (var j = 0; j < keys2.length; ++j)
                    object.nodes[keys2[j]] = $root.beacon_slots.Node.toObject(message.nodes[keys2[j]], options);
            }
            if (message.timings != null && message.hasOwnProperty("timings"))
                object.timings = $root.beacon_slots.SlimTimings.toObject(message.timings, options);
            if (message.attestations != null && message.hasOwnProperty("attestations"))
                object.attestations = $root.beacon_slots.AttestationsData.toObject(message.attestations, options);
            return object;
        };

        /**
         * Converts this BeaconSlotData to JSON.
         * @function toJSON
         * @memberof beacon_slots.BeaconSlotData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BeaconSlotData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for BeaconSlotData
         * @function getTypeUrl
         * @memberof beacon_slots.BeaconSlotData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        BeaconSlotData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.BeaconSlotData";
        };

        return BeaconSlotData;
    })();

    beacon_slots.LocallyBuiltBlockMetadata = (function() {

        /**
         * Properties of a LocallyBuiltBlockMetadata.
         * @memberof beacon_slots
         * @interface ILocallyBuiltBlockMetadata
         * @property {string|null} [metaClientName] LocallyBuiltBlockMetadata metaClientName
         * @property {google.protobuf.ITimestamp|null} [eventDateTime] LocallyBuiltBlockMetadata eventDateTime
         * @property {string|null} [metaClientVersion] LocallyBuiltBlockMetadata metaClientVersion
         * @property {string|null} [metaClientImplementation] LocallyBuiltBlockMetadata metaClientImplementation
         * @property {string|null} [metaClientGeoCity] LocallyBuiltBlockMetadata metaClientGeoCity
         * @property {string|null} [metaClientGeoCountry] LocallyBuiltBlockMetadata metaClientGeoCountry
         * @property {string|null} [metaClientGeoCountryCode] LocallyBuiltBlockMetadata metaClientGeoCountryCode
         * @property {string|null} [metaClientGeoContinentCode] LocallyBuiltBlockMetadata metaClientGeoContinentCode
         * @property {number|null} [metaClientGeoLongitude] LocallyBuiltBlockMetadata metaClientGeoLongitude
         * @property {number|null} [metaClientGeoLatitude] LocallyBuiltBlockMetadata metaClientGeoLatitude
         * @property {string|null} [metaConsensusVersion] LocallyBuiltBlockMetadata metaConsensusVersion
         * @property {string|null} [metaConsensusImplementation] LocallyBuiltBlockMetadata metaConsensusImplementation
         * @property {string|null} [metaNetworkName] LocallyBuiltBlockMetadata metaNetworkName
         */

        /**
         * Constructs a new LocallyBuiltBlockMetadata.
         * @memberof beacon_slots
         * @classdesc Represents a LocallyBuiltBlockMetadata.
         * @implements ILocallyBuiltBlockMetadata
         * @constructor
         * @param {beacon_slots.ILocallyBuiltBlockMetadata=} [properties] Properties to set
         */
        function LocallyBuiltBlockMetadata(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * LocallyBuiltBlockMetadata metaClientName.
         * @member {string} metaClientName
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientName = "";

        /**
         * LocallyBuiltBlockMetadata eventDateTime.
         * @member {google.protobuf.ITimestamp|null|undefined} eventDateTime
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.eventDateTime = null;

        /**
         * LocallyBuiltBlockMetadata metaClientVersion.
         * @member {string} metaClientVersion
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientVersion = "";

        /**
         * LocallyBuiltBlockMetadata metaClientImplementation.
         * @member {string} metaClientImplementation
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientImplementation = "";

        /**
         * LocallyBuiltBlockMetadata metaClientGeoCity.
         * @member {string} metaClientGeoCity
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoCity = "";

        /**
         * LocallyBuiltBlockMetadata metaClientGeoCountry.
         * @member {string} metaClientGeoCountry
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoCountry = "";

        /**
         * LocallyBuiltBlockMetadata metaClientGeoCountryCode.
         * @member {string} metaClientGeoCountryCode
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoCountryCode = "";

        /**
         * LocallyBuiltBlockMetadata metaClientGeoContinentCode.
         * @member {string} metaClientGeoContinentCode
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoContinentCode = "";

        /**
         * LocallyBuiltBlockMetadata metaClientGeoLongitude.
         * @member {number} metaClientGeoLongitude
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoLongitude = 0;

        /**
         * LocallyBuiltBlockMetadata metaClientGeoLatitude.
         * @member {number} metaClientGeoLatitude
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaClientGeoLatitude = 0;

        /**
         * LocallyBuiltBlockMetadata metaConsensusVersion.
         * @member {string} metaConsensusVersion
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaConsensusVersion = "";

        /**
         * LocallyBuiltBlockMetadata metaConsensusImplementation.
         * @member {string} metaConsensusImplementation
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaConsensusImplementation = "";

        /**
         * LocallyBuiltBlockMetadata metaNetworkName.
         * @member {string} metaNetworkName
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         */
        LocallyBuiltBlockMetadata.prototype.metaNetworkName = "";

        /**
         * Creates a new LocallyBuiltBlockMetadata instance using the specified properties.
         * @function create
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {beacon_slots.ILocallyBuiltBlockMetadata=} [properties] Properties to set
         * @returns {beacon_slots.LocallyBuiltBlockMetadata} LocallyBuiltBlockMetadata instance
         */
        LocallyBuiltBlockMetadata.create = function create(properties) {
            return new LocallyBuiltBlockMetadata(properties);
        };

        /**
         * Encodes the specified LocallyBuiltBlockMetadata message. Does not implicitly {@link beacon_slots.LocallyBuiltBlockMetadata.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {beacon_slots.ILocallyBuiltBlockMetadata} message LocallyBuiltBlockMetadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltBlockMetadata.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.metaClientName != null && Object.hasOwnProperty.call(message, "metaClientName"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.metaClientName);
            if (message.eventDateTime != null && Object.hasOwnProperty.call(message, "eventDateTime"))
                $root.google.protobuf.Timestamp.encode(message.eventDateTime, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.metaClientVersion != null && Object.hasOwnProperty.call(message, "metaClientVersion"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.metaClientVersion);
            if (message.metaClientImplementation != null && Object.hasOwnProperty.call(message, "metaClientImplementation"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.metaClientImplementation);
            if (message.metaClientGeoCity != null && Object.hasOwnProperty.call(message, "metaClientGeoCity"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.metaClientGeoCity);
            if (message.metaClientGeoCountry != null && Object.hasOwnProperty.call(message, "metaClientGeoCountry"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.metaClientGeoCountry);
            if (message.metaClientGeoCountryCode != null && Object.hasOwnProperty.call(message, "metaClientGeoCountryCode"))
                writer.uint32(/* id 8, wireType 2 =*/66).string(message.metaClientGeoCountryCode);
            if (message.metaClientGeoContinentCode != null && Object.hasOwnProperty.call(message, "metaClientGeoContinentCode"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.metaClientGeoContinentCode);
            if (message.metaClientGeoLongitude != null && Object.hasOwnProperty.call(message, "metaClientGeoLongitude"))
                writer.uint32(/* id 10, wireType 1 =*/81).double(message.metaClientGeoLongitude);
            if (message.metaClientGeoLatitude != null && Object.hasOwnProperty.call(message, "metaClientGeoLatitude"))
                writer.uint32(/* id 11, wireType 1 =*/89).double(message.metaClientGeoLatitude);
            if (message.metaConsensusVersion != null && Object.hasOwnProperty.call(message, "metaConsensusVersion"))
                writer.uint32(/* id 12, wireType 2 =*/98).string(message.metaConsensusVersion);
            if (message.metaConsensusImplementation != null && Object.hasOwnProperty.call(message, "metaConsensusImplementation"))
                writer.uint32(/* id 13, wireType 2 =*/106).string(message.metaConsensusImplementation);
            if (message.metaNetworkName != null && Object.hasOwnProperty.call(message, "metaNetworkName"))
                writer.uint32(/* id 14, wireType 2 =*/114).string(message.metaNetworkName);
            return writer;
        };

        /**
         * Encodes the specified LocallyBuiltBlockMetadata message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltBlockMetadata.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {beacon_slots.ILocallyBuiltBlockMetadata} message LocallyBuiltBlockMetadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltBlockMetadata.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a LocallyBuiltBlockMetadata message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.LocallyBuiltBlockMetadata} LocallyBuiltBlockMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltBlockMetadata.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.LocallyBuiltBlockMetadata();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.metaClientName = reader.string();
                        break;
                    }
                case 2: {
                        message.eventDateTime = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.metaClientVersion = reader.string();
                        break;
                    }
                case 4: {
                        message.metaClientImplementation = reader.string();
                        break;
                    }
                case 5: {
                        message.metaClientGeoCity = reader.string();
                        break;
                    }
                case 7: {
                        message.metaClientGeoCountry = reader.string();
                        break;
                    }
                case 8: {
                        message.metaClientGeoCountryCode = reader.string();
                        break;
                    }
                case 9: {
                        message.metaClientGeoContinentCode = reader.string();
                        break;
                    }
                case 10: {
                        message.metaClientGeoLongitude = reader.double();
                        break;
                    }
                case 11: {
                        message.metaClientGeoLatitude = reader.double();
                        break;
                    }
                case 12: {
                        message.metaConsensusVersion = reader.string();
                        break;
                    }
                case 13: {
                        message.metaConsensusImplementation = reader.string();
                        break;
                    }
                case 14: {
                        message.metaNetworkName = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a LocallyBuiltBlockMetadata message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.LocallyBuiltBlockMetadata} LocallyBuiltBlockMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltBlockMetadata.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LocallyBuiltBlockMetadata message.
         * @function verify
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LocallyBuiltBlockMetadata.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                if (!$util.isString(message.metaClientName))
                    return "metaClientName: string expected";
            if (message.eventDateTime != null && message.hasOwnProperty("eventDateTime")) {
                var error = $root.google.protobuf.Timestamp.verify(message.eventDateTime);
                if (error)
                    return "eventDateTime." + error;
            }
            if (message.metaClientVersion != null && message.hasOwnProperty("metaClientVersion"))
                if (!$util.isString(message.metaClientVersion))
                    return "metaClientVersion: string expected";
            if (message.metaClientImplementation != null && message.hasOwnProperty("metaClientImplementation"))
                if (!$util.isString(message.metaClientImplementation))
                    return "metaClientImplementation: string expected";
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                if (!$util.isString(message.metaClientGeoCity))
                    return "metaClientGeoCity: string expected";
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                if (!$util.isString(message.metaClientGeoCountry))
                    return "metaClientGeoCountry: string expected";
            if (message.metaClientGeoCountryCode != null && message.hasOwnProperty("metaClientGeoCountryCode"))
                if (!$util.isString(message.metaClientGeoCountryCode))
                    return "metaClientGeoCountryCode: string expected";
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                if (!$util.isString(message.metaClientGeoContinentCode))
                    return "metaClientGeoContinentCode: string expected";
            if (message.metaClientGeoLongitude != null && message.hasOwnProperty("metaClientGeoLongitude"))
                if (typeof message.metaClientGeoLongitude !== "number")
                    return "metaClientGeoLongitude: number expected";
            if (message.metaClientGeoLatitude != null && message.hasOwnProperty("metaClientGeoLatitude"))
                if (typeof message.metaClientGeoLatitude !== "number")
                    return "metaClientGeoLatitude: number expected";
            if (message.metaConsensusVersion != null && message.hasOwnProperty("metaConsensusVersion"))
                if (!$util.isString(message.metaConsensusVersion))
                    return "metaConsensusVersion: string expected";
            if (message.metaConsensusImplementation != null && message.hasOwnProperty("metaConsensusImplementation"))
                if (!$util.isString(message.metaConsensusImplementation))
                    return "metaConsensusImplementation: string expected";
            if (message.metaNetworkName != null && message.hasOwnProperty("metaNetworkName"))
                if (!$util.isString(message.metaNetworkName))
                    return "metaNetworkName: string expected";
            return null;
        };

        /**
         * Creates a LocallyBuiltBlockMetadata message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.LocallyBuiltBlockMetadata} LocallyBuiltBlockMetadata
         */
        LocallyBuiltBlockMetadata.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.LocallyBuiltBlockMetadata)
                return object;
            var message = new $root.beacon_slots.LocallyBuiltBlockMetadata();
            if (object.metaClientName != null)
                message.metaClientName = String(object.metaClientName);
            if (object.eventDateTime != null) {
                if (typeof object.eventDateTime !== "object")
                    throw TypeError(".beacon_slots.LocallyBuiltBlockMetadata.eventDateTime: object expected");
                message.eventDateTime = $root.google.protobuf.Timestamp.fromObject(object.eventDateTime);
            }
            if (object.metaClientVersion != null)
                message.metaClientVersion = String(object.metaClientVersion);
            if (object.metaClientImplementation != null)
                message.metaClientImplementation = String(object.metaClientImplementation);
            if (object.metaClientGeoCity != null)
                message.metaClientGeoCity = String(object.metaClientGeoCity);
            if (object.metaClientGeoCountry != null)
                message.metaClientGeoCountry = String(object.metaClientGeoCountry);
            if (object.metaClientGeoCountryCode != null)
                message.metaClientGeoCountryCode = String(object.metaClientGeoCountryCode);
            if (object.metaClientGeoContinentCode != null)
                message.metaClientGeoContinentCode = String(object.metaClientGeoContinentCode);
            if (object.metaClientGeoLongitude != null)
                message.metaClientGeoLongitude = Number(object.metaClientGeoLongitude);
            if (object.metaClientGeoLatitude != null)
                message.metaClientGeoLatitude = Number(object.metaClientGeoLatitude);
            if (object.metaConsensusVersion != null)
                message.metaConsensusVersion = String(object.metaConsensusVersion);
            if (object.metaConsensusImplementation != null)
                message.metaConsensusImplementation = String(object.metaConsensusImplementation);
            if (object.metaNetworkName != null)
                message.metaNetworkName = String(object.metaNetworkName);
            return message;
        };

        /**
         * Creates a plain object from a LocallyBuiltBlockMetadata message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {beacon_slots.LocallyBuiltBlockMetadata} message LocallyBuiltBlockMetadata
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LocallyBuiltBlockMetadata.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.metaClientName = "";
                object.eventDateTime = null;
                object.metaClientVersion = "";
                object.metaClientImplementation = "";
                object.metaClientGeoCity = "";
                object.metaClientGeoCountry = "";
                object.metaClientGeoCountryCode = "";
                object.metaClientGeoContinentCode = "";
                object.metaClientGeoLongitude = 0;
                object.metaClientGeoLatitude = 0;
                object.metaConsensusVersion = "";
                object.metaConsensusImplementation = "";
                object.metaNetworkName = "";
            }
            if (message.metaClientName != null && message.hasOwnProperty("metaClientName"))
                object.metaClientName = message.metaClientName;
            if (message.eventDateTime != null && message.hasOwnProperty("eventDateTime"))
                object.eventDateTime = $root.google.protobuf.Timestamp.toObject(message.eventDateTime, options);
            if (message.metaClientVersion != null && message.hasOwnProperty("metaClientVersion"))
                object.metaClientVersion = message.metaClientVersion;
            if (message.metaClientImplementation != null && message.hasOwnProperty("metaClientImplementation"))
                object.metaClientImplementation = message.metaClientImplementation;
            if (message.metaClientGeoCity != null && message.hasOwnProperty("metaClientGeoCity"))
                object.metaClientGeoCity = message.metaClientGeoCity;
            if (message.metaClientGeoCountry != null && message.hasOwnProperty("metaClientGeoCountry"))
                object.metaClientGeoCountry = message.metaClientGeoCountry;
            if (message.metaClientGeoCountryCode != null && message.hasOwnProperty("metaClientGeoCountryCode"))
                object.metaClientGeoCountryCode = message.metaClientGeoCountryCode;
            if (message.metaClientGeoContinentCode != null && message.hasOwnProperty("metaClientGeoContinentCode"))
                object.metaClientGeoContinentCode = message.metaClientGeoContinentCode;
            if (message.metaClientGeoLongitude != null && message.hasOwnProperty("metaClientGeoLongitude"))
                object.metaClientGeoLongitude = options.json && !isFinite(message.metaClientGeoLongitude) ? String(message.metaClientGeoLongitude) : message.metaClientGeoLongitude;
            if (message.metaClientGeoLatitude != null && message.hasOwnProperty("metaClientGeoLatitude"))
                object.metaClientGeoLatitude = options.json && !isFinite(message.metaClientGeoLatitude) ? String(message.metaClientGeoLatitude) : message.metaClientGeoLatitude;
            if (message.metaConsensusVersion != null && message.hasOwnProperty("metaConsensusVersion"))
                object.metaConsensusVersion = message.metaConsensusVersion;
            if (message.metaConsensusImplementation != null && message.hasOwnProperty("metaConsensusImplementation"))
                object.metaConsensusImplementation = message.metaConsensusImplementation;
            if (message.metaNetworkName != null && message.hasOwnProperty("metaNetworkName"))
                object.metaNetworkName = message.metaNetworkName;
            return object;
        };

        /**
         * Converts this LocallyBuiltBlockMetadata to JSON.
         * @function toJSON
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LocallyBuiltBlockMetadata.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for LocallyBuiltBlockMetadata
         * @function getTypeUrl
         * @memberof beacon_slots.LocallyBuiltBlockMetadata
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        LocallyBuiltBlockMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.LocallyBuiltBlockMetadata";
        };

        return LocallyBuiltBlockMetadata;
    })();

    beacon_slots.LocallyBuiltBlock = (function() {

        /**
         * Properties of a LocallyBuiltBlock.
         * @memberof beacon_slots
         * @interface ILocallyBuiltBlock
         * @property {number|Long|null} [slot] LocallyBuiltBlock slot
         * @property {google.protobuf.ITimestamp|null} [slotStartDateTime] LocallyBuiltBlock slotStartDateTime
         * @property {beacon_slots.ILocallyBuiltBlockMetadata|null} [metadata] LocallyBuiltBlock metadata
         * @property {string|null} [blockVersion] LocallyBuiltBlock blockVersion
         * @property {number|null} [blockTotalBytes] LocallyBuiltBlock blockTotalBytes
         * @property {number|null} [blockTotalBytesCompressed] LocallyBuiltBlock blockTotalBytesCompressed
         * @property {number|Long|null} [executionPayloadValue] LocallyBuiltBlock executionPayloadValue
         * @property {number|Long|null} [consensusPayloadValue] LocallyBuiltBlock consensusPayloadValue
         * @property {number|null} [executionPayloadBlockNumber] LocallyBuiltBlock executionPayloadBlockNumber
         * @property {number|Long|null} [executionPayloadGasLimit] LocallyBuiltBlock executionPayloadGasLimit
         * @property {number|Long|null} [executionPayloadGasUsed] LocallyBuiltBlock executionPayloadGasUsed
         * @property {number|null} [executionPayloadTransactionsCount] LocallyBuiltBlock executionPayloadTransactionsCount
         * @property {number|null} [executionPayloadTransactionsTotalBytes] LocallyBuiltBlock executionPayloadTransactionsTotalBytes
         * @property {number|null} [executionPayloadTransactionsTotalBytesCompressed] LocallyBuiltBlock executionPayloadTransactionsTotalBytesCompressed
         */

        /**
         * Constructs a new LocallyBuiltBlock.
         * @memberof beacon_slots
         * @classdesc Represents a LocallyBuiltBlock.
         * @implements ILocallyBuiltBlock
         * @constructor
         * @param {beacon_slots.ILocallyBuiltBlock=} [properties] Properties to set
         */
        function LocallyBuiltBlock(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * LocallyBuiltBlock slot.
         * @member {number|Long} slot
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.slot = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltBlock slotStartDateTime.
         * @member {google.protobuf.ITimestamp|null|undefined} slotStartDateTime
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.slotStartDateTime = null;

        /**
         * LocallyBuiltBlock metadata.
         * @member {beacon_slots.ILocallyBuiltBlockMetadata|null|undefined} metadata
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.metadata = null;

        /**
         * LocallyBuiltBlock blockVersion.
         * @member {string} blockVersion
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.blockVersion = "";

        /**
         * LocallyBuiltBlock blockTotalBytes.
         * @member {number} blockTotalBytes
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.blockTotalBytes = 0;

        /**
         * LocallyBuiltBlock blockTotalBytesCompressed.
         * @member {number} blockTotalBytesCompressed
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.blockTotalBytesCompressed = 0;

        /**
         * LocallyBuiltBlock executionPayloadValue.
         * @member {number|Long} executionPayloadValue
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadValue = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltBlock consensusPayloadValue.
         * @member {number|Long} consensusPayloadValue
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.consensusPayloadValue = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltBlock executionPayloadBlockNumber.
         * @member {number} executionPayloadBlockNumber
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadBlockNumber = 0;

        /**
         * LocallyBuiltBlock executionPayloadGasLimit.
         * @member {number|Long} executionPayloadGasLimit
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadGasLimit = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltBlock executionPayloadGasUsed.
         * @member {number|Long} executionPayloadGasUsed
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadGasUsed = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltBlock executionPayloadTransactionsCount.
         * @member {number} executionPayloadTransactionsCount
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadTransactionsCount = 0;

        /**
         * LocallyBuiltBlock executionPayloadTransactionsTotalBytes.
         * @member {number} executionPayloadTransactionsTotalBytes
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadTransactionsTotalBytes = 0;

        /**
         * LocallyBuiltBlock executionPayloadTransactionsTotalBytesCompressed.
         * @member {number} executionPayloadTransactionsTotalBytesCompressed
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         */
        LocallyBuiltBlock.prototype.executionPayloadTransactionsTotalBytesCompressed = 0;

        /**
         * Creates a new LocallyBuiltBlock instance using the specified properties.
         * @function create
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {beacon_slots.ILocallyBuiltBlock=} [properties] Properties to set
         * @returns {beacon_slots.LocallyBuiltBlock} LocallyBuiltBlock instance
         */
        LocallyBuiltBlock.create = function create(properties) {
            return new LocallyBuiltBlock(properties);
        };

        /**
         * Encodes the specified LocallyBuiltBlock message. Does not implicitly {@link beacon_slots.LocallyBuiltBlock.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {beacon_slots.ILocallyBuiltBlock} message LocallyBuiltBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltBlock.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slot != null && Object.hasOwnProperty.call(message, "slot"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.slot);
            if (message.slotStartDateTime != null && Object.hasOwnProperty.call(message, "slotStartDateTime"))
                $root.google.protobuf.Timestamp.encode(message.slotStartDateTime, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.metadata != null && Object.hasOwnProperty.call(message, "metadata"))
                $root.beacon_slots.LocallyBuiltBlockMetadata.encode(message.metadata, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.blockVersion != null && Object.hasOwnProperty.call(message, "blockVersion"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.blockVersion);
            if (message.blockTotalBytes != null && Object.hasOwnProperty.call(message, "blockTotalBytes"))
                writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.blockTotalBytes);
            if (message.blockTotalBytesCompressed != null && Object.hasOwnProperty.call(message, "blockTotalBytesCompressed"))
                writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.blockTotalBytesCompressed);
            if (message.executionPayloadValue != null && Object.hasOwnProperty.call(message, "executionPayloadValue"))
                writer.uint32(/* id 8, wireType 0 =*/64).uint64(message.executionPayloadValue);
            if (message.consensusPayloadValue != null && Object.hasOwnProperty.call(message, "consensusPayloadValue"))
                writer.uint32(/* id 9, wireType 0 =*/72).uint64(message.consensusPayloadValue);
            if (message.executionPayloadBlockNumber != null && Object.hasOwnProperty.call(message, "executionPayloadBlockNumber"))
                writer.uint32(/* id 10, wireType 0 =*/80).uint32(message.executionPayloadBlockNumber);
            if (message.executionPayloadGasLimit != null && Object.hasOwnProperty.call(message, "executionPayloadGasLimit"))
                writer.uint32(/* id 11, wireType 0 =*/88).uint64(message.executionPayloadGasLimit);
            if (message.executionPayloadGasUsed != null && Object.hasOwnProperty.call(message, "executionPayloadGasUsed"))
                writer.uint32(/* id 12, wireType 0 =*/96).uint64(message.executionPayloadGasUsed);
            if (message.executionPayloadTransactionsCount != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsCount"))
                writer.uint32(/* id 13, wireType 0 =*/104).uint32(message.executionPayloadTransactionsCount);
            if (message.executionPayloadTransactionsTotalBytes != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsTotalBytes"))
                writer.uint32(/* id 14, wireType 0 =*/112).uint32(message.executionPayloadTransactionsTotalBytes);
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && Object.hasOwnProperty.call(message, "executionPayloadTransactionsTotalBytesCompressed"))
                writer.uint32(/* id 15, wireType 0 =*/120).uint32(message.executionPayloadTransactionsTotalBytesCompressed);
            return writer;
        };

        /**
         * Encodes the specified LocallyBuiltBlock message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltBlock.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {beacon_slots.ILocallyBuiltBlock} message LocallyBuiltBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltBlock.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a LocallyBuiltBlock message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.LocallyBuiltBlock} LocallyBuiltBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltBlock.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.LocallyBuiltBlock();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slot = reader.uint64();
                        break;
                    }
                case 2: {
                        message.slotStartDateTime = $root.google.protobuf.Timestamp.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.metadata = $root.beacon_slots.LocallyBuiltBlockMetadata.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.blockVersion = reader.string();
                        break;
                    }
                case 6: {
                        message.blockTotalBytes = reader.uint32();
                        break;
                    }
                case 7: {
                        message.blockTotalBytesCompressed = reader.uint32();
                        break;
                    }
                case 8: {
                        message.executionPayloadValue = reader.uint64();
                        break;
                    }
                case 9: {
                        message.consensusPayloadValue = reader.uint64();
                        break;
                    }
                case 10: {
                        message.executionPayloadBlockNumber = reader.uint32();
                        break;
                    }
                case 11: {
                        message.executionPayloadGasLimit = reader.uint64();
                        break;
                    }
                case 12: {
                        message.executionPayloadGasUsed = reader.uint64();
                        break;
                    }
                case 13: {
                        message.executionPayloadTransactionsCount = reader.uint32();
                        break;
                    }
                case 14: {
                        message.executionPayloadTransactionsTotalBytes = reader.uint32();
                        break;
                    }
                case 15: {
                        message.executionPayloadTransactionsTotalBytesCompressed = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a LocallyBuiltBlock message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.LocallyBuiltBlock} LocallyBuiltBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltBlock.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LocallyBuiltBlock message.
         * @function verify
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LocallyBuiltBlock.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (!$util.isInteger(message.slot) && !(message.slot && $util.isInteger(message.slot.low) && $util.isInteger(message.slot.high)))
                    return "slot: integer|Long expected";
            if (message.slotStartDateTime != null && message.hasOwnProperty("slotStartDateTime")) {
                var error = $root.google.protobuf.Timestamp.verify(message.slotStartDateTime);
                if (error)
                    return "slotStartDateTime." + error;
            }
            if (message.metadata != null && message.hasOwnProperty("metadata")) {
                var error = $root.beacon_slots.LocallyBuiltBlockMetadata.verify(message.metadata);
                if (error)
                    return "metadata." + error;
            }
            if (message.blockVersion != null && message.hasOwnProperty("blockVersion"))
                if (!$util.isString(message.blockVersion))
                    return "blockVersion: string expected";
            if (message.blockTotalBytes != null && message.hasOwnProperty("blockTotalBytes"))
                if (!$util.isInteger(message.blockTotalBytes))
                    return "blockTotalBytes: integer expected";
            if (message.blockTotalBytesCompressed != null && message.hasOwnProperty("blockTotalBytesCompressed"))
                if (!$util.isInteger(message.blockTotalBytesCompressed))
                    return "blockTotalBytesCompressed: integer expected";
            if (message.executionPayloadValue != null && message.hasOwnProperty("executionPayloadValue"))
                if (!$util.isInteger(message.executionPayloadValue) && !(message.executionPayloadValue && $util.isInteger(message.executionPayloadValue.low) && $util.isInteger(message.executionPayloadValue.high)))
                    return "executionPayloadValue: integer|Long expected";
            if (message.consensusPayloadValue != null && message.hasOwnProperty("consensusPayloadValue"))
                if (!$util.isInteger(message.consensusPayloadValue) && !(message.consensusPayloadValue && $util.isInteger(message.consensusPayloadValue.low) && $util.isInteger(message.consensusPayloadValue.high)))
                    return "consensusPayloadValue: integer|Long expected";
            if (message.executionPayloadBlockNumber != null && message.hasOwnProperty("executionPayloadBlockNumber"))
                if (!$util.isInteger(message.executionPayloadBlockNumber))
                    return "executionPayloadBlockNumber: integer expected";
            if (message.executionPayloadGasLimit != null && message.hasOwnProperty("executionPayloadGasLimit"))
                if (!$util.isInteger(message.executionPayloadGasLimit) && !(message.executionPayloadGasLimit && $util.isInteger(message.executionPayloadGasLimit.low) && $util.isInteger(message.executionPayloadGasLimit.high)))
                    return "executionPayloadGasLimit: integer|Long expected";
            if (message.executionPayloadGasUsed != null && message.hasOwnProperty("executionPayloadGasUsed"))
                if (!$util.isInteger(message.executionPayloadGasUsed) && !(message.executionPayloadGasUsed && $util.isInteger(message.executionPayloadGasUsed.low) && $util.isInteger(message.executionPayloadGasUsed.high)))
                    return "executionPayloadGasUsed: integer|Long expected";
            if (message.executionPayloadTransactionsCount != null && message.hasOwnProperty("executionPayloadTransactionsCount"))
                if (!$util.isInteger(message.executionPayloadTransactionsCount))
                    return "executionPayloadTransactionsCount: integer expected";
            if (message.executionPayloadTransactionsTotalBytes != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytes"))
                if (!$util.isInteger(message.executionPayloadTransactionsTotalBytes))
                    return "executionPayloadTransactionsTotalBytes: integer expected";
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytesCompressed"))
                if (!$util.isInteger(message.executionPayloadTransactionsTotalBytesCompressed))
                    return "executionPayloadTransactionsTotalBytesCompressed: integer expected";
            return null;
        };

        /**
         * Creates a LocallyBuiltBlock message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.LocallyBuiltBlock} LocallyBuiltBlock
         */
        LocallyBuiltBlock.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.LocallyBuiltBlock)
                return object;
            var message = new $root.beacon_slots.LocallyBuiltBlock();
            if (object.slot != null)
                if ($util.Long)
                    (message.slot = $util.Long.fromValue(object.slot)).unsigned = true;
                else if (typeof object.slot === "string")
                    message.slot = parseInt(object.slot, 10);
                else if (typeof object.slot === "number")
                    message.slot = object.slot;
                else if (typeof object.slot === "object")
                    message.slot = new $util.LongBits(object.slot.low >>> 0, object.slot.high >>> 0).toNumber(true);
            if (object.slotStartDateTime != null) {
                if (typeof object.slotStartDateTime !== "object")
                    throw TypeError(".beacon_slots.LocallyBuiltBlock.slotStartDateTime: object expected");
                message.slotStartDateTime = $root.google.protobuf.Timestamp.fromObject(object.slotStartDateTime);
            }
            if (object.metadata != null) {
                if (typeof object.metadata !== "object")
                    throw TypeError(".beacon_slots.LocallyBuiltBlock.metadata: object expected");
                message.metadata = $root.beacon_slots.LocallyBuiltBlockMetadata.fromObject(object.metadata);
            }
            if (object.blockVersion != null)
                message.blockVersion = String(object.blockVersion);
            if (object.blockTotalBytes != null)
                message.blockTotalBytes = object.blockTotalBytes >>> 0;
            if (object.blockTotalBytesCompressed != null)
                message.blockTotalBytesCompressed = object.blockTotalBytesCompressed >>> 0;
            if (object.executionPayloadValue != null)
                if ($util.Long)
                    (message.executionPayloadValue = $util.Long.fromValue(object.executionPayloadValue)).unsigned = true;
                else if (typeof object.executionPayloadValue === "string")
                    message.executionPayloadValue = parseInt(object.executionPayloadValue, 10);
                else if (typeof object.executionPayloadValue === "number")
                    message.executionPayloadValue = object.executionPayloadValue;
                else if (typeof object.executionPayloadValue === "object")
                    message.executionPayloadValue = new $util.LongBits(object.executionPayloadValue.low >>> 0, object.executionPayloadValue.high >>> 0).toNumber(true);
            if (object.consensusPayloadValue != null)
                if ($util.Long)
                    (message.consensusPayloadValue = $util.Long.fromValue(object.consensusPayloadValue)).unsigned = true;
                else if (typeof object.consensusPayloadValue === "string")
                    message.consensusPayloadValue = parseInt(object.consensusPayloadValue, 10);
                else if (typeof object.consensusPayloadValue === "number")
                    message.consensusPayloadValue = object.consensusPayloadValue;
                else if (typeof object.consensusPayloadValue === "object")
                    message.consensusPayloadValue = new $util.LongBits(object.consensusPayloadValue.low >>> 0, object.consensusPayloadValue.high >>> 0).toNumber(true);
            if (object.executionPayloadBlockNumber != null)
                message.executionPayloadBlockNumber = object.executionPayloadBlockNumber >>> 0;
            if (object.executionPayloadGasLimit != null)
                if ($util.Long)
                    (message.executionPayloadGasLimit = $util.Long.fromValue(object.executionPayloadGasLimit)).unsigned = true;
                else if (typeof object.executionPayloadGasLimit === "string")
                    message.executionPayloadGasLimit = parseInt(object.executionPayloadGasLimit, 10);
                else if (typeof object.executionPayloadGasLimit === "number")
                    message.executionPayloadGasLimit = object.executionPayloadGasLimit;
                else if (typeof object.executionPayloadGasLimit === "object")
                    message.executionPayloadGasLimit = new $util.LongBits(object.executionPayloadGasLimit.low >>> 0, object.executionPayloadGasLimit.high >>> 0).toNumber(true);
            if (object.executionPayloadGasUsed != null)
                if ($util.Long)
                    (message.executionPayloadGasUsed = $util.Long.fromValue(object.executionPayloadGasUsed)).unsigned = true;
                else if (typeof object.executionPayloadGasUsed === "string")
                    message.executionPayloadGasUsed = parseInt(object.executionPayloadGasUsed, 10);
                else if (typeof object.executionPayloadGasUsed === "number")
                    message.executionPayloadGasUsed = object.executionPayloadGasUsed;
                else if (typeof object.executionPayloadGasUsed === "object")
                    message.executionPayloadGasUsed = new $util.LongBits(object.executionPayloadGasUsed.low >>> 0, object.executionPayloadGasUsed.high >>> 0).toNumber(true);
            if (object.executionPayloadTransactionsCount != null)
                message.executionPayloadTransactionsCount = object.executionPayloadTransactionsCount >>> 0;
            if (object.executionPayloadTransactionsTotalBytes != null)
                message.executionPayloadTransactionsTotalBytes = object.executionPayloadTransactionsTotalBytes >>> 0;
            if (object.executionPayloadTransactionsTotalBytesCompressed != null)
                message.executionPayloadTransactionsTotalBytesCompressed = object.executionPayloadTransactionsTotalBytesCompressed >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a LocallyBuiltBlock message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {beacon_slots.LocallyBuiltBlock} message LocallyBuiltBlock
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LocallyBuiltBlock.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.slot = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slot = options.longs === String ? "0" : 0;
                object.slotStartDateTime = null;
                object.metadata = null;
                object.blockVersion = "";
                object.blockTotalBytes = 0;
                object.blockTotalBytesCompressed = 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.executionPayloadValue = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadValue = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.consensusPayloadValue = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.consensusPayloadValue = options.longs === String ? "0" : 0;
                object.executionPayloadBlockNumber = 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.executionPayloadGasLimit = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadGasLimit = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.executionPayloadGasUsed = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.executionPayloadGasUsed = options.longs === String ? "0" : 0;
                object.executionPayloadTransactionsCount = 0;
                object.executionPayloadTransactionsTotalBytes = 0;
                object.executionPayloadTransactionsTotalBytesCompressed = 0;
            }
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (typeof message.slot === "number")
                    object.slot = options.longs === String ? String(message.slot) : message.slot;
                else
                    object.slot = options.longs === String ? $util.Long.prototype.toString.call(message.slot) : options.longs === Number ? new $util.LongBits(message.slot.low >>> 0, message.slot.high >>> 0).toNumber(true) : message.slot;
            if (message.slotStartDateTime != null && message.hasOwnProperty("slotStartDateTime"))
                object.slotStartDateTime = $root.google.protobuf.Timestamp.toObject(message.slotStartDateTime, options);
            if (message.metadata != null && message.hasOwnProperty("metadata"))
                object.metadata = $root.beacon_slots.LocallyBuiltBlockMetadata.toObject(message.metadata, options);
            if (message.blockVersion != null && message.hasOwnProperty("blockVersion"))
                object.blockVersion = message.blockVersion;
            if (message.blockTotalBytes != null && message.hasOwnProperty("blockTotalBytes"))
                object.blockTotalBytes = message.blockTotalBytes;
            if (message.blockTotalBytesCompressed != null && message.hasOwnProperty("blockTotalBytesCompressed"))
                object.blockTotalBytesCompressed = message.blockTotalBytesCompressed;
            if (message.executionPayloadValue != null && message.hasOwnProperty("executionPayloadValue"))
                if (typeof message.executionPayloadValue === "number")
                    object.executionPayloadValue = options.longs === String ? String(message.executionPayloadValue) : message.executionPayloadValue;
                else
                    object.executionPayloadValue = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadValue) : options.longs === Number ? new $util.LongBits(message.executionPayloadValue.low >>> 0, message.executionPayloadValue.high >>> 0).toNumber(true) : message.executionPayloadValue;
            if (message.consensusPayloadValue != null && message.hasOwnProperty("consensusPayloadValue"))
                if (typeof message.consensusPayloadValue === "number")
                    object.consensusPayloadValue = options.longs === String ? String(message.consensusPayloadValue) : message.consensusPayloadValue;
                else
                    object.consensusPayloadValue = options.longs === String ? $util.Long.prototype.toString.call(message.consensusPayloadValue) : options.longs === Number ? new $util.LongBits(message.consensusPayloadValue.low >>> 0, message.consensusPayloadValue.high >>> 0).toNumber(true) : message.consensusPayloadValue;
            if (message.executionPayloadBlockNumber != null && message.hasOwnProperty("executionPayloadBlockNumber"))
                object.executionPayloadBlockNumber = message.executionPayloadBlockNumber;
            if (message.executionPayloadGasLimit != null && message.hasOwnProperty("executionPayloadGasLimit"))
                if (typeof message.executionPayloadGasLimit === "number")
                    object.executionPayloadGasLimit = options.longs === String ? String(message.executionPayloadGasLimit) : message.executionPayloadGasLimit;
                else
                    object.executionPayloadGasLimit = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadGasLimit) : options.longs === Number ? new $util.LongBits(message.executionPayloadGasLimit.low >>> 0, message.executionPayloadGasLimit.high >>> 0).toNumber(true) : message.executionPayloadGasLimit;
            if (message.executionPayloadGasUsed != null && message.hasOwnProperty("executionPayloadGasUsed"))
                if (typeof message.executionPayloadGasUsed === "number")
                    object.executionPayloadGasUsed = options.longs === String ? String(message.executionPayloadGasUsed) : message.executionPayloadGasUsed;
                else
                    object.executionPayloadGasUsed = options.longs === String ? $util.Long.prototype.toString.call(message.executionPayloadGasUsed) : options.longs === Number ? new $util.LongBits(message.executionPayloadGasUsed.low >>> 0, message.executionPayloadGasUsed.high >>> 0).toNumber(true) : message.executionPayloadGasUsed;
            if (message.executionPayloadTransactionsCount != null && message.hasOwnProperty("executionPayloadTransactionsCount"))
                object.executionPayloadTransactionsCount = message.executionPayloadTransactionsCount;
            if (message.executionPayloadTransactionsTotalBytes != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytes"))
                object.executionPayloadTransactionsTotalBytes = message.executionPayloadTransactionsTotalBytes;
            if (message.executionPayloadTransactionsTotalBytesCompressed != null && message.hasOwnProperty("executionPayloadTransactionsTotalBytesCompressed"))
                object.executionPayloadTransactionsTotalBytesCompressed = message.executionPayloadTransactionsTotalBytesCompressed;
            return object;
        };

        /**
         * Converts this LocallyBuiltBlock to JSON.
         * @function toJSON
         * @memberof beacon_slots.LocallyBuiltBlock
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LocallyBuiltBlock.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for LocallyBuiltBlock
         * @function getTypeUrl
         * @memberof beacon_slots.LocallyBuiltBlock
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        LocallyBuiltBlock.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.LocallyBuiltBlock";
        };

        return LocallyBuiltBlock;
    })();

    beacon_slots.LocallyBuiltSlotBlocks = (function() {

        /**
         * Properties of a LocallyBuiltSlotBlocks.
         * @memberof beacon_slots
         * @interface ILocallyBuiltSlotBlocks
         * @property {number|Long|null} [slot] LocallyBuiltSlotBlocks slot
         * @property {Array.<beacon_slots.ILocallyBuiltBlock>|null} [blocks] LocallyBuiltSlotBlocks blocks
         */

        /**
         * Constructs a new LocallyBuiltSlotBlocks.
         * @memberof beacon_slots
         * @classdesc Represents a LocallyBuiltSlotBlocks.
         * @implements ILocallyBuiltSlotBlocks
         * @constructor
         * @param {beacon_slots.ILocallyBuiltSlotBlocks=} [properties] Properties to set
         */
        function LocallyBuiltSlotBlocks(properties) {
            this.blocks = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * LocallyBuiltSlotBlocks slot.
         * @member {number|Long} slot
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @instance
         */
        LocallyBuiltSlotBlocks.prototype.slot = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * LocallyBuiltSlotBlocks blocks.
         * @member {Array.<beacon_slots.ILocallyBuiltBlock>} blocks
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @instance
         */
        LocallyBuiltSlotBlocks.prototype.blocks = $util.emptyArray;

        /**
         * Creates a new LocallyBuiltSlotBlocks instance using the specified properties.
         * @function create
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {beacon_slots.ILocallyBuiltSlotBlocks=} [properties] Properties to set
         * @returns {beacon_slots.LocallyBuiltSlotBlocks} LocallyBuiltSlotBlocks instance
         */
        LocallyBuiltSlotBlocks.create = function create(properties) {
            return new LocallyBuiltSlotBlocks(properties);
        };

        /**
         * Encodes the specified LocallyBuiltSlotBlocks message. Does not implicitly {@link beacon_slots.LocallyBuiltSlotBlocks.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {beacon_slots.ILocallyBuiltSlotBlocks} message LocallyBuiltSlotBlocks message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltSlotBlocks.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slot != null && Object.hasOwnProperty.call(message, "slot"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.slot);
            if (message.blocks != null && message.blocks.length)
                for (var i = 0; i < message.blocks.length; ++i)
                    $root.beacon_slots.LocallyBuiltBlock.encode(message.blocks[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified LocallyBuiltSlotBlocks message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltSlotBlocks.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {beacon_slots.ILocallyBuiltSlotBlocks} message LocallyBuiltSlotBlocks message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LocallyBuiltSlotBlocks.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a LocallyBuiltSlotBlocks message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.LocallyBuiltSlotBlocks} LocallyBuiltSlotBlocks
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltSlotBlocks.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.LocallyBuiltSlotBlocks();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.slot = reader.uint64();
                        break;
                    }
                case 2: {
                        if (!(message.blocks && message.blocks.length))
                            message.blocks = [];
                        message.blocks.push($root.beacon_slots.LocallyBuiltBlock.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a LocallyBuiltSlotBlocks message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.LocallyBuiltSlotBlocks} LocallyBuiltSlotBlocks
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LocallyBuiltSlotBlocks.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LocallyBuiltSlotBlocks message.
         * @function verify
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LocallyBuiltSlotBlocks.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (!$util.isInteger(message.slot) && !(message.slot && $util.isInteger(message.slot.low) && $util.isInteger(message.slot.high)))
                    return "slot: integer|Long expected";
            if (message.blocks != null && message.hasOwnProperty("blocks")) {
                if (!Array.isArray(message.blocks))
                    return "blocks: array expected";
                for (var i = 0; i < message.blocks.length; ++i) {
                    var error = $root.beacon_slots.LocallyBuiltBlock.verify(message.blocks[i]);
                    if (error)
                        return "blocks." + error;
                }
            }
            return null;
        };

        /**
         * Creates a LocallyBuiltSlotBlocks message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.LocallyBuiltSlotBlocks} LocallyBuiltSlotBlocks
         */
        LocallyBuiltSlotBlocks.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.LocallyBuiltSlotBlocks)
                return object;
            var message = new $root.beacon_slots.LocallyBuiltSlotBlocks();
            if (object.slot != null)
                if ($util.Long)
                    (message.slot = $util.Long.fromValue(object.slot)).unsigned = true;
                else if (typeof object.slot === "string")
                    message.slot = parseInt(object.slot, 10);
                else if (typeof object.slot === "number")
                    message.slot = object.slot;
                else if (typeof object.slot === "object")
                    message.slot = new $util.LongBits(object.slot.low >>> 0, object.slot.high >>> 0).toNumber(true);
            if (object.blocks) {
                if (!Array.isArray(object.blocks))
                    throw TypeError(".beacon_slots.LocallyBuiltSlotBlocks.blocks: array expected");
                message.blocks = [];
                for (var i = 0; i < object.blocks.length; ++i) {
                    if (typeof object.blocks[i] !== "object")
                        throw TypeError(".beacon_slots.LocallyBuiltSlotBlocks.blocks: object expected");
                    message.blocks[i] = $root.beacon_slots.LocallyBuiltBlock.fromObject(object.blocks[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a LocallyBuiltSlotBlocks message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {beacon_slots.LocallyBuiltSlotBlocks} message LocallyBuiltSlotBlocks
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LocallyBuiltSlotBlocks.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.blocks = [];
            if (options.defaults)
                if ($util.Long) {
                    var long = new $util.Long(0, 0, true);
                    object.slot = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.slot = options.longs === String ? "0" : 0;
            if (message.slot != null && message.hasOwnProperty("slot"))
                if (typeof message.slot === "number")
                    object.slot = options.longs === String ? String(message.slot) : message.slot;
                else
                    object.slot = options.longs === String ? $util.Long.prototype.toString.call(message.slot) : options.longs === Number ? new $util.LongBits(message.slot.low >>> 0, message.slot.high >>> 0).toNumber(true) : message.slot;
            if (message.blocks && message.blocks.length) {
                object.blocks = [];
                for (var j = 0; j < message.blocks.length; ++j)
                    object.blocks[j] = $root.beacon_slots.LocallyBuiltBlock.toObject(message.blocks[j], options);
            }
            return object;
        };

        /**
         * Converts this LocallyBuiltSlotBlocks to JSON.
         * @function toJSON
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LocallyBuiltSlotBlocks.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for LocallyBuiltSlotBlocks
         * @function getTypeUrl
         * @memberof beacon_slots.LocallyBuiltSlotBlocks
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        LocallyBuiltSlotBlocks.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.LocallyBuiltSlotBlocks";
        };

        return LocallyBuiltSlotBlocks;
    })();

    beacon_slots.GetRecentLocallyBuiltBlocksRequest = (function() {

        /**
         * Properties of a GetRecentLocallyBuiltBlocksRequest.
         * @memberof beacon_slots
         * @interface IGetRecentLocallyBuiltBlocksRequest
         * @property {string|null} [network] GetRecentLocallyBuiltBlocksRequest network
         */

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksRequest.
         * @memberof beacon_slots
         * @classdesc Represents a GetRecentLocallyBuiltBlocksRequest.
         * @implements IGetRecentLocallyBuiltBlocksRequest
         * @constructor
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest=} [properties] Properties to set
         */
        function GetRecentLocallyBuiltBlocksRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentLocallyBuiltBlocksRequest network.
         * @member {string} network
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @instance
         */
        GetRecentLocallyBuiltBlocksRequest.prototype.network = "";

        /**
         * Creates a new GetRecentLocallyBuiltBlocksRequest instance using the specified properties.
         * @function create
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest=} [properties] Properties to set
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest instance
         */
        GetRecentLocallyBuiltBlocksRequest.create = function create(properties) {
            return new GetRecentLocallyBuiltBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.network);
            return writer;
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message, length delimited. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.GetRecentLocallyBuiltBlocksRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.network = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentLocallyBuiltBlocksRequest message.
         * @function verify
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentLocallyBuiltBlocksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            return null;
        };

        /**
         * Creates a GetRecentLocallyBuiltBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksRequest} GetRecentLocallyBuiltBlocksRequest
         */
        GetRecentLocallyBuiltBlocksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.GetRecentLocallyBuiltBlocksRequest)
                return object;
            var message = new $root.beacon_slots.GetRecentLocallyBuiltBlocksRequest();
            if (object.network != null)
                message.network = String(object.network);
            return message;
        };

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {beacon_slots.GetRecentLocallyBuiltBlocksRequest} message GetRecentLocallyBuiltBlocksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentLocallyBuiltBlocksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.network = "";
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            return object;
        };

        /**
         * Converts this GetRecentLocallyBuiltBlocksRequest to JSON.
         * @function toJSON
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentLocallyBuiltBlocksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksRequest
         * @function getTypeUrl
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentLocallyBuiltBlocksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.GetRecentLocallyBuiltBlocksRequest";
        };

        return GetRecentLocallyBuiltBlocksRequest;
    })();

    beacon_slots.GetRecentLocallyBuiltBlocksResponse = (function() {

        /**
         * Properties of a GetRecentLocallyBuiltBlocksResponse.
         * @memberof beacon_slots
         * @interface IGetRecentLocallyBuiltBlocksResponse
         * @property {Array.<beacon_slots.ILocallyBuiltSlotBlocks>|null} [slotBlocks] GetRecentLocallyBuiltBlocksResponse slotBlocks
         */

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksResponse.
         * @memberof beacon_slots
         * @classdesc Represents a GetRecentLocallyBuiltBlocksResponse.
         * @implements IGetRecentLocallyBuiltBlocksResponse
         * @constructor
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksResponse=} [properties] Properties to set
         */
        function GetRecentLocallyBuiltBlocksResponse(properties) {
            this.slotBlocks = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentLocallyBuiltBlocksResponse slotBlocks.
         * @member {Array.<beacon_slots.ILocallyBuiltSlotBlocks>} slotBlocks
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @instance
         */
        GetRecentLocallyBuiltBlocksResponse.prototype.slotBlocks = $util.emptyArray;

        /**
         * Creates a new GetRecentLocallyBuiltBlocksResponse instance using the specified properties.
         * @function create
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksResponse=} [properties] Properties to set
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse instance
         */
        GetRecentLocallyBuiltBlocksResponse.create = function create(properties) {
            return new GetRecentLocallyBuiltBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slotBlocks != null && message.slotBlocks.length)
                for (var i = 0; i < message.slotBlocks.length; ++i)
                    $root.beacon_slots.LocallyBuiltSlotBlocks.encode(message.slotBlocks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message, length delimited. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentLocallyBuiltBlocksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.GetRecentLocallyBuiltBlocksResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.slotBlocks && message.slotBlocks.length))
                            message.slotBlocks = [];
                        message.slotBlocks.push($root.beacon_slots.LocallyBuiltSlotBlocks.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentLocallyBuiltBlocksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentLocallyBuiltBlocksResponse message.
         * @function verify
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentLocallyBuiltBlocksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slotBlocks != null && message.hasOwnProperty("slotBlocks")) {
                if (!Array.isArray(message.slotBlocks))
                    return "slotBlocks: array expected";
                for (var i = 0; i < message.slotBlocks.length; ++i) {
                    var error = $root.beacon_slots.LocallyBuiltSlotBlocks.verify(message.slotBlocks[i]);
                    if (error)
                        return "slotBlocks." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GetRecentLocallyBuiltBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.GetRecentLocallyBuiltBlocksResponse} GetRecentLocallyBuiltBlocksResponse
         */
        GetRecentLocallyBuiltBlocksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.GetRecentLocallyBuiltBlocksResponse)
                return object;
            var message = new $root.beacon_slots.GetRecentLocallyBuiltBlocksResponse();
            if (object.slotBlocks) {
                if (!Array.isArray(object.slotBlocks))
                    throw TypeError(".beacon_slots.GetRecentLocallyBuiltBlocksResponse.slotBlocks: array expected");
                message.slotBlocks = [];
                for (var i = 0; i < object.slotBlocks.length; ++i) {
                    if (typeof object.slotBlocks[i] !== "object")
                        throw TypeError(".beacon_slots.GetRecentLocallyBuiltBlocksResponse.slotBlocks: object expected");
                    message.slotBlocks[i] = $root.beacon_slots.LocallyBuiltSlotBlocks.fromObject(object.slotBlocks[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {beacon_slots.GetRecentLocallyBuiltBlocksResponse} message GetRecentLocallyBuiltBlocksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentLocallyBuiltBlocksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.slotBlocks = [];
            if (message.slotBlocks && message.slotBlocks.length) {
                object.slotBlocks = [];
                for (var j = 0; j < message.slotBlocks.length; ++j)
                    object.slotBlocks[j] = $root.beacon_slots.LocallyBuiltSlotBlocks.toObject(message.slotBlocks[j], options);
            }
            return object;
        };

        /**
         * Converts this GetRecentLocallyBuiltBlocksResponse to JSON.
         * @function toJSON
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentLocallyBuiltBlocksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksResponse
         * @function getTypeUrl
         * @memberof beacon_slots.GetRecentLocallyBuiltBlocksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentLocallyBuiltBlocksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.GetRecentLocallyBuiltBlocksResponse";
        };

        return GetRecentLocallyBuiltBlocksResponse;
    })();

    beacon_slots.GetRecentValidatorBlocksRequest = (function() {

        /**
         * Properties of a GetRecentValidatorBlocksRequest.
         * @memberof beacon_slots
         * @interface IGetRecentValidatorBlocksRequest
         * @property {string|null} [network] GetRecentValidatorBlocksRequest network
         */

        /**
         * Constructs a new GetRecentValidatorBlocksRequest.
         * @memberof beacon_slots
         * @classdesc Represents a GetRecentValidatorBlocksRequest.
         * @implements IGetRecentValidatorBlocksRequest
         * @constructor
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest=} [properties] Properties to set
         */
        function GetRecentValidatorBlocksRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentValidatorBlocksRequest network.
         * @member {string} network
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @instance
         */
        GetRecentValidatorBlocksRequest.prototype.network = "";

        /**
         * Creates a new GetRecentValidatorBlocksRequest instance using the specified properties.
         * @function create
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest=} [properties] Properties to set
         * @returns {beacon_slots.GetRecentValidatorBlocksRequest} GetRecentValidatorBlocksRequest instance
         */
        GetRecentValidatorBlocksRequest.create = function create(properties) {
            return new GetRecentValidatorBlocksRequest(properties);
        };

        /**
         * Encodes the specified GetRecentValidatorBlocksRequest message. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksRequest.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest} message GetRecentValidatorBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentValidatorBlocksRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.network != null && Object.hasOwnProperty.call(message, "network"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.network);
            return writer;
        };

        /**
         * Encodes the specified GetRecentValidatorBlocksRequest message, length delimited. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksRequest} message GetRecentValidatorBlocksRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentValidatorBlocksRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentValidatorBlocksRequest message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.GetRecentValidatorBlocksRequest} GetRecentValidatorBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentValidatorBlocksRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.GetRecentValidatorBlocksRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.network = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentValidatorBlocksRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.GetRecentValidatorBlocksRequest} GetRecentValidatorBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentValidatorBlocksRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentValidatorBlocksRequest message.
         * @function verify
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentValidatorBlocksRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.network != null && message.hasOwnProperty("network"))
                if (!$util.isString(message.network))
                    return "network: string expected";
            return null;
        };

        /**
         * Creates a GetRecentValidatorBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.GetRecentValidatorBlocksRequest} GetRecentValidatorBlocksRequest
         */
        GetRecentValidatorBlocksRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.GetRecentValidatorBlocksRequest)
                return object;
            var message = new $root.beacon_slots.GetRecentValidatorBlocksRequest();
            if (object.network != null)
                message.network = String(object.network);
            return message;
        };

        /**
         * Creates a plain object from a GetRecentValidatorBlocksRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {beacon_slots.GetRecentValidatorBlocksRequest} message GetRecentValidatorBlocksRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentValidatorBlocksRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.network = "";
            if (message.network != null && message.hasOwnProperty("network"))
                object.network = message.network;
            return object;
        };

        /**
         * Converts this GetRecentValidatorBlocksRequest to JSON.
         * @function toJSON
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentValidatorBlocksRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentValidatorBlocksRequest
         * @function getTypeUrl
         * @memberof beacon_slots.GetRecentValidatorBlocksRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentValidatorBlocksRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.GetRecentValidatorBlocksRequest";
        };

        return GetRecentValidatorBlocksRequest;
    })();

    beacon_slots.GetRecentValidatorBlocksResponse = (function() {

        /**
         * Properties of a GetRecentValidatorBlocksResponse.
         * @memberof beacon_slots
         * @interface IGetRecentValidatorBlocksResponse
         * @property {Array.<beacon_slots.ILocallyBuiltSlotBlocks>|null} [slotBlocks] GetRecentValidatorBlocksResponse slotBlocks
         */

        /**
         * Constructs a new GetRecentValidatorBlocksResponse.
         * @memberof beacon_slots
         * @classdesc Represents a GetRecentValidatorBlocksResponse.
         * @implements IGetRecentValidatorBlocksResponse
         * @constructor
         * @param {beacon_slots.IGetRecentValidatorBlocksResponse=} [properties] Properties to set
         */
        function GetRecentValidatorBlocksResponse(properties) {
            this.slotBlocks = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetRecentValidatorBlocksResponse slotBlocks.
         * @member {Array.<beacon_slots.ILocallyBuiltSlotBlocks>} slotBlocks
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @instance
         */
        GetRecentValidatorBlocksResponse.prototype.slotBlocks = $util.emptyArray;

        /**
         * Creates a new GetRecentValidatorBlocksResponse instance using the specified properties.
         * @function create
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksResponse=} [properties] Properties to set
         * @returns {beacon_slots.GetRecentValidatorBlocksResponse} GetRecentValidatorBlocksResponse instance
         */
        GetRecentValidatorBlocksResponse.create = function create(properties) {
            return new GetRecentValidatorBlocksResponse(properties);
        };

        /**
         * Encodes the specified GetRecentValidatorBlocksResponse message. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksResponse.verify|verify} messages.
         * @function encode
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksResponse} message GetRecentValidatorBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentValidatorBlocksResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.slotBlocks != null && message.slotBlocks.length)
                for (var i = 0; i < message.slotBlocks.length; ++i)
                    $root.beacon_slots.LocallyBuiltSlotBlocks.encode(message.slotBlocks[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified GetRecentValidatorBlocksResponse message, length delimited. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {beacon_slots.IGetRecentValidatorBlocksResponse} message GetRecentValidatorBlocksResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetRecentValidatorBlocksResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a GetRecentValidatorBlocksResponse message from the specified reader or buffer.
         * @function decode
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {beacon_slots.GetRecentValidatorBlocksResponse} GetRecentValidatorBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentValidatorBlocksResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.beacon_slots.GetRecentValidatorBlocksResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.slotBlocks && message.slotBlocks.length))
                            message.slotBlocks = [];
                        message.slotBlocks.push($root.beacon_slots.LocallyBuiltSlotBlocks.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a GetRecentValidatorBlocksResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {beacon_slots.GetRecentValidatorBlocksResponse} GetRecentValidatorBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetRecentValidatorBlocksResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a GetRecentValidatorBlocksResponse message.
         * @function verify
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        GetRecentValidatorBlocksResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.slotBlocks != null && message.hasOwnProperty("slotBlocks")) {
                if (!Array.isArray(message.slotBlocks))
                    return "slotBlocks: array expected";
                for (var i = 0; i < message.slotBlocks.length; ++i) {
                    var error = $root.beacon_slots.LocallyBuiltSlotBlocks.verify(message.slotBlocks[i]);
                    if (error)
                        return "slotBlocks." + error;
                }
            }
            return null;
        };

        /**
         * Creates a GetRecentValidatorBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {beacon_slots.GetRecentValidatorBlocksResponse} GetRecentValidatorBlocksResponse
         */
        GetRecentValidatorBlocksResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.beacon_slots.GetRecentValidatorBlocksResponse)
                return object;
            var message = new $root.beacon_slots.GetRecentValidatorBlocksResponse();
            if (object.slotBlocks) {
                if (!Array.isArray(object.slotBlocks))
                    throw TypeError(".beacon_slots.GetRecentValidatorBlocksResponse.slotBlocks: array expected");
                message.slotBlocks = [];
                for (var i = 0; i < object.slotBlocks.length; ++i) {
                    if (typeof object.slotBlocks[i] !== "object")
                        throw TypeError(".beacon_slots.GetRecentValidatorBlocksResponse.slotBlocks: object expected");
                    message.slotBlocks[i] = $root.beacon_slots.LocallyBuiltSlotBlocks.fromObject(object.slotBlocks[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a GetRecentValidatorBlocksResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {beacon_slots.GetRecentValidatorBlocksResponse} message GetRecentValidatorBlocksResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        GetRecentValidatorBlocksResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.slotBlocks = [];
            if (message.slotBlocks && message.slotBlocks.length) {
                object.slotBlocks = [];
                for (var j = 0; j < message.slotBlocks.length; ++j)
                    object.slotBlocks[j] = $root.beacon_slots.LocallyBuiltSlotBlocks.toObject(message.slotBlocks[j], options);
            }
            return object;
        };

        /**
         * Converts this GetRecentValidatorBlocksResponse to JSON.
         * @function toJSON
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        GetRecentValidatorBlocksResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for GetRecentValidatorBlocksResponse
         * @function getTypeUrl
         * @memberof beacon_slots.GetRecentValidatorBlocksResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        GetRecentValidatorBlocksResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/beacon_slots.GetRecentValidatorBlocksResponse";
        };

        return GetRecentValidatorBlocksResponse;
    })();

    return beacon_slots;
})();

$root.google = (function() {

    /**
     * Namespace google.
     * @exports google
     * @namespace
     */
    var google = {};

    google.protobuf = (function() {

        /**
         * Namespace protobuf.
         * @memberof google
         * @namespace
         */
        var protobuf = {};

        protobuf.Timestamp = (function() {

            /**
             * Properties of a Timestamp.
             * @memberof google.protobuf
             * @interface ITimestamp
             * @property {number|Long|null} [seconds] Timestamp seconds
             * @property {number|null} [nanos] Timestamp nanos
             */

            /**
             * Constructs a new Timestamp.
             * @memberof google.protobuf
             * @classdesc Represents a Timestamp.
             * @implements ITimestamp
             * @constructor
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             */
            function Timestamp(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Timestamp seconds.
             * @member {number|Long} seconds
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.seconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Timestamp nanos.
             * @member {number} nanos
             * @memberof google.protobuf.Timestamp
             * @instance
             */
            Timestamp.prototype.nanos = 0;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @function create
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp=} [properties] Properties to set
             * @returns {google.protobuf.Timestamp} Timestamp instance
             */
            Timestamp.create = function create(properties) {
                return new Timestamp(properties);
            };

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.seconds != null && Object.hasOwnProperty.call(message, "seconds"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int64(message.seconds);
                if (message.nanos != null && Object.hasOwnProperty.call(message, "nanos"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.nanos);
                return writer;
            };

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @function encodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.ITimestamp} message Timestamp message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Timestamp.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @function decode
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decode = function decode(reader, length, error) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.google.protobuf.Timestamp();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    if (tag === error)
                        break;
                    switch (tag >>> 3) {
                    case 1: {
                            message.seconds = reader.int64();
                            break;
                        }
                    case 2: {
                            message.nanos = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {google.protobuf.Timestamp} Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Timestamp.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Timestamp message.
             * @function verify
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Timestamp.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (!$util.isInteger(message.seconds) && !(message.seconds && $util.isInteger(message.seconds.low) && $util.isInteger(message.seconds.high)))
                        return "seconds: integer|Long expected";
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    if (!$util.isInteger(message.nanos))
                        return "nanos: integer expected";
                return null;
            };

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {google.protobuf.Timestamp} Timestamp
             */
            Timestamp.fromObject = function fromObject(object) {
                if (object instanceof $root.google.protobuf.Timestamp)
                    return object;
                var message = new $root.google.protobuf.Timestamp();
                if (object.seconds != null)
                    if ($util.Long)
                        (message.seconds = $util.Long.fromValue(object.seconds)).unsigned = false;
                    else if (typeof object.seconds === "string")
                        message.seconds = parseInt(object.seconds, 10);
                    else if (typeof object.seconds === "number")
                        message.seconds = object.seconds;
                    else if (typeof object.seconds === "object")
                        message.seconds = new $util.LongBits(object.seconds.low >>> 0, object.seconds.high >>> 0).toNumber();
                if (object.nanos != null)
                    message.nanos = object.nanos | 0;
                return message;
            };

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @function toObject
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {google.protobuf.Timestamp} message Timestamp
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Timestamp.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    if ($util.Long) {
                        var long = new $util.Long(0, 0, false);
                        object.seconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                    } else
                        object.seconds = options.longs === String ? "0" : 0;
                    object.nanos = 0;
                }
                if (message.seconds != null && message.hasOwnProperty("seconds"))
                    if (typeof message.seconds === "number")
                        object.seconds = options.longs === String ? String(message.seconds) : message.seconds;
                    else
                        object.seconds = options.longs === String ? $util.Long.prototype.toString.call(message.seconds) : options.longs === Number ? new $util.LongBits(message.seconds.low >>> 0, message.seconds.high >>> 0).toNumber() : message.seconds;
                if (message.nanos != null && message.hasOwnProperty("nanos"))
                    object.nanos = message.nanos;
                return object;
            };

            /**
             * Converts this Timestamp to JSON.
             * @function toJSON
             * @memberof google.protobuf.Timestamp
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Timestamp.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Timestamp
             * @function getTypeUrl
             * @memberof google.protobuf.Timestamp
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Timestamp.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/google.protobuf.Timestamp";
            };

            return Timestamp;
        })();

        return protobuf;
    })();

    return google;
})();

module.exports = $root;
