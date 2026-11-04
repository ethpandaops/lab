import { type JSX, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import type { UserCardProps } from './UserCard.types';
import { getClassificationBadgeClasses, getCountryFlag } from '@/utils';
import { Timestamp } from '@/components/DataDisplay/Timestamp';

function Detail({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs/5 text-muted">{label}</dt>
      <dd className="truncate text-sm/6 font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function UserCard({
  username,
  classification,
  nodeCount,
  countryCount,
  lastSeen,
  primaryCountry,
  collector,
  collectorVersion,
  consensusImplementations,
  to,
}: UserCardProps): JSX.Element {
  const countryFlag = primaryCountry ? getCountryFlag(primaryCountry, '') : '';
  const hasClients = consensusImplementations && consensusImplementations.length > 0;
  const badgeColor = getClassificationBadgeClasses(classification);

  const cardContent = (
    <Card>
      <div className="w-full">
        <div className="flex items-center gap-x-3">
          <h3 className="truncate text-sm/6 font-semibold text-foreground">{username}</h3>
          <span
            className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium inset-ring ${badgeColor}`}
          >
            {classification}
          </span>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-x-4">
          <Detail label="Xatu nodes">{nodeCount}</Detail>
          <Detail label="Countries">
            {countryCount} {countryCount === 1 && countryFlag}
          </Detail>
          <Detail label="Last seen">
            <Timestamp timestamp={lastSeen} format="relative" disableModal />
          </Detail>
        </dl>
        {hasClients && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {consensusImplementations.map(client => (
              <ClientLogo key={client} client={client} noLink />
            ))}
          </div>
        )}
        {collectorVersion && (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs/5 text-muted">
            <span className="shrink-0">{collector && collector !== 'several' ? collector : 'Collector'}</span>
            <Badge color="gray" variant="flat" truncate>
              {collectorVersion === 'several' ? 'several versions' : collectorVersion}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block transition-all duration-200 hover:-translate-y-0.5">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
