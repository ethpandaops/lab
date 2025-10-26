import type { ContinentCode, NodeClassification } from './useGeographicalData.types';
import { CONTINENT_COLORS } from '@/theme/data-visualization-colors';

export const CONTINENT_CONFIG: Record<
  ContinentCode,
  {
    name: string;
    emoji: string;
    color: string;
  }
> = {
  AF: { name: 'Africa', emoji: '🌍', color: CONTINENT_COLORS.AF },
  AS: { name: 'Asia', emoji: '🌏', color: CONTINENT_COLORS.AS },
  EU: { name: 'Europe', emoji: '🇪🇺', color: CONTINENT_COLORS.EU },
  NA: { name: 'North America', emoji: '🌎', color: CONTINENT_COLORS.NA },
  SA: { name: 'South America', emoji: '🗺️', color: CONTINENT_COLORS.SA },
  OC: { name: 'Oceania', emoji: '🏝️', color: CONTINENT_COLORS.OC },
  AN: { name: 'Antarctica', emoji: '🧊', color: CONTINENT_COLORS.AN },
};

export function getContinentCode(continentCode?: string | null): ContinentCode {
  const code = continentCode?.toUpperCase();
  if (code && code in CONTINENT_CONFIG) {
    return code as ContinentCode;
  }
  return 'EU'; // Default to Europe if unknown
}

export function getClassification(clientName?: string | null): NodeClassification {
  if (!clientName) return 'unclassified';
  if (clientName.startsWith('pub-')) return 'individual';
  if (clientName.startsWith('corp-')) return 'corporate';
  if (clientName.startsWith('ethpandaops')) return 'internal';
  return 'unclassified';
}
