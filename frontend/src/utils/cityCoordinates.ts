import cityTimezones from 'city-timezones';

// Cache for city lookups
const coordinateCache = new Map<string, { lat: number; lng: number }>();

/**
 * Get coordinates for a city
 * Falls back to country coordinates if city not found
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

  // Try to find city
  const cities = cityTimezones.lookupViaCity(city);
  const match =
    cities.find(
      c =>
        c.country &&
        (c.country.toLowerCase() === country.toLowerCase() ||
          c.iso2 === country ||
          c.iso3 === country),
    ) || cities[0];

  if (match && match.lat && match.lng) {
    const coords = { lat: match.lat, lng: match.lng };
    coordinateCache.set(cacheKey, coords);
    return coords;
  }

  // Fallback to manual lookup for common Ethereum node locations
  const fallbackCoords = getFallbackCoordinates(city, country);
  if (fallbackCoords) {
    coordinateCache.set(cacheKey, fallbackCoords);
    return fallbackCoords;
  }

  return undefined;
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
