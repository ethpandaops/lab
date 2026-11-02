/**
 * Page token for a page of a cbt-api list endpoint. The API pages by offset and encodes the offset in the
 * token, so any page can be requested directly instead of walking next_page_token from the first page.
 * The first page needs no token.
 */
export function offsetPageToken(pageIndex: number, pageSize: number): string | undefined {
  if (pageIndex <= 0) return undefined;
  return btoa(`offset:${pageIndex * pageSize}`);
}
