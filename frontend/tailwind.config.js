const defaultConfig = require('tailwindcss/defaultConfig')
const formsPlugin = require('@tailwindcss/forms')

/** @type {import('tailwindcss/types').Config} */
const config = {
	content: ['index.html', 'src/**/*.tsx'],
	darkMode: 'class',
	theme: {
		fontFamily: {
			sans: ['Orbitron', 'Inter', ...defaultConfig.theme.fontFamily.sans],
			mono: ['JetBrains Mono', ...defaultConfig.theme.fontFamily.mono]
		},
		extend: {
			colors: {
				'cyber': {
					'neon': '#00ff9f',
					'pink': '#ff2b92',
					'blue': '#00ffff',
					'purple': '#2563eb',
					'yellow': '#ffff00',
					'dark': '#0a0a0f',
					'darker': '#050507',
					'light': '#1a1a2f'
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
		function({ addBase, theme }) {
			addBase({
				// Default styles for all elements
				'body': {
					color: theme('colors.cyber.neon'),
					backgroundColor: theme('colors.cyber.darker'),
				},
				// Base text styles
				'p, span, div': {
					color: 'inherit',
				},
				// Links
				'a': {
					color: 'inherit',
					'&:hover': {
						opacity: 0.8,
					},
				},
				// Cards and containers
				'.card': {
					backgroundColor: 'rgba(10, 10, 15, 0.8)',
					backdropFilter: 'blur(8px)',
					border: '1px solid rgba(0, 255, 159, 0.15)',
					borderRadius: theme('borderRadius.lg'),
					transition: 'all 0.2s ease-in-out',
					'&:hover': {
						borderColor: 'rgba(0, 255, 159, 0.3)',
						backgroundColor: 'rgba(0, 255, 159, 0.05)',
					},
				},
				// Buttons
				'button:not([class*="bg-"]), [type="button"]:not([class*="bg-"])': {
					backgroundColor: 'rgba(10, 10, 15, 0.8)',
					border: '1px solid rgba(0, 255, 159, 0.15)',
					borderRadius: theme('borderRadius.lg'),
					padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
					transition: 'all 0.2s ease-in-out',
					'&:hover': {
						borderColor: 'rgba(0, 255, 159, 0.3)',
						backgroundColor: 'rgba(0, 255, 159, 0.05)',
					},
				},
				// Headings
				'h1, h2, h3, h4, h5, h6': {
					color: theme('colors.cyber.neon'),
					fontWeight: theme('fontWeight.bold'),
				},
				// Text variants
				'.text-primary': {
					color: theme('colors.cyber.neon'),
				},
				'.text-secondary': {
					color: theme('colors.cyber.neon'),
					opacity: 0.85,
				},
				'.text-tertiary': {
					color: theme('colors.cyber.neon'),
					opacity: 0.7,
				},
				'.text-accent': {
					color: theme('colors.cyber.pink'),
				},
				'.text-accent-secondary': {
					color: theme('colors.cyber.blue'),
				},
				'.text-accent-tertiary': {
					color: theme('colors.cyber.purple'),
				},
				'.text-success': {
					color: theme('colors.cyber.neon'),
				},
				'.text-warning': {
					color: theme('colors.cyber.yellow'),
				},
				'.text-error': {
					color: theme('colors.cyber.pink'),
				},
				'.text-muted': {
					opacity: 0.5,
				},
			})
		}
	]
}
module.exports = config
