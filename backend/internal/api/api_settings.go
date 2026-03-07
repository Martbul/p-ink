package api

// ─── api_settings.go ──────────────────────────────────────────────────────────
// Three new protected endpoints wired in main.go:
//
//   DELETE /api/devices/me          — unpair the caller's device
//   DELETE /api/couples/me          — dissolve the couple (both users lose couple)
//   POST   /api/location/share      — upsert caller's live location
//   DELETE /api/location/share      — stop sharing (delete row)
//
// Import path: github.com/martbul/p-ink/internal/api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// ─── DELETE /api/devices/me ───────────────────────────────────────────────────

// UnpairDevice removes the caller's device registration.
// After this the frame will receive 404 on the next poll and show the pairing screen.
func UnpairDevice(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.UnpairDevice")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		device, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up device"))
			return
		}
		if device == nil {
			NotFound(w, "no device paired")
			return
		}

		if _, err := pool.Exec(r.Context(),
			`DELETE FROM devices WHERE owner_id = $1`, user.ID,
		); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to delete device"))
			return
		}
		NoContent(w)
	}
}

// ─── DELETE /api/couples/me ───────────────────────────────────────────────────

// DissolveCouple hard-deletes the couple row (CASCADE handles tamagotchis,
// content, frame_state, invite_tokens, devices.couple_id set NULL).
// Both partners lose their couple on next /api/users/me fetch.
func DissolveCouple(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.DissolveCouple")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil {
			NotFound(w, "not in a couple")
			return
		}

		// Prevent accidental dissolution of a pending couple with a different
		// initiating user by only allowing user_a (couple creator) OR user_b.
		// Both are allowed — either partner can end the relationship.
		if couple.UserAID != user.ID {
			if couple.UserBID == nil || *couple.UserBID != user.ID {
				Error(w, errs.E(op, errs.KindForbidden, "not a member of this couple"))
				return
			}
		}

		if err := db.DeleteCouple(r.Context(), pool, couple.ID); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to dissolve couple"))
			return
		}
		NoContent(w)
	}
}

// ─── POST /api/location/share ─────────────────────────────────────────────────

// ShareLocation upserts the caller's current coordinates.
// The partner's frame will pick these up on the next poll via the
// `location` field added to PollResponse.
func ShareLocation(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.ShareLocation")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Lat      float64  `json:"lat"`
			Lng      float64  `json:"lng"`
			Accuracy *float32 `json:"accuracy_m,omitempty"`
			Mode     string   `json:"mode"` // "coordinates" | "map_link"
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON body")
			return
		}
		if body.Lat == 0 && body.Lng == 0 {
			BadRequest(w, "lat and lng are required")
			return
		}
		if body.Mode != models.LocationModeCoordinates && body.Mode != models.LocationModeMapLink {
			body.Mode = models.LocationModeCoordinates
		}

		// Caller must be in an active couple — location is only useful if there
		// is a partner's frame to display it on.
		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil || couple.Status != "active" {
			BadRequest(w, "not in an active couple")
			return
		}

		share := &models.LocationShare{
			UserID:    user.ID,
			Lat:       body.Lat,
			Lng:       body.Lng,
			Accuracy:  body.Accuracy,
			Mode:      body.Mode,
			UpdatedAt: time.Now().UTC(),
			ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
		}

		if err := db.UpsertLocationShare(r.Context(), pool, share); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save location"))
			return
		}
		OK(w, share)
	}
}

// ─── DELETE /api/location/share ───────────────────────────────────────────────

// StopSharingLocation removes the caller's location row.
// The partner's frame will stop showing the location on the next poll.
func StopSharingLocation(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.StopSharingLocation")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		if _, err := pool.Exec(r.Context(),
			`DELETE FROM location_shares WHERE user_id = $1`, user.ID,
		); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to delete location share"))
			return
		}
		NoContent(w)
	}
}