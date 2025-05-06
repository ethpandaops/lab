import { Config } from '@/types';

const isDev = import.meta.env.DEV;
const backendOverride = import.meta.env.VITE_BACKEND_URL;

interface BootstrapConfig {
  backend: {
    url: string;
  };
}

async function loadBootstrapConfig(): Promise<BootstrapConfig> {
  // Allow overriding backend URL in dev mode
  if (isDev && backendOverride) {
    console.log('Using backend override:', backendOverride);
    return {
      backend: {
        url: backendOverride,
      },
    };
  }

  if (isDev) {
    // In dev, use vite proxy
    return {
      backend: {
        url: '/lab-data',
      },
    };
  }

  try {
    const response = await fetch('/bootstrap.json');
    if (!response.ok) {
      throw new Error(`Failed to load bootstrap config: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function loadRemoteConfig(bootstrapConfig: BootstrapConfig): Promise<Config> {
  try {
    const response = await fetch(`${bootstrapConfig.backend.url}/config.json`);
    if (!response.ok) {
      throw new Error(`Failed to load remote config: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load remote config:', error);
    throw error;
  }
}

let bootstrapConfig: BootstrapConfig | null = null;
let remoteConfig: Config | null = null;

export async function getConfig(): Promise<Config> {
  // Step 1: Load bootstrap config if not already loaded
  if (!bootstrapConfig) {
    bootstrapConfig = await loadBootstrapConfig();

    console.log('bootstrapConfig', bootstrapConfig);
  }

  // Step 2: Load remote config if not in dev and not already lo
  if (!remoteConfig) {
    remoteConfig = await loadRemoteConfig(bootstrapConfig);

    console.log('remoteConfig', remoteConfig);

    return remoteConfig;
  }

  return remoteConfig;
}

export const getDataUrl = (path: string): string => {
  if (!bootstrapConfig) {
    throw new Error('Bootstrap config not loaded');
  }

  const { backend } = bootstrapConfig;

  return `${backend.url}/${path}`;
};

export default getConfig;
