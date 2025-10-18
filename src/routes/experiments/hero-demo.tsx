import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FullWidth } from '@/pages/experiments/FullWidth';

export const Route = createFileRoute('/experiments/hero-demo')({
  component: HeroDemoPage,
});

function HeroDemoPage(): JSX.Element {
  // No layout - full page takeover
  return <FullWidth />;
}
