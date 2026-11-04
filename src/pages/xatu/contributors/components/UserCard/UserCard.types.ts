export type UserClassification = 'individual' | 'corporate' | 'internal' | 'unclassified';

export interface UserCardProps {
  /**
   * The contributor's username (e.g., "sparingparsley27")
   */
  username: string;
  /**
   * Classification of the contributor
   */
  classification: UserClassification;
  /**
   * Number of Xatu nodes seen in the last 24h
   */
  nodeCount: number;
  /**
   * Number of countries those nodes are in
   */
  countryCount: number;
  /**
   * Last seen timestamp (Unix seconds)
   */
  lastSeen: number;
  /**
   * Primary country code (ISO 3166-1 alpha-2)
   */
  primaryCountry?: string;
  /**
   * Collector the nodes report through (e.g., "Contributoor"), "several" when they differ
   */
  collector?: string;
  /**
   * Collector version (e.g., "v0.0.70-7195855"), "several" when they differ
   */
  collectorVersion?: string;
  /**
   * Consensus client implementations (e.g., ["lighthouse", "prysm"])
   */
  consensusImplementations?: string[];
  /**
   * Optional route to navigate to (e.g., "/contributors/$id")
   */
  to?: string;
}
