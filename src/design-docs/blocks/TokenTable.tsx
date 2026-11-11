import type { JSX } from 'react';
import { namespaceNames, tokenSource } from '@/styles/tokenSource';
import { Table } from './Table';

interface TokenTableProps {
  /** Tailwind theme namespace, such as `radius` or `container`; a bare token such as `--spacing` is its own row. */
  namespace: string;
  /** The class a token gives. */
  usage: (name: string) => string;
  /** What each token is for. */
  notes: Readonly<Record<string, string>>;
}

/** Every token in a namespace, as tokens.css defines it; a type size shows its line height too. */
export function TokenTable({ namespace, usage, notes }: TokenTableProps): JSX.Element {
  const { theme } = tokenSource;
  const names = theme.has(namespace) ? ['', ...namespaceNames(namespace)] : namespaceNames(namespace);
  return (
    <Table
      head={['token', 'value', 'use as', 'for']}
      rows={names.map(name => {
        const property = name === '' ? namespace : `${namespace}-${name}`;
        const lineHeight = theme.get(`${property}--line-height`);
        return {
          key: property,
          cells: [
            `--${property}`,
            <span key="value" className="font-mono text-xs">
              {theme.get(property)}
              {lineHeight === undefined ? '' : ` / ${lineHeight}`}
            </span>,
            <span key="usage" className="font-mono text-xs text-foreground">
              {usage(name)}
            </span>,
            notes[name] ?? '',
          ],
        };
      })}
    />
  );
}
