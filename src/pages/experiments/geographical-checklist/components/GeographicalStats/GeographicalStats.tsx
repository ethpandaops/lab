import type { JSX } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import { GlobeAltIcon, MapPinIcon, FlagIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import type { GeographicalStatsProps } from './GeographicalStats.types';

export function GeographicalStats({ stats, isLoading }: GeographicalStatsProps): JSX.Element {
  if (isLoading) {
    return <div className="h-32">Loading stats...</div>;
  }

  const statItems = [
    {
      id: 'nodes',
      name: 'Total Nodes',
      value: stats.totalNodes.toString(),
      icon: GlobeAltIcon,
    },
    {
      id: 'continents',
      name: 'Continents',
      value: stats.totalContinents.toString(),
      icon: FlagIcon,
    },
    {
      id: 'countries',
      name: 'Countries',
      value: stats.totalCountries.toString(),
      icon: MapPinIcon,
    },
    {
      id: 'cities',
      name: 'Cities',
      value: stats.totalCities.toString(),
      icon: BuildingOfficeIcon,
    },
  ];

  return <Stats stats={statItems} />;
}
