import type { JSX } from 'react';
import { namespaceNames } from '@/styles/tokenSource';
import { Table } from './Table';

interface TintScaleProps {
  /** Colour tokens whose tints to show, one row each. */
  bases: readonly string[];
}

/** Each base's tints as chips live in the toolbar's theme, labelled with the percentage in the class name. */
export function TintScale({ bases }: TintScaleProps): JSX.Element {
  const names = namespaceNames('color');
  return (
    <Table
      head={['token', 'tints']}
      rows={bases.map(base => ({
        key: base,
        cells: [
          base,
          <span key="tints" className="flex flex-wrap gap-2">
            {names
              .filter(name => new RegExp(`^${base}-\\d+$`).test(name))
              .map(name => (
                <span key={name} className="flex flex-col items-center gap-1 font-mono text-2xs">
                  <span
                    aria-hidden="true"
                    className="block size-6 rounded-sm border border-border"
                    style={{ backgroundColor: `var(--color-${name})` }}
                  />
                  {name.slice(base.length + 1)}
                </span>
              ))}
          </span>,
        ],
      }))}
    />
  );
}
