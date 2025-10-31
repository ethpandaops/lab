import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu-data → /xatu/contributors
 */
export const Route = createFileRoute('/xatu-data/')(createRedirect('/xatu/contributors'));
