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
            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-surface/95 px-6 pt-4 pb-2 backdrop-blur-xl">
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
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden border-r border-border bg-surface/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6">
          {/* Logo and Theme Toggle */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50">
            <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <img alt="Lab Logo" src="/images/lab.png" className="h-10 w-auto" />
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
      </div>
    </>
  );
}
