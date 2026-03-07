package api

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// GetMyPixelAvatar  GET /api/pixel-avatar/mine
func GetMyPixelAvatar(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetMyPixelAvatar")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		avatar, err := db.GetPixelAvatarByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch avatar"))
			return
		}
		if avatar == nil {
			NotFound(w, "no avatar yet")
			return
		}
		OK(w, avatar)
	}
}

// UpsertMyPixelAvatar  PUT /api/pixel-avatar
func UpsertMyPixelAvatar(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.UpsertMyPixelAvatar")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Name    string   `json:"name"`
			Pixels  []int    `json:"pixels"`
			Palette []string `json:"palette"`
			Width   int      `json:"width"`
			Height  int      `json:"height"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}

		if body.Width != 16 && body.Width != 32 {
			BadRequest(w, "width must be 16 or 32")
			return
		}
		if body.Height != body.Width {
			BadRequest(w, "height must equal width")
			return
		}
		if len(body.Pixels) != body.Width*body.Height {
			BadRequest(w, "pixels length must equal width*height")
			return
		}
		if len(body.Palette) == 0 || len(body.Palette) > 32 {
			BadRequest(w, "palette must have 1-32 colours")
			return
		}
		if body.Name == "" {
			body.Name = "My Avatar"
		}

		avatar := &models.PixelAvatar{
			UserID:  user.ID,
			Name:    body.Name,
			Pixels:  body.Pixels,
			Palette: body.Palette,
			Width:   body.Width,
			Height:  body.Height,
		}

		if err := db.UpsertPixelAvatar(r.Context(), pool, avatar); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save avatar"))
			return
		}

		saved, err := db.GetPixelAvatarByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch saved avatar"))
			return
		}
		OK(w, saved)
	}
}

// GetPartnerPixelAvatar  GET /api/pixel-avatar/partner
func GetPartnerPixelAvatar(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetPartnerPixelAvatar")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil {
			NotFound(w, "no active couple")
			return
		}

		avatar, err := db.GetPartnerPixelAvatar(r.Context(), pool, couple.ID, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch partner avatar"))
			return
		}
		if avatar == nil {
			NotFound(w, "partner has no avatar yet")
			return
		}
		OK(w, avatar)
	}
}