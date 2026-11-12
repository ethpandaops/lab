import type { JSX } from 'react';
import { wcagContrast } from 'culori';
import { colorValue } from '@/styles/tokenSource';
import { THEMES, type ContrastRule } from '@/styles/tokens';
import { Table } from './Table';

interface ContrastTableProps {
  /** The rule to show: its foregrounds are rows, its backgrounds columns per theme. */
  rule: ContrastRule;
}

/**
 * A contrast rule's pairs in every theme, as tokens.test.ts checks them. Each
 * cell shows the pair as a swatch (a bar of the foreground on the background)
 * and states the ratio in readable text.
 */
export function ContrastTable({ rule }: ContrastTableProps): JSX.Element {
  const { name, foregrounds, backgrounds, minimum } = rule;
  const columns = THEMES.flatMap(theme => backgrounds.map(background => ({ theme, background })));
  return (
    <Table
      caption={`${name}: at least ${minimum}:1`}
      head={['token', ...columns.map(({ theme, background }) => `${theme} · on ${background}`)]}
      rows={foregrounds.map(foreground => ({
        key: foreground,
        cells: [
          foreground,
          ...columns.map(({ theme, background }) => {
            const ratio = wcagContrast(colorValue(theme, foreground), colorValue(theme, background));
            return (
              <span key={`${theme}-${background}`} className="flex items-center gap-2 font-mono text-xs">
                <span
                  aria-hidden="true"
                  className="grid h-5 w-8 shrink-0 place-items-center rounded-sm border border-border"
                  style={{ backgroundColor: colorValue(theme, background) }}
                >
                  <span className="h-1 w-5 rounded-full" style={{ backgroundColor: colorValue(theme, foreground) }} />
                </span>
                {ratio.toFixed(2)} {ratio >= minimum ? 'pass' : 'FAIL'}
              </span>
            );
          }),
        ],
      }))}
    />
  );
}
