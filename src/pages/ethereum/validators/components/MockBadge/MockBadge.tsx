import type { JSX } from 'react';
import { Badge } from '@/components/Elements/Badge';

/**
 * PROTOTYPE ONLY — flags cards whose data is synthesised until the xatu-cbt tables exist.
 */
export function MockBadge(): JSX.Element {
  return (
    <Badge color="yellow" size="small">
      Mock data
    </Badge>
  );
}
