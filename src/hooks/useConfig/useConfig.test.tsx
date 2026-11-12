import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, server, waitFor } from '@/test-utils';
import { configFixture, configHandlers } from '@/test-utils/handlers';
import { useConfig } from './useConfig';

describe('useConfig', () => {
  it('should fetch and return config data from /api/v1/config', async () => {
    const paths: string[] = [];
    server.use(
      http.get('*', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json(configFixture);
      })
    );

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(configFixture);
    expect(paths).toEqual(['/api/v1/config']);
  });

  it('should handle failed refetch with cached data', async () => {
    server.use(configHandlers.success);

    const { result } = renderHook(() => useConfig());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    server.use(configHandlers.failure);

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.data).toEqual(configFixture);
  });
});
