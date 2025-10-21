import type { JSX } from 'react';
import clsx from 'clsx';
import { BlobDataAvailability } from '../BlobDataAvailability';
import type { DataAvailabilityProps } from './DataAvailability.types';

/**
 * DataAvailability - A page-specific component for showing blob data availability.
 *
 * Conditionally renders the BlobDataAvailability component
 * only for Deneb and Electra forks where blob data is available.
 */
export function DataAvailability({ fork, className }: DataAvailabilityProps): JSX.Element | null {
  // Only render for Deneb and Electra forks
  const shouldRender = fork === 'Deneb' || fork === 'Electra';

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      <h2 className="text-xl font-semibold text-foreground">Data Availability</h2>
      <BlobDataAvailability />
    </div>
  );
}
