import type { JSX, ReactNode } from 'react';
import { useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  ArchiveBoxXMarkIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  DocumentTextIcon,
  FireIcon,
  PlayCircleIcon,
  PresentationChartLineIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BoltIcon,
  ClockIcon,
  CpuChipIcon,
  MapIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  SignalIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { NetworkSelect } from '@/components/Ethereum/NetworkSelect';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { GitHubIcon } from '@/components/Elements/Icons';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';
import { getNetworkFullLabel } from '@/utils/networks';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
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
        {window.__VERSION__ && <span className="text-2xs text-muted/60">{window.__VERSION__.version}</span>}
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

/** A page listed in a nav item's flyout */
interface NavChild {
  name: string;
  to: string;
  icon?: ReactNode;
}

/** A group of pages in a nav item's flyout, shown as one column */
interface NavGroup {
  label?: string;
  items: NavChild[];
}

interface NavItem {
  name: string;
  to: string;
  icon: typeof ChartBarIcon;
  /** Nested pages, opened from a chevron beside the item (or the item's icon in the collapsed rail) */
  children?: NavGroup[];
}

/** Clients with no proposed block in any network's history, left out of the sidebar */
const UNLISTED_CLIENTS = new Set(['trin-execution', 'ethereumjs', 'nimbusel']);

function clientGroup(label: string, clients: readonly string[]): NavGroup {
  return {
    label,
    items: clients
      .filter(client => !UNLISTED_CLIENTS.has(client))
      .map(client => ({
        name: formatClientName(client),
        to: `/ethereum/clients/${client}`,
        icon: <ClientLogo client={client} size={16} noLink />,
      })),
  };
}

const ethereumConsensusPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/consensus/overview', icon: PresentationChartLineIcon },
  { name: 'Live', to: '/ethereum/live', icon: PlayCircleIcon },
  { name: 'Epochs', to: '/ethereum/epochs', icon: ClockIcon },
  { name: 'Slots', to: '/ethereum/slots', icon: Square3Stack3DIcon },
  { name: 'Validators', to: '/ethereum/validators', icon: ShieldCheckIcon },
  { name: 'Entities', to: '/ethereum/entities', icon: UserGroupIcon },
  {
    name: 'Clients',
    to: '/ethereum/clients',
    icon: CpuChipIcon,
    children: [clientGroup('Consensus', CONSENSUS_CLIENTS), clientGroup('Execution', EXECUTION_CLIENTS)],
  },
  { name: 'Forks', to: '/ethereum/forks', icon: SignalIcon },
];

const ethereumDataAvailabilityPages: NavItem[] = [
  { name: 'Custody', to: '/ethereum/data-availability/custody', icon: CircleStackIcon },
  { name: 'Probes', to: '/ethereum/data-availability/probes', icon: MagnifyingGlassIcon },
  { name: 'Partial Columns', to: '/ethereum/data-availability/partial-columns', icon: PuzzlePieceIcon },
];

const ethereumExecutionPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/execution/overview', icon: PresentationChartLineIcon },
  { name: 'Timings', to: '/ethereum/execution/timings', icon: ClockIcon },
  { name: 'Performance', to: '/ethereum/execution/performance', icon: BoltIcon },
  { name: 'Payloads', to: '/ethereum/execution/payloads', icon: CubeIcon },
  { name: 'Gas Profiler', to: '/ethereum/execution/gas-profiler', icon: FireIcon },
  { name: 'State Growth', to: '/ethereum/execution/state-growth', icon: ServerStackIcon },
  { name: 'State Expiry', to: '/ethereum/execution/state-expiry', icon: ArchiveBoxXMarkIcon },
  { name: 'Contracts', to: '/ethereum/contracts', icon: DocumentTextIcon },
];

const xatuPages: NavItem[] = [
  { name: 'Contributors', to: '/xatu/contributors', icon: UserGroupIcon },
  { name: 'Nodes', to: '/xatu/nodes', icon: ServerIcon },
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

const navItemClassName =
  'group flex items-center gap-x-2.5 rounded-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground';
const navItemActiveClassName = 'bg-foreground/[0.07] !text-foreground [&>svg]:text-primary';

/**
 * Navigation link component that handles both collapsed and expanded states.
 * Items with children also get a flyout listing them; `inDrawer` opens it below the item instead of beside it.
 */
function NavLink({
  page,
  collapsed,
  inDrawer = false,
}: {
  page: NavItem;
  collapsed: boolean;
  inDrawer?: boolean;
}): JSX.Element {
  const Icon = page.icon;

  const link = (
    <Link
      to={page.to}
      preload="viewport"
      preloadDelay={100}
      title={collapsed ? page.name : undefined}
      className={clsx(
        navItemClassName,
        collapsed ? 'justify-center p-2' : 'px-2 py-1 text-sm/5 font-medium',
        page.children && 'flex-1'
      )}
      activeProps={{ className: navItemActiveClassName }}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{page.name}</span>}
    </Link>
  );

  if (!page.children) return link;

  return <NavFlyout page={page} link={link} collapsed={collapsed} inDrawer={inDrawer} />;
}

/**
 * Flyout listing a nav item's children. Expanded, a chevron beside the item's link opens it so the link stays
 * clickable; in the collapsed rail the icon opens it, with the item's own page linked at the top.
 */
function NavFlyout({
  page,
  link,
  collapsed,
  inDrawer,
}: {
  page: NavItem;
  link: JSX.Element;
  collapsed: boolean;
  inDrawer: boolean;
}): JSX.Element {
  const Icon = page.icon;
  const pathname = useRouterState({ select: state => state.location.pathname });
  const inSection = pathname === page.to || pathname.startsWith(`${page.to}/`);
  const Chevron = inDrawer ? ChevronDownIcon : ChevronRightIcon;

  return (
    <Popover className="flex items-center gap-x-0.5">
      {collapsed ? (
        <PopoverButton
          title={page.name}
          aria-label={page.name}
          className={clsx(
            navItemClassName,
            'w-full justify-center p-2 data-open:bg-foreground/5 data-open:text-foreground',
            inSection && navItemActiveClassName
          )}
        >
          <Icon className="size-4 shrink-0" />
        </PopoverButton>
      ) : (
        <>
          {link}
          <PopoverButton
            aria-label={`${page.name} pages`}
            className="shrink-0 rounded-sm p-1.5 text-muted/70 transition-colors hover:bg-foreground/5 hover:text-foreground data-open:bg-foreground/[0.07] data-open:text-foreground"
          >
            <Chevron className="size-3.5" />
          </PopoverButton>
        </>
      )}
      <PopoverPanel
        transition
        anchor={{ to: inDrawer ? 'bottom end' : 'right start', gap: inDrawer ? 4 : 18, padding: 8 }}
        className="z-60 flex max-w-[calc(100vw-1rem)] flex-col gap-y-2 rounded-sm border border-border bg-background p-2 shadow-lg transition duration-100 ease-out data-closed:-translate-x-1 data-closed:opacity-0"
      >
        {({ close }) => (
          <>
            {collapsed && (
              <Link
                to={page.to}
                onClick={() => close()}
                className="rounded-sm px-2 py-1 text-sm/5 font-semibold text-foreground hover:bg-foreground/5"
              >
                {page.name}
              </Link>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {page.children?.map((group, index) => (
                <div key={group.label ?? index} className="flex min-w-40 flex-1 flex-col">
                  {group.label && (
                    <div className="px-2 pt-0.5 pb-1 text-2xs font-semibold tracking-wider text-muted/60 uppercase">
                      {group.label}
                    </div>
                  )}
                  {group.items.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => close()}
                      className="flex items-center gap-x-2 rounded-sm px-2 py-1 text-sm/5 font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                      activeProps={{ className: 'bg-foreground/[0.07] !text-foreground' }}
                    >
                      {item.icon}
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
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

  return <div className="mb-1 ml-1 text-2xs font-semibold tracking-wider text-muted/60 uppercase">{title}</div>;
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
          className="fixed inset-0 bg-background transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex pt-16">
          <DialogPanel
            transition
            className="relative flex w-full flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <div className="relative flex grow flex-col bg-background">
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
                              <NavLink key={page.to} page={page} collapsed={false} inDrawer />
                            ))}
                          </div>
                        </div>
                      )}
                      {filteredEthereumDataAvailabilityPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Data Availability" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumDataAvailabilityPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} inDrawer />
                            ))}
                          </div>
                        </div>
                      )}
                      {filteredEthereumExecutionPages.length > 0 && (
                        <div>
                          <SubsectionHeader title="Execution" collapsed={false} />
                          <div className="space-y-0.5">
                            {filteredEthereumExecutionPages.map(page => (
                              <NavLink key={page.to} page={page} collapsed={false} inDrawer />
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
                          <NavLink key={page.to} page={page} collapsed={false} inDrawer />
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
          'hidden border-r border-border bg-background transition-all duration-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col',
          collapsed ? 'lg:w-14' : 'lg:w-56'
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            'flex h-12 shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'justify-between px-3'
          )}
        >
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img alt="Lab Logo" src="/images/lab.png" className="h-7 w-auto" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display text-lg leading-tight font-bold text-foreground">The Lab</span>
                <span className="text-2xs leading-tight text-muted">lab.ethpandaops.io</span>
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
              <div className="flex justify-center" title={getNetworkFullLabel(currentNetwork)}>
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
