package api

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
	"github.com/martbul/p-ink/internal/storage"
)

// ListContent  GET /api/content
func ListContent(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil {
			Error(w, http.StatusBadRequest, "not in a couple")
			return
		}

		items, err := db.ListContent(r.Context(), pool, couple.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		OK(w, map[string]any{"items": items})
	}
}

// UploadContent  POST /api/content
// Accepts multipart/form-data:
//   - type:         "photo" | "message" | "drawing"
//   - file:         binary  (photo / drawing only)
//   - message_text: string  (message only)
//   - caption:      string  (optional, any type)
//
// After the raw file is stored, plug your image pipeline into the
// clearly marked hook below to generate the composed BMP.
func UploadContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil || couple.Status != models.CoupleStatusActive {
			Error(w, http.StatusBadRequest, "not in an active couple")
			return
		}

		// Resolve the recipient (always the partner)
		var sentTo uuid.UUID
		if couple.UserAID == user.ID {
			if couple.UserBID == nil {
				Error(w, http.StatusBadRequest, "partner has not joined yet")
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
			Error(w, http.StatusBadRequest, "type is required (photo|message|drawing)")
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
				Error(w, http.StatusBadRequest, "message_text required for type=message")
				return
			}
			c.MessageText = &messageText

		case models.ContentTypePhoto, models.ContentTypeDrawing:
			if err := r.ParseMultipartForm(20 << 20); err != nil {
				Error(w, http.StatusBadRequest, "file too large (max 20 MB)")
				return
			}
			file, header, err := r.FormFile("file")
			if err != nil {
				Error(w, http.StatusBadRequest, "file is required for type=photo|drawing")
				return
			}
			defer file.Close()

			mimeType := header.Header.Get("Content-Type")
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			// Upload raw file to Cloudinary
			url, key, err := store.Upload(r.Context(), file, header.Filename, mimeType, couple.ID.String())
			if err != nil {
				Error(w, http.StatusInternalServerError, "upload failed")
				return
			}
			c.StorageKey = &key
			_ = url // url is the Cloudinary delivery URL; key is the public_id

			// ── IMAGE PROCESSING HOOK ──────────────────────────────────────
			// TODO: call your BMP composition pipeline here.
			//
			// Input:  c.StorageKey (Cloudinary public_id of the raw upload)
			//         store.PublicURL(key) — delivery URL you can pass to
			//         Cloudinary transformation APIs or your own renderer
			//
			// Output: composed 800×480 BMP uploaded to Cloudinary,
			//         its URL and SHA-256 hash
			//
			// Then update the partner's frame state so the ESP32 picks it up:
			//
			//   bmpURL, bmpHash, err := image.Compose(ctx, store, couple, c)
			//   if err == nil {
			//       expiresAt, _ := db.NextMidnight(couple.Timezone)
			//       partnerDevice, _ := db.GetDeviceByOwner(ctx, pool, sentTo)
			//       if partnerDevice != nil {
			//           _ = db.UpsertFrameState(ctx, pool, &models.FrameState{
			//               DeviceID:  partnerDevice.ID,
			//               ContentID: &c.ID,
			//               ImageURL:  bmpURL,
			//               ImageHash: bmpHash,
			//               ExpiresAt: expiresAt,
			//           })
			//       }
			//   }
			// ──────────────────────────────────────────────────────────────

		default:
			Error(w, http.StatusBadRequest, "type must be photo, message, or drawing")
			return
		}

		created, err := db.CreateContent(r.Context(), pool, c)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		Created(w, created)
	}
}

// SendMessage  POST /api/content/message
// JSON-only convenience endpoint (no file upload required).
func SendMessage(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Text    string  `json:"text"`
			Caption *string `json:"caption,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Text == "" {
			Error(w, http.StatusBadRequest, "text is required")
			return
		}

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil || couple.Status != models.CoupleStatusActive {
			Error(w, http.StatusBadRequest, "not in an active couple")
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
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		Created(w, created)
	}
}

// DeleteContent  DELETE /api/content/{id}
// Only the sender can delete, and only while status=queued.
func DeleteContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		id, err := uuid.Parse(mux.Vars(r)["id"])
		if err != nil {
			Error(w, http.StatusBadRequest, "invalid id")
			return
		}

		// Fetch first so we can clean up the Cloudinary asset
		items, err := db.ListContent(r.Context(), pool, uuid.Nil) // reuse list with filter — or add GetContentByID
		_ = items
		_ = err

		if err := db.DeleteContent(r.Context(), pool, id, user.ID); err != nil {
			Error(w, http.StatusNotFound, "not found or cannot be deleted")
			return
		}
		NoContent(w)
	}
}