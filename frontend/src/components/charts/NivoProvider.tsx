import { ReactNode } from 'react';
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts';

interface NivoProviderProps {
  children: ReactNode;
  theme?: typeof defaultNivoTheme;
}

/**
 * NivoProvider provides a context for Nivo charts with consistent theming.
 * This component doesn't actually create a React context, but it's a pattern
 * that can be used to pass theme props to Nivo charts consistently.
 */
export const NivoProvider = ({ children }: NivoProviderProps) => {
  return <>{children}</>;
};

/**
 * withNivoTheme is a higher-order component that applies the Nivo theme to a chart component.
 * @param Component The Nivo chart component to wrap
 * @param customTheme Optional custom theme to override the default
 * @returns A component with the theme applied
 */
export function withNivoTheme<P extends object>(
  Component: React.ComponentType<P & { theme?: typeof defaultNivoTheme }>,
  customTheme?: typeof defaultNivoTheme
) {
  const ThemedComponent = (props: P) => {
    const theme = customTheme || defaultNivoTheme;
    return <Component {...props} theme={theme} />;
  };

  ThemedComponent.displayName = `withNivoTheme(${Component.displayName || Component.name || 'Component'})`;

  return ThemedComponent;
}
