import { Routes, Route, Outlet, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import ScrollToTop from '@/components/common/ScrollToTop';
import Redirect from '@/components/common/Redirect';
import Home from '@/pages/Home.tsx';
import { About } from '@/pages/About.tsx';
import Xatu from '@/pages/xatu';
import XatuData from '@/pages/xatu-data';
import XatuDataContributorsList from '@/pages/xatu-data/ContributorsList';
import XatuDataContributorDetail from '@/pages/xatu-data/ContributorDetail';
import XatuDataNetworks from '@/pages/xatu-data/networks';
import XatuDataGeographicalChecklist from '@/pages/xatu-data/geographical-checklist';
import XatuDataForkReadiness from '@/pages/xatu-data/fork-readiness';
import { CommunityNodes } from '@/pages/xatu/CommunityNodes';
import Networks from '@/pages/xatu/networks';
import ContributorsList from '@/pages/xatu/ContributorsList';
import ContributorDetail from '@/pages/xatu/ContributorDetail';
import ForkReadiness from '@/pages/xatu/ForkReadiness';
import GeographicalChecklist from '@/pages/xatu/GeographicalChecklist';
import Layout from '@/components/layout/Layout';
import { BeaconChainTimings } from '@/pages/beacon/timings';
import { BlockTimings } from '@/pages/beacon/timings/blocks';
import { Beacon } from '@/pages/beacon';
import { BeaconLive } from '@/pages/beacon/live';
import { BeaconSlot } from '@/pages/beacon/slot';
import Experiments from '@/pages/Experiments.tsx';
import { SlotLookup } from '@/pages/beacon/slot/index';
import { ModalProvider } from '@/contexts/ModalContext.tsx';
import { LocallyBuiltBlocks } from '@/pages/beacon/LocallyBuiltBlocks';
import BlockProductionLivePage from '@/pages/beacon/block-production/live.tsx';
import BlockProductionSlotPage from '@/pages/beacon/block-production/slot.tsx';
import ApplicationProvider from '@/providers/application';
import fetchBootstrap, { Bootstrap } from '@/bootstrap';
import { createLabApiClient, LabApiClient, Config } from '@/api/client.ts';

function App() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [client, setClient] = useState<LabApiClient | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchBootstrap().then(setBootstrap).catch(setBootstrapError);
  }, []);

  useEffect(() => {
    if (bootstrap?.backend?.url) {
      setClient(createLabApiClient(bootstrap.backend.url));
    }
  }, [bootstrap]);

  useEffect(() => {
    if (client) {
      client
        .getConfig({})
        .then(config => {
          setConfig(config.config?.config || null);
        })
        .catch(setConfigError);
    }
  }, [client]);

  useEffect(() => {
    if (config) {
      const newParams = new URLSearchParams(searchParams);
      if (selectedNetwork === 'mainnet') {
        newParams.delete('network');
      } else {
        newParams.set('network', selectedNetwork);
      }

      setSearchParams(newParams, { replace: true });

      // Get network from URL or use mainnet as default
      const networkFromUrl = searchParams.get('network');
      const availableNetworks = Object.keys(config.ethereum?.networks || {});

      if (networkFromUrl && availableNetworks.includes(networkFromUrl)) {
        setSelectedNetwork(networkFromUrl);
      } else if (availableNetworks.length > 0 && !availableNetworks.includes(selectedNetwork)) {
        // If current network is not in available networks, switch to first available
        setSelectedNetwork(availableNetworks[0]);
      }
    }
  }, [config, selectedNetwork, searchParams, setSearchParams]);

  if (configError) {
    return <ErrorState message="Failed to load configuration" error={configError} />;
  }

  if (bootstrapError) {
    return <ErrorState message="Failed to load bootstrap" error={bootstrapError} />;
  }

  if (!config) {
    return <LoadingState message="Loading configuration..." />;
  }

  if (!client) {
    return <ErrorState message="Failed to load API client" />;
  }

  if (!bootstrap) {
    return <LoadingState message="Loading bootstrap..." />;
  }

  const availableNetworks = Object.keys(config.ethereum?.networks || {});

  return (
    <ApplicationProvider
      network={{ selectedNetwork, availableNetworks }}
      config={{ config }}
      api={{ client, baseUrl: bootstrap.backend.url, restApiUrl: bootstrap.backend.restApiUrl }}
      beacon={{ config }}
    >
      <ModalProvider>
        <ScrollToTop />
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
              <Route path="geographical-checklist" element={<GeographicalChecklist />} />
            </Route>
            <Route path="xatu-data" element={<XatuData />}>
              <Route path="contributors" element={<XatuDataContributorsList />} />
              <Route path="contributors/:name" element={<XatuDataContributorDetail />} />
              <Route path="networks" element={<XatuDataNetworks />} />
              <Route path="geographical-checklist" element={<XatuDataGeographicalChecklist />} />
              <Route path="fork-readiness" element={<XatuDataForkReadiness />} />
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
              <Route path="locally-built-blocks" element={<LocallyBuiltBlocks />} />
              <Route
                path="block-production"
                element={<Redirect to="/beacon/block-production/live" />}
              />
              <Route path="block-production/live" element={<BlockProductionLivePage />} />
              <Route path="block-production/:slot" element={<BlockProductionSlotPage />} />
            </Route>
          </Route>
        </Routes>
      </ModalProvider>
    </ApplicationProvider>
  );
}

export default App;
