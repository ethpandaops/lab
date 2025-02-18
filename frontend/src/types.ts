export interface TimeWindowConfig {
	file: string
	step: string
	label: string
	range: string
}

export interface ModuleConfig {
	enabled: boolean
	description: string
	path_prefix: string
	networks: string[]
	time_windows: TimeWindowConfig[]
}

export interface Config {
	modules: {
		[key: string]: ModuleConfig
	}
	data: {
		type: string
		path: string
	}
}
