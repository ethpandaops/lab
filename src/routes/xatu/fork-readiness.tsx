import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /xatu/fork-readiness → /ethereum/forks. Each fork's page carries its client readiness, Xatu nodes
 * included, until the fork goes live.
 */
export const Route = createFileRoute('/xatu/fork-readiness')(createRedirect('/ethereum/forks'));
