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

// ListContent handles GET /api/content
// Returns all content for the current user's couple.
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

// UploadContent handles POST /api/content
// Accepts multipart/form-data with:
//   - type: "photo" | "message" | "drawing"
//   - file: binary (for photo/drawing)
//   - message_text: string (for message)
//   - caption: string (optional, any type)
//
// You will plug your image processing pipeline into this handler.
// Right now it stores the raw file to S3 and creates the DB record.
// The image composition step (BMP generation) is a TODO stub.
func UploadContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		// Resolve couple + partner
		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil || couple == nil {
			Error(w, http.StatusBadRequest, "not in an active couple")
			return
		}
		if couple.Status != models.CoupleStatusActive {
			Error(w, http.StatusBadRequest, "partner has not joined yet")
			return
		}

		// Determine the recipient (the partner)
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
				Error(w, http.StatusBadRequest, "message_text is required for type=message")
				return
			}
			c.MessageText = &messageText

		case models.ContentTypePhoto, models.ContentTypeDrawing:
			if err := r.ParseMultipartForm(20 << 20); err != nil { // 20 MB limit
				Error(w, http.StatusBadRequest, "file too large or invalid multipart")
				return
			}
			file, header, err := r.FormFile("file")
			if err != nil {
				Error(w, http.StatusBadRequest, "file is required for type=photo|drawing")
				return
			}
			defer file.Close()

			// Detect content type from extension/header
			mimeType := header.Header.Get("Content-Type")
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			// Upload raw file to S3/R2
			// Key: content/<couple_id>/<random_uuid>.<ext>
			key, err := store.Upload(r.Context(), file, header.Filename, mimeType, couple.ID.String())
			if err != nil {
				Error(w, http.StatusInternalServerError, "storage upload failed")
				return
			}
			c.StorageKey = &key

			// ── IMAGE PROCESSING HOOK ──────────────────────────────────────────
			// TODO: call your image composition pipeline here.
			// Input:  c.StorageKey (raw uploaded file in S3)
			// Output: a composed 800×480 BMP uploaded to S3, URL + SHA-256 hash
			// Then:   call db.UpsertFrameState with the new BMP details
			//
			// Example (implement in internal/image/compose.go):
			//
			//   bmpKey, bmpHash, err := image.Compose(ctx, store, couple, c)
			//   if err == nil {
			//       expiresAt, _ := db.NextMidnight(couple.Timezone)
			//       partnerDevice, _ := db.GetDeviceByOwner(ctx, pool, sentTo)
			//       if partnerDevice != nil {
			//           db.UpsertFrameState(ctx, pool, &models.FrameState{
			//               DeviceID:  partnerDevice.ID,
			//               ContentID: &c.ID,
			//               ImageURL:  store.PublicURL(bmpKey),
			//               ImageHash: bmpHash,
			//               ExpiresAt: expiresAt,
			//           })
			//       }
			//   }
			// ──────────────────────────────────────────────────────────────────

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

// DeleteContent handles DELETE /api/content/{id}
// Only the sender can delete, and only while status=queued.
func DeleteContent(pool *pgxpool.Pool, store storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())
		idStr := mux.Vars(r)["id"]

		id, err := uuid.Parse(idStr)
		if err != nil {
			Error(w, http.StatusBadRequest, "invalid id")
			return
		}

		// DeleteContent in db only deletes if sent_by = user.ID AND status = queued
		if err := db.DeleteContent(r.Context(), pool, id, user.ID); err != nil {
			Error(w, http.StatusNotFound, "content not found or cannot be deleted")
			return
		}

		NoContent(w)
	}
}

// SendMessage handles POST /api/content/message — convenience JSON-only endpoint
// (no file upload needed). Equivalent to POST /api/content with type=message.
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