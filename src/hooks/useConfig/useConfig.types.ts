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
  electra?: Fork;
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

export interface Experiment {
  name: string;
  enabled: boolean;
  networks: string[];
}

export interface Config {
  networks: Network[];
  experiments: Experiment[];
}
