package tamagotchi

import "github.com/martbul/p-ink/internal/models"

// ─── Reward amounts ───────────────────────────────────────────────────────────
// These are the only place in the codebase that defines how much XP/HP
// a content action is worth. Change here, affects everything.

const (
	XPForPhoto   = 50
	XPForDrawing = 35
	XPForMessage = 10
	XPBothToday  = 20 // bonus when both partners reply on the same calendar day

	HPForPhoto   = 25
	HPForDrawing = 20
	HPForMessage = 5

	// How much HP is lost per decay tick when the tamagotchi hasn't been fed.
	DecayHP = 10
)

// Reward returns the XP and HP gain for a given content type.
func Reward(contentType models.ContentType) (xp, hp int) {
	switch contentType {
	case models.ContentTypePhoto:
		return XPForPhoto, HPForPhoto
	case models.ContentTypeDrawing:
		return XPForDrawing, HPForDrawing
	default:
		// message and any future types
		return XPForMessage, HPForMessage
	}
}

// ─── Level thresholds ─────────────────────────────────────────────────────────
// Each entry is the minimum cumulative XP required to reach that level.
// Add more entries here to extend the level cap.

var levelThresholds = []struct {
	Level int
	XP    int
}{
	{1, 0},
	{2, 200},
	{3, 500},
	{4, 1000},
	{5, 2000},
	{6, 3500},
	{7, 5500},
	{8, 8000},
	{9, 11000},
	{10, 15000},
}

// XPToLevel returns the level a tamagotchi should be at for the given XP total.
func XPToLevel(xp int) int {
	level := 1
	for _, t := range levelThresholds {
		if xp >= t.XP {
			level = t.Level
		}
	}
	return level
}

// XPForNextLevel returns how much total XP is needed for the next level,
// and how much XP the current level started at. Returns (0, 0) at max level.
func XPForNextLevel(currentLevel int) (currentFloor, nextFloor int) {
	for i, t := range levelThresholds {
		if t.Level == currentLevel {
			if i+1 < len(levelThresholds) {
				return t.XP, levelThresholds[i+1].XP
			}
			return t.XP, t.XP // max level
		}
	}
	return 0, levelThresholds[1].XP
}

// MaxHealthForLevel returns the HP cap at a given level.
// Each level adds 5 to the base 100 HP cap.
func MaxHealthForLevel(level int) int {
	return 100 + (level-1)*5
}