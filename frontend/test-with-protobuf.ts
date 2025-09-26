#!/usr/bin/env tsx

// Test script to verify REST to gRPC transformation with proper protobuf conversion
import {
  ListBeaconSlotBlockResponse,
  ListBeaconSlotBlockTimingResponse,
  ListBeaconSlotBlobTimingResponse,
  ListBeaconSlotBlobTotalResponse,
  ListBeaconSlotAttestationTimingResponse,
  ListBeaconSlotAttestationCorrectnessResponse,
  ListBeaconSlotMevResponse,
  ListBeaconSlotMevRelayResponse,
  ListBeaconSlotMevBuilderResponse,
} from './src/api/gen/backend/pkg/api/v1/proto/public_pb';
import { transformToBeaconSlotData } from './src/utils/slotDataTransformer';
import * as fs from 'fs';

async function fetchAndTransformWithProtobuf() {
  const slot = 12647577;
  const network = 'mainnet';
  const baseUrl = 'http://localhost:8888/api/v1';

  try {
    console.log('Fetching data from REST endpoints with protobuf conversion...');

    // Fetch all data with proper protobuf conversion
    const results = await Promise.allSettled([
      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/block`)
        .then(r => r.json())
        .then(d => ListBeaconSlotBlockResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/block/timing`)
        .then(r => r.json())
        .then(d => ListBeaconSlotBlockTimingResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/blob/timing`)
        .then(r => r.json())
        .then(d => ListBeaconSlotBlobTimingResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/blob/total`)
        .then(r => r.json())
        .then(d => ListBeaconSlotBlobTotalResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/attestation/timing`)
        .then(r => r.json())
        .then(d => ListBeaconSlotAttestationTimingResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/attestation/correctness`)
        .then(r => r.json())
        .then(d => ListBeaconSlotAttestationCorrectnessResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/mev`)
        .then(r => r.json())
        .then(d => ListBeaconSlotMevResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/mev/relay`)
        .then(r => r.json())
        .then(d => ListBeaconSlotMevRelayResponse.fromJson(d)),

      fetch(`${baseUrl}/${network}/beacon/slot/${slot}/mev/builder`)
        .then(r => r.json())
        .then(d => ListBeaconSlotMevBuilderResponse.fromJson(d)),
    ]);

    const [
      blockResult,
      blockTimingResult,
      blobTimingResult,
      blobTotalResult,
      attestationTimingResult,
      attestationCorrectnessResult,
      mevBlockResult,
      mevRelayResult,
      mevBuilderResult,
    ] = results;

    // Log successful conversions
    console.log('\n=== Protobuf Conversion Results ===');
    results.forEach((result, i) => {
      const names = [
        'Block',
        'Block Timing',
        'Blob Timing',
        'Blob Total',
        'Attestation Timing',
        'Attestation Correctness',
        'MEV Block',
        'MEV Relay',
        'MEV Builder',
      ];
      console.log(`${names[i]}: ${result.status}`);
      if (result.status === 'rejected') {
        console.log(`  Error: ${result.reason}`);
      }
    });

    // Test block timing nodes
    if (blockTimingResult.status === 'fulfilled') {
      console.log('\n=== Block Timing Nodes (after protobuf) ===');
      const nodes = blockTimingResult.value.nodes?.slice(0, 3);
      nodes?.forEach(node => {
        const nodeName = `${node.username}/${network}/${node.nodeId}`;
        console.log(`Node: ${nodeName}`);
        console.log(`  nodeId: ${node.nodeId}`);
        console.log(`  username: ${node.username}`);
        console.log(`  seenSlotStartDiff: ${node.seenSlotStartDiff}`);
        console.log(`  source: ${node.source}`);
      });
    }

    // Test blob timing aggregation
    if (blobTimingResult.status === 'fulfilled') {
      console.log('\n=== Blob Timing Nodes (after protobuf) ===');
      const nodeBlobs: Record<string, Record<string, number>> = {};
      blobTimingResult.value.nodes?.forEach(node => {
        const nodeName = `${node.username}/${network}/${node.nodeId}`;
        if (!nodeBlobs[nodeName]) {
          nodeBlobs[nodeName] = {};
        }
        const blobIdx = node.blobIndex !== undefined ? node.blobIndex : 'first';
        nodeBlobs[nodeName][blobIdx] = Number(node.seenSlotStartDiff);
      });

      // Show first 3 nodes
      Object.entries(nodeBlobs)
        .slice(0, 3)
        .forEach(([nodeName, blobs]) => {
          console.log(`Node: ${nodeName}`);
          console.log(`  Blobs:`, blobs);
        });
    }

    // Transform the data
    console.log('\n=== Running Transformation ===');
    const transformedData = transformToBeaconSlotData({
      network,
      slot,
      genesisTime: 1606824023, // Mainnet genesis time
      blockResult,
      blockTimingResult,
      blobTimingResult,
      blobTotalResult,
      attestationTimingResult,
      attestationCorrectnessResult,
      mevBlockResult,
      mevRelayResult,
      mevBuilderResult,
    });

    // Save transformed data to file
    const outputFile = 'rest-transformed.json';
    fs.writeFileSync(outputFile, JSON.stringify(transformedData.toJson(), null, 2));
    console.log(`\nTransformed data saved to ${outputFile}`);

    // Analyze transformed data
    console.log('\n=== Transformed Data Summary ===');
    console.log(`Slot: ${transformedData.slot}`);
    console.log(`Network: ${transformedData.network}`);
    console.log(`Entity: ${transformedData.entity}`);
    console.log(`Nodes count: ${Object.keys(transformedData.nodes).length}`);
    console.log(
      `Block seen timings: ${Object.keys(transformedData.timings?.blockSeen || {}).length}`,
    );
    console.log(
      `Block P2P timings: ${Object.keys(transformedData.timings?.blockFirstSeenP2p || {}).length}`,
    );
    console.log(
      `Blob seen timings: ${Object.keys(transformedData.timings?.blobSeen || {}).length}`,
    );
    console.log(
      `Blob P2P timings: ${Object.keys(transformedData.timings?.blobFirstSeenP2p || {}).length}`,
    );

    // Show sample nodes
    const nodeNames = Object.keys(transformedData.nodes).slice(0, 3);
    console.log('\n=== Sample Nodes in Transformed Data ===');
    nodeNames.forEach(name => {
      console.log(`Node: ${name}`);
      const node = transformedData.nodes[name];
      console.log(`  Geo: ${node.geo?.city}, ${node.geo?.country}`);
      console.log(`  Coords: ${node.geo?.latitude}, ${node.geo?.longitude}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchAndTransformWithProtobuf();
