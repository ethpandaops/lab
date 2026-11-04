import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * /ethereum/consensus/ is a section with no page of its own; it opens /ethereum/consensus/overview.
 */
export const Route = createFileRoute('/ethereum/consensus/')(createRedirect('/ethereum/consensus/overview'));
