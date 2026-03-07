package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	LocationModeCoordinates = "coordinates"
	LocationModeMapLink     = "map_link"
)

type LocationShare struct {
	UserID    uuid.UUID `json:"user_id"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Accuracy  *float32  `json:"accuracy_m,omitempty"`
	Mode      string    `json:"mode"` // "coordinates" | "map_link"
	UpdatedAt time.Time `json:"updated_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

type FrameLocation struct {
	Lat       float64  `json:"lat"`
	Lng       float64  `json:"lng"`
	Accuracy  *float32 `json:"accuracy_m,omitempty"`
	Mode      string   `json:"mode"`       // "coordinates" | "map_link"
	UpdatedAt string   `json:"updated_at"` // RFC3339 string for easy C++ parsing
}