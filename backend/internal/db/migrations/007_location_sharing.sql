CREATE TABLE IF NOT EXISTS location_shares (
    user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    accuracy_m  REAL,                          -- metres, optional
    mode        TEXT        NOT NULL DEFAULT 'coordinates'
                            CHECK (mode IN ('coordinates', 'map_link')),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS location_shares_user ON location_shares(user_id);