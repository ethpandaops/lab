
// Default coordinates for continents - used as fallback only when backend provides no coordinates
export const continentCoords: Record<string, [number, number]> = {
  NA: [-100, 40],    // North America
  SA: [-58, -20],    // South America
  EU: [15, 50],      // Europe
  AF: [20, 0],       // Africa
  AS: [100, 35],     // Asia
  OC: [135, -25],    // Oceania
  AN: [0, -90],      // Antarctica
}

// Get coordinates for a node, using backend-provided coordinates or falling back to continent
export function getNodeCoordinates(
  city: string | undefined,
  country: string | undefined,
  continent: string | undefined,
  latitude?: number,
  longitude?: number
): [number, number] | undefined {
  // If backend provided coordinates, use those
  if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
    return [longitude, latitude]
  }

  // Fall back to continent center point if available
  if (continent && continent in continentCoords) {
    return continentCoords[continent as keyof typeof continentCoords]
  }

  return undefined
}
