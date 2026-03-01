// Package tamagotchi contains the business logic for the Tamagotchi system.
//
// The domain layer sits between the API handlers and the DB layer:
//
//	api/tamagotchi.go  →  domain/tamagotchi/service.go  →  db/tamagotchi.go
//
// The API parses HTTP requests and calls the Service.
// The Service runs business logic and calls db functions.
// The DB layer executes SQL and returns models.
//
// Nothing in this package imports from api/. Nothing in db/ imports from here.
package tamagotchi

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/models"
)

// ─── Service ──────────────────────────────────────────────────────────────────

// Service holds the database pool and exposes all Tamagotchi operations.
// Instantiate once in main.go and pass to the API handlers.
type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

// FeedResult describes what changed after a feed action.
// The API handler uses this to decide what to include in the response
// and whether to send push notifications.
type FeedResult struct {
	Tamagotchi  *models.Tamagotchi
	XPGained    int
	HPGained    int
	WokeUp      bool // was sleeping → now awake
	LeveledUp   bool
	OldLevel    int
	NewLevel    int
	MoodChanged bool
	OldMood     models.TamagotchiMood
	NewMood     models.TamagotchiMood
}

// Feed is called whenever the controller (partner) sends a photo or drawing.
// It finds the Tamagotchi controlled by controllerID, applies rewards,
// handles wake-up logic, checks for level-up, and persists everything.
func (s *Service) Feed(
	ctx context.Context,
	controllerID uuid.UUID,
	contentType models.ContentType,
) (*FeedResult, error) {
	tama, err := db.GetTamagotchiByController(ctx, s.pool, controllerID)
	if err != nil {
		return nil, fmt.Errorf("feed: get tamagotchi: %w", err)
	}
	if tama == nil {
		// No tamagotchi yet — couple may not be active
		return nil, nil
	}

	xpGain, hpGain := Reward(contentType)
	oldLevel := tama.Level
	oldMood := tama.Mood
	wokeUp := false

	// Wake-up bonus: sleeping tamagotchi gets extra HP on first feed
	if ShouldWakeUp(tama) {
		hpGain += WakeUpHP
		wokeUp = true
	}

	// Apply rewards
	newXP := tama.XP + xpGain
	newMaxHealth := MaxHealthForLevel(XPToLevel(newXP)) // level may change
	newHP := min(tama.Health+hpGain, newMaxHealth)
	newLevel := XPToLevel(newXP)
	newMood := MoodFromHealth(newHP, newMaxHealth)
	now := time.Now().UTC()

	// Persist
	if err := db.UpdateTamagotchiState(ctx, s.pool, db.TamagotchiUpdate{
		ID:        tama.ID,
		XP:        newXP,
		Health:    newHP,
		MaxHealth: newMaxHealth,
		Level:     newLevel,
		Mood:      newMood,
		LastFedAt: now,
	}); err != nil {
		return nil, fmt.Errorf("feed: update state: %w", err)
	}

	// Log events
	meta := map[string]any{"content_type": string(contentType)}
	if wokeUp {
		meta["woke_up"] = true
		_ = db.LogEvent(ctx, s.pool, &models.TamagotchiEvent{
			TamagotchiID: tama.ID,
			Type:         models.EventWokeUp,
			HealthDelta:  WakeUpHP,
		})
	}

	_ = db.LogEvent(ctx, s.pool, &models.TamagotchiEvent{
		TamagotchiID: tama.ID,
		Type:         models.EventFed,
		XPDelta:      xpGain,
		HealthDelta:  hpGain,
		Metadata:     meta,
	})

	if newLevel > oldLevel {
		_ = db.LogEvent(ctx, s.pool, &models.TamagotchiEvent{
			TamagotchiID: tama.ID,
			Type:         models.EventLeveledUp,
			Metadata:     map[string]any{"old_level": oldLevel, "new_level": newLevel},
		})
	}

	if newMood != oldMood {
		_ = db.LogEvent(ctx, s.pool, &models.TamagotchiEvent{
			TamagotchiID: tama.ID,
			Type:         models.EventMoodChanged,
			Metadata:     map[string]any{"old_mood": string(oldMood), "new_mood": string(newMood)},
		})
	}

	// Refresh tama struct with new values
	tama.XP = newXP
	tama.Health = newHP
	tama.MaxHealth = newMaxHealth
	tama.Level = newLevel
	tama.Mood = newMood
	tama.LastFedAt = &now

	return &FeedResult{
		Tamagotchi:  tama,
		XPGained:    xpGain,
		HPGained:    hpGain,
		WokeUp:      wokeUp,
		LeveledUp:   newLevel > oldLevel,
		OldLevel:    oldLevel,
		NewLevel:    newLevel,
		MoodChanged: newMood != oldMood,
		OldMood:     oldMood,
		NewMood:     newMood,
	}, nil
}

