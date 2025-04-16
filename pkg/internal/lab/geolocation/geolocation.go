package geolocation

import (
	"context"
	"fmt"
	"strings"

	"github.com/sirupsen/logrus"
)

// Client manages geolocation data and operations
type Client struct {
	log              logrus.FieldLogger
	databaseLocation string
	locationDB       *LocationDB
}

const (
	defaultURL = "https://data.ethpandaops.io/geolocation-maps.zip"
)

// New creates a new geolocation client
func New(log logrus.FieldLogger, config *Config) (*Client, error) {
	databaseLocation := defaultURL

	if config != nil && config.DatabaseLocation != "" {
		databaseLocation = config.DatabaseLocation
	}

	client := &Client{
		log:              log.WithField("component", "lab/geolocation"),
		databaseLocation: databaseLocation,
		locationDB: &LocationDB{
			Continents: make(map[string]map[string]map[string]CityInfo),
		},
	}

	return client, nil
}

// Start initializes the geolocation database
func (c *Client) Start(ctx context.Context) error {
	// Load the CSV data from either URL or local file
	csvData, err := c.loadDatabaseFromLocation()
	if err != nil {
		return fmt.Errorf("failed to load geolocation database: %w", err)
	}

	// Load the CSV data into memory
	return c.loadCSV(csvData)
}

// indexOf finds the index of a column name in the header
func indexOf(headers []string, name string) int {
	for i, h := range headers {
		if strings.EqualFold(h, name) {
			return i
		}
	}
	return -1
}

// Validate validates the lookup parameters
func (params *LookupParams) Validate() error {
	if params.City == "" && params.Country == "" {
		return fmt.Errorf("at least one parameter (city or country) must be provided")
	}

	return nil
}

// LookupCity returns city information based on provided parameters
func (c *Client) LookupCity(params LookupParams) (*CityInfo, bool) {
	if err := params.Validate(); err != nil {
		return nil, false
	}

	// Normalize inputs
	if params.City != "" {
		params.City = strings.ToLower(params.City)
	}
	if params.Country != "" {
		params.Country = strings.ToLower(params.Country)
	}

	// Default continent to search in
	continent := "unknown"

	// If country is specified, search for it
	if params.Country != "" {
		// Look in our default continent first
		if countryMap, exists := c.locationDB.Continents[continent][params.Country]; exists {
			// If city is specified, direct lookup
			if params.City != "" {
				if cityInfo, exists := countryMap[params.City]; exists {
					return &cityInfo, true
				}
			} else {
				// No city specified, return first city in the country
				for _, cityInfo := range countryMap {
					return &cityInfo, true
				}
			}
		}

		// If not found in default continent, search all continents
		for contName, continentMap := range c.locationDB.Continents {
			if contName == continent {
				continue // Already searched this one
			}

			if countryMap, exists := continentMap[params.Country]; exists {
				// If city is specified, look for exact match
				if params.City != "" {
					if cityInfo, found := countryMap[params.City]; found {
						return &cityInfo, true
					}
				} else {
					// No city specified, return first city in country
					for _, cityInfo := range countryMap {
						return &cityInfo, true
					}
				}
			}
		}

		return nil, false
	}

	// If only city is specified
	if params.City != "" {
		// Check default continent first
		for _, countryMap := range c.locationDB.Continents[continent] {
			if cityInfo, exists := countryMap[params.City]; exists {
				return &cityInfo, true
			}
		}

		// Check all other continents
		for contName, continentMap := range c.locationDB.Continents {
			if contName == continent {
				continue // Already searched this one
			}

			for _, countryMap := range continentMap {
				if cityInfo, exists := countryMap[params.City]; exists {
					return &cityInfo, true
				}
			}
		}

		return nil, false
	}

	// No criteria specified (shouldn't happen due to Validate), return first city found
	for _, continentMap := range c.locationDB.Continents {
		for _, countryMap := range continentMap {
			for _, cityInfo := range countryMap {
				return &cityInfo, true
			}
		}
	}

	return nil, false
}

// GetContinents returns a list of all continents
func (c *Client) GetContinents() []string {
	continents := make([]string, 0, len(c.locationDB.Continents))
	for continent := range c.locationDB.Continents {
		continents = append(continents, continent)
	}
	return continents
}

// GetCountries returns a list of all countries in a continent
func (c *Client) GetCountries(continent string) []string {
	continent = strings.ToLower(continent)
	countries := make([]string, 0)

	if countryMap, exists := c.locationDB.Continents[continent]; exists {
		for country := range countryMap {
			countries = append(countries, country)
		}
	}

	return countries
}

// GetCities returns a list of cities in a country
func (c *Client) GetCities(continent, country string) []string {
	continent = strings.ToLower(continent)
	country = strings.ToLower(country)
	cities := make([]string, 0)

	if continentMap, exists := c.locationDB.Continents[continent]; exists {
		if countryMap, exists := continentMap[country]; exists {
			for city := range countryMap {
				cities = append(cities, city)
			}
		}
	}

	return cities
}
