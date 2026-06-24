import { useCallback, useState } from 'react';

/**
 * Result of {@link useArchiveDownload}.
 */
export interface ArchiveDownload {
  /** The key currently downloading, or null when idle. */
  pendingKey: string | null;
  /** The last download error message, or null. */
  error: string | null;
  /** Fetches `url` and saves the response as a file. `key` identifies the trigger for pending state. */
  download: (key: string, url: string) => Promise<void>;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = /filename="?([^";]+)"?/.exec(header);

  return match ? match[1] : null;
}

/**
 * Hook for downloading a file from the lab download proxy. Because the proxy is
 * same-origin and serves attachments, the response is fetched and saved as a
 * blob — this lets us surface archive 404s (e.g. a not-yet-archived recent slot)
 * as an inline error instead of opening an error page in a new tab.
 */
export function useArchiveDownload(): ArchiveDownload {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async (key: string, url: string): Promise<void> => {
    setError(null);
    setPendingKey(key);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        let message = `Download failed (${response.status})`;

        try {
          const body = (await response.json()) as { error?: string };

          if (body.error) message = body.error;
        } catch {
          // Non-JSON error body; keep the status-based message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(response.headers.get('Content-Disposition')) ?? 'download';
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setPendingKey(null);
    }
  }, []);

  return { pendingKey, error, download };
}
