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
	"github.com/sirupsen/logrus"
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
			return fmt.Errorf("data must be []byte when no format is specified, got %T", p.Data)
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
	client     *s3.Client
	config     *Config
	log        logrus.FieldLogger
	ctx        context.Context
	encoders   *Registry
	compressor *Compressor
}

// New creates a new S3 storage client
func New(
	config *Config,
	log logrus.FieldLogger,
) (Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger is required")
	}

	return &client{
		log:        log.WithField("module", "storage"),
		config:     config,
		encoders:   NewRegistry(),
		compressor: NewCompressor(),
	}, nil
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

	// Create custom resolver for S3 compatible storage
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: endpoint,
			// UsePathStyle converts URLs from virtual-host style to path style,
			// e.g. https://bucket.minio.localhost/ to https://minio.localhost/bucket
			SigningRegion:     c.config.Region,
			HostnameImmutable: true,
			PartitionID:       "aws",
			SigningName:       "s3",
			SigningMethod:     "s3v4",
		}, nil
	})

	// Create S3 configuration
	cfg, err := config.LoadDefaultConfig(
		ctx,
		config.WithRegion(c.config.Region),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(c.config.AccessKey, c.config.SecretKey, "")),
	)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client
	c.client = s3.NewFromConfig(cfg)
	c.ctx = ctx // Save the context for later use in S3 operations

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
	rsp, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check for NoSuchKey error using APIError type
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NoSuchKey" || apiErr.ErrorCode() == "NotFound") {
			return false, nil
		}

		return false, fmt.Errorf("failed to check if object exists: %w", err)
	}

	if rsp == nil {
		return false, nil
	}

	return true, nil
}

// Store stores data based on the provided parameters.
// It handles encoding, compression, atomicity, content type, and metadata.
func (c *client) Store(ctx context.Context, params StoreParams) error {
	// Validate params before proceeding
	if err := params.Validate(); err != nil {
		return fmt.Errorf("invalid store parameters: %w", err)
	}

	var dataBytes []byte
	finalKey := params.Key

	// 1. Handle Encoding if Format is specified
	if params.Format != "" {
		codec, err := c.encoders.Get(params.Format)
		if err != nil {
			return fmt.Errorf("failed to get codec '%s': %w", params.Format, err)
		}

		dataBytes, err = codec.Encode(params.Data)
		if err != nil {
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
			return fmt.Errorf("invalid data type: expected []byte when Format is not specified, got %T", params.Data)
		}
	}

	// 2. Handle Compression if specified
	if params.Compression != nil && params.Compression != None {
		compressed, err := c.compressor.Compress(dataBytes, params.Compression)
		if err != nil {
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
	codec, err := c.encoders.Get(params.Format)
	if err != nil {
		return fmt.Errorf("failed to get codec '%s': %w", params.Format, err)
	}

	contentType := codec.GetContentType()

	// 4. Handle Atomicity
	if params.Atomic {
		tempKey := fmt.Sprintf("%s.%d.tmp", finalKey, time.Now().UnixNano())

		// Store the data in a temporary location
		if err := c.putObject(ctx, tempKey, dataBytes, contentType, params.Metadata); err != nil {
			return fmt.Errorf("atomic store failed (temp write): %w", err)
		}

		// Copy the temporary object to the final location
		if err := c.copyObject(ctx, tempKey, finalKey, contentType, params.Metadata); err != nil {
			// Attempt cleanup on copy failure
			_ = c.deleteObject(ctx, tempKey) // Best effort delete
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
		return c.putObject(ctx, finalKey, dataBytes, contentType, params.Metadata)
	}
}

// Get retrieves data from storage
func (c *client) Get(ctx context.Context, key string) ([]byte, error) {
	if c.client == nil {
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
			if apiErr.ErrorCode() == "NoSuchKey" || apiErr.ErrorCode() == "NotFound" {
				return nil, ErrNotFound
			}
		}
		return nil, fmt.Errorf("failed to get object: %w", err)
	}
	defer result.Body.Close()

	data, err := io.ReadAll(result.Body)
	if err != nil {
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
				return nil, fmt.Errorf("failed to decompress data: %w", err)
			}
			return decompressed, nil
		}
	}

	return data, nil
}

// Delete removes data from storage
func (c *client) Delete(ctx context.Context, key string) error {
	return c.deleteObject(ctx, key)
}

// List lists objects with the given prefix
func (c *client) List(ctx context.Context, prefix string) ([]string, error) {
	if c.client == nil {
		return nil, fmt.Errorf("S3 client not initialized, call Start() first")
	}

	listObjectsInput := &s3.ListObjectsV2Input{
		Bucket: aws.String(c.config.Bucket),
		Prefix: aws.String(prefix),
	}

	result, err := c.client.ListObjectsV2(ctx, listObjectsInput)
	if err != nil {
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
	data, err := c.Get(ctx, key)
	if err != nil {
		return fmt.Errorf("GetEncoded failed: %w", err)
	}

	codec, err := c.encoders.Get(format)
	if err != nil {
		return fmt.Errorf("GetEncoded failed: %w", err)
	}

	if err := codec.Decode(data, v); err != nil {
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
		if errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NoSuchKey" || apiErr.ErrorCode() == "NotFound") {
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
			if apiErr.ErrorCode() == "NotFound" {
				return false, nil
			}
		}
		return false, fmt.Errorf("failed to check if bucket exists: %w", err)
	}
	return true, nil
}
