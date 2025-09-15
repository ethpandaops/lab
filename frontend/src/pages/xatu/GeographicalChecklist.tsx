import { useState, useEffect } from 'react';
import { useDataFetch } from '@/utils/data.ts';
import useConfig from '@/contexts/config';
import useNetwork from '@/contexts/network';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDistanceToNow } from 'date-fns';
import { NetworkSelector } from '@/components/common/NetworkSelector';
import { Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import CONTINENT_TO_COUNTRIES from '@/constants/countries.ts';
import useApi from '@/contexts/api';

// Types
interface Country {
  total_nodes: number;
  public_nodes: number;
}

interface NetworkData {
  total_nodes: number;
  total_public_nodes: number;
  countries: Record<string, Country>;
  continents: Record<string, Country>;
  cities: Record<string, Country>;
  consensus_implementations: Record<string, ConsensusImplementation>;
}

interface ConsensusImplementation {
  total_nodes: number;
  public_nodes: number;
}

interface Summary {
  updated_at: number;
  networks: {
    mainnet: NetworkData;
    sepolia: NetworkData;
    hoodi: NetworkData;
  };
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

// Get country emoji flag
const getCountryEmoji = (countryName: string) => {
  // Split on space and get first char of each word, or first 2 chars if single word
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
  const { config } = useConfig();
  const { baseUrl } = useApi();
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set([])); // All collapsed by default

  // Skip data fetching if config isn't loaded
  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix
    ? `${config.modules['xatu_public_contributors'].path_prefix}/summary.json`
    : null;

  const { data: summaryData, loading, error } = useDataFetch<Summary>(baseUrl, summaryPath);

  // Auto-expand continents that match the search term
  useEffect(() => {
    if (!searchTerm || !summaryData) return;

    const newExpandedContinents = new Set(expandedContinents);
    let hasChanges = false;

    Object.keys(CONTINENT_METADATA).forEach(continent => {
      // Skip Antarctica
      if (continent === 'Antarctica') return;

      const matchesContinent = continent.toLowerCase().includes(searchTerm.toLowerCase());

      // Check if any country in this continent matches
      const matchesCountry =
        summaryData &&
        Object.keys(
          summaryData.networks[selectedNetwork as keyof typeof summaryData.networks]?.countries ||
            {},
        ).some(country => {
          const countryContinent = COUNTRY_TO_CONTINENT[country];
          return (
            countryContinent === continent &&
            country.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [searchTerm, summaryData, selectedNetwork, expandedContinents]);

  // Handle loading and error states
  if (loading) return <LoadingState message="Loading geographical data..." />;
  if (error) return <ErrorState message="Failed to load geographical data" error={error} />;
  if (!summaryData) return <LoadingState message="Processing geographical data..." />;

  // Get network data based on selected network
  const networkData =
    summaryData.networks[selectedNetwork as keyof typeof summaryData.networks] ||
    summaryData.networks.mainnet;

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
      <div className="bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-sans font-bold text-primary">Geographical Checklist</h2>
            <p className="text-xs font-mono text-secondary mt-1">
              Last updated{' '}
              {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), {
                addSuffix: true,
              })}
            </p>
          </div>
          <NetworkSelector
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            className="bg-surface/70 rounded border border-subtle/30 text-xs"
          />
        </div>
      </div>

      {/* Search and Coverage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Search Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-tertiary" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search countries..."
            className="w-full rounded bg-surface/50 border border-subtle pl-10 pr-4 py-2 text-sm font-mono text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
          />
        </div>

        {/* Coverage Stats */}
        <div className="bg-surface/50 rounded border border-subtle p-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-mono text-tertiary">Country Coverage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-medium text-accent">
                  {countryCoverage.toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-secondary">
                  {coveredCountries}/{totalCountries}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Continent Coverage</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-medium text-accent">
                  {continentCoverage.toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-secondary">
                  {coveredContinents}/{totalContinents}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continents and Countries */}
      <div className="space-y-3">
        {filteredContinents.map(continent => {
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
              className={`bg-surface/50 rounded-lg border border-subtle overflow-hidden ${hasCoverage ? '' : 'opacity-50'}`}
            >
              {/* Continent Header */}
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-surface/70"
                onClick={() => toggleContinent(continent)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${continentMeta.color}20` }}
                  >
                    {continentMeta.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-medium text-primary">
                      {continentMeta.name}
                    </h3>
                    <div className="text-xs font-mono text-tertiary">
                      {continentData.filter(country => country.data.total_nodes > 0).length}{' '}
                      countries with nodes
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs font-mono text-accent text-right">
                    {totalNodesInContinent.toLocaleString()} nodes
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-tertiary" />
                  )}
                </div>
              </div>

              {/* Countries List (shown when expanded) */}
              {isExpanded && (
                <div className="border-t border-subtle/30">
                  <div className="max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-subtle/10">
                      {displayCountries.map(country => (
                        <div
                          key={country.name}
                          className={`p-2 flex items-center gap-2 ${country.data.total_nodes > 0 ? 'bg-surface/60' : 'bg-surface/30'}`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center text-sm">
                            {getCountryEmoji(country.name)}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between text-xs font-mono">
                            <span
                              className={
                                country.data.total_nodes > 0 ? 'text-primary' : 'text-tertiary'
                              }
                            >
                              {country.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {country.data.total_nodes > 0 && (
                                <>
                                  <Check className="h-3 w-3 text-success" />
                                  <span className="text-accent">{country.data.total_nodes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GeographicalChecklist;
