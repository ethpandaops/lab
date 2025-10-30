import type { JSX } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
import { NetworkSelect } from '@/components/Ethereum/NetworkSelect';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { ListContainer, ListItem, ListSection } from '@/components/Layout/ListContainer';
import { Header } from '@/components/Layout/Header';
import type { SidebarProps } from './Sidebar.types';

interface NavItem {
  name: string;
  to: string;
}

const ethereumConsensusPages: NavItem[] = [
  { name: 'Live', to: '/ethereum/live' },
  { name: 'Epochs', to: '/ethereum/epochs' },
  { name: 'Entities', to: '/ethereum/entities' },
  { name: 'Slots', to: '/ethereum/slots' },
];

const ethereumExecutionPages: NavItem[] = [];

const ethereumDataAvailabilityPages: NavItem[] = [
  { name: 'DAS Custody', to: '/ethereum/data-availability/das-custody' },
];

const xatuPages: NavItem[] = [
  { name: 'Contributors', to: '/xatu/contributors' },
  { name: 'Geographical Checklist', to: '/xatu/geographical-checklist' },
  { name: 'Locally Built Blocks', to: '/xatu/locally-built-blocks' },
  { name: 'Fork Readiness', to: '/xatu/fork-readiness' },
];

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps): JSX.Element {
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
                    <ListSection title="Consensus" nested>
                      {ethereumConsensusPages.map(page => (
                        <ListItem key={page.to}>
                          <Link
                            to={page.to}
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

                    {ethereumExecutionPages.length > 0 && (
                      <ListSection title="Execution" nested>
                        {ethereumExecutionPages.map(page => (
                          <ListItem key={page.to}>
                            <Link
                              to={page.to}
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

                    <ListSection title="Data Availability" nested>
                      {ethereumDataAvailabilityPages.map(page => (
                        <ListItem key={page.to}>
                          <Link
                            to={page.to}
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
                  </ListSection>

                  {/* Xatu Section */}
                  <ListSection title="Xatu">
                    {xatuPages.map(page => (
                      <ListItem key={page.to}>
                        <Link
                          to={page.to}
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
                <ListSection title="Consensus" nested>
                  {ethereumConsensusPages.map(page => (
                    <ListItem key={page.to}>
                      <Link
                        to={page.to}
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

                {ethereumExecutionPages.length > 0 && (
                  <ListSection title="Execution" nested>
                    {ethereumExecutionPages.map(page => (
                      <ListItem key={page.to}>
                        <Link
                          to={page.to}
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

                <ListSection title="Data Availability" nested>
                  {ethereumDataAvailabilityPages.map(page => (
                    <ListItem key={page.to}>
                      <Link
                        to={page.to}
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
              </ListSection>

              {/* Xatu Section */}
              <ListSection title="Xatu">
                {xatuPages.map(page => (
                  <ListItem key={page.to}>
                    <Link
                      to={page.to}
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
            </ListContainer>
          </nav>
        </div>
      </div>
    </>
  );
}
