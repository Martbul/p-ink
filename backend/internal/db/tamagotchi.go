package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/models"
)

// ─── XP reward table ──────────────────────────────────────────────────────────

const (
	XPForPhoto   = 50
	XPForDrawing = 35
	XPForMessage = 10
	XPBothToday  = 20 // bonus when both partners reply same calendar day

	HPForPhoto   = 25
	HPForDrawing = 20
	HPForMessage = 5

	DecayHP       = 10 // HP lost per decay tick (every 12h without feeding)
	DecayInterval = 12 * time.Hour
)

// levelThresholds maps level → min XP required.
var levelThresholds = []struct {
	Level int
	XP    int
}{
	{1, 0}, {2, 200}, {3, 500}, {4, 1000}, {5, 2000},
	{6, 3500}, {7, 5500}, {8, 8000}, {9, 11000}, {10, 15000},
}

func xpToLevel(xp int) int {
	level := 1
	for _, t := range levelThresholds {
		if xp >= t.XP {
			level = t.Level
		}
	}
	return level
}

// ─── Create ───────────────────────────────────────────────────────────────────

// CreateTamagotchisForCouple creates both Tamagotchis when a couple activates.
// owner A → controller B, owner B → controller A.
func CreateTamagotchisForCouple(
	ctx context.Context, pool *pgxpool.Pool,
	coupleID, userAID, userBID uuid.UUID,
) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO tamagotchis (couple_id, owner_id, controller_id)
		VALUES ($1, $2, $3), ($1, $3, $2)
		ON CONFLICT (couple_id, owner_id) DO NOTHING
	`, coupleID, userAID, userBID)
	return err
}

// ─── Get ──────────────────────────────────────────────────────────────────────

// GetTamagotchiByOwner returns the Tamagotchi owned by userID in their couple.
func GetTamagotchiByOwner(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.Tamagotchi, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, couple_id, owner_id, controller_id, name, species,
		       health, max_health, xp, level, mood, last_fed_at, created_at
		FROM tamagotchis WHERE owner_id = $1
	`, ownerID)
	return scanTamagotchi(row)
}

// GetTamagotchiByController returns the Tamagotchi controlled by userID
// (i.e. the partner's Tamagotchi that this user feeds).
func GetTamagotchiByController(ctx context.Context, pool *pgxpool.Pool, controllerID uuid.UUID) (*models.Tamagotchi, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, couple_id, owner_id, controller_id, name, species,
		       health, max_health, xp, level, mood, last_fed_at, created_at
		FROM tamagotchis WHERE controller_id = $1
	`, controllerID)
	return scanTamagotchi(row)
}

// GetTamagotchiByID fetches by primary key.
func GetTamagotchiByID(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (*models.Tamagotchi, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, couple_id, owner_id, controller_id, name, species,
		       health, max_health, xp, level, mood, last_fed_at, created_at
		FROM tamagotchis WHERE id = $1
	`, id)
	return scanTamagotchi(row)
}

