import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useEffect, useState } from 'react'
import { getConfig } from './config'
import type { Config } from './types'
import { LoadingState } from './components/common/LoadingState'
import { ErrorState } from './components/common/ErrorState'
import { BeaconClockManager } from './utils/beacon'
import Home from './pages/Home';
import { About } from './pages/About';
import Xatu from './pages/xatu';
import { CommunityNodes } from './pages/xatu/CommunityNodes';
import Networks from './pages/xatu/networks';
import ContributorsList from './pages/xatu/ContributorsList';
import ContributorDetail from './pages/xatu/ContributorDetail';
import Layout from './components/layout/Layout';
import { BeaconChainTimings } from './pages/beacon-chain-timings';
import { BlockTimings } from './pages/beacon-chain-timings/blocks';
import { Beacon } from './pages/beacon';
import { BeaconLive } from './pages/beacon/live';
import { BeaconSlot } from './pages/beacon/slot';
import Experiments from './pages/Experiments';
import MaintenanceOverlay from './components/common/MaintenanceOverlay';

// Create contexts
export const ConfigContext = createContext<Config | null>(null)

interface NetworkContextType {
	selectedNetwork: string
	setSelectedNetwork: (network: string) => void
	availableNetworks: string[]
}

export const NetworkContext = createContext<NetworkContextType>({
	selectedNetwork: 'mainnet',
	setSelectedNetwork: () => {},
	availableNetworks: ['mainnet']
})

const queryClient = new QueryClient()

function App() {
	const [config, setConfig] = useState<Config | null>(null)
	const [configError, setConfigError] = useState<Error | null>(null)
	const [selectedNetwork, setSelectedNetwork] = useState('mainnet')

	useEffect(() => {
		getConfig()
			.then(config => {
				// Initialize BeaconClockManager with config
				BeaconClockManager.getInstance().initialize(config)
				setConfig(config)
				// Set initial network from available networks
				if (config.ethereum?.networks) {
					const networks = Object.keys(config.ethereum.networks)
					if (networks.length > 0) {
						setSelectedNetwork(networks[0])
					}
				}
			})
			.catch(setConfigError)
	}, [])

	if (configError) {
		return <ErrorState message="Failed to load configuration" error={configError} />
	}

	if (!config) {
		return <LoadingState message="Loading configuration..." />
	}

	const availableNetworks = Object.keys(config.ethereum?.networks || {})

	return (
		<QueryClientProvider client={queryClient}>
			<ConfigContext.Provider value={config}>
				<NetworkContext.Provider value={{
					selectedNetwork,
					setSelectedNetwork,
					availableNetworks
				}}>
					<Routes>
						<Route path="/" element={<Layout />}>
							<Route index element={<Home />} />
							<Route path="about" element={<About />} />
							<Route path="experiments" element={<Experiments />} />
							<Route path="xatu" element={<Xatu />}>
								<Route path="community-nodes" element={<CommunityNodes />} />
								<Route path="networks" element={<Networks />} />
								<Route path="contributors" element={<ContributorsList />} />
								<Route path="contributors/:name" element={<ContributorDetail />} />
							</Route>
							<Route path="beacon-chain-timings" element={<BeaconChainTimings />}>
								<Route path="blocks" element={<BlockTimings />} />
							</Route>
							<Route path="beacon" element={<Beacon />}>
								<Route path="live" element={<BeaconLive />} />
								<Route path=":slot" element={<BeaconSlot />} />
							</Route>
						</Route>
					</Routes>
				</NetworkContext.Provider>
			</ConfigContext.Provider>
		</QueryClientProvider>
	)
}

export default App
