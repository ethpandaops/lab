import { type JSX } from 'react';

/** Shared colgroup for consistent column widths between header and body tables */
export function TableColGroup(): JSX.Element {
  return (
    <colgroup>
      {/* # */}
      <col className="w-9" />
      {/* Contract */}
      <col />
      {/* Owner */}
      <col className="w-28" />
      {/* Size */}
      <col className="w-22" />
      {/* Slots */}
      <col className="w-20" />
      {/* 1y Expiry */}
      <col className="w-20" />
      {/* 2y Expiry */}
      <col className="w-20" />
    </colgroup>
  );
}
