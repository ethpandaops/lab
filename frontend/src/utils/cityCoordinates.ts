import { City } from 'country-state-city';

// Cache for city lookups
const coordinateCache = new Map<string, { lat: number; lng: number }>();

// Country coordinates (approximate center points)
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // North America
  'United States': { lat: 39.8283, lng: -98.5795 },
  US: { lat: 39.8283, lng: -98.5795 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  CA: { lat: 56.1304, lng: -106.3468 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  MX: { lat: 23.6345, lng: -102.5528 },

  // Europe
  Germany: { lat: 51.1657, lng: 10.4515 },
  DE: { lat: 51.1657, lng: 10.4515 },
  'United Kingdom': { lat: 55.3781, lng: -3.436 },
  GB: { lat: 55.3781, lng: -3.436 },
  UK: { lat: 55.3781, lng: -3.436 },
  France: { lat: 46.2276, lng: 2.2137 },
  FR: { lat: 46.2276, lng: 2.2137 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  NL: { lat: 52.1326, lng: 5.2913 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  BE: { lat: 50.5039, lng: 4.4699 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  CH: { lat: 46.8182, lng: 8.2275 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  IT: { lat: 41.8719, lng: 12.5674 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  ES: { lat: 40.4637, lng: -3.7492 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  PL: { lat: 51.9194, lng: 19.1451 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  SE: { lat: 60.1282, lng: 18.6435 },
  Norway: { lat: 60.472, lng: 8.4689 },
  NO: { lat: 60.472, lng: 8.4689 },
  Finland: { lat: 61.9241, lng: 25.7482 },
  FI: { lat: 61.9241, lng: 25.7482 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  DK: { lat: 56.2639, lng: 9.5018 },
  Ireland: { lat: 53.1424, lng: -7.6921 },
  IE: { lat: 53.1424, lng: -7.6921 },
  Austria: { lat: 47.5162, lng: 14.5501 },
  AT: { lat: 47.5162, lng: 14.5501 },
  'Czech Republic': { lat: 49.8175, lng: 15.473 },
  CZ: { lat: 49.8175, lng: 15.473 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  PT: { lat: 39.3999, lng: -8.2245 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  RO: { lat: 45.9432, lng: 24.9668 },
  Ukraine: { lat: 48.3794, lng: 31.1656 },
  UA: { lat: 48.3794, lng: 31.1656 },
  Russia: { lat: 61.524, lng: 105.3188 },
  RU: { lat: 61.524, lng: 105.3188 },

  // Asia
  Japan: { lat: 36.2048, lng: 138.2529 },
  JP: { lat: 36.2048, lng: 138.2529 },
  China: { lat: 35.8617, lng: 104.1954 },
  CN: { lat: 35.8617, lng: 104.1954 },
  India: { lat: 20.5937, lng: 78.9629 },
  IN: { lat: 20.5937, lng: 78.9629 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  KR: { lat: 35.9078, lng: 127.7669 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  SG: { lat: 1.3521, lng: 103.8198 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  HK: { lat: 22.3193, lng: 114.1694 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  IL: { lat: 31.0461, lng: 34.8516 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  AE: { lat: 23.4241, lng: 53.8478 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  TR: { lat: 38.9637, lng: 35.2433 },
  Thailand: { lat: 15.87, lng: 100.9925 },
  TH: { lat: 15.87, lng: 100.9925 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  ID: { lat: -0.7893, lng: 113.9213 },

  // Oceania
  Australia: { lat: -25.2744, lng: 133.7751 },
  AU: { lat: -25.2744, lng: 133.7751 },
  'New Zealand': { lat: -40.9006, lng: 174.886 },
  NZ: { lat: -40.9006, lng: 174.886 },

  // South America
  Brazil: { lat: -14.235, lng: -51.9253 },
  BR: { lat: -14.235, lng: -51.9253 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  AR: { lat: -38.4161, lng: -63.6167 },
  Chile: { lat: -35.6751, lng: -71.543 },
  CL: { lat: -35.6751, lng: -71.543 },

  // Africa
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  EG: { lat: 26.8206, lng: 30.8025 },
  Nigeria: { lat: 9.082, lng: 8.6753 },
  NG: { lat: 9.082, lng: 8.6753 },
};

/**
 * Get coordinates for a city
 * Falls back to country coordinates, then continent coordinates
 */
export function getCityCoordinates(
  city: string,
  country: string,
): { lat: number; lng: number } | undefined {
  const cacheKey = `${city}-${country}`;

  // Check cache first
  if (coordinateCache.has(cacheKey)) {
    return coordinateCache.get(cacheKey);
  }

  // If city is provided, try to find it
  if (city) {
    // First check manual fallback for common Ethereum node locations (data centers, etc)
    const fallbackCoords = getFallbackCoordinates(city, country);
    if (fallbackCoords) {
      coordinateCache.set(cacheKey, fallbackCoords);
      return fallbackCoords;
    }

    // Try to find city using country-state-city
    // country-state-city uses 2-letter country codes
    const countryCode = getCountryCode(country);

    // Get all cities for the country and find matching name
    const citiesInCountry = City.getCitiesOfCountry(countryCode);
    if (citiesInCountry) {
      const cityLower = city.toLowerCase();
      const match = citiesInCountry.find(c => c.name && c.name.toLowerCase() === cityLower);

      if (match && match.latitude && match.longitude) {
        const coords = { lat: parseFloat(match.latitude), lng: parseFloat(match.longitude) };
        coordinateCache.set(cacheKey, coords);
        return coords;
      }
    }
  }

  // Fallback to country coordinates (either no city or city not found)
  const countryCoords = getCountryCoordinates(country);
  if (countryCoords) {
    coordinateCache.set(cacheKey, countryCoords);
    return countryCoords;
  }

  return undefined;
}

/**
 * Convert country name to 2-letter ISO code
 */
function getCountryCode(country: string): string {
  // If already 2-letter code, return as is
  if (country.length === 2) {
    return country.toUpperCase();
  }

  // Common country name mappings to ISO codes
  const countryMappings: Record<string, string> = {
    'United States': 'US',
    'United Kingdom': 'GB',
    Germany: 'DE',
    France: 'FR',
    Japan: 'JP',
    China: 'CN',
    Canada: 'CA',
    Australia: 'AU',
    Netherlands: 'NL',
    Belgium: 'BE',
    Switzerland: 'CH',
    Italy: 'IT',
    Spain: 'ES',
    Poland: 'PL',
    Sweden: 'SE',
    Norway: 'NO',
    Finland: 'FI',
    Denmark: 'DK',
    Ireland: 'IE',
    Austria: 'AT',
    Portugal: 'PT',
    Romania: 'RO',
    Ukraine: 'UA',
    Russia: 'RU',
    India: 'IN',
    Brazil: 'BR',
    Argentina: 'AR',
    Chile: 'CL',
    Mexico: 'MX',
    Singapore: 'SG',
    'South Korea': 'KR',
    'Czech Republic': 'CZ',
    'United Arab Emirates': 'AE',
    'South Africa': 'ZA',
    'New Zealand': 'NZ',
    'Hong Kong': 'HK',
    Israel: 'IL',
    Turkey: 'TR',
    Thailand: 'TH',
    Indonesia: 'ID',
    Egypt: 'EG',
    Nigeria: 'NG',
    // Add more as needed
  };

  return countryMappings[country] || country.substring(0, 2).toUpperCase();
}

/**
 * Get country coordinates
 */
function getCountryCoordinates(country: string): { lat: number; lng: number } | undefined {
  return COUNTRY_COORDINATES[country] || COUNTRY_COORDINATES[getCountryCode(country)];
}

/**
 * Manual fallback coordinates for common node locations
 * that might not be in the city-timezones database
 */
function getFallbackCoordinates(
  city: string,
  country: string,
): { lat: number; lng: number } | undefined {
  const fallbacks: Record<string, { lat: number; lng: number }> = {
    // Major data center locations
    'Ashburn-United States': { lat: 39.0438, lng: -77.4874 },
    'Frankfurt-Germany': { lat: 50.1109, lng: 8.6821 },
    'Singapore-Singapore': { lat: 1.3521, lng: 103.8198 },
    'Tokyo-Japan': { lat: 35.6762, lng: 139.6503 },
    'London-United Kingdom': { lat: 51.5074, lng: -0.1278 },
    'Paris-France': { lat: 48.8566, lng: 2.3522 },
    'Amsterdam-Netherlands': { lat: 52.3676, lng: 4.9041 },
    'New York-United States': { lat: 40.7128, lng: -74.006 },
    'San Francisco-United States': { lat: 37.7749, lng: -122.4194 },
    'Los Angeles-United States': { lat: 34.0522, lng: -118.2437 },
    'Chicago-United States': { lat: 41.8781, lng: -87.6298 },
    'Dallas-United States': { lat: 32.7767, lng: -96.797 },
    'Seattle-United States': { lat: 47.6062, lng: -122.3321 },
    'Toronto-Canada': { lat: 43.6532, lng: -79.3832 },
    'Sydney-Australia': { lat: -33.8688, lng: 151.2093 },
    'Mumbai-India': { lat: 19.076, lng: 72.8777 },
    'Seoul-South Korea': { lat: 37.5665, lng: 126.978 },
    'Dublin-Ireland': { lat: 53.3498, lng: -6.2603 },
    'Stockholm-Sweden': { lat: 59.3293, lng: 18.0686 },
    'Helsinki-Finland': { lat: 60.1699, lng: 24.9384 },
    'Warsaw-Poland': { lat: 52.2297, lng: 21.0122 },
    'Berlin-Germany': { lat: 52.52, lng: 13.405 },
    'Zurich-Switzerland': { lat: 47.3769, lng: 8.5417 },
    'Milan-Italy': { lat: 45.4642, lng: 9.19 },
    'Madrid-Spain': { lat: 40.4168, lng: -3.7038 },
    'Barcelona-Spain': { lat: 41.3851, lng: 2.1734 },
    'Brussels-Belgium': { lat: 50.8503, lng: 4.3517 },
    'Vienna-Austria': { lat: 48.2082, lng: 16.3738 },
    'Prague-Czech Republic': { lat: 50.0755, lng: 14.4378 },
    'Copenhagen-Denmark': { lat: 55.6761, lng: 12.5683 },
    'Oslo-Norway': { lat: 59.9139, lng: 10.7522 },

    // Common cloud regions
    'Oregon-United States': { lat: 43.8041, lng: -120.5542 },
    'Virginia-United States': { lat: 37.4316, lng: -78.6569 },
    'Ohio-United States': { lat: 40.4173, lng: -82.9071 },
    'Iowa-United States': { lat: 41.878, lng: -93.0977 },
    'Montreal-Canada': { lat: 45.5017, lng: -73.5673 },
    'Sao Paulo-Brazil': { lat: -23.5505, lng: -46.6333 },
    'Cape Town-South Africa': { lat: -33.9249, lng: 18.4241 },
    'Hong Kong-China': { lat: 22.3193, lng: 114.1694 },
    'Beijing-China': { lat: 39.9042, lng: 116.4074 },
    'Shanghai-China': { lat: 31.2304, lng: 121.4737 },
    'Bangalore-India': { lat: 12.9716, lng: 77.5946 },
    'Dubai-United Arab Emirates': { lat: 25.2048, lng: 55.2708 },
    'Tel Aviv-Israel': { lat: 32.0853, lng: 34.7818 },
  };

  const key = `${city}-${country}`;
  return fallbacks[key];
}

/**
 * Get coordinates from continent code
 * Used as last resort fallback
 */
export function getContinentCoordinates(continentCode: string): { lat: number; lng: number } {
  const continents: Record<string, { lat: number; lng: number }> = {
    AF: { lat: 0, lng: 20 }, // Africa
    AN: { lat: -75, lng: 0 }, // Antarctica
    AS: { lat: 30, lng: 100 }, // Asia
    EU: { lat: 50, lng: 10 }, // Europe
    NA: { lat: 45, lng: -100 }, // North America
    OC: { lat: -25, lng: 140 }, // Oceania
    SA: { lat: -15, lng: -60 }, // South America
  };

  return continents[continentCode] || { lat: 0, lng: 0 };
}
