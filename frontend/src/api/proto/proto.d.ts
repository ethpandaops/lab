import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace labapi. */
export namespace labapi {

    /** Represents a LabAPI */
    class LabAPI extends $protobuf.rpc.Service {

        /**
         * Constructs a new LabAPI service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new LabAPI service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): LabAPI;

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @param request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetRecentLocallyBuiltBlocksResponse
         */
        public getRecentLocallyBuiltBlocks(request: labapi.IGetRecentLocallyBuiltBlocksRequest, callback: labapi.LabAPI.GetRecentLocallyBuiltBlocksCallback): void;

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @param request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @returns Promise
         */
        public getRecentLocallyBuiltBlocks(request: labapi.IGetRecentLocallyBuiltBlocksRequest): Promise<labapi.GetRecentLocallyBuiltBlocksResponse>;
    }

    namespace LabAPI {

        /**
         * Callback as used by {@link labapi.LabAPI#getRecentLocallyBuiltBlocks}.
         * @param error Error, if any
         * @param [response] GetRecentLocallyBuiltBlocksResponse
         */
        type GetRecentLocallyBuiltBlocksCallback = (error: (Error|null), response?: labapi.GetRecentLocallyBuiltBlocksResponse) => void;
    }

    /** Properties of a GetRecentLocallyBuiltBlocksRequest. */
    interface IGetRecentLocallyBuiltBlocksRequest {

        /** GetRecentLocallyBuiltBlocksRequest network */
        network?: (string|null);
    }

    /** Represents a GetRecentLocallyBuiltBlocksRequest. */
    class GetRecentLocallyBuiltBlocksRequest implements IGetRecentLocallyBuiltBlocksRequest {

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: labapi.IGetRecentLocallyBuiltBlocksRequest);

        /** GetRecentLocallyBuiltBlocksRequest network. */
        public network: string;

        /**
         * Creates a new GetRecentLocallyBuiltBlocksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentLocallyBuiltBlocksRequest instance
         */
        public static create(properties?: labapi.IGetRecentLocallyBuiltBlocksRequest): labapi.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: labapi.IGetRecentLocallyBuiltBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message, length delimited. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: labapi.IGetRecentLocallyBuiltBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): labapi.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): labapi.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Verifies a GetRecentLocallyBuiltBlocksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentLocallyBuiltBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentLocallyBuiltBlocksRequest
         */
        public static fromObject(object: { [k: string]: any }): labapi.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksRequest message. Also converts values to other types if specified.
         * @param message GetRecentLocallyBuiltBlocksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: labapi.GetRecentLocallyBuiltBlocksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentLocallyBuiltBlocksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetRecentLocallyBuiltBlocksResponse. */
    interface IGetRecentLocallyBuiltBlocksResponse {

        /** GetRecentLocallyBuiltBlocksResponse slotBlocks */
        slotBlocks?: (beacon_slots.ILocallyBuiltSlotBlocks[]|null);
    }

    /** Represents a GetRecentLocallyBuiltBlocksResponse. */
    class GetRecentLocallyBuiltBlocksResponse implements IGetRecentLocallyBuiltBlocksResponse {

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: labapi.IGetRecentLocallyBuiltBlocksResponse);

        /** GetRecentLocallyBuiltBlocksResponse slotBlocks. */
        public slotBlocks: beacon_slots.ILocallyBuiltSlotBlocks[];

        /**
         * Creates a new GetRecentLocallyBuiltBlocksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentLocallyBuiltBlocksResponse instance
         */
        public static create(properties?: labapi.IGetRecentLocallyBuiltBlocksResponse): labapi.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: labapi.IGetRecentLocallyBuiltBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message, length delimited. Does not implicitly {@link labapi.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: labapi.IGetRecentLocallyBuiltBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): labapi.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): labapi.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Verifies a GetRecentLocallyBuiltBlocksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentLocallyBuiltBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentLocallyBuiltBlocksResponse
         */
        public static fromObject(object: { [k: string]: any }): labapi.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksResponse message. Also converts values to other types if specified.
         * @param message GetRecentLocallyBuiltBlocksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: labapi.GetRecentLocallyBuiltBlocksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentLocallyBuiltBlocksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace beacon_slots. */
export namespace beacon_slots {

    /** Represents a BeaconSlots */
    class BeaconSlots extends $protobuf.rpc.Service {

        /**
         * Constructs a new BeaconSlots service.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         */
        constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

        /**
         * Creates new BeaconSlots service using the specified rpc implementation.
         * @param rpcImpl RPC implementation
         * @param [requestDelimited=false] Whether requests are length-delimited
         * @param [responseDelimited=false] Whether responses are length-delimited
         * @returns RPC service. Useful where requests and/or responses are streamed.
         */
        public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): BeaconSlots;

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @param request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetRecentLocallyBuiltBlocksResponse
         */
        public getRecentLocallyBuiltBlocks(request: beacon_slots.IGetRecentLocallyBuiltBlocksRequest, callback: beacon_slots.BeaconSlots.GetRecentLocallyBuiltBlocksCallback): void;

        /**
         * Calls GetRecentLocallyBuiltBlocks.
         * @param request GetRecentLocallyBuiltBlocksRequest message or plain object
         * @returns Promise
         */
        public getRecentLocallyBuiltBlocks(request: beacon_slots.IGetRecentLocallyBuiltBlocksRequest): Promise<beacon_slots.GetRecentLocallyBuiltBlocksResponse>;

        /**
         * Calls GetRecentValidatorBlocks.
         * @param request GetRecentValidatorBlocksRequest message or plain object
         * @param callback Node-style callback called with the error, if any, and GetRecentValidatorBlocksResponse
         */
        public getRecentValidatorBlocks(request: beacon_slots.IGetRecentValidatorBlocksRequest, callback: beacon_slots.BeaconSlots.GetRecentValidatorBlocksCallback): void;

