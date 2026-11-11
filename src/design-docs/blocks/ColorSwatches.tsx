import type { JSX } from 'react';
import { colorValue } from '@/styles/tokenSource';
import { THEMES } from '@/styles/tokens';
import { Table } from './Table';

interface ColorSwatchesProps {
  /** Token names, shown in this order. */
  tokens: readonly string[];
  /** What each token is for. */
  notes: Readonly<Record<string, string>>;
}

/** One row per token: its name, its value in each theme as tokens.css gives it, and its use. */
export function ColorSwatches({ tokens, notes }: ColorSwatchesProps): JSX.Element {
  return (
    <Table
      head={['token', ...THEMES, 'use']}
      rows={tokens.map(token => ({
        key: token,
        cells: [
          token,
          ...THEMES.map(theme => {
            const value = colorValue(theme, token);
            return (
              <span key={theme} className="flex items-center gap-2 font-mono text-xs">
                <span
                  aria-hidden="true"
                  className="size-6 shrink-0 rounded-sm border border-border"
                  style={{ backgroundColor: value }}
                />
                {value}
              </span>
            );
          }),
          notes[token] ?? '',
        ],
      }))}
    />
  );
}
