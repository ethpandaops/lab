package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
)

// Constants for S3 error codes and content types
const (
	S3ErrorNoSuchKey       = "NoSuchKey"
	ContentTypeOctetStream = "application/octet-stream"
	StatusError            = "error"
	StatusSuccess          = "success"
	StatusNotFound         = "not_found"
	SmithyAPI404           = "NotFound"
)

// StoreParams defines the parameters for the Store operation
type StoreParams struct {
	Key         string
	Data        interface{}           // Can be []byte or a struct if Format is provided
	Format      CodecName             // Optional: If set, Data will be encoded using this format
	Atomic      bool                  // Optional: If true, uses atomic write pattern (defaults false)
	Metadata    map[string]string     // Optional: Additional metadata for the S3 object
	Compression *CompressionAlgorithm // Optional: If set, data will be compressed
}

// Validate checks if the StoreParams are valid for a storage operation
func (p *StoreParams) Validate() error {
	if p.Key == "" {
		return fmt.Errorf("key is required")
	}

	if p.Data == nil {
		return fmt.Errorf("data is required")
	}

	// If Format is specified, verify it's a supported format
	if p.Format != "" {
		switch p.Format {
		case CodecNameJSON, CodecNameYAML:
			// Valid formats
		default:
			return fmt.Errorf("unsupported format: %s", p.Format)
		}
	} else {
		// If no Format is provided, Data must be []byte
		if _, ok := p.Data.([]byte); !ok {
			return fmt.Errorf("invalid data type: data must be []byte when no format is specified, got %T", p.Data)
		}
	}

	// If Compression is specified, verify it's a supported algorithm
	if p.Compression != nil && p.Compression != None {
		switch p.Compression.Name {
		case Gzip.Name:
			// Supported compression algorithm
		default:
			return fmt.Errorf("unsupported compression algorithm: %s", p.Compression.Name)
		}
	}

	return nil
}

type Client interface {
	Start(ctx context.Context) error
	GetClient() *s3.Client
	GetBucket() string
	Store(ctx context.Context, params StoreParams) error // Unified Store method
	Get(ctx context.Context, key string) ([]byte, error)
	Exists(ctx context.Context, key string) (bool, error)
	GetEncoded(ctx context.Context, key string, v any, format CodecName) error
	Delete(ctx context.Context, key string) error
	List(ctx context.Context, prefix string) ([]string, error)
	Stop() error
}

var (
	ErrNotFound = errors.New("not found")
)

// Client represents an S3 storage client
type client struct {
	client            *s3.Client
	config            *Config
	log               logrus.FieldLogger
	ctx               context.Context //nolint:containedctx // context is used for storage operations
	encoders          *Registry
	compressor        *Compressor
	metricsCollector  *metrics.Collector
	operationsTotal   *prometheus.CounterVec
	operationDuration *prometheus.HistogramVec
	bytesProcessed    *prometheus.CounterVec
	errorsTotal       *prometheus.CounterVec
}

// New creates a new S3 storage client
func New(
	cfg *Config,
	log logrus.FieldLogger,
	metricsSvc *metrics.Metrics,
) (Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger is required")
	}

	c := &client{
		log:        log.WithField("module", "storage"),
		config:     cfg,
		encoders:   NewRegistry(),
		compressor: NewCompressor(),
	}

	// Initialize metrics if provided
	if metricsSvc != nil {
		collector := metricsSvc.NewCollector("storage")
		c.metricsCollector = collector

		var err error

		// Operations counter (put/get/delete/list/exists)
		c.operationsTotal, err = collector.NewCounterVec(
			"operations_total",
			"Total number of storage operations",
			[]string{"operation", "status"},
		)
		if err != nil {
			log.WithError(err).Warn("Failed to create storage_operations_total metric")
		}

		// Operation duration histogram
		c.operationDuration, err = collector.NewHistogramVec(
			"operation_duration_seconds",
			"Duration of storage operations in seconds",
			[]string{"operation"},
			nil, // Use default buckets
		)
		if err != nil {
			log.WithError(err).Warn("Failed to create storage_operation_duration_seconds metric")
		}

		// Bytes processed counter (read/write)
		c.bytesProcessed, err = collector.NewCounterVec(
			"bytes_processed_total",
			"Total number of bytes processed by storage operations",
			[]string{"operation"},
		)
		if err != nil {
			log.WithError(err).Warn("Failed to create storage_bytes_processed_total metric")
		}

		// Errors counter
		c.errorsTotal, err = collector.NewCounterVec(
			"errors_total",
			"Total number of storage operation errors",
			[]string{"operation"},
		)
		if err != nil {
			log.WithError(err).Warn("Failed to create storage_errors_total metric")
		}
	}

	return c, nil
}

