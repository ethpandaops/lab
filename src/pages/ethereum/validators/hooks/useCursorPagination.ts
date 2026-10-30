import { useState } from 'react';

interface CursorState {
  resetKey: string;
  pageIndex: number;
  pageSize: number;
  /** tokens[i] is the page_token that loads page i */
  tokens: (string | undefined)[];
}

/**
 * Page state for cursor-paginated API lists. Starts again from the first page whenever `resetKey`
 * (the serialised filters) changes.
 */
export function useCursorPagination(
  resetKey: string,
  initialPageSize = 25
): {
  pageIndex: number;
  pageSize: number;
  pageToken: string | undefined;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
  recordNextToken: (token: string | undefined) => void;
} {
  const [state, setState] = useState<CursorState>({
    resetKey,
    pageIndex: 0,
    pageSize: initialPageSize,
    tokens: [undefined],
  });

  let current = state;
  if (state.resetKey !== resetKey) {
    current = { ...state, resetKey, pageIndex: 0, tokens: [undefined] };
    setState(current);
  }

  return {
    pageIndex: current.pageIndex,
    pageSize: current.pageSize,
    pageToken: current.tokens[current.pageIndex],
    onPaginationChange: (pageIndex, pageSize) =>
      setState(s =>
        pageSize !== s.pageSize
          ? { ...s, pageIndex: 0, pageSize, tokens: [undefined] }
          : { ...s, pageIndex: Math.min(pageIndex, s.tokens.length - 1) }
      ),
    recordNextToken: token =>
      setState(s =>
        s.tokens[s.pageIndex + 1] === token ? s : { ...s, tokens: [...s.tokens.slice(0, s.pageIndex + 1), token] }
      ),
  };
}
