import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /beacon/locally-built-blocks → /xatu/locally-built-blocks
 */
export const Route = createFileRoute('/beacon/locally-built-blocks')(createRedirect('/xatu/locally-built-blocks'));
