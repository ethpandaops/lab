export interface MinClientVersions {
  grandine?: string;
  lighthouse?: string;
  lodestar?: string;
  nimbus?: string;
  prysm?: string;
  teku?: string;
  tysm?: string;
}

export interface Fork {
  epoch: number;
  min_client_versions: MinClientVersions;
}

export interface ConsensusForks {
  phase0?: Fork;
  altair?: Fork;
  bellatrix?: Fork;
  capella?: Fork;
  deneb?: Fork;
  electra?: Fork;
  fulu?: Fork;
  glaos?: Fork;
  fusaka?: Fork;
}

export interface Forks {
  consensus: ConsensusForks;
}

export interface Network {
  name: string;
  display_name: string;
  chain_id: number;
  genesis_time: number;
  genesis_delay: number;
  forks: Forks;
}

export interface Feature {
  path: string;
  disabled_networks?: string[]; // Optional: list of networks where page is disabled
}

export interface Config {
  networks: Network[];
  features: Feature[];
}
