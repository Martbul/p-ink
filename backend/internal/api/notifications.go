package api

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
)

// SubscribePush  POST /api/notifications/subscribe
func SubscribePush(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.SubscribePush")
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
			BadRequest(w, "invalid JSON")
			return
		}
		if body.Endpoint == "" || body.Keys.P256dh == "" || body.Keys.Auth == "" {
			BadRequest(w, "endpoint, keys.p256dh and keys.auth are required")
			return
		}

		if err := db.UpsertPushSubscription(
			r.Context(), pool,
			user.ID, body.Endpoint, body.Keys.P256dh, body.Keys.Auth,
		); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to save push subscription"))
			return
		}
		NoContent(w)
	}
}

// GetPushSubscriptions  GET /api/notifications/subscriptions
func GetPushSubscriptions(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetPushSubscriptions")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		subs, err := db.GetPushSubscriptions(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch push subscriptions"))
			return
		}
		OK(w, map[string]any{"subscriptions": subs})
	}
}