// GetAllTamagotchis returns all tamagotchis — used by the decay job.
func GetAllTamagotchis(ctx context.Context, pool *pgxpool.Pool) ([]*models.Tamagotchi, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, couple_id, owner_id, controller_id, name, species,
		       health, max_health, xp, level, mood, last_fed_at, created_at
		FROM tamagotchis
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*models.Tamagotchi
	for rows.Next() {
		t, err := scanTamagotchi(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

// FeedResult holds what happened after a feed action.
type FeedResult struct {
	Tamagotchi *models.Tamagotchi
	XPGained   int
	HPGained   int
	LeveledUp  bool
	NewLevel   int
}

// Feed awards XP and HP to the Tamagotchi controlled by controllerID.
// contentType determines the reward amounts.
// Returns what changed so the handler can log events and notify the owner.
func Feed(
	ctx context.Context, pool *pgxpool.Pool,
	controllerID uuid.UUID,
	contentType models.ContentType,
) (*FeedResult, error) {
	tama, err := GetTamagotchiByController(ctx, pool, controllerID)
	if err != nil {
		return nil, err
	}
	if tama == nil {
		return nil, fmt.Errorf("no tamagotchi found for controller %s", controllerID)
	}

	xpGain, hpGain := rewardForType(contentType)

	oldLevel := tama.Level
	newXP := tama.XP + xpGain
	newHP := min(tama.Health+hpGain, tama.MaxHealth)
	newLevel := xpToLevel(newXP)

	// Recalculate max_health on level up (each level adds 5 HP cap)
	newMaxHealth := 100 + (newLevel-1)*5

	// Mood based on health %
	newMood := moodFromHealth(newHP, newMaxHealth)

	now := time.Now().UTC()

	_, err = pool.Exec(ctx, `
		UPDATE tamagotchis
		SET xp          = $1,
		    health      = $2,
		    max_health  = $3,
		    level       = $4,
		    mood        = $5,
		    last_fed_at = $6
		WHERE id = $7
	`, newXP, newHP, newMaxHealth, newLevel, string(newMood), now, tama.ID)
	if err != nil {
		return nil, err
	}

	tama.XP = newXP
	tama.Health = newHP
	tama.MaxHealth = newMaxHealth
	tama.Level = newLevel
	tama.Mood = newMood
	tama.LastFedAt = &now

	result := &FeedResult{
		Tamagotchi: tama,
		XPGained:   xpGain,
		HPGained:   hpGain,
		LeveledUp:  newLevel > oldLevel,
		NewLevel:   newLevel,
	}

	// Log fed event
	_ = LogEvent(ctx, pool, &models.TamagotchiEvent{
		TamagotchiID: tama.ID,
		Type:         models.EventFed,
		XPDelta:      xpGain,
		HealthDelta:  hpGain,
		Metadata:     map[string]any{"content_type": string(contentType)},
	})

	// Log level up event separately
	if result.LeveledUp {
		_ = LogEvent(ctx, pool, &models.TamagotchiEvent{
			TamagotchiID: tama.ID,
			Type:         models.EventLeveledUp,
			Metadata:     map[string]any{"new_level": newLevel},
		})
	}

	return result, nil
}

// ─── Decay ────────────────────────────────────────────────────────────────────

// ApplyDecay subtracts HP from tamagotchis not fed within DecayInterval.
// Called by the background goroutine in main.go.
func ApplyDecay(ctx context.Context, pool *pgxpool.Pool) error {
	cutoff := time.Now().UTC().Add(-DecayInterval)

	rows, err := pool.Query(ctx, `
		SELECT id, health, max_health, mood, last_fed_at
		FROM tamagotchis
		WHERE last_fed_at < $1 AND health > 0
	`, cutoff)
	if err != nil {
		return err
	}
	defer rows.Close()

	type decayTarget struct {
		id          uuid.UUID
		health      int
		maxHealth   int
		mood        models.TamagotchiMood
		lastFedAt   *time.Time
	}

	var targets []decayTarget
	for rows.Next() {
		var t decayTarget
		if err := rows.Scan(&t.id, &t.health, &t.maxHealth, &t.mood, &t.lastFedAt); err != nil {
			return err
		}
		targets = append(targets, t)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, t := range targets {
		newHP := max(t.health-DecayHP, 0)
		newMood := moodFromHealth(newHP, t.maxHealth)

		_, err := pool.Exec(ctx, `
			UPDATE tamagotchis SET health = $1, mood = $2 WHERE id = $3
		`, newHP, string(newMood), t.id)
		if err != nil {
			continue
		}

		eventType := models.EventDecay
		if newHP == 0 {
			eventType = models.EventSleeping
		}
		_ = LogEvent(ctx, pool, &models.TamagotchiEvent{
			TamagotchiID: t.id,
			Type:         eventType,
			HealthDelta:  -DecayHP,
			Metadata:     map[string]any{"new_health": newHP},
		})
	}
	return nil
}

// ─── Rename ───────────────────────────────────────────────────────────────────

func RenameTamagotchi(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID, name string) error {
	_, err := pool.Exec(ctx, `UPDATE tamagotchis SET name = $1 WHERE id = $2`, name, id)
	return err
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

// ListShopItems returns items the tamagotchi can buy (filtered by level).
// Already-owned items are excluded.
func ListShopItems(ctx context.Context, pool *pgxpool.Pool, tamaID uuid.UUID, level int) ([]*models.TamagotchiItem, error) {
	rows, err := pool.Query(ctx, `
		SELECT i.id, i.type, i.name, i.description, i.xp_cost,
		       i.preview_url, i.species_lock, i.unlocks_at_level
		FROM tamagotchi_items i
		WHERE i.unlocks_at_level <= $1
		  AND i.id NOT IN (
		      SELECT item_id FROM tamagotchi_inventory WHERE tamagotchi_id = $2
		  )
		ORDER BY i.unlocks_at_level, i.xp_cost
	`, level, tamaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanItems(rows)
}

// BuyItem deducts XP and adds item to inventory.
func BuyItem(ctx context.Context, pool *pgxpool.Pool, tamaID, itemID uuid.UUID) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Fetch item cost + level requirement
	var cost, minLevel int
	err = tx.QueryRow(ctx,
		`SELECT xp_cost, unlocks_at_level FROM tamagotchi_items WHERE id = $1`, itemID,
	).Scan(&cost, &minLevel)
	if err != nil {
		return fmt.Errorf("item not found: %w", err)
	}

	// Fetch tamagotchi XP + level
	var currentXP, currentLevel int
	err = tx.QueryRow(ctx,
		`SELECT xp, level FROM tamagotchis WHERE id = $1`, tamaID,
	).Scan(&currentXP, &currentLevel)
	if err != nil {
		return fmt.Errorf("tamagotchi not found: %w", err)
	}

	if currentLevel < minLevel {
		return fmt.Errorf("requires level %d (you are level %d)", minLevel, currentLevel)
	}
	if currentXP < cost {
		return fmt.Errorf("not enough XP (need %d, have %d)", cost, currentXP)
	}

	// Check not already owned
	var owned bool
	_ = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM tamagotchi_inventory WHERE tamagotchi_id=$1 AND item_id=$2)`,
		tamaID, itemID,
	).Scan(&owned)
	if owned {
		return fmt.Errorf("already owned")
	}

	// Deduct XP
	_, err = tx.Exec(ctx, `UPDATE tamagotchis SET xp = xp - $1 WHERE id = $2`, cost, tamaID)
	if err != nil {
		return err
	}

	// Add to inventory
	_, err = tx.Exec(ctx,
		`INSERT INTO tamagotchi_inventory (tamagotchi_id, item_id) VALUES ($1, $2)`,
		tamaID, itemID,
	)
	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	_ = LogEvent(ctx, pool, &models.TamagotchiEvent{
		TamagotchiID: tamaID,
		Type:         models.EventItemPurchased,
		XPDelta:      -cost,
		Metadata:     map[string]any{"item_id": itemID.String()},
	})
	return nil
}

// ─── Equip ────────────────────────────────────────────────────────────────────

// EquipItem sets an item in an equipment slot (must be owned).
func EquipItem(ctx context.Context, pool *pgxpool.Pool, tamaID, itemID uuid.UUID, slot models.EquippedSlot) error {
	// Verify ownership
	var owned bool
	err := pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM tamagotchi_inventory WHERE tamagotchi_id=$1 AND item_id=$2)`,
		tamaID, itemID,
	).Scan(&owned)
	if err != nil || !owned {
		return fmt.Errorf("item not in inventory")
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO tamagotchi_equipped (tamagotchi_id, slot, item_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (tamagotchi_id, slot) DO UPDATE SET item_id = EXCLUDED.item_id
	`, tamaID, string(slot), itemID)
	if err != nil {
		return err
	}

	_ = LogEvent(ctx, pool, &models.TamagotchiEvent{
		TamagotchiID: tamaID,
		Type:         models.EventItemEquipped,
		Metadata:     map[string]any{"item_id": itemID.String(), "slot": string(slot)},
	})
	return nil
}

// ─── Inventory ────────────────────────────────────────────────────────────────

func GetInventory(ctx context.Context, pool *pgxpool.Pool, tamaID uuid.UUID) ([]models.TamagotchiInventoryEntry, error) {
	rows, err := pool.Query(ctx, `
		SELECT inv.id, inv.tamagotchi_id, inv.purchased_at,
		       i.id, i.type, i.name, i.description, i.xp_cost,
		       i.preview_url, i.species_lock, i.unlocks_at_level
		FROM tamagotchi_inventory inv
		JOIN tamagotchi_items i ON i.id = inv.item_id
		WHERE inv.tamagotchi_id = $1
		ORDER BY inv.purchased_at DESC
	`, tamaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.TamagotchiInventoryEntry
	for rows.Next() {
		var e models.TamagotchiInventoryEntry
		err := rows.Scan(
			&e.ID, &e.TamagotchiID, &e.PurchasedAt,
			&e.Item.ID, &e.Item.Type, &e.Item.Name, &e.Item.Description,
			&e.Item.XPCost, &e.Item.PreviewURL, &e.Item.SpeciesLock, &e.Item.UnlocksAtLevel,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ─── Equipped ─────────────────────────────────────────────────────────────────

func GetEquipped(ctx context.Context, pool *pgxpool.Pool, tamaID uuid.UUID) ([]models.TamagotchiEquipped, error) {
	rows, err := pool.Query(ctx, `
		SELECT eq.tamagotchi_id, eq.slot,
		       i.id, i.type, i.name, i.description, i.xp_cost,
		       i.preview_url, i.species_lock, i.unlocks_at_level
		FROM tamagotchi_equipped eq
		JOIN tamagotchi_items i ON i.id = eq.item_id
		WHERE eq.tamagotchi_id = $1
	`, tamaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.TamagotchiEquipped
	for rows.Next() {
		var e models.TamagotchiEquipped
		err := rows.Scan(
			&e.TamagotchiID, &e.Slot,
			&e.Item.ID, &e.Item.Type, &e.Item.Name, &e.Item.Description,
			&e.Item.XPCost, &e.Item.PreviewURL, &e.Item.SpeciesLock, &e.Item.UnlocksAtLevel,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ─── Events ───────────────────────────────────────────────────────────────────

func LogEvent(ctx context.Context, pool *pgxpool.Pool, event *models.TamagotchiEvent) error {
	meta, _ := json.Marshal(event.Metadata)
	_, err := pool.Exec(ctx, `
		INSERT INTO tamagotchi_events (tamagotchi_id, type, xp_delta, health_delta, metadata)
		VALUES ($1, $2, $3, $4, $5)
	`, event.TamagotchiID, string(event.Type), event.XPDelta, event.HealthDelta, meta)
	return err
}

func GetRecentEvents(ctx context.Context, pool *pgxpool.Pool, tamaID uuid.UUID, limit int) ([]models.TamagotchiEvent, error) {
	rows, err := pool.Query(ctx, `
		SELECT id, tamagotchi_id, type, xp_delta, health_delta, metadata, created_at
		FROM tamagotchi_events
		WHERE tamagotchi_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, tamaID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.TamagotchiEvent
	for rows.Next() {
		var e models.TamagotchiEvent
		var metaRaw []byte
		err := rows.Scan(&e.ID, &e.TamagotchiID, &e.Type, &e.XPDelta, &e.HealthDelta, &metaRaw, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		if metaRaw != nil {
			_ = json.Unmarshal(metaRaw, &e.Metadata)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ─── Full state ───────────────────────────────────────────────────────────────

// GetTamagotchiState returns the full state for a Tamagotchi (for the app).
func GetTamagotchiState(ctx context.Context, pool *pgxpool.Pool, tamaID uuid.UUID) (*models.TamagotchiState, error) {
	tama, err := GetTamagotchiByID(ctx, pool, tamaID)
	if err != nil || tama == nil {
		return nil, err
	}
	equipped, err := GetEquipped(ctx, pool, tamaID)
	if err != nil {
		return nil, err
	}
	inventory, err := GetInventory(ctx, pool, tamaID)
	if err != nil {
		return nil, err
	}
	events, err := GetRecentEvents(ctx, pool, tamaID, 20)
	if err != nil {
		return nil, err
	}
	return &models.TamagotchiState{
		Tamagotchi:   tama,
		Equipped:     equipped,
		Inventory:    inventory,
		RecentEvents: events,
	}, nil
}

// ─── Frame payload ────────────────────────────────────────────────────────────

// GetFrameTamagotchi builds the compact payload sent in PollResponse.
// deviceOwnerID is whose frame we're building for — we return THEIR Tamagotchi.
func GetFrameTamagotchi(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.FrameTamagotchi, error) {
	tama, err := GetTamagotchiByOwner(ctx, pool, ownerID)
	if err != nil || tama == nil {
		return nil, err
	}
	equipped, err := GetEquipped(ctx, pool, tama.ID)
	if err != nil {
		return nil, err
	}

	ft := &models.FrameTamagotchi{
		Species:  string(tama.Species),
		Mood:     string(tama.Mood),
		Health:   tama.Health,
		Level:    tama.Level,
		Position: "bottom_right", // default
	}
	for _, e := range equipped {
		switch e.Slot {
		case models.SlotOutfit:
			ft.Outfit = e.Item.Name
		case models.SlotAccessory:
			ft.Accessory = e.Item.Name
		case models.SlotBackground:
			ft.Background = e.Item.Name
		case models.SlotPosition:
			ft.Position = e.Item.Name
		}
	}
	return ft, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func rewardForType(ct models.ContentType) (xp, hp int) {
	switch ct {
	case models.ContentTypePhoto:
		return XPForPhoto, HPForPhoto
	case models.ContentTypeDrawing:
		return XPForDrawing, HPForDrawing
	default:
		return XPForMessage, HPForMessage
	}
}

func moodFromHealth(health, maxHealth int) models.TamagotchiMood {
	pct := float64(health) / float64(maxHealth) * 100
	switch {
	case health == 0:
		return models.MoodSleeping
	case pct >= 80:
		return models.MoodHappy
	case pct >= 50:
		return models.MoodNeutral
	case pct >= 20:
		return models.MoodSad
	default:
		return models.MoodSleeping
	}
}

func scanTamagotchi(row pgx.Row) (*models.Tamagotchi, error) {
	var t models.Tamagotchi
	err := row.Scan(
		&t.ID, &t.CoupleID, &t.OwnerID, &t.ControllerID,
		&t.Name, &t.Species, &t.Health, &t.MaxHealth,
		&t.XP, &t.Level, &t.Mood, &t.LastFedAt, &t.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func scanItems(rows pgx.Rows) ([]*models.TamagotchiItem, error) {
	var out []*models.TamagotchiItem
	for rows.Next() {
		var i models.TamagotchiItem
		err := rows.Scan(
			&i.ID, &i.Type, &i.Name, &i.Description, &i.XPCost,
			&i.PreviewURL, &i.SpeciesLock, &i.UnlocksAtLevel,
		)
		if err != nil {
			return nil, err
		}
		out = append(out, &i)
	}
	return out, rows.Err()
}

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