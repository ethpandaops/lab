package metrics

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
)

// Metrics provides a structured way to manage Prometheus metrics for the lab service.
// It acts as a central registry and factory for subsystem-specific collectors.
type Metrics struct {
	namespace    string
	registry     *prometheus.Registry
	log          logrus.FieldLogger
	mu           sync.Mutex // Protects collectors map
	collectors   map[string]*Collector
	commonLabels map[string]string
}

// NewMetricsService initializes a new Metrics service.
// It creates a Prometheus registry and prepares the service for use.
func NewMetricsService(namespace string, log logrus.FieldLogger, labels ...string) *Metrics {
	if log == nil {
		log = logrus.New() // Default logger if none provided
	}

	return &Metrics{
		namespace:    namespace,
		registry:     prometheus.NewRegistry(),
		log:          log.WithField("service", "metrics"),
		collectors:   make(map[string]*Collector),
		commonLabels: make(map[string]string),
	}
}

// SetCommonLabel sets a common label that will be applied to all metrics.
func (m *Metrics) SetCommonLabel(name, value string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.commonLabels[sanitizeMetricName(name)] = value

	// Update all existing collectors with the new label
	for _, collector := range m.collectors {
		collector.commonLabels = make(map[string]string)
		for k, v := range m.commonLabels {
			collector.commonLabels[k] = v
		}
	}
}

// SetCommonLabels sets multiple common labels at once.
func (m *Metrics) SetCommonLabels(labels map[string]string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for k, v := range labels {
		m.commonLabels[sanitizeMetricName(k)] = v
	}

	// Update all existing collectors with the new labels
	for _, collector := range m.collectors {
		collector.commonLabels = make(map[string]string)
		for k, v := range m.commonLabels {
			collector.commonLabels[k] = v
		}
	}
}

// Log returns the logger associated with this metrics service.
func (m *Metrics) Log() logrus.FieldLogger {
	return m.log
}

// Handler returns an http.Handler that exposes the metrics registered with this service.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{
		Registry: m.registry,
	})
}

// Collector provides methods to create and register metrics within a specific subsystem.
type Collector struct {
	namespace    string
	subsystem    string
	registry     *prometheus.Registry
	log          logrus.FieldLogger
	commonLabels map[string]string
}

// NewCollector creates or retrieves a metric collector for a specific subsystem.
// It ensures that collectors for the same subsystem are reused.
func (m *Metrics) NewCollector(subsystem string) *Collector {
	m.mu.Lock()
	defer m.mu.Unlock()

	subsystem = sanitizeMetricName(subsystem)
	if collector, exists := m.collectors[subsystem]; exists {
		// Update the collector with the latest common labels
		collector.commonLabels = make(map[string]string)
		for k, v := range m.commonLabels {
			collector.commonLabels[k] = v
		}

		return collector
	}

	collector := &Collector{
		namespace:    m.namespace,
		subsystem:    subsystem,
		registry:     m.registry,
		log:          m.log.WithField("subsystem", subsystem),
		commonLabels: make(map[string]string),
	}

	// Copy common labels to the collector
	for k, v := range m.commonLabels {
		collector.commonLabels[k] = v
	}

	m.collectors[subsystem] = collector
	m.log.WithField("subsystem", subsystem).Debug("Created new metrics collector")

	return collector
}

// sanitizeMetricName ensures metric names follow Prometheus conventions (snake_case).
func sanitizeMetricName(name string) string {
	// Basic sanitization, can be expanded if needed
	name = strings.ReplaceAll(name, "-", "_")
	name = strings.ToLower(name)

	return name
}

// sanitizeLabels ensures label names follow Prometheus conventions (snake_case).
func sanitizeLabels(labels []string) []string {
	sanitized := make([]string, len(labels))
	for i, label := range labels {
		sanitized[i] = sanitizeMetricName(label)
	}

	return sanitized
}

// getCommonLabelNames returns the names of all common labels as a slice.
func (c *Collector) getCommonLabelNames() []string {
	names := make([]string, 0, len(c.commonLabels))
	for name := range c.commonLabels {
		names = append(names, name)
	}

	return names
}

// NewCounterVec creates and registers a new CounterVec metric.
// It automatically prefixes the metric name with the namespace and subsystem.
// Labels must be in snake_case.
// Returns the metric and any error that occurred during registration.
func (c *Collector) NewCounterVec(name, help string, labels []string) (*prometheus.CounterVec, error) {
	opts := prometheus.CounterOpts{
		Namespace: c.namespace,
		Subsystem: c.subsystem,
		Name:      sanitizeMetricName(name),
		Help:      help,
	}

	// Combine common labels with metric-specific labels
	allLabels := append(c.getCommonLabelNames(), labels...)
	sanitizedLabels := sanitizeLabels(allLabels)

	counterVec := prometheus.NewCounterVec(opts, sanitizedLabels)
	err := c.registry.Register(counterVec)

	// If we have common labels, pre-create a counter with those values
	if len(c.commonLabels) > 0 {
		counterVec.With(c.commonLabels)
	}

	if err != nil {
		// Check if this is a duplicate registration error
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			// If it's already registered, try to cast the existing collector to CounterVec
			if existingCounterVec, ok := are.ExistingCollector.(*prometheus.CounterVec); ok {
				return existingCounterVec, nil
			}
			// If the existing collector is not a CounterVec, this is a type mismatch error
			return nil, fmt.Errorf("type mismatch for metric %s_%s_%s: expected CounterVec", c.namespace, c.subsystem, name)
		}
		// For other registration errors, log a warning
		c.log.WithError(err).Warnf("Failed to register CounterVec %s_%s_%s", c.namespace, c.subsystem, name)

		return nil, err
	}

	c.log.Debugf("Registered new CounterVec %s_%s_%s", c.namespace, c.subsystem, name)

	return counterVec, nil
}

// NewGaugeVec creates and registers a new GaugeVec metric.
// It automatically prefixes the metric name with the namespace and subsystem.
// Labels must be in snake_case.
// Returns the metric and any error that occurred during registration.
func (c *Collector) NewGaugeVec(name, help string, labels []string) (*prometheus.GaugeVec, error) {
	opts := prometheus.GaugeOpts{
		Namespace: c.namespace,
		Subsystem: c.subsystem,
		Name:      sanitizeMetricName(name),
		Help:      help,
	}

	// Combine common labels with metric-specific labels
	allLabels := append(c.getCommonLabelNames(), labels...)
	sanitizedLabels := sanitizeLabels(allLabels)

	gaugeVec := prometheus.NewGaugeVec(opts, sanitizedLabels)
	err := c.registry.Register(gaugeVec)

	// If we have common labels, pre-create a gauge with those values
	if len(c.commonLabels) > 0 {
		gaugeVec.With(c.commonLabels)
	}

	if err != nil {
		// Check if this is a duplicate registration error
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			// If it's already registered, try to cast the existing collector to GaugeVec
			if existingGaugeVec, ok := are.ExistingCollector.(*prometheus.GaugeVec); ok {
				c.log.Debugf("Reusing existing GaugeVec %s_%s_%s", c.namespace, c.subsystem, name)

				return existingGaugeVec, nil
			}

			return nil, fmt.Errorf("type mismatch for metric %s_%s_%s: expected GaugeVec", c.namespace, c.subsystem, name)
		}
		// For other registration errors, log a warning
		c.log.WithError(err).Warnf("Failed to register GaugeVec %s_%s_%s", c.namespace, c.subsystem, name)

		return nil, err
	}

	c.log.Debugf("Registered new GaugeVec %s_%s_%s", c.namespace, c.subsystem, name)

	return gaugeVec, nil
}

// NewHistogramVec creates and registers a new HistogramVec metric.
// It automatically prefixes the metric name with the namespace and subsystem.
// Labels must be in snake_case. Buckets can be nil for default buckets.
// Returns the metric and any error that occurred during registration.
func (c *Collector) NewHistogramVec(name, help string, labels []string, buckets []float64) (*prometheus.HistogramVec, error) {
	opts := prometheus.HistogramOpts{
		Namespace: c.namespace,
		Subsystem: c.subsystem,
		Name:      sanitizeMetricName(name),
		Help:      help,
		Buckets:   buckets, // Use default buckets if nil
	}

	// Combine common labels with metric-specific labels
	allLabels := append(c.getCommonLabelNames(), labels...)
	sanitizedLabels := sanitizeLabels(allLabels)

	histogramVec := prometheus.NewHistogramVec(opts, sanitizedLabels)
	err := c.registry.Register(histogramVec)

	// If we have common labels, pre-create a histogram with those values
	if len(c.commonLabels) > 0 {
		histogramVec.With(c.commonLabels)
	}

	if err != nil {
		// Check if this is a duplicate registration error
		if are, ok := err.(prometheus.AlreadyRegisteredError); ok {
			// If it's already registered, try to cast the existing collector to HistogramVec
			if existingHistogramVec, ok := are.ExistingCollector.(*prometheus.HistogramVec); ok {
				return existingHistogramVec, nil
			}

			return nil, fmt.Errorf("type mismatch for metric %s_%s_%s: expected HistogramVec", c.namespace, c.subsystem, name)
		}
		// For other registration errors, log a warning
		c.log.WithError(err).Warnf("Failed to register HistogramVec %s_%s_%s", c.namespace, c.subsystem, name)

		return nil, err
	}

	c.log.Debugf("Registered new HistogramVec %s_%s_%s", c.namespace, c.subsystem, name)

	return histogramVec, nil
}
