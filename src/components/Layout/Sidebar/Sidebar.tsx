import type { JSX } from 'react';
import { useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  ArchiveBoxXMarkIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentTextIcon,
  FireIcon,
  PlayCircleIcon,
  PresentationChartLineIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
  ClockIcon,
  MapIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  SignalIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { NetworkSelect } from '@/components/Ethereum/NetworkSelect';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { GitHubIcon } from '@/components/Elements/Icons';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';
import type { SidebarProps } from './Sidebar.types';

/**
 * Ethereum diamond logo SVG component
 */
function EthereumLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 115 182" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Bottom facets */}
      <path fill="currentColor" fillOpacity="0.6" d="M57.5 181v-45.16L1.64 103.17z" />
      <path fill="currentColor" fillOpacity="0.8" d="M57.69 181v-45.16l55.87-32.67z" />
      {/* Middle facets */}
      <path fill="currentColor" fillOpacity="0.4" d="M57.51 124.62V66.98L1 92.28z" />
      <path fill="currentColor" fillOpacity="0.6" d="M57.69 124.62V66.98l56.51 25.3z" />
      {/* Top facets */}
      <path fill="currentColor" fillOpacity="0.8" d="M1 92.28L57.5 1v65.98z" />
      <path fill="currentColor" d="M114.2 92.28L57.69 1v65.98z" />
    </svg>
  );
}

/**
 * Xatu logo - stylized chart/analytics icon
 */
function XatuLogo({ className }: { className?: string }): JSX.Element {
  return <ChartBarIcon className={className} />;
}

/**
 * X (Twitter) icon SVG
 */
function XIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Sidebar footer with version, social links, and collapse toggle
 */
function SidebarFooter({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}): JSX.Element {
  if (collapsed) {
    // Collapsed: vertical stack of icons
    return (
      <div className="flex flex-col items-center gap-2 border-t border-border/50 py-3">
        <a
          href="https://github.com/ethpandaops/lab"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="GitHub repository"
        >
          <GitHubIcon className="size-4" />
        </a>
        <a
          href="https://twitter.com/ethpandaops"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="X (Twitter)"
        >
          <XIcon className="size-4" />
        </a>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Expand sidebar"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    );
  }

  // Expanded: horizontal layout with version
  return (
    <div className="border-t border-border/50 px-1 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <a
            href="https://github.com/ethpandaops/lab"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="GitHub repository"
          >
            <GitHubIcon className="size-4" />
          </a>
          <a
            href="https://twitter.com/ethpandaops"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="X (Twitter)"
          >
            <XIcon className="size-4" />
          </a>
        </div>
        {window.__VERSION__ && <span className="text-[10px] text-muted/60">{window.__VERSION__.version}</span>}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Collapse sidebar"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

interface NavItem {
  name: string;
  to: string;
  icon: typeof ChartBarIcon;
}

const ethereumConsensusPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/consensus/overview', icon: PresentationChartLineIcon },
  { name: 'Live', to: '/ethereum/live', icon: PlayCircleIcon },
  { name: 'Epochs', to: '/ethereum/epochs', icon: ClockIcon },
  { name: 'Slots', to: '/ethereum/slots', icon: Square3Stack3DIcon },
  { name: 'Entities', to: '/ethereum/entities', icon: UserGroupIcon },
  { name: 'Forks', to: '/ethereum/forks', icon: SignalIcon },
];

const ethereumValidatorsPages: NavItem[] = [
  { name: 'Report', to: '/ethereum/validators/report', icon: DocumentTextIcon },
];

const ethereumDataAvailabilityPages: NavItem[] = [
  { name: 'Custody', to: '/ethereum/data-availability/custody', icon: CircleStackIcon },
  { name: 'Probes', to: '/ethereum/data-availability/probes', icon: MagnifyingGlassIcon },
];

const ethereumExecutionPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/execution/overview', icon: PresentationChartLineIcon },
  { name: 'Timings', to: '/ethereum/execution/timings', icon: ClockIcon },
  { name: 'Payloads', to: '/ethereum/execution/payloads', icon: CubeIcon },
  { name: 'Gas Profiler', to: '/ethereum/execution/gas-profiler', icon: FireIcon },
  { name: 'State Growth', to: '/ethereum/execution/state-growth', icon: ServerStackIcon },
  { name: 'State Expiry', to: '/ethereum/execution/state-expiry', icon: ArchiveBoxXMarkIcon },
  { name: 'Contracts', to: '/ethereum/contracts', icon: DocumentTextIcon },
];

const xatuPages: NavItem[] = [
  { name: 'Contributors', to: '/xatu/contributors', icon: UserGroupIcon },
  { name: 'Nodes', to: '/xatu/nodes', icon: CpuChipIcon },
  { name: 'Geo Checklist', to: '/xatu/geographical-checklist', icon: MapIcon },
  { name: 'Local Blocks', to: '/xatu/locally-built-blocks', icon: CubeIcon },
  { name: 'Fork Readiness', to: '/xatu/fork-readiness', icon: WrenchScrewdriverIcon },
];

/**
 * Helper function to check if a page is enabled for the current network.
 */
function isPageEnabled(
  path: string,
  features: Array<{ path: string; disabled_networks?: string[] }> | undefined,
  networkName: string | undefined
): boolean {
  if (!features || !networkName) return true;
  const feature = features.find(f => f.path === path);
  if (!feature) return true;
  if (feature.disabled_networks?.includes(networkName)) return false;
  return true;
}

/**
 * Navigation link component that handles both collapsed and expanded states
 */
function NavLink({ page, collapsed }: { page: NavItem; collapsed: boolean }): JSX.Element {
  const Icon = page.icon;

  return (
    <Link
      to={page.to}
      preload="viewport"
      preloadDelay={100}
      title={collapsed ? page.name : undefined}
      className={clsx(
        'group flex items-center gap-x-3 rounded-sm text-muted transition-all hover:bg-primary/10 hover:text-primary',
        collapsed ? 'justify-center p-2' : 'px-2 py-1 text-sm/5 font-medium'
      )}
      activeProps={{
        className: 'bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20',
      }}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{page.name}</span>}
    </Link>
  );
}

