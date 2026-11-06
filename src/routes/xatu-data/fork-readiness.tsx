import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu-data/fork-readiness → /ethereum/forks
 */
export const Route = createFileRoute('/xatu-data/fork-readiness')(createRedirect('/ethereum/forks'));
