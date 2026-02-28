package api

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// ─── GET /api/tamagotchi/mine ─────────────────────────────────────────────────
// Returns YOUR Tamagotchi — the one that lives on your frame,
// controlled by your partner.
func GetMyTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		state, err := func() (*models.TamagotchiState, error) {
			tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
			if err != nil || tama == nil {
				return nil, err
			}
			return db.GetTamagotchiState(r.Context(), pool, tama.ID)
		}()
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if state == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found — is your couple active?")
			return
		}
		OK(w, state)
	}
}

// ─── GET /api/tamagotchi/partner ──────────────────────────────────────────────
// Returns your PARTNER'S Tamagotchi — the one you control by sending content.
func GetPartnerTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		state, err := func() (*models.TamagotchiState, error) {
			tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
			if err != nil || tama == nil {
				return nil, err
			}
			return db.GetTamagotchiState(r.Context(), pool, tama.ID)
		}()
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if state == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found — is your couple active?")
			return
		}
		OK(w, state)
	}
}

// ─── POST /api/tamagotchi/rename ──────────────────────────────────────────────
// Rename YOUR Tamagotchi (the one you own).
func RenameTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
			Error(w, http.StatusBadRequest, "name is required")
			return
		}
		if len(body.Name) > 32 {
			Error(w, http.StatusBadRequest, "name must be 32 characters or fewer")
			return
		}

		tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		if err != nil || tama == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found")
			return
		}

		if err := db.RenameTamagotchi(r.Context(), pool, tama.ID, body.Name); err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		tama.Name = body.Name
		OK(w, tama)
	}
}

// ─── GET /api/tamagotchi/shop ─────────────────────────────────────────────────
// Lists items available for purchase for the Tamagotchi you CONTROL (partner's).
// You spend YOUR partner's XP to dress THEIR creature.
func GetShop(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if tama == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found")
			return
		}

		items, err := db.ListShopItems(r.Context(), pool, tama.ID, tama.Level)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		OK(w, map[string]any{
			"tamagotchi_xp":    tama.XP,
			"tamagotchi_level": tama.Level,
			"items":            items,
		})
	}
}

// ─── POST /api/tamagotchi/shop/buy ────────────────────────────────────────────
// Buy an item from the shop. XP is deducted from the Tamagotchi you control.
func BuyItem(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			ItemID string `json:"item_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ItemID == "" {
			Error(w, http.StatusBadRequest, "item_id is required")
			return
		}
		itemID, err := uuid.Parse(body.ItemID)
		if err != nil {
			Error(w, http.StatusBadRequest, "invalid item_id")
			return
		}

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil || tama == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found")
			return
		}

		if err := db.BuyItem(r.Context(), pool, tama.ID, itemID); err != nil {
			Error(w, http.StatusBadRequest, err.Error())
			return
		}

		// Return updated tamagotchi state
		state, _ := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		Created(w, state)
	}
}

// ─── POST /api/tamagotchi/equip ───────────────────────────────────────────────
// Equip an owned item to a slot on the Tamagotchi you control.
func EquipItem(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			ItemID string `json:"item_id"`
			Slot   string `json:"slot"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}
		if body.ItemID == "" || body.Slot == "" {
			Error(w, http.StatusBadRequest, "item_id and slot are required")
			return
		}

		itemID, err := uuid.Parse(body.ItemID)
		if err != nil {
			Error(w, http.StatusBadRequest, "invalid item_id")
			return
		}

		slot := models.EquippedSlot(body.Slot)
		switch slot {
		case models.SlotOutfit, models.SlotAccessory, models.SlotBackground, models.SlotPosition:
		default:
			Error(w, http.StatusBadRequest, "slot must be one of: outfit, accessory, background, position")
			return
		}

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil || tama == nil {
			Error(w, http.StatusNotFound, "tamagotchi not found")
			return
		}

		if err := db.EquipItem(r.Context(), pool, tama.ID, itemID, slot); err != nil {
			Error(w, http.StatusBadRequest, err.Error())
			return
		}

		state, _ := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		OK(w, state)
	}
}

// ─── GET /api/tamagotchi/events ───────────────────────────────────────────────
// Recent events for both Tamagotchis in the couple (activity feed).
func GetEvents(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		// Events for the tamagotchi YOU own
		myTama, _ := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		// Events for the tamagotchi you CONTROL
		partnerTama, _ := db.GetTamagotchiByController(r.Context(), pool, user.ID)

		type eventSet struct {
			TamagotchiID string                   `json:"tamagotchi_id"`
			Events       []models.TamagotchiEvent `json:"events"`
		}

		var result []eventSet
		if myTama != nil {
			events, _ := db.GetRecentEvents(r.Context(), pool, myTama.ID, 15)
			result = append(result, eventSet{TamagotchiID: myTama.ID.String(), Events: events})
		}
		if partnerTama != nil {
			events, _ := db.GetRecentEvents(r.Context(), pool, partnerTama.ID, 15)
			result = append(result, eventSet{TamagotchiID: partnerTama.ID.String(), Events: events})
		}

		OK(w, map[string]any{"event_sets": result})
	}
}