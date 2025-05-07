export interface Bootstrap {
  backend: {
    url: string;
  };
}

const isDev = import.meta.env.DEV;
const backendOverride = import.meta.env.VITE_BACKEND_URL;

export default async function fetchBootstrap(): Promise<Required<Bootstrap>> {
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

  const response = await fetch('/bootstrap.json');

  if (!response.ok) {
    throw new Error('Failed to fetch bootstrap config');
  }
  const json = (await response.json()) as Bootstrap;

  if (!json?.backend?.url) throw new Error('No backend url in response');

  return json;
}
