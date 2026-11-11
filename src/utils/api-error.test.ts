import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it("returns lab-backend's message from an { error } body", () => {
    expect(apiErrorMessage({ error: 'blob not found in archive' })).toBe('blob not found in archive');
  });

  it('has no message for text bodies, network errors or nothing', () => {
    expect(apiErrorMessage('<html><body>502 Bad Gateway</body></html>')).toBeUndefined();
    expect(apiErrorMessage(new TypeError('Failed to fetch'))).toBeUndefined();
    expect(apiErrorMessage({})).toBeUndefined();
    expect(apiErrorMessage(null)).toBeUndefined();
  });
});
