package tamagotchi

import (
	"time"

	"github.com/martbul/p-ink/internal/models"
)

// ─── Mood derivation ──────────────────────────────────────────────────────────
// Mood is always derived from health percentage — it is never stored
// independently. This function is the single source of truth.

// MoodFromHealth returns the mood that corresponds to a given health value.
// maxHealth is used to compute the percentage.
func MoodFromHealth(health, maxHealth int) models.TamagotchiMood {
	if maxHealth <= 0 {
		maxHealth = 100
	}
	if health <= 0 {
		return models.MoodSleeping
	}

	pct := float64(health) / float64(maxHealth) * 100

	switch {
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

// ─── Decay eligibility ────────────────────────────────────────────────────────

// DecayInterval is how long a tamagotchi can go without being fed before
// it starts losing health.
const DecayInterval = 12 * time.Hour

// NeedsDecay returns true if the tamagotchi has not been fed within DecayInterval.
func NeedsDecay(lastFedAt *time.Time) bool {
	if lastFedAt == nil {
		return true
	}
	return time.Since(*lastFedAt) > DecayInterval
}

// ─── Wake-up logic ────────────────────────────────────────────────────────────

// IsAsleep returns true if the tamagotchi is in sleeping state.
func IsAsleep(t *models.Tamagotchi) bool {
	return t.Mood == models.MoodSleeping || t.Health <= 0
}

// WakeUpHP is how much health a sleeping tamagotchi gets when the partner
// sends any content after it has fallen asleep.
const WakeUpHP = 15

// ShouldWakeUp returns true if the tamagotchi is asleep and about to be fed.
// When this returns true, the service adds WakeUpHP before the normal reward.
func ShouldWakeUp(t *models.Tamagotchi) bool {
	return IsAsleep(t)
}

// ─── Mood display helpers (used by API response) ──────────────────────────────

// MoodEmoji returns a single emoji representing the mood.
func MoodEmoji(mood models.TamagotchiMood) string {
	switch mood {
	case models.MoodHappy:
		return "😊"
	case models.MoodExcited:
		return "🎉"
	case models.MoodNeutral:
		return "😐"
	case models.MoodSad:
		return "😢"
	case models.MoodSleeping:
		return "😴"
	default:
		return "❓"
	}
}

// MoodMessage returns a short human-readable description for the UI.
func MoodMessage(mood models.TamagotchiMood, name string) string {
	switch mood {
	case models.MoodHappy:
		return name + " is happy and well-fed!"
	case models.MoodExcited:
		return name + " is super excited!"
	case models.MoodNeutral:
		return name + " is doing okay."
	case models.MoodSad:
		return name + " is feeling a bit neglected..."
	case models.MoodSleeping:
		return name + " has fallen asleep. Send a photo to wake them up!"
	default:
		return name + " exists."
	}
}