func (c *client) Start(ctx context.Context) error {
	c.log.Info("Starting S3 storage client")

	// Call Validate to ensure basic requirements are met
	if err := c.config.Validate(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Ensure endpoint has a protocol
	endpoint := c.config.Endpoint
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		// Add http:// by default, or https:// if Secure is true
		if c.config.Secure {
			endpoint = "https://" + endpoint
		} else {
			endpoint = "http://" + endpoint
		}

		c.log.WithFields(logrus.Fields{
			"original": c.config.Endpoint,
			"modified": endpoint,
		}).Debug("Added protocol scheme to endpoint URL")
	}

	// Validate that the endpoint URL is valid
	_, err := url.Parse(endpoint)
	if err != nil {
		return fmt.Errorf("invalid endpoint URL: %w", err)
	}

	// Create S3 configuration with custom endpoint
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion(c.config.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(c.config.AccessKey, c.config.SecretKey, "")),
	)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client with custom endpoint options
	c.client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
		o.Region = c.config.Region
	})
	c.ctx = ctx

	// Check if the bucket exists, create it if it doesn't
	exists, err := c.bucketExists(ctx, c.config.Bucket)
	if err != nil {
		c.log.WithError(err).Warnf("Failed to check if bucket %s exists", c.config.Bucket)
	} else if !exists {
		return fmt.Errorf("bucket %s does not exist", c.config.Bucket)
	}

	c.log.Info("S3 storage client started")

	return nil
}

// GetClient returns the underlying S3 client
func (c *client) GetClient() *s3.Client {
	return c.client
}

// GetBucket returns the bucket name
func (c *client) GetBucket() string {
	return c.config.Bucket
}

// Exists checks if a key exists in storage
func (c *client) Exists(ctx context.Context, key string) (bool, error) {
	start := time.Now()

	var status = StatusSuccess

	var exists bool

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "exists",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "exists",
		}).Observe(time.Since(start).Seconds())
	}()

	rsp, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		status = StatusError

		// Check for NoSuchKey error using APIError type
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && (apiErr.ErrorCode() == S3ErrorNoSuchKey || apiErr.ErrorCode() == SmithyAPI404) {
			exists = false

			return exists, nil
		}

		c.errorsTotal.With(prometheus.Labels{"operation": "exists"}).Inc()

		return false, fmt.Errorf("failed to check if object exists: %w", err)
	}

	if rsp == nil {
		exists = false

		status = StatusError

		return exists, nil
	}

	exists = true

	return exists, nil
}

// Store stores data based on the provided parameters.
// It handles encoding, compression, atomicity, content type, and metadata.
//

