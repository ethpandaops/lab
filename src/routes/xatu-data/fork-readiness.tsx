import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu-data/fork-readiness → /xatu/fork-readiness
 */
export const Route = createFileRoute('/xatu-data/fork-readiness')(createRedirect('/xatu/fork-readiness'));
