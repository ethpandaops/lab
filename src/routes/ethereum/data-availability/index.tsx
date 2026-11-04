import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * /ethereum/data-availability/ is a section with no page of its own; it opens /ethereum/data-availability/custody.
 */
export const Route = createFileRoute('/ethereum/data-availability/')(
  createRedirect('/ethereum/data-availability/custody')
);
