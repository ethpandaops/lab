import type { JSX } from 'react';
import { Disclosure } from '@/components/Layout/Disclosure';
import { Table } from '@/components/Lists/Table';
import type { GeographicalListViewProps } from './GeographicalListView.types';
import type { Column } from '@/components/Lists/Table/Table.types';
import type { ProcessedNode } from '../../hooks/useGeographicalData/useGeographicalData.types';
import { getClassificationBadgeClasses, getRelativeTime } from '@/utils';

export function GeographicalListView({ continents, isLoading }: GeographicalListViewProps): JSX.Element {
  if (isLoading) {
    return <div className="py-8 text-center">Loading data...</div>;
  }

  if (continents.size === 0) {
    return <div className="py-12 text-center text-muted">No nodes found matching your filters.</div>;
  }

  const nodeColumns: Column<ProcessedNode>[] = [
    {
      header: 'Location',
      accessor: node => {
        const city = node.meta_client_geo_city;
        const country = node.meta_client_geo_country;
        const location = city ? `${city}, ${country}` : country;

        return (
          <div className="flex items-center gap-2">
            <span>{node.countryFlag}</span>
            <span>{location}</span>
          </div>
        );
      },
      cellClassName: 'text-muted',
    },
    {
      header: 'Username',
      accessor: node => node.username || 'Unknown',
      cellClassName: 'text-muted',
    },
    {
      header: 'Classification',
      accessor: node => (
        <span
          className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium inset-ring ${getClassificationBadgeClasses(node.classification)}`}
        >
          {node.classification}
        </span>
      ),
    },
    {
      header: 'Client',
      accessor: node => node.meta_consensus_implementation || 'Unknown',
      cellClassName: 'text-muted',
    },
    {
      header: 'Version',
      accessor: node => node.meta_consensus_version || 'Unknown',
      cellClassName: 'text-muted',
    },
    {
      header: 'Last Seen',
      accessor: node => getRelativeTime(node.last_seen_date_time),
      cellClassName: 'text-muted',
    },
  ];

  // Sort continents by node count (descending)
  const sortedContinents = Array.from(continents.entries()).sort(([, a], [, b]) => b.totalNodes - a.totalNodes);

  return (
    <div className="space-y-4">
      {sortedContinents.map(([code, continent]) => {
        // Flatten all nodes from all countries/cities
        const allContinentNodes: ProcessedNode[] = [];
        continent.countries.forEach(country => {
          country.cities.forEach(city => {
            allContinentNodes.push(...city.nodes);
          });
        });

        return (
          <Disclosure
            key={code}
            title={
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{continent.emoji}</span>
                  <span className="text-lg/7 font-semibold">{continent.name}</span>
                </div>
                <div className="flex items-center gap-6 text-xs/5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-foreground">{continent.totalNodes}</span>
                    <span className="text-muted">nodes</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-foreground">{continent.countries.size}</span>
                    <span className="text-muted">countries</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-foreground">{continent.totalCities}</span>
                    <span className="text-muted">cities</span>
                  </div>
                </div>
              </div>
            }
            className="overflow-hidden rounded-lg border border-border"
          >
            <div className="mt-4">
              <Table data={allContinentNodes} columns={nodeColumns} variant="nested" />
            </div>
          </Disclosure>
        );
      })}
    </div>
  );
}
