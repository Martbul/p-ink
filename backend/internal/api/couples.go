package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
)

// CreateCouple handles POST /api/couples
// Creates a pending couple owned by the current user.
// Called during onboarding before the partner has joined.
func CreateCouple(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		// Check if they're already in a couple
		existing, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if existing != nil {
			Error(w, http.StatusConflict, "already in a couple")
			return
		}

		var body struct {
			Timezone string `json:"timezone"`
		}
		// Default to UTC if not provided
		body.Timezone = "UTC"
		_ = json.NewDecoder(r.Body).Decode(&body)

		couple, err := db.CreateCouple(r.Context(), pool, user.ID, body.Timezone)
		if err != nil {
			Error(w, http.StatusInternalServerError, "could not create couple")
			return
		}

		Created(w, couple)
	}
}

// CreateInvite handles POST /api/couples/invite
// Generates a new invite token for the current user's couple.
func CreateInvite(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil {
			Error(w, http.StatusBadRequest, "you must create a couple first")
			return
		}

		// Only user_a (creator) can generate invites
		if couple.UserAID != user.ID {
			Error(w, http.StatusForbidden, "only the couple creator can invite")
			return
		}

		token, err := db.CreateInviteToken(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "could not create invite")
			return
		}

		base := os.Getenv("FRONTEND_URL")
		if base == "" {
			base = "https://p-ink.app"
		}

		OK(w, map[string]any{
			"token":      token.Token,
			"invite_url": fmt.Sprintf("%s/onboarding/join?token=%s", base, token.Token),
			"expires_at": token.ExpiresAt,
		})
	}
}

// JoinCouple handles POST /api/couples/join
// The partner clicks the invite link → hits this endpoint with the token.
func JoinCouple(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" {
			Error(w, http.StatusBadRequest, "token is required")
			return
		}

		// Validate token
		invite, err := db.GetInviteToken(r.Context(), pool, body.Token)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if invite == nil {
			Error(w, http.StatusNotFound, "invalid invite token")
			return
		}
		if invite.UsedAt != nil {
			Error(w, http.StatusGone, "invite already used")
			return
		}
		if invite.ExpiresAt.Before(now()) {
			Error(w, http.StatusGone, "invite expired")
			return
		}

		// Make sure the user isn't already in a couple
		existing, _ := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if existing != nil {
			Error(w, http.StatusConflict, "already in a couple")
			return
		}

		// Make sure they're not joining their own invite
		couple, err := db.GetCoupleByID(r.Context(), pool, invite.CoupleID)
		if err != nil || couple == nil {
			Error(w, http.StatusInternalServerError, "couple not found")
			return
		}
		if couple.UserAID == user.ID {
			Error(w, http.StatusBadRequest, "cannot join your own couple")
			return
		}

		// Activate the couple
		updated, err := db.ActivateCouple(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "could not join couple")
			return
		}

		// Mark token as used
		_ = db.UseInviteToken(r.Context(), pool, body.Token, user.ID)

		// If the joining user already has a device registered, link it
		device, _ := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if device != nil {
			_ = db.LinkDeviceToCouple(r.Context(), pool, device.ID, couple.ID)
		}

		OK(w, updated)
	}
}

// GetCouple handles GET /api/couples/me
// Returns the current user's couple with both partner details.
func GetCouple(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if couple == nil {
			Error(w, http.StatusNotFound, "not in a couple")
			return
		}

		// Load both partner profiles
		userA, _ := db.GetUserByID(r.Context(), pool, couple.UserAID)
		var userB any
		if couple.UserBID != nil {
			userB, _ = db.GetUserByID(r.Context(), pool, *couple.UserBID)
		}

		OK(w, map[string]any{
			"couple": couple,
			"user_a": userA,
			"user_b": userB,
		})
	}
}

// UpdateCouple handles PATCH /api/couples/me
// Currently only supports updating the timezone.
func UpdateCouple(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil {
			Error(w, http.StatusNotFound, "not in a couple")
			return
		}

		var body struct {
			Timezone string `json:"timezone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Timezone == "" {
			Error(w, http.StatusBadRequest, "timezone is required")
			return
		}

		if err := db.UpdateCoupleTimezone(r.Context(), pool, couple.ID, body.Timezone); err != nil {
			Error(w, http.StatusInternalServerError, "could not update timezone")
			return
		}

		couple.Timezone = body.Timezone
		OK(w, couple)
	}
}

// GetInviteInfo handles GET /api/couples/invite/{token}
// Used by the frontend to preview the invite before the user accepts.
func GetInviteInfo(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := mux.Vars(r)["token"]

		invite, err := db.GetInviteToken(r.Context(), pool, token)
		if err != nil || invite == nil {
			Error(w, http.StatusNotFound, "invalid token")
			return
		}
		if invite.UsedAt != nil {
			Error(w, http.StatusGone, "already used")
			return
		}
		if invite.ExpiresAt.Before(now()) {
			Error(w, http.StatusGone, "expired")
			return
		}

		// Load the inviting user's name so the UI can say "Alex invited you"
		inviter, _ := db.GetUserByID(r.Context(), pool, invite.CreatedBy)

		OK(w, map[string]any{
			"token":      invite.Token,
			"expires_at": invite.ExpiresAt,
			"invited_by": inviter,
		})
	}
}