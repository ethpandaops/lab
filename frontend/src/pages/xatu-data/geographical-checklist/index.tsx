import { useState, useEffect } from 'react';
import { useNetwork } from '@/stores/appStore';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDistanceToNow } from 'date-fns';
import { NetworkSelector } from '@/components/common/NetworkSelector';
import { Search, ChevronDown, ChevronUp, Check, Globe, MapPin, Users } from 'lucide-react';
import CONTINENT_TO_COUNTRIES from '@/constants/countries.ts';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { aggregateNodesByCountry } from '@/utils/transformers';

// Types
interface Country {
  total_nodes: number;
  public_nodes: number;
}

// Constants
const MS_PER_SECOND = 1000;

// Continent metadata with colors and emoji flags
const CONTINENT_METADATA: Record<string, { name: string; emoji: string; color: string }> = {
  Africa: { name: 'Africa', emoji: '🌍', color: 'hsl(120, 80%, 40%)' },
  Asia: { name: 'Asia', emoji: '🌏', color: 'hsl(0, 80%, 50%)' },
  Europe: { name: 'Europe', emoji: '🌍', color: 'hsl(240, 80%, 60%)' },
  'North America': { name: 'North America', emoji: '🌎', color: 'hsl(40, 80%, 50%)' },
  'South America': { name: 'South America', emoji: '🌎', color: 'hsl(60, 80%, 40%)' },
  Oceania: { name: 'Oceania', emoji: '🌏', color: 'hsl(180, 80%, 40%)' },
};

// Filter out Antarctica from the country mapping
const filteredContinentToCountries = { ...CONTINENT_TO_COUNTRIES };
delete filteredContinentToCountries['Antarctica'];

// Generate country to continent mapping from filtered CONTINENT_TO_COUNTRIES
const COUNTRY_TO_CONTINENT: Record<string, string> = {};
Object.entries(filteredContinentToCountries).forEach(([continent, countries]) => {
  countries.forEach(country => {
    COUNTRY_TO_CONTINENT[country] = continent;
  });
});

// Small override map for countries where the simple algorithm doesn't work
const COUNTRY_CODE_OVERRIDES: Record<string, string> = {
  Poland: 'PL',
  Bulgaria: 'BG',
  Portugal: 'PT',
  'United Kingdom': 'GB',
  Czechia: 'CZ',
  'Czech Republic': 'CZ',
  'South Africa': 'ZA',
  'United Arab Emirates': 'AE',
  Switzerland: 'CH',
  Greece: 'GR',
  Denmark: 'DK',
  Sweden: 'SE',
  Croatia: 'HR',
  Slovenia: 'SI',
  Slovakia: 'SK',
  Serbia: 'RS',
  'North Macedonia': 'MK',
  'Bosnia and Herzegovina': 'BA',
  'Dominican Republic': 'DO',
  'El Salvador': 'SV',
  'Costa Rica': 'CR',
  'Sri Lanka': 'LK',
  'Burkina Faso': 'BF',
  'Ivory Coast': 'CI',
  'Sierra Leone': 'SL',
  'Cape Verde': 'CV',
  'South Sudan': 'SS',
  'Central African Republic': 'CF',
  'Equatorial Guinea': 'GQ',
  'Democratic Republic of the Congo': 'CD',
  'Sao Tome and Principe': 'ST',
  'Guinea-Bissau': 'GW',
  'Western Sahara': 'EH',
};

