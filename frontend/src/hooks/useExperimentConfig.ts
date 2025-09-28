import { useQuery } from '@tanstack/react-query';
import { getRestApiClient } from '@/api';
import type { GetExperimentConfigResponse } from '@/api/gen/backend/pkg/api/v1/proto/public_pb';

interface UseExperimentConfigOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  staleTime?: number;
}

export function useExperimentConfig(
  experimentId: string,
  options: UseExperimentConfigOptions = {},
) {
  const { enabled = true, refetchInterval = false, staleTime = 10_000 } = options;

  return useQuery<GetExperimentConfigResponse>({
    queryKey: ['experimentConfig', experimentId],
    queryFn: async () => {
      const client = await getRestApiClient();
      return client.getExperimentConfig(experimentId);
    },
    enabled,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
