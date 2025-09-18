package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPRequestsTotal counts total HTTP requests
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "lab",
			Subsystem: "rest_api",
			Name:      "requests_total",
			Help:      "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestDuration tracks request duration
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: "lab",
			Subsystem: "rest_api",
			Name:      "request_duration_seconds",
			Help:      "Duration of HTTP requests in seconds",
			Buckets:   prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestsInFlight tracks concurrent requests
	HTTPRequestsInFlight = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "lab",
			Subsystem: "rest_api",
			Name:      "requests_in_flight",
			Help:      "Number of HTTP requests currently being processed",
		},
		[]string{"method", "path"},
	)
)

// metricsResponseWriter wraps http.ResponseWriter to capture status code
type metricsResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newMetricsResponseWriter(w http.ResponseWriter) *metricsResponseWriter {
	return &metricsResponseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (mrw *metricsResponseWriter) WriteHeader(code int) {
	mrw.statusCode = code
	mrw.ResponseWriter.WriteHeader(code)
}

// WithMetrics adds metrics collection middleware
func WithMetrics(pathTemplate string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := newMetricsResponseWriter(w)

			// Track in-flight requests
			HTTPRequestsInFlight.WithLabelValues(r.Method, pathTemplate).Inc()
			defer HTTPRequestsInFlight.WithLabelValues(r.Method, pathTemplate).Dec()

			// Process request
			next(wrapped, r)

			// Record metrics
			duration := time.Since(start).Seconds()
			status := strconv.Itoa(wrapped.statusCode)

			HTTPRequestsTotal.WithLabelValues(r.Method, pathTemplate, status).Inc()
			HTTPRequestDuration.WithLabelValues(r.Method, pathTemplate, status).Observe(duration)
		}
	}
}
