package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
	"github.com/martbul/p-ink/internal/storage"
)

// ─── GET /api/slideshow ───────────────────────────────────────────────────────

func GetMySlideshow(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetMySlideshow")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		s, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch slideshow"))
			return
		}
		if s == nil {
			NotFound(w, "no slideshow yet")
			return
		}
		OK(w, s)
	}
}

// ─── PUT /api/slideshow ───────────────────────────────────────────────────────

func UpsertSlideshowSettings(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.UpsertSlideshowSettings")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Name            string               `json:"name"`
			Mode            models.SlideshowMode `json:"mode"`
			SlideDurationMs *int                 `json:"slide_duration_ms"`
			TransitionMs    *int                 `json:"transition_ms"`
			Repeat          *bool                `json:"repeat"`
			ShowCaption     *bool                `json:"show_caption"`
			ShowDate        *bool                `json:"show_date"`
			ShowProgress    *bool                `json:"show_progress"`
			ManualAdvance   *bool                `json:"manual_advance"`
			NightMode       *bool                `json:"night_mode"`
			NightStart      *int                 `json:"night_start"`
			NightEnd        *int                 `json:"night_end"`
			IsActive        *bool                `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}

		// Validate mode
		switch body.Mode {
		case models.SlideshowModeSequential, models.SlideshowModeShuffle,
			models.SlideshowModeRandom, models.SlideshowModeLoopOne:
		case "":
			body.Mode = models.SlideshowModeSequential
		default:
			BadRequest(w, fmt.Sprintf("mode must be one of: sequential, shuffle, random, loop-one; got %q", body.Mode))
			return
		}

		// Merge with defaults
		slideDur := 8000
		if body.SlideDurationMs != nil {
			slideDur = *body.SlideDurationMs
		}
		if slideDur < 1000 || slideDur > 300000 {
			BadRequest(w, "slide_duration_ms must be between 1000 and 300000")
			return
		}

		tranMs := 500
		if body.TransitionMs != nil {
			tranMs = *body.TransitionMs
		}
		if tranMs < 0 || tranMs > 5000 {
			BadRequest(w, "transition_ms must be between 0 and 5000")
			return
		}

		nightStart := 22
		if body.NightStart != nil {
			nightStart = *body.NightStart
		}
		nightEnd := 7
		if body.NightEnd != nil {
			nightEnd = *body.NightEnd
		}
		if nightStart < 0 || nightStart > 23 || nightEnd < 0 || nightEnd > 23 {
			BadRequest(w, "night_start and night_end must be 0–23")
			return
		}

		name := "My Slideshow"
		if body.Name != "" {
			name = body.Name
		}

		boolVal := func(p *bool, def bool) bool {
			if p != nil {
				return *p
			}
			return def
		}

		s := &models.Slideshow{
			UserID:          user.ID,
			Name:            name,
			Mode:            body.Mode,
			SlideDurationMs: slideDur,
			TransitionMs:    tranMs,
			Repeat:          boolVal(body.Repeat, true),
			ShowCaption:     boolVal(body.ShowCaption, true),
			ShowDate:        boolVal(body.ShowDate, false),
			ShowProgress:    boolVal(body.ShowProgress, true),
			ManualAdvance:   boolVal(body.ManualAdvance, false),
			NightMode:       boolVal(body.NightMode, false),
			NightStart:      nightStart,
			NightEnd:        nightEnd,
			IsActive:        boolVal(body.IsActive, false),
		}

		saved, err := db.UpsertSlideshowSettings(r.Context(), pool, s)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save slideshow settings"))
			return
		}
		OK(w, saved)
	}
}

// ─── PATCH /api/slideshow/active ─────────────────────────────────────────────

func SetSlideshowActive(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.SetSlideshowActive")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		var body struct {
			Active bool `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}
		if err := db.SetSlideshowActive(r.Context(), pool, user.ID, body.Active); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to toggle slideshow"))
			return
		}
		OK(w, map[string]bool{"active": body.Active})
	}
}

// ─── POST /api/slideshow/slides ───────────────────────────────────────────────

