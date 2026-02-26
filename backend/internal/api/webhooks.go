package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
)

// WebhookHandler handles POST /api/webhooks/clerk
// Clerk sends this whenever a user is created or updated.
// We upsert the user into our own DB so we have a stable internal UUID.
func WebhookHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			Error(w, http.StatusBadRequest, "cannot read body")
			return
		}

		// Verify Svix signature
		if !verifyClerkWebhook(r, body) {
			Error(w, http.StatusUnauthorized, "invalid webhook signature")
			return
		}

		var event struct {
			Type string `json:"type"`
			Data struct {
				ID             string `json:"id"`
				EmailAddresses []struct {
					EmailAddress string `json:"email_address"`
				} `json:"email_addresses"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &event); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		// Only handle user create/update
		if event.Type != "user.created" && event.Type != "user.updated" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		email := ""
		if len(event.Data.EmailAddresses) > 0 {
			email = event.Data.EmailAddresses[0].EmailAddress
		}
		name := strings.TrimSpace(event.Data.FirstName + " " + event.Data.LastName)
		if name == "" {
			name = email
		}

		if _, err := db.UpsertUser(r.Context(), pool, event.Data.ID, email, name); err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		NoContent(w)
	}
}

// verifyClerkWebhook checks the svix-signature header against the webhook secret.
// See: https://clerk.com/docs/integrations/webhooks/overview#verifying-requests
func verifyClerkWebhook(r *http.Request, body []byte) bool {
	secret := os.Getenv("CLERK_WEBHOOK_SECRET")
	if secret == "" {
		// In development without a secret, skip verification
		return os.Getenv("ENV") == "development"
	}

	// Svix sends: svix-id, svix-timestamp, svix-signature headers
	svixID        := r.Header.Get("svix-id")
	svixTimestamp := r.Header.Get("svix-timestamp")
	svixSignature := r.Header.Get("svix-signature")

	if svixID == "" || svixTimestamp == "" || svixSignature == "" {
		return false
	}

	// Build the signed content: id.timestamp.body
	toSign := svixID + "." + svixTimestamp + "." + string(body)

	// The secret is prefixed with "whsec_" — strip it and base64-decode
	rawSecret := strings.TrimPrefix(secret, "whsec_")
	secretBytes, err := hex.DecodeString(rawSecret)
	if err != nil {
		// Try raw bytes (some keys aren't hex-encoded)
		secretBytes = []byte(rawSecret)
	}

	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(toSign))
	expected := "v1," + hex.EncodeToString(mac.Sum(nil))

	// svix-signature may contain multiple signatures (space-separated)
	for _, sig := range strings.Split(svixSignature, " ") {
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return true
		}
	}
	return false
}