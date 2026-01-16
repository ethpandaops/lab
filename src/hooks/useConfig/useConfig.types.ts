export interface MinClientVersions {
  grandine?: string;
  lighthouse?: string;
  lodestar?: string;
  nimbus?: string;
  prysm?: string;
  teku?: string;
  tysm?: string;
}

export interface ConsensusFork {
  epoch: number;
  timestamp?: number;
  min_client_versions: MinClientVersions;
}

export interface ConsensusForks {
  phase0?: ConsensusFork;
  altair?: ConsensusFork;
  bellatrix?: ConsensusFork;
  capella?: ConsensusFork;
  deneb?: ConsensusFork;
  electra?: ConsensusFork;
  fulu?: ConsensusFork;
  glaos?: ConsensusFork;
  fusaka?: ConsensusFork;
}

export interface ExecutionFork {
  block: number;
  timestamp: number;
}

export interface ExecutionForks {
  frontier?: ExecutionFork;
  homestead?: ExecutionFork;
  dao?: ExecutionFork;
  tangerine_whistle?: ExecutionFork;
  spurious_dragon?: ExecutionFork;
  byzantium?: ExecutionFork;
  constantinople?: ExecutionFork;
  petersburg?: ExecutionFork;
  istanbul?: ExecutionFork;
  muir_glacier?: ExecutionFork;
  berlin?: ExecutionFork;
  london?: ExecutionFork;
  arrow_glacier?: ExecutionFork;
  gray_glacier?: ExecutionFork;
  paris?: ExecutionFork;
}

export interface Forks {
  consensus: ConsensusForks;
  execution?: ExecutionForks;
}

export interface ServiceUrls {
  beaconExplorer?: string; // Beaconcha.in URL
  explorer?: string; // Execution layer explorer (Etherscan, etc.)
  dora?: string; // Dora block explorer URL
  tracoor?: string; // Tracoor block explorer URL
  forkmon?: string; // Forkmon URL
  forky?: string; // Forky URL
  ethstats?: string; // Ethstats URL
}

export interface BlobScheduleItem {
  epoch: number;
  timestamp?: number;
  max_blobs_per_block: number;
}

export interface Network {
  name: string;
  display_name: string;
  chain_id: number;
  genesis_time: number;
  genesis_delay: number;
  forks: Forks;
  service_urls?: ServiceUrls;
  blob_schedule?: BlobScheduleItem[];
}

export interface Feature {
  path: string;
  disabled_networks?: string[]; // Optional: list of networks where page is disabled
}

export interface Config {
  networks: Network[];
  features: Feature[];
}
