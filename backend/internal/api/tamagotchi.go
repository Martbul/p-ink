package api

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// ─── GET /api/tamagotchi/mine ─────────────────────────────────────────────────

func GetMyTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetMyTamagotchi")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found — is your couple active?")
			return
		}

		state, err := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch tamagotchi state"))
			return
		}
		OK(w, state)
	}
}

// ─── GET /api/tamagotchi/partner ──────────────────────────────────────────────

func GetPartnerTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetPartnerTamagotchi")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up partner tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found — is your couple active?")
			return
		}

		state, err := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch partner tamagotchi state"))
			return
		}
		OK(w, state)
	}
}

// ─── POST /api/tamagotchi/rename ──────────────────────────────────────────────

func RenameTamagotchi(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.RenameTamagotchi")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
			BadRequest(w, "name is required")
			return
		}
		if len(body.Name) > 32 {
			BadRequest(w, "name must be 32 characters or fewer")
			return
		}

		tama, err := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found")
			return
		}

		if err := db.RenameTamagotchi(r.Context(), pool, tama.ID, body.Name); err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to rename tamagotchi"))
			return
		}
		tama.Name = body.Name
		OK(w, tama)
	}
}

// ─── GET /api/tamagotchi/shop ─────────────────────────────────────────────────

func GetShop(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetShop")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found")
			return
		}

		items, err := db.ListShopItems(r.Context(), pool, tama.ID, tama.Level)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to list shop items"))
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

func BuyItem(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.BuyItem")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			ItemID string `json:"item_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ItemID == "" {
			BadRequest(w, "item_id is required")
			return
		}
		itemID, err := uuid.Parse(body.ItemID)
		if err != nil {
			BadRequest(w, "invalid item_id")
			return
		}

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found")
			return
		}

		if err := db.BuyItem(r.Context(), pool, tama.ID, itemID); err != nil {
			// BuyItem returns user-readable errors (not enough XP, level req, etc.)
			Error(w, errs.E(op, errs.KindInvalid, err))
			return
		}

		state, err := db.GetTamagotchiState(r.Context(), pool, tama.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch updated state"))
			return
		}
		Created(w, state)
	}
}

// ─── POST /api/tamagotchi/equip ───────────────────────────────────────────────

func EquipItem(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.EquipItem")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			ItemID string `json:"item_id"`
			Slot   string `json:"slot"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}
		if body.ItemID == "" || body.Slot == "" {
			BadRequest(w, "item_id and slot are required")
			return
		}

		itemID, err := uuid.Parse(body.ItemID)
		if err != nil {
			BadRequest(w, "invalid item_id")
			return
		}

		slot := models.EquippedSlot(body.Slot)
		switch slot {
		case models.SlotOutfit, models.SlotAccessory, models.SlotBackground, models.SlotPosition:
		default:
			BadRequest(w, "slot must be one of: outfit, accessory, background, position")
			return
		}

		tama, err := db.GetTamagotchiByController(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up tamagotchi"))
			return
		}
		if tama == nil {
			NotFound(w, "tamagotchi not found")
			return
		}

		if err := db.EquipItem(r.Context(), pool, tama.ID, itemID, slot); err != nil {
			Error(w, errs.E(op, errs.KindInvalid, err))
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

// ─── GET /api/tamagotchi/events ───────────────────────────────────────────────

func GetEvents(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		myTama, _ := db.GetTamagotchiByOwner(r.Context(), pool, user.ID)
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