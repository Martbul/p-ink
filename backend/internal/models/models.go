package models

import (
	"time"

	"github.com/google/uuid"
)


type User struct {
	ID        uuid.UUID `json:"id"`
	ClerkID   string    `json:"clerk_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}


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


type InviteToken struct {
	Token     string     `json:"token"`
	CoupleID  uuid.UUID  `json:"couple_id"`
	CreatedBy uuid.UUID  `json:"created_by"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	UsedBy    *uuid.UUID `json:"used_by,omitempty"`
}


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


type FrameState struct {
	DeviceID   uuid.UUID  `json:"device_id"`
	ContentID  *uuid.UUID `json:"content_id,omitempty"`
	ImageURL   string     `json:"image_url"`
	ImageHash  string     `json:"image_hash"`
	ComposedAt time.Time  `json:"composed_at"`
	ExpiresAt  time.Time  `json:"expires_at"`
}


type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	CreatedAt time.Time `json:"created_at"`
}