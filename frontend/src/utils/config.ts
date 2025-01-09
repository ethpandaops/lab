import type { Config } from '../types'
import yaml from 'js-yaml'

// Cache the config once loaded
let loadedConfig: Config | undefined

export const getConfig = async (): Promise<Config> => {
  // Return cached config if available
  if (loadedConfig) {
    return loadedConfig
  }

  // Fetch config from the appropriate location
  try {
    const response = await fetch('/config.yaml')
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`)
    }
    
    const text = await response.text()
    const data = yaml.load(text) as Config
    loadedConfig = data
    return loadedConfig
  } catch (error) {
    console.error('❌ Failed to load config:', error)
    throw error
  }
}

// Helper to get networks without async/await
export const getNetworks = (): string[] => {
  if (!loadedConfig) {
    throw new Error('Config not loaded - call getConfig() first')
  }
  return loadedConfig.notebooks['xatu-public-contributors'].networks
} 