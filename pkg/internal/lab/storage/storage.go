package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/sirupsen/logrus"
)

type Client interface {
	Start(ctx context.Context) error
	GetClient() *s3.Client
	GetBucket() string
	Store(key string, data []byte) error
	StoreAtomic(key string, data []byte) error
	Get(key string) ([]byte, error)
	GetEncoded(key string, v any, format CodecName) error
	StoreEncoded(key string, v any, format CodecName) (string, error)
	Delete(key string) error
	List(prefix string) ([]string, error)
	Stop() error
}

var (
	ErrNotFound = errors.New("not found")
)

// Client represents an S3 storage client
type client struct {
	client   *s3.Client
	config   *Config
	log      logrus.FieldLogger
	ctx      context.Context
	encoders *Registry
}

// New creates a new S3 storage client
func New(
	config *Config,
	log logrus.FieldLogger,
) (Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	return &client{
		log:      log.WithField("module", "storage"),
		config:   config,
		encoders: NewRegistry(),
	}, nil
}

func (c *client) Start(ctx context.Context) error {
	c.log.Info("Starting S3 storage client")

	// Create custom resolver for S3 compatible storage
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: c.config.Endpoint,
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

// Store stores data directly (non-atomic)
func (c *client) Store(key string, data []byte) error {
	return c.store(key, data)
}

// StoreAtomic stores data atomically using a temporary file pattern
func (c *client) StoreAtomic(key string, data []byte) error {
	tempKey := fmt.Sprintf("%s.tmp", key)

	// Store the data in a temporary location
	if err := c.store(tempKey, data); err != nil {
		return fmt.Errorf("failed to store temporary object: %w", err)
	}

	// Copy the temporary object to the final location
	if err := c.copy(tempKey, key); err != nil {
		return fmt.Errorf("failed to copy temporary object: %w", err)
	}

	// Delete the temporary object
	if err := c.delete(tempKey); err != nil {
		c.log.WithField("key", tempKey).Warn("Failed to delete temporary object")
	}

	return nil
}

// Get retrieves data from storage
func (c *client) Get(key string) ([]byte, error) {
	getObjectInput := &s3.GetObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	}

	result, err := c.client.GetObject(c.ctx, getObjectInput)
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

	return data, nil
}

// Delete removes data from storage
func (c *client) Delete(key string) error {
	return c.delete(key)
}

// List lists objects with the given prefix
func (c *client) List(prefix string) ([]string, error) {
	listObjectsInput := &s3.ListObjectsV2Input{
		Bucket: aws.String(c.config.Bucket),
		Prefix: aws.String(prefix),
	}

	result, err := c.client.ListObjectsV2(c.ctx, listObjectsInput)
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
func (c *client) GetEncoded(key string, v any, format CodecName) error {
	data, err := c.Get(key)
	if err != nil {
		return fmt.Errorf("failed to get object: %w", err)
	}

	codec, err := c.encoders.Get(format)
	if err != nil {
		return err
	}

	return codec.Decode(data, v)
}

// StoreEncoded stores data in storage after encoding it
func (c *client) StoreEncoded(key string, v any, format CodecName) (string, error) {
	codec, err := c.encoders.Get(format)
	if err != nil {
		return "", err
	}

	data, err := codec.Encode(v)
	if err != nil {
		return "", fmt.Errorf("failed to encode object: %w", err)
	}

	// Add the appropriate file extension
	key = key + "." + codec.FileExtension()

	err = c.Store(key, data)
	if err != nil {
		return "", fmt.Errorf("failed to store object: %w", err)
	}

	return key, nil
}

// store is a helper function for storing data
func (c *client) store(key string, data []byte) error {
	putObjectInput := &s3.PutObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(data),
	}

	_, err := c.client.PutObject(c.ctx, putObjectInput)
	if err != nil {
		return fmt.Errorf("failed to put object: %w", err)
	}

	return nil
}

// copy is a helper function for copying data
func (c *client) copy(sourceKey, destinationKey string) error {
	// Build the copy source
	copySource := fmt.Sprintf("%s/%s", c.config.Bucket, sourceKey)

	copyObjectInput := &s3.CopyObjectInput{
		Bucket:     aws.String(c.config.Bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(destinationKey),
	}

	_, err := c.client.CopyObject(c.ctx, copyObjectInput)
	if err != nil {
		return fmt.Errorf("failed to copy object: %w", err)
	}

	return nil
}

// delete is a helper function for deleting data
func (c *client) delete(key string) error {
	deleteObjectInput := &s3.DeleteObjectInput{
		Bucket: aws.String(c.config.Bucket),
		Key:    aws.String(key),
	}

	_, err := c.client.DeleteObject(c.ctx, deleteObjectInput)
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}

// Stop gracefully stops the S3 storage client
func (c *client) Stop() error {
	// Nothing to clean up for S3 client
	// Todo: Check if there is a way to wait for all the objects to be uploaded
	return nil
}