// Get country emoji flag
const getCountryEmoji = (countryName: string) => {
  // Check for override first
  const override = COUNTRY_CODE_OVERRIDES[countryName];
  if (override) {
    const codePoints = override
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  // Use simple algorithm: first letter of each word for multi-word countries,
  // or first 2 letters for single-word countries
  const code = countryName.includes(' ')
    ? countryName
        .split(' ')
        .map(word => word[0])
        .join('')
    : countryName.substring(0, 2);

  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
};

const GeographicalChecklist = () => {
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set([])); // All collapsed by default

  // Fetch nodes data using REST API
  const {
    data: networkData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['xatu-data-geographical', selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork);
      const nodes = response.nodes;

      // Build aggregated data
      const countries = aggregateNodesByCountry(nodes);

      return {
        countries,
        updated_at: Date.now() / 1000,
      };
    },
    enabled: !!selectedNetwork,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Auto-expand continents that match the search term
  useEffect(() => {
    if (!searchTerm || !networkData) return;

    const newExpandedContinents = new Set(expandedContinents);
    let hasChanges = false;

    Object.keys(CONTINENT_METADATA).forEach(continent => {
      // Skip Antarctica
      if (continent === 'Antarctica') return;

      const matchesContinent = continent.toLowerCase().includes(searchTerm.toLowerCase());

      // Check if any country in this continent matches
      const matchesCountry = Object.keys(networkData.countries || {}).some(country => {
        const countryContinent = COUNTRY_TO_CONTINENT[country];
        return (
          countryContinent === continent && country.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      if ((matchesContinent || matchesCountry) && !newExpandedContinents.has(continent)) {
        newExpandedContinents.add(continent);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setExpandedContinents(newExpandedContinents);
    }
  }, [searchTerm, networkData, expandedContinents]);

  // Handle loading and error states
  if (error) return <ErrorState message="Failed to load geographical data" />;
  if (isLoading) return <LoadingState message="Loading..." />;
  if (!networkData) return <LoadingState message="Loading..." />;

  // Group countries by continent
  const countriesByContinent: Record<string, Array<{ name: string; data: Country }>> = {};

  // Initialize continents
  Object.keys(CONTINENT_METADATA).forEach(continent => {
    countriesByContinent[continent] = [];
  });

  // Group countries
  Object.entries(networkData.countries).forEach(([countryName, countryData]) => {
    const continent = COUNTRY_TO_CONTINENT[countryName] || 'Unknown';

    if (!countriesByContinent[continent]) {
      countriesByContinent[continent] = [];
    }

    countriesByContinent[continent].push({
      name: countryName,
      data: countryData,
    });
  });

  // Sort countries within each continent by total nodes (descending)
  Object.keys(countriesByContinent).forEach(continent => {
    countriesByContinent[continent].sort((a, b) => b.data.total_nodes - a.data.total_nodes);
  });

  // Filter continents and countries based on search term
  const filteredContinents = Object.keys(countriesByContinent)
    .filter(continent => {
      if (!searchTerm) return true;

      // Check if continent name matches
      if (continent.toLowerCase().includes(searchTerm.toLowerCase())) return true;

      // Check if any country in this continent matches
      return countriesByContinent[continent].some(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    })
    .sort((a, b) => {
      // Sort by total nodes (sum of all countries in continent)
      const totalNodesA = countriesByContinent[a].reduce(
        (sum, country) => sum + country.data.total_nodes,
        0,
      );
      const totalNodesB = countriesByContinent[b].reduce(
        (sum, country) => sum + country.data.total_nodes,
        0,
      );
      return totalNodesB - totalNodesA;
    });

  // Toggle continent expansion
  const toggleContinent = (continent: string) => {
    const newExpanded = new Set(expandedContinents);
    if (newExpanded.has(continent)) {
      newExpanded.delete(continent);
    } else {
      newExpanded.add(continent);
    }
    setExpandedContinents(newExpanded);
  };

  // Calculate coverage statistics
  const totalContinents = Object.keys(CONTINENT_METADATA).length;
  const coveredContinents = Object.keys(CONTINENT_METADATA).filter(continent => {
    const totalNodesInContinent =
      countriesByContinent[continent]?.reduce(
        (sum, country) => sum + country.data.total_nodes,
        0,
      ) || 0;
    return totalNodesInContinent > 0;
  }).length;
  const continentCoverage = (coveredContinents / totalContinents) * 100;

  // Calculate country coverage using the filtered list from CONTINENT_TO_COUNTRIES
  const totalCountries = Object.values(filteredContinentToCountries).flat().length;
  const coveredCountries = Object.keys(networkData.countries).length;
  const countryCoverage = (coveredCountries / totalCountries) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative z-10 bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm overflow-visible">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-sans font-bold text-primary">Geographical Checklist</h2>
            <p className="text-xs font-mono text-secondary mt-1">
              Last updated{' '}
              {formatDistanceToNow(new Date(networkData.updated_at * MS_PER_SECOND), {
                addSuffix: true,
              })}
            </p>
          </div>
          <NetworkSelector
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            className="w-48"
          />
        </div>
      </div>

      {/* Search and Coverage Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search Box */}
        <div className="lg:col-span-1">
          <div className="flex flex-col">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <Search className="h-4 w-4 text-secondary" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search countries..."
                className="w-full rounded-lg bg-white/10 backdrop-blur-sm border border-subtle pl-11 pr-4 py-3 text-sm font-mono text-white placeholder-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200 hover:bg-white/15 hover:border-subtle/70"
              />
            </div>
            <div className="mt-2 text-xs font-mono text-tertiary/50 pl-1">
              Search by country or continent name
            </div>
          </div>
        </div>

        {/* Coverage Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {/* Country Coverage Card */}
          <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-surface/60 to-surface/40 backdrop-blur-sm border border-subtle hover:border-accent/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-accent/70" />
                    <p className="text-xs font-mono text-tertiary uppercase tracking-wider">
                      Country Coverage
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                      {countryCoverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-mono text-secondary">
                      {coveredCountries} of {totalCountries} countries
                    </span>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-surface/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full transition-all duration-500"
                  style={{ width: `${countryCoverage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Continent Coverage Card */}
          <div className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-surface/60 to-surface/40 backdrop-blur-sm border border-subtle hover:border-success/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-success/70" />
                    <p className="text-xs font-mono text-tertiary uppercase tracking-wider">
                      Continent Coverage
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold bg-gradient-to-r from-success to-success/70 bg-clip-text text-transparent">
                      {continentCoverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-mono text-secondary">
                      {coveredContinents} of {totalContinents} continents
                    </span>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-surface/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500"
                  style={{ width: `${continentCoverage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continents and Countries */}
      <div className="space-y-3">
        {searchTerm && filteredContinents.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface/50 border border-subtle mb-4">
              <Search className="h-6 w-6 text-tertiary/50" />
            </div>
            <h3 className="text-lg font-sans font-medium text-primary mb-2">No results found</h3>
            <p className="text-sm font-mono text-tertiary">
              No countries or continents match "<span className="text-accent">{searchTerm}</span>"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 text-xs font-mono bg-surface/50 hover:bg-surface/70 text-secondary hover:text-primary border border-subtle rounded-lg transition-colors duration-200"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredContinents.map(continent => {
            const continentData = countriesByContinent[continent] || [];
            const isExpanded = expandedContinents.has(continent);
            const continentMeta = CONTINENT_METADATA[continent];
            const totalNodesInContinent = continentData.reduce(
              (sum, country) => sum + country.data.total_nodes,
              0,
            );
            const hasCoverage = totalNodesInContinent > 0;

            // Filter countries based on search term
            const filteredCountries = searchTerm
              ? continentData.filter(country =>
                  country.name.toLowerCase().includes(searchTerm.toLowerCase()),
                )
              : continentData;

            // For expanded continents with search, only show top covered countries and those matching search
            const displayCountries = isExpanded ? filteredCountries : [];

            return (
              <div
                key={continent}
                className={`group relative rounded-xl border transition-all duration-300 ${
                  hasCoverage
                    ? 'bg-surface/50 backdrop-blur-sm border-subtle hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5'
                    : 'bg-surface/20 border-subtle/50 opacity-60'
                } overflow-hidden`}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Continent Header */}
                <div
                  className="relative p-4 flex items-center justify-between cursor-pointer transition-colors duration-200 hover:bg-surface/30"
                  onClick={() => toggleContinent(continent)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm transition-transform duration-200 group-hover:scale-110"
                      style={{
                        backgroundColor: `${continentMeta.color}20`,
                        boxShadow: `0 2px 8px ${continentMeta.color}10`,
                      }}
                    >
                      {continentMeta.emoji}
                    </div>
                    <div>
                      <h3 className="text-base font-sans font-semibold text-primary flex items-center gap-2">
                        {continentMeta.name}
                        {hasCoverage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-success/10 text-success border border-success/20">
                            Active
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs font-mono text-tertiary">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {continentData.filter(country => country.data.total_nodes > 0).length}{' '}
                            countries
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-accent">
                          <Users className="h-3 w-3" />
                          <span>
                            {totalNodesInContinent.toLocaleString()}{' '}
                            {totalNodesInContinent === 1 ? 'node' : 'nodes'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isExpanded
                          ? 'bg-accent/10 text-accent rotate-180'
                          : 'bg-surface/50 text-tertiary hover:bg-surface/70'
                      }`}
                    >
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </div>
                  </div>
                </div>

                {/* Countries List (shown when expanded) */}
                {isExpanded && (
                  <div className="border-t border-subtle/20 bg-surface/20">
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-accent/20 scrollbar-track-transparent">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                        {displayCountries.map(country => {
                          const hasNodes = country.data.total_nodes > 0;
                          return (
                            <div
                              key={country.name}
                              className={`group relative rounded-lg p-3 flex items-center gap-3 transition-all duration-200 ${
                                hasNodes
                                  ? 'bg-surface/40 hover:bg-surface/60 hover:shadow-sm border border-subtle/30 hover:border-accent/20'
                                  : 'bg-surface/20 opacity-60 border border-subtle/10'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-md bg-surface/50 flex items-center justify-center text-base shadow-sm">
                                {getCountryEmoji(country.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-sans ${hasNodes ? 'text-primary font-medium' : 'text-tertiary'}`}
                                >
                                  {country.name}
                                </div>
                                {hasNodes && (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                      <span className="text-xs font-mono text-accent">
                                        {country.data.total_nodes}{' '}
                                        {country.data.total_nodes === 1 ? 'node' : 'nodes'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {hasNodes && (
                                <Check className="h-4 w-4 text-success opacity-60 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Data Note */}
      <div className="text-center py-4">
        <p className="text-xs font-mono text-tertiary">
          Note: This data represents only nodes sending data to the Xatu project and is not
          representative of the total network.
        </p>
      </div>
    </div>
  );
};

export default GeographicalChecklist;
