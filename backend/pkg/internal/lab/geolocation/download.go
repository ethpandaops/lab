package geolocation

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/sirupsen/logrus"
)

// loadDatabaseFromLocation loads database from either a URL or a local file path
func (c *Client) loadDatabaseFromLocation() ([]byte, error) {
	// Check if the location is a URL
	if strings.HasPrefix(c.databaseLocation, "http://") || strings.HasPrefix(c.databaseLocation, "https://") {
		c.log.Debug("Detected URL, downloading database from", c.databaseLocation)

		return c.downloadAndExtract()
	}

	// Otherwise treat as a local file path
	c.log.Debug("Detected local file path, loading database from", c.databaseLocation)

	return c.loadFromLocalFile()
}

// loadFromLocalFile loads the database from a local file
func (c *Client) loadFromLocalFile() ([]byte, error) {
	// Read the file
	zipData, err := os.ReadFile(c.databaseLocation)
	if err != nil {
		return nil, fmt.Errorf("failed to read local file: %w", err)
	}

	// Process as ZIP file
	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		// If not a ZIP file, check if it's directly a CSV file
		if strings.HasSuffix(strings.ToLower(c.databaseLocation), ".csv") {
			return zipData, nil // Return the CSV data directly
		}

		return nil, fmt.Errorf("failed to parse zip data: %w", err)
	}

	// Find the CSV file in the zip
	for _, f := range zipReader.File {
		if filepath.Ext(f.Name) != ".csv" {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open csv file in zip: %w", err)
		}

		// Read the CSV content directly into memory
		c.log.Debug("Extracting city database to memory...")

		csvData, err := io.ReadAll(rc)
		// Close the reader before checking for errors or returning
		closeErr := rc.Close()

		if err != nil {
			return nil, fmt.Errorf("failed to read csv data: %w", err)
		}

		if closeErr != nil {
			c.log.WithError(closeErr).Warn("Failed to close zip file reader")
		}

		return csvData, nil
	}

	return nil, fmt.Errorf("no CSV file found in zip")
}

// downloadAndExtract downloads and extracts the cities database directly into memory
func (c *Client) downloadAndExtract() ([]byte, error) {
	// Download the zip file directly into memory
	c.log.Debug("Downloading city database from", c.databaseLocation)

	resp, err := http.Get(c.databaseLocation)
	if err != nil {
		return nil, fmt.Errorf("failed to download database: %w", err)
	}

	defer resp.Body.Close()

	// Check if the response content is a CSV file
	if strings.Contains(resp.Header.Get("Content-Type"), "text/csv") {
		c.log.Debug("Response is a CSV file...")
		// Read the CSV content directly
		csvData, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read csv data: %w", err)
		}

		return csvData, nil
	}

	// Read the whole response body
	zipData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read zip data: %w", err)
	}

	// Create a reader for the in-memory zip data
	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		// If not a ZIP file, check if it's directly a CSV file
		if resp.Header.Get("Content-Type") == "text/csv" || strings.HasSuffix(c.databaseLocation, ".csv") {
			return zipData, nil // Return the CSV data directly
		}

		return nil, fmt.Errorf("failed to parse zip data: %w", err)
	}

	// Find the CSV file in the zip
	for _, f := range zipReader.File {
		if filepath.Base(f.Name) != "worldcities.csv" && filepath.Base(f.Name) != "worldcities.zip" {
			continue
		}

		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open csv file in zip: %w", err)
		}

		// Read the CSV content directly into memory
		c.log.Debug("Extracting city database to memory...")

		csvData, err := io.ReadAll(rc)
		// Close the reader before checking for errors or returning
		closeErr := rc.Close()

		if err != nil {
			return nil, fmt.Errorf("failed to read csv data: %w", err)
		}

		if closeErr != nil {
			c.log.WithError(closeErr).Warn("Failed to close zip file reader")
		}

		return csvData, nil
	}

	return nil, fmt.Errorf("no CSV file found in zip")
}

