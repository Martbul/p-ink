BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT        UNIQUE NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS couples (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   UUID            NULL REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending',
  timezone    TEXT        NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT different_users CHECK (user_a_id <> user_b_id),
  CONSTRAINT couple_status   CHECK (status IN ('pending', 'active'))
);

CREATE TABLE IF NOT EXISTS invite_tokens (
  token       TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'hex'),
  couple_id   UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at     TIMESTAMPTZ,
  used_by     UUID            NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS devices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id   UUID            NULL REFERENCES couples(id) ON DELETE SET NULL,
  mac_address TEXT        UNIQUE NOT NULL,
  label       TEXT,
  last_seen   TIMESTAMPTZ,
  firmware    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_device_per_user ON devices (owner_id);

CREATE TABLE IF NOT EXISTS content (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sent_by      UUID        NOT NULL REFERENCES users(id),
  sent_to      UUID        NOT NULL REFERENCES users(id),
  type         TEXT        NOT NULL,
  storage_key  TEXT            NULL,
  message_text TEXT            NULL,
  caption      TEXT,
  status       TEXT        NOT NULL DEFAULT 'queued',
  displayed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT sent_by_ne_sent_to CHECK (sent_by <> sent_to),
  CONSTRAINT content_type_check CHECK (type IN ('photo', 'message', 'drawing')),
  CONSTRAINT content_status_check CHECK (status IN ('queued', 'displayed', 'archived')),
  CONSTRAINT photo_has_key    CHECK (type <> 'photo'   OR storage_key   IS NOT NULL),
  CONSTRAINT drawing_has_key  CHECK (type <> 'drawing' OR storage_key   IS NOT NULL),
  CONSTRAINT message_has_text CHECK (type <> 'message' OR message_text  IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS content_sent_to_status ON content (sent_to, status, created_at);

CREATE TABLE IF NOT EXISTS frame_state (
  device_id    UUID        PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  content_id   UUID            NULL REFERENCES content(id) ON DELETE SET NULL,
  image_url    TEXT        NOT NULL,
  image_hash   TEXT        NOT NULL,
  composed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL,
  p256dh       TEXT        NOT NULL,
  auth         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE OR REPLACE VIEW device_display AS
SELECT
  d.id           AS device_id,
  d.mac_address,
  d.owner_id,
  d.couple_id,
  fs.image_url,
  fs.image_hash,
  fs.expires_at,
  fs.content_id,
  d.firmware,
  (c.status = 'active') AS couple_active
FROM devices d
LEFT JOIN frame_state fs ON fs.device_id = d.id
LEFT JOIN couples c      ON c.id = d.couple_id;

CREATE OR REPLACE VIEW next_content AS
SELECT
  c.*,
  u_by.name AS sender_name,
  u_to.name AS recipient_name
FROM content c
JOIN users u_by ON u_by.id = c.sent_by
JOIN users u_to ON u_to.id = c.sent_to
WHERE c.status = 'queued'
ORDER BY c.created_at ASC;

COMMIT;