import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { DATA_COLUMN_COUNT } from '@/pages/xatu/nodes/constants';
import type { NodeDataColumns } from '@/pages/xatu/nodes/hooks/useNodeDataColumns';
import { formatMs } from '@/pages/xatu/nodes/utils/node-stats';

export interface CustodyGridProps {
  columns: NodeDataColumns;
}

/**
 * Every data column index, filled where the node saw that column; hovering one shows its median arrival.
 */
export function CustodyGrid({ columns }: CustodyGridProps): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredColumn = hovered === null ? undefined : columns.columns.get(hovered);
  const custody = columns.columns.size;

  return (
    <Card
      title="Data column custody"
      subtitle={`${custody} of ${DATA_COLUMN_COUNT} columns`}
      actions={
        <span className="flex flex-wrap justify-end gap-x-3 text-xs/5 text-muted tabular-nums">
          {hovered !== null && (
            <span>
              Column <span className="text-foreground">{hovered}</span>
            </span>
          )}
          {hovered === null ? null : hoveredColumn ? (
            <>
              <span>
                p50 <span className="text-foreground">{formatMs(hoveredColumn.p50)}</span>
              </span>
              <span>
                <span className="text-foreground">{hoveredColumn.slots}</span> slots
              </span>
            </>
          ) : (
            <span>not custodied</span>
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
                column ? 'bg-primary-70' : 'bg-border-60',
                hovered !== null && hovered !== index && 'opacity-60'
              )}
            />
          );
        })}
      </div>
    </Card>
  );
}
