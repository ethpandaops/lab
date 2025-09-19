package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	metricsCollector *metrics.Collector
	metricsOnce      sync.Once

	httpRequestsTotal    *prometheus.CounterVec
	httpRequestDuration  *prometheus.HistogramVec
	httpRequestsInFlight *prometheus.GaugeVec
)

// InitializeMetrics must be called once with the metrics service
func InitializeMetrics(m *metrics.Metrics) error {
	var initErr error

	metricsOnce.Do(func() {
		metricsCollector = m.NewCollector("rest_api")

		var err error

		// Initialize metrics
		httpRequestsTotal, err = metricsCollector.NewCounterVec(
			"requests_total",
			"Total number of HTTP requests",
			[]string{"method", "path", "status"},
		)
		if err != nil {
			initErr = err

			return
		}

		httpRequestDuration, err = metricsCollector.NewHistogramVec(
			"request_duration_seconds",
			"Duration of HTTP requests in seconds",
			[]string{"method", "path", "status"},
			prometheus.DefBuckets,
		)
		if err != nil {
			initErr = err

			return
		}

		httpRequestsInFlight, err = metricsCollector.NewGaugeVec(
			"requests_in_flight",
			"Number of HTTP requests currently being processed",
			[]string{"method", "path"},
		)
		if err != nil {
			initErr = err

			return
		}
	})

	return initErr
}

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
			// Skip if metrics not initialized
			if httpRequestsTotal == nil || httpRequestDuration == nil || httpRequestsInFlight == nil {
				next(w, r)

				return
			}

			start := time.Now()
			wrapped := newMetricsResponseWriter(w)

			// Track in-flight requests
			httpRequestsInFlight.WithLabelValues(r.Method, pathTemplate).Inc()
			defer httpRequestsInFlight.WithLabelValues(r.Method, pathTemplate).Dec()

			// Process request
			next(wrapped, r)

			// Record metrics
			duration := time.Since(start).Seconds()
			status := strconv.Itoa(wrapped.statusCode)

			httpRequestsTotal.WithLabelValues(r.Method, pathTemplate, status).Inc()
			httpRequestDuration.WithLabelValues(r.Method, pathTemplate, status).Observe(duration)
		}
	}
}