func (c *client) Store(ctx context.Context, params StoreParams) error {
	start := time.Now()

	var status = StatusSuccess

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "store",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "store",
		}).Observe(time.Since(start).Seconds())
	}()

	// Validate params before proceeding
	if err := params.Validate(); err != nil {
		status = StatusError

		c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

		return fmt.Errorf("invalid store parameters: %w", err)
	}

	var dataBytes []byte

	finalKey := params.Key

	// 1. Handle Encoding if Format is specified
	if params.Format != "" {
		codec, err := c.encoders.Get(params.Format)
		if err != nil {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("failed to get codec '%s': %w", params.Format, err)
		}

		dataBytes, err = codec.Encode(params.Data)
		if err != nil {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("failed to encode object with format '%s': %w", params.Format, err)
		}

		// Ensure key has the correct file extension
		if !strings.HasSuffix(finalKey, "."+codec.FileExtension()) {
			finalKey = finalKey + "." + codec.FileExtension()
		}

		// Add encoding format to metadata if not already present
		if params.Metadata == nil {
			params.Metadata = make(map[string]string)
		}

		if _, exists := params.Metadata["Encoding-Format"]; !exists {
			params.Metadata["Encoding-Format"] = string(params.Format)
		}
	} else {
		// Assume Data is []byte if Format is not specified
		var ok bool

		dataBytes, ok = params.Data.([]byte)
		if !ok {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("invalid data type: expected []byte when Format is not specified, got %T", params.Data)
		}
	}

	// 2. Handle Compression if specified
	if params.Compression != nil && params.Compression != None {
		compressed, err := c.compressor.Compress(dataBytes, params.Compression)
		if err != nil {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("failed to compress data: %w", err)
		}

		dataBytes = compressed

		// Add Content-Encoding to metadata
		if params.Metadata == nil {
			params.Metadata = make(map[string]string)
		}

		params.Metadata["content-encoding"] = params.Compression.ContentEncoding
	}

	// 3. Determine Content Type
	var contentType string

	if params.Format != "" {
		codec, err := c.encoders.Get(params.Format)
		if err != nil {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("failed to get codec '%s': %w", params.Format, err)
		}

		contentType = codec.GetContentType()
	} else {
		// Use default content type for raw bytes
		contentType = ContentTypeOctetStream
	}

	// Track bytes written
	c.bytesProcessed.With(prometheus.Labels{"operation": "write"}).Add(float64(len(dataBytes)))

	// 4. Handle Atomicity
	if params.Atomic {
		tempKey := fmt.Sprintf("%s.%d.tmp", finalKey, time.Now().UnixNano())

		// Store the data in a temporary location
		if err := c.putObject(ctx, tempKey, dataBytes, contentType, params.Metadata); err != nil {
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("atomic store failed (temp write): %w", err)
		}

		// Copy the temporary object to the final location
		if err := c.copyObject(ctx, tempKey, finalKey, contentType, params.Metadata); err != nil {
			// Attempt cleanup on copy failure
			_ = c.deleteObject(ctx, tempKey) // Best effort delete
			status = StatusError

			c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()

			return fmt.Errorf("atomic store failed (copy): %w", err)
		}

		// Delete the temporary object
		if err := c.deleteObject(ctx, tempKey); err != nil {
			// Log warning, but proceed as the main operation succeeded
			c.log.WithFields(logrus.Fields{"key": tempKey, "error": err}).Warn("Failed to delete temporary object after atomic store")
		}

		return nil // Atomic store successful
	} else {
		// Non-atomic store: write directly to the final key
		err := c.putObject(ctx, finalKey, dataBytes, contentType, params.Metadata)
		if err != nil {
			status = StatusError

			if c.errorsTotal != nil {
				c.errorsTotal.With(prometheus.Labels{"operation": "store"}).Inc()
			}
		}

		return err
	}
}

