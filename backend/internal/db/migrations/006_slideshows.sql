CREATE TABLE IF NOT EXISTS slideshows (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    name             TEXT        NOT NULL DEFAULT 'My Slideshow',
    mode             TEXT        NOT NULL DEFAULT 'sequential'
                                 CHECK (mode IN ('sequential','shuffle','random','loop-one')),

    -- timing (ms)
    slide_duration_ms INT        NOT NULL DEFAULT 8000  CHECK (slide_duration_ms  BETWEEN 1000 AND 300000),
    transition_ms     INT        NOT NULL DEFAULT 500   CHECK (transition_ms       BETWEEN 0   AND 5000),

    -- behaviour flags
    repeat           BOOLEAN     NOT NULL DEFAULT TRUE,   -- wrap around after last slide
    show_caption     BOOLEAN     NOT NULL DEFAULT TRUE,   -- overlay caption on frame
    show_date        BOOLEAN     NOT NULL DEFAULT FALSE,  -- show "added on …" under caption
    show_progress    BOOLEAN     NOT NULL DEFAULT TRUE,   -- show dot/bar progress on frame

    -- night mode: dim/invert frame between night_start and night_end hours (local hour 0-23)
    night_mode       BOOLEAN     NOT NULL DEFAULT FALSE,
    night_start      SMALLINT    NOT NULL DEFAULT 22  CHECK (night_start BETWEEN 0 AND 23),
    night_end        SMALLINT    NOT NULL DEFAULT 7   CHECK (night_end   BETWEEN 0 AND 23),

    -- react-to-view: frame only advances when partner "reacts" (taps button)
    -- useful for love-letter mode — partner controls the pace
    manual_advance   BOOLEAN     NOT NULL DEFAULT FALSE,

    -- active state (is the frame currently in slideshow mode?)
    is_active        BOOLEAN     NOT NULL DEFAULT FALSE,

    -- server-side slide tracking (frame polls and we tell it which index to show)
    current_index    INT         NOT NULL DEFAULT 0,
    last_advanced_at TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slideshow_slides (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slideshow_id  UUID        NOT NULL REFERENCES slideshows(id) ON DELETE CASCADE,
    position      INT         NOT NULL,          -- 0-based ordering
    image_url     TEXT        NOT NULL,
    image_hash    TEXT        NOT NULL DEFAULT '',
    caption       TEXT,                          -- optional overlay text
    duration_ms   INT,                           -- NULL = use slideshow default
    added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (slideshow_id, position)
);

CREATE TABLE IF NOT EXISTS slideshow_reactions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slide_id     UUID        NOT NULL REFERENCES slideshow_slides(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji        TEXT        NOT NULL DEFAULT '❤️',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slide_id, user_id)  -- one reaction per partner per slide (upsert)
);

CREATE INDEX IF NOT EXISTS slideshow_slides_show_pos  ON slideshow_slides(slideshow_id, position);
CREATE INDEX IF NOT EXISTS slideshow_reactions_slide  ON slideshow_reactions(slide_id);
CREATE INDEX IF NOT EXISTS slideshows_user            ON slideshows(user_id);