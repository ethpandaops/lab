#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Paths
const rootDir = path.resolve(__dirname, '../..');
const protoDir = path.join(rootDir, 'backend/pkg/api/proto');
const beaconSlotsProtoPath = path.join(rootDir, 'backend/pkg/server/proto/beacon_slots/beacon_slots.proto');
const labApiProtoPath = path.join(protoDir, 'lab_api.proto');
const outputDir = path.join(__dirname, '../src/api/proto');

// Clean up any existing generated files
console.log('Cleaning up existing generated files...');
if (fs.existsSync(outputDir)) {
  // Keep track of files we need to preserve
  const preserveFiles = [];
  
  // Create a clean directory structure
  const files = fs.readdirSync(outputDir);
  for (const file of files) {
    const filePath = path.join(outputDir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else if (file !== 'README.md' && !preserveFiles.includes(file)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a temporary directory to handle imports correctly
const tempDir = path.join(__dirname, '../src/api/proto/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Copy the proto files to a temporary location with the correct structure
const tempBeaconSlotsDir = path.join(tempDir, 'backend/pkg/server/proto/beacon_slots');
if (!fs.existsSync(tempBeaconSlotsDir)) {
  fs.mkdirSync(tempBeaconSlotsDir, { recursive: true });
}

fs.copyFileSync(beaconSlotsProtoPath, path.join(tempBeaconSlotsDir, 'beacon_slots.proto'));
fs.copyFileSync(labApiProtoPath, path.join(tempDir, 'lab_api.proto'));

// Run pbjs to generate JavaScript from proto files in the temporary directory
const pbjsCmd = `npx pbjs -t static-module -w commonjs -o ${outputDir}/proto.js ${tempDir}/lab_api.proto`;

console.log('Generating JavaScript from proto files...');
exec(pbjsCmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Error generating JavaScript:', stderr);
    process.exit(1);
  }
  
  console.log('JavaScript generated successfully!');
  
  // Run pbts to generate TypeScript definitions
  const pbtsCmd = `npx pbts -o ${outputDir}/proto.d.ts ${outputDir}/proto.js`;
  
  console.log('Generating TypeScript definitions...');
  exec(pbtsCmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Error generating TypeScript definitions:', stderr);
      process.exit(1);
    }
    
    console.log('TypeScript definitions generated successfully!');
    
    // Now create simpler, more maintainable TypeScript files
    // We'll take a different approach: instead of trying to split the complex types,
    // we'll create simple facade types that are easier to use and maintain
    
    // Create directories for each namespace
    const labApiDir = path.join(outputDir, 'labapi');
    const beaconSlotsDir = path.join(outputDir, 'beacon_slots');
    const googleDir = path.join(outputDir, 'google');
    const googleProtobufDir = path.join(googleDir, 'protobuf');
    
    // Ensure directories exist
    [labApiDir, beaconSlotsDir, googleDir, googleProtobufDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Create main index.ts that re-exports from proto.d.ts
    const mainIndexContent = `// Generated TypeScript definitions for Protocol Buffers
// This file re-exports all types from the proto.d.ts file

// Export everything from the generated proto file
export * from './proto';
`;
    fs.writeFileSync(path.join(outputDir, 'index.ts'), mainIndexContent);
    
    // Create namespace index files
    const labApiIndexContent = `// Export all types from the labapi namespace
import * as labapi from '../proto';

export const {
  LabAPI,
  GetRecentLocallyBuiltBlocksRequest,
  GetRecentLocallyBuiltBlocksResponse,
} = labapi.labapi;

// Export interfaces
export type IGetRecentLocallyBuiltBlocksRequest = labapi.labapi.IGetRecentLocallyBuiltBlocksRequest;
export type IGetRecentLocallyBuiltBlocksResponse = labapi.labapi.IGetRecentLocallyBuiltBlocksResponse;
`;
    fs.writeFileSync(path.join(labApiDir, 'index.ts'), labApiIndexContent);
    
    const beaconSlotsIndexContent = `// Export all types from the beacon_slots namespace
import * as proto from '../proto';

export const {
  BeaconSlots,
  BeaconSlotData,
  AttestationWindow,
  AttestationsData,
  BlobArrivalTime,
  BlobArrivalTimes,
  BlobTimingMap,
  BlockArrivalTime,
  BlockData,
  FullTimings,
  Geo,
  GetRecentLocallyBuiltBlocksRequest,
  GetRecentLocallyBuiltBlocksResponse,
  GetRecentValidatorBlocksRequest,
  GetRecentValidatorBlocksResponse,
  LocallyBuiltBlock,
  LocallyBuiltBlockMetadata,
  LocallyBuiltSlotBlocks,
  Node,
  Proposer,
  SlimTimings,
} = proto.beacon_slots;

// Export interfaces
export type IBeaconSlotData = proto.beacon_slots.IBeaconSlotData;
export type IAttestationWindow = proto.beacon_slots.IAttestationWindow;
export type IAttestationsData = proto.beacon_slots.IAttestationsData;
export type IBlobArrivalTime = proto.beacon_slots.IBlobArrivalTime;
export type IBlobArrivalTimes = proto.beacon_slots.IBlobArrivalTimes;
export type IBlobTimingMap = proto.beacon_slots.IBlobTimingMap;
export type IBlockArrivalTime = proto.beacon_slots.IBlockArrivalTime;
export type IBlockData = proto.beacon_slots.IBlockData;
export type IFullTimings = proto.beacon_slots.IFullTimings;
export type IGeo = proto.beacon_slots.IGeo;
export type IGetRecentLocallyBuiltBlocksRequest = proto.beacon_slots.IGetRecentLocallyBuiltBlocksRequest;
export type IGetRecentLocallyBuiltBlocksResponse = proto.beacon_slots.IGetRecentLocallyBuiltBlocksResponse;
export type IGetRecentValidatorBlocksRequest = proto.beacon_slots.IGetRecentValidatorBlocksRequest;
export type IGetRecentValidatorBlocksResponse = proto.beacon_slots.IGetRecentValidatorBlocksResponse;
export type ILocallyBuiltBlock = proto.beacon_slots.ILocallyBuiltBlock;
export type ILocallyBuiltBlockMetadata = proto.beacon_slots.ILocallyBuiltBlockMetadata;
export type ILocallyBuiltSlotBlocks = proto.beacon_slots.ILocallyBuiltSlotBlocks;
export type INode = proto.beacon_slots.INode;
export type IProposer = proto.beacon_slots.IProposer;
export type ISlimTimings = proto.beacon_slots.ISlimTimings;
`;
    fs.writeFileSync(path.join(beaconSlotsDir, 'index.ts'), beaconSlotsIndexContent);
    
    const googleIndexContent = `// Export google namespace
export * as protobuf from './protobuf';
`;
    fs.writeFileSync(path.join(googleDir, 'index.ts'), googleIndexContent);
    
    const googleProtobufIndexContent = `// Export all types from the google.protobuf namespace
import * as proto from '../../proto';

export const {
  Timestamp,
} = proto.google.protobuf;

// Export interfaces
export type ITimestamp = proto.google.protobuf.ITimestamp;
`;
    fs.writeFileSync(path.join(googleProtobufDir, 'index.ts'), googleProtobufIndexContent);
    
    // Create some convenience type files for common types
    
    // LabAPI
    const labApiTypeContent = `// Convenience exports for LabAPI service
import { labapi } from '../proto';

export const LabAPI = labapi.LabAPI;
export type LabAPI = labapi.LabAPI;

// Types
export type GetRecentLocallyBuiltBlocksRequest = labapi.GetRecentLocallyBuiltBlocksRequest;
export type GetRecentLocallyBuiltBlocksResponse = labapi.GetRecentLocallyBuiltBlocksResponse;
export type IGetRecentLocallyBuiltBlocksRequest = labapi.IGetRecentLocallyBuiltBlocksRequest;
export type IGetRecentLocallyBuiltBlocksResponse = labapi.IGetRecentLocallyBuiltBlocksResponse;
`;
    fs.writeFileSync(path.join(labApiDir, 'LabAPI.ts'), labApiTypeContent);
    
    // LocallyBuiltBlock
    const locallyBuiltBlockTypeContent = `// Convenience exports for LocallyBuiltBlock
import { beacon_slots } from '../proto';

export type LocallyBuiltBlock = beacon_slots.LocallyBuiltBlock;
export type ILocallyBuiltBlock = beacon_slots.ILocallyBuiltBlock;
export type LocallyBuiltBlockMetadata = beacon_slots.LocallyBuiltBlockMetadata;
export type ILocallyBuiltBlockMetadata = beacon_slots.ILocallyBuiltBlockMetadata;
export type LocallyBuiltSlotBlocks = beacon_slots.LocallyBuiltSlotBlocks;
export type ILocallyBuiltSlotBlocks = beacon_slots.ILocallyBuiltSlotBlocks;
`;
    fs.writeFileSync(path.join(beaconSlotsDir, 'LocallyBuiltBlock.ts'), locallyBuiltBlockTypeContent);
    
    console.log('TypeScript facade types created successfully!');
    
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Temporary directory cleaned up.');
  });
}); 