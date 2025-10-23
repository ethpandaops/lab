import type { JSX } from 'react';
import { useState } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';
import { Card } from '@/components/Layout/Card';
import type { InsightsDialogProps } from './InsightsDialog.types';

export function InsightsDialog({
  open,
  onClose,
  clientData,
  topCountries,
  topCities,
  isLoading,
}: InsightsDialogProps): JSX.Element {
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const displayedCountries = showAllCountries ? topCountries : topCountries.slice(0, 5);
  const displayedCities = showAllCities ? topCities : topCities.slice(0, 5);

  return (
    <Dialog open={open} onClose={onClose} title="Data Insights" size="full" className="max-h-[90vh]">
      <div className="max-h-[calc(90vh-8rem)] space-y-6 overflow-y-auto">
        {/* Client Implementation Distribution */}
        <div>
          <h3 className="mb-4 text-base/6 font-semibold text-foreground">Client Implementation Distribution</h3>
          {isLoading ? (
            <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
                  <div className="h-4 animate-pulse rounded-sm bg-muted" />
                </div>
              ))}
            </div>
          ) : clientData.length === 0 ? (
            <p className="text-sm text-muted">No client data available</p>
          ) : (
            <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
              {clientData.map(client => (
                <div key={client.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{client.name}</span>
                    <span className="text-muted">
                      {client.count} ({client.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${client.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Locations - Side by side */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Countries */}
          <Card className="h-fit">
            <div className="space-y-4">
              <h3 className="text-base/6 font-semibold text-foreground">Top Countries</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : topCountries.length === 0 ? (
                <p className="text-sm text-muted">No country data available</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {displayedCountries.map((country, index) => (
                      <div
                        key={country.code}
                        className="flex h-12 items-center justify-between rounded-lg bg-surface px-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted">#{index + 1}</span>
                          <span className="text-xl">{country.emoji}</span>
                          <span className="text-sm font-medium text-foreground">{country.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-primary">{country.count} nodes</span>
                      </div>
                    ))}
                  </div>
                  {topCountries.length > 5 && (
                    <button
                      onClick={() => setShowAllCountries(!showAllCountries)}
                      className="group flex w-full items-center gap-3 text-sm text-muted transition-colors hover:text-foreground"
                    >
                      <div className="h-px flex-1 bg-border transition-colors group-hover:bg-muted" />
                      <span>{showAllCountries ? 'Show less' : `Show ${topCountries.length - 5} more`}</span>
                      <div className="h-px flex-1 bg-border transition-colors group-hover:bg-muted" />
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Top Cities */}
          <Card className="h-fit">
            <div className="space-y-4">
              <h3 className="text-base/6 font-semibold text-foreground">Top Cities</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : topCities.length === 0 ? (
                <p className="text-sm text-muted">No city data available</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {displayedCities.map((city, index) => (
                      <div
                        key={city.name}
                        className="flex h-12 items-center justify-between rounded-lg bg-surface px-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted">#{index + 1}</span>
                          <span className="text-sm font-medium text-foreground">{city.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-primary">{city.count} nodes</span>
                      </div>
                    ))}
                  </div>
                  {topCities.length > 5 && (
                    <button
                      onClick={() => setShowAllCities(!showAllCities)}
                      className="group flex w-full items-center gap-3 text-sm text-muted transition-colors hover:text-foreground"
                    >
                      <div className="h-px flex-1 bg-border transition-colors group-hover:bg-muted" />
                      <span>{showAllCities ? 'Show less' : `Show ${topCities.length - 5} more`}</span>
                      <div className="h-px flex-1 bg-border transition-colors group-hover:bg-muted" />
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Dialog>
  );
}
