import type { JSX, ReactNode } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import type { BadgeColor } from '@/components/Elements/Badge/Badge.types';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { BeaconchainIcon } from '@/components/Ethereum/BeaconchainIcon';
import { Entity } from '@/components/Ethereum/Entity';
import { Epoch } from '@/components/Ethereum/Epoch';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp } from '@/utils';
import type { DimValidatorStatus } from '@/api/types.gen';
import type { ValidatorIdentity as Identity } from '../../hooks/useValidatorIdentity';

/** Status and balances at one point in time */
export type ValidatorState = Pick<Identity, 'status' | 'slashed' | 'balanceEth' | 'effectiveBalanceEth'>;

const CREDENTIAL_LABELS = { '0x00': '0x00 BLS', '0x01': '0x01 Execution', '0x02': '0x02 Compounding' } as const;

function statusColor(status: string): BadgeColor {
  if (status.includes('slashed')) return 'red';
  if (status === 'active_ongoing') return 'green';
  if (status === 'active_exiting') return 'orange';
  return 'gray';
}

const statusLabel = (status: string): string => status.replace(/_/g, ' ');
const shortHex = (hex: string): string => `${hex.slice(0, 10)}…${hex.slice(-8)}`;
const eth = (value: number, decimals = 0): string =>
  `${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ETH`;

/** Icon link to the validator on the network's beacon explorer (beaconcha.in on mainnet) */
export function BeaconchainLink({ index }: { index: number }): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const base = currentNetwork?.service_urls?.beaconExplorer;
  if (!base) return null;
  return (
    <a
      href={`${base}/validator/${index}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Open on beaconcha.in"
      aria-label={`Open validator ${index} on beaconcha.in`}
      className="inline-flex rounded-sm p-1 transition-colors hover:bg-muted-20"
    >
      <BeaconchainIcon className="size-4" />
    </a>
  );
}

/** Headline number in an identity card */
function Figure({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-xs/5 font-medium text-muted">{label}</p>
      <p className="text-2xl/8 font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {detail && <p className="text-xs/5 text-muted">{detail}</p>}
    </div>
  );
}

/** Label and value in an identity card's fact grid */
function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs/5 text-muted">{label}</dt>
      <dd className="text-sm/6 text-foreground">{children}</dd>
    </div>
  );
}

/** Date on the first line, epoch underneath */
function EpochDate({ epoch }: { epoch: number }): JSX.Element {
  const { currentNetwork } = useNetwork();
  const genesis = currentNetwork?.genesis_time;
  return (
    <span className="block">
      {genesis !== undefined && (
        <span className="block">
          {new Date(epochToTimestamp(epoch, genesis) * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      )}
      <span className="block text-xs/5 text-muted">
        Epoch <Epoch epoch={epoch} />
      </span>
    </span>
  );
}

/**
 * One validator: status, balances, keys, entity and lifecycle. With `endState`, status and balances are
 * those on the range's last day, and credentials are labelled as current.
 */
export function ValidatorIdentityCard({
  identity,
  endState,
  className,
}: {
  identity: Identity;
  endState?: ValidatorState;
  className?: string;
}): JSX.Element {
  const state = endState ?? identity;
  const maxEffective = identity.credentialType === '0x02' ? 2048 : 32;

  return (
    <Card
      title={`Validator ${identity.index}`}
      className={className}
      actions={
        <div className="flex items-center gap-2">
          <Badge color={statusColor(state.status)} dot>
            {statusLabel(state.status)}
          </Badge>
          {state.slashed && <Badge color="red">Slashed</Badge>}
          <BeaconchainLink index={identity.index} />
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Figure
          label="Balance"
          value={eth(state.balanceEth, 4)}
          detail={`${eth(state.balanceEth - state.effectiveBalanceEth, 4)} above effective`}
        />
        <Figure
          label="Effective balance"
          value={eth(state.effectiveBalanceEth)}
          detail={endState ? undefined : `of ${eth(maxEffective)} max`}
        />
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
        <Fact label="Pubkey">
          <span className="inline-flex items-center gap-1 font-mono">
            {shortHex(identity.pubkey)}
            <CopyToClipboard content={identity.pubkey} />
          </span>
        </Fact>
        <Fact label={endState ? 'Current credentials' : 'Credentials'}>
          {CREDENTIAL_LABELS[identity.credentialType]}
        </Fact>
        <Fact label={endState ? 'Current withdrawal address' : 'Withdrawal address'}>
          {identity.withdrawalAddress ? (
            <a
              href={`https://etherscan.io/address/${identity.withdrawalAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline"
            >
              {shortHex(identity.withdrawalAddress)}
            </a>
          ) : (
            <span className="text-muted">None (BLS credentials)</span>
          )}
        </Fact>
        <Fact label="Entity">
          {identity.entity ? <Entity entity={identity.entity} /> : <span className="text-muted">Unknown</span>}
        </Fact>
        <Fact label="Eligible">
          {identity.activationEligibilityEpoch !== null ? (
            <EpochDate epoch={identity.activationEligibilityEpoch} />
          ) : (
            <span className="text-muted">Not yet</span>
          )}
        </Fact>
        <Fact label="Activated">
          {identity.activationEpoch !== null ? (
            <EpochDate epoch={identity.activationEpoch} />
          ) : (
            <span className="text-muted">Pending</span>
          )}
        </Fact>
        {identity.exitEpoch !== null && (
          <Fact label="Exit">
            <EpochDate epoch={identity.exitEpoch} />
          </Fact>
        )}
        {identity.withdrawableEpoch !== null && (
          <Fact label="Withdrawable">
            <EpochDate epoch={identity.withdrawableEpoch} />
          </Fact>
        )}
      </dl>
    </Card>
  );
}

