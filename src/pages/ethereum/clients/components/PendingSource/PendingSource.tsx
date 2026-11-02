import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';

export interface PendingSourceProps {
  title: string;
  /** What the card will show once its data lands */
  description: string;
}

/**
 * Slot for a view whose data is still being built, so the page layout is ready when it lands.
 */
export function PendingSource({ title, description }: PendingSourceProps): JSX.Element {
  return (
    <Card rounded variant="muted">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm/6 font-semibold text-foreground">{title}</h3>
          <Badge color="gray" size="small" variant="flat">
            Coming soon
          </Badge>
        </div>
        <p className="text-sm/6 text-muted">{description}</p>
      </div>
    </Card>
  );
}
