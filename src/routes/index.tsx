import { createFileRoute } from '@tanstack/react-router';
import { HeroPage } from '@/pages/index';

export const Route = createFileRoute('/')({
  component: HeroPage,
});
