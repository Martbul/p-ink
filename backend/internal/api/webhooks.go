package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
)

// WebhookHandler  POST /api/webhooks/clerk
func WebhookHandler(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.WebhookHandler")
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			BadRequest(w, "cannot read body")
			return
		}

		if !verifyClerkWebhook(r, body) {
			Error(w, errs.E(op, errs.KindUnauthorized, "invalid webhook signature"))
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
			BadRequest(w, "invalid JSON")
			return
		}

		if event.Type != "user.created" && event.Type != "user.updated" {
			NoContent(w)
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
			Error(w, errs.E(op, errs.KindInternal, err, "failed to upsert user"))
			return
		}
		NoContent(w)
	}
}

func verifyClerkWebhook(r *http.Request, body []byte) bool {
	secret := os.Getenv("CLERK_WEBHOOK_SECRET")
	if secret == "" {
		return os.Getenv("APP_ENV") != "production"
	}

	svixID        := r.Header.Get("svix-id")
	svixTimestamp := r.Header.Get("svix-timestamp")
	svixSignature := r.Header.Get("svix-signature")
	if svixID == "" || svixTimestamp == "" || svixSignature == "" {
		return false
	}

	toSign := svixID + "." + svixTimestamp + "." + string(body)

	rawSecret := strings.TrimPrefix(secret, "whsec_")
	secretBytes, err := base64.StdEncoding.DecodeString(rawSecret)
	if err != nil {
		secretBytes = []byte(rawSecret)
	}

	mac := hmac.New(sha256.New, secretBytes)
	mac.Write([]byte(toSign))
	expected := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	for _, sig := range strings.Split(svixSignature, " ") {
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return true
		}
	}
	return false
}