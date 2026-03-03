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

// CreateCouple  POST /api/couples
func CreateCouple(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

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

// GetCouple  GET /api/couples/me
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

		userA, _ := db.GetUserByID(r.Context(), pool, couple.UserAID)
		var userB any
		if couple.UserBID != nil {
			userB, _ = db.GetUserByID(r.Context(), pool, *couple.UserBID)
		}

		OK(w, map[string]any{"couple": couple, "user_a": userA, "user_b": userB})
	}
}

// UpdateCouple  PATCH /api/couples/me
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
			Error(w, http.StatusInternalServerError, "could not update")
			return
		}
		couple.Timezone = body.Timezone
		OK(w, couple)
	}
}

// CreateInvite  POST /api/couples/invite
func CreateInvite(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil {
			Error(w, http.StatusBadRequest, "create a couple first")
			return
		}
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
			"invite_url": fmt.Sprintf("%s/join?token=%s", base, token.Token),
			"expires_at": token.ExpiresAt,
		})
	}
}

// GetInviteInfo  GET /api/couples/invite/{token}  — public, no auth needed
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

		inviter, _ := db.GetUserByID(r.Context(), pool, invite.CreatedBy)
		OK(w, map[string]any{
			"token":      invite.Token,
			"expires_at": invite.ExpiresAt,
			"invited_by": inviter,
		})
	}
}

// JoinCouple  POST /api/couples/join
//
// Accepts an invite token and activates the couple.
// If the joining user is currently in a PENDING couple (one they created
// themselves but nobody joined yet), that couple is silently deleted first
// so they can join the new one. Active couples are never deleted this way —
// the user must explicitly leave first.
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

		invite, err := db.GetInviteToken(r.Context(), pool, body.Token)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if invite == nil {
			Error(w, http.StatusNotFound, "invalid token")
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

		// Check if the joiner already belongs to a couple.
		existing, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if existing != nil {
			// Only allow proceeding if the existing couple is still pending
			// (nobody has joined it yet). In that case, delete it so the user
			// can join the new couple cleanly.
			if existing.Status != "pending" {
				Error(w, http.StatusConflict, "already in an active couple")
				return
			}
			// Make sure they're not joining their own invite
			if existing.ID == invite.CoupleID {
				Error(w, http.StatusBadRequest, "cannot join your own couple")
				return
			}
			// Delete the stale pending couple (cascade deletes invite_tokens,
			// devices.couple_id is SET NULL via FK, tamagotchis cascade).
			if err := db.DeleteCouple(r.Context(), pool, existing.ID); err != nil {
				Error(w, http.StatusInternalServerError, "could not clear pending couple")
				return
			}
		}

		couple, err := db.GetCoupleByID(r.Context(), pool, invite.CoupleID)
		if err != nil || couple == nil {
			Error(w, http.StatusInternalServerError, "couple not found")
			return
		}
		if couple.UserAID == user.ID {
			Error(w, http.StatusBadRequest, "cannot join your own couple")
			return
		}

		updated, err := db.ActivateCouple(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "could not join couple")
			return
		}
		_ = db.UseInviteToken(r.Context(), pool, body.Token, user.ID)

		// Link BOTH partners' devices (if already paired) to this couple.
		_ = db.LinkAllDevicesToCouple(r.Context(), pool, couple.ID, couple.UserAID, user.ID)

		// Create both Tamagotchis now that the couple is active.
		_ = db.CreateTamagotchisForCouple(r.Context(), pool, couple.ID, couple.UserAID, user.ID)

		OK(w, updated)
	}
}