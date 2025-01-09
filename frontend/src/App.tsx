import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Experiments } from './pages/Experiments'
import { Xatu } from './pages/xatu'
import { ClientVersions } from './pages/xatu/ClientVersions'
import { CommunityNodes } from './pages/xatu/CommunityNodes'

export const App = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/experiments" element={<Experiments />} />
					<Route path="/experiments/xatu-contributors" element={<Xatu />} />
					<Route path="/experiments/xatu/client-versions" element={<ClientVersions />} />
					<Route path="/experiments/xatu/community-nodes" element={<CommunityNodes />} />
				</Route>
			</Routes>
		</Router>
	)
}
