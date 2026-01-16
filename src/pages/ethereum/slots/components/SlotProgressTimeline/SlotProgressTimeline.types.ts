import type {
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctMevBidHighestValueByBuilderChunked50Ms,
} from '@/api/types.gen';

/**
 * Props for the SlotProgressTimeline component.
 */
export interface SlotProgressTimelineProps {
  /** Slot number for fetching raw execution data */
  slot: number;
  /** Block propagation data for first-seen times */
  blockPropagation: FctBlockFirstSeenByNode[];
  /** Head propagation data - when chain head updated after block import */
  headPropagation: FctHeadFirstSeenByNode[];
  /** Blob propagation data (pre-Fulu) */
  blobPropagation: FctBlockBlobFirstSeenByNode[];
  /** Data column propagation data (Fulu+) */
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[];
  /** Attestation timing data */
  attestations: FctAttestationFirstSeenChunked50Ms[];
  /** MEV bid timing data (50ms chunks) */
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  /** Whether data is still loading */
  isLoading?: boolean;
  /** Selected contributor username from URL params */
  contributor?: string;
  /** Callback when contributor filter changes */
  onContributorChange?: (contributor: string | undefined) => void;
}

/**
 * Represents a span in the trace timeline.
 * Similar to OpenTelemetry/Jaeger trace spans.
 */
export interface TraceSpan {
  id: string;
  label: string;
  /** Start time in milliseconds relative to slot start */
  startMs: number;
  /** End time in milliseconds relative to slot start */
  endMs: number;
  /** Category for color coding */
  category:
    | 'slot'
    | 'propagation'
    | 'country'
    | 'internal'
    | 'individual'
    | 'mev'
    | 'mev-builder'
    | 'execution'
    | 'execution-client'
    | 'execution-node'
    | 'data-availability'
    | 'column'
    | 'attestation';
  /** Nesting depth (0 = root) */
  depth: number;
  /** Additional details for tooltip */
  details?: string;
  /** Whether this span arrived late (after attestation deadline) */
  isLate?: boolean;
  /** Node count for DA items */
  nodeCount?: number;
  /** Parent span ID for collapsible grouping */
  parentId?: string;
  /** Whether this span can be collapsed to hide children */
  collapsible?: boolean;
  /** Whether this span should be collapsed by default */
  defaultCollapsed?: boolean;
  /** Client name for rendering logo */
  clientName?: string;
  /** Client version string */
  clientVersion?: string;
  /** Node ID for propagation nodes */
  nodeId?: string;
  /** Username for linking to Xatu contributor page */
  username?: string;
  /** Node name (meta_client_name) for filtering */
  nodeName?: string;
  /** Country name */
  country?: string;
  /** City name */
  city?: string;
  /** Classification (canonical, forked, etc) */
  classification?: string;
  /** Whether this is a point-in-time event (show absolute time, not duration) */
  isPointInTime?: boolean;
  /** Execution client implementation (Geth, Besu, Nethermind, etc) */
  executionClient?: string;
  /** Execution client version string */
  executionVersion?: string;
  /** Engine API method version (V3, V4) */
  methodVersion?: string;
  /** Execution duration in milliseconds */
  executionDurationMs?: number;
}
