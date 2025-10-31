import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /experiments/live-slots → /ethereum/live
 */
export const Route = createFileRoute('/experiments/live-slots')(createRedirect('/ethereum/live'));
