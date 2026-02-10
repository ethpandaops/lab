import { type JSX } from 'react';
import { HeroSection } from './components/HeroSection';
import { InstrumentsSection } from './components/InstrumentsSection';
import { ScrollIndicator } from './components/ScrollIndicator';

export function IndexPage(): JSX.Element {
  return (
    <div className="bg-background">
      <HeroSection />
      <ScrollIndicator />
      <InstrumentsSection />
    </div>
  );
}
