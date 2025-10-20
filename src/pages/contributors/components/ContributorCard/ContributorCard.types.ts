export type ContributorClassification = 'individual' | 'corporate' | 'internal' | 'unclassified';

export interface ContributorCardProps {
  /**
   * The contributor's username (e.g., "sparingparsley27")
   */
  username: string;
  /**
   * Classification of the contributor
   */
  classification: ContributorClassification;
  /**
   * Number of active nodes
   */
  nodeCount: number;
  /**
   * Number of unique locations
   */
  locationCount: number;
  /**
   * Last seen timestamp (Unix seconds)
   */
  lastSeen: number;
  /**
   * Primary country code (ISO 3166-1 alpha-2)
   */
  primaryCountry?: string;
  /**
   * Primary city name
   */
  primaryCity?: string;
  /**
   * Client version (e.g., "v0.0.70-7195855")
   */
  clientVersion?: string;
  /**
   * Consensus client implementations (e.g., ["lighthouse", "prysm"])
   */
  consensusImplementations?: string[];
  /**
   * Optional route to navigate to (e.g., "/contributors/$id")
   */
  to?: string;
}
