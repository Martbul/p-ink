BEGIN;

CREATE TABLE IF NOT EXISTS tamagotchis (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID        NOT NULL REFERENCES couples(id)  ON DELETE CASCADE,
  owner_id        UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  controller_id   UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  name            TEXT        NOT NULL DEFAULT 'Unnamed',
  species         TEXT        NOT NULL DEFAULT 'bear',
  health          INT         NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),
  max_health      INT         NOT NULL DEFAULT 100,
  xp              INT         NOT NULL DEFAULT 0   CHECK (xp >= 0),
  level           INT         NOT NULL DEFAULT 1   CHECK (level >= 1),
  mood            TEXT        NOT NULL DEFAULT 'happy',
  last_fed_at     TIMESTAMPTZ          DEFAULT now(),
  created_at      TIMESTAMPTZ          DEFAULT now(),
  CONSTRAINT tamagotchi_one_per_owner  UNIQUE (couple_id, owner_id),
  CONSTRAINT tamagotchi_species CHECK (species IN ('bear', 'cat', 'bunny','dog', 'shark', 'fox', 'penguin')),
  CONSTRAINT tamagotchi_mood    CHECK (mood    IN ('happy', 'neutral', 'sad', 'sleeping', 'excited')),
  CONSTRAINT owner_ne_controller CHECK (owner_id <> controller_id)
);

CREATE INDEX IF NOT EXISTS tamagotchis_couple    ON tamagotchis (couple_id);
CREATE INDEX IF NOT EXISTS tamagotchis_owner     ON tamagotchis (owner_id);
CREATE INDEX IF NOT EXISTS tamagotchis_controller ON tamagotchis (controller_id);

CREATE TABLE IF NOT EXISTS tamagotchi_items (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT    NOT NULL,
  name             TEXT    NOT NULL UNIQUE,
  description      TEXT    NOT NULL,
  xp_cost          INT     NOT NULL CHECK (xp_cost >= 0),
  preview_url      TEXT,
  species_lock     TEXT            NULL,  -- NULL = any species
  unlocks_at_level INT     NOT NULL DEFAULT 1,
  CONSTRAINT item_type CHECK (type IN ('outfit', 'accessory', 'background', 'animation', 'position')),
  CONSTRAINT item_species_lock CHECK (species_lock IS NULL OR species_lock IN ('bear', 'cat', 'bunny','dog', 'shark', 'fox', 'penguin'))
);

CREATE TABLE IF NOT EXISTS tamagotchi_inventory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tamagotchi_id   UUID        NOT NULL REFERENCES tamagotchis(id)    ON DELETE CASCADE,
  item_id         UUID        NOT NULL REFERENCES tamagotchi_items(id),
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tamagotchi_id, item_id)
);

CREATE TABLE IF NOT EXISTS tamagotchi_equipped (
  tamagotchi_id   UUID    NOT NULL REFERENCES tamagotchis(id)    ON DELETE CASCADE,
  slot            TEXT    NOT NULL,
  item_id         UUID    NOT NULL REFERENCES tamagotchi_items(id),
  PRIMARY KEY (tamagotchi_id, slot),
  CONSTRAINT equipped_slot CHECK (slot IN ('outfit', 'accessory', 'background', 'position'))
);

-- ─── Events (audit log + activity feed) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tamagotchi_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tamagotchi_id   UUID        NOT NULL REFERENCES tamagotchis(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  xp_delta        INT         NOT NULL DEFAULT 0,
  health_delta    INT         NOT NULL DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_type CHECK (type IN (
    'fed', 'leveled_up', 'item_purchased', 'item_equipped',
    'mood_changed', 'sleeping', 'woke_up', 'decay'
  ))
);

CREATE INDEX IF NOT EXISTS tamagotchi_events_tama_id ON tamagotchi_events (tamagotchi_id, created_at DESC);


INSERT INTO tamagotchi_items (type, name, description, xp_cost, unlocks_at_level) VALUES
  -- Outfits
  ('outfit',     'Cozy Sweater',      'A warm knitted sweater for chilly days.',           100, 1),
  ('outfit',     'Summer Dress',      'Light and breezy for sunny moods.',                 100, 1),
  ('outfit',     'Winter Coat',       'A thick coat for when health is low.',              200, 2),
  ('outfit',     'Astronaut Suit',    'For when love feels out of this world.',            500, 4),
  ('outfit',     'Tuxedo',            'Fancy. Very fancy.',                                400, 3),
  -- Accessories
  ('accessory',  'Tiny Hat',          'A ridiculously small top hat.',                     75,  1),
  ('accessory',  'Heart Glasses',     'Rose-tinted, literally.',                           75,  1),
  ('accessory',  'Flower Crown',      'Made of tiny pixel daisies.',                       150, 2),
  ('accessory',  'Star Wand',         'For the magical creatures.',                        300, 3),
  ('accessory',  'Bow Tie',           'Dapper.',                                           100, 2),
  -- Backgrounds
  ('background', 'Cozy Room',         'Warm lamp light, wooden floor.',                   200, 2),
  ('background', 'Night Sky',         'Stars and a crescent moon.',                       200, 2),
  ('background', 'Rainy Window',      'Drops running down glass.',                        300, 3),
  ('background', 'Sunflower Field',   'Bright and optimistic.',                           300, 3),
  ('background', 'Space',             'Drifting through the cosmos.',                     500, 5),
  -- Positions
  ('position',   'Bottom Right',      'Classic corner placement.',                          0, 1),
  ('position',   'Bottom Left',       'Other classic corner.',                              0, 1),
  ('position',   'Top Bar',           'A strip across the top of the frame.',             150, 2),
  ('position',   'Center Stage',      'Right in the middle, commanding attention.',        250, 3),
  -- Animations
  ('animation',  'Happy Dance',       'Wiggles when health is above 80.',                 400, 4),
  ('animation',  'Heart Pulse',       'A small heart beats above the head.',              300, 3),
  ('animation',  'Sleeping Zzz',      'Floating Zs when mood is sleeping.',               200, 2)
ON CONFLICT (name) DO NOTHING;

-- ─── Level thresholds view ────────────────────────────────────────────────────
-- Useful for the backend to check level-up conditions.
CREATE OR REPLACE VIEW tamagotchi_level_thresholds AS
SELECT level, xp_required FROM (VALUES
  (1,     0),
  (2,   200),
  (3,   500),
  (4,  1000),
  (5,  2000),
  (6,  3500),
  (7,  5500),
  (8,  8000),
  (9, 11000),
  (10,15000)
) AS t(level, xp_required);

COMMIT;