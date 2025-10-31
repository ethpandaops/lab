import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu-data/geographical-checklist → /xatu/geographical-checklist
 */
export const Route = createFileRoute('/xatu-data/geographical-checklist')(
  createRedirect('/xatu/geographical-checklist')
);
