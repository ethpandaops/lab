import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { MapPinIcon, ServerIcon } from '@heroicons/react/20/solid';
import { Badge } from '@/components/Elements/Badge';
import type { UserCardProps } from './UserCard.types';
import { getClassificationBadgeClasses, getCountryFlag, getRelativeTime } from './utils';

export function UserCard({
  username,
  classification,
  nodeCount,
  locationCount,
  lastSeen,
  primaryCountry,
  primaryCity,
  clientVersion,
  consensusImplementations,
  to,
}: UserCardProps): JSX.Element {
  const countryFlag = primaryCountry ? getCountryFlag(primaryCountry) : '';
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
        <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-muted">
          <div className="flex items-center gap-x-1">
            <ServerIcon className="size-4" aria-hidden="true" />
            <span className="font-medium text-foreground">{nodeCount}</span>
            <span>{nodeCount === 1 ? 'node' : 'nodes'}</span>
          </div>
          {locationCount > 0 && (
            <>
              <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                <circle r={1} cx={1} cy={1} />
              </svg>
              <div className="flex items-center gap-x-1">
                <MapPinIcon className="size-4" aria-hidden="true" />
                {locationCount === 1 && primaryCity && countryFlag ? (
                  <span>
                    {primaryCity} {countryFlag}
                  </span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{locationCount}</span>
                    <span>locations</span>
                  </>
                )}
              </div>
            </>
          )}
          <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
            <circle r={1} cx={1} cy={1} />
          </svg>
          <span>{getRelativeTime(lastSeen)}</span>
        </div>
        {(clientVersion || hasClients) && (
          <div className="mt-2 flex items-center gap-2">
            {hasClients && consensusImplementations.map(client => <ClientLogo key={client} client={client} />)}
            {clientVersion && (
              <Badge color="gray" variant="flat" truncate>
                {clientVersion}
              </Badge>
            )}
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
