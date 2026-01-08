import { type JSX } from 'react';

/** Shared colgroup for consistent column widths between header and body tables */
export function TableColGroup(): JSX.Element {
  return (
    <colgroup>
      <col className="w-10" />
      <col />
      <col className="w-36" />
      <col className="w-20" />
      <col className="w-[4.5rem]" />
      <col className="w-[4.5rem]" />
    </colgroup>
  );
}
