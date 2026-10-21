import type { JSX } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import { NetworkSelect } from '@/components/Ethereum/NetworkSelect';
import { GitHubIcon } from '@/components/Elements/Icons';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { NAV_SECTIONS, isPageEnabled } from '@/components/Layout/Sidebar/navigation';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';

/**
 * Desktop application frame: a section bar (wordmark, sections, network, theme) above a tab row
 * listing the active section's pages. Both rows share the page content's max width and inset,
 * so the wordmark, the first tab and the page title sit on one left edge.
 */
export function TopNav(): JSX.Element {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { data: config } = useConfig();
  const { currentNetwork } = useNetwork();

  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    pages: section.pages.filter(page => isPageEnabled(page.to, config?.features, currentNetwork?.name)),
  })).filter(section => section.pages.length > 0);

  const activeSection = sections.find(section => section.pages.some(page => pathname.startsWith(page.to)));

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/90 backdrop-blur-sm lg:block">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-8 px-8 3xl:max-w-screen-3xl 4xl:max-w-screen-4xl">
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80">
          <img alt="" src="/images/lab.png" className="h-6 w-auto" />
          <span className="font-display text-base font-bold text-foreground">The Lab</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Sections">
          {sections.map(section => {
            const isActive = section === activeSection;
            return (
              <Link
                key={section.name}
                to={section.pages[0].to}
                aria-current={isActive ? 'true' : undefined}
                className={clsx(
                  'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-foreground/[0.07] text-foreground' : 'text-muted hover:text-foreground'
                )}
              >
                {section.name}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="w-44">
            <NetworkSelect showLabel={false} />
          </div>
          <a
            href="https://github.com/ethpandaops/lab"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="rounded-sm p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>

      {activeSection && (
        <div className="mx-auto flex h-10 max-w-screen-2xl items-stretch gap-6 px-8 3xl:max-w-screen-3xl 4xl:max-w-screen-4xl">
          {activeSection.pages.map(page => {
            const isActive = pathname.startsWith(page.to);
            return (
              <Link
                key={page.to}
                to={page.to}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  '-mb-px flex items-center border-b-2 text-sm transition-colors',
                  isActive
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted hover:text-foreground'
                )}
              >
                {page.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
