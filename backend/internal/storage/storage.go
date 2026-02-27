package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/google/uuid"
)

// ─── Interface ────────────────────────────────────────────────────────────────

// Store is the interface all handlers depend on.
type Store interface {
	// Upload stores a file and returns (deliveryURL, storageKey, error).
	// - url: full HTTPS delivery URL (use this in the DB / send to the frame)
	// - key: Cloudinary public_id (stable reference, use this for Delete/PublicURL)
	// - prefix: used to group files, typically the couple UUID
	Upload(ctx context.Context, r io.Reader, filename, mimeType, prefix string) (url, key string, err error)

	// PublicURL reconstructs the delivery URL from a stored key (public_id).
	PublicURL(key string) string

	// Delete removes an asset by key.
	// resourceType must match what was used on upload: "image" or "raw".
	Delete(ctx context.Context, key, resourceType string) error
}

// ─── CloudinaryStore ──────────────────────────────────────────────────────────
//
// Configure with ONE of:
//
//   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name   ← easiest
//
//   CLOUDINARY_CLOUD_NAME=...
//   CLOUDINARY_API_KEY=...
//   CLOUDINARY_API_SECRET=...
//
// Optional:
//   CLOUDINARY_FOLDER=p-ink   (default: "p-ink")

type CloudinaryStore struct {
	cld       *cloudinary.Cloudinary
	cloudName string
	folder    string
}

func NewCloudinaryStore() (*CloudinaryStore, error) {
	var (
		cld *cloudinary.Cloudinary
		err error
	)

	if cldURL := os.Getenv("CLOUDINARY_URL"); cldURL != "" {
		// Style A: single URL  cloudinary://key:secret@cloud
		cld, err = cloudinary.NewFromURL(cldURL)
	} else {
		// Style B: three separate env vars
		cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
		apiKey    := os.Getenv("CLOUDINARY_API_KEY")
		apiSecret := os.Getenv("CLOUDINARY_API_SECRET")
		if cloudName == "" || apiKey == "" || apiSecret == "" {
			return nil, fmt.Errorf(
				"set CLOUDINARY_URL or all of CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET",
			)
		}
		cld, err = cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	}
	if err != nil {
		return nil, fmt.Errorf("cloudinary init: %w", err)
	}

	folder := os.Getenv("CLOUDINARY_FOLDER")
	if folder == "" {
		folder = "p-ink"
	}

	// Read the cloud name back out so PublicURL can build URLs without an SDK call
	cloudName := cld.Config.Cloud.CloudName

	return &CloudinaryStore{
		cld:       cld,
		cloudName: cloudName,
		folder:    folder,
	}, nil
}

// Upload streams r to Cloudinary.
//
// Resource type:
//   image/*  → "image"  Cloudinary optimises and CDN-serves it
//   other    → "raw"    stored verbatim (use this for generated BMP frames)
//
// public_id format:  <folder>/content/<prefix>/<uuid>
// e.g.               p-ink/content/couple-uuid/f47ac10b-58cc-...
func (s *CloudinaryStore) Upload(
	ctx context.Context,
	r io.Reader,
	filename, mimeType, prefix string,
) (string, string, error) {

	// Determine file extension
	ext := strings.TrimPrefix(filepath.Ext(filename), ".")
	if ext == "" {
		if exts, _ := mime.ExtensionsByType(mimeType); len(exts) > 0 {
			ext = strings.TrimPrefix(exts[0], ".")
		}
	}

	publicID := fmt.Sprintf("%s/content/%s/%s", s.folder, prefix, uuid.New().String())

	// Cloudinary resource types: "image", "video", "raw", "auto"
	resourceType := "image"
	if !strings.HasPrefix(mimeType, "image/") {
		resourceType = "raw"
	}

	resp, err := s.cld.Upload.Upload(ctx, r, uploader.UploadParams{
		PublicID:       publicID,
		ResourceType:   resourceType,
		Format:         ext,
		UniqueFilename: api.Bool(false), // we already use a UUID
		Overwrite:      api.Bool(true),
	})
	if err != nil {
		return "", "", fmt.Errorf("cloudinary upload: %w", err)
	}
	if resp.Error.Message != "" {
		return "", "", fmt.Errorf("cloudinary: %s", resp.Error.Message)
	}

	return resp.SecureURL, resp.PublicID, nil
}

// PublicURL builds a Cloudinary HTTPS delivery URL from a public_id.
//
// URL structure:
//   image → https://res.cloudinary.com/<cloud>/image/upload/<public_id>
//   raw   → https://res.cloudinary.com/<cloud>/raw/upload/<public_id>
//
// We infer resource type from the ".bmp" suffix because BMP frames are
// the only "raw" assets we store. Adjust if you add other raw types.
func (s *CloudinaryStore) PublicURL(key string) string {
	resourceType := "image"
	if strings.HasSuffix(strings.ToLower(key), ".bmp") {
		resourceType = "raw"
	}
	return fmt.Sprintf("https://res.cloudinary.com/%s/%s/upload/%s",
		s.cloudName, resourceType, key)
}

// Delete removes a Cloudinary asset.
// Pass the same resourceType that was used during Upload ("image" or "raw").
func (s *CloudinaryStore) Delete(ctx context.Context, key, resourceType string) error {
	if resourceType == "" {
		resourceType = "image"
	}
	resp, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     key,
		ResourceType: resourceType,
	})
	if err != nil {
		return fmt.Errorf("cloudinary delete: %w", err)
	}
	if resp.Result != "ok" {
		return fmt.Errorf("cloudinary delete result: %s", resp.Result)
	}
	return nil
}

// ─── NoopStore ────────────────────────────────────────────────────────────────
// Used locally when Cloudinary is not configured.
// Accepts uploads, drains the reader, returns placeholder URLs.

type NoopStore struct{}

func (n *NoopStore) Upload(_ context.Context, r io.Reader, filename, _, prefix string) (string, string, error) {
	_, _ = io.Copy(io.Discard, r) // drain so multipart parsing doesn't stall
	key := fmt.Sprintf("p-ink/content/%s/noop-%s", prefix, filename)
	url := "http://localhost:8080/noop/" + key
	fmt.Printf("[storage:noop] upload  key=%s\n", key)
	return url, key, nil
}

func (n *NoopStore) PublicURL(key string) string {
	return "http://localhost:8080/noop/" + key
}

func (n *NoopStore) Delete(_ context.Context, key, _ string) error {
	fmt.Printf("[storage:noop] delete  key=%s\n", key)
	return nil
}