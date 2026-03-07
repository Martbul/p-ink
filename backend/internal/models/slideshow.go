package models

import (
	"time"

	"github.com/google/uuid"
)

// SlideshowMode controls how the frame advances through slides.
type SlideshowMode string

const (
	SlideshowModeSequential SlideshowMode = "sequential" // 1→2→3→1
	SlideshowModeShuffle    SlideshowMode = "shuffle"    // random permutation, no dupes until all shown
	SlideshowModeRandom     SlideshowMode = "random"     // fully random, repeats allowed
	SlideshowModeLoopOne    SlideshowMode = "loop-one"   // stay on one slide forever
)

// Slideshow is the user's configured photo slideshow for their partner's frame.
type Slideshow struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`

	// Identity
	Name string `json:"name"`

	// Playback
	Mode            SlideshowMode `json:"mode"`
	SlideDurationMs int           `json:"slide_duration_ms"`
	TransitionMs    int           `json:"transition_ms"`

	// Behaviour
	Repeat        bool `json:"repeat"`
	ShowCaption   bool `json:"show_caption"`
	ShowDate      bool `json:"show_date"`
	ShowProgress  bool `json:"show_progress"`
	ManualAdvance bool `json:"manual_advance"` // partner controls pace via reactions

	// Night mode
	NightMode  bool `json:"night_mode"`
	NightStart int  `json:"night_start"`
	NightEnd   int  `json:"night_end"`

	// State
	IsActive       bool       `json:"is_active"`
	CurrentIndex   int        `json:"current_index"`
	LastAdvancedAt *time.Time `json:"last_advanced_at,omitempty"`

	Slides []SlideshowSlide `json:"slides"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SlideshowSlide is a single photo entry in a slideshow.
type SlideshowSlide struct {
	ID          uuid.UUID  `json:"id"`
	SlideshowID uuid.UUID  `json:"slideshow_id"`
	Position    int        `json:"position"`
	ImageURL    string     `json:"image_url"`
	ImageHash   string     `json:"image_hash"`
	Caption     *string    `json:"caption,omitempty"`
	DurationMs  *int       `json:"duration_ms,omitempty"` // nil = slideshow default
	AddedAt     time.Time  `json:"added_at"`

	// Reaction count (joined when fetching, not a real column)
	ReactionCount int    `json:"reaction_count,omitempty"`
	MyReaction    string `json:"my_reaction,omitempty"` // emoji or "" if none
}

// SlideshowReaction is a partner's reaction to a slide.
type SlideshowReaction struct {
	ID        uuid.UUID `json:"id"`
	SlideID   uuid.UUID `json:"slide_id"`
	UserID    uuid.UUID `json:"user_id"`
	Emoji     string    `json:"emoji"`
	CreatedAt time.Time `json:"created_at"`
}

// ─── Frame-facing compact types ───────────────────────────────────────────────

// FrameSlideshow is the compact payload embedded in PollResponse.
type FrameSlideshow struct {
	IsActive        bool          `json:"is_active"`
	Mode            SlideshowMode `json:"mode"`
	SlideDurationMs int           `json:"slide_duration_ms"`
	TransitionMs    int           `json:"transition_ms"`
	Repeat          bool          `json:"repeat"`
	ShowCaption     bool          `json:"show_caption"`
	ShowDate        bool          `json:"show_date"`
	ShowProgress    bool          `json:"show_progress"`
	ManualAdvance   bool          `json:"manual_advance"`
	NightMode       bool          `json:"night_mode"`
	NightStart      int           `json:"night_start"`
	NightEnd        int           `json:"night_end"`
	CurrentIndex    int           `json:"current_index"`
	TotalSlides     int           `json:"total_slides"`
	Slides          []FrameSlide  `json:"slides"`
}

// FrameSlide is the per-slide data the frame needs.
type FrameSlide struct {
	ImageURL   string  `json:"image_url"`
	ImageHash  string  `json:"image_hash"`
	Caption    *string `json:"caption,omitempty"`
	DurationMs *int    `json:"duration_ms,omitempty"`
}