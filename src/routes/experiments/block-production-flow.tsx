import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /experiments/block-production-flow → /ethereum/live
 */
export const Route = createFileRoute('/experiments/block-production-flow')(createRedirect('/ethereum/live'));
