import { type JSX } from 'react';
import clsx from 'clsx';
import type { ClientMatrixProps } from './ClientMatrix.types';

/**
 * Displays a matrix grid showing which execution/consensus client combinations
 * have built blocks for a given slot
 */
export function ClientMatrix({ blocks, executionClients, consensusClients }: ClientMatrixProps): JSX.Element {
  // Create a map of exec+consensus -> block count
  const matrixMap = new Map<string, number>();

  for (const block of blocks) {
    const exec = block.meta_client_implementation || 'unknown';
    const consensus = block.meta_consensus_implementation || 'unknown';
    const key = `${exec}:${consensus}`;
    matrixMap.set(key, (matrixMap.get(key) || 0) + 1);
  }

  // Find the max count for color scaling
  const maxCount = Math.max(...Array.from(matrixMap.values()), 1);

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-surface';
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'bg-primary/90 text-white';
    if (ratio >= 0.6) return 'bg-primary/70 text-white';
    if (ratio >= 0.4) return 'bg-primary/50 text-foreground';
    if (ratio >= 0.2) return 'bg-primary/30 text-foreground';
    return 'bg-primary/10 text-foreground';
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Header row with execution client labels */}
      <div className="flex gap-1">
        {/* Empty corner cell */}
        <div className="h-8 w-20" />
        {/* Execution client labels */}
        {executionClients.map(exec => (
          <div key={exec} className="flex h-8 w-12 items-center justify-center">
            <span className="truncate text-xs font-medium text-muted" title={exec}>
              {exec.slice(0, 4)}
            </span>
          </div>
        ))}
      </div>

      {/* Consensus clients as rows with labels */}
      {consensusClients.map(consensus => (
        <div key={consensus} className="flex gap-1">
          {/* Consensus client label */}
          <div className="flex h-12 w-20 items-center justify-end pr-2">
            <span className="truncate text-xs font-medium text-muted" title={consensus}>
              {consensus}
            </span>
          </div>

          {/* Matrix cells */}
          {executionClients.map(exec => {
            const key = `${exec}:${consensus}`;
            const count = matrixMap.get(key) || 0;
            const intensity = getIntensity(count);

            return (
              <div
                key={key}
                className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-sm border border-border text-xs font-medium',
                  intensity
                )}
                title={`${exec} + ${consensus}: ${count} block${count !== 1 ? 's' : ''}`}
              >
                {count > 0 && count}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
