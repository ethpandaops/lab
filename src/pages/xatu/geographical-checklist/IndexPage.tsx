import type { JSX } from 'react';
import { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { useGeographicalData } from './hooks/useGeographicalData';
import { useFilteredInsights } from './hooks/useFilteredInsights';
import { getCountryFlag } from './hooks/useGeographicalData/utils';
import type {
  LocationStats,
  ContinentCode,
  ContinentData,
} from './hooks/useGeographicalData/useGeographicalData.types';
import { GeographicalStats } from './components/GeographicalStats';
import { GeographicalFilters } from './components/GeographicalFilters';
import { GeographicalMapView } from './components/GeographicalMapView';
import { GeographicalListView } from './components/GeographicalListView';
import { GeographicalChecklistSkeleton } from './components/GeographicalChecklistSkeleton';
import { InsightsDialog } from './components/InsightsDialog';
import { DEFAULT_FILTERS } from './constants';
import type { GeographicalFiltersFormData } from './components/GeographicalFilters/GeographicalFilters.types';

export function IndexPage(): JSX.Element {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [isInsightsDialogOpen, setIsInsightsDialogOpen] = useState(false);

  // Data fetching
  const { continents, stats, allNodes, isLoading, error } = useGeographicalData();

  // Form setup
  const methods = useForm<GeographicalFiltersFormData>({
    defaultValues: DEFAULT_FILTERS,
  });

  const { watch } = methods;
  const filters = watch();

  // Compute all available countries for filter
  const availableCountries = useMemo((): LocationStats[] => {
    const countriesMap = new Map<string, { name: string; code: string; count: number }>();
    Array.from(continents.values()).forEach(continent => {
      Array.from(continent.countries.values()).forEach(country => {
        const existing = countriesMap.get(country.code);
        if (existing) {
          existing.count += country.totalNodes;
        } else {
          countriesMap.set(country.code, {
            name: country.name,
            code: country.code,
            count: country.totalNodes,
          });
        }
      });
    });
    return Array.from(countriesMap.values())
      .sort((a, b) => b.count - a.count)
      .map(c => ({
        name: c.name,
        code: c.code,
        count: c.count,
        emoji: getCountryFlag(c.code),
      }));
  }, [continents]);

  // Apply filters
  const filteredNodes = useMemo(() => {
    let filtered = allNodes;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        node =>
          node.username?.toLowerCase().includes(searchLower) ||
          node.meta_client_geo_city?.toLowerCase().includes(searchLower) ||
          node.meta_client_geo_country?.toLowerCase().includes(searchLower)
      );
    }

    // Continent filter
    if (filters.continent !== 'all') {
      filtered = filtered.filter(node => node.continentCode === filters.continent);
    }

    // Country filter
    if (filters.country && filters.country !== 'all') {
      filtered = filtered.filter(
        node =>
          node.meta_client_geo_country_code === filters.country || node.meta_client_geo_country === filters.country
      );
    }

    // Client implementation filter
    if (filters.clientImplementation && filters.clientImplementation !== 'all') {
      filtered = filtered.filter(node => node.meta_consensus_implementation === filters.clientImplementation);
    }

    return filtered;
  }, [allNodes, filters]);

  // Rebuild continents map based on filtered nodes
  const filteredContinents = useMemo(() => {
    const filteredMap = new Map<ContinentCode, ContinentData>();

    filteredNodes.forEach(node => {
      const continentCode = node.continentCode;
      const countryCode = node.meta_client_geo_country_code || 'UNKNOWN';
      const countryName = node.meta_client_geo_country || 'Unknown';
      const cityName = node.meta_client_geo_city || 'Unknown';
      const lon = node.meta_client_geo_longitude ?? 0;
      const lat = node.meta_client_geo_latitude ?? 0;

      // Get or create continent
      if (!filteredMap.has(continentCode)) {
        const originalContinent = continents.get(continentCode);
        if (originalContinent) {
          filteredMap.set(continentCode, {
            code: continentCode,
            name: originalContinent.name,
            emoji: originalContinent.emoji,
            color: originalContinent.color,
            countries: new Map(),
            totalNodes: 0,
            totalCountries: 0,
            totalCities: 0,
          });
        }
      }
      const continent = filteredMap.get(continentCode);
      if (!continent) return;

      continent.totalNodes++;

      // Get or create country
      if (!continent.countries.has(countryCode)) {
        continent.countries.set(countryCode, {
          name: countryName,
          code: countryCode,
          emoji: node.countryFlag,
          cities: new Map(),
          totalNodes: 0,
        });
        continent.totalCountries++;
      }
      const country = continent.countries.get(countryCode)!;
      country.totalNodes++;

      // Get or create city
      if (!country.cities.has(cityName)) {
        country.cities.set(cityName, {
          name: cityName,
          countryName,
          countryCode,
          coords: [lon, lat],
          nodes: [],
        });
        continent.totalCities++;
      }
      const city = country.cities.get(cityName)!;
      city.nodes.push(node);
    });

    return filteredMap;
  }, [continents, filteredNodes]);

  // Compute filtered insights data (client distribution, top countries/cities)
  const filteredInsights = useFilteredInsights(filteredNodes);

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Geographical Checklist"
          description="Explore the global distribution of Contributoor nodes across continents, countries, and cities."
        />
        <GeographicalChecklistSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Geographical Checklist" />
        <div className="text-error py-12 text-center">Error loading data: {error.message}</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Geographical Checklist"
        description="Explore the global distribution of Contributoor nodes across continents, countries, and cities."
      />

      <div className="space-y-6">
        {/* Stats */}
        <GeographicalStats stats={stats} isLoading={isLoading} />

        {/* Filters with View Mode Toggle */}
        <FormProvider {...methods}>
          <GeographicalFilters
            availableClients={stats.byClientImplementation}
            availableCountries={availableCountries}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onInsightsClick={() => setIsInsightsDialogOpen(true)}
          />
        </FormProvider>

        {/* Insights Dialog */}
        <InsightsDialog
          open={isInsightsDialogOpen}
          onClose={() => setIsInsightsDialogOpen(false)}
          clientData={filteredInsights.clientData}
          topCountries={filteredInsights.topCountries}
          topCities={filteredInsights.topCities}
          isLoading={isLoading}
        />

        {/* Content */}
        {viewMode === 'map' ? (
          <Card>
            <GeographicalMapView nodes={filteredNodes} isLoading={isLoading} />
          </Card>
        ) : (
          <GeographicalListView continents={filteredContinents} isLoading={isLoading} />
        )}
      </div>
    </Container>
  );
}
