import type { JSX } from 'react';
import { clsx } from 'clsx';
import {
  ClockIcon,
  XCircleIcon,
  BeakerIcon,
  FireIcon,
  QueueListIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { FilterValues } from '../../IndexPage.types';
import { DEFAULT_DURATION_MIN } from '../../IndexPage.types';

/**
 * Quick filter preset definition
 */
type QuickFilterPreset = {
  id: string;
  label: string;
  description: string;
  icon: JSX.Element;
  filters: Partial<FilterValues>;
};

/**
 * EL Client filter definition
 */
type ClientFilter = {
  id: string;
  name: string;
  value: string;
};

/**
 * Check if a preset is currently active based on current filters
 */
function isPresetActive(preset: QuickFilterPreset, currentFilters: FilterValues): boolean {
  const presetFilters = preset.filters;

  if (presetFilters.durationMin !== undefined) {
    const currentDuration = currentFilters.durationMin ?? DEFAULT_DURATION_MIN;
    if (currentDuration !== presetFilters.durationMin) return false;
  }

  if (presetFilters.status !== undefined) {
    if (currentFilters.status !== presetFilters.status) return false;
  }

  if (presetFilters.gasUsedMin !== undefined) {
    if (currentFilters.gasUsedMin !== presetFilters.gasUsedMin) return false;
  }

  if (presetFilters.txCountMin !== undefined) {
    if (currentFilters.txCountMin !== presetFilters.txCountMin) return false;
  }

  return true;
}

// Core presets shown on all screen sizes
const CORE_PRESETS: QuickFilterPreset[] = [
  {
    id: 'slow-500ms',
    label: '500ms+',
    description: 'Payloads taking 500ms or longer',
    icon: <ClockIcon className="size-4 text-yellow-500" />,
    filters: { durationMin: 500 },
  },
  {
    id: 'slow-1s',
    label: '1s+',
    description: 'Payloads taking 1 second or longer',
    icon: <ClockIcon className="size-4 text-orange-500" />,
    filters: { durationMin: 1000 },
  },
  {
    id: 'failures',
    label: 'Failures',
    description: 'INVALID or ERROR status only',
    icon: <XCircleIcon className="size-4 text-red-500" />,
    filters: { status: 'INVALID,ERROR' },
  },
];

// Additional presets hidden on mobile
const EXTRA_PRESETS: QuickFilterPreset[] = [
  {
    id: 'high-gas',
    label: '50M+ Gas',
    description: 'Blocks using 50M+ gas',
    icon: <FireIcon className="size-4 text-amber-500" />,
    filters: { gasUsedMin: 50_000_000 },
  },
  {
    id: 'many-txs',
    label: '300+ Txs',
    description: 'Blocks with 300+ transactions',
    icon: <QueueListIcon className="size-4 text-blue-500" />,
    filters: { txCountMin: 300 },
  },
];

const EL_CLIENTS: ClientFilter[] = [
  { id: 'geth', name: 'Geth', value: 'go-ethereum' },
  { id: 'nethermind', name: 'Nethermind', value: 'Nethermind' },
  { id: 'besu', name: 'Besu', value: 'Besu' },
  { id: 'erigon', name: 'Erigon', value: 'erigon' },
  { id: 'reth', name: 'Reth', value: 'Reth' },
];

type QuickFiltersProps = {
  currentFilters: FilterValues;
  onApplyPreset: (filters: Partial<FilterValues>) => void;
  onClearFilters: () => void;
  // Live mode props
  isLive?: boolean;
  onLiveModeToggle?: () => void;
};

/**
 * Unified toolbar with quick filters, live toggle, and reference nodes
 */
export function QuickFilters({
  currentFilters,
  onApplyPreset,
  onClearFilters,
  isLive,
  onLiveModeToggle,
}: QuickFiltersProps): JSX.Element {
  const handlePresetClick = (preset: QuickFilterPreset): void => {
    if (isPresetActive(preset, currentFilters)) {
      onClearFilters();
    } else {
      onApplyPreset(preset.filters);
    }
  };

  const handleClientClick = (client: ClientFilter): void => {
    const currentClients = currentFilters.elClient?.split(',') ?? [];
    const isSelected = currentClients.includes(client.value);

    if (isSelected) {
      const newClients = currentClients.filter(c => c !== client.value);
      onApplyPreset({ elClient: newClients.length > 0 ? newClients.join(',') : undefined });
    } else {
      const newClients = [...currentClients, client.value];
      onApplyPreset({ elClient: newClients.join(',') });
    }
  };

  const isClientSelected = (client: ClientFilter): boolean => {
    const currentClients = currentFilters.elClient?.split(',') ?? [];
    return currentClients.includes(client.value);
  };

  const isReferenceNodesActive = currentFilters.referenceNodes ?? true;

  const handleReferenceNodesToggle = (): void => {
    onApplyPreset({ referenceNodes: !isReferenceNodesActive });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Live mode toggle */}
      {onLiveModeToggle && (
        <>
          <button
            type="button"
            onClick={onLiveModeToggle}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              isLive
                ? 'bg-green-500/20 text-green-400 ring-2 ring-green-500/30'
                : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
            )}
          >
            {isLive ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
                <PauseIcon className="size-3.5" />
                <span>Live</span>
              </>
            ) : (
              <>
                <PlayIcon className="size-3.5" />
                <span>Go Live</span>
              </>
            )}
          </button>
          <div className="hidden h-5 w-px bg-border sm:block" />
        </>
      )}

      {/* Core Presets - always visible */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CORE_PRESETS.map(preset => {
          const isActive = isPresetActive(preset, currentFilters);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              title={preset.description}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          );
        })}
        {/* Extra Presets - hidden on mobile */}
        {EXTRA_PRESETS.map(preset => {
          const isActive = isPresetActive(preset, currentFilters);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              title={preset.description}
              className={clsx(
                'hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:inline-flex',
                isActive
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* EL Clients - hidden on mobile */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <div className="h-5 w-px bg-border" />
        {EL_CLIENTS.map(client => {
          const isActive = isClientSelected(client);
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => handleClientClick(client)}
              title={`Filter by ${client.name}`}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              <ClientLogo client={client.id} size={14} />
              <span>{client.name}</span>
            </button>
          );
        })}
      </div>

      {/* Reference Nodes toggle - hidden on mobile */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <div className="h-5 w-px bg-border" />
        <button
          type="button"
          onClick={handleReferenceNodesToggle}
          title={isReferenceNodesActive ? 'Showing EIP-7870 reference nodes only' : 'Showing all nodes'}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            isReferenceNodesActive
              ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
              : 'bg-surface ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
          )}
        >
          <BeakerIcon className="size-4" />
          <span>Reference</span>
        </button>
      </div>
    </div>
  );
}
