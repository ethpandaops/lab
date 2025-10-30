import { describe, it, expect, vi } from 'vitest';
import { fetchAllPages } from './api-pagination';

describe('fetchAllPages', () => {
  describe('successful pagination', () => {
    it('should fetch all pages when multiple pages exist', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 1 }, { id: 2 }],
            next_page_token: 'token1',
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 3 }, { id: 4 }],
            next_page_token: 'token2',
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ id: 5 }],
            // No next_page_token means last page
          },
        });

      const result = await fetchAllPages(mockFetchFn, { query: { page_size: 2 } }, 'items');

      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
      expect(mockFetchFn).toHaveBeenCalledTimes(3);
    });

    it('should fetch single page when no pagination token', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          users: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      });

      const result = await fetchAllPages(mockFetchFn, { query: { limit: 10 } }, 'users');

      expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
      expect(mockFetchFn).toHaveBeenCalledWith({
        query: { limit: 10 },
        signal: undefined,
        throwOnError: true,
      });
    });

    it('should pass page_token in subsequent requests', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: [1, 2],
            next_page_token: 'abc123',
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [3, 4],
          },
        });

      await fetchAllPages(mockFetchFn, { query: { filter: 'active' } }, 'data');

      expect(mockFetchFn).toHaveBeenNthCalledWith(1, {
        query: { filter: 'active' },
        signal: undefined,
        throwOnError: true,
      });

      expect(mockFetchFn).toHaveBeenNthCalledWith(2, {
        query: {
          filter: 'active',
          page_token: 'abc123',
        },
        signal: undefined,
        throwOnError: true,
      });
    });
  });

  describe('empty results', () => {
    it('should handle empty first page', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          records: [],
        },
      });

      const result = await fetchAllPages(mockFetchFn, { query: {} }, 'records');

      expect(result).toEqual([]);
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
    });

    it('should handle missing data key in response', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          // data key 'items' is missing
          metadata: { count: 0 },
        },
      });

      const result = await fetchAllPages(mockFetchFn, { query: {} }, 'items');

      expect(result).toEqual([]);
    });

    it('should handle undefined data for key', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          items: undefined,
        },
      });

      const result = await fetchAllPages(mockFetchFn, { query: {} }, 'items');

      expect(result).toEqual([]);
    });
  });

  describe('abort signal support', () => {
    it('should pass abort signal to fetch function', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          data: [1, 2, 3],
        },
      });

      const controller = new AbortController();
      const signal = controller.signal;

      await fetchAllPages(mockFetchFn, { query: { page_size: 100 } }, 'data', signal);

      expect(mockFetchFn).toHaveBeenCalledWith({
        query: { page_size: 100 },
        signal,
        throwOnError: true,
      });
    });

    it('should propagate abort signal through all pages', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: [1],
            next_page_token: 'token1',
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [2],
          },
        });

      const controller = new AbortController();
      const signal = controller.signal;

      await fetchAllPages(mockFetchFn, { query: {} }, 'data', signal);

      expect(mockFetchFn).toHaveBeenNthCalledWith(1, {
        query: {},
        signal,
        throwOnError: true,
      });

      expect(mockFetchFn).toHaveBeenNthCalledWith(2, {
        query: { page_token: 'token1' },
        signal,
        throwOnError: true,
      });
    });
  });

  describe('query parameter handling', () => {
    it('should handle no query parameters', async () => {
      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          results: [],
        },
      });

      await fetchAllPages(mockFetchFn, {}, 'results');

      expect(mockFetchFn).toHaveBeenCalledWith({
        query: {},
        signal: undefined,
        throwOnError: true,
      });
    });

    it('should preserve existing query parameters across pages', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [1],
            next_page_token: 'next',
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [2],
          },
        });

      await fetchAllPages(
        mockFetchFn,
        {
          query: {
            filter: 'active',
            sort: 'desc',
            page_size: 10,
          },
        },
        'items'
      );

      expect(mockFetchFn).toHaveBeenNthCalledWith(2, {
        query: {
          filter: 'active',
          sort: 'desc',
          page_size: 10,
          page_token: 'next',
        },
        signal: undefined,
        throwOnError: true,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from fetch function', async () => {
      const mockError = new Error('API Error');
      const mockFetchFn = vi.fn().mockRejectedValueOnce(mockError);

      await expect(fetchAllPages(mockFetchFn, { query: {} }, 'data')).rejects.toThrow('API Error');
    });

    it('should throw error on second page failure', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            items: [1, 2],
            next_page_token: 'token1',
          },
        })
        .mockRejectedValueOnce(new Error('Network timeout'));

      await expect(fetchAllPages(mockFetchFn, { query: {} }, 'items')).rejects.toThrow('Network timeout');

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('complex pagination scenarios', () => {
    it('should handle many pages (10+ pages)', async () => {
      const mockFetchFn = vi.fn();

      // Mock 10 pages with data
      for (let i = 0; i < 9; i++) {
        mockFetchFn.mockResolvedValueOnce({
          data: {
            records: [{ page: i + 1 }],
            next_page_token: `token${i + 1}`,
          },
        });
      }

      // Last page with no token
      mockFetchFn.mockResolvedValueOnce({
        data: {
          records: [{ page: 10 }],
        },
      });

      const result = await fetchAllPages(mockFetchFn, { query: { page_size: 1 } }, 'records');

      expect(result).toHaveLength(10);
      expect(result[0]).toEqual({ page: 1 });
      expect(result[9]).toEqual({ page: 10 });
      expect(mockFetchFn).toHaveBeenCalledTimes(10);
    });

    it('should handle varying page sizes', async () => {
      const mockFetchFn = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: [1, 2, 3, 4, 5], // 5 items
            next_page_token: 'page2',
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [6, 7, 8], // 3 items
            next_page_token: 'page3',
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: [9], // 1 item
          },
        });

      const result = await fetchAllPages(mockFetchFn, { query: {} }, 'data');

      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });

  describe('type safety', () => {
    it('should maintain type information for returned data', async () => {
      interface User {
        id: number;
        name: string;
      }

      const mockFetchFn = vi.fn().mockResolvedValueOnce({
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
        },
      });

      const result = await fetchAllPages<User>(mockFetchFn, { query: {} }, 'users');

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      // Type assertion to verify type is maintained
      const firstUser: User = result[0];
      expect(firstUser.id).toBe(1);
      expect(firstUser.name).toBe('Alice');
    });
  });
});
