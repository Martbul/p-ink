package api

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
	"github.com/martbul/p-ink/internal/storage"
)

// ListContent  GET /api/content
func ListContent(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.ListContent")
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

		items, err := db.ListContent(r.Context(), pool, couple.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to list content"))
			return
		}
		OK(w, map[string]any{"items": items})
	}
}

// UploadContent  POST /api/content
func UploadContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	const op = errs.Op("api.UploadContent")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil || couple.Status != models.CoupleStatusActive {
			BadRequest(w, "not in an active couple")
			return
		}

		var sentTo uuid.UUID
		if couple.UserAID == user.ID {
			if couple.UserBID == nil {
				BadRequest(w, "partner has not joined yet")
				return
			}
			sentTo = *couple.UserBID
		} else {
			sentTo = couple.UserAID
		}

		contentType := r.FormValue("type")
		caption := r.FormValue("caption")
		messageText := r.FormValue("message_text")

		if contentType == "" {
			BadRequest(w, "type is required (photo|message|drawing)")
			return
		}

		c := &models.Content{
			CoupleID: couple.ID,
			SentBy:   user.ID,
			SentTo:   sentTo,
			Type:     models.ContentType(contentType),
		}
		if caption != "" {
			c.Caption = &caption
		}

		switch models.ContentType(contentType) {

		case models.ContentTypeMessage:
			if messageText == "" {
				BadRequest(w, "message_text required for type=message")
				return
			}
			c.MessageText = &messageText

		case models.ContentTypePhoto, models.ContentTypeDrawing:
			if err := r.ParseMultipartForm(20 << 20); err != nil {
				BadRequest(w, "file too large (max 20 MB)")
				return
			}
			file, header, err := r.FormFile("file")
			if err != nil {
				BadRequest(w, "file is required for type=photo|drawing")
				return
			}
			defer file.Close()

			mimeType := header.Header.Get("Content-Type")
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			url, key, err := store.Upload(r.Context(), file, header.Filename, mimeType, couple.ID.String())
			if err != nil {
				Error(w, errs.E(op, errs.KindInternal, err, "upload to storage failed"))
				return
			}
			c.StorageKey = &key
			_ = url

			if feedResult, feedErr := db.Feed(r.Context(), pool, user.ID, c.Type); feedErr == nil && feedResult.LeveledUp {
				_ = feedResult
			}

		default:
			BadRequest(w, "type must be photo, message, or drawing")
			return
		}

		created, err := db.CreateContent(r.Context(), pool, c)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save content"))
			return
		}
		Created(w, created)
	}
}

// SendMessage  POST /api/content/message
func SendMessage(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.SendMessage")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Text    string  `json:"text"`
			Caption *string `json:"caption,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
			BadRequest(w, "text is required")
			return
		}

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil || couple.Status != models.CoupleStatusActive {
			BadRequest(w, "not in an active couple")
			return
		}

		var sentTo uuid.UUID
		if couple.UserAID == user.ID {
			sentTo = *couple.UserBID
		} else {
			sentTo = couple.UserAID
		}

		c := &models.Content{
			CoupleID:    couple.ID,
			SentBy:      user.ID,
			SentTo:      sentTo,
			Type:        models.ContentTypeMessage,
			MessageText: &body.Text,
			Caption:     body.Caption,
		}
		created, err := db.CreateContent(r.Context(), pool, c)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save message"))
			return
		}
		Created(w, created)
	}
}

// DeleteContent  DELETE /api/content/{id}
func DeleteContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	const op = errs.Op("api.DeleteContent")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		id, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			BadRequest(w, "invalid content id")
			return
		}

		if err := db.DeleteContent(r.Context(), pool, id, user.ID); err != nil {
			Error(w, errs.E(op, errs.KindNotFound, err, "not found or cannot be deleted"))
			return
		}
		NoContent(w)
	}
}