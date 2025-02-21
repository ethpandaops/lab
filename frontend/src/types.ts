export interface TimeWindowConfig {
	file: string
	step: string
	label: string
	range: string
}

export interface BeaconNetworkConfig {
	head_lag_slots: number
	backlog_days: number
}

export interface ClientVersions {
	grandine: string
	lighthouse: string
	lodestar: string
	nimbus: string
	prysm: string
	teku: string
}

export interface ConsensusFork {
	min_client_versions: ClientVersions
	epoch: number
}

export interface NetworkForks {
	consensus?: {
		electra?: ConsensusFork
	}
}

export interface EthereumNetwork {
	genesis_time: number
	forks: NetworkForks | null
}

export interface ModuleConfig {
	enabled: boolean
	description: string
	path_prefix: string
	networks: string[] | { [key: string]: BeaconNetworkConfig }
	time_windows?: TimeWindowConfig[]
}

export interface Config {
	modules: {
		[key: string]: ModuleConfig
	}
	ethereum: {
		networks: {
			[key: string]: EthereumNetwork
		}
	}
}

export interface XatuNode {
	network: string
	client_name: string
	consensus_client: string
	consensus_version: string
	country: string
	city: string
	continent: string
	latest_slot: number
	latest_slot_start_date_time: number
	client_implementation: string
	client_version: string
}

export interface XatuContributor {
	name: string
	node_count: number
	updated_at: number
	nodes: XatuNode[]
}

export interface XatuSummary {
	contributors: XatuContributor[]
}
