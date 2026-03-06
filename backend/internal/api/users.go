package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
)

// GetMe  GET /api/users/me
func GetMe(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetMe")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}

		device, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up device"))
			return
		}

		OK(w, map[string]any{
			"user":   user,
			"couple": couple,
			"device": device,
		})
	}
}