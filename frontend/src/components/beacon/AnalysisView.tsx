import { ReactNode } from 'react';

interface AnalysisViewProps {
  loading?: boolean;
  isMissing?: boolean;
}

export function AnalysisView({ loading, isMissing }: AnalysisViewProps): JSX.Element {
  return (
    <div className="lg:col-span-9 backdrop-blur-md   -default p-6 bg-surface/80">
      <h3 className="text-lg font-sans font-bold text-primary mb-4">Analysis</h3>
      <p className="text-sm font-mono text-tertiary">Coming soon...</p>
    </div>
  );
}
