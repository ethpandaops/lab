const defaultConfig = require('tailwindcss/defaultConfig')
const formsPlugin = require('@tailwindcss/forms')

/** @type {import('tailwindcss/types').Config} */
const config = {
	content: ['index.html', 'src/**/*.tsx'],
	theme: {
		fontFamily: {
			sans: ['Inter', ...defaultConfig.theme.fontFamily.sans]
		},
		extend: {
			animation: {
				'text-shine': 'text-shine 3s linear infinite',
				'gradient': 'gradient 15s ease infinite',
				'glitch': 'glitch 0.2s ease-in-out',
				'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
			},
		},
	},
	experimental: { optimizeUniversalDefaults: true },
	plugins: [formsPlugin]
}
module.exports = config
