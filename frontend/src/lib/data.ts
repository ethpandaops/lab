import { getConfig } from "../config";

export const getBeaconChainTimingsPath = (network: string, timeWindow: string, dataType: string): string => {
  return `beacon_chain_timings/${dataType}/${network}/${timeWindow}.json`;
};

export const fetchData = async <T>(path: string): Promise<T> => {
  const config = getConfig();
  // In development, use the proxy path
  const baseUrl = import.meta.env.DEV ? '' : config.s3.endpoint;
  const url = `${baseUrl}/lab-data/${path}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch data from ${url}:`, error);
    throw error;
  }
}; 