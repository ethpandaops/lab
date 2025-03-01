import React, { useContext, useState, useEffect } from 'react'
import { useDataFetch } from '../../utils/data'
import { ConfigContext, NetworkContext } from '../../App'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { formatDistanceToNow } from 'date-fns'
import { NetworkSelector } from '../../components/common/NetworkSelector'
import { Search, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import CONTINENT_TO_COUNTRIES from '../../constants/countries'

// Types
interface Country {
  total_nodes: number
  public_nodes: number
}

interface NetworkData {
  total_nodes: number
  total_public_nodes: number
  countries: Record<string, Country>
  continents: Record<string, Country>
  cities: Record<string, Country>
  consensus_implementations: Record<string, ConsensusImplementation>
}

interface ConsensusImplementation {
  total_nodes: number
  public_nodes: number
}

interface Summary {
  updated_at: number
  networks: {
    mainnet: NetworkData
    sepolia: NetworkData
    holesky: NetworkData
  }
}

// Constants
const MS_PER_SECOND = 1000

// Continent metadata with colors and emoji flags - with more distinct colors
const CONTINENT_METADATA: Record<string, { name: string, emoji: string, color: string }> = {
  'Africa': { name: 'Africa', emoji: '🌍', color: 'hsl(120, 80%, 40%)' },
  'Asia': { name: 'Asia', emoji: '🌏', color: 'hsl(0, 80%, 50%)' },
  'Europe': { name: 'Europe', emoji: '🌍', color: 'hsl(240, 80%, 60%)' },
  'North America': { name: 'North America', emoji: '🌎', color: 'hsl(40, 80%, 50%)' },
  'South America': { name: 'South America', emoji: '🌎', color: 'hsl(60, 80%, 40%)' },
  'Oceania': { name: 'Oceania', emoji: '🌏', color: 'hsl(180, 80%, 40%)' },
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

// Generate a deterministic color based on string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Get country emoji flag
const getCountryEmoji = (countryName: string) => {
  // Split on space and get first char of each word, or first 2 chars if single word
  const code = countryName.includes(' ') 
    ? countryName.split(' ').map(word => word[0]).join('')
    : countryName.substring(0, 2);
    
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

const GeographicalChecklist = () => {
  const config = useContext(ConfigContext)
  const { selectedNetwork } = useContext(NetworkContext)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedContinents, setExpandedContinents] = useState<Set<string>>(new Set([])) // All collapsed by default
  
  // Skip data fetching if config isn't loaded
  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix 
    ? `${config.modules['xatu_public_contributors'].path_prefix}/summary.json`
    : null;

  const { data: summaryData, loading, error } = useDataFetch<Summary>(summaryPath)
  
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
      const matchesCountry = summaryData && 
        Object.keys(summaryData.networks[selectedNetwork as keyof typeof summaryData.networks]?.countries || {})
          .some(country => {
            const countryContinent = COUNTRY_TO_CONTINENT[country];
            return countryContinent === continent && 
                   country.toLowerCase().includes(searchTerm.toLowerCase());
          });
      
      if ((matchesContinent || matchesCountry) && !newExpandedContinents.has(continent)) {
        newExpandedContinents.add(continent);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setExpandedContinents(newExpandedContinents);
    }
  }, [searchTerm, summaryData, selectedNetwork]);

  // Handle loading and error states
  if (loading) return <LoadingState message="Loading geographical data..." />
  if (error) return <ErrorState message="Failed to load geographical data" error={error} />
  if (!summaryData) return <LoadingState message="Processing geographical data..." />

  // Get network data based on selected network
  const networkData = summaryData.networks[selectedNetwork as keyof typeof summaryData.networks] || summaryData.networks.mainnet

  // Group countries by continent
  const countriesByContinent: Record<string, Array<{ name: string, data: Country }>> = {}
  
  // Initialize continents
  Object.keys(CONTINENT_METADATA).forEach(continent => {
    countriesByContinent[continent] = []
  })
  
  // Group countries
  Object.entries(networkData.countries).forEach(([countryName, countryData]) => {
    const continent = COUNTRY_TO_CONTINENT[countryName] || 'Unknown'
    
    if (!countriesByContinent[continent]) {
      countriesByContinent[continent] = []
    }
    
    countriesByContinent[continent].push({
      name: countryName,
      data: countryData
    })
  })
  
  // Sort countries within each continent by total nodes (descending)
  Object.keys(countriesByContinent).forEach(continent => {
    countriesByContinent[continent].sort((a, b) => b.data.total_nodes - a.data.total_nodes)
  })
  
  // Filter continents and countries based on search term
  const filteredContinents = Object.keys(countriesByContinent)
    .filter(continent => {
      if (!searchTerm) return true
      
      // Check if continent name matches
      if (continent.toLowerCase().includes(searchTerm.toLowerCase())) return true
      
      // Check if any country in this continent matches
      return countriesByContinent[continent].some(country => 
        country.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
    .sort((a, b) => {
      // Sort by total nodes (sum of all countries in continent)
      const totalNodesA = countriesByContinent[a].reduce((sum, country) => sum + country.data.total_nodes, 0)
      const totalNodesB = countriesByContinent[b].reduce((sum, country) => sum + country.data.total_nodes, 0)
      return totalNodesB - totalNodesA
    })
  
  // Toggle continent expansion
  const toggleContinent = (continent: string) => {
    const newExpanded = new Set(expandedContinents)
    if (newExpanded.has(continent)) {
      newExpanded.delete(continent)
    } else {
      newExpanded.add(continent)
    }
    setExpandedContinents(newExpanded)
  }
  
  // Calculate coverage statistics
  const totalContinents = Object.keys(CONTINENT_METADATA).length
  const coveredContinents = Object.keys(CONTINENT_METADATA).filter(continent => {
    const totalNodesInContinent = countriesByContinent[continent]?.reduce(
      (sum, country) => sum + country.data.total_nodes, 0
    ) || 0;
    return totalNodesInContinent > 0;
  }).length;
  const continentCoverage = (coveredContinents / totalContinents) * 100
  
  // Calculate country coverage using the filtered list from CONTINENT_TO_COUNTRIES
  const totalCountries = Object.values(filteredContinentToCountries).flat().length
  const coveredCountries = Object.keys(networkData.countries).length
  const countryCoverage = (coveredCountries / totalCountries) * 100
  
  // Add missing countries to each continent for display
  Object.entries(filteredContinentToCountries).forEach(([continent, countries]) => {
    if (!countriesByContinent[continent]) return;
    
    // Find countries that exist in our constants but not in the data
    const existingCountryNames = new Set(countriesByContinent[continent].map(c => c.name));
    const missingCountries = countries.filter(country => !existingCountryNames.has(country));
    
    // Add missing countries with zero data
    missingCountries.forEach(country => {
      countriesByContinent[continent].push({
        name: country,
        data: { total_nodes: 0, public_nodes: 0 }
      });
    });
    
    // Re-sort after adding missing countries
    countriesByContinent[continent].sort((a, b) => b.data.total_nodes - a.data.total_nodes);
  });
  
  return (
    <div className="space-y-2">
      <XatuCallToAction />
      
      {/* Header Section */}
      <div className="backdrop-blur-md bg-surface/80 rounded-lg overflow-hidden shadow-md">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-sans font-bold text-primary mb-2">Geographical Checklist</h2>
              <span className="text-sm font-mono text-secondary">
                Last 24h · Updated{' '}
                <span 
                  title={new Date(summaryData.updated_at * MS_PER_SECOND).toString()}
                  className="cursor-help text-accent hover:underline"
                >
                  {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), { addSuffix: true })}
                </span>
              </span>
            </div>
          </div>
          
          <p className="text-base font-mono text-secondary mt-2 max-w-3xl">
            This checklist shows geographical coverage of Ethereum nodes contributing data to ethPandaOps. 
            Help us fill in the gaps by contributing data from underrepresented regions.
          </p>
        </div>
        
        {/* Coverage Stats */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface/60 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-subtle">
                <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Continent Coverage</div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-mono font-bold text-primary">
                    {coveredContinents}/{totalContinents}
                  </div>
                  <div className="text-lg font-mono text-accent">
                    {continentCoverage.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-2 bg-surface/40 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-accent h-full rounded-full" 
                    style={{ width: `${continentCoverage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-surface/60 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-subtle">
                <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Country Coverage</div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-mono font-bold text-primary">
                    {coveredCountries}/{totalCountries}
                  </div>
                  <div className="text-lg font-mono text-accent">
                    {countryCoverage.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-2 bg-surface/40 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-accent h-full rounded-full" 
                    style={{ width: `${countryCoverage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-surface/60 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-subtle">
                <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Total Nodes</div>
              </div>
              <div className="p-3 flex items-center justify-center">
                <div className="text-2xl font-mono font-bold text-primary">
                  {networkData.total_nodes.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="bg-surface/60 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-subtle">
                <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Public Nodes</div>
              </div>
              <div className="p-3 flex items-center justify-center">
                <div className="text-2xl font-mono font-bold text-accent">
                  {networkData.total_public_nodes.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-tertiary" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-subtle rounded-md bg-surface/60 placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="Search for continents or countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* List View */}
          <div className="space-y-4">
            {filteredContinents.map(continent => {
              // Skip Antarctica
              if (continent === 'Antarctica') return null;
              
              const totalNodesInContinent = countriesByContinent[continent].reduce(
                (sum, country) => sum + country.data.total_nodes, 0
              );
              
              const isExpanded = expandedContinents.has(continent);
              const continentMeta = CONTINENT_METADATA[continent] || { 
                name: continent, 
                emoji: '🌐', 
                color: stringToColor(continent) 
              };
              
              // Calculate country coverage within this continent
              const countriesWithData = countriesByContinent[continent].filter(c => c.data.total_nodes > 0).length;
              const totalCountriesInContinent = countriesByContinent[continent].length;
              const continentCountryCoverage = (countriesWithData / totalCountriesInContinent) * 100;
              
              // Filter countries in this continent based on search term
              const filteredCountries = countriesByContinent[continent].filter(country => {
                if (!searchTerm) return true;
                return country.name.toLowerCase().includes(searchTerm.toLowerCase());
              });
              
              // Skip rendering if no countries match the search
              if (filteredCountries.length === 0 && searchTerm && !continent.toLowerCase().includes(searchTerm.toLowerCase())) {
                return null;
              }
              
              return (
                <div key={continent} className="bg-surface/60 rounded-lg overflow-hidden border-l-4" style={{ borderLeftColor: continentMeta.color }}>
                  {/* Continent Header */}
                  <button 
                    className="w-full p-4 flex items-center justify-between hover:bg-surface/80 transition-colors duration-200"
                    onClick={() => toggleContinent(continent)}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${continentMeta.color}30` }}
                      >
                        <span className="text-5xl">{continentMeta.emoji}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-sans font-bold text-primary">
                          {continentMeta.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-tertiary">
                            {countriesWithData}/{totalCountriesInContinent} countries · {totalNodesInContinent.toLocaleString()} nodes
                          </p>
                        </div>
                        <div className="mt-1 bg-surface/40 rounded-full h-1.5 overflow-hidden w-full max-w-xs">
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${continentCountryCoverage}%`, backgroundColor: continentMeta.color }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {totalNodesInContinent > 0 ? (
                        <span className="px-2 py-1 text-xs font-mono rounded-full bg-green-500/20 text-green-500">
                          <Check className="w-4 h-4 inline-block mr-1" />
                          Covered
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-mono rounded-full bg-red-500/20 text-red-500">
                          <X className="w-4 h-4 inline-block mr-1" />
                          Missing
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-tertiary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-tertiary" />
                      )}
                    </div>
                  </button>
                  
                  {/* Countries List */}
                  {isExpanded && (
                    <div className="border-t border-subtle">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-surface/40 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-mono text-tertiary">Country</th>
                              <th className="px-4 py-2 text-right text-xs font-mono text-tertiary">Status</th>
                              <th className="px-4 py-2 text-right text-xs font-mono text-tertiary">Nodes</th>
                              <th className="px-4 py-2 text-right text-xs font-mono text-tertiary">Public</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredCountries.map(({ name, data }) => (
                              <tr key={name} className="hover:bg-surface/40 transition-colors duration-200">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getCountryEmoji(name)}</span>
                                    <span className="font-mono text-primary">{name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {data.total_nodes > 0 ? (
                                    <span className="px-2 py-1 text-xs font-mono rounded-full bg-green-500/20 text-green-500">
                                      <Check className="w-3 h-3 inline-block mr-1" />
                                      Covered
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs font-mono rounded-full bg-red-500/20 text-red-500">
                                      <X className="w-3 h-3 inline-block mr-1" />
                                      Missing
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-primary">
                                  {data.total_nodes.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-accent">
                                  {data.public_nodes.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            
            {filteredContinents.length === 0 && (
              <div className="bg-surface/60 rounded-lg p-8 text-center">
                <p className="text-lg font-mono text-tertiary">No results found for "{searchTerm}"</p>
                <button 
                  className="mt-4 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/80 transition-colors"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default GeographicalChecklist 