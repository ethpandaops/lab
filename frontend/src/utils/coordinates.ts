import { countries } from 'countries-list'
import citiesData from 'cities.json'

interface City {
  country: string
  name: string
  lat: string
  lng: string
}

interface CountryData {
  name: string
  defaultCoords: [number, number]
  cities: Map<string, [number, number]>
}

// Global caches
const countryDataMap = new Map<string, CountryData>()
const coordCache = new Map<string, [number, number]>()

// Initialize country data on boot
Object.entries(countries).forEach(([code, country]) => {
  const citiesInCountry = (citiesData as unknown as City[]).filter(city => city.country === code)
  
  // Find capital city first, fallback to any city if not found
  const capitalCity = citiesInCountry.find(city => 
    city.name.toLowerCase() === country.capital?.toLowerCase()
  )
  const defaultCity = capitalCity || citiesInCountry[0]
  
  if (!defaultCity) return

  const defaultCoords: [number, number] = [Number(defaultCity.lng), Number(defaultCity.lat)]
  const cityMap = new Map<string, [number, number]>()

  // Store all cities
  citiesInCountry.forEach(city => {
    const normalizedName = city.name.toLowerCase().replace(/\s+/g, '')
    cityMap.set(normalizedName, [Number(city.lng), Number(city.lat)])
  })

  // Store using country code as key
  countryDataMap.set(code.toLowerCase(), {
    name: country.name,
    defaultCoords,
    cities: cityMap
  })
})

// Helper function to get coordinates for a node
export function getNodeCoordinates(city: string | undefined, country: string | undefined): [number, number] | undefined {
  if (!country) return undefined

  // Try to find country code from name
  const countryCode = Object.entries(countries).find(
    ([_, c]) => c.name.toLowerCase() === country.toLowerCase()
  )?.[0]?.toLowerCase()

  if (!countryCode) return undefined

  const normalizedCity = city?.toLowerCase().replace(/\s+/g, '')
  
  // Check quick cache first
  if (normalizedCity) {
    const cacheKey = `${countryCode}:${normalizedCity}`
    const cached = coordCache.get(cacheKey)
    if (cached) return cached
  }

  // Get country data
  const countryData = countryDataMap.get(countryCode)
  if (!countryData) return undefined

  // If no city or city not found, return default country coords
  if (!normalizedCity) return countryData.defaultCoords

  // Try to find city
  const cityCoords = countryData.cities.get(normalizedCity)
  if (!cityCoords) return countryData.defaultCoords

  // Cache and return
  coordCache.set(`${countryCode}:${normalizedCity}`, cityCoords)
  return cityCoords
}

// Default coordinates for continents
export const continentCoords: Record<string, [number, number]> = {
  NA: [-100, 40],    // North America
  SA: [-58, -20],    // South America
  EU: [15, 50],      // Europe
  AF: [20, 0],       // Africa
  AS: [100, 35],     // Asia
  OC: [135, -25],    // Oceania
}
