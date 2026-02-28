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

		existing, _ := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if existing != nil {
			Error(w, http.StatusConflict, "already in a couple")
			return
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

		// Create both Tamagotchis now that the couple is active.
		// couple.UserAID owns theirs, user.ID (the joiner) owns theirs.
		// Each one is controlled by the other.
		_ = db.CreateTamagotchisForCouple(r.Context(), pool, couple.ID, couple.UserAID, user.ID)

		// Link the joining user's device if they already have one
		if device, _ := db.GetDeviceByOwner(r.Context(), pool, user.ID); device != nil {
			_ = db.LinkDeviceToCouple(r.Context(), pool, device.ID, couple.ID)
		}

		OK(w, updated)
	}
}