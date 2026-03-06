package db

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AppearanceUpdate struct {
	ID         uuid.UUID
	Species    *string
	Background *string
	Animation  *string
	Position   *string
}

func UpdateTamagotchiAppearance(ctx context.Context, pool *pgxpool.Pool, u AppearanceUpdate) error {
	setClauses := []string{}
	args := []any{}
	argIdx := 1

	if u.Species != nil {
		setClauses = append(setClauses, "species = $"+itoa(argIdx))
		args = append(args, *u.Species)
		argIdx++
	}
	if u.Background != nil {
		setClauses = append(setClauses, "background = $"+itoa(argIdx))
		args = append(args, *u.Background)
		argIdx++
	}
	if u.Animation != nil {
		setClauses = append(setClauses, "animation = $"+itoa(argIdx))
		args = append(args, *u.Animation)
		argIdx++
	}
	if u.Position != nil {
		setClauses = append(setClauses, "position = $"+itoa(argIdx))
		args = append(args, *u.Position)
		argIdx++
	}

	if len(setClauses) == 0 {
		return nil // nothing to update
	}

	args = append(args, u.ID)
	query := "UPDATE tamagotchis SET " + strings.Join(setClauses, ", ") +
		" WHERE id = $" + itoa(argIdx)

	_, err := pool.Exec(ctx, query, args...)
	return err
}

func itoa(n int) string {
	const digits = "0123456789"
	if n < 10 {
		return string(digits[n])
	}
	return string(digits[n/10]) + string(digits[n%10])
}

//! The SELECT queries in GetTamagotchiByOwner, GetTamagotchiByController,
// GetTamagotchiByID, and GetAllTamagotchis must also be updated to include
// background, animation, position in their column list (see queries below).


// ─── Updated SELECT template ──────────────────────────────────────────────────
// Replace the SELECT in GetTamagotchiByOwner / ByController / ByID /
// GetAllTamagotchis with this column list:
//
//   SELECT id, couple_id, owner_id, controller_id, name, species,
//          background, animation, position,
//          health, max_health, xp, level, mood, last_fed_at, created_at
//   FROM tamagotchis WHERE ...