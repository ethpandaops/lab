const defaultConfig = require('tailwindcss/defaultConfig')
const formsPlugin = require('@tailwindcss/forms')

/** @type {import('tailwindcss/types').Config} */
const config = {
	content: ['index.html', 'src/**/*.tsx'],
	theme: {
		fontFamily: {
			sans: ['Orbitron', 'Inter', ...defaultConfig.theme.fontFamily.sans],
			mono: ['JetBrains Mono', ...defaultConfig.theme.fontFamily.mono]
		},
		extend: {
			colors: {
				'cyber': {
					'black': '#000614',
					'deep': '#000B27',
					'darker': '#001238',
					'dark': '#001952',
					'neon': '#00ff9f',
					'cyan': '#00f2ff',
					'blue': '#0066ff',
					'pink': '#ff0066',
					'yellow': '#ffd600'
				},
				// Base semantic colors that change with theme
				text: {
					DEFAULT: 'rgb(var(--text-primary) / <alpha-value>)',
					primary: 'rgb(var(--text-primary) / <alpha-value>)',
					secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
					tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
					muted: 'rgb(var(--text-muted) / <alpha-value>)',
				},
				bg: {
					DEFAULT: 'rgb(var(--bg-base) / <alpha-value>)',
					surface: 'rgb(var(--bg-surface) / <alpha-value>)',
					'surface-raised': 'rgb(var(--bg-surface-raised) / <alpha-value>)',
					hover: 'rgb(var(--bg-hover) / <alpha-value>)',
					active: 'rgb(var(--bg-active) / <alpha-value>)',
					card: 'rgb(var(--bg-card) / <alpha-value>)',
				},
				border: {
					DEFAULT: 'rgb(var(--border-subtle) / 0.5)',
					prominent: 'rgb(var(--border-default) / 0.5)',
					accent: 'rgb(var(--border-prominent) / 0.5)',
				},
				accent: {
					DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
					muted: 'rgb(var(--accent-muted) / <alpha-value>)',
				},
				success: {
					DEFAULT: 'rgb(var(--success) / <alpha-value>)',
				},
				warning: {
					DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
				},
				error: {
					DEFAULT: 'rgb(var(--error) / <alpha-value>)',
				}
			},
			animation: {
				'text-shine': 'text-shine 3s linear infinite',
				'gradient': 'gradient 15s ease infinite',
				'glitch': 'glitch 0.2s ease-in-out',
				'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'float': 'float 6s ease-in-out infinite',
				'glow': 'glow 2s ease-in-out infinite alternate',
				'scanline': 'scanline 6s linear infinite',
			},
			backgroundImage: {
				'cyber-grid': 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 159, .05) 25%, rgba(0, 255, 159, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 159, .05) 75%, rgba(0, 255, 159, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 159, .05) 25%, rgba(0, 255, 159, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 159, .05) 75%, rgba(0, 255, 159, .05) 76%, transparent 77%, transparent)',
			},
			keyframes: {
				'text-shine': {
					'0%, 100%': {
						'background-size': '200% 200%',
						'background-position': 'left center',
					},
					'50%': {
						'background-size': '200% 200%',
						'background-position': 'right center',
					},
				},
				'gradient': {
					'0%, 100%': {
						'background-position': '0% 50%',
					},
					'50%': {
						'background-position': '100% 50%',
					},
				},
				'glitch': {
					'0%': {
						transform: 'translate(0)',
					},
					'20%': {
						transform: 'translate(-2px, 2px)',
					},
					'40%': {
						transform: 'translate(-2px, -2px)',
					},
					'60%': {
						transform: 'translate(2px, 2px)',
					},
					'80%': {
						transform: 'translate(2px, -2px)',
					},
					'100%': {
						transform: 'translate(0)',
					},
				},
				'float': {
					'0%, 100%': {
						transform: 'translateY(0)',
					},
					'50%': {
						transform: 'translateY(-20px)',
					},
				},
				'glow': {
					'from': {
						'text-shadow': '0 0 10px #00ff9f, 0 0 20px #00ff9f, 0 0 30px #00ff9f',
					},
					'to': {
						'text-shadow': '0 0 20px #00ff9f, 0 0 30px #00ff9f, 0 0 40px #00ff9f',
					},
				},
				'scanline': {
					'0%': {
						transform: 'translateY(0)',
					},
					'100%': {
						transform: 'translateY(100%)',
					},
				},
			},
			boxShadow: {
				'neon': '0 0 5px theme(colors.cyber.neon), 0 0 20px theme(colors.cyber.neon)',
				'neon-strong': '0 0 10px theme(colors.cyber.neon), 0 0 30px theme(colors.cyber.neon), 0 0 50px theme(colors.cyber.neon)',
				'pink': '0 0 5px theme(colors.cyber.pink), 0 0 20px theme(colors.cyber.pink)',
				'blue': '0 0 5px theme(colors.cyber.blue), 0 0 20px theme(colors.cyber.blue)',
			},
			backgroundSize: {
				'cyber': '100px 100px',
			},
		},
	},
	experimental: { optimizeUniversalDefaults: true },
	plugins: [
		formsPlugin,
		function({ addBase }) {
			addBase({
				':root': {
					// Text colors - Space theme
					'--text-primary': '255 255 255', // Pure white (#FFFFFF)
					'--text-secondary': '226 232 240', // Slate 200 (#E2E8F0)
					'--text-tertiary': '148 163 184', // Slate 400 (#94A3B8)
					'--text-muted': '100 116 139', // Slate 500 (#64748B)

					// Background colors - Deep space gradient
					'--bg-base': '2 6 23', // Darker than navy (#02061A)
					'--bg-surface': '15 23 42', // Slate 950 (#0F172A)
					'--bg-surface-raised': '30 41 59', // Slate 800 (#1E293B)
					'--bg-hover': '51 65 85', // Slate 700 (#334155)
					'--bg-active': '71 85 105', // Slate 600 (#475569)
					'--bg-card': '15 23 42', // Slate 950 (#0F172A)

					// Borders - Deep space with cyan accents
					'--border-subtle': '30 41 59', // Slate 800 (#1E293B)
					'--border-default': '45 212 191', // Cyan (#2DD4BF)
					'--border-prominent': '34 211 238', // Bright cyan (#22D3EE)

					// Accent colors - Bright cyan primary
					'--accent': '34 211 238', // Bright cyan (#22D3EE)
					'--accent-muted': '45 212 191', // Teal (#2DD4BF)

					// Status colors - Space theme
					'--success': '52 211 153', // Emerald (#34D399)
					'--warning': '245 158 11', // Amber (#F59E0B)
					'--error': '239 68 68', // Rose (#EF4444)

					// Data visualization colors - Space theme
					'--data-blue-1': '59 130 246', // Blue (#3B82F6)
					'--data-blue-2': '99 102 241', // Indigo (#6366F1)
					'--data-green-1': '52 211 153', // Emerald (#34D399)
					'--data-green-2': '16 185 129', // Emerald (#10B981)
					'--data-yellow': '245 158 11', // Amber (#F59E0B)
					'--data-orange': '249 115 22', // Orange (#F97316)
				}
			})
		}
	]
}

module.exports = config
