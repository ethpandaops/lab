declare module 'all-the-cities' {
  interface City {
    name: string
    country: string
    altCountry: string
    muni: string
    muniSub: string
    featureClass: string
    featureCode: string
    adminCode: string
    population: number
    loc: {
      type: string
      coordinates: [number, number]
    }
  }

  const cities: City[]
  export = cities
} 