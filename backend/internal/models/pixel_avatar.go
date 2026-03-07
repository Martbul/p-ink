package models

import (
	"time"

	"github.com/google/uuid"
)

type PixelAvatar struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Pixels    []int     `json:"pixels"`  // flat array, length = width*height, values = palette indices (-1 = transparent)
	Palette   []string  `json:"palette"` // hex strings e.g. "#ff2a6d"
	Width     int       `json:"width"`   // 16 or 32
	Height    int       `json:"height"`  // 16 or 32
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FramePixelAvatar struct {
	Pixels  []int    `json:"pixels"`
	Palette []string `json:"palette"`
	Width   int      `json:"width"`
	Height  int      `json:"height"`
}