// Get retrieves data from storage
func (c *client) Get(ctx context.Context, key string) ([]byte, error) {
	start := time.Now()

	var status = "success"

	var data []byte

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "get",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "get",
		}).Observe(time.Since(start).Seconds())

		if data != nil && c.bytesProcessed != nil {
			c.bytesProcessed.With(prometheus.Labels{"operation": "read"}).Add(float64(len(data)))
		}
	}()

	if c.client == nil {
		status = StatusError

		c.errorsTotal.With(prometheus.Labels{"operation": "get"}).Inc()

		return nil, fmt.Errorf("S3 client not initialized, call Start() first")
	}

	getObjectInput := &s3.GetObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	}

	result, err := c.client.GetObject(ctx, getObjectInput)
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) {
			if apiErr.ErrorCode() == S3ErrorNoSuchKey || apiErr.ErrorCode() == SmithyAPI404 {
				status = StatusNotFound

				return nil, ErrNotFound
			}
		}

		status = StatusError

		if c.errorsTotal != nil {
			c.errorsTotal.With(prometheus.Labels{"operation": "get"}).Inc()
		}

		return nil, fmt.Errorf("failed to get object: %w", err)
	}
	defer result.Body.Close()

	data, err = io.ReadAll(result.Body)
	if err != nil {
		status = StatusError

		c.errorsTotal.With(prometheus.Labels{"operation": "get"}).Inc()

		return nil, fmt.Errorf("failed to read object body: %w", err)
	}

	// Check for Content-Encoding header to handle compression
	contentEncoding := ""
	// Check for content-encoding with case-insensitivity
	for k, v := range result.Metadata {
		if strings.EqualFold(k, "content-encoding") && v != "" {
			contentEncoding = v

			break
		}
	}

	if contentEncoding != "" {
		// Try to decompress
		algo, err := GetCompressionAlgorithmFromContentEncoding(contentEncoding)
		if err == nil && algo != None {
			decompressed, err := c.compressor.DecompressWithAlgorithm(data, algo)
			if err != nil {
				status = StatusError

				if c.errorsTotal != nil {
					c.errorsTotal.With(prometheus.Labels{"operation": "get"}).Inc()
				}

				return nil, fmt.Errorf("failed to decompress data: %w", err)
			}

			data = decompressed
		}
	}

	return data, nil
}

// Delete removes data from storage
func (c *client) Delete(ctx context.Context, key string) error {
	start := time.Now()

	var status = "success"

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "delete",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "delete",
		}).Observe(time.Since(start).Seconds())
	}()

	err := c.deleteObject(ctx, key)
	if err != nil {
		status = StatusError

		if c.errorsTotal != nil {
			c.errorsTotal.With(prometheus.Labels{"operation": "delete"}).Inc()
		}
	}

	return err
}

// List lists objects with the given prefix
func (c *client) List(ctx context.Context, prefix string) ([]string, error) {
	start := time.Now()

	var status = "success"

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "list",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "list",
		}).Observe(time.Since(start).Seconds())
	}()

	if c.client == nil {
		c.log.Error("List failed: S3 client not initialized")

		c.errorsTotal.With(prometheus.Labels{"operation": "list"}).Inc()

		return nil, fmt.Errorf("S3 client not initialized, call Start() first")
	}

	listObjectsInput := &s3.ListObjectsV2Input{
		Bucket: aws.String(c.config.Bucket),
		Prefix: aws.String(prefix),
	}

	result, err := c.client.ListObjectsV2(ctx, listObjectsInput)
	if err != nil {
		status = StatusError

		c.log.WithError(err).Error("List failed: failed to list objects")

		c.errorsTotal.With(prometheus.Labels{"operation": "list"}).Inc()

		return nil, fmt.Errorf("failed to list objects: %w", err)
	}

	keys := make([]string, 0, len(result.Contents))
	for _, object := range result.Contents {
		keys = append(keys, *object.Key)
	}

	return keys, nil
}

