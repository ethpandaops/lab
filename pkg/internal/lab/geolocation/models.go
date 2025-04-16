package geolocation

// LocationDB stores geolocation data
type LocationDB struct {
	// Map of continents to countries to cities
	Continents map[string]map[string]map[string]CityInfo
}

// CityInfo contains geographic information about a city
type CityInfo struct {
	City       string
	Country    string
	Lat        float64
	Lon        float64
	Population string
	ISO2       string
	ISO3       string
}

// LookupParams contains parameters for looking up city information
type LookupParams struct {
	City    string
	Country string
}
