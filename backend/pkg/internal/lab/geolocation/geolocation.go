package geolocation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Status constants for metrics
const (
	StatusError    = "error"
	StatusSuccess  = "success"
	StatusNotFound = "not_found"
)

// Client manages geolocation data and operations
type Client struct {
	log              logrus.FieldLogger
	config           *Config
	databaseLocation string
	locationDB       *LocationDB

	// Metrics
	metrics           *metrics.Metrics
	collector         *metrics.Collector
	lookupsTotal      *prometheus.CounterVec
	lookupDuration    *prometheus.HistogramVec
	databaseLoadTotal *prometheus.CounterVec
	cacheItems        *prometheus.GaugeVec
}

const (
	defaultURL = "https://data.ethpandaops.io/geolocation-maps.zip"
)

// New creates a new geolocation client
func New(log logrus.FieldLogger, config *Config, metricsSvc *metrics.Metrics) (*Client, error) {
	databaseLocation := defaultURL

	if config != nil && config.DatabaseLocation != "" {
		databaseLocation = config.DatabaseLocation
	}

	client := &Client{
		log:              log.WithField("component", "lab/geolocation"),
		config:           config,
		databaseLocation: databaseLocation,
		locationDB: &LocationDB{
			Continents: make(map[string]map[string]map[string]CityInfo),
		},
		metrics: metricsSvc,
	}

	client.initMetrics()

	return client, nil
}

// initMetrics initializes Prometheus metrics for the geolocation service
func (c *Client) initMetrics() {
	// Create a collector for the geolocation subsystem
	c.collector = c.metrics.NewCollector("geolocation")

	// Register metrics
	var err error

	// Track lookup operations
	c.lookupsTotal, err = c.collector.NewCounterVec(
		"lookups_total",
		"Total number of geolocation lookups",
		[]string{"status"}, // status can be 'success', 'error', 'not_found'
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create lookups_total metric")
	}

	// Track lookup duration
	c.lookupDuration, err = c.collector.NewHistogramVec(
		"lookup_duration_seconds",
		"Duration of geolocation lookups in seconds",
		[]string{},
		prometheus.DefBuckets,
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create lookup_duration_seconds metric")
	}

	// Track database load operations
	c.databaseLoadTotal, err = c.collector.NewCounterVec(
		"database_load_total",
		"Total number of geolocation database load operations",
		[]string{"status", "source"}, // status: 'success', 'error'; source: 'url', 'local'
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create database_load_total metric")
	}

	// Track number of items in the database
	c.cacheItems, err = c.collector.NewGaugeVec(
		"database_items",
		"Number of items in the geolocation database",
		[]string{"type"}, // type: 'cities', 'countries', 'continents'
	)
	if err != nil {
		c.log.WithError(err).Warn("Failed to create database_items metric")
	}
}

// Start initializes the geolocation database
func (c *Client) Start(ctx context.Context) error {
	// Skip if geolocation is disabled
	if c.config != nil && c.config.Enabled != nil && !*c.config.Enabled {
		c.log.Info("Geolocation service is disabled, skipping database load")
		return nil
	}

	var status = "success"

	var source = "unknown"

	// Defer metrics recording
	defer func() {
		c.databaseLoadTotal.WithLabelValues(status, source).Inc()
	}()

	// Load the CSV data from either URL or local file
	csvData, err := c.loadDatabaseFromLocation()
	if err != nil {
		status = StatusError

		return fmt.Errorf("failed to load geolocation database: %w", err)
	}

	// Determine source for metrics
	if strings.HasPrefix(c.databaseLocation, "http://") || strings.HasPrefix(c.databaseLocation, "https://") {
		source = "url"
	} else {
		source = "local"
	}

	// Load the CSV data into memory
	err = c.loadCSV(csvData)
	if err != nil {
		status = StatusError
	}

	return err
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
	startTime := time.Now()

	var status = "success"

	var found = false

	// Defer metrics recording
	defer func() {
		duration := time.Since(startTime).Seconds()
		c.lookupDuration.WithLabelValues().Observe(duration)

		if !found {
			status = "not_found"
		}

		c.lookupsTotal.WithLabelValues(status).Inc()
	}()

	if err := params.Validate(); err != nil {
		status = StatusError

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
					found = true

					return &cityInfo, true
				}
			} else {
				// No city specified, return first city in the country
				for _, cityInfo := range countryMap {
					found = true

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
				found = true

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
					found = true

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
				found = true

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
