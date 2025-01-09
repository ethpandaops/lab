import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Experiments } from './pages/Experiments'
import { Xatu } from './pages/xatu'
import { CommunityNodes } from './pages/xatu/CommunityNodes'

export const App = () => {
	return (
		<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Layout>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/experiments" element={<Experiments />} />
					<Route path="/experiments/xatu-contributors" element={<Xatu />} />
					<Route path="/experiments/xatu-contributors/community-nodes" element={<CommunityNodes />} />
				</Routes>
			</Layout>
		</Router>
	)
}
