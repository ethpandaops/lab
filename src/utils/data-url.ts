/**
 * Decodes a base64 data URL, such as a PNG from `canvas.toDataURL()`, into a Blob of its media type.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header = '', base64 = ''] = dataUrl.split(',', 2);
  const type = /^data:([^;,]+)/.exec(header)?.[1] ?? '';
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));

  return new Blob([bytes], { type });
}
