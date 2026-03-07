package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/models"
)

// UpsertPixelAvatar saves (or replaces) the user's pixel avatar.
func UpsertPixelAvatar(ctx context.Context, pool *pgxpool.Pool, avatar *models.PixelAvatar) error {
	pixelsJSON, err := json.Marshal(avatar.Pixels)
	if err != nil {
		return err
	}
	paletteJSON, err := json.Marshal(avatar.Palette)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO pixel_avatars (user_id, name, pixels, palette, width, height, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			name       = EXCLUDED.name,
			pixels     = EXCLUDED.pixels,
			palette    = EXCLUDED.palette,
			width      = EXCLUDED.width,
			height     = EXCLUDED.height,
			updated_at = NOW()
	`, avatar.UserID, avatar.Name, pixelsJSON, paletteJSON, avatar.Width, avatar.Height)
	return err
}

// GetPixelAvatarByUser returns the avatar for a given user, or nil if none.
func GetPixelAvatarByUser(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (*models.PixelAvatar, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, name, pixels, palette, width, height, created_at, updated_at
		FROM pixel_avatars WHERE user_id = $1
	`, userID)
	return scanPixelAvatar(row)
}

// GetPartnerPixelAvatar returns the partner's avatar given a couple ID and the requesting user's ID.
// It finds the other user in the couple and returns their avatar.
func GetPartnerPixelAvatar(ctx context.Context, pool *pgxpool.Pool, coupleID, userID uuid.UUID) (*models.PixelAvatar, error) {
	// Find partner user ID
	var partnerID uuid.UUID
	err := pool.QueryRow(ctx, `
		SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END
		FROM couples WHERE id = $2
	`, userID, coupleID).Scan(&partnerID)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return GetPixelAvatarByUser(ctx, pool, partnerID)
}

// GetPartnerPixelAvatarByOwner returns the partner's avatar for a frame owner.
// Used in frame poll — looks up the owner's couple, finds partner, returns their avatar.
func GetPartnerPixelAvatarByOwner(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.PixelAvatar, error) {
	// Get couple ID from tamagotchi ownership
	var coupleID uuid.UUID
	err := pool.QueryRow(ctx, `
		SELECT couple_id FROM tamagotchis WHERE owner_id = $1
	`, ownerID).Scan(&coupleID)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return GetPartnerPixelAvatar(ctx, pool, coupleID, ownerID)
}

func scanPixelAvatar(row pgx.Row) (*models.PixelAvatar, error) {
	var a models.PixelAvatar
	var pixelsRaw, paletteRaw []byte
	var createdAt, updatedAt time.Time

	err := row.Scan(
		&a.ID, &a.UserID, &a.Name,
		&pixelsRaw, &paletteRaw,
		&a.Width, &a.Height,
		&createdAt, &updatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(pixelsRaw, &a.Pixels); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(paletteRaw, &a.Palette); err != nil {
		return nil, err
	}

	a.CreatedAt = createdAt
	a.UpdatedAt = updatedAt
	return &a, nil
}