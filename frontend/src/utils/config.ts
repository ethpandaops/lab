import type { Config } from '../types'

// In production, this will be replaced with the actual config at build time
let config: Config | null = null

// Load config immediately in development
if (import.meta.env.DEV) {
  fetch('/config.yaml')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load config')
      }
      return response.json()
    })
    .then(data => {
      config = data as Config
      console.log('🔧 Config loaded:', config)
    })
    .catch(error => {
      console.error('❌ Failed to load config:', error)
    })
}

export const getConfig = async (): Promise<Config> => {
  if (config) {
    return config
  }

  // In development, fetch the config from the dev server
  if (import.meta.env.DEV) {
    const response = await fetch('/config.yaml')
    if (!response.ok) {
      throw new Error('Failed to load config')
    }
    const data = await response.json()
    config = data as Config
    return config
  }

  throw new Error('Config not loaded')
}

// Helper to get networks without async/await
export const getNetworks = (): string[] => {
  if (!config) {
    console.log('⚠️ Using default networks as config is not loaded')
    return ['mainnet', 'sepolia', 'holesky'] // Default fallback
  }
  return config.notebooks['xatu-public-contributors'].networks
} 