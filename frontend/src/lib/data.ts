export const getBeaconChainTimingsPath = (
  network: string,
  timeWindow: string,
  dataType: string,
): string => {
  return `beacon_chain_timings/${dataType}/${network}/${timeWindow}.json`;
};

export const fetchData = async <T>(baseUrl: string, path: string): Promise<T> => {
  const url = `${baseUrl}${path}`;

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
