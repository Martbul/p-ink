package models

import (
	"time"

	"github.com/google/uuid"
)

// ─── User ─────────────────────────────────────────────────────────────────────

type User struct {
	ID        uuid.UUID `json:"id"`
	ClerkID   string    `json:"clerk_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// ─── Couple ───────────────────────────────────────────────────────────────────

type CoupleStatus string

const (
	CoupleStatusPending CoupleStatus = "pending"
	CoupleStatusActive  CoupleStatus = "active"
)

type Couple struct {
	ID        uuid.UUID    `json:"id"`
	UserAID   uuid.UUID    `json:"user_a_id"`
	UserBID   *uuid.UUID   `json:"user_b_id,omitempty"`
	Status    CoupleStatus `json:"status"`
	Timezone  string       `json:"timezone"`
	CreatedAt time.Time    `json:"created_at"`
}

// ─── InviteToken ──────────────────────────────────────────────────────────────

type InviteToken struct {
	Token     string     `json:"token"`
	CoupleID  uuid.UUID  `json:"couple_id"`
	CreatedBy uuid.UUID  `json:"created_by"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	UsedBy    *uuid.UUID `json:"used_by,omitempty"`
}

// ─── Device ───────────────────────────────────────────────────────────────────

type Device struct {
	ID         uuid.UUID  `json:"id"`
	OwnerID    uuid.UUID  `json:"owner_id"`
	CoupleID   *uuid.UUID `json:"couple_id,omitempty"`
	MacAddress string     `json:"mac_address"`
	Label      *string    `json:"label,omitempty"`
	LastSeen   *time.Time `json:"last_seen,omitempty"`
	Firmware   *string    `json:"firmware,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ─── Content ──────────────────────────────────────────────────────────────────

type ContentType string

const (
	ContentTypePhoto   ContentType = "photo"
	ContentTypeMessage ContentType = "message"
	ContentTypeDrawing ContentType = "drawing"
)

type ContentStatus string

const (
	ContentStatusQueued    ContentStatus = "queued"
	ContentStatusDisplayed ContentStatus = "displayed"
	ContentStatusArchived  ContentStatus = "archived"
)

type Content struct {
	ID          uuid.UUID     `json:"id"`
	CoupleID    uuid.UUID     `json:"couple_id"`
	SentBy      uuid.UUID     `json:"sent_by"`
	SentTo      uuid.UUID     `json:"sent_to"`
	Type        ContentType   `json:"type"`
	StorageKey  *string       `json:"storage_key,omitempty"`
	MessageText *string       `json:"message_text,omitempty"`
	Caption     *string       `json:"caption,omitempty"`
	Status      ContentStatus `json:"status"`
	DisplayedAt *time.Time    `json:"displayed_at,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
}

// ─── FrameState ───────────────────────────────────────────────────────────────

type FrameState struct {
	DeviceID   uuid.UUID  `json:"device_id"`
	ContentID  *uuid.UUID `json:"content_id,omitempty"`
	ImageURL   string     `json:"image_url"`
	ImageHash  string     `json:"image_hash"`
	ComposedAt time.Time  `json:"composed_at"`
	ExpiresAt  time.Time  `json:"expires_at"`
}

// ─── PushSubscription ─────────────────────────────────────────────────────────

type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	CreatedAt time.Time `json:"created_at"`
}

// ─── Tamagotchi ───────────────────────────────────────────────────────────────

type TamagotchiSpecies string

const (
	SpeciesBear  TamagotchiSpecies = "bear"
	SpeciesCat   TamagotchiSpecies = "cat"
	SpeciesBunny TamagotchiSpecies = "bunny"
	SpeciesGhost TamagotchiSpecies = "ghost"
	SpeciesPlant TamagotchiSpecies = "plant"
)

type TamagotchiMood string

const (
	MoodHappy   TamagotchiMood = "happy"
	MoodNeutral TamagotchiMood = "neutral"
	MoodSad     TamagotchiMood = "sad"
	MoodSleeping TamagotchiMood = "sleeping"
	MoodExcited TamagotchiMood = "excited"
)