// loadCSV loads the cities database from CSV data in memory
//
//nolint:gocyclo // this is a complex function
func (c *Client) loadCSV(csvData []byte) error {
	// Create a CSV reader from the in-memory data
	r := csv.NewReader(bytes.NewReader(csvData))

	// Read the header
	header, err := r.Read()
	if err != nil {
		return fmt.Errorf("failed to read csv header: %w", err)
	}

	// Find column indices
	colCity := indexOf(header, "city")
	colCountry := indexOf(header, "country")
	colLat := indexOf(header, "lat")
	colLon := indexOf(header, "lng")
	colPopulation := indexOf(header, "population")
	colISO2 := indexOf(header, "iso2")
	colISO3 := indexOf(header, "iso3")
	colCoordinates := indexOf(header, "coordinates")

	if colCity == -1 || colCountry == -1 {
		return fmt.Errorf("expected city and country headers not found in CSV")
	}

	if colCoordinates == -1 && (colLat == -1 || colLon == -1) {
		return fmt.Errorf("coordinates or latitude/longitude headers not found in CSV")
	}

	// Process CSV rows
	citiesLoaded := 0
	countriesLoaded := 0

	for {
		row, err := r.Read()
		if err == io.EOF {
			break
		}

		if err != nil {
			c.log.WithError(err).Debug("Skipping invalid CSV row")

			continue
		}

		// Make sure we have enough columns
		if len(row) <= colCity || len(row) <= colCountry || len(row) <= colLat || len(row) <= colLon {
			c.log.Debug("Skipping row with insufficient data")

			continue
		}

		city := strings.ToLower(row[colCity])
		country := strings.ToLower(row[colCountry])
		population := ""
		iso2 := ""
		iso3 := ""

		// Optional fields
		if colPopulation != -1 && len(row) > colPopulation {
			population = row[colPopulation]
		}

		if colISO2 != -1 && len(row) > colISO2 {
			iso2 = row[colISO2]
		}

		if colISO3 != -1 && len(row) > colISO3 {
			iso3 = row[colISO3]
		}

		// If coordinates are present, attempt to parse them
		var lat, lon float64

		if colCoordinates != -1 {
			coordinates := strings.Split(row[colCoordinates], ",")
			if len(coordinates) == 2 {
				latErr := false
				lonErr := false

				_, err := fmt.Sscanf(coordinates[0], "%f", &lat)
				if err != nil {
					c.log.WithError(err).Debug("Failed to parse latitude coordinate")

					latErr = true
				}

				_, err = fmt.Sscanf(coordinates[1], "%f", &lon)
				if err != nil {
					c.log.WithError(err).Debug("Failed to parse longitude coordinate")

					lonErr = true
				}

				// Skip this entry if both coordinates failed to parse
				if latErr && lonErr {
					c.log.WithFields(logrus.Fields{
						"city":    city,
						"country": country,
					}).Debug("Skipping entry with invalid coordinates")

					continue
				}
			}
		} else if colLat != -1 && colLon != -1 {
			latErr := false
			lonErr := false

			_, err := fmt.Sscanf(row[colLat], "%f", &lat)
			if err != nil {
				c.log.WithError(err).Debug("Failed to parse latitude")

				latErr = true
			}

			_, err = fmt.Sscanf(row[colLon], "%f", &lon)
			if err != nil {
				c.log.WithError(err).Debug("Failed to parse longitude")

				lonErr = true
			}

			// Skip this entry if both coordinates failed to parse
			if latErr && lonErr {
				c.log.WithFields(logrus.Fields{
					"city":    city,
					"country": country,
				}).Debug("Skipping entry with invalid coordinates")

				continue
			}
		}

		cityInfo := CityInfo{
			City:       city,
			Country:    country,
			Population: population,
			ISO2:       iso2,
			ISO3:       iso3,
			Lat:        lat,
			Lon:        lon,
		}

		// Default continent key for the data structure
		continent := "unknown"

		// Initialize continent map if needed
		if _, exists := c.locationDB.Continents[continent]; !exists {
			c.locationDB.Continents[continent] = make(map[string]map[string]CityInfo)
		}

		// Initialize country map if needed
		if _, exists := c.locationDB.Continents[continent][country]; !exists {
			c.locationDB.Continents[continent][country] = make(map[string]CityInfo)
			countriesLoaded++
		}

		// Add city
		c.locationDB.Continents[continent][country][city] = cityInfo
		citiesLoaded++
	}

	c.log.WithFields(logrus.Fields{
		"cities":    citiesLoaded,
		"countries": countriesLoaded,
	}).Info("Geolocation database loaded successfully into memory")

	// Update metrics
	c.cacheItems.WithLabelValues("cities").Set(float64(citiesLoaded))
	c.cacheItems.WithLabelValues("countries").Set(float64(countriesLoaded))
	c.cacheItems.WithLabelValues("continents").Set(float64(len(c.locationDB.Continents)))

	return nil
}