// GetEncoded retrieves data from storage and decodes it into a struct
func (c *client) GetEncoded(ctx context.Context, key string, v any, format CodecName) error {
	start := time.Now()

	var status = StatusSuccess

	defer func() {
		c.operationsTotal.With(prometheus.Labels{
			"operation": "get_encoded",
			"status":    status,
		}).Inc()

		c.operationDuration.With(prometheus.Labels{
			"operation": "get_encoded",
		}).Observe(time.Since(start).Seconds())
	}()

	if format == "" {
		return fmt.Errorf("format is required")
	}

	codec, err := c.encoders.Get(format)
	if err != nil {
		status = StatusError

		c.log.WithError(err).Error("GetEncoded failed: failed to get codec")

		c.errorsTotal.With(prometheus.Labels{"operation": "get_encoded"}).Inc()

		return fmt.Errorf("failed to get codec: %w", err)
	}

	// Add the codec extension to the key if it doesn't already have it
	if !strings.HasSuffix(key, "."+codec.FileExtension()) {
		key = key + "." + codec.FileExtension()
	}

	data, err := c.Get(ctx, key)
	if err != nil {
		status = StatusError

		c.log.WithError(err).Error("GetEncoded failed: failed to get data")

		c.errorsTotal.With(prometheus.Labels{"operation": "get_encoded"}).Inc()

		return fmt.Errorf("GetEncoded failed: %w", err)
	}

	if err := codec.Decode(data, v); err != nil {
		status = StatusError

		c.log.WithError(err).Error("GetEncoded failed: failed to decode data")

		c.errorsTotal.With(prometheus.Labels{"operation": "get_encoded"}).Inc()

		return fmt.Errorf("GetEncoded failed: %w", err)
	}

	return nil
}

// --- Internal Helper Functions ---

// putObject uploads data to S3 with specified content type and metadata
func (c *client) putObject(ctx context.Context, key string, data []byte, contentType string, metadata map[string]string) error {
	if c.client == nil {
		return fmt.Errorf("S3 client not initialized, call Start() first")
	}

	putObjectInput := &s3.PutObjectInput{
		Bucket:      aws.String(c.config.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
		Metadata:    metadata,
	}

	_, err := c.client.PutObject(ctx, putObjectInput)
	if err != nil {
		return fmt.Errorf("failed to put object '%s': %w", key, err)
	}

	return nil
}

// copyObject copies an S3 object, setting content type and metadata
func (c *client) copyObject(ctx context.Context, sourceKey, destinationKey, contentType string, metadata map[string]string) error {
	if c.client == nil {
		return fmt.Errorf("S3 client not initialized, call Start() first")
	}

	copySource := fmt.Sprintf("%s/%s", c.config.Bucket, sourceKey)

	copyObjectInput := &s3.CopyObjectInput{
		Bucket:            aws.String(c.config.Bucket),
		CopySource:        aws.String(copySource),
		Key:               aws.String(destinationKey),
		ContentType:       aws.String(contentType),
		Metadata:          metadata,
		MetadataDirective: types.MetadataDirectiveReplace, // Ensure new metadata is applied
	}

	_, err := c.client.CopyObject(ctx, copyObjectInput)
	if err != nil {
		return fmt.Errorf("failed to copy object from '%s' to '%s': %w", sourceKey, destinationKey, err)
	}

	return nil
}

// deleteObject deletes an object from S3
func (c *client) deleteObject(ctx context.Context, key string) error {
	if c.client == nil {
		return fmt.Errorf("S3 client not initialized, call Start() first")
	}

	deleteObjectInput := &s3.DeleteObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	}

	_, err := c.client.DeleteObject(ctx, deleteObjectInput)
	if err != nil {
		// Don't wrap not found errors for deletes, often expected
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && (apiErr.ErrorCode() == S3ErrorNoSuchKey || apiErr.ErrorCode() == SmithyAPI404) {
			return nil
		}

		return fmt.Errorf("failed to delete object '%s': %w", key, err)
	}

	return nil
}

// Stop gracefully stops the S3 storage client
func (c *client) Stop() error {
	// No graceful shutdown required: all uploads are synchronous and complete before return
	return nil
}

// bucketExists checks if a bucket exists
func (c *client) bucketExists(ctx context.Context, bucketName string) (bool, error) {
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(bucketName),
	})
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) {
			if apiErr.ErrorCode() == SmithyAPI404 {
				return false, nil
			}
		}

		return false, fmt.Errorf("failed to check if bucket exists: %w", err)
	}

	return true, nil
}
