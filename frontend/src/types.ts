export interface XatuNode {
  network: string;
  client_name: string;
  consensus_client: string;
  consensus_version: string;
  country: string;
  city: string;
  continent: string;
  latest_slot: number;
  latest_slot_start_date_time: number;
  client_implementation: string;
  client_version: string;
}

export interface XatuContributor {
  name: string;
  node_count: number;
  updated_at: number;
  nodes: XatuNode[];
}

export interface XatuSummary {
  contributors: XatuContributor[];
}
