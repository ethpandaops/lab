import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /beacon/slot/live → /ethereum/live
 */
export const Route = createFileRoute('/beacon/slot/live')(createRedirect('/ethereum/live'));
