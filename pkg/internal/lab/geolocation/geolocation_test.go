package geolocation

import (
	"context"
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNew(t *testing.T) {
	log := logrus.New()

	// Test with nil config
	client, err := New(log, nil)
	require.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, defaultURL, client.databaseLocation)

	// Test with custom config
	customURL := "https://example.com/custom.zip"
	client, err = New(log, &Config{DatabaseLocation: customURL})
	require.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, customURL, client.databaseLocation)
}

func TestIndexOf(t *testing.T) {
	headers := []string{"id", "name", "age", "city"}

	tests := []struct {
		name     string
		search   string
		expected int
	}{
		{"exact match", "name", 1},
		{"case insensitive", "AGE", 2},
		{"not found", "country", -1},
		{"empty search", "", -1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := indexOf(headers, tt.search)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestLocationDBStructure(t *testing.T) {
	log := logrus.New()

	client, err := New(log, nil)
	require.NoError(t, err)

	// Manually add some test data
	client.locationDB.Continents["europe"] = make(map[string]map[string]CityInfo)
	client.locationDB.Continents["europe"]["germany"] = make(map[string]CityInfo)
	client.locationDB.Continents["europe"]["germany"]["berlin"] = CityInfo{
		City:       "berlin",
		Country:    "germany",
		Lat:        52.52,
		Lon:        13.405,
		Population: "3500000",
		ISO2:       "DE",
		ISO3:       "DEU",
	}

	// Test continent retrieval
	continents := client.GetContinents()
	assert.Contains(t, continents, "europe")
	assert.Len(t, continents, 1)

	// Test country retrieval
	countries := client.GetCountries("europe")
	assert.Contains(t, countries, "germany")
	assert.Len(t, countries, 1)

	// Test city retrieval
	cities := client.GetCities("europe", "germany")
	assert.Contains(t, cities, "berlin")
	assert.Len(t, cities, 1)

	// Test lookup by all parameters
	cityInfo, found := client.LookupCity(LookupParams{
		City:    "berlin",
		Country: "germany",
	})
	assert.True(t, found)
	assert.Equal(t, 52.52, cityInfo.Lat)
	assert.Equal(t, 13.405, cityInfo.Lon)

	// Test lookup by country only
	cityInfo, found = client.LookupCity(LookupParams{Country: "germany"})
	assert.True(t, found)
	assert.Equal(t, "berlin", cityInfo.City)

	// Test lookup by city only
	cityInfo, found = client.LookupCity(LookupParams{City: "berlin"})
	assert.True(t, found)
	assert.Equal(t, "germany", cityInfo.Country)

	// Test lookup non-existent
	_, found = client.LookupCity(LookupParams{
		City:    "nonexistent",
		Country: "country",
	})
	assert.False(t, found)
}

func TestLoadCSVWithMockData(t *testing.T) {
	log := logrus.New()

	client, err := New(log, nil)
	require.NoError(t, err)

	// Create mock CSV data in memory
	csvContent := []byte(`city,country,lat,lng,population,iso2,iso3
Berlin,Germany,52.52,13.405,3500000,DE,DEU
Paris,France,48.8566,2.3522,2200000,FR,FRA
New York,United States,40.7128,-74.006,8500000,US,USA
`)

	// Load the mock CSV from memory
	err = client.loadCSV(csvContent)
	require.NoError(t, err)

	// Verify data was loaded correctly
	assert.Len(t, client.locationDB.Continents, 1)                             // Unknown continent
	assert.Len(t, client.locationDB.Continents["unknown"], 3)                  // Germany, France, and United States
	assert.Len(t, client.locationDB.Continents["unknown"]["germany"], 1)       // Berlin
	assert.Len(t, client.locationDB.Continents["unknown"]["united states"], 1) // New York

	// Test city lookup
	berlinInfo, found := client.LookupCity(LookupParams{
		City:    "berlin",
		Country: "germany",
	})
	assert.True(t, found)
	assert.Equal(t, 52.52, berlinInfo.Lat)
	assert.Equal(t, 13.405, berlinInfo.Lon)
	assert.Equal(t, "3500000", berlinInfo.Population)
	assert.Equal(t, "DE", berlinInfo.ISO2)
	assert.Equal(t, "DEU", berlinInfo.ISO3)

	// Test country lookup
	franceInfo, found := client.LookupCity(LookupParams{Country: "france"})
	assert.True(t, found)
	assert.Equal(t, "paris", franceInfo.City)

	// Test city lookup
	usaInfo, found := client.LookupCity(LookupParams{City: "new york"})
	assert.True(t, found)
	assert.Equal(t, "united states", usaInfo.Country)
}

func TestValidateParams(t *testing.T) {
	tests := []struct {
		name       string
		params     LookupParams
		shouldFail bool
	}{
		{
			name:       "empty params",
			params:     LookupParams{},
			shouldFail: true,
		},
		{
			name:       "city only",
			params:     LookupParams{City: "berlin"},
			shouldFail: false,
		},
		{
			name:       "country only",
			params:     LookupParams{Country: "germany"},
			shouldFail: false,
		},
		{
			name:       "all params",
			params:     LookupParams{City: "berlin", Country: "germany"},
			shouldFail: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.params.Validate()
			if tt.shouldFail {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// This test is skipped by default as it would download real data
func TestInitialize(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping initialization test in short mode")
	}

	log := logrus.New()

	client, err := New(log, nil)
	require.NoError(t, err)

	err = client.Start(context.Background())
	require.NoError(t, err)

	// Verify data was loaded
	assert.Greater(t, len(client.locationDB.Continents), 0)

	// Try a lookup for a known city
	cityInfo, found := client.LookupCity(LookupParams{
		City:    "london",
		Country: "united kingdom",
	})
	if found {
		assert.Equal(t, "london", cityInfo.City)
		assert.Equal(t, "united kingdom", cityInfo.Country)
	}
}
