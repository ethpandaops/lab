import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu/contributors → /xatu/nodes, which has a contributor filter
 */
export const Route = createFileRoute('/xatu/contributors/')(createRedirect('/xatu/nodes'));
