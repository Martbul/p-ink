package db

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/models"
)

// ─── Read ─────────────────────────────────────────────────────────────────────

// GetSlideshowByUser returns the user's slideshow with all slides, or nil.
func GetSlideshowByUser(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (*models.Slideshow, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, name, mode,
		       slide_duration_ms, transition_ms,
		       repeat, show_caption, show_date, show_progress, manual_advance,
		       night_mode, night_start, night_end,
		       is_active, current_index, last_advanced_at,
		       created_at, updated_at
		FROM slideshows
		WHERE user_id = $1
	`, userID)

	s, err := scanSlideshow(row)
	if err != nil || s == nil {
		return s, err
	}

	s.Slides, err = getSlideshowSlides(ctx, pool, s.ID, userID)
	return s, err
}

// GetSlideshowByID returns a slideshow by primary key (used internally).
func GetSlideshowByID(ctx context.Context, pool *pgxpool.Pool, id uuid.UUID) (*models.Slideshow, error) {
	row := pool.QueryRow(ctx, `
		SELECT id, user_id, name, mode,
		       slide_duration_ms, transition_ms,
		       repeat, show_caption, show_date, show_progress, manual_advance,
		       night_mode, night_start, night_end,
		       is_active, current_index, last_advanced_at,
		       created_at, updated_at
		FROM slideshows
		WHERE id = $1
	`, id)
	s, err := scanSlideshow(row)
	if err != nil || s == nil {
		return s, err
	}
	s.Slides, err = getSlideshowSlides(ctx, pool, s.ID, s.UserID)
	return s, err
}

// ─── Upsert settings ──────────────────────────────────────────────────────────

// UpsertSlideshowSettings creates or updates slideshow config. Returns full row.
func UpsertSlideshowSettings(ctx context.Context, pool *pgxpool.Pool, s *models.Slideshow) (*models.Slideshow, error) {
	row := pool.QueryRow(ctx, `
		INSERT INTO slideshows (
			user_id, name, mode,
			slide_duration_ms, transition_ms,
			repeat, show_caption, show_date, show_progress, manual_advance,
			night_mode, night_start, night_end,
			is_active, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			name              = EXCLUDED.name,
			mode              = EXCLUDED.mode,
			slide_duration_ms = EXCLUDED.slide_duration_ms,
			transition_ms     = EXCLUDED.transition_ms,
			repeat            = EXCLUDED.repeat,
			show_caption      = EXCLUDED.show_caption,
			show_date         = EXCLUDED.show_date,
			show_progress     = EXCLUDED.show_progress,
			manual_advance    = EXCLUDED.manual_advance,
			night_mode        = EXCLUDED.night_mode,
			night_start       = EXCLUDED.night_start,
			night_end         = EXCLUDED.night_end,
			is_active         = EXCLUDED.is_active,
			updated_at        = NOW()
		RETURNING id, user_id, name, mode,
		          slide_duration_ms, transition_ms,
		          repeat, show_caption, show_date, show_progress, manual_advance,
		          night_mode, night_start, night_end,
		          is_active, current_index, last_advanced_at,
		          created_at, updated_at
	`,
		s.UserID, s.Name, s.Mode,
		s.SlideDurationMs, s.TransitionMs,
		s.Repeat, s.ShowCaption, s.ShowDate, s.ShowProgress, s.ManualAdvance,
		s.NightMode, s.NightStart, s.NightEnd,
		s.IsActive,
	)
	saved, err := scanSlideshow(row)
	if err != nil || saved == nil {
		return saved, err
	}
	saved.Slides, err = getSlideshowSlides(ctx, pool, saved.ID, saved.UserID)
	return saved, err
}

// SetSlideshowActive toggles slideshow on/off for a user.
func SetSlideshowActive(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID, active bool) error {
	_, err := pool.Exec(ctx,
		`UPDATE slideshows SET is_active=$1, updated_at=NOW() WHERE user_id=$2`,
		active, userID,
	)
	return err
}

// ─── Slides ───────────────────────────────────────────────────────────────────

// AddSlide appends one slide at the end of the slideshow.
func AddSlide(ctx context.Context, pool *pgxpool.Pool, slideshowID uuid.UUID, slide *models.SlideshowSlide) (*models.SlideshowSlide, error) {
	row := pool.QueryRow(ctx, `
		INSERT INTO slideshow_slides (slideshow_id, position, image_url, image_hash, caption, duration_ms)
		VALUES (
			$1,
			COALESCE((SELECT MAX(position)+1 FROM slideshow_slides WHERE slideshow_id=$1), 0),
			$2, $3, $4, $5
		)
		RETURNING id, slideshow_id, position, image_url, image_hash, caption, duration_ms, added_at
	`, slideshowID, slide.ImageURL, slide.ImageHash, slide.Caption, slide.DurationMs)

	return scanSlide(row)
}

// UpdateSlideCaption updates caption and/or per-slide duration.
func UpdateSlideCaption(ctx context.Context, pool *pgxpool.Pool, slideshowID, slideID uuid.UUID, caption *string, durationMs *int) error {
	_, err := pool.Exec(ctx, `
		UPDATE slideshow_slides
		SET caption     = COALESCE($3, caption),
		    duration_ms = $4
		WHERE id=$1 AND slideshow_id=$2
	`, slideID, slideshowID, caption, durationMs)
	return err
}

// DeleteSlide removes a slide and re-compacts positions.
func DeleteSlide(ctx context.Context, pool *pgxpool.Pool, slideshowID, slideID uuid.UUID) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM slideshow_slides WHERE id=$1 AND slideshow_id=$2`,
		slideID, slideshowID,
	); err != nil {
		return err
	}

	// Re-compact positions: 0,1,2,...
	if _, err := tx.Exec(ctx, `
		UPDATE slideshow_slides dst
		SET position = src.rn - 1
		FROM (
			SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS rn
			FROM   slideshow_slides
			WHERE  slideshow_id = $1
		) src
		WHERE dst.id = src.id
	`, slideshowID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE slideshows SET current_index=0, updated_at=NOW() WHERE id=$1`,
		slideshowID,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ReorderSlides sets positions according to the provided ordered slice of IDs.
func ReorderSlides(ctx context.Context, pool *pgxpool.Pool, slideshowID uuid.UUID, orderedIDs []uuid.UUID) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, id := range orderedIDs {
		if _, err := tx.Exec(ctx,
			`UPDATE slideshow_slides SET position=$1 WHERE id=$2 AND slideshow_id=$3`,
			i, id, slideshowID,
		); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx,
		`UPDATE slideshows SET current_index=0, updated_at=NOW() WHERE id=$1`,
		slideshowID,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ─── Playback state ───────────────────────────────────────────────────────────

// AdvanceSlide increments current_index (wraps if repeat=true). Returns new index.
func AdvanceSlide(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) (int, error) {
	var newIdx int
	err := pool.QueryRow(ctx, `
		UPDATE slideshows
		SET
			current_index = CASE
				WHEN repeat THEN
					(current_index + 1) % GREATEST(
						(SELECT COUNT(*) FROM slideshow_slides WHERE slideshow_id = slideshows.id)::int,
						1
					)
				ELSE
					LEAST(
						current_index + 1,
						GREATEST((SELECT COUNT(*) FROM slideshow_slides WHERE slideshow_id = slideshows.id)::int - 1, 0)
					)
			END,
			last_advanced_at = NOW(),
			updated_at       = NOW()
		WHERE user_id = $1
		RETURNING current_index
	`, userID).Scan(&newIdx)
	return newIdx, err
}

// ─── Reactions ────────────────────────────────────────────────────────────────

// UpsertReaction saves (or updates) a partner's reaction to a slide.
func UpsertReaction(ctx context.Context, pool *pgxpool.Pool, slideID, userID uuid.UUID, emoji string) (*models.SlideshowReaction, error) {
	row := pool.QueryRow(ctx, `
		INSERT INTO slideshow_reactions (slide_id, user_id, emoji)
		VALUES ($1,$2,$3)
		ON CONFLICT (slide_id, user_id) DO UPDATE SET
			emoji      = EXCLUDED.emoji,
			created_at = NOW()
		RETURNING id, slide_id, user_id, emoji, created_at
	`, slideID, userID, emoji)

	var rx models.SlideshowReaction
	if err := row.Scan(&rx.ID, &rx.SlideID, &rx.UserID, &rx.Emoji, &rx.CreatedAt); err != nil {
		return nil, err
	}

	// If manual_advance mode — advance the slide when partner reacts
	_, _ = pool.Exec(ctx, `
		UPDATE slideshows ss
		SET current_index    = (current_index + 1) % GREATEST(
		                          (SELECT COUNT(*) FROM slideshow_slides WHERE slideshow_id = ss.id)::int, 1),
		    last_advanced_at = NOW(),
		    updated_at       = NOW()
		WHERE manual_advance = TRUE
		  AND id = (SELECT slideshow_id FROM slideshow_slides WHERE id = $1)
	`, slideID)

	return &rx, nil
}

// DeleteReaction removes a reaction.
func DeleteReaction(ctx context.Context, pool *pgxpool.Pool, slideID, userID uuid.UUID) error {
	_, err := pool.Exec(ctx,
		`DELETE FROM slideshow_reactions WHERE slide_id=$1 AND user_id=$2`,
		slideID, userID,
	)
	return err
}

// ─── Frame helper ─────────────────────────────────────────────────────────────

// GetFrameSlideshow returns the compact payload for the frame poll, or nil if inactive.
func GetFrameSlideshow(ctx context.Context, pool *pgxpool.Pool, ownerID uuid.UUID) (*models.FrameSlideshow, error) {
	s, err := GetSlideshowByUser(ctx, pool, ownerID)
	if err != nil || s == nil || !s.IsActive || len(s.Slides) == 0 {
		return nil, err
	}

	fs := &models.FrameSlideshow{
		IsActive:        true,
		Mode:            s.Mode,
		SlideDurationMs: s.SlideDurationMs,
		TransitionMs:    s.TransitionMs,
		Repeat:          s.Repeat,
		ShowCaption:     s.ShowCaption,
		ShowDate:        s.ShowDate,
		ShowProgress:    s.ShowProgress,
		ManualAdvance:   s.ManualAdvance,
		NightMode:       s.NightMode,
		NightStart:      s.NightStart,
		NightEnd:        s.NightEnd,
		CurrentIndex:    s.CurrentIndex,
		TotalSlides:     len(s.Slides),
	}
	for _, sl := range s.Slides {
		fs.Slides = append(fs.Slides, models.FrameSlide{
			ImageURL:   sl.ImageURL,
			ImageHash:  sl.ImageHash,
			Caption:    sl.Caption,
			DurationMs: sl.DurationMs,
		})
	}
	return fs, nil
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

func scanSlideshow(row pgx.Row) (*models.Slideshow, error) {
	var s models.Slideshow
	var lastAdv *time.Time
	var createdAt, updatedAt time.Time

	err := row.Scan(
		&s.ID, &s.UserID, &s.Name, &s.Mode,
		&s.SlideDurationMs, &s.TransitionMs,
		&s.Repeat, &s.ShowCaption, &s.ShowDate, &s.ShowProgress, &s.ManualAdvance,
		&s.NightMode, &s.NightStart, &s.NightEnd,
		&s.IsActive, &s.CurrentIndex, &lastAdv,
		&createdAt, &updatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.LastAdvancedAt = lastAdv
	s.CreatedAt = createdAt
	s.UpdatedAt = updatedAt
	return &s, nil
}

func scanSlide(row pgx.Row) (*models.SlideshowSlide, error) {
	var sl models.SlideshowSlide
	err := row.Scan(
		&sl.ID, &sl.SlideshowID, &sl.Position,
		&sl.ImageURL, &sl.ImageHash, &sl.Caption, &sl.DurationMs, &sl.AddedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &sl, err
}

func getSlideshowSlides(ctx context.Context, pool *pgxpool.Pool, slideshowID, userID uuid.UUID) ([]models.SlideshowSlide, error) {
	rows, err := pool.Query(ctx, `
		SELECT
			ss.id, ss.slideshow_id, ss.position,
			ss.image_url, ss.image_hash, ss.caption, ss.duration_ms, ss.added_at,
			COUNT(sr.id)                                                    AS reaction_count,
			COALESCE(MAX(CASE WHEN sr.user_id=$2 THEN sr.emoji END), '')    AS my_reaction
		FROM slideshow_slides ss
		LEFT JOIN slideshow_reactions sr ON sr.slide_id = ss.id
		WHERE ss.slideshow_id = $1
		GROUP BY ss.id
		ORDER BY ss.position ASC
	`, slideshowID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slides []models.SlideshowSlide
	for rows.Next() {
		var sl models.SlideshowSlide
		if err := rows.Scan(
			&sl.ID, &sl.SlideshowID, &sl.Position,
			&sl.ImageURL, &sl.ImageHash, &sl.Caption, &sl.DurationMs, &sl.AddedAt,
			&sl.ReactionCount, &sl.MyReaction,
		); err != nil {
			return nil, err
		}
		slides = append(slides, sl)
	}
	return slides, rows.Err()
}