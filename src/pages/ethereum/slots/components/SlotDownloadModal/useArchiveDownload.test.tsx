import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, renderHook, server, waitFor } from '@/test-utils';
import { useArchiveDownload } from './useArchiveDownload';

const root = '0x712f994351d05d72b466bf2a55f70cedbb734284200dceedd0b0346f4393b881';
const hash = '0x01247543e38115941fd15ea7cb7082920be4fa0c98e23f2c8b46aa16516eacd8';

describe('useArchiveDownload', () => {
  let saved: { filename: string; blob: Blob }[];

  beforeEach(() => {
    saved = [];
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

  it("saves a block as the file the proxy names, even when it's JSON", async () => {
    const requests: Request[] = [];
    let respond: () => void = () => {};
    const responded = new Promise<void>(resolve => (respond = resolve));
    server.use(
      http.get('/api/v1/download/:network/block', async ({ request }) => {
        requests.push(request);
        await responded;
        return new HttpResponse('{"version":"fulu"}', {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="mainnet_slot_100_712f994351.json"',
          },
        });
      })
    );
    const { result } = renderHook(() => useArchiveDownload('mainnet'));

    act(() => result.current.download('block-json', { slot: 100, block_root: root, format: 'json' }));

    await waitFor(() => expect(result.current.pendingKey).toBe('block-json'));
    await waitFor(() => expect(requests).toHaveLength(1));
    const url = new URL(requests[0]?.url ?? '');
    expect(url.pathname).toBe('/api/v1/download/mainnet/block');
    expect(Object.fromEntries(url.searchParams)).toEqual({ slot: '100', block_root: root, format: 'json' });

    respond();

    await waitFor(() => expect(result.current.pendingKey).toBeNull());
    expect(result.current.error).toBeNull();
    expect(saved).toEqual([
      { filename: 'mainnet_slot_100_712f994351.json', blob: expect.objectContaining({ size: 18 }) },
    ]);
  });

  it("shows the archive's error, or a generic one when it gives none, and saves nothing", async () => {
    const requests: Request[] = [];
    const responses = [
      () => HttpResponse.json({ error: 'blob not found in archive' }, { status: 404 }),
      () => new HttpResponse('<html>502 Bad Gateway</html>', { status: 502 }),
    ];
    server.use(
      http.get('/api/v1/download/:network/blob', ({ request }) => {
        requests.push(request);
        return responses[requests.length - 1]?.() ?? HttpResponse.error();
      })
    );
    const { result } = renderHook(() => useArchiveDownload('hoodi'));

    act(() => result.current.download('blob-0', { versioned_hash: hash }));

    await waitFor(() => expect(result.current.error).toBe('blob not found in archive'));
    const url = new URL(requests[0]?.url ?? '');
    expect(url.pathname).toBe('/api/v1/download/hoodi/blob');
    expect(url.searchParams.get('versioned_hash')).toBe(hash);

    act(() => result.current.download('blob-0', { versioned_hash: hash }));

    await waitFor(() => expect(result.current.error).toBe('Download failed'));
    expect(result.current.pendingKey).toBeNull();
    expect(saved).toEqual([]);
  });
});
