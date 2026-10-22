import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';

export interface ExternalResource {
  label: string;
  href: string;
  description: string;
}

/**
 * Card listing external links with a one-line description each.
 */
export function ExternalResourcesCard({ links }: { links: ExternalResource[] }): React.JSX.Element {
  return (
    <Card title="External Resources">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-sm border border-border p-4 transition-colors hover:bg-background"
          >
            <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">{link.label}</div>
              <div className="mt-1 text-xs text-muted">{link.description}</div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}
