package api

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
)

// SubscribePush handles POST /api/notifications/subscribe
// The frontend sends the browser's PushSubscription object after the user
// grants notification permission.
func SubscribePush(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Endpoint string `json:"endpoint"`
			Keys     struct {
				P256dh string `json:"p256dh"`
				Auth   string `json:"auth"`
			} `json:"keys"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}
		if body.Endpoint == "" || body.Keys.P256dh == "" || body.Keys.Auth == "" {
			Error(w, http.StatusBadRequest, "endpoint, keys.p256dh and keys.auth are required")
			return
		}

		if err := db.UpsertPushSubscription(
			r.Context(), pool,
			user.ID, body.Endpoint, body.Keys.P256dh, body.Keys.Auth,
		); err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		NoContent(w)
	}
}

// GetPushSubscriptions handles GET /api/notifications/subscriptions
// Returns the current user's push subscriptions (useful for debugging).
func GetPushSubscriptions(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		subs, err := db.GetPushSubscriptions(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		OK(w, map[string]any{"subscriptions": subs})
	}
}