import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Contributors } from './pages/xatu/Contributors'
import { ClientVersions } from './pages/xatu/ClientVersions'
import { Experiments } from './pages/Experiments'
import { Xatu } from './pages/xatu'

export const App = () => {
	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/experiments" element={<Experiments />} />
					<Route path="/experiments/xatu" element={<Xatu />} />
					<Route path="/experiments/xatu/contributors" element={<Contributors />} />
					<Route path="/experiments/xatu/client-versions" element={<ClientVersions />} />
				</Routes>
			</Layout>
		</Router>
	)
}
