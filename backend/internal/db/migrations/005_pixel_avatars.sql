CREATE TABLE IF NOT EXISTS pixel_avatars (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'My Avatar',
    pixels      JSONB NOT NULL DEFAULT '[]',
    palette     JSONB NOT NULL DEFAULT '[]',
    width       INT  NOT NULL DEFAULT 16,
    height      INT  NOT NULL DEFAULT 16,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pixel_avatars_user_id_idx ON pixel_avatars(user_id); 