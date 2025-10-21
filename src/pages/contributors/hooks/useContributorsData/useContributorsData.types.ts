import type { UserClassification } from '../../components/UserCard';

export interface Contributor {
  username: string;
  clientName: string;
  classification: UserClassification;
  nodeCount: number;
  lastSeen: number;
  locations: Set<string>;
  primaryCountry: string | null;
  primaryCountryCode: string | null;
  primaryCity: string | null;
  versions: Set<string>;
  consensusImplementations: Set<string>;
  countryCount: Map<string, number>;
}

export interface UseContributorsDataReturn {
  publicContributors: Contributor[];
  corporateContributors: Contributor[];
  internalContributors: Contributor[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}