/**
 * A set of validators: status counts, combined balances, withdrawal addresses, entities and credentials.
 * With `endStates`, status counts and balances are those on the range's last day, and credentials are
 * labelled as current.
 */
export function ValidatorSetCard({
  identities,
  endStates,
  className,
}: {
  identities: Identity[];
  endStates?: Map<number, ValidatorState>;
  className?: string;
}): JSX.Element {
  const states = identities.map(i => endStates?.get(i.index) ?? i);
  const active = states.filter(s => s.status.startsWith('active'));
  const balance = states.reduce((a, s) => a + s.balanceEth, 0);
  const effective = states.reduce((a, s) => a + s.effectiveBalanceEth, 0);
  const statuses = new Map<string, number>();
  for (const s of states) statuses.set(s.status, (statuses.get(s.status) ?? 0) + 1);
  const entities = new Map<string, number>();
  const addresses = new Set<string>();
  for (const i of identities) {
    if (i.entity) entities.set(i.entity, (entities.get(i.entity) ?? 0) + 1);
    if (i.withdrawalAddress) addresses.add(i.withdrawalAddress);
  }
  const credentials = (['0x02', '0x01', '0x00'] as const)
    .map(ct => {
      const members = states.filter((_, n) => identities[n].credentialType === ct);
      return { ct, count: members.length, stake: members.reduce((a, s) => a + s.effectiveBalanceEth, 0) };
    })
    .filter(c => c.count > 0);

  return (
    <Card
      title={`${identities.length} validators`}
      className={className}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {[...statuses].map(([status, count]) => (
            <Badge key={status} color={statusColor(status)} dot>
              {count} {statusLabel(status)}
            </Badge>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <Figure label="Balance" value={eth(balance, 2)} />
        <Figure label="Effective balance" value={eth(effective)} />
        <Figure label="Active" value={`${active.length} / ${identities.length}`} />
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
        <Fact label={endStates ? 'Current withdrawal addresses' : 'Withdrawal addresses'}>
          {addresses.size.toLocaleString()}
        </Fact>
        <Fact label="Entities">
          {entities.size === 1 ? <Entity entity={[...entities.keys()][0]} /> : entities.size || '—'}
        </Fact>
      </dl>
      <table className="mt-5 w-full text-sm/6">
        <thead>
          <tr className="border-b border-border text-left text-xs/5 text-muted">
            <th className="pb-1.5 font-medium">{endStates ? 'Current credentials' : 'Credentials'}</th>
            <th className="pb-1.5 text-right font-medium">Validators</th>
            <th className="pb-1.5 text-right font-medium">Effective balance</th>
          </tr>
        </thead>
        <tbody className="text-foreground tabular-nums">
          {credentials.map(c => (
            <tr key={c.ct}>
              <td className="pt-1.5">{CREDENTIAL_LABELS[c.ct]}</td>
              <td className="pt-1.5 text-right">{c.count}</td>
              <td className="pt-1.5 text-right">{eth(c.stake)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/**
 * Validators that joined after the latest daily `dim_validator` snapshot, from their status transitions alone.
 */
export function NewValidatorsCard({
  statuses,
  className,
}: {
  statuses: DimValidatorStatus[];
  className?: string;
}): JSX.Element {
  const single = statuses.length === 1 ? statuses[0] : undefined;
  // Unset epochs are 2^64 - 1
  const activation = (s: DimValidatorStatus): number | null =>
    s.activation_epoch != null && s.activation_epoch < Number.MAX_SAFE_INTEGER ? s.activation_epoch : null;
  const note = (
    <p className="mt-5 text-xs/5 text-muted">Credentials and entity appear after the next daily snapshot.</p>
  );

  if (single) {
    const status = single.status ?? 'unknown';
    const activationEpoch = activation(single);
    return (
      <Card
        title={`Validator ${single.validator_index}`}
        className={className}
        actions={
          <div className="flex items-center gap-2">
            <Badge color={statusColor(status)} dot>
              {statusLabel(status)}
            </Badge>
            <BeaconchainLink index={single.validator_index ?? 0} />
          </div>
        }
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Pubkey">
            <span className="inline-flex items-center gap-1 font-mono">
              {shortHex(single.pubkey ?? '')}
              <CopyToClipboard content={single.pubkey ?? ''} />
            </span>
          </Fact>
          <Fact label="Activated">
            {activationEpoch !== null ? (
              <EpochDate epoch={activationEpoch} />
            ) : (
              <span className="text-muted">Pending</span>
            )}
          </Fact>
        </dl>
        {note}
      </Card>
    );
  }

  return (
    <Card title={`${statuses.length} new validators`} className={className}>
      <table className="w-full text-sm/6">
        <thead>
          <tr className="border-b border-border text-left text-xs/5 text-muted">
            <th className="pb-1.5 font-medium">Validator</th>
            <th className="pb-1.5 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-foreground tabular-nums">
          {statuses.map(s => (
            <tr key={s.validator_index}>
              <td className="pt-1.5">{s.validator_index}</td>
              <td className="pt-1.5 text-right">
                <Badge color={statusColor(s.status ?? 'unknown')} dot>
                  {statusLabel(s.status ?? 'unknown')}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note}
    </Card>
  );
}
