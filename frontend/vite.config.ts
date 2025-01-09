/// <reference types="vitest" />
import eslintPlugin from '@nabla/vite-plugin-eslint'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths'
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

export default defineConfig(({ mode }) => {
	return {
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
						}),
						{
							name: 'config-handler',
							configureServer(server) {
								server.middlewares.use((request, response, next) => {
									if (request.url === '/config.yaml') {
										try {
											const configPath = path.resolve(process.cwd(), '../config.yaml')
											const configContent = fs.readFileSync(configPath, 'utf8')
											const parsedConfig = yaml.load(configContent)
											response.setHeader('Content-Type', 'application/json')
											response.end(JSON.stringify(parsedConfig))
											return
										} catch (error) {
											console.error('❌ Failed to serve config:', error)
											response.statusCode = 500
											response.end(JSON.stringify({ error: 'Failed to load config' }))
											return
										}
									}
									next()
								})
							},
							buildStart() {
								if (mode === 'production') {
									try {
										const configPath = path.resolve(process.cwd(), '../config.yaml')
										const configContent = fs.readFileSync(configPath, 'utf8')
										fs.writeFileSync(
											path.resolve(process.cwd(), 'public/config.yaml'),
											configContent
										)
									} catch (error) {
										console.error('❌ Failed to copy config during build:', error)
									}
								}
							}
						}
				  ])
		],
		server: {
			proxy: {
				'/api/data': {
					target: 'http://localhost',
					configure: (proxy) => {
							proxy.on('proxyReq', (_proxyRequest, request, response) => {
								const urlPath = request.url.replace('/api/data/', '') || ''
								const filePath = path.resolve(process.cwd(), '../data', urlPath)

								if (!fs.existsSync(filePath)) {
									response.statusCode = 404
									response.end('File not found')
									return
								}

								const fileStream = fs.createReadStream(filePath)
								response.setHeader('Content-Type', 'application/json')
								fileStream.pipe(response)
							})
					}
				}
			}
		},
		build: {
			rollupOptions: {
				input: {
					main: path.resolve(__dirname, 'index.html'),
				},
				output: {
					assetFileNames: 'assets/[name].[hash].[ext]',
					chunkFileNames: 'assets/[name].[hash].js',
					entryFileNames: 'assets/[name].[hash].js',
				}
			},
			copyPublicDir: true,
		},
		preview: {
			port: 5173,
			strictPort: true,
			host: true,
			cors: true
		},
		base: '/'
	}
})
