import { type JSX } from 'react';
import { HeroSection } from './components/HeroSection';

export function IndexPage(): JSX.Element {
  return (
    <div className="h-dvh overflow-hidden bg-background">
      <HeroSection />
    </div>
  );
}
