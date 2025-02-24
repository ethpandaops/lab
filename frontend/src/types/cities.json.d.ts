declare module 'cities.json' {
  interface City {
    country: string
    name: string
    lat: number
    lng: number
    population: number
  }

  const cities: City[]
  export default cities
} 