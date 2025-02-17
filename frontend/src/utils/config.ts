import type { Config } from '../types'

let configPromise: Promise<Config> | null = null

export const getConfig = async (): Promise<Config> => {
  if (configPromise) {
    return configPromise
  }

  configPromise = fetch('/lab-data/config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }
      return response.json()
    })
    .catch(error => {
      configPromise = null // Reset on error so we can try again
      throw error
    })

  return configPromise
}
