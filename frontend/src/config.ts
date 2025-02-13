interface Config {
  dataSource: {
    type: 'local' | 'github'
    githubRepo?: string
    githubBranch?: string
    githubPath?: string
    localPath?: string
  }
  s3: {
    endpoint: string
    bucket: string
    region: string
    accessKey: string
    secretKey: string
  }
}

const config: Config = {
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

export const getDataUrl = (path: string): string => {
  const { dataSource } = config

  if (dataSource.type === 'github') {
    return `https://raw.githubusercontent.com/${dataSource.githubRepo}/${dataSource.githubBranch}/${dataSource.githubPath}/${path}`
  }

  return `${dataSource.localPath}/${path}`
}

export const getConfig = () => config;

export default config 