import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * /ethereum/ is a section with no page of its own; it opens /.
 */
export const Route = createFileRoute('/ethereum/')(createRedirect('/'));
