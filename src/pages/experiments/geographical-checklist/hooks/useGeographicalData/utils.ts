import type { ContinentCode, NodeClassification } from './useGeographicalData.types';

export const CONTINENT_CONFIG: Record<
  ContinentCode,
  {
    name: string;
    emoji: string;
    color: string;
  }
> = {
  AF: { name: 'Africa', emoji: '🌍', color: '#ef4444' },
  AS: { name: 'Asia', emoji: '🌏', color: '#f59e0b' },
  EU: { name: 'Europe', emoji: '🇪🇺', color: '#10b981' },
  NA: { name: 'North America', emoji: '🌎', color: '#3b82f6' },
  SA: { name: 'South America', emoji: '🗺️', color: '#8b5cf6' },
  OC: { name: 'Oceania', emoji: '🏝️', color: '#06b6d4' },
  AN: { name: 'Antarctica', emoji: '🧊', color: '#64748b' },
};

export function getContinentCode(continentCode?: string | null): ContinentCode {
  const code = continentCode?.toUpperCase();
  if (code && code in CONTINENT_CONFIG) {
    return code as ContinentCode;
  }
  return 'EU'; // Default to Europe if unknown
}

export function getCountryFlag(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function getClassification(clientName?: string | null): NodeClassification {
  if (!clientName) return 'unclassified';
  if (clientName.startsWith('pub-')) return 'individual';
  if (clientName.startsWith('corp-')) return 'corporate';
  if (clientName.startsWith('ethpandaops')) return 'internal';
  return 'unclassified';
}

export function getRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'Never';
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function getClassificationColor(classification: NodeClassification): string {
  switch (classification) {
    case 'individual':
      return 'text-primary';
    case 'corporate':
      return 'text-accent';
    case 'internal':
      return 'text-success';
    default:
      return 'text-muted';
  }
}

export function getClassificationBadgeColor(classification: NodeClassification): 'blue' | 'purple' | 'green' | 'gray' {
  switch (classification) {
    case 'individual':
      return 'blue';
    case 'corporate':
      return 'purple';
    case 'internal':
      return 'green';
    default:
      return 'gray';
  }
}
