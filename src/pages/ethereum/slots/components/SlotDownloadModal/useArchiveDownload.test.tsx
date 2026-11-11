import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { JSX, ReactNode } from 'react';
import { client } from '@/lab-api/client.gen';
import { createQueryClient } from '@/utils/query-client';
import { useArchiveDownload } from './useArchiveDownload';

const root = '0x712f994351d05d72b466bf2a55f70cedbb734284200dceedd0b0346f4393b881';
const hash = '0x01247543e38115941fd15ea7cb7082920be4fa0c98e23f2c8b46aa16516eacd8';

function setup(network: string): { result: { current: ReturnType<typeof useArchiveDownload> } } {
  const queryClient = createQueryClient({ retry: false });
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useArchiveDownload(network), { wrapper });
}

describe('useArchiveDownload', () => {
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
  let saved: { filename: string; blob: Blob }[];

  // jsdom's fetch needs absolute URLs
  beforeAll(() => client.setConfig({ baseUrl: 'http://localhost' }));

  beforeEach(() => {
    saved = [];
    vi.stubGlobal('fetch', fetchMock);
    let blob: Blob;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
      blob = object as Blob;
      return 'blob:download';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ filename: this.download, blob });
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves a block as the file the proxy names, even when it's JSON", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise(resolve => (respond = resolve)));
    const { result } = setup('mainnet');

    act(() => result.current.download('block-json', { slot: 100, block_root: root, format: 'json' }));

    await waitFor(() => expect(result.current.pendingKey).toBe('block-json'));
    const request = fetchMock.mock.calls[0]?.[0];
    if (!request) throw new Error('expected the download to fetch the block');
    const url = new URL(request.url);
    expect(url.pathname).toBe('/api/v1/download/mainnet/block');
    expect(Object.fromEntries(url.searchParams)).toEqual({ slot: '100', block_root: root, format: 'json' });

    respond(
      new Response('{"version":"fulu"}', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="mainnet_slot_100_712f994351.json"',
        },
      })
    );

    await waitFor(() => expect(result.current.pendingKey).toBeNull());
    expect(result.current.error).toBeNull();
    expect(saved).toEqual([
      { filename: 'mainnet_slot_100_712f994351.json', blob: expect.objectContaining({ size: 18 }) },
    ]);
  });

  it("shows the archive's error, or a generic one when it gives none, and saves nothing", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('{"error":"blob not found in archive"}', {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    const { result } = setup('hoodi');

    act(() => result.current.download('blob-0', { versioned_hash: hash }));

    await waitFor(() => expect(result.current.error).toBe('blob not found in archive'));
    const request = fetchMock.mock.calls[0]?.[0];
    if (!request) throw new Error('expected the download to fetch the blob');
    const url = new URL(request.url);
    expect(url.pathname).toBe('/api/v1/download/hoodi/blob');
    expect(url.searchParams.get('versioned_hash')).toBe(hash);

    act(() => result.current.download('blob-0', { versioned_hash: hash }));

    await waitFor(() => expect(result.current.error).toBe('Download failed'));
    expect(result.current.pendingKey).toBeNull();
    expect(saved).toEqual([]);
  });
});
