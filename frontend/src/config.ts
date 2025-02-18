import { Config } from './types'

const isDev = import.meta.env.DEV

interface BootstrapConfig {
  backend: {
    url: string
  }
}

async function loadBootstrapConfig(): Promise<BootstrapConfig> {
  if (isDev) {
    // In dev, use vite proxy
    return {
      backend: {
        url: ''
      }
    }
  }

  try {
    const response = await fetch('/bootstrap.json')
    if (!response.ok) {
      throw new Error(`Failed to load bootstrap config: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to load bootstrap config:', error)
    // Fallback to empty config
    return {
      backend: {
        url: ''
      }
    }
  }
}

let bootstrapConfig: BootstrapConfig | null = null

export async function getConfig(): Promise<Config> {
  if (!bootstrapConfig) {
    bootstrapConfig = await loadBootstrapConfig()
  }

  const baseConfig: Config = {
    dataSource: {
      type: import.meta.env.VITE_DATA_SOURCE_TYPE || 'local',
      githubRepo: import.meta.env.VITE_GITHUB_REPO || 'ethpandaops/lab',
      githubBranch: import.meta.env.VITE_GITHUB_BRANCH || 'main',
      githubPath: import.meta.env.VITE_GITHUB_DATA_PATH || 'data',
      localPath: import.meta.env.VITE_LOCAL_DATA_PATH || '/lab-data'
    },
    s3: {
      endpoint: import.meta.env.VITE_S3_ENDPOINT || 'http://localhost:9000',
      bucket: import.meta.env.VITE_S3_BUCKET || 'lab-data',
      region: import.meta.env.VITE_S3_REGION || 'us-east-1',
      accessKey: import.meta.env.VITE_S3_ACCESS_KEY || 'minioadmin',
      secretKey: import.meta.env.VITE_S3_SECRET_KEY || 'minioadmin'
    }
  }

  if (isDev) {
    return baseConfig
  }

  return {
    ...baseConfig,
    apiEndpoint: bootstrapConfig.backend.url || baseConfig.apiEndpoint,
  }
}

export const getDataUrl = (path: string): string => {
  const { dataSource } = getConfig()

  if (dataSource.type === 'github') {
    return `https://raw.githubusercontent.com/${dataSource.githubRepo}/${dataSource.githubBranch}/${dataSource.githubPath}/${path}`
  }

  return `${dataSource.localPath}/${path}`
}

export default getConfig 