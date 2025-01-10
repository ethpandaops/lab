import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import { About } from './pages/About';
import Xatu from './pages/xatu';
import { CommunityNodes } from './pages/xatu/CommunityNodes';
import Networks from './pages/xatu/networks';
import ContributorsList from './pages/xatu/ContributorsList';
import ContributorDetail from './pages/xatu/ContributorDetail';
import Layout from './components/layout/Layout';

function App(): JSX.Element {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<Home />} />
				<Route path="about" element={<About />} />
				<Route path="xatu" element={<Xatu />}>
					<Route path="community-nodes" element={<CommunityNodes />} />
					<Route path="networks" element={<Networks />} />
					<Route path="contributors" element={<ContributorsList />} />
					<Route path="contributors/:name" element={<ContributorDetail />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Route>
		</Routes>
	);
}

export default App;
