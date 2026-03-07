package db

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/models"
)

// UpsertLocationShare saves (or replaces) a user's live location.
func UpsertLocationShare(ctx context.Context, pool *pgxpool.Pool, s *models.LocationShare) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO location_shares (user_id, lat, lng, accuracy_m, mode, updated_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			lat        = EXCLUDED.lat,
			lng        = EXCLUDED.lng,
			accuracy_m = EXCLUDED.accuracy_m,
			mode       = EXCLUDED.mode,
			updated_at = EXCLUDED.updated_at,
			expires_at = EXCLUDED.expires_at
	`, s.UserID, s.Lat, s.Lng, s.Accuracy, s.Mode, s.UpdatedAt, s.ExpiresAt)
	return err
}

// GetLocationShare returns the current location for a user, or nil if not sharing
// or if the share has expired.
func GetLocationShare(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (*models.LocationShare, error) {
	s := &models.LocationShare{}
	var updatedAt, expiresAt time.Time

	err := pool.QueryRow(ctx, `
		SELECT user_id, lat, lng, accuracy_m, mode, updated_at, expires_at
		FROM location_shares
		WHERE user_id = $1 AND expires_at > NOW()
	`, userID).Scan(
		&s.UserID, &s.Lat, &s.Lng, &s.Accuracy, &s.Mode, &updatedAt, &expiresAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt
	s.ExpiresAt = expiresAt
	return s, nil
}

// GetPartnerLocationShare returns the PARTNER's live location for a given user.
// Used in the frame poll: the frame owner sees where their partner is.
func GetPartnerLocationShare(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.FrameLocation, error) {
	// Resolve partner ID from the couple
	var partnerID uuid.UUID
	err := pool.QueryRow(ctx, `
		SELECT CASE
			WHEN user_a_id = $1 THEN user_b_id
			ELSE user_a_id
		END
		FROM couples
		WHERE (user_a_id = $1 OR user_b_id = $1)
		  AND status = 'active'
	`, ownerID).Scan(&partnerID)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	share, err := GetLocationShare(ctx, pool, partnerID)
	if err != nil || share == nil {
		return nil, err
	}

	return &models.FrameLocation{
		Lat:       share.Lat,
		Lng:       share.Lng,
		Accuracy:  share.Accuracy,
		Mode:      share.Mode,
		UpdatedAt: share.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}, nil
}