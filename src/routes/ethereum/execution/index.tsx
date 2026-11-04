import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * /ethereum/execution/ is a section with no page of its own; it opens /ethereum/execution/overview.
 */
export const Route = createFileRoute('/ethereum/execution/')(createRedirect('/ethereum/execution/overview'));
