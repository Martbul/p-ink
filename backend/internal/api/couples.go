package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
)

// CreateCouple  POST /api/couples
func CreateCouple(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.CreateCouple")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		existing, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if existing != nil {
			Error(w, errs.E(op, errs.KindConflict, "already in a couple"))
			return
		}

		var body struct {
			Timezone string `json:"timezone"`
		}
		body.Timezone = "UTC"
		_ = json.NewDecoder(r.Body).Decode(&body)

		couple, err := db.CreateCouple(r.Context(), pool, user.ID, body.Timezone)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to create couple"))
			return
		}
		Created(w, couple)
	}
}

// GetCouple  GET /api/couples/me
func GetCouple(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetCouple")
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
	const op = errs.Op("api.UpdateCouple")
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

		var body struct {
			Timezone string `json:"timezone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Timezone == "" {
			BadRequest(w, "timezone is required")
			return
		}

		if err := db.UpdateCoupleTimezone(r.Context(), pool, couple.ID, body.Timezone); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to update timezone"))
			return
		}
		couple.Timezone = body.Timezone
		OK(w, couple)
	}
}

// CreateInvite  POST /api/couples/invite
func CreateInvite(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.CreateInvite")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil {
			BadRequest(w, "create a couple first")
			return
		}
		if couple.UserAID != user.ID {
			Error(w, errs.E(op, errs.KindForbidden, "only the couple creator can invite"))
			return
		}

		token, err := db.CreateInviteToken(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to create invite token"))
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
	const op = errs.Op("api.GetInviteInfo")
	return func(w http.ResponseWriter, r *http.Request) {
		token := mux.Vars(r)["token"]

		invite, err := db.GetInviteToken(r.Context(), pool, token)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up invite"))
			return
		}
		if invite == nil {
			NotFound(w, "invalid or expired token")
			return
		}
		if invite.UsedAt != nil {
			Error(w, errs.E(op, errs.KindConflict, "invite already used"))
			return
		}
		if invite.ExpiresAt.Before(now()) {
			Error(w, errs.E(op, errs.KindInvalid, "invite expired"))
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
	const op = errs.Op("api.JoinCouple")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Token == "" {
			BadRequest(w, "token is required")
			return
		}

		invite, err := db.GetInviteToken(r.Context(), pool, body.Token)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up invite token"))
			return
		}
		if invite == nil {
			NotFound(w, "invalid token")
			return
		}
		if invite.UsedAt != nil {
			Error(w, errs.E(op, errs.KindConflict, "invite already used"))
			return
		}
		if invite.ExpiresAt.Before(now()) {
			Error(w, errs.E(op, errs.KindInvalid, "invite expired"))
			return
		}

		existing, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up existing couple"))
			return
		}
		if existing != nil {
			if existing.Status != "pending" {
				Error(w, errs.E(op, errs.KindConflict, "already in an active couple"))
				return
			}
			if existing.ID == invite.CoupleID {
				BadRequest(w, "cannot join your own couple")
				return
			}
			if err := db.DeleteCouple(r.Context(), pool, existing.ID); err != nil {
				Error(w, errs.E(op, errs.KindInternal, err, "failed to clear pending couple"))
				return
			}
		}

		couple, err := db.GetCoupleByID(r.Context(), pool, invite.CoupleID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil {
			NotFound(w, "couple not found")
			return
		}
		if couple.UserAID == user.ID {
			BadRequest(w, "cannot join your own couple")
			return
		}

		updated, err := db.ActivateCouple(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to activate couple"))
			return
		}
		_ = db.UseInviteToken(r.Context(), pool, body.Token, user.ID)
		_ = db.LinkAllDevicesToCouple(r.Context(), pool, couple.ID, couple.UserAID, user.ID)
		_ = db.CreateTamagotchisForCouple(r.Context(), pool, couple.ID, couple.UserAID, user.ID)

		OK(w, updated)
	}
}