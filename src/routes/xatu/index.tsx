import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * /xatu/ is a section with no page of its own; it opens /xatu/nodes.
 */
export const Route = createFileRoute('/xatu/')(createRedirect('/xatu/nodes'));
