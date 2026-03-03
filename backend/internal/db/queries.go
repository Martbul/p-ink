package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/models"
)

// ─── Users ────────────────────────────────────────────────────────────────────

func GetUserByClerkID(ctx context.Context, pool *pgxpool.Pool, clerkID string) (*models.User, error) {
	u := &models.User{}
	err := pool.QueryRow(ctx,
		`SELECT id, clerk_id, email, name, created_at
		 FROM users WHERE clerk_id = $1`, clerkID,
	).Scan(&u.ID, &u.ClerkID, &u.Email, &u.Name, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return u, err
}

func GetUserByID(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (*models.User, error) {
	u := &models.User{}
	err := pool.QueryRow(ctx,
		`SELECT id, clerk_id, email, name, created_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.ClerkID, &u.Email, &u.Name, &u.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return u, err
}

func UpsertUser(ctx context.Context, pool *pgxpool.Pool, clerkID, email, name string) (*models.User, error) {
	u := &models.User{}
	err := pool.QueryRow(ctx,
		`INSERT INTO users (clerk_id, email, name)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (clerk_id) DO UPDATE
		   SET email = EXCLUDED.email, name = EXCLUDED.name
		 RETURNING id, clerk_id, email, name, created_at`,
		clerkID, email, name,
	).Scan(&u.ID, &u.ClerkID, &u.Email, &u.Name, &u.CreatedAt)
	return u, err
}

// ─── Couples ──────────────────────────────────────────────────────────────────

func GetCoupleByUserID(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (*models.Couple, error) {
	c := &models.Couple{}
	err := pool.QueryRow(ctx,
		`SELECT id, user_a_id, user_b_id, status, timezone, created_at
		 FROM couples
		 WHERE user_a_id = $1 OR user_b_id = $1
		 LIMIT 1`, userID,
	).Scan(&c.ID, &c.UserAID, &c.UserBID, &c.Status, &c.Timezone, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func GetCoupleByID(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (*models.Couple, error) {
	c := &models.Couple{}
	err := pool.QueryRow(ctx,
		`SELECT id, user_a_id, user_b_id, status, timezone, created_at
		 FROM couples WHERE id = $1`, id,
	).Scan(&c.ID, &c.UserAID, &c.UserBID, &c.Status, &c.Timezone, &c.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func CreateCouple(ctx context.Context, pool *pgxpool.Pool, userAID uuid.UUID, timezone string) (*models.Couple, error) {
	c := &models.Couple{}
	err := pool.QueryRow(ctx,
		`INSERT INTO couples (user_a_id, timezone)
		 VALUES ($1, $2)
		 RETURNING id, user_a_id, user_b_id, status, timezone, created_at`,
		userAID, timezone,
	).Scan(&c.ID, &c.UserAID, &c.UserBID, &c.Status, &c.Timezone, &c.CreatedAt)
	return c, err
}

func ActivateCouple(ctx context.Context, pool *pgxpool.Pool, coupleID, userBID uuid.UUID) (*models.Couple, error) {
	c := &models.Couple{}
	err := pool.QueryRow(ctx,
		`UPDATE couples
		 SET user_b_id = $2, status = 'active'
		 WHERE id = $1
		 RETURNING id, user_a_id, user_b_id, status, timezone, created_at`,
		coupleID, userBID,
	).Scan(&c.ID, &c.UserAID, &c.UserBID, &c.Status, &c.Timezone, &c.CreatedAt)
	return c, err
}

func UpdateCoupleTimezone(ctx context.Context, pool *pgxpool.Pool, coupleID uuid.UUID, tz string) error {
	_, err := pool.Exec(ctx,
		`UPDATE couples SET timezone = $2 WHERE id = $1`, coupleID, tz)
	return err
}

// ─── Invite tokens ────────────────────────────────────────────────────────────

func CreateInviteToken(ctx context.Context, pool *pgxpool.Pool, coupleID, createdBy uuid.UUID) (*models.InviteToken, error) {
	t := &models.InviteToken{}
	err := pool.QueryRow(ctx,
		`INSERT INTO invite_tokens (couple_id, created_by)
		 VALUES ($1, $2)
		 RETURNING token, couple_id, created_by, expires_at, used_at, used_by`,
		coupleID, createdBy,
	).Scan(&t.Token, &t.CoupleID, &t.CreatedBy, &t.ExpiresAt, &t.UsedAt, &t.UsedBy)
	return t, err
}

func GetInviteToken(ctx context.Context, pool *pgxpool.Pool, token string) (*models.InviteToken, error) {
	t := &models.InviteToken{}
	err := pool.QueryRow(ctx,
		`SELECT token, couple_id, created_by, expires_at, used_at, used_by
		 FROM invite_tokens WHERE token = $1`, token,
	).Scan(&t.Token, &t.CoupleID, &t.CreatedBy, &t.ExpiresAt, &t.UsedAt, &t.UsedBy)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func UseInviteToken(ctx context.Context, pool *pgxpool.Pool, token string, usedBy uuid.UUID) error {
	_, err := pool.Exec(ctx,
		`UPDATE invite_tokens
		 SET used_at = now(), used_by = $2
		 WHERE token = $1`, token, usedBy)
	return err
}

// ─── Devices ──────────────────────────────────────────────────────────────────
//
// Model: one device per user (enforced by unique index on owner_id).
// A couple therefore has up to two devices — one per partner.
// Both carry couple_id once the couple is active.

// GetDeviceByMAC looks up a device by its MAC address.
func GetDeviceByMAC(ctx context.Context, pool *pgxpool.Pool, mac string) (*models.Device, error) {
	d := &models.Device{}
	err := pool.QueryRow(ctx,
		`SELECT id, owner_id, couple_id, mac_address, label, last_seen, firmware, created_at
		 FROM devices WHERE mac_address = $1`, mac,
	).Scan(&d.ID, &d.OwnerID, &d.CoupleID, &d.MacAddress, &d.Label, &d.LastSeen, &d.Firmware, &d.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return d, err
}

// GetDeviceByOwner returns the device owned by ownerID, or nil if unpaired.
func GetDeviceByOwner(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.Device, error) {
	d := &models.Device{}
	err := pool.QueryRow(ctx,
		`SELECT id, owner_id, couple_id, mac_address, label, last_seen, firmware, created_at
		 FROM devices WHERE owner_id = $1`, ownerID,
	).Scan(&d.ID, &d.OwnerID, &d.CoupleID, &d.MacAddress, &d.Label, &d.LastSeen, &d.Firmware, &d.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return d, err
}

func GetDevicesByCouple(ctx context.Context, pool *pgxpool.Pool, coupleID uuid.UUID) ([]*models.Device, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, owner_id, couple_id, mac_address, label, last_seen, firmware, created_at
FROM devices
WHERE couple_id = $1
   OR owner_id IN (
     SELECT user_a_id FROM couples WHERE id = $1
     UNION
     SELECT user_b_id FROM couples WHERE id = $1
   )
ORDER BY created_at ASC`, coupleID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*models.Device
	for rows.Next() {
		d := &models.Device{}
		if err := rows.Scan(&d.ID, &d.OwnerID, &d.CoupleID, &d.MacAddress, &d.Label, &d.LastSeen, &d.Firmware, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// CreateDevice registers a new device for ownerID.
// coupleID is non-nil when the user is already in a couple at pairing time.
func CreateDevice(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID, mac string, coupleID *uuid.UUID) (*models.Device, error) {
	d := &models.Device{}
	err := pool.QueryRow(ctx,
		`INSERT INTO devices (owner_id, couple_id, mac_address)
		 VALUES ($1, $2, $3)
		 RETURNING id, owner_id, couple_id, mac_address, label, last_seen, firmware, created_at`,
		ownerID, coupleID, mac,
	).Scan(&d.ID, &d.OwnerID, &d.CoupleID, &d.MacAddress, &d.Label, &d.LastSeen, &d.Firmware, &d.CreatedAt)
	return d, err
}

// TouchDevice updates last_seen and firmware version.
func TouchDevice(ctx context.Context, pool *pgxpool.Pool, deviceID uuid.UUID, firmware string) error {
	_, err := pool.Exec(ctx,
		`UPDATE devices SET last_seen = now(), firmware = $2 WHERE id = $1`,
		deviceID, firmware)
	return err
}

// LinkDeviceToCouple sets couple_id on a single device.
func LinkDeviceToCouple(ctx context.Context, pool *pgxpool.Pool, deviceID, coupleID uuid.UUID) error {
	_, err := pool.Exec(ctx,
		`UPDATE devices SET couple_id = $2 WHERE id = $1`, deviceID, coupleID)
	return err
}

// LinkAllDevicesToCouple links both partners' existing devices to the couple
// in one query. Called when the couple activates so neither partner has to
// re-pair their device after joining.
func LinkAllDevicesToCouple(ctx context.Context, pool *pgxpool.Pool, coupleID, userAID, userBID uuid.UUID) error {
	_, err := pool.Exec(ctx,
		`UPDATE devices
		 SET couple_id = $1
		 WHERE owner_id = $2 OR owner_id = $3`,
		coupleID, userAID, userBID,
	)
	return err
}

// ─── Content ──────────────────────────────────────────────────────────────────

func GetNextQueued(ctx context.Context, pool *pgxpool.Pool, sentTo uuid.UUID) (*models.Content, error) {
	c := &models.Content{}
	err := pool.QueryRow(ctx,
		`SELECT id, couple_id, sent_by, sent_to, type,
		        storage_key, message_text, caption,
		        status, displayed_at, created_at
		 FROM content
		 WHERE sent_to = $1 AND status = 'queued'
		 ORDER BY created_at ASC
		 LIMIT 1`, sentTo,
	).Scan(
		&c.ID, &c.CoupleID, &c.SentBy, &c.SentTo, &c.Type,
		&c.StorageKey, &c.MessageText, &c.Caption,
		&c.Status, &c.DisplayedAt, &c.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func ListContent(ctx context.Context, pool *pgxpool.Pool, coupleID uuid.UUID) ([]models.Content, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, couple_id, sent_by, sent_to, type,
		        storage_key, message_text, caption,
		        status, displayed_at, created_at
		 FROM content
		 WHERE couple_id = $1
		 ORDER BY created_at DESC`, coupleID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Content
	for rows.Next() {
		var c models.Content
		if err := rows.Scan(
			&c.ID, &c.CoupleID, &c.SentBy, &c.SentTo, &c.Type,
			&c.StorageKey, &c.MessageText, &c.Caption,
			&c.Status, &c.DisplayedAt, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func CreateContent(ctx context.Context, pool *pgxpool.Pool, c *models.Content) (*models.Content, error) {
	out := &models.Content{}
	err := pool.QueryRow(ctx,
		`INSERT INTO content
		   (couple_id, sent_by, sent_to, type, storage_key, message_text, caption)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, couple_id, sent_by, sent_to, type,
		           storage_key, message_text, caption,
		           status, displayed_at, created_at`,
		c.CoupleID, c.SentBy, c.SentTo, c.Type,
		c.StorageKey, c.MessageText, c.Caption,
	).Scan(
		&out.ID, &out.CoupleID, &out.SentBy, &out.SentTo, &out.Type,
		&out.StorageKey, &out.MessageText, &out.Caption,
		&out.Status, &out.DisplayedAt, &out.CreatedAt,
	)
	return out, err
}

func DeleteContent(ctx context.Context, pool *pgxpool.Pool, contentID, sentBy uuid.UUID) error {
	tag, err := pool.Exec(ctx,
		`DELETE FROM content
		 WHERE id = $1 AND sent_by = $2 AND status = 'queued'`,
		contentID, sentBy)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("not found or not deletable")
	}
	return nil
}

// ─── Frame state ──────────────────────────────────────────────────────────────

func GetFrameState(ctx context.Context, pool *pgxpool.Pool, deviceID uuid.UUID) (*models.FrameState, error) {
	fs := &models.FrameState{}
	err := pool.QueryRow(ctx,
		`SELECT device_id, content_id, image_url, image_hash, composed_at, expires_at
		 FROM frame_state WHERE device_id = $1`, deviceID,
	).Scan(&fs.DeviceID, &fs.ContentID, &fs.ImageURL, &fs.ImageHash, &fs.ComposedAt, &fs.ExpiresAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return fs, err
}

func UpsertFrameState(ctx context.Context, pool *pgxpool.Pool, fs *models.FrameState) error {
	_, err := pool.Exec(ctx,
		`INSERT INTO frame_state (device_id, content_id, image_url, image_hash, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (device_id) DO UPDATE
		   SET content_id  = EXCLUDED.content_id,
		       image_url   = EXCLUDED.image_url,
		       image_hash  = EXCLUDED.image_hash,
		       composed_at = now(),
		       expires_at  = EXCLUDED.expires_at`,
		fs.DeviceID, fs.ContentID, fs.ImageURL, fs.ImageHash, fs.ExpiresAt,
	)
	return err
}

// ─── Push subscriptions ───────────────────────────────────────────────────────

func UpsertPushSubscription(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID, endpoint, p256dh, auth string) error {
	_, err := pool.Exec(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, endpoint) DO UPDATE
		   SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
		userID, endpoint, p256dh, auth,
	)
	return err
}

func GetPushSubscriptions(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) ([]models.PushSubscription, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, user_id, endpoint, p256dh, auth, created_at
		 FROM push_subscriptions WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var subs []models.PushSubscription
	for rows.Next() {
		var s models.PushSubscription
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, rows.Err()
}

// ─── Utilities ────────────────────────────────────────────────────────────────

func NextMidnight(tz string) (time.Time, error) {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)
	return next.UTC(), nil
}
