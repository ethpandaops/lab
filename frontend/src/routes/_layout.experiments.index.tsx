import { createFileRoute } from '@tanstack/react-router';
import Experiments from '@/pages/Experiments';

export const Route = createFileRoute('/_layout/experiments/')({
  component: Experiments,
});
