import { type JSX } from 'react';
import { HeroSection } from './components/HeroSection';

export function IndexPage(): JSX.Element {
  return (
    <div className="min-h-dvh bg-background lg:h-dvh lg:overflow-hidden">
      <HeroSection />
    </div>
  );
}
