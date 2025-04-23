# API TypeScript Types

This directory contains TypeScript types generated from the Lab API Protocol Buffer definitions.

## How to Generate Types

The TypeScript types are generated from the Protocol Buffer definitions in the backend. To regenerate the types, run:

```bash
npm run generate-types
```

This script uses [protobufjs](https://github.com/protobufjs/protobuf.js) to generate TypeScript types from the Proto files.

## Type Structure

The generated types are organized in a maintainable structure:

```
src/api/proto/
├── index.ts                     # Main barrel file exporting all types
├── proto.d.ts                   # Generated TypeScript definitions
├── proto.js                     # Generated JavaScript code
├── labapi/                      # LabAPI namespace
│   ├── index.ts                 # Exports all labapi types
│   └── LabAPI.ts                # Convenience file for LabAPI
├── beacon_slots/                # Beacon slots namespace
│   ├── index.ts                 # Exports all beacon_slots types
│   └── LocallyBuiltBlock.ts     # Convenience file for LocallyBuiltBlock
└── google/                      # Google namespace
    ├── index.ts                 # Exports protobuf namespace
    └── protobuf/                # Google protobuf types
        └── index.ts             # Exports all protobuf types
```

## Using the Generated Types

The types can be imported in your TypeScript files in a couple of ways:

### Import entire namespaces

```typescript
import { labapi, beacon_slots } from './proto';

// Use types with namespace prefix
const request = labapi.GetRecentLocallyBuiltBlocksRequest.create({
  network: 'mainnet',
});
```

### Import specific types (preferred for tree-shaking)

```typescript
import { GetRecentLocallyBuiltBlocksRequest } from './proto/labapi';
import { LocallyBuiltBlock } from './proto/beacon_slots';

// Use types directly
const request = GetRecentLocallyBuiltBlocksRequest.create({
  network: 'mainnet',
});
```

## Examples

See `example-usage.ts` for a complete example of how to use the generated types.

### Creating Request Messages

```typescript
// Create a request message
const request = labapi.GetRecentLocallyBuiltBlocksRequest.create({
  network: 'mainnet',
});
```

### Making API Calls

```typescript
// Example using a client class
const client = new LabAPIClient('https://api.example.com');
const response = await client.getRecentLocallyBuiltBlocks('mainnet');

// Access the response data
if (response.slotBlocks && response.slotBlocks.length > 0) {
  const slotBlock = response.slotBlocks[0];
  console.log(`Slot: ${slotBlock.slot}`);
}
```

## Available Types

The main types available are:

- `labapi.LabAPI` - The main API service
- `labapi.GetRecentLocallyBuiltBlocksRequest` - Request for fetching recent locally built blocks
- `labapi.GetRecentLocallyBuiltBlocksResponse` - Response containing recent locally built blocks
- `beacon_slots.LocallyBuiltSlotBlocks` - Contains information about blocks for a specific slot
- `beacon_slots.LocallyBuiltBlock` - Information about a locally built block
- `beacon_slots.LocallyBuiltBlockMetadata` - Metadata for a locally built block

## Type Hierarchies

The types follow the structure defined in the Protocol Buffer definitions:

```
labapi.GetRecentLocallyBuiltBlocksResponse
└── slotBlocks: beacon_slots.LocallyBuiltSlotBlocks[]
    └── slot: number|Long
    └── blocks: beacon_slots.LocallyBuiltBlock[]
        └── slot: number|Long
        └── blockVersion: string
        └── blockTotalBytes: number
        └── metadata: beacon_slots.LocallyBuiltBlockMetadata
            └── metaClientName: string
            └── metaClientGeoCity: string
            └── ...
```

## Working with Long Values

Some numeric fields are represented as `number|Long` types. When working with these fields, you may need to convert them to regular JavaScript numbers:

```typescript
// Convert Long to number if needed
const slotNumber = Number(slotBlock.slot);
```

For very large numbers where precision is important, you can use the Long library directly:

```typescript
import Long from 'long';

const longValue = Long.fromValue(slotBlock.slot);
console.log(longValue.toString());
``` 