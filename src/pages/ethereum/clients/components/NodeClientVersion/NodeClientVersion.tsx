import type { JSX } from 'react';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { normalizeClientName } from '@/utils/ethereum';
import { compareVersions } from '@/utils/version';
import { useLatestReleases } from '../../hooks/useClientReleases';
import { matchReleaseVersion, shortVersion } from '../../utils/client-versions';

export interface NodeClientVersionProps {
  /** Client as a node reports it, e.g. lighthouse */
  client: string;
  /** Version string as the node reports it, e.g. v8.3.2-a376def */
  version?: string;
  /** Show the newest release when the node runs an older one */
  showNewer?: boolean;
}

/**
 * A node's client and version, linked to the client page and, when the version is a release, its version page.
 */
export function NodeClientVersion({ client, version, showNewer = false }: NodeClientVersionProps): JSX.Element {
  const { latest, releases } = useLatestReleases();
  const name = normalizeClientName(client);
  const release = matchReleaseVersion(version, releases.get(name) ?? []);
  const newest = latest.get(name);
  const behind =
    showNewer && !!newest?.version && !!release?.version && compareVersions(release.version, newest.version) < 0;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2" title={version}>
      <ClientLabel
        client={name}
        version={release?.version}
        detail={release ? undefined : shortVersion(version) || undefined}
      />
      {!version?.trim() && <span className="text-xs/5 text-muted">version unknown</span>}
      {behind && <span className="text-xs/5 text-warning">{newest?.version} available</span>}
    </span>
  );
}
