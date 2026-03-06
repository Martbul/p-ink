package api

// This file adds the appearance endpoint to the existing tamagotchi handler set.
// Register it in main.go:
//
//   protected.HandleFunc("/api/tamagotchi/appearance", api.UpdateAppearance(pool)).Methods(http.MethodPatch)

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
)

// ─── PATCH /api/tamagotchi/appearance ─────────────────────────────────────────
//
// Updates the "free" cosmetic fields on the tamagotchi you OWN:
//   species    – which creature sprite to use
//   background – pixel background scene
//   animation  – idle animation preset
//   position   – anchor position on the e-ink canvas
//
// These fields are NOT shop-gated — any value is accepted as long as it is
// a non-empty string. The client is responsible for only sending valid ids.
//
// Equipped items (outfit, accessory, paid backgrounds/positions) are handled
// by the existing /equip endpoint.

func UpdateAppearance(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Species    *string `json:"species"`
			Background *string `json:"background"`
			Animation  *string `json:"animation"`
			Position   *string `json:"position"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		if err != nil || tama == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found — is your couple active?")
			return
		}

		if err := db.UpdateTamagotchiAppearance(r.Context(), pool, db.AppearanceUpdate{
			ID:         tama.ID,
			Species:    body.Species,
			Background: body.Background,
			Animation:  body.Animation,
			Position:   body.Position,
		}); err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		// Return the updated full state
		state, err := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		OK(w, state)
	}
}