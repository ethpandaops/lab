import { useMutation } from '@tanstack/react-query';
import { downloadBlob, downloadBlock, type DownloadBlobData, type DownloadBlockData } from '@/lab-api';
import { apiErrorMessage } from '@/utils/api-error';

/** What to download: a block in one format, or a blob by its versioned hash. */
type ArchiveFile = DownloadBlockData['query'] | DownloadBlobData['query'];

/**
 * Result of {@link useArchiveDownload}.
 */
export interface ArchiveDownload {
  /** The key currently downloading, or null when idle. */
  pendingKey: string | null;
  /** The last download error message, or null. */
  error: string | null;
  /** Downloads `file` and saves it. `key` identifies the trigger for pending state. */
  download: (key: string, file: ArchiveFile) => void;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = /filename="?([^";]+)"?/.exec(header);

  return match ? match[1] : null;
}

/**
 * Hook for downloading a network's blocks and blobs from the lab download proxy. Because the proxy is same-origin and
 * serves attachments, the response is fetched and saved as a blob — this lets us surface archive 404s (e.g. a
 * not-yet-archived recent slot) as an inline error instead of opening an error page in a new tab.
 */
export function useArchiveDownload(network: string): ArchiveDownload {
  const { mutate, variables, isPending, error } = useMutation({
    mutationFn: async ({ file }: { key: string; file: ArchiveFile }): Promise<void> => {
      const options = { path: { network }, parseAs: 'blob', throwOnError: true } as const;
      const { data, response } =
        'versioned_hash' in file
          ? await downloadBlob({ ...options, query: file })
          : await downloadBlock({ ...options, query: file });

      const objectUrl = URL.createObjectURL(data);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filenameFromDisposition(response.headers.get('Content-Disposition')) ?? 'download';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    },
  });

  return {
    pendingKey: isPending ? variables.key : null,
    error: error ? (apiErrorMessage(error) ?? 'Download failed') : null,
    download: (key, file) => mutate({ key, file }),
  };
}
