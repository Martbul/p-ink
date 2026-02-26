package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
)

// Store is the interface your handlers depend on.
type Store interface {
	Upload(ctx context.Context, r io.Reader, filename, mimeType, prefix string) (key string, err error)
	PublicURL(key string) string
}

// ─── GoogleCloudStore ────────────────────────────────────────────────────────

type GoogleCloudStore struct {
	client     *storage.Client
	bucketName string
	publicBase string
}

// NewGoogleCloudStore creates a store using Google Cloud Storage (GCS).
// GCS offers an "Always Free" tier (5GB Storage in us-west1, us-central1, or us-east1).
func NewGoogleCloudStore(ctx context.Context) (*GoogleCloudStore, error) {
	bucketName := os.Getenv("GCS_BUCKET")
	if bucketName == "" {
		return nil, fmt.Errorf("GCS_BUCKET environment variable must be set")
	}

	// The client automatically authenticates using the service account JSON file
	// path defined in the GOOGLE_APPLICATION_CREDENTIALS environment variable.
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcs client: %w", err)
	}

	publicBase := os.Getenv("GCS_PUBLIC_BASE")
	if publicBase == "" {
		// Default public URL format for GCS
		publicBase = fmt.Sprintf("https://storage.googleapis.com/%s", bucketName)
	}

	return &GoogleCloudStore{
		client:     client,
		bucketName: bucketName,
		publicBase: strings.TrimRight(publicBase, "/"),
	}, nil
}

func (s *GoogleCloudStore) Upload(ctx context.Context, r io.Reader, filename, mimeType, prefix string) (string, error) {
	// Determine extension
	ext := filepath.Ext(filename)
	if ext == "" {
		exts, _ := mime.ExtensionsByType(mimeType)
		if len(exts) > 0 {
			ext = exts[0]
		}
	}

	key := fmt.Sprintf("content/%s/%s%s", prefix, uuid.New().String(), ext)

	// Create a writer attached to the GCS Object
	obj := s.client.Bucket(s.bucketName).Object(key)
	writer := obj.NewWriter(ctx)
	writer.ContentType = mimeType

	// Stream the file upload directly to Google Cloud
	if _, err := io.Copy(writer, r); err != nil {
		_ = writer.Close() // prevent memory leak on error
		return "", fmt.Errorf("failed to write to gcs: %w", err)
	}

	// The upload is completed only when the writer is closed
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close gcs writer: %w", err)
	}

	return key, nil
}

func (s *GoogleCloudStore) PublicURL(key string) string {
	return s.publicBase + "/" + key
}

// ─── NoopStore (development / testing) ───────────────────────────────────────

type NoopStore struct{}

func (n *NoopStore) Upload(_ context.Context, _ io.Reader, filename, _, prefix string) (string, error) {
	key := fmt.Sprintf("content/%s/noop-%s", prefix, filename)
	fmt.Println("[storage] noop upload:", key)
	return key, nil
}

func (n *NoopStore) PublicURL(key string) string {
	return "http://localhost:8080/static/" + key
}