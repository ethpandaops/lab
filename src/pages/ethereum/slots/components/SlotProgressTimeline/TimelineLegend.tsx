import type { JSX } from 'react';

/**
 * Legend showing the meaning of colors in the timeline.
 */
export function TimelineLegend(): JSX.Element {
  return (
    <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-xs">
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-pink-500" />
        <span className="text-muted">MEV Builders</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-blue-500" />
        <span className="text-muted">Block Propagation</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-teal-400" />
        <span className="text-muted">Internal</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-violet-400" />
        <span className="text-muted">Individual</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-amber-500" />
        <span className="text-muted">EIP7870 Execution</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-purple-500" />
        <span className="text-muted">Data Availability</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-emerald-500" />
        <span className="text-muted">Attestations</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-xs bg-danger" />
        <span className="text-muted">Late ({'>'} 4s)</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="h-4 w-px bg-success/50" />
        <span className="text-muted">Attestation Deadline (4s)</span>
      </div>
    </div>
  );
}
