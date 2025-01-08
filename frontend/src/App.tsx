import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Contributors } from './pages/xatu/Contributors'
import { ClientVersions } from './pages/xatu/ClientVersions'

export const App = () => {
	return (
		<Router>
			<Layout>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/xatu/contributors" element={<Contributors />} />
					<Route path="/xatu/client-versions" element={<ClientVersions />} />
				</Routes>
			</Layout>
		</Router>
	)
}
