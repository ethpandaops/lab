import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useEffect, useState } from 'react'
import { getConfig } from './utils/config'
import type { Config } from './types'
import { LoadingState } from './components/common/LoadingState'
import { ErrorState } from './components/common/ErrorState'
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
import Experiments from './pages/Experiments';
import MaintenanceOverlay from './components/common/MaintenanceOverlay';

// Create config context
export const ConfigContext = createContext<Config | null>(null)

const queryClient = new QueryClient()

function App() {
	const [config, setConfig] = useState<Config | null>(null)
	const [configError, setConfigError] = useState<Error | null>(null)

	useEffect(() => {
		getConfig()
			.then(setConfig)
			.catch(setConfigError)
	}, [])

	if (configError) {
		return <ErrorState message="Failed to load configuration" error={configError} />
	}

	if (!config) {
		return <LoadingState message="Loading configuration..." />
	}

	return (
		<QueryClientProvider client={queryClient}>
			<MaintenanceOverlay />
			<ConfigContext.Provider value={config}>
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
					</Route>
				</Routes>
			</ConfigContext.Provider>
		</QueryClientProvider>
	)
}

export default App
