import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Experiments } from './pages/Experiments'
import { Xatu } from './pages/xatu'
import { Contributors } from './pages/xatu/Contributors'
import { ClientVersions } from './pages/xatu/ClientVersions'

export const App = () => {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Layout />}>
					<Route index element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/experiments" element={<Experiments />} />
					<Route path="/experiments/xatu" element={<Xatu />} />
					<Route path="/experiments/xatu/contributors" element={<Contributors />} />
					<Route path="/experiments/xatu/client-versions" element={<ClientVersions />} />
				</Route>
			</Routes>
		</Router>
	)
}
