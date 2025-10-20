import { Card, CardBody } from '@/components/Card';
import { ClientLogo } from '@/components/ClientLogo';
import { VersionBadge } from '@/components/VersionBadge';
import type { ContributoorCardProps } from './ContributoorCard.types';
import { getBorderColor, getCountryFlag, getRelativeTime } from './utils';

export function ContributoorCard({
  username,
  classification,
  nodeCount,
  locationCount,
  lastSeen,
  primaryCountry,
  primaryCity,
  clientVersion,
  consensusImplementations,
  onClick,
}: ContributoorCardProps): JSX.Element {
  const countryFlag = primaryCountry ? getCountryFlag(primaryCountry) : '';
  const hasClients = consensusImplementations && consensusImplementations.length > 0;

  return (
    <Card isInteractive={!!onClick} onClick={onClick} className={`border-l-4 ${getBorderColor(classification)}`}>
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-primary">{username}</h3>
            {(clientVersion || hasClients) && (
              <div className="mt-1 flex items-center gap-2">
                {hasClients && consensusImplementations.map(client => <ClientLogo key={client} client={client} />)}
                {clientVersion && <VersionBadge version={clientVersion} />}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3 text-secondary">
            <div>
              <span className="font-semibold text-primary">{nodeCount}</span>{' '}
              <span className="text-tertiary">{nodeCount === 1 ? 'node' : 'nodes'}</span>
            </div>
            {locationCount === 1 && primaryCity && countryFlag ? (
              <>
                <div className="text-border">•</div>
                <div className="text-tertiary">
                  {primaryCity} {countryFlag}
                </div>
              </>
            ) : locationCount > 1 ? (
              <>
                <div className="text-border">•</div>
                <div>
                  <span className="font-semibold text-primary">{locationCount}</span>{' '}
                  <span className="text-tertiary">locations</span>
                </div>
              </>
            ) : null}
          </div>
          <div className="text-xs whitespace-nowrap text-tertiary">{getRelativeTime(lastSeen)}</div>
        </div>
      </CardBody>
    </Card>
  );
}
