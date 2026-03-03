BEGIN;

-- Rename the unique index (old name: one_device_per_user)
DROP INDEX IF EXISTS one_device_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS one_device_per_owner ON devices (owner_id);

-- Refresh the view so it joins owner info and works for multi-device couples.
-- We must DROP the view first because the column order/names have changed.
DROP VIEW IF EXISTS device_display;

CREATE VIEW device_display AS
SELECT
  d.id              AS device_id,
  d.mac_address,
  d.owner_id,
  d.couple_id,
  u.name            AS owner_name,
  u.email           AS owner_email,
  fs.image_url,
  fs.image_hash,
  fs.expires_at,
  fs.content_id,
  d.firmware,
  d.last_seen,
  (c.status = 'active') AS couple_active
FROM  devices     d
JOIN  users       u  ON u.id  = d.owner_id
LEFT JOIN frame_state fs ON fs.device_id = d.id
LEFT JOIN couples     c  ON c.id  = d.couple_id;

COMMIT;