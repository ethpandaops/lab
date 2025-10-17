export interface Network {
  name: string;
  display_name: string;
  enabled: boolean;
  status: string;
}

export interface Experiment {
  name: string;
  enabled: boolean;
  networks: string[];
  description: string;
}

export interface Config {
  networks: Network[];
  experiments: Record<string, Experiment>;
}