        /**
         * Calls GetRecentValidatorBlocks.
         * @param request GetRecentValidatorBlocksRequest message or plain object
         * @returns Promise
         */
        public getRecentValidatorBlocks(request: beacon_slots.IGetRecentValidatorBlocksRequest): Promise<beacon_slots.GetRecentValidatorBlocksResponse>;
    }

    namespace BeaconSlots {

        /**
         * Callback as used by {@link beacon_slots.BeaconSlots#getRecentLocallyBuiltBlocks}.
         * @param error Error, if any
         * @param [response] GetRecentLocallyBuiltBlocksResponse
         */
        type GetRecentLocallyBuiltBlocksCallback = (error: (Error|null), response?: beacon_slots.GetRecentLocallyBuiltBlocksResponse) => void;

        /**
         * Callback as used by {@link beacon_slots.BeaconSlots#getRecentValidatorBlocks}.
         * @param error Error, if any
         * @param [response] GetRecentValidatorBlocksResponse
         */
        type GetRecentValidatorBlocksCallback = (error: (Error|null), response?: beacon_slots.GetRecentValidatorBlocksResponse) => void;
    }

    /** Properties of a Geo. */
    interface IGeo {

        /** Geo city */
        city?: (string|null);

        /** Geo country */
        country?: (string|null);

        /** Geo continent */
        continent?: (string|null);

        /** Geo latitude */
        latitude?: (number|null);

        /** Geo longitude */
        longitude?: (number|null);
    }

    /** Represents a Geo. */
    class Geo implements IGeo {

        /**
         * Constructs a new Geo.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IGeo);

        /** Geo city. */
        public city: string;

        /** Geo country. */
        public country: string;

        /** Geo continent. */
        public continent: string;

        /** Geo latitude. */
        public latitude: number;

        /** Geo longitude. */
        public longitude: number;

        /**
         * Creates a new Geo instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Geo instance
         */
        public static create(properties?: beacon_slots.IGeo): beacon_slots.Geo;

        /**
         * Encodes the specified Geo message. Does not implicitly {@link beacon_slots.Geo.verify|verify} messages.
         * @param message Geo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IGeo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Geo message, length delimited. Does not implicitly {@link beacon_slots.Geo.verify|verify} messages.
         * @param message Geo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IGeo, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Geo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Geo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.Geo;

        /**
         * Decodes a Geo message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Geo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.Geo;

        /**
         * Verifies a Geo message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Geo message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Geo
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.Geo;

        /**
         * Creates a plain object from a Geo message. Also converts values to other types if specified.
         * @param message Geo
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.Geo, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Geo to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Geo
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Node. */
    interface INode {

        /** Node name */
        name?: (string|null);

        /** Node username */
        username?: (string|null);

        /** Node geo */
        geo?: (beacon_slots.IGeo|null);
    }

    /** Represents a Node. */
    class Node implements INode {

        /**
         * Constructs a new Node.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.INode);

        /** Node name. */
        public name: string;

        /** Node username. */
        public username: string;

        /** Node geo. */
        public geo?: (beacon_slots.IGeo|null);

        /**
         * Creates a new Node instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Node instance
         */
        public static create(properties?: beacon_slots.INode): beacon_slots.Node;

        /**
         * Encodes the specified Node message. Does not implicitly {@link beacon_slots.Node.verify|verify} messages.
         * @param message Node message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.INode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Node message, length delimited. Does not implicitly {@link beacon_slots.Node.verify|verify} messages.
         * @param message Node message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.INode, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Node message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.Node;

        /**
         * Decodes a Node message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.Node;

        /**
         * Verifies a Node message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Node message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Node
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.Node;

        /**
         * Creates a plain object from a Node message. Also converts values to other types if specified.
         * @param message Node
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.Node, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Node to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Node
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Proposer. */
    interface IProposer {

        /** Proposer slot */
        slot?: (number|Long|null);

        /** Proposer proposerValidatorIndex */
        proposerValidatorIndex?: (number|Long|null);
    }

    /** Represents a Proposer. */
    class Proposer implements IProposer {

        /**
         * Constructs a new Proposer.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IProposer);

        /** Proposer slot. */
        public slot: (number|Long);

        /** Proposer proposerValidatorIndex. */
        public proposerValidatorIndex: (number|Long);

        /**
         * Creates a new Proposer instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Proposer instance
         */
        public static create(properties?: beacon_slots.IProposer): beacon_slots.Proposer;

        /**
         * Encodes the specified Proposer message. Does not implicitly {@link beacon_slots.Proposer.verify|verify} messages.
         * @param message Proposer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IProposer, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Proposer message, length delimited. Does not implicitly {@link beacon_slots.Proposer.verify|verify} messages.
         * @param message Proposer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IProposer, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Proposer message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Proposer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.Proposer;

        /**
         * Decodes a Proposer message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Proposer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.Proposer;

        /**
         * Verifies a Proposer message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Proposer message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Proposer
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.Proposer;

        /**
         * Creates a plain object from a Proposer message. Also converts values to other types if specified.
         * @param message Proposer
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.Proposer, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Proposer to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Proposer
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BlockData. */
    interface IBlockData {

        /** BlockData slot */
        slot?: (number|Long|null);

        /** BlockData slotStartDateTime */
        slotStartDateTime?: (string|null);

        /** BlockData epoch */
        epoch?: (number|Long|null);

        /** BlockData epochStartDateTime */
        epochStartDateTime?: (string|null);

        /** BlockData blockRoot */
        blockRoot?: (string|null);

        /** BlockData blockVersion */
        blockVersion?: (string|null);

        /** BlockData blockTotalBytes */
        blockTotalBytes?: (number|Long|null);

        /** BlockData blockTotalBytesCompressed */
        blockTotalBytesCompressed?: (number|Long|null);

        /** BlockData parentRoot */
        parentRoot?: (string|null);

        /** BlockData stateRoot */
        stateRoot?: (string|null);

        /** BlockData proposerIndex */
        proposerIndex?: (number|Long|null);

        /** BlockData eth1DataBlockHash */
        eth1DataBlockHash?: (string|null);

        /** BlockData eth1DataDepositRoot */
        eth1DataDepositRoot?: (string|null);

        /** BlockData executionPayloadBlockHash */
        executionPayloadBlockHash?: (string|null);

        /** BlockData executionPayloadBlockNumber */
        executionPayloadBlockNumber?: (number|Long|null);

        /** BlockData executionPayloadFeeRecipient */
        executionPayloadFeeRecipient?: (string|null);

        /** BlockData executionPayloadBaseFeePerGas */
        executionPayloadBaseFeePerGas?: (number|Long|null);

        /** BlockData executionPayloadBlobGasUsed */
        executionPayloadBlobGasUsed?: (number|Long|null);

        /** BlockData executionPayloadExcessBlobGas */
        executionPayloadExcessBlobGas?: (number|Long|null);

        /** BlockData executionPayloadGasLimit */
        executionPayloadGasLimit?: (number|Long|null);

        /** BlockData executionPayloadGasUsed */
        executionPayloadGasUsed?: (number|Long|null);

        /** BlockData executionPayloadStateRoot */
        executionPayloadStateRoot?: (string|null);

        /** BlockData executionPayloadParentHash */
        executionPayloadParentHash?: (string|null);

        /** BlockData executionPayloadTransactionsCount */
        executionPayloadTransactionsCount?: (number|Long|null);

        /** BlockData executionPayloadTransactionsTotalBytes */
        executionPayloadTransactionsTotalBytes?: (number|Long|null);

        /** BlockData executionPayloadTransactionsTotalBytesCompressed */
        executionPayloadTransactionsTotalBytesCompressed?: (number|Long|null);
    }

    /** Represents a BlockData. */
    class BlockData implements IBlockData {

        /**
         * Constructs a new BlockData.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBlockData);

        /** BlockData slot. */
        public slot: (number|Long);

        /** BlockData slotStartDateTime. */
        public slotStartDateTime: string;

        /** BlockData epoch. */
        public epoch: (number|Long);

        /** BlockData epochStartDateTime. */
        public epochStartDateTime: string;

        /** BlockData blockRoot. */
        public blockRoot: string;

        /** BlockData blockVersion. */
        public blockVersion: string;

        /** BlockData blockTotalBytes. */
        public blockTotalBytes: (number|Long);

        /** BlockData blockTotalBytesCompressed. */
        public blockTotalBytesCompressed: (number|Long);

        /** BlockData parentRoot. */
        public parentRoot: string;

        /** BlockData stateRoot. */
        public stateRoot: string;

        /** BlockData proposerIndex. */
        public proposerIndex: (number|Long);

        /** BlockData eth1DataBlockHash. */
        public eth1DataBlockHash: string;

        /** BlockData eth1DataDepositRoot. */
        public eth1DataDepositRoot: string;

        /** BlockData executionPayloadBlockHash. */
        public executionPayloadBlockHash: string;

        /** BlockData executionPayloadBlockNumber. */
        public executionPayloadBlockNumber: (number|Long);

        /** BlockData executionPayloadFeeRecipient. */
        public executionPayloadFeeRecipient: string;

        /** BlockData executionPayloadBaseFeePerGas. */
        public executionPayloadBaseFeePerGas: (number|Long);

        /** BlockData executionPayloadBlobGasUsed. */
        public executionPayloadBlobGasUsed: (number|Long);

        /** BlockData executionPayloadExcessBlobGas. */
        public executionPayloadExcessBlobGas: (number|Long);

        /** BlockData executionPayloadGasLimit. */
        public executionPayloadGasLimit: (number|Long);

        /** BlockData executionPayloadGasUsed. */
        public executionPayloadGasUsed: (number|Long);

        /** BlockData executionPayloadStateRoot. */
        public executionPayloadStateRoot: string;

        /** BlockData executionPayloadParentHash. */
        public executionPayloadParentHash: string;

        /** BlockData executionPayloadTransactionsCount. */
        public executionPayloadTransactionsCount: (number|Long);

        /** BlockData executionPayloadTransactionsTotalBytes. */
        public executionPayloadTransactionsTotalBytes: (number|Long);

        /** BlockData executionPayloadTransactionsTotalBytesCompressed. */
        public executionPayloadTransactionsTotalBytesCompressed: (number|Long);

        /**
         * Creates a new BlockData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BlockData instance
         */
        public static create(properties?: beacon_slots.IBlockData): beacon_slots.BlockData;

        /**
         * Encodes the specified BlockData message. Does not implicitly {@link beacon_slots.BlockData.verify|verify} messages.
         * @param message BlockData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBlockData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BlockData message, length delimited. Does not implicitly {@link beacon_slots.BlockData.verify|verify} messages.
         * @param message BlockData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBlockData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BlockData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlockData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BlockData;

        /**
         * Decodes a BlockData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BlockData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BlockData;

        /**
         * Verifies a BlockData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BlockData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BlockData
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BlockData;

        /**
         * Creates a plain object from a BlockData message. Also converts values to other types if specified.
         * @param message BlockData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BlockData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BlockData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BlockData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AttestationWindow. */
    interface IAttestationWindow {

        /** AttestationWindow startMs */
        startMs?: (number|Long|null);

        /** AttestationWindow endMs */
        endMs?: (number|Long|null);

        /** AttestationWindow validatorIndices */
        validatorIndices?: ((number|Long)[]|null);
    }

    /** Represents an AttestationWindow. */
    class AttestationWindow implements IAttestationWindow {

        /**
         * Constructs a new AttestationWindow.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IAttestationWindow);

        /** AttestationWindow startMs. */
        public startMs: (number|Long);

        /** AttestationWindow endMs. */
        public endMs: (number|Long);

        /** AttestationWindow validatorIndices. */
        public validatorIndices: (number|Long)[];

        /**
         * Creates a new AttestationWindow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AttestationWindow instance
         */
        public static create(properties?: beacon_slots.IAttestationWindow): beacon_slots.AttestationWindow;

        /**
         * Encodes the specified AttestationWindow message. Does not implicitly {@link beacon_slots.AttestationWindow.verify|verify} messages.
         * @param message AttestationWindow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IAttestationWindow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AttestationWindow message, length delimited. Does not implicitly {@link beacon_slots.AttestationWindow.verify|verify} messages.
         * @param message AttestationWindow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IAttestationWindow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AttestationWindow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AttestationWindow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.AttestationWindow;

        /**
         * Decodes an AttestationWindow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AttestationWindow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.AttestationWindow;

        /**
         * Verifies an AttestationWindow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AttestationWindow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AttestationWindow
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.AttestationWindow;

        /**
         * Creates a plain object from an AttestationWindow message. Also converts values to other types if specified.
         * @param message AttestationWindow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.AttestationWindow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AttestationWindow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AttestationWindow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AttestationsData. */
    interface IAttestationsData {

        /** AttestationsData windows */
        windows?: (beacon_slots.IAttestationWindow[]|null);

        /** AttestationsData maximumVotes */
        maximumVotes?: (number|Long|null);
    }

    /** Represents an AttestationsData. */
    class AttestationsData implements IAttestationsData {

        /**
         * Constructs a new AttestationsData.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IAttestationsData);

        /** AttestationsData windows. */
        public windows: beacon_slots.IAttestationWindow[];

        /** AttestationsData maximumVotes. */
        public maximumVotes: (number|Long);

        /**
         * Creates a new AttestationsData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AttestationsData instance
         */
        public static create(properties?: beacon_slots.IAttestationsData): beacon_slots.AttestationsData;

        /**
         * Encodes the specified AttestationsData message. Does not implicitly {@link beacon_slots.AttestationsData.verify|verify} messages.
         * @param message AttestationsData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IAttestationsData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AttestationsData message, length delimited. Does not implicitly {@link beacon_slots.AttestationsData.verify|verify} messages.
         * @param message AttestationsData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IAttestationsData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AttestationsData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AttestationsData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.AttestationsData;

        /**
         * Decodes an AttestationsData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AttestationsData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.AttestationsData;

        /**
         * Verifies an AttestationsData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AttestationsData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AttestationsData
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.AttestationsData;

        /**
         * Creates a plain object from an AttestationsData message. Also converts values to other types if specified.
         * @param message AttestationsData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.AttestationsData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AttestationsData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AttestationsData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BlobTimingMap. */
    interface IBlobTimingMap {

        /** BlobTimingMap timings */
        timings?: ({ [k: string]: (number|Long) }|null);
    }

    /** Represents a BlobTimingMap. */
    class BlobTimingMap implements IBlobTimingMap {

        /**
         * Constructs a new BlobTimingMap.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBlobTimingMap);

        /** BlobTimingMap timings. */
        public timings: { [k: string]: (number|Long) };

        /**
         * Creates a new BlobTimingMap instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BlobTimingMap instance
         */
        public static create(properties?: beacon_slots.IBlobTimingMap): beacon_slots.BlobTimingMap;

        /**
         * Encodes the specified BlobTimingMap message. Does not implicitly {@link beacon_slots.BlobTimingMap.verify|verify} messages.
         * @param message BlobTimingMap message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBlobTimingMap, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BlobTimingMap message, length delimited. Does not implicitly {@link beacon_slots.BlobTimingMap.verify|verify} messages.
         * @param message BlobTimingMap message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBlobTimingMap, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BlobTimingMap message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlobTimingMap
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BlobTimingMap;

        /**
         * Decodes a BlobTimingMap message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BlobTimingMap
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BlobTimingMap;

        /**
         * Verifies a BlobTimingMap message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BlobTimingMap message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BlobTimingMap
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BlobTimingMap;

        /**
         * Creates a plain object from a BlobTimingMap message. Also converts values to other types if specified.
         * @param message BlobTimingMap
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BlobTimingMap, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BlobTimingMap to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BlobTimingMap
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BlockArrivalTime. */
    interface IBlockArrivalTime {

        /** BlockArrivalTime slotTime */
        slotTime?: (number|Long|null);

        /** BlockArrivalTime metaClientName */
        metaClientName?: (string|null);

        /** BlockArrivalTime metaClientGeoCity */
        metaClientGeoCity?: (string|null);

        /** BlockArrivalTime metaClientGeoCountry */
        metaClientGeoCountry?: (string|null);

        /** BlockArrivalTime metaClientGeoContinentCode */
        metaClientGeoContinentCode?: (string|null);
    }

    /** Represents a BlockArrivalTime. */
    class BlockArrivalTime implements IBlockArrivalTime {

        /**
         * Constructs a new BlockArrivalTime.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBlockArrivalTime);

        /** BlockArrivalTime slotTime. */
        public slotTime: (number|Long);

        /** BlockArrivalTime metaClientName. */
        public metaClientName: string;

        /** BlockArrivalTime metaClientGeoCity. */
        public metaClientGeoCity: string;

        /** BlockArrivalTime metaClientGeoCountry. */
        public metaClientGeoCountry: string;

        /** BlockArrivalTime metaClientGeoContinentCode. */
        public metaClientGeoContinentCode: string;

        /**
         * Creates a new BlockArrivalTime instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BlockArrivalTime instance
         */
        public static create(properties?: beacon_slots.IBlockArrivalTime): beacon_slots.BlockArrivalTime;

        /**
         * Encodes the specified BlockArrivalTime message. Does not implicitly {@link beacon_slots.BlockArrivalTime.verify|verify} messages.
         * @param message BlockArrivalTime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBlockArrivalTime, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BlockArrivalTime message, length delimited. Does not implicitly {@link beacon_slots.BlockArrivalTime.verify|verify} messages.
         * @param message BlockArrivalTime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBlockArrivalTime, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BlockArrivalTime message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlockArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BlockArrivalTime;

        /**
         * Decodes a BlockArrivalTime message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BlockArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BlockArrivalTime;

        /**
         * Verifies a BlockArrivalTime message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BlockArrivalTime message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BlockArrivalTime
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BlockArrivalTime;

        /**
         * Creates a plain object from a BlockArrivalTime message. Also converts values to other types if specified.
         * @param message BlockArrivalTime
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BlockArrivalTime, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BlockArrivalTime to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BlockArrivalTime
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BlobArrivalTime. */
    interface IBlobArrivalTime {

        /** BlobArrivalTime slotTime */
        slotTime?: (number|Long|null);

        /** BlobArrivalTime metaClientName */
        metaClientName?: (string|null);

        /** BlobArrivalTime metaClientGeoCity */
        metaClientGeoCity?: (string|null);

        /** BlobArrivalTime metaClientGeoCountry */
        metaClientGeoCountry?: (string|null);

        /** BlobArrivalTime metaClientGeoContinentCode */
        metaClientGeoContinentCode?: (string|null);

        /** BlobArrivalTime blobIndex */
        blobIndex?: (number|Long|null);
    }

    /** Represents a BlobArrivalTime. */
    class BlobArrivalTime implements IBlobArrivalTime {

        /**
         * Constructs a new BlobArrivalTime.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBlobArrivalTime);

        /** BlobArrivalTime slotTime. */
        public slotTime: (number|Long);

        /** BlobArrivalTime metaClientName. */
        public metaClientName: string;

        /** BlobArrivalTime metaClientGeoCity. */
        public metaClientGeoCity: string;

        /** BlobArrivalTime metaClientGeoCountry. */
        public metaClientGeoCountry: string;

        /** BlobArrivalTime metaClientGeoContinentCode. */
        public metaClientGeoContinentCode: string;

        /** BlobArrivalTime blobIndex. */
        public blobIndex: (number|Long);

        /**
         * Creates a new BlobArrivalTime instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BlobArrivalTime instance
         */
        public static create(properties?: beacon_slots.IBlobArrivalTime): beacon_slots.BlobArrivalTime;

        /**
         * Encodes the specified BlobArrivalTime message. Does not implicitly {@link beacon_slots.BlobArrivalTime.verify|verify} messages.
         * @param message BlobArrivalTime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBlobArrivalTime, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BlobArrivalTime message, length delimited. Does not implicitly {@link beacon_slots.BlobArrivalTime.verify|verify} messages.
         * @param message BlobArrivalTime message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBlobArrivalTime, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BlobArrivalTime message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlobArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BlobArrivalTime;

        /**
         * Decodes a BlobArrivalTime message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BlobArrivalTime
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BlobArrivalTime;

        /**
         * Verifies a BlobArrivalTime message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BlobArrivalTime message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BlobArrivalTime
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BlobArrivalTime;

        /**
         * Creates a plain object from a BlobArrivalTime message. Also converts values to other types if specified.
         * @param message BlobArrivalTime
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BlobArrivalTime, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BlobArrivalTime to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BlobArrivalTime
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BlobArrivalTimes. */
    interface IBlobArrivalTimes {

        /** BlobArrivalTimes arrivalTimes */
        arrivalTimes?: (beacon_slots.IBlobArrivalTime[]|null);
    }

    /** Represents a BlobArrivalTimes. */
    class BlobArrivalTimes implements IBlobArrivalTimes {

        /**
         * Constructs a new BlobArrivalTimes.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBlobArrivalTimes);

        /** BlobArrivalTimes arrivalTimes. */
        public arrivalTimes: beacon_slots.IBlobArrivalTime[];

        /**
         * Creates a new BlobArrivalTimes instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BlobArrivalTimes instance
         */
        public static create(properties?: beacon_slots.IBlobArrivalTimes): beacon_slots.BlobArrivalTimes;

        /**
         * Encodes the specified BlobArrivalTimes message. Does not implicitly {@link beacon_slots.BlobArrivalTimes.verify|verify} messages.
         * @param message BlobArrivalTimes message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBlobArrivalTimes, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BlobArrivalTimes message, length delimited. Does not implicitly {@link beacon_slots.BlobArrivalTimes.verify|verify} messages.
         * @param message BlobArrivalTimes message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBlobArrivalTimes, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BlobArrivalTimes message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlobArrivalTimes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BlobArrivalTimes;

        /**
         * Decodes a BlobArrivalTimes message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BlobArrivalTimes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BlobArrivalTimes;

        /**
         * Verifies a BlobArrivalTimes message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BlobArrivalTimes message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BlobArrivalTimes
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BlobArrivalTimes;

        /**
         * Creates a plain object from a BlobArrivalTimes message. Also converts values to other types if specified.
         * @param message BlobArrivalTimes
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BlobArrivalTimes, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BlobArrivalTimes to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BlobArrivalTimes
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a FullTimings. */
    interface IFullTimings {

        /** FullTimings blockSeen */
        blockSeen?: ({ [k: string]: beacon_slots.IBlockArrivalTime }|null);

        /** FullTimings blobSeen */
        blobSeen?: ({ [k: string]: beacon_slots.IBlobArrivalTimes }|null);

        /** FullTimings blockFirstSeenP2p */
        blockFirstSeenP2p?: ({ [k: string]: beacon_slots.IBlockArrivalTime }|null);

        /** FullTimings blobFirstSeenP2p */
        blobFirstSeenP2p?: ({ [k: string]: beacon_slots.IBlobArrivalTimes }|null);
    }

    /** Represents a FullTimings. */
    class FullTimings implements IFullTimings {

        /**
         * Constructs a new FullTimings.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IFullTimings);

        /** FullTimings blockSeen. */
        public blockSeen: { [k: string]: beacon_slots.IBlockArrivalTime };

        /** FullTimings blobSeen. */
        public blobSeen: { [k: string]: beacon_slots.IBlobArrivalTimes };

        /** FullTimings blockFirstSeenP2p. */
        public blockFirstSeenP2p: { [k: string]: beacon_slots.IBlockArrivalTime };

        /** FullTimings blobFirstSeenP2p. */
        public blobFirstSeenP2p: { [k: string]: beacon_slots.IBlobArrivalTimes };

        /**
         * Creates a new FullTimings instance using the specified properties.
         * @param [properties] Properties to set
         * @returns FullTimings instance
         */
        public static create(properties?: beacon_slots.IFullTimings): beacon_slots.FullTimings;

        /**
         * Encodes the specified FullTimings message. Does not implicitly {@link beacon_slots.FullTimings.verify|verify} messages.
         * @param message FullTimings message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IFullTimings, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified FullTimings message, length delimited. Does not implicitly {@link beacon_slots.FullTimings.verify|verify} messages.
         * @param message FullTimings message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IFullTimings, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a FullTimings message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FullTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.FullTimings;

        /**
         * Decodes a FullTimings message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns FullTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.FullTimings;

        /**
         * Verifies a FullTimings message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a FullTimings message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns FullTimings
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.FullTimings;

        /**
         * Creates a plain object from a FullTimings message. Also converts values to other types if specified.
         * @param message FullTimings
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.FullTimings, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this FullTimings to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for FullTimings
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SlimTimings. */
    interface ISlimTimings {

        /** SlimTimings blockSeen */
        blockSeen?: ({ [k: string]: (number|Long) }|null);

        /** SlimTimings blobSeen */
        blobSeen?: ({ [k: string]: beacon_slots.IBlobTimingMap }|null);

        /** SlimTimings blockFirstSeenP2p */
        blockFirstSeenP2p?: ({ [k: string]: (number|Long) }|null);

        /** SlimTimings blobFirstSeenP2p */
        blobFirstSeenP2p?: ({ [k: string]: beacon_slots.IBlobTimingMap }|null);
    }

    /** Represents a SlimTimings. */
    class SlimTimings implements ISlimTimings {

        /**
         * Constructs a new SlimTimings.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.ISlimTimings);

        /** SlimTimings blockSeen. */
        public blockSeen: { [k: string]: (number|Long) };

        /** SlimTimings blobSeen. */
        public blobSeen: { [k: string]: beacon_slots.IBlobTimingMap };

        /** SlimTimings blockFirstSeenP2p. */
        public blockFirstSeenP2p: { [k: string]: (number|Long) };

        /** SlimTimings blobFirstSeenP2p. */
        public blobFirstSeenP2p: { [k: string]: beacon_slots.IBlobTimingMap };

        /**
         * Creates a new SlimTimings instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SlimTimings instance
         */
        public static create(properties?: beacon_slots.ISlimTimings): beacon_slots.SlimTimings;

        /**
         * Encodes the specified SlimTimings message. Does not implicitly {@link beacon_slots.SlimTimings.verify|verify} messages.
         * @param message SlimTimings message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.ISlimTimings, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SlimTimings message, length delimited. Does not implicitly {@link beacon_slots.SlimTimings.verify|verify} messages.
         * @param message SlimTimings message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.ISlimTimings, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SlimTimings message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SlimTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.SlimTimings;

        /**
         * Decodes a SlimTimings message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SlimTimings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.SlimTimings;

        /**
         * Verifies a SlimTimings message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SlimTimings message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SlimTimings
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.SlimTimings;

        /**
         * Creates a plain object from a SlimTimings message. Also converts values to other types if specified.
         * @param message SlimTimings
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.SlimTimings, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SlimTimings to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SlimTimings
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a BeaconSlotData. */
    interface IBeaconSlotData {

        /** BeaconSlotData slot */
        slot?: (number|Long|null);

        /** BeaconSlotData network */
        network?: (string|null);

        /** BeaconSlotData processedAt */
        processedAt?: (string|null);

        /** BeaconSlotData processingTimeMs */
        processingTimeMs?: (number|Long|null);

        /** BeaconSlotData block */
        block?: (beacon_slots.IBlockData|null);

        /** BeaconSlotData proposer */
        proposer?: (beacon_slots.IProposer|null);

        /** BeaconSlotData entity */
        entity?: (string|null);

        /** BeaconSlotData nodes */
        nodes?: ({ [k: string]: beacon_slots.INode }|null);

        /** BeaconSlotData timings */
        timings?: (beacon_slots.ISlimTimings|null);

        /** BeaconSlotData attestations */
        attestations?: (beacon_slots.IAttestationsData|null);
    }

    /** Represents a BeaconSlotData. */
    class BeaconSlotData implements IBeaconSlotData {

        /**
         * Constructs a new BeaconSlotData.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IBeaconSlotData);

        /** BeaconSlotData slot. */
        public slot: (number|Long);

        /** BeaconSlotData network. */
        public network: string;

        /** BeaconSlotData processedAt. */
        public processedAt: string;

        /** BeaconSlotData processingTimeMs. */
        public processingTimeMs: (number|Long);

        /** BeaconSlotData block. */
        public block?: (beacon_slots.IBlockData|null);

        /** BeaconSlotData proposer. */
        public proposer?: (beacon_slots.IProposer|null);

        /** BeaconSlotData entity. */
        public entity: string;

        /** BeaconSlotData nodes. */
        public nodes: { [k: string]: beacon_slots.INode };

        /** BeaconSlotData timings. */
        public timings?: (beacon_slots.ISlimTimings|null);

        /** BeaconSlotData attestations. */
        public attestations?: (beacon_slots.IAttestationsData|null);

        /**
         * Creates a new BeaconSlotData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BeaconSlotData instance
         */
        public static create(properties?: beacon_slots.IBeaconSlotData): beacon_slots.BeaconSlotData;

        /**
         * Encodes the specified BeaconSlotData message. Does not implicitly {@link beacon_slots.BeaconSlotData.verify|verify} messages.
         * @param message BeaconSlotData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IBeaconSlotData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BeaconSlotData message, length delimited. Does not implicitly {@link beacon_slots.BeaconSlotData.verify|verify} messages.
         * @param message BeaconSlotData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IBeaconSlotData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BeaconSlotData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BeaconSlotData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.BeaconSlotData;

        /**
         * Decodes a BeaconSlotData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns BeaconSlotData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.BeaconSlotData;

        /**
         * Verifies a BeaconSlotData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BeaconSlotData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BeaconSlotData
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.BeaconSlotData;

        /**
         * Creates a plain object from a BeaconSlotData message. Also converts values to other types if specified.
         * @param message BeaconSlotData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.BeaconSlotData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BeaconSlotData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for BeaconSlotData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LocallyBuiltBlockMetadata. */
    interface ILocallyBuiltBlockMetadata {

        /** LocallyBuiltBlockMetadata metaClientName */
        metaClientName?: (string|null);

        /** LocallyBuiltBlockMetadata eventDateTime */
        eventDateTime?: (google.protobuf.ITimestamp|null);

        /** LocallyBuiltBlockMetadata metaClientVersion */
        metaClientVersion?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientImplementation */
        metaClientImplementation?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientGeoCity */
        metaClientGeoCity?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientGeoCountry */
        metaClientGeoCountry?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientGeoCountryCode */
        metaClientGeoCountryCode?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientGeoContinentCode */
        metaClientGeoContinentCode?: (string|null);

        /** LocallyBuiltBlockMetadata metaClientGeoLongitude */
        metaClientGeoLongitude?: (number|null);

        /** LocallyBuiltBlockMetadata metaClientGeoLatitude */
        metaClientGeoLatitude?: (number|null);

        /** LocallyBuiltBlockMetadata metaConsensusVersion */
        metaConsensusVersion?: (string|null);

        /** LocallyBuiltBlockMetadata metaConsensusImplementation */
        metaConsensusImplementation?: (string|null);

        /** LocallyBuiltBlockMetadata metaNetworkName */
        metaNetworkName?: (string|null);
    }

    /** Represents a LocallyBuiltBlockMetadata. */
    class LocallyBuiltBlockMetadata implements ILocallyBuiltBlockMetadata {

        /**
         * Constructs a new LocallyBuiltBlockMetadata.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.ILocallyBuiltBlockMetadata);

        /** LocallyBuiltBlockMetadata metaClientName. */
        public metaClientName: string;

        /** LocallyBuiltBlockMetadata eventDateTime. */
        public eventDateTime?: (google.protobuf.ITimestamp|null);

        /** LocallyBuiltBlockMetadata metaClientVersion. */
        public metaClientVersion: string;

        /** LocallyBuiltBlockMetadata metaClientImplementation. */
        public metaClientImplementation: string;

        /** LocallyBuiltBlockMetadata metaClientGeoCity. */
        public metaClientGeoCity: string;

        /** LocallyBuiltBlockMetadata metaClientGeoCountry. */
        public metaClientGeoCountry: string;

        /** LocallyBuiltBlockMetadata metaClientGeoCountryCode. */
        public metaClientGeoCountryCode: string;

        /** LocallyBuiltBlockMetadata metaClientGeoContinentCode. */
        public metaClientGeoContinentCode: string;

        /** LocallyBuiltBlockMetadata metaClientGeoLongitude. */
        public metaClientGeoLongitude: number;

        /** LocallyBuiltBlockMetadata metaClientGeoLatitude. */
        public metaClientGeoLatitude: number;

        /** LocallyBuiltBlockMetadata metaConsensusVersion. */
        public metaConsensusVersion: string;

        /** LocallyBuiltBlockMetadata metaConsensusImplementation. */
        public metaConsensusImplementation: string;

        /** LocallyBuiltBlockMetadata metaNetworkName. */
        public metaNetworkName: string;

        /**
         * Creates a new LocallyBuiltBlockMetadata instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LocallyBuiltBlockMetadata instance
         */
        public static create(properties?: beacon_slots.ILocallyBuiltBlockMetadata): beacon_slots.LocallyBuiltBlockMetadata;

        /**
         * Encodes the specified LocallyBuiltBlockMetadata message. Does not implicitly {@link beacon_slots.LocallyBuiltBlockMetadata.verify|verify} messages.
         * @param message LocallyBuiltBlockMetadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.ILocallyBuiltBlockMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LocallyBuiltBlockMetadata message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltBlockMetadata.verify|verify} messages.
         * @param message LocallyBuiltBlockMetadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.ILocallyBuiltBlockMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LocallyBuiltBlockMetadata message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LocallyBuiltBlockMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.LocallyBuiltBlockMetadata;

        /**
         * Decodes a LocallyBuiltBlockMetadata message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LocallyBuiltBlockMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.LocallyBuiltBlockMetadata;

        /**
         * Verifies a LocallyBuiltBlockMetadata message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LocallyBuiltBlockMetadata message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LocallyBuiltBlockMetadata
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.LocallyBuiltBlockMetadata;

        /**
         * Creates a plain object from a LocallyBuiltBlockMetadata message. Also converts values to other types if specified.
         * @param message LocallyBuiltBlockMetadata
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.LocallyBuiltBlockMetadata, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LocallyBuiltBlockMetadata to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LocallyBuiltBlockMetadata
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LocallyBuiltBlock. */
    interface ILocallyBuiltBlock {

        /** LocallyBuiltBlock slot */
        slot?: (number|Long|null);

        /** LocallyBuiltBlock slotStartDateTime */
        slotStartDateTime?: (google.protobuf.ITimestamp|null);

        /** LocallyBuiltBlock metadata */
        metadata?: (beacon_slots.ILocallyBuiltBlockMetadata|null);

        /** LocallyBuiltBlock blockVersion */
        blockVersion?: (string|null);

        /** LocallyBuiltBlock blockTotalBytes */
        blockTotalBytes?: (number|null);

        /** LocallyBuiltBlock blockTotalBytesCompressed */
        blockTotalBytesCompressed?: (number|null);

        /** LocallyBuiltBlock executionPayloadValue */
        executionPayloadValue?: (number|Long|null);

        /** LocallyBuiltBlock consensusPayloadValue */
        consensusPayloadValue?: (number|Long|null);

        /** LocallyBuiltBlock executionPayloadBlockNumber */
        executionPayloadBlockNumber?: (number|null);

        /** LocallyBuiltBlock executionPayloadGasLimit */
        executionPayloadGasLimit?: (number|Long|null);

        /** LocallyBuiltBlock executionPayloadGasUsed */
        executionPayloadGasUsed?: (number|Long|null);

        /** LocallyBuiltBlock executionPayloadTransactionsCount */
        executionPayloadTransactionsCount?: (number|null);

        /** LocallyBuiltBlock executionPayloadTransactionsTotalBytes */
        executionPayloadTransactionsTotalBytes?: (number|null);

        /** LocallyBuiltBlock executionPayloadTransactionsTotalBytesCompressed */
        executionPayloadTransactionsTotalBytesCompressed?: (number|null);
    }

    /** Represents a LocallyBuiltBlock. */
    class LocallyBuiltBlock implements ILocallyBuiltBlock {

        /**
         * Constructs a new LocallyBuiltBlock.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.ILocallyBuiltBlock);

        /** LocallyBuiltBlock slot. */
        public slot: (number|Long);

        /** LocallyBuiltBlock slotStartDateTime. */
        public slotStartDateTime?: (google.protobuf.ITimestamp|null);

        /** LocallyBuiltBlock metadata. */
        public metadata?: (beacon_slots.ILocallyBuiltBlockMetadata|null);

        /** LocallyBuiltBlock blockVersion. */
        public blockVersion: string;

        /** LocallyBuiltBlock blockTotalBytes. */
        public blockTotalBytes: number;

        /** LocallyBuiltBlock blockTotalBytesCompressed. */
        public blockTotalBytesCompressed: number;

        /** LocallyBuiltBlock executionPayloadValue. */
        public executionPayloadValue: (number|Long);

        /** LocallyBuiltBlock consensusPayloadValue. */
        public consensusPayloadValue: (number|Long);

        /** LocallyBuiltBlock executionPayloadBlockNumber. */
        public executionPayloadBlockNumber: number;

        /** LocallyBuiltBlock executionPayloadGasLimit. */
        public executionPayloadGasLimit: (number|Long);

        /** LocallyBuiltBlock executionPayloadGasUsed. */
        public executionPayloadGasUsed: (number|Long);

        /** LocallyBuiltBlock executionPayloadTransactionsCount. */
        public executionPayloadTransactionsCount: number;

        /** LocallyBuiltBlock executionPayloadTransactionsTotalBytes. */
        public executionPayloadTransactionsTotalBytes: number;

        /** LocallyBuiltBlock executionPayloadTransactionsTotalBytesCompressed. */
        public executionPayloadTransactionsTotalBytesCompressed: number;

        /**
         * Creates a new LocallyBuiltBlock instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LocallyBuiltBlock instance
         */
        public static create(properties?: beacon_slots.ILocallyBuiltBlock): beacon_slots.LocallyBuiltBlock;

        /**
         * Encodes the specified LocallyBuiltBlock message. Does not implicitly {@link beacon_slots.LocallyBuiltBlock.verify|verify} messages.
         * @param message LocallyBuiltBlock message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.ILocallyBuiltBlock, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LocallyBuiltBlock message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltBlock.verify|verify} messages.
         * @param message LocallyBuiltBlock message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.ILocallyBuiltBlock, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LocallyBuiltBlock message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LocallyBuiltBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.LocallyBuiltBlock;

        /**
         * Decodes a LocallyBuiltBlock message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LocallyBuiltBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.LocallyBuiltBlock;

        /**
         * Verifies a LocallyBuiltBlock message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LocallyBuiltBlock message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LocallyBuiltBlock
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.LocallyBuiltBlock;

        /**
         * Creates a plain object from a LocallyBuiltBlock message. Also converts values to other types if specified.
         * @param message LocallyBuiltBlock
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.LocallyBuiltBlock, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LocallyBuiltBlock to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LocallyBuiltBlock
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LocallyBuiltSlotBlocks. */
    interface ILocallyBuiltSlotBlocks {

        /** LocallyBuiltSlotBlocks slot */
        slot?: (number|Long|null);

        /** LocallyBuiltSlotBlocks blocks */
        blocks?: (beacon_slots.ILocallyBuiltBlock[]|null);
    }

    /** Represents a LocallyBuiltSlotBlocks. */
    class LocallyBuiltSlotBlocks implements ILocallyBuiltSlotBlocks {

        /**
         * Constructs a new LocallyBuiltSlotBlocks.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.ILocallyBuiltSlotBlocks);

        /** LocallyBuiltSlotBlocks slot. */
        public slot: (number|Long);

        /** LocallyBuiltSlotBlocks blocks. */
        public blocks: beacon_slots.ILocallyBuiltBlock[];

        /**
         * Creates a new LocallyBuiltSlotBlocks instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LocallyBuiltSlotBlocks instance
         */
        public static create(properties?: beacon_slots.ILocallyBuiltSlotBlocks): beacon_slots.LocallyBuiltSlotBlocks;

        /**
         * Encodes the specified LocallyBuiltSlotBlocks message. Does not implicitly {@link beacon_slots.LocallyBuiltSlotBlocks.verify|verify} messages.
         * @param message LocallyBuiltSlotBlocks message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.ILocallyBuiltSlotBlocks, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LocallyBuiltSlotBlocks message, length delimited. Does not implicitly {@link beacon_slots.LocallyBuiltSlotBlocks.verify|verify} messages.
         * @param message LocallyBuiltSlotBlocks message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.ILocallyBuiltSlotBlocks, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LocallyBuiltSlotBlocks message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LocallyBuiltSlotBlocks
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.LocallyBuiltSlotBlocks;

        /**
         * Decodes a LocallyBuiltSlotBlocks message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LocallyBuiltSlotBlocks
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.LocallyBuiltSlotBlocks;

        /**
         * Verifies a LocallyBuiltSlotBlocks message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LocallyBuiltSlotBlocks message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LocallyBuiltSlotBlocks
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.LocallyBuiltSlotBlocks;

        /**
         * Creates a plain object from a LocallyBuiltSlotBlocks message. Also converts values to other types if specified.
         * @param message LocallyBuiltSlotBlocks
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.LocallyBuiltSlotBlocks, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LocallyBuiltSlotBlocks to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LocallyBuiltSlotBlocks
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetRecentLocallyBuiltBlocksRequest. */
    interface IGetRecentLocallyBuiltBlocksRequest {

        /** GetRecentLocallyBuiltBlocksRequest network */
        network?: (string|null);
    }

    /** Represents a GetRecentLocallyBuiltBlocksRequest. */
    class GetRecentLocallyBuiltBlocksRequest implements IGetRecentLocallyBuiltBlocksRequest {

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IGetRecentLocallyBuiltBlocksRequest);

        /** GetRecentLocallyBuiltBlocksRequest network. */
        public network: string;

        /**
         * Creates a new GetRecentLocallyBuiltBlocksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentLocallyBuiltBlocksRequest instance
         */
        public static create(properties?: beacon_slots.IGetRecentLocallyBuiltBlocksRequest): beacon_slots.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IGetRecentLocallyBuiltBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksRequest message, length delimited. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksRequest.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IGetRecentLocallyBuiltBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentLocallyBuiltBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Verifies a GetRecentLocallyBuiltBlocksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentLocallyBuiltBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentLocallyBuiltBlocksRequest
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.GetRecentLocallyBuiltBlocksRequest;

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksRequest message. Also converts values to other types if specified.
         * @param message GetRecentLocallyBuiltBlocksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.GetRecentLocallyBuiltBlocksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentLocallyBuiltBlocksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetRecentLocallyBuiltBlocksResponse. */
    interface IGetRecentLocallyBuiltBlocksResponse {

        /** GetRecentLocallyBuiltBlocksResponse slotBlocks */
        slotBlocks?: (beacon_slots.ILocallyBuiltSlotBlocks[]|null);
    }

    /** Represents a GetRecentLocallyBuiltBlocksResponse. */
    class GetRecentLocallyBuiltBlocksResponse implements IGetRecentLocallyBuiltBlocksResponse {

        /**
         * Constructs a new GetRecentLocallyBuiltBlocksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IGetRecentLocallyBuiltBlocksResponse);

        /** GetRecentLocallyBuiltBlocksResponse slotBlocks. */
        public slotBlocks: beacon_slots.ILocallyBuiltSlotBlocks[];

        /**
         * Creates a new GetRecentLocallyBuiltBlocksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentLocallyBuiltBlocksResponse instance
         */
        public static create(properties?: beacon_slots.IGetRecentLocallyBuiltBlocksResponse): beacon_slots.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IGetRecentLocallyBuiltBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentLocallyBuiltBlocksResponse message, length delimited. Does not implicitly {@link beacon_slots.GetRecentLocallyBuiltBlocksResponse.verify|verify} messages.
         * @param message GetRecentLocallyBuiltBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IGetRecentLocallyBuiltBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Decodes a GetRecentLocallyBuiltBlocksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentLocallyBuiltBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Verifies a GetRecentLocallyBuiltBlocksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentLocallyBuiltBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentLocallyBuiltBlocksResponse
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.GetRecentLocallyBuiltBlocksResponse;

        /**
         * Creates a plain object from a GetRecentLocallyBuiltBlocksResponse message. Also converts values to other types if specified.
         * @param message GetRecentLocallyBuiltBlocksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.GetRecentLocallyBuiltBlocksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentLocallyBuiltBlocksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentLocallyBuiltBlocksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetRecentValidatorBlocksRequest. */
    interface IGetRecentValidatorBlocksRequest {

        /** GetRecentValidatorBlocksRequest network */
        network?: (string|null);
    }

    /** Represents a GetRecentValidatorBlocksRequest. */
    class GetRecentValidatorBlocksRequest implements IGetRecentValidatorBlocksRequest {

        /**
         * Constructs a new GetRecentValidatorBlocksRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IGetRecentValidatorBlocksRequest);

        /** GetRecentValidatorBlocksRequest network. */
        public network: string;

        /**
         * Creates a new GetRecentValidatorBlocksRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentValidatorBlocksRequest instance
         */
        public static create(properties?: beacon_slots.IGetRecentValidatorBlocksRequest): beacon_slots.GetRecentValidatorBlocksRequest;

        /**
         * Encodes the specified GetRecentValidatorBlocksRequest message. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksRequest.verify|verify} messages.
         * @param message GetRecentValidatorBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IGetRecentValidatorBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentValidatorBlocksRequest message, length delimited. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksRequest.verify|verify} messages.
         * @param message GetRecentValidatorBlocksRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IGetRecentValidatorBlocksRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentValidatorBlocksRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentValidatorBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.GetRecentValidatorBlocksRequest;

        /**
         * Decodes a GetRecentValidatorBlocksRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentValidatorBlocksRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.GetRecentValidatorBlocksRequest;

        /**
         * Verifies a GetRecentValidatorBlocksRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentValidatorBlocksRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentValidatorBlocksRequest
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.GetRecentValidatorBlocksRequest;

        /**
         * Creates a plain object from a GetRecentValidatorBlocksRequest message. Also converts values to other types if specified.
         * @param message GetRecentValidatorBlocksRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.GetRecentValidatorBlocksRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentValidatorBlocksRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentValidatorBlocksRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a GetRecentValidatorBlocksResponse. */
    interface IGetRecentValidatorBlocksResponse {

        /** GetRecentValidatorBlocksResponse slotBlocks */
        slotBlocks?: (beacon_slots.ILocallyBuiltSlotBlocks[]|null);
    }

    /** Represents a GetRecentValidatorBlocksResponse. */
    class GetRecentValidatorBlocksResponse implements IGetRecentValidatorBlocksResponse {

        /**
         * Constructs a new GetRecentValidatorBlocksResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: beacon_slots.IGetRecentValidatorBlocksResponse);

        /** GetRecentValidatorBlocksResponse slotBlocks. */
        public slotBlocks: beacon_slots.ILocallyBuiltSlotBlocks[];

        /**
         * Creates a new GetRecentValidatorBlocksResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns GetRecentValidatorBlocksResponse instance
         */
        public static create(properties?: beacon_slots.IGetRecentValidatorBlocksResponse): beacon_slots.GetRecentValidatorBlocksResponse;

        /**
         * Encodes the specified GetRecentValidatorBlocksResponse message. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksResponse.verify|verify} messages.
         * @param message GetRecentValidatorBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: beacon_slots.IGetRecentValidatorBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified GetRecentValidatorBlocksResponse message, length delimited. Does not implicitly {@link beacon_slots.GetRecentValidatorBlocksResponse.verify|verify} messages.
         * @param message GetRecentValidatorBlocksResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: beacon_slots.IGetRecentValidatorBlocksResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a GetRecentValidatorBlocksResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetRecentValidatorBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): beacon_slots.GetRecentValidatorBlocksResponse;

        /**
         * Decodes a GetRecentValidatorBlocksResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns GetRecentValidatorBlocksResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): beacon_slots.GetRecentValidatorBlocksResponse;

        /**
         * Verifies a GetRecentValidatorBlocksResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a GetRecentValidatorBlocksResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns GetRecentValidatorBlocksResponse
         */
        public static fromObject(object: { [k: string]: any }): beacon_slots.GetRecentValidatorBlocksResponse;

        /**
         * Creates a plain object from a GetRecentValidatorBlocksResponse message. Also converts values to other types if specified.
         * @param message GetRecentValidatorBlocksResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: beacon_slots.GetRecentValidatorBlocksResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this GetRecentValidatorBlocksResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for GetRecentValidatorBlocksResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace google. */
export namespace google {

    /** Namespace protobuf. */
    namespace protobuf {

        /** Properties of a Timestamp. */
        interface ITimestamp {

            /** Timestamp seconds */
            seconds?: (number|Long|null);

            /** Timestamp nanos */
            nanos?: (number|null);
        }

        /** Represents a Timestamp. */
        class Timestamp implements ITimestamp {

            /**
             * Constructs a new Timestamp.
             * @param [properties] Properties to set
             */
            constructor(properties?: google.protobuf.ITimestamp);

            /** Timestamp seconds. */
            public seconds: (number|Long);

            /** Timestamp nanos. */
            public nanos: number;

            /**
             * Creates a new Timestamp instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Timestamp instance
             */
            public static create(properties?: google.protobuf.ITimestamp): google.protobuf.Timestamp;

            /**
             * Encodes the specified Timestamp message. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Timestamp message, length delimited. Does not implicitly {@link google.protobuf.Timestamp.verify|verify} messages.
             * @param message Timestamp message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: google.protobuf.ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Timestamp message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): google.protobuf.Timestamp;

            /**
             * Decodes a Timestamp message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Timestamp
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): google.protobuf.Timestamp;

            /**
             * Verifies a Timestamp message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Timestamp message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Timestamp
             */
            public static fromObject(object: { [k: string]: any }): google.protobuf.Timestamp;

            /**
             * Creates a plain object from a Timestamp message. Also converts values to other types if specified.
             * @param message Timestamp
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: google.protobuf.Timestamp, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Timestamp to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Timestamp
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }
}
