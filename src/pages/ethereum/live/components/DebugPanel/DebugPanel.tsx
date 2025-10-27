import { type JSX } from 'react';
import clsx from 'clsx';
import { useDebug } from '../../hooks/useDebug';
import { Toggle } from '@/components/Forms/Toggle';
import { Button } from '@/components/Elements/Button';
import type { DebugPanelProps } from './DebugPanel.types';

/**
 * Debug panel for performance diagnostics.
 *
 * Allows toggling individual API queries on/off to identify performance bottlenecks.
 * Shows current FPS and provides bulk enable/disable controls.
 */
export function DebugPanel({ currentFps }: DebugPanelProps): JSX.Element {
  const {
    isDebugVisible,
    toggleDebugPanel,
    enabledQueries,
    enabledSections,
    toggleQuery,
    toggleSection,
    enableAllQueries,
    disableAllQueries,
    enableAllSections,
    disableAllSections,
  } = useDebug();

  // Calculate how many queries are enabled
  const enabledQueriesCount = Object.values(enabledQueries).filter(Boolean).length;
  const totalQueriesCount = Object.keys(enabledQueries).length;

  // Calculate how many sections are enabled
  const enabledSectionsCount = Object.values(enabledSections).filter(Boolean).length;
  const totalSectionsCount = Object.keys(enabledSections).length;

  return (
    <div className="w-full border-b border-border bg-surface">
      {/* Header Bar - Always Visible */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleDebugPanel}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
          >
            <span className="text-xs">🔧</span>
            <span>Debug Panel</span>
            <span className={clsx('transition-transform', isDebugVisible ? 'rotate-180' : '')}>▼</span>
          </button>

          {currentFps !== undefined && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">FPS:</span>
              <span
                className={clsx(
                  'font-mono font-medium',
                  currentFps >= 55 ? 'text-success' : currentFps >= 30 ? 'text-warning' : 'text-danger'
                )}
              >
                {currentFps.toFixed(1)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              {enabledQueriesCount}/{totalQueriesCount} queries
            </span>
            <span className="text-border">|</span>
            <span>
              {enabledSectionsCount}/{totalSectionsCount} sections
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isDebugVisible && (
        <div className="border-t border-border px-4 py-3">
          {/* API Queries Section */}
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">API Queries</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={enableAllQueries}>
                  Enable All
                </Button>
                <Button size="sm" variant="secondary" onClick={disableAllQueries}>
                  Disable All
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">
              Control which API queries are called to identify data fetch bottlenecks
            </p>

            <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-x-3 gap-y-3">
              {/* Block Data Queries */}
              <span className="text-xs text-foreground">Block Head</span>
              <Toggle
                checked={enabledQueries.blockHead}
                onChange={() => toggleQuery('blockHead')}
                size="small"
                srLabel="Toggle Block Head query"
              />

              <span className="text-xs text-foreground">Block Proposer</span>
              <Toggle
                checked={enabledQueries.blockProposer}
                onChange={() => toggleQuery('blockProposer')}
                size="small"
                srLabel="Toggle Block Proposer query"
              />

              <span className="text-xs text-foreground">Block MEV</span>
              <Toggle
                checked={enabledQueries.blockMev}
                onChange={() => toggleQuery('blockMev')}
                size="small"
                srLabel="Toggle Block MEV query"
              />

              <span className="text-xs text-foreground">Blob Count</span>
              <Toggle
                checked={enabledQueries.blobCount}
                onChange={() => toggleQuery('blobCount')}
                size="small"
                srLabel="Toggle Blob Count query"
              />

              {/* Propagation Queries */}
              <span className="text-xs text-foreground">Block Propagation</span>
              <Toggle
                checked={enabledQueries.blockFirstSeen}
                onChange={() => toggleQuery('blockFirstSeen')}
                size="small"
                srLabel="Toggle Block Propagation query"
              />

              <span className="text-xs text-foreground">Blob Propagation</span>
              <Toggle
                checked={enabledQueries.blobFirstSeen}
                onChange={() => toggleQuery('blobFirstSeen')}
                size="small"
                srLabel="Toggle Blob Propagation query"
              />

              <span className="text-xs text-foreground">Attestations</span>
              <Toggle
                checked={enabledQueries.attestation}
                onChange={() => toggleQuery('attestation')}
                size="small"
                srLabel="Toggle Attestation query"
              />

              <span className="text-xs text-foreground">Committees</span>
              <Toggle
                checked={enabledQueries.committee}
                onChange={() => toggleQuery('committee')}
                size="small"
                srLabel="Toggle Committee query"
              />

              {/* MEV Queries */}
              <span className="text-xs text-foreground">MEV Bidding</span>
              <Toggle
                checked={enabledQueries.mevBidding}
                onChange={() => toggleQuery('mevBidding')}
                size="small"
                srLabel="Toggle MEV Bidding query"
              />

              <span className="text-xs text-foreground">Relay Bids</span>
              <Toggle
                checked={enabledQueries.relayBids}
                onChange={() => toggleQuery('relayBids')}
                size="small"
                srLabel="Toggle Relay Bids query"
              />
            </div>
          </div>

          {/* UI Sections Section */}
          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">UI Sections</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={enableAllSections}>
                  Enable All
                </Button>
                <Button size="sm" variant="secondary" onClick={disableAllSections}>
                  Disable All
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-muted">
              Control which components are rendered to identify render/transform bottlenecks
            </p>

            <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto_auto_auto] items-center gap-x-3 gap-y-3">
              <span className="text-xs text-foreground">Block Details</span>
              <Toggle
                checked={enabledSections.blockDetails}
                onChange={() => toggleSection('blockDetails')}
                size="small"
                srLabel="Toggle Block Details section"
              />

              <span className="text-xs text-foreground">Map</span>
              <Toggle
                checked={enabledSections.map}
                onChange={() => toggleSection('map')}
                size="small"
                srLabel="Toggle Map section"
              />

              <span className="text-xs text-foreground">Sidebar</span>
              <Toggle
                checked={enabledSections.sidebar}
                onChange={() => toggleSection('sidebar')}
                size="small"
                srLabel="Toggle Sidebar section"
              />

              <span className="text-xs text-foreground">Blob Availability</span>
              <Toggle
                checked={enabledSections.blobAvailability}
                onChange={() => toggleSection('blobAvailability')}
                size="small"
                srLabel="Toggle Blob Availability section"
              />

              <span className="text-xs text-foreground">Attestation Arrivals</span>
              <Toggle
                checked={enabledSections.attestationArrivals}
                onChange={() => toggleSection('attestationArrivals')}
                size="small"
                srLabel="Toggle Attestation Arrivals section"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
