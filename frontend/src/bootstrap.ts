export interface Bootstrap {
  backend: {
    url: string;
    restApiUrl?: string; // Optional separate URL for REST API v1
  };
}

const isDev = import.meta.env.DEV;
const backendOverride = import.meta.env.VITE_BACKEND_URL;
const restApiOverride = import.meta.env.VITE_REST_API_URL;

export default async function fetchBootstrap(): Promise<Required<Bootstrap>> {
  // Allow overriding backend URL in dev mode
  if (isDev && backendOverride) {
    console.log('Using backend override:', backendOverride);
    if (restApiOverride) {
      console.log('Using REST API override:', restApiOverride);
    }
    return {
      backend: {
        url: backendOverride,
        restApiUrl: restApiOverride,
      },
    };
  }

  if (isDev) {
    // In dev, use vite proxy
    return {
      backend: {
        url: '/lab-data',
        restApiUrl: undefined,
      },
    };
  }

  const response = await fetch('/bootstrap.json');

  if (!response.ok) {
    throw new Error('Failed to fetch bootstrap config');
  }
  const json = (await response.json()) as Bootstrap;

  if (!json?.backend?.url) throw new Error('No backend url in response');

  return json;
}