type Tamagotchi struct {
	ID           uuid.UUID         `json:"id"`
	CoupleID     uuid.UUID         `json:"couple_id"`
	OwnerID      uuid.UUID         `json:"owner_id"`
	ControllerID uuid.UUID         `json:"controller_id"`
	Name         string            `json:"name"`
	Species      TamagotchiSpecies `json:"species"`
	Health       int               `json:"health"`
	MaxHealth    int               `json:"max_health"`
	XP           int               `json:"xp"`
	Level        int               `json:"level"`
	Mood         TamagotchiMood    `json:"mood"`
	LastFedAt    *time.Time        `json:"last_fed_at,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
}

// ─── Shop Item ────────────────────────────────────────────────────────────────

type ItemType string

const (
	ItemTypeOutfit     ItemType = "outfit"
	ItemTypeAccessory  ItemType = "accessory"
	ItemTypeBackground ItemType = "background"
	ItemTypeAnimation  ItemType = "animation"
	ItemTypePosition   ItemType = "position"
)

type TamagotchiItem struct {
	ID             uuid.UUID `json:"id"`
	Type           ItemType  `json:"type"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	XPCost         int       `json:"xp_cost"`
	PreviewURL     *string   `json:"preview_url,omitempty"`
	SpeciesLock    *string   `json:"species_lock,omitempty"`
	UnlocksAtLevel int       `json:"unlocks_at_level"`
}

// ─── Inventory ────────────────────────────────────────────────────────────────

type TamagotchiInventoryEntry struct {
	ID           uuid.UUID      `json:"id"`
	TamagotchiID uuid.UUID      `json:"tamagotchi_id"`
	Item         TamagotchiItem `json:"item"`
	PurchasedAt  time.Time      `json:"purchased_at"`
}

// ─── Equipped ─────────────────────────────────────────────────────────────────

type EquippedSlot string

const (
	SlotOutfit     EquippedSlot = "outfit"
	SlotAccessory  EquippedSlot = "accessory"
	SlotBackground EquippedSlot = "background"
	SlotPosition   EquippedSlot = "position"
)

type TamagotchiEquipped struct {
	TamagotchiID uuid.UUID    `json:"tamagotchi_id"`
	Slot         EquippedSlot `json:"slot"`
	Item         TamagotchiItem `json:"item"`
}

// ─── Event ────────────────────────────────────────────────────────────────────

type TamagotchiEventType string

const (
	EventFed           TamagotchiEventType = "fed"
	EventLeveledUp     TamagotchiEventType = "leveled_up"
	EventItemPurchased TamagotchiEventType = "item_purchased"
	EventItemEquipped  TamagotchiEventType = "item_equipped"
	EventMoodChanged   TamagotchiEventType = "mood_changed"
	EventSleeping      TamagotchiEventType = "sleeping"
	EventWokeUp        TamagotchiEventType = "woke_up"
	EventDecay         TamagotchiEventType = "decay"
)

type TamagotchiEvent struct {
	ID           uuid.UUID           `json:"id"`
	TamagotchiID uuid.UUID           `json:"tamagotchi_id"`
	Type         TamagotchiEventType `json:"type"`
	XPDelta      int                 `json:"xp_delta"`
	HealthDelta  int                 `json:"health_delta"`
	Metadata     map[string]any      `json:"metadata,omitempty"`
	CreatedAt    time.Time           `json:"created_at"`
}

// ─── Full Tamagotchi state (API response) ─────────────────────────────────────
// Combines tamagotchi + inventory + equipped in one payload.

type TamagotchiState struct {
	Tamagotchi *Tamagotchi              `json:"tamagotchi"`
	Equipped   []TamagotchiEquipped     `json:"equipped"`
	Inventory  []TamagotchiInventoryEntry `json:"inventory"`
	RecentEvents []TamagotchiEvent      `json:"recent_events"`
}

// ─── Frame Tamagotchi (embedded in PollResponse) ──────────────────────────────

type FrameTamagotchi struct {
	Species    string `json:"species"`
	Mood       string `json:"mood"`
	Health     int    `json:"health"`
	Level      int    `json:"level"`
	Outfit     string `json:"outfit,omitempty"`
	Accessory  string `json:"accessory,omitempty"`
	Background string `json:"background,omitempty"`
	Position   string `json:"position,omitempty"`
}