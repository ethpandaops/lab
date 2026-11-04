import { createFileRoute } from '@tanstack/react-router';
import { createRedirect } from '@/utils/redirect';

/**
 * Legacy redirect: /experiments → /. Every former experiment has its own place in the sidebar.
 */
export const Route = createFileRoute('/experiments/')(createRedirect('/'));
