import { createFileRoute } from '@tanstack/react-router';
import { HeroDemoPage } from '@/pages/experiments';

export const Route = createFileRoute('/experiments/hero-demo')({
  component: HeroDemoPage,
});
