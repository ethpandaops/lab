/**
 * Helper to fetch all pages of data from an API endpoint
 *
 * Automatically handles pagination by following next_page_token until all data is retrieved.
 *
 * @template T - The type of data items being fetched
 * @param fetchFn - The API fetch function that returns paginated data
 * @param params - Query parameters for the API request
 * @param dataKey - The key in the response object that contains the array of data
 * @param signal - Optional AbortSignal for canceling the request
 * @returns Promise resolving to array of all data across all pages
 *
 * @example
 * ```ts
 * const allEpochs = await fetchAllPages<FctDataColumnAvailabilityByEpoch>(
 *   fctDataColumnAvailabilityByEpochServiceList,
 *   {
 *     query: {
 *       epoch_start_date_time_gte: startTime,
 *       epoch_start_date_time_lt: endTime,
 *       page_size: 10000,
 *       order_by: 'epoch asc',
 *     },
 *   },
 *   'fct_data_column_availability_by_epoch',
 *   signal
 * );
 * ```
 */
export async function fetchAllPages<T>(
  fetchFn: (params: {
    query?: Record<string, unknown>;
    signal?: AbortSignal;
    throwOnError?: boolean;
  }) => Promise<{ data: unknown }>,
  params: { query?: Record<string, unknown> },
  dataKey: string,
  signal?: AbortSignal
): Promise<T[]> {
  const allData: T[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const MAX_PAGES = 100; // Safety limit

  do {
    pageCount++;

    if (pageCount > MAX_PAGES) {
      console.warn(`fetchAllPages [${dataKey}] exceeded ${MAX_PAGES} pages, breaking`);
      break;
    }

    let response;
    try {
      response = await fetchFn({
        ...params,
        query: {
          ...params.query,
          ...(pageToken && { page_token: pageToken }),
        },
        signal,
        throwOnError: true,
      });
    } catch (err) {
      // AbortError is expected when React Query cancels requests on unmount
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      console.error(`fetchAllPages [${dataKey}] fetch error:`, err);
      throw err;
    }

    const responseData = response.data as Record<string, unknown>;
    const pageData = responseData[dataKey] as T[] | undefined;

    if (pageData) {
      allData.push(...pageData);
    }

    pageToken = responseData.next_page_token as string | undefined;
  } while (pageToken);

  return allData;
}
