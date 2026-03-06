package api

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
)

func UpdateAppearance(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.UpdateAppearance")

	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Species    *string `json:"species"`
			Background *string `json:"background"`
			Animation  *string `json:"animation"`
			Position   *string `json:"position"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			Error(w, errs.E(op, errs.KindInvalid, err, "invalid JSON body"))
			return
		}

		tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			Error(w, errs.E(op, errs.KindNotFound, "tamagotchi not found — is your couple active?"))
			return
		}

		if err := db.UpdateTamagotchiAppearance(r.Context(), pool, db.AppearanceUpdate{
			ID:         tama.ID,
			Species:    body.Species,
			Background: body.Background,
			Animation:  body.Animation,
			Position:   body.Position,
		}); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to update appearance"))
			return
		}

		state, err := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch updated state"))
			return
		}
		OK(w, state)
	}
}