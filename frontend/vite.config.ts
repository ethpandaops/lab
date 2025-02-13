/// <reference types="vitest" />
import eslintPlugin from '@nabla/vite-plugin-eslint'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
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
				'/lab-data': {
					target: 'http://localhost:9000',
					changeOrigin: true,
					secure: false,
					configure: (proxy) => {
						proxy.on('proxyReq', (proxyReq, req) => {
							// Add bucket name to path
							const newPath = `/lab-data/${proxyReq.path.replace('/lab-data/', '')}`;
							console.log(`Proxying request: ${req.url} -> ${newPath}`);
							proxyReq.path = newPath;
						});
						proxy.on('error', (err, req, res) => {
							console.error('Proxy error:', err);
							res.writeHead(500, {
								'Content-Type': 'text/plain',
							});
							res.end('Proxy error: ' + err);
						});
						proxy.on('proxyRes', (proxyRes, req) => {
							console.log(`Proxy response: ${req.url} -> ${proxyRes.statusCode}`);
						});
					},
					headers: {
						'Access-Control-Allow-Origin': '*',
					},
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
