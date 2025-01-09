import type { Config } from '../types'
import yaml from 'js-yaml'

// Cache the config once loaded
let loadedConfig: Config | undefined

export async function loadConfig() {
  try {
    const response = await fetch('/config.yaml')
    
    // In production, we get the raw YAML
    if (import.meta.env.PROD) {
      const yamlText = await response.text()
      return yaml.load(yamlText)
    }
    
    // In dev, we get JSON from our middleware
    return await response.json()
  } catch (error) {
    console.error('Failed to load config:', error)
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