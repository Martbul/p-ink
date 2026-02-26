package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourusername/p-ink/internal/db"
	"github.com/yourusername/p-ink/internal/middleware"
)

// GetMe handles GET /api/users/me
// Returns the authenticated user's profile and couple status.
func GetMe(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		device, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		OK(w, map[string]any{
			"user":   user,
			"couple": couple,  // nil if not in a couple yet
			"device": device,  // nil if no frame paired yet
		})
	}
}