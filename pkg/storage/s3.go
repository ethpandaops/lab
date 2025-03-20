package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethpandaops/lab/pkg/logger"
)

// S3Storage is an S3 implementation of the Storage interface
type S3Storage struct {
	client *s3.Client
	bucket string
	log    *logger.Logger
}

// NewS3Storage creates a new S3Storage
func NewS3Storage(
	endpoint string,
	region string,
	bucket string,
	accessKeyID string,
	secretAccessKey string,
	useSSL bool,
	usePathStyle bool,
	log *logger.Logger,
) (*S3Storage, error) {
	// Create custom resolver for S3 compatible storage
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: endpoint,
			// UsePathStyle converts URLs from virtual-host style to path style,
			// e.g. https://bucket.minio.localhost/ to https://minio.localhost/bucket
			SigningRegion:     region,
			HostnameImmutable: true,
			PartitionID:       "aws",
			SigningName:       "s3",
			SigningMethod:     "s3v4",
		}, nil
	})

	// Create S3 configuration
	cfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(region),
		config.WithEndpointResolverWithOptions(customResolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client
	client := s3.NewFromConfig(cfg)

	return &S3Storage{
		client: client,
		bucket: bucket,
		log:    log,
	}, nil
}

// StoreAtomic stores data atomically using a temporary file pattern
func (s *S3Storage) StoreAtomic(ctx context.Context, key string, data []byte) error {
	tempKey := fmt.Sprintf("%s.tmp", key)

	// Store the data in a temporary location
	if err := s.store(ctx, tempKey, data); err != nil {
		return fmt.Errorf("failed to store temporary object: %w", err)
	}

	// Copy the temporary object to the final location
	if err := s.copy(ctx, tempKey, key); err != nil {
		return fmt.Errorf("failed to copy temporary object: %w", err)
	}

	// Delete the temporary object
	if err := s.delete(ctx, tempKey); err != nil {
		s.log.WithField("key", tempKey).Warn("Failed to delete temporary object")
	}

	return nil
}

// Store stores data directly (non-atomic)
func (s *S3Storage) Store(ctx context.Context, key string, data []byte) error {
	return s.store(ctx, key, data)
}

// Get retrieves data from storage
func (s *S3Storage) Get(ctx context.Context, key string) ([]byte, error) {
	getObjectInput := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	result, err := s.client.GetObject(ctx, getObjectInput)
	if err != nil {
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
func (s *S3Storage) Delete(ctx context.Context, key string) error {
	return s.delete(ctx, key)
}

// List lists objects with the given prefix
func (s *S3Storage) List(ctx context.Context, prefix string) ([]string, error) {
	listObjectsInput := &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
		Prefix: aws.String(prefix),
	}

	result, err := s.client.ListObjectsV2(ctx, listObjectsInput)
	if err != nil {
		return nil, fmt.Errorf("failed to list objects: %w", err)
	}

	keys := make([]string, 0, len(result.Contents))
	for _, object := range result.Contents {
		keys = append(keys, *object.Key)
	}

	return keys, nil
}

// store is a helper function for storing data
func (s *S3Storage) store(ctx context.Context, key string, data []byte) error {
	putObjectInput := &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(data),
	}

	_, err := s.client.PutObject(ctx, putObjectInput)
	if err != nil {
		return fmt.Errorf("failed to put object: %w", err)
	}

	return nil
}

// copy is a helper function for copying data
func (s *S3Storage) copy(ctx context.Context, sourceKey, destinationKey string) error {
	// Build the copy source
	copySource := fmt.Sprintf("%s/%s", s.bucket, sourceKey)

	copyObjectInput := &s3.CopyObjectInput{
		Bucket:     aws.String(s.bucket),
		CopySource: aws.String(copySource),
		Key:        aws.String(destinationKey),
	}

	_, err := s.client.CopyObject(ctx, copyObjectInput)
	if err != nil {
		return fmt.Errorf("failed to copy object: %w", err)
	}

	return nil
}

// delete is a helper function for deleting data
func (s *S3Storage) delete(ctx context.Context, key string) error {
	deleteObjectInput := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	_, err := s.client.DeleteObject(ctx, deleteObjectInput)
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}
