import { Routes, Route, Outlet, useSearchParams } from 'react-router-dom'
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
import ForkReadiness from './pages/xatu/ForkReadiness';
import Layout from './components/layout/Layout';
import { BeaconChainTimings } from './pages/beacon/timings';
import { BlockTimings } from './pages/beacon/timings/blocks';
import { Beacon } from './pages/beacon';
import { BeaconLive } from './pages/beacon/live';
import { BeaconSlot } from './pages/beacon/slot';
import Experiments from './pages/Experiments';
import MaintenanceOverlay from './components/common/MaintenanceOverlay';
import { SlotLookup } from './pages/beacon/slot/index';

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
	const [searchParams, setSearchParams] = useSearchParams()

	// Update URL when network changes (but only if it's not the default)
	useEffect(() => {
		const newParams = new URLSearchParams(searchParams)
		if (selectedNetwork === 'mainnet') {
			newParams.delete('network')
		} else {
			newParams.set('network', selectedNetwork)
		}
		setSearchParams(newParams, { replace: true })
	}, [selectedNetwork])

	useEffect(() => {
		getConfig()
			.then(config => {
				// Initialize BeaconClockManager with config
				BeaconClockManager.getInstance().initialize(config)
				setConfig(config)
				
				// Get network from URL or use mainnet as default
				const networkFromUrl = searchParams.get('network')
				const availableNetworks = Object.keys(config.ethereum?.networks || {})
				
				if (networkFromUrl && availableNetworks.includes(networkFromUrl)) {
					setSelectedNetwork(networkFromUrl)
				} else if (availableNetworks.length > 0 && !availableNetworks.includes(selectedNetwork)) {
					// If current network is not in available networks, switch to first available
					setSelectedNetwork(availableNetworks[0])
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
								<Route path="fork-readiness" element={<ForkReadiness />} />
							</Route>
							<Route path="beacon" element={<Beacon />}>
								<Route path="slot" element={<Outlet />}>
									<Route index element={<SlotLookup />} />
									<Route path="live" element={<BeaconLive />} />
									<Route path=":slot" element={<BeaconSlot />} />
								</Route>
								<Route path="timings" element={<BeaconChainTimings />}>
									<Route path="blocks" element={<BlockTimings />} />
								</Route>
							</Route>
						</Route>
					</Routes>
				</NetworkContext.Provider>
			</ConfigContext.Provider>
		</QueryClientProvider>
	)
}

export default App
