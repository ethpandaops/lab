/**
 * Common probe data interface - fields shared between IntCustodyProbe and IntCustodyProbeOrderBySlot
 */
export interface ProbeData {
  slot?: number;
  column_indices?: number[];
  meta_peer_implementation?: string;
  meta_peer_geo_country_code?: string;
  probe_date_time?: number;
  result?: string;
  blob_submitters?: string[];
}

export interface ProbeEventRowProps {
  /** Probe data to display */
  probe: ProbeData;
  /** Click handler */
  onClick: () => void;
  /** Whether this is a newly added item (triggers highlight animation) */
  isNew?: boolean;
  /** Whether to show the "view" icon on the right */
  showViewIcon?: boolean;
}