func UploadSlide(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	const op = errs.Op("api.UploadSlide")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		// Auto-create slideshow if needed
		ss, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch slideshow"))
			return
		}
		if ss == nil {
			ss, err = db.UpsertSlideshowSettings(r.Context(), pool, &models.Slideshow{
				UserID:          user.ID,
				Name:            "My Slideshow",
				Mode:            models.SlideshowModeSequential,
				SlideDurationMs: 8000,
				TransitionMs:    500,
				Repeat:          true,
				ShowCaption:     true,
				ShowProgress:    true,
			})
			if err != nil {
				Error(w, errs.E(op, errs.KindInternal, err, "failed to create slideshow"))
				return
			}
		}

		if err := r.ParseMultipartForm(20 << 20); err != nil {
			BadRequest(w, "file too large (max 20 MB)")
			return
		}
		file, fh, err := r.FormFile("file")
		if err != nil {
			BadRequest(w, "file is required")
			return
		}
		defer file.Close()

		caption := r.FormValue("caption")
		durationStr := r.FormValue("duration_ms")

		mimeType := fh.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = "image/jpeg"
		}
		imageURL, imageHash, err := store.Upload(r.Context(), file, fh.Filename, mimeType, user.ID.String())
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to upload image"))
			return
		}

		slide := &models.SlideshowSlide{
			SlideshowID: ss.ID,
			ImageURL:    imageURL,
			ImageHash:   imageHash,
		}
		if caption != "" {
			slide.Caption = &caption
		}
		if durationStr != "" {
			if d, parseErr := strconv.Atoi(durationStr); parseErr == nil && d >= 1000 {
				slide.DurationMs = &d
			}
		}

		saved, err := db.AddSlide(r.Context(), pool, ss.ID, slide)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to add slide"))
			return
		}
		Created(w, saved)
	}
}

// ─── PATCH /api/slideshow/slides/{id} ────────────────────────────────────────

func UpdateSlide(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.UpdateSlide")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		slideID, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			BadRequest(w, "invalid slide id")
			return
		}

		var body struct {
			Caption    *string `json:"caption"`
			DurationMs *int    `json:"duration_ms"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}

		ss, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch slideshow"))
			return
		}
		if ss == nil {
			NotFound(w, "no slideshow")
			return
		}

		if err := db.UpdateSlideCaption(r.Context(), pool, ss.ID, slideID, body.Caption, body.DurationMs); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to update slide"))
			return
		}
		updated, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to re-fetch slideshow"))
			return
		}
		OK(w, updated)
	}
}

// ─── DELETE /api/slideshow/slides/{id} ───────────────────────────────────────

func DeleteSlide(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.DeleteSlide")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		slideID, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			BadRequest(w, "invalid slide id")
			return
		}

		ss, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch slideshow"))
			return
		}
		if ss == nil {
			NotFound(w, "no slideshow")
			return
		}

		if err := db.DeleteSlide(r.Context(), pool, ss.ID, slideID); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to delete slide"))
			return
		}
		NoContent(w)
	}
}

// ─── PUT /api/slideshow/slides/reorder ───────────────────────────────────────

func ReorderSlides(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.ReorderSlides")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Order []string `json:"order"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.Order) == 0 {
			BadRequest(w, "order must be a non-empty array of slide UUIDs")
			return
		}

		ids := make([]uuid.UUID, 0, len(body.Order))
		for _, raw := range body.Order {
			id, err := uuid.Parse(raw)
			if err != nil {
				BadRequest(w, "invalid UUID in order: "+raw)
				return
			}
			ids = append(ids, id)
		}

		ss, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch slideshow"))
			return
		}
		if ss == nil {
			NotFound(w, "no slideshow")
			return
		}

		if err := db.ReorderSlides(r.Context(), pool, ss.ID, ids); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to reorder slides"))
			return
		}
		updated, err := db.GetSlideshowByUser(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to re-fetch slideshow"))
			return
		}
		OK(w, updated)
	}
}

// ─── POST /api/slideshow/advance ─────────────────────────────────────────────

// AdvanceSlide is called by the frame device to move to the next slide.
func AdvanceSlide(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.AdvanceSlide")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		newIdx, err := db.AdvanceSlide(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to advance slide"))
			return
		}
		OK(w, map[string]int{"current_index": newIdx})
	}
}

// ─── POST /api/slideshow/slides/{id}/react ────────────────────────────────────

// ReactToSlide lets the partner react with an emoji (also advances in manual_advance mode).
func ReactToSlide(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.ReactToSlide")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		slideID, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			BadRequest(w, "invalid slide id")
			return
		}

		var body struct {
			Emoji string `json:"emoji"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Emoji == "" {
			BadRequest(w, "emoji is required")
			return
		}

		rx, err := db.UpsertReaction(r.Context(), pool, slideID, user.ID, body.Emoji)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save reaction"))
			return
		}
		OK(w, rx)
	}
}

// ─── DELETE /api/slideshow/slides/{id}/react ─────────────────────────────────

func DeleteReaction(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.DeleteReaction")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		slideID, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			BadRequest(w, "invalid slide id")
			return
		}
		if err := db.DeleteReaction(r.Context(), pool, slideID, user.ID); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to delete reaction"))
			return
		}
		NoContent(w)
	}
}