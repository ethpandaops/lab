import type { FctNodeActiveLast24h } from '@/api';

export type ContinentCode = 'AF' | 'AS' | 'EU' | 'NA' | 'SA' | 'OC' | 'AN';
export type NodeClassification = 'individual' | 'corporate' | 'internal' | 'unclassified';

export interface ProcessedNode extends FctNodeActiveLast24h {
  classification: NodeClassification;
  continentCode: ContinentCode;
  continentName: string;
  continentEmoji: string;
  countryFlag: string;
}

export interface CityData {
  name: string;
  countryName: string;
  countryCode: string;
  coords: [number, number]; // [lon, lat]
  nodes: ProcessedNode[];
}

export interface CountryData {
  name: string;
  code: string;
  emoji: string;
  cities: Map<string, CityData>;
  totalNodes: number;
}

export interface ContinentData {
  code: ContinentCode;
  name: string;
  emoji: string;
  color: string;
  countries: Map<string, CountryData>;
  totalNodes: number;
  totalCountries: number;
  totalCities: number;
}

export interface ClientImplementationStats {
  name: string;
  count: number;
  percentage: number;
}

export interface LocationStats {
  name: string;
  code?: string;
  count: number;
  emoji?: string;
}

export interface GeographicalStats {
  totalNodes: number;
  totalContinents: number;
  totalCountries: number;
  totalCities: number;
  lastUpdated: number;
  uniqueVersions: number;
  byClassification: {
    individual: number;
    corporate: number;
    internal: number;
  };
  byClientImplementation: ClientImplementationStats[];
  topCountries: LocationStats[];
  topCities: LocationStats[];
}

export interface UseGeographicalDataReturn {
  continents: Map<ContinentCode, ContinentData>;
  stats: GeographicalStats;
  allNodes: ProcessedNode[];
  isLoading: boolean;
  error: Error | null;
}
