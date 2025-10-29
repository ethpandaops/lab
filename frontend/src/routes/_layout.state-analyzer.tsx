import { createFileRoute } from '@tanstack/react-router';
import { StateAnalyzer } from '@/pages/state-analyzer';

export const Route = createFileRoute('/_layout/state-analyzer')({
  component: StateAnalyzer,
});
