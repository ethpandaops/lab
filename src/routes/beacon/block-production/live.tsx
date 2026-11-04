import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /beacon/block-production/live → /ethereum/live
 */
export const Route = createFileRoute('/beacon/block-production/live')(createRedirect('/ethereum/live'));
