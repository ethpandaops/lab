import useBeaconContext from '@/contexts/beacon';

export function useBeaconClock(network: string) {
  const { getBeaconClock } = useBeaconContext();
  return getBeaconClock(network);
}
