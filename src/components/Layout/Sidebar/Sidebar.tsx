import type { JSX } from 'react';
import { useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
import { NetworkSelect } from '@/components/Ethereum/NetworkSelect';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { ListContainer, ListItem, ListSection } from '@/components/Layout/ListContainer';
import { Header } from '@/components/Layout/Header';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';
import type { SidebarProps } from './Sidebar.types';

/**
 * Social links component for the sidebar footer
 */
function SocialLinks(): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-border/50 py-4">
      <a
        href="https://github.com/ethpandaops/lab"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted transition-colors hover:text-foreground"
        aria-label="GitHub repository"
      >
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      </a>
      <a
        href="https://twitter.com/ethpandaops"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted transition-colors hover:text-foreground"
        aria-label="Twitter profile"
      >
        <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </div>
  );
}

interface NavItem {
  name: string;
  to: string;
}

const ethereumConsensusPages: NavItem[] = [
  { name: 'Live', to: '/ethereum/live' },
  { name: 'Epochs', to: '/ethereum/epochs' },
  { name: 'Slots', to: '/ethereum/slots' },
  { name: 'Entities', to: '/ethereum/entities' },
  { name: 'Forks', to: '/ethereum/forks' },
];

const ethereumExecutionPages: NavItem[] = [];

const ethereumDataAvailabilityPages: NavItem[] = [{ name: 'Custody', to: '/ethereum/data-availability/custody' }];

const xatuPages: NavItem[] = [
  { name: 'Contributors', to: '/xatu/contributors' },
  { name: 'Geographical Checklist', to: '/xatu/geographical-checklist' },
  { name: 'Locally Built Blocks', to: '/xatu/locally-built-blocks' },
  { name: 'Fork Readiness', to: '/xatu/fork-readiness' },
];

/**
 * Helper function to check if a page is enabled for the current network.
 * Uses the features config to determine visibility.
 */
