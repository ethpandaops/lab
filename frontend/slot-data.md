# Slot Data REST API Migration

## Overview
Migrating slot data fetching from gRPC (single large payload) to REST API (multiple smaller endpoints joined together) to improve performance and reduce payload size.

## Key Components

### 1. REST API Hook
- **File**: `src/hooks/useBeaconSlotData.ts`
- Custom React Query hook that fetches from multiple REST endpoints in parallel
- Transforms REST responses to match existing gRPC `BeaconSlotData` format

### 2. Data Transformer
- **File**: `src/utils/slotDataTransformer.ts`
- Converts multiple REST endpoint responses into single `BeaconSlotData` object
- Key mappings:
  - Attestation timing chunks aggregated by time (handles multiple block roots)
  - Participation rate from `correctnessPercentage` field
  - 12-second cutoff for block/blob timing data
  - Transaction count from `executionTransactionsCount` field

### 3. REST API Client
- **File**: `src/api/rest/client.ts`
- Added methods for all beacon slot endpoints (blocks, timing, attestations, MEV, etc.)
- Implements retry logic and error handling

### 4. Global API Mode Toggle
- **File**: `src/contexts/apiMode.tsx`
- Global context for REST/gRPC mode switching
- **File**: `src/components/layout/Layout.tsx`
- Added toggle button in top navigation (green=REST, blue=gRPC)

## Modified Pages

### SlotView Component
- **File**: `src/components/beacon/SlotView.tsx`
- Uses both REST and gRPC queries, switches based on global mode
- Removed local toggle in favor of global one

### Block Production Pages
- **Files**: `src/pages/beacon/block-production/slot.tsx`, `src/pages/beacon/block-production/live.tsx`
- Updated to use `useBeaconSlotData` hook
- Respects global API mode toggle
