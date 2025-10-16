import { type JSX } from 'react';
import { createRootRoute, Outlet, Link } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { NetworkSelector } from '@/components/NetworkSelector';
import { ConfigGate } from '@/components/ConfigGate';
import Logo from '/logo.png';

const queryClient = new QueryClient();

function RootComponent(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigGate>
        <NetworkProvider>
          <div className="relative min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Ambient background decoration */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -left-48 -top-48 size-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl" />
              <div className="absolute -right-48 top-48 size-96 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-3xl" />
              <div className="absolute -bottom-48 left-1/2 size-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-3xl" />
            </div>

            <header className="relative z-30 border-b border-slate-700/50 bg-slate-900/60 shadow-xl backdrop-blur-xl">
              <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="relative group shrink-0">
                    {/* Glass morphism container with Apple-style frosted glass effect */}
                    <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-xl" />

                    {/* Subtle gradient overlay for depth */}
                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/10 via-transparent to-white/5" />

                    {/* Very subtle inner shadow for glass edge effect */}
                    <div
                      className="absolute inset-0 rounded-2xl shadow-inner"
                      style={{
                        boxShadow: 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.1)',
                      }}
                    />

                    {/* Animated border glimmer container */}
                    <div className="absolute -inset-0.5 rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity">
                      {/* Rotating conic gradient */}
                      <div className="glimmer-border absolute inset-0 rounded-2xl" style={{ padding: '2px' }}>
                        <div className="size-full rounded-2xl bg-slate-900/95" />
                      </div>

                      {/* Additional glow layer */}
                      <div
                        className="absolute inset-0 rounded-2xl bg-linear-to-r from-cyan-500/0 via-purple-500/30 to-pink-500/0 blur-md"
                        style={{
                          background:
                            'linear-gradient(105deg, transparent 40%, rgba(34, 211, 238, 0.3) 50%, transparent 60%)',
                          backgroundSize: '200% 200%',
                          animation: 'border-glimmer 3s linear infinite',
                        }}
                      />
                    </div>

                    {/* Logo image */}
                    <img
                      src={Logo}
                      className="relative size-12 rounded-2xl object-contain transition-all duration-500 group-hover:scale-105 sm:size-14 md:size-20"
                      alt="Logo"
                    />

                    {/* Extra shimmer highlight */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
                        backgroundSize: '200% 200%',
                        animation: 'border-glimmer 2s linear infinite',
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                    <div className="min-w-0 shrink">
                      <Link to="/" className="group inline-flex items-baseline gap-3 transition-all">
                        <h1 className="bg-linear-to-r from-orange-400 via-amber-400 to-orange-400 bg-clip-text text-2xl font-black tracking-tight text-transparent transition-all group-hover:from-orange-300 group-hover:via-amber-300 group-hover:to-orange-300 sm:text-3xl">
                          <span className="md:hidden">Lab</span>
                          <span className="hidden md:inline">Lab Dashboard</span>
                        </h1>
                      </Link>
                      <p className="mt-1.5 hidden text-sm/6 font-medium text-slate-400 lg:block">Lab</p>
                    </div>
                    <div className="w-48">
                      <NetworkSelector showLabel={false} />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="relative mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-8">
              <Outlet />
            </main>
          </div>
        </NetworkProvider>
      </ConfigGate>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
