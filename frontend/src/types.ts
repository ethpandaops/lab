export interface Config {
	notebooks: {
		'xatu-public-contributors': {
			enabled: boolean
			schedule_hours: number
			description: string
			networks: string[]
			time_windows: {
				file: string
				step: string
				label: string
				range: string
			}[]
		}
		'beacon-chain-timings': {
			enabled: boolean
			schedule_hours: number
			description: string
			networks: string[]
			time_windows: {
				file: string
				step: string
				label: string
				range: string
			}[]
		}
	}
	data: {
		type: string
		path: string
	}
}
