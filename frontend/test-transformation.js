#!/usr/bin/env node

// Test script to verify REST to gRPC transformation

async function fetchAndTransform() {
  const slot = 12647577;
  const network = 'mainnet';
  const baseUrl = 'http://localhost:8888/api/v1';
  
  try {
    // Fetch all REST endpoints
    console.log('Fetching data from REST endpoints...');
    const endpoints = [
      `/mainnet/beacon/slot/${slot}/block`,
      `/mainnet/beacon/slot/${slot}/block/timing`,
      `/mainnet/beacon/slot/${slot}/blob/timing`,
      `/mainnet/beacon/slot/${slot}/blob/total`,
      `/mainnet/beacon/slot/${slot}/attestation/timing`,
      `/mainnet/beacon/slot/${slot}/attestation/correctness`,
      `/mainnet/beacon/slot/${slot}/mev`,
      `/mainnet/beacon/slot/${slot}/mev/relay`,
      `/mainnet/beacon/slot/${slot}/mev/builder`,
    ];
    
    const responses = await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(`${baseUrl}${endpoint}`);
          return await res.json();
        } catch (err) {
          console.error(`Failed to fetch ${endpoint}:`, err.message);
          return null;
        }
      })
    );
    
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
    ] = responses;
    
    // Analyze node names in block timing
    console.log('\n=== Block Timing Nodes ===');
    if (blockTimingResult?.nodes) {
      const sampleNodes = blockTimingResult.nodes.slice(0, 5);
      sampleNodes.forEach(node => {
        const nodeName = `${node.username}/${network}/${node.nodeId}`;
        console.log(`Node: ${nodeName}`);
        console.log(`  Source: ${node.source}`);
        console.log(`  Client Name: ${node.client?.name || 'N/A'}`);
        console.log(`  Timing: ${node.seenSlotStartDiff}ms`);
      });
    }
    
    // Analyze blob timing aggregation
    console.log('\n=== Blob Timing Aggregation ===');
    if (blobTimingResult?.nodes) {
      const nodeBlobs = {};
      blobTimingResult.nodes.forEach(node => {
        const nodeName = `${node.username}/${network}/${node.nodeId}`;
        if (!nodeBlobs[nodeName]) {
          nodeBlobs[nodeName] = {};
        }
        const blobIdx = node.blobIndex !== undefined ? node.blobIndex : 'first';
        nodeBlobs[nodeName][blobIdx] = node.seenSlotStartDiff;
      });
      
      // Show first 3 nodes with their blob timings
      Object.entries(nodeBlobs).slice(0, 3).forEach(([nodeName, blobs]) => {
        console.log(`Node: ${nodeName}`);
        console.log(`  Blobs:`, blobs);
      });
    }
    
    // Check entity field
    console.log('\n=== Entity Check ===');
    if (blockResult?.blocks?.length > 0) {
      const block = blockResult.blocks[0];
      console.log(`Entity in block: ${block.entity || 'NOT FOUND'}`);
      console.log(`Proposer Index: ${block.proposerIndex}`);
    }
    
    // Check for missing fields
    console.log('\n=== Missing Fields Check ===');
    if (blockResult?.blocks?.length > 0) {
      const block = blockResult.blocks[0];
      console.log(`eth1BlockHash: ${block.eth1BlockHash || 'MISSING'}`);
      console.log(`eth1DepositRoot: ${block.eth1DepositRoot || 'MISSING'}`);
      console.log(`transactionCount: ${block.transactionCount || 'MISSING'}`);
      console.log(`transactionsTotalBytes: ${block.transactionsTotalBytes || 'MISSING'}`);
    }
    
    // Compare with grpc.json if it exists
    const fs = require('fs');
    if (fs.existsSync('grpc.json')) {
      console.log('\n=== Comparing with gRPC data ===');
      const grpcData = JSON.parse(fs.readFileSync('grpc.json', 'utf8'));
      
      // Compare node counts
      const grpcNodeCount = Object.keys(grpcData.nodes || {}).length;
      const restNodeCount = new Set([
        ...(blockTimingResult?.nodes || []).map(n => `${n.username}/${network}/${n.nodeId}`),
        ...(blobTimingResult?.nodes || []).map(n => `${n.username}/${network}/${n.nodeId}`)
      ]).size;
      
      console.log(`gRPC nodes: ${grpcNodeCount}`);
      console.log(`REST nodes: ${restNodeCount}`);
      
      // Compare timings structure
      const grpcHasBlockSeen = Object.keys(grpcData.timings?.block_seen || {}).length > 0;
      const grpcHasBlockP2P = Object.keys(grpcData.timings?.block_first_seen_p2p || {}).length > 0;
      const grpcHasBlobSeen = Object.keys(grpcData.timings?.blob_seen || {}).length > 0;
      
      console.log(`\ngRPC has block_seen: ${grpcHasBlockSeen}`);
      console.log(`gRPC has block_first_seen_p2p: ${grpcHasBlockP2P}`);
      console.log(`gRPC has blob_seen: ${grpcHasBlobSeen}`);
      
      // Show a sample node comparison
      const sampleGrpcNode = Object.keys(grpcData.nodes || {})[0];
      if (sampleGrpcNode) {
        console.log(`\nSample gRPC node: ${sampleGrpcNode}`);
        console.log(`  Block timing: ${grpcData.timings?.block_seen?.[sampleGrpcNode] || grpcData.timings?.block_first_seen_p2p?.[sampleGrpcNode] || 'N/A'}`);
        if (grpcData.timings?.blob_seen?.[sampleGrpcNode]) {
          console.log(`  Blob timings:`, grpcData.timings.blob_seen[sampleGrpcNode].timings);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchAndTransform();