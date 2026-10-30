import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { DATA_COLUMN_COUNT } from '../../constants';
import type { NodeDataColumns } from '../../hooks/useNodeDataColumns';
import { formatMs, getArrivalTier } from '../../utils/node-stats';
import { ARRIVAL_TIER_CLASSES } from '../../constants';
import { ArrivalLegend } from '../ArrivalLegend';

export interface CustodyGridProps {
  columns: NodeDataColumns;
}

/**
 * Every data column index, filled where the node saw that column and coloured by its median arrival.
 */
export function CustodyGrid({ columns }: CustodyGridProps): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredColumn = hovered === null ? undefined : columns.columns.get(hovered);
  const custody = columns.columns.size;

  return (
    <Card
      title="Data column custody"
      subtitle={`${custody} of ${DATA_COLUMN_COUNT} columns, last 64 slots`}
      actions={
        <span className="text-xs/5 text-muted tabular-nums">
          {hovered === null ? null : hoveredColumn ? (
            <>
              Column <span className="text-foreground">{hovered}</span> · p50{' '}
              <span className="text-foreground">{formatMs(hoveredColumn.p50)}</span> · {hoveredColumn.slots} slots
            </>
          ) : (
            <>
              Column <span className="text-foreground">{hovered}</span> · not custodied
            </>
          )}
        </span>
      }
    >
      <div className="grid grid-cols-16 gap-1" onMouseLeave={() => setHovered(null)}>
        {Array.from({ length: DATA_COLUMN_COUNT }, (_, index) => {
          const column = columns.columns.get(index);
          return (
            <span
              key={index}
              onMouseEnter={() => setHovered(index)}
              className={clsx(
                'aspect-square rounded-xs transition-opacity',
                column ? ARRIVAL_TIER_CLASSES[getArrivalTier(column.p50)] : 'bg-border/60',
                hovered !== null && hovered !== index && 'opacity-60'
              )}
            />
          );
        })}
      </div>
      <ArrivalLegend className="mt-3" />
    </Card>
  );
}
