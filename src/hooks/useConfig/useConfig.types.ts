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

export interface ServiceUrls {
  beaconExplorer?: string; // Beaconcha.in URL
  etherscan?: string; // Etherscan URL
  dora?: string; // Dora block explorer URL
  tracoor?: string; // Tracoor block explorer URL
  forkmon?: string; // Forkmon URL
  forky?: string; // Forky URL
  ethstats?: string; // Ethstats URL
}

export interface Network {
  name: string;
  display_name: string;
  chain_id: number;
  genesis_time: number;
  genesis_delay: number;
  forks: Forks;
  service_urls?: ServiceUrls;
}

export interface Feature {
  path: string;
  disabled_networks?: string[]; // Optional: list of networks where page is disabled
}

export interface Config {
  networks: Network[];
  features: Feature[];
}
