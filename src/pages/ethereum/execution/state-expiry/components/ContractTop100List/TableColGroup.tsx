import { type JSX } from 'react';

/** Shared colgroup for consistent column widths between header and body tables */
export function TableColGroup(): JSX.Element {
  return (
    <colgroup>
      <col className="w-10" />
      <col />
      <col className="w-36" />
      <col className="w-20" />
      <col className="w-16" />
      <col className="w-18" />
      <col className="w-18" />
    </colgroup>
  );
}