// ─── Decay ────────────────────────────────────────────────────────────────────

// DecayResult describes a single tamagotchi's decay outcome.
type DecayResult struct {
	TamagotchiID uuid.UUID
	HealthBefore int
	HealthAfter  int
	FellAsleep   bool // crossed the sleeping threshold this tick
}

// ApplyDecay reduces HP for all tamagotchis not fed within DecayInterval.
// Called by the background goroutine in main.go every 12 hours.
func (s *Service) ApplyDecay(ctx context.Context) ([]DecayResult, error) {
	all, err := db.GetAllTamagotchis(ctx, s.pool)
	if err != nil {
		return nil, fmt.Errorf("decay: list tamagotchis: %w", err)
	}

	var results []DecayResult
	for _, tama := range all {
		if tama.Health <= 0 {
			continue // already asleep, nothing to do
		}
		if !NeedsDecay(tama.LastFedAt) {
			continue // fed recently, skip
		}

		newHP := max(tama.Health-DecayHP, 0)
		newMood := MoodFromHealth(newHP, tama.MaxHealth)
		fellAsleep := newHP == 0 && tama.Health > 0

		if err := db.UpdateTamagotchiState(ctx, s.pool, db.TamagotchiUpdate{
			ID:        tama.ID,
			XP:        tama.XP,
			Health:    newHP,
			MaxHealth: tama.MaxHealth,
			Level:     tama.Level,
			Mood:      newMood,
			LastFedAt: *tama.LastFedAt, // unchanged
		}); err != nil {
			continue
		}

		eventType := models.EventDecay
		if fellAsleep {
			eventType = models.EventSleeping
		}
		_ = db.LogEvent(ctx, s.pool, &models.TamagotchiEvent{
			TamagotchiID: tama.ID,
			Type:         eventType,
			HealthDelta:  -DecayHP,
			Metadata:     map[string]any{"health_after": newHP},
		})

		results = append(results, DecayResult{
			TamagotchiID: tama.ID,
			HealthBefore: tama.Health,
			HealthAfter:  newHP,
			FellAsleep:   fellAsleep,
		})
	}
	return results, nil
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

// BuyResult is returned from BuyItem.
type BuyResult struct {
	Item        *models.TamagotchiItem
	XPRemaining int
}

// BuyItem purchases a shop item for the tamagotchi controlled by controllerID.
// Business rules enforced here:
//   - Must have enough XP
//   - Must meet level requirement
//   - Must not already own the item
func (s *Service) BuyItem(
	ctx context.Context,
	controllerID uuid.UUID,
	itemID uuid.UUID,
) (*BuyResult, error) {
	tama, err := db.GetTamagotchiByController(ctx, s.pool, controllerID)
	if err != nil || tama == nil {
		return nil, fmt.Errorf("buy: tamagotchi not found")
	}

	item, err := db.GetShopItem(ctx, s.pool, itemID)
	if err != nil || item == nil {
		return nil, fmt.Errorf("buy: item not found")
	}

	if tama.Level < item.UnlocksAtLevel {
		return nil, fmt.Errorf("buy: requires level %d (tamagotchi is level %d)",
			item.UnlocksAtLevel, tama.Level)
	}
	if tama.XP < item.XPCost {
		return nil, fmt.Errorf("buy: not enough XP (need %d, have %d)",
			item.XPCost, tama.XP)
	}

	// Delegate atomic transaction to DB layer
	if err := db.BuyItem(ctx, s.pool, tama.ID, itemID); err != nil {
		return nil, fmt.Errorf("buy: %w", err)
	}

	return &BuyResult{
		Item:        item,
		XPRemaining: tama.XP - item.XPCost,
	}, nil
}

// ─── Equip ────────────────────────────────────────────────────────────────────

// EquipItem equips an owned item to a slot on the tamagotchi controlled by controllerID.
func (s *Service) EquipItem(
	ctx context.Context,
	controllerID uuid.UUID,
	itemID uuid.UUID,
	slot models.EquippedSlot,
) error {
	tama, err := db.GetTamagotchiByController(ctx, s.pool, controllerID)
	if err != nil || tama == nil {
		return fmt.Errorf("equip: tamagotchi not found")
	}
	return db.EquipItem(ctx, s.pool, tama.ID, itemID, slot)
}

// ─── Read ─────────────────────────────────────────────────────────────────────

// GetMyState returns the full state of the tamagotchi OWNED by userID.
// This is the creature on the user's own frame.
func (s *Service) GetMyState(ctx context.Context, ownerID uuid.UUID) (*models.TamagotchiState, error) {
	tama, err := db.GetTamagotchiByOwner(ctx, s.pool, ownerID)
	if err != nil || tama == nil {
		return nil, err
	}
	return db.GetTamagotchiState(ctx, s.pool, tama.ID)
}

// GetPartnerState returns the full state of the tamagotchi CONTROLLED by userID.
// This is the partner's creature that the user keeps alive.
func (s *Service) GetPartnerState(ctx context.Context, controllerID uuid.UUID) (*models.TamagotchiState, error) {
	tama, err := db.GetTamagotchiByController(ctx, s.pool, controllerID)
	if err != nil || tama == nil {
		return nil, err
	}
	return db.GetTamagotchiState(ctx, s.pool, tama.ID)
}

// GetShop returns items available for purchase for the tamagotchi
// controlled by controllerID, filtered by the tamagotchi's level.
func (s *Service) GetShop(ctx context.Context, controllerID uuid.UUID) (map[string]any, error) {
	tama, err := db.GetTamagotchiByController(ctx, s.pool, controllerID)
	if err != nil || tama == nil {
		return nil, fmt.Errorf("shop: tamagotchi not found")
	}
	items, err := db.ListShopItems(ctx, s.pool, tama.ID, tama.Level)
	if err != nil {
		return nil, err
	}
	currentFloor, nextFloor := XPForNextLevel(tama.Level)
	return map[string]any{
		"tamagotchi_id":    tama.ID,
		"tamagotchi_xp":   tama.XP,
		"tamagotchi_level": tama.Level,
		"xp_this_level":   tama.XP - currentFloor,
		"xp_next_level":   nextFloor - currentFloor,
		"items":           items,
	}, nil
}

// GetFramePayload builds the compact Tamagotchi payload for the ESP32 poll response.
func (s *Service) GetFramePayload(ctx context.Context, ownerID uuid.UUID) (*models.FrameTamagotchi, error) {
	return db.GetFrameTamagotchi(ctx, s.pool, ownerID)
}

// GetEvents returns recent events for both the user's own and controlled tamagotchi.
func (s *Service) GetEvents(ctx context.Context, userID uuid.UUID) (map[string]any, error) {
	type eventSet struct {
		TamagotchiID string                   `json:"tamagotchi_id"`
		Role         string                   `json:"role"` // "mine" | "partner"
		Events       []models.TamagotchiEvent `json:"events"`
	}

	var sets []eventSet

	if mine, _ := db.GetTamagotchiByOwner(ctx, s.pool, userID); mine != nil {
		events, _ := db.GetRecentEvents(ctx, s.pool, mine.ID, 15)
		sets = append(sets, eventSet{TamagotchiID: mine.ID.String(), Role: "mine", Events: events})
	}
	if partner, _ := db.GetTamagotchiByController(ctx, s.pool, userID); partner != nil {
		events, _ := db.GetRecentEvents(ctx, s.pool, partner.ID, 15)
		sets = append(sets, eventSet{TamagotchiID: partner.ID.String(), Role: "partner", Events: events})
	}

	return map[string]any{"event_sets": sets}, nil
}

// Rename changes the name of the tamagotchi owned by ownerID.
func (s *Service) Rename(ctx context.Context, ownerID uuid.UUID, name string) (*models.Tamagotchi, error) {
	tama, err := db.GetTamagotchiByOwner(ctx, s.pool, ownerID)
	if err != nil || tama == nil {
		return nil, fmt.Errorf("rename: tamagotchi not found")
	}
	if err := db.RenameTamagotchi(ctx, s.pool, tama.ID, name); err != nil {
		return nil, err
	}
	tama.Name = name
	return tama, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}