import type { JSX, ReactNode } from 'react';
import { Block } from './Block';

interface TableProps {
  /** Shown above the table. */
  caption?: string;
  /** Column headings. */
  head: readonly string[];
  /** One row per entry; the first cell heads the row. */
  rows: readonly { key: string; cells: readonly ReactNode[] }[];
}

/** The table every Foundations block draws. */
export function Table({ caption, head, rows }: TableProps): JSX.Element {
  return (
    <Block className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        {caption === undefined ? null : <caption className="pb-2 text-left text-muted">{caption}</caption>}
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {head.map(cell => (
              <th key={cell} scope="col" className="py-2 pr-4">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, cells: [first, ...rest] }) => (
            <tr key={key} className="border-b border-border align-middle">
              <th scope="row" className="py-2 pr-4 text-left font-mono">
                {first}
              </th>
              {/* One cell per remaining column, keyed by the column's heading */}
              {head.slice(1).map((column, index) => (
                <td key={column} className="py-2 pr-4 wrap-break-word text-muted">
                  {rest[index]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  );
}
