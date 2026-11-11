import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from './data-url';

/** jsdom's Blob has no arrayBuffer(), so read it the way the DOM can. */
function bytesOf(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve([...new Uint8Array(reader.result as ArrayBuffer)]);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('dataUrlToBlob', () => {
  it('decodes the bytes and keeps the media type', async () => {
    // The PNG signature, which includes bytes above 0x7f
    const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');

    expect(blob.type).toBe('image/png');
    expect(await bytesOf(blob)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});
