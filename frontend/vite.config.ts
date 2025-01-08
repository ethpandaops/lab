/// <reference types="vitest" />
import eslintPlugin from '@nabla/vite-plugin-eslint'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => ({
	test: {
		css: false,
		include: ['src/**/__tests__/*'],
		globals: true,
		environment: 'jsdom',
		setupFiles: 'src/setupTests.ts',
		clearMocks: true,
		coverage: {
			include: ['src/**/*'],
			exclude: ['src/main.tsx'],
			thresholds: {
				'100': true
			},
			provider: 'istanbul',
			enabled: true,
			reporter: ['text', 'lcov'],
			reportsDirectory: 'coverage'
		}
	},
	plugins: [
		tsconfigPaths(),
		react(),
		...(mode === 'test'
			? []
			: [
					eslintPlugin(),
					VitePWA({
						registerType: 'autoUpdate',
						includeAssets: [
							'favicon.png',
							'robots.txt',
							'apple-touch-icon.png',
							'icons/*.svg',
							'fonts/*.woff2'
						],
						manifest: {
							theme_color: '#BD34FE',
							icons: [
								{
									src: '/android-chrome-192x192.png',
									sizes: '192x192',
									type: 'image/png',
									purpose: 'any maskable'
								},
								{
									src: '/android-chrome-512x512.png',
									sizes: '512x512',
									type: 'image/png'
								}
							]
						}
					})
			  ])
	],
	server: {
		proxy: {
			'/api/data': {
				target: 'http://localhost',
				configure: (proxy, _options) => {
					proxy.on('proxyReq', (proxyReq, req, res) => {
						// Extract the file path from the request URL
						const urlPath = req.url?.replace('/api/data/', '') || ''
						const filePath = path.join(__dirname, '..', 'data', urlPath)

						// Check if file exists
						if (!fs.existsSync(filePath)) {
							res.statusCode = 404
							res.end('File not found')
							return
						}

						// Serve the file
						const fileStream = fs.createReadStream(filePath)
						res.setHeader('Content-Type', 'application/json')
						fileStream.pipe(res)
					})
				}
			}
		}
	}
}))
