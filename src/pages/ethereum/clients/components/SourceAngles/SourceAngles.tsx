import type { JSX, ReactNode } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';

/** One way of counting a client: by stake, by P2P peers, by ENR records or by Xatu nodes */
export interface SourceAngle {
  id: string;
  label: string;
  /** Headline value; omit while the source is not available yet */
  value?: ReactNode;
  /** What the value counts */
  detail?: ReactNode;
}

export interface SourceAnglesProps {
  angles: SourceAngle[];
}

/**
 * The same client counted from each data source, side by side, each labelled with what it weights by.
 */
export function SourceAngles({ angles }: SourceAnglesProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {angles.map(angle => (
        <Card key={angle.id} rounded variant={angle.value === undefined ? 'muted' : 'default'}>
          <div className="flex h-full flex-col gap-1">
            <span className="text-xs/5 font-medium tracking-wide text-muted uppercase">{angle.label}</span>
            {angle.value === undefined ? (
              <Badge color="gray" size="small" variant="flat" className="w-fit">
                Coming soon
              </Badge>
            ) : (
              <span className="text-2xl/8 font-semibold text-foreground tabular-nums">{angle.value}</span>
            )}
            {angle.detail && <span className="text-sm/6 text-muted">{angle.detail}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}
