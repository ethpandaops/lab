import { zApiError } from '@/lab-api/zod.gen';

/**
 * What lab-backend said went wrong with a failed request, for people. The generated clients throw the response body,
 * and the download and gas profiler routes answer `{ error }`. Anything else, such as a text or HTML body or a network
 * error, has no message for people and returns undefined.
 */
export function apiErrorMessage(error: unknown): string | undefined {
  const parsed = zApiError.safeParse(error);

  return parsed.success ? parsed.data.error : undefined;
}
