import type { JSX } from 'react';
import { tokenSource } from '@/styles/tokenSource';
import { Table } from './Table';

interface TokenSwatchesProps {
  /** Colour token names, shown in this order. */
  tokens: readonly string[];
  /** Shown above the table. */
  caption?: string;
  /** The class that paints each token, such as `bg-` or `text-`. */
  prefix?: string;
}

/**
 * One row per colour: a swatch of the token live in the toolbar's theme, the
 * class it gives, and its definition as tokens.css writes it. For colours
 * defined from others, whose value is not one literal per theme.
 */
export function TokenSwatches({ tokens, caption, prefix = 'bg-' }: TokenSwatchesProps): JSX.Element {
  const { theme } = tokenSource;
  return (
    <Table
      caption={caption}
      head={['token', 'live', 'definition']}
      rows={tokens.map(token => ({
        key: token,
        cells: [
          `${prefix}${token}`,
          <span
            key="swatch"
            aria-hidden="true"
            className="block size-6 rounded-sm border border-border"
            style={{ backgroundColor: `var(--color-${token})` }}
          />,
          <span key="definition" className="font-mono text-xs">
            {theme.get(`color-${token}`)}
          </span>,
        ],
      }))}
    />
  );
}
