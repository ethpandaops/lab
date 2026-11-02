import { describe, expect, it } from 'vitest';
import { offsetPageToken } from './page-token';

describe('offsetPageToken', () => {
  it('omits the token for the first page', () => {
    expect(offsetPageToken(0, 25)).toBeUndefined();
  });

  it('encodes the offset of the page the way the API returns next_page_token', () => {
    // The API answers page_size=9 with next_page_token "b2Zmc2V0Ojk=", which is offset:9.
    expect(offsetPageToken(1, 9)).toBe('b2Zmc2V0Ojk=');
    expect(atob(offsetPageToken(3, 50)!)).toBe('offset:150');
  });
});
