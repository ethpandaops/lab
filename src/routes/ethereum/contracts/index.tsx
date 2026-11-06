import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * The contracts list lives at the bottom of State Expiry; each contract keeps its own page.
 */
export const Route = createFileRoute('/ethereum/contracts/')(createRedirect('/ethereum/execution/state-expiry'));
