import type { JSX } from 'react';
import Logo from '/logo.png';

// LoadingScreen: Shows while config is loading
// Matches the initial HTML loading screen for seamless transition
export function LoadingScreen(): JSX.Element {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
      <img src={Logo} alt="Loading..." className="size-30 animate-spin" />
      <div className="text-xl font-semibold text-white opacity-90">Loading Lab...</div>
    </div>
  );
}