/**
 * Section header for navigation groups - uses custom logos for Ethereum and Xatu
 */
function SectionHeader({
  title,
  collapsed,
  type,
}: {
  title: string;
  collapsed: boolean;
  type: 'ethereum' | 'xatu';
}): JSX.Element {
  const Logo = type === 'ethereum' ? EthereumLogo : XatuLogo;

  if (collapsed) {
    return (
      <div className="flex justify-center py-2" title={title}>
        <Logo className="size-5 text-muted/70" />
      </div>
    );
  }

  return (
    <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground">
      <Logo className="size-4" />
      <span>{title}</span>
    </div>
  );
}

/**
 * Subsection header (e.g., "Consensus", "Data Availability")
 */
function SubsectionHeader({ title, collapsed }: { title: string; collapsed: boolean }): JSX.Element {
  if (collapsed) {
    return null as unknown as JSX.Element;
  }

  return <div className="mb-1 ml-1 text-[10px] font-semibold tracking-wider text-muted/60 uppercase">{title}</div>;
}

export function Sidebar({ sidebarOpen, setSidebarOpen, collapsed, setCollapsed }: SidebarProps): JSX.Element {
  const { data: config } = useConfig();
  const { currentNetwork } = useNetwork();

  const filteredEthereumConsensusPages = useMemo(
    () => ethereumConsensusPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredEthereumDataAvailabilityPages = useMemo(
    () => ethereumDataAvailabilityPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredEthereumExecutionPages = useMemo(
    () => ethereumExecutionPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
    [config?.features, currentNetwork?.name]
  );

  const filteredEthereumValidatorsPages = useMemo(
    () => ethereumValidatorsPages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
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
            <div className="relative flex grow flex-col bg-surface/95 backdrop-blur-xl">
              <div className="flex grow flex-col gap-y-4 overflow-y-auto px-4 pt-4">
                <div className="mb-2">
                  <NetworkSelect showLabel={false} />
                </div>

                <nav className="flex flex-1 flex-col gap-y-6">
                  <div>
                    <SectionHeader title="Ethereum" collapsed={false} type="ethereum" />
                    <div className="mt-2 space-y-3">
                      {filteredEthereumConsensusPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Consensus" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumConsensusPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} />
                            ))}
                          </div>
                        </div>
                      )}
                      {filteredEthereumDataAvailabilityPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Data Availability" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumDataAvailabilityPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} />
                            ))}
                          </div>
                        </div>
                      )}
                      {filteredEthereumExecutionPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Execution" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumExecutionPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} />
                            ))}
                          </div>
                        </div>
                      )}
                      {filteredEthereumValidatorsPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Validators" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumValidatorsPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {filteredXatuPages.length > 0 && (
                    <div>
                      <SectionHeader title="Xatu" collapsed={false} type="xatu" />
                      <div className="mt-2 space-y-0.5">
                        {filteredXatuPages.map(page => (
                          <NavLink key={page.to} page={page} collapsed={false} />
                        ))}
                      </div>
                    </div>
                  )}
                </nav>
              </div>

              <div className="shrink-0 border-t border-border/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <a
                      href="https://github.com/ethpandaops/lab"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                      aria-label="GitHub repository"
                    >
                      <GitHubIcon className="size-5" />
                    </a>
                    <a
                      href="https://twitter.com/ethpandaops"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-sm p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                      aria-label="X (Twitter)"
                    >
                      <XIcon className="size-5" />
                    </a>
                  </div>
                  {window.__VERSION__ && <span className="text-xs text-muted/60">{window.__VERSION__.version}</span>}
                </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div
        className={clsx(
          'hidden border-r border-border bg-surface/95 backdrop-blur-xl transition-all duration-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col',
          collapsed ? 'lg:w-14' : 'lg:w-56'
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            'flex h-12 shrink-0 items-center border-b border-border/50',
            collapsed ? 'justify-center px-2' : 'justify-between px-3'
          )}
        >
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img alt="Lab Logo" src="/images/lab.png" className="h-7 w-auto" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-sans text-lg leading-tight font-bold text-foreground">The Lab</span>
                <span className="text-[10px] leading-tight text-muted">lab.ethpandaops.io</span>
              </div>
            )}
          </Link>
          {!collapsed && <ThemeToggle />}
        </div>

        {/* Scrollable content */}
        <div className={clsx('flex grow flex-col gap-y-3 overflow-y-auto', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
          {/* Network Selector */}
          {collapsed ? (
            currentNetwork && (
              <div className="flex justify-center" title={currentNetwork.display_name}>
                <NetworkIcon networkName={currentNetwork.name} className="size-6" />
              </div>
            )
          ) : (
            <NetworkSelect showLabel={false} />
          )}

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-y-4">
            {/* Ethereum Section */}
            <div>
              <SectionHeader title="Ethereum" collapsed={collapsed} type="ethereum" />
              <div className={clsx('space-y-2', !collapsed && 'mt-1.5')}>
                {filteredEthereumConsensusPages.length > 0 && (
                  <div>
                    <SubsectionHeader title="Consensus" collapsed={collapsed} />
                    <div className={clsx(collapsed ? 'space-y-1' : 'space-y-0.5')}>
                      {filteredEthereumConsensusPages.map(page => (
                        <NavLink key={page.to} page={page} collapsed={collapsed} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredEthereumDataAvailabilityPages.length > 0 && (
                  <div>
                    <SubsectionHeader title="Data Availability" collapsed={collapsed} />
                    <div className={clsx(collapsed ? 'space-y-1' : 'space-y-0.5')}>
                      {filteredEthereumDataAvailabilityPages.map(page => (
                        <NavLink key={page.to} page={page} collapsed={collapsed} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredEthereumExecutionPages.length > 0 && (
                  <div>
                    <SubsectionHeader title="Execution" collapsed={collapsed} />
                    <div className={clsx(collapsed ? 'space-y-1' : 'space-y-0.5')}>
                      {filteredEthereumExecutionPages.map(page => (
                        <NavLink key={page.to} page={page} collapsed={collapsed} />
                      ))}
                    </div>
                  </div>
                )}
                {filteredEthereumValidatorsPages.length > 0 && (
                  <div>
                    <SubsectionHeader title="Validators" collapsed={collapsed} />
                    <div className={clsx(collapsed ? 'space-y-1' : 'space-y-0.5')}>
                      {filteredEthereumValidatorsPages.map(page => (
                        <NavLink key={page.to} page={page} collapsed={collapsed} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Xatu Section */}
            {filteredXatuPages.length > 0 && (
              <div>
                <SectionHeader title="Xatu" collapsed={collapsed} type="xatu" />
                <div className={clsx(collapsed ? 'mt-1 space-y-1' : 'mt-1.5 space-y-0.5')}>
                  {filteredXatuPages.map(page => (
                    <NavLink key={page.to} page={page} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="shrink-0">
          <SidebarFooter collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
        </div>
      </div>
    </>
  );
}