function isPageEnabled(
  path: string,
  features: Array<{ path: string; disabled_networks?: string[] }> | undefined,
  networkName: string | undefined
): boolean {
  // If no config or network, default to enabled
  if (!features || !networkName) {
    return true;
  }

  // Find the feature for this path
  const feature = features.find(f => f.path === path);

  // If not in features config, default to enabled
  if (!feature) {
    return true;
  }

  // Check if current network is in the disabled list
  if (feature.disabled_networks?.includes(networkName)) {
    return false;
  }

  return true;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps): JSX.Element {
  const { data: config } = useConfig();
  const { currentNetwork } = useNetwork();

  // Filter pages based on features config
  const filteredEthereumConsensusPages = useMemo(
    () => ethereumConsensusPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredEthereumExecutionPages = useMemo(
    () => ethereumExecutionPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredEthereumDataAvailabilityPages = useMemo(
    () => ethereumDataAvailabilityPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredXatuPages = useMemo(
    () => xatuPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );
  return (
    <>
      {/* Mobile sidebar */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-30 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex pt-16">
          <DialogPanel
            transition
            className="relative flex w-full flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            {/* Mobile sidebar content */}
            <div className="relative flex grow flex-col bg-surface/95 backdrop-blur-xl">
              <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pt-4">
                <nav className="flex flex-1 flex-col">
                  <ListContainer variant="simple" withDividers={false} compact className="flex flex-1 flex-col gap-y-7">
                    {/* Network Selector */}
                    <ListItem>
                      <Header size="xs" title="Network" />
                      <div className="mt-2">
                        <NetworkSelect showLabel={false} />
                      </div>
                    </ListItem>

                    {/* Ethereum Section */}
                    <ListSection title="Ethereum">
                      {filteredEthereumConsensusPages.length > 0 && (
                        <ListSection title="Consensus" nested>
                          {filteredEthereumConsensusPages.map(page => (
                            <ListItem key={page.to}>
                              <Link
                                to={page.to}
                                preload="viewport"
                                preloadDelay={100}
                                className="group flex gap-x-3 rounded-lg px-2.5 py-2 text-base font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary lg:py-1.5 lg:text-sm/6"
                                activeProps={{
                                  className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                                }}
                              >
                                {page.name}
                              </Link>
                            </ListItem>
                          ))}
                        </ListSection>
                      )}

                      {filteredEthereumExecutionPages.length > 0 && (
                        <ListSection title="Execution" nested>
                          {filteredEthereumExecutionPages.map(page => (
                            <ListItem key={page.to}>
                              <Link
                                to={page.to}
                                preload="viewport"
                                preloadDelay={100}
                                className="group flex gap-x-3 rounded-lg px-2.5 py-2 text-base font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary lg:py-1.5 lg:text-sm/6"
                                activeProps={{
                                  className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                                }}
                              >
                                {page.name}
                              </Link>
                            </ListItem>
                          ))}
                        </ListSection>
                      )}

                      {filteredEthereumDataAvailabilityPages.length > 0 && (
                        <ListSection title="Data Availability" nested className="mt-4">
                          {filteredEthereumDataAvailabilityPages.map(page => (
                            <ListItem key={page.to}>
                              <Link
                                to={page.to}
                                preload="viewport"
                                preloadDelay={100}
                                className="group flex gap-x-3 rounded-lg px-2.5 py-2 text-base font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary lg:py-1.5 lg:text-sm/6"
                                activeProps={{
                                  className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                                }}
                              >
                                {page.name}
                              </Link>
                            </ListItem>
                          ))}
                        </ListSection>
                      )}
                    </ListSection>

                    {/* Xatu Section */}
                    {filteredXatuPages.length > 0 && (
                      <ListSection title="Xatu">
                        {filteredXatuPages.map(page => (
                          <ListItem key={page.to}>
                            <Link
                              to={page.to}
                              preload="viewport"
                              preloadDelay={100}
                              className="group flex gap-x-3 rounded-lg px-2.5 py-2 text-base font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary lg:py-1.5 lg:text-sm/6"
                              activeProps={{
                                className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                              }}
                            >
                              {page.name}
                            </Link>
                          </ListItem>
                        ))}
                      </ListSection>
                    )}
                  </ListContainer>
                </nav>
              </div>

              {/* Social Links Footer */}
              <div className="shrink-0 px-6">
                <SocialLinks />
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden border-r border-border bg-surface/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {/* Scrollable content */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6">
          {/* Logo and Theme Toggle */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50">
            <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <img alt="Lab Logo" src="/images/lab.png" className="size-10" />
              <div className="flex flex-col justify-center">
                <span className="font-sans text-2xl font-bold text-foreground">The Lab</span>
                <span className="-mt-1 text-[12px] text-muted">lab.ethpandaops.io</span>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          <nav className="flex flex-1 flex-col">
            <ListContainer variant="simple" withDividers={false} compact className="flex flex-1 flex-col gap-y-7">
              {/* Network Selector */}
              <ListItem>
                <Header size="xs" title="Network" />
                <div className="mt-2">
                  <NetworkSelect showLabel={false} />
                </div>
              </ListItem>

              {/* Ethereum Section */}
              <ListSection title="Ethereum">
                {filteredEthereumConsensusPages.length > 0 && (
                  <ListSection title="Consensus" nested>
                    {filteredEthereumConsensusPages.map(page => (
                      <ListItem key={page.to}>
                        <Link
                          to={page.to}
                          preload="viewport"
                          preloadDelay={100}
                          className="group flex gap-x-3 px-2.5 py-1.5 text-sm/6 font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
                          activeProps={{
                            className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                          }}
                        >
                          {page.name}
                        </Link>
                      </ListItem>
                    ))}
                  </ListSection>
                )}

                {filteredEthereumExecutionPages.length > 0 && (
                  <ListSection title="Execution" nested>
                    {filteredEthereumExecutionPages.map(page => (
                      <ListItem key={page.to}>
                        <Link
                          to={page.to}
                          preload="viewport"
                          preloadDelay={100}
                          className="group flex gap-x-3 px-2.5 py-1.5 text-sm/6 font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
                          activeProps={{
                            className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                          }}
                        >
                          {page.name}
                        </Link>
                      </ListItem>
                    ))}
                  </ListSection>
                )}

                {filteredEthereumDataAvailabilityPages.length > 0 && (
                  <ListSection title="Data Availability" nested className="mt-2">
                    {filteredEthereumDataAvailabilityPages.map(page => (
                      <ListItem key={page.to}>
                        <Link
                          to={page.to}
                          preload="viewport"
                          preloadDelay={100}
                          className="group flex gap-x-3 px-2.5 py-1.5 text-sm/6 font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
                          activeProps={{
                            className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                          }}
                        >
                          {page.name}
                        </Link>
                      </ListItem>
                    ))}
                  </ListSection>
                )}
              </ListSection>

              {/* Xatu Section */}
              {filteredXatuPages.length > 0 && (
                <ListSection title="Xatu">
                  {filteredXatuPages.map(page => (
                    <ListItem key={page.to}>
                      <Link
                        to={page.to}
                        preload="viewport"
                        preloadDelay={100}
                        className="group flex gap-x-3 px-2.5 py-1.5 text-sm/6 font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
                        activeProps={{
                          className: 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20',
                        }}
                      >
                        {page.name}
                      </Link>
                    </ListItem>
                  ))}
                </ListSection>
              )}
            </ListContainer>
          </nav>
        </div>

        {/* Social Links Footer - Fixed at bottom */}
        <div className="shrink-0 px-6">
          <SocialLinks />
        </div>
      </div>
    </>
  );
}
