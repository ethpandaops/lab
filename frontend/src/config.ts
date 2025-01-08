interface Config {
  dataSource: {
    type: 'local' | 'github'
    githubRepo?: string
    githubBranch?: string
    githubPath?: string
    localPath?: string
  }
}

const config: Config = {
  dataSource: {
    type: import.meta.env.VITE_DATA_SOURCE_TYPE || 'local',
    githubRepo: import.meta.env.VITE_GITHUB_REPO || 'ethpandaops/lab',
    githubBranch: import.meta.env.VITE_GITHUB_BRANCH || 'main',
    githubPath: import.meta.env.VITE_GITHUB_DATA_PATH || 'data',
    localPath: import.meta.env.VITE_LOCAL_DATA_PATH || '/api/data'
  }
}

export const getDataUrl = (path: string): string => {
  const { dataSource } = config

  if (dataSource.type === 'github') {
    return `https://raw.githubusercontent.com/${dataSource.githubRepo}/${dataSource.githubBranch}/${dataSource.githubPath}/${path}`
  }

  return `${dataSource.localPath}/${path}`
}

export default config 