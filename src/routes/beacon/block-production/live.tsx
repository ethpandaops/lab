import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /beacon/block-production/live → /experiments/block-production-flow
 */
export const Route = createFileRoute('/beacon/block-production/live')(
  createRedirect('/experiments/block-production-flow')
);
