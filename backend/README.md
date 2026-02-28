# p-ink — Backend

> **Go HTTP server that owns all the logic, content, and image composition.**

The backend is the brain of the system. The frame firmware is deliberately kept dumb — it just polls this server, downloads a BMP, and displays it. Everything else — which content to show, when to change it, how to compose the image — is decided here.

---

## What it does

- Manages users, couples, and device pairings
- Accepts photo uploads, messages, and drawings from the web UI
- Composes the final e-ink image server-side (photo + text layout, Floyd-Steinberg dithering)
- Serves pre-composed BMP images to frames on demand
- Runs a scheduler that rotates content at midnight (in the couple's timezone)
- Sends push notifications when a partner submits new content
- Handles frame provisioning via MAC address

---

## Architecture

```
backend/
├── cmd/
│   └── server/
│       └── main.go             Entrypoint — starts HTTP server
├── internal/
│   ├── api/
│   │   ├── frame.go            Frame poll endpoint, pairing
│   │   ├── auth.go             Register, login, JWT
│   │   ├── couple.go           Create couple, invite links
│   │   ├── content.go          Upload photos, submit messages/drawings
│   │   └── middleware.go       JWT auth, request logging, CORS
│   ├── db/
│   │   ├── schema.sql          PostgreSQL schema
│   │   ├── queries.sql         Named queries (used with sqlc)
│   │   └── db.go               Database connection pool
│   ├── image/
│   │   ├── compose.go          Assembles the final frame image
│   │   ├── dither.go           Floyd-Steinberg dithering to pure B/W
│   │   └── bmp.go              Encodes Go image.Image to 24-bit BMP
│   ├── scheduler/
│   │   └── midnight.go         Cron job — rotates content at couple's midnight
│   ├── storage/
│   │   └── s3.go               S3/R2 client for uploaded assets and composed BMPs
│   └── notify/
│       └── push.go             Web Push notifications (VAPID)
├── go.mod
└── README.md                   This file
```

---

## Database schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,       -- bcrypt
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Couples
CREATE TABLE couples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID REFERENCES users(id),
  user_b_id   UUID REFERENCES users(id),
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Invite tokens (used to form a couple)
CREATE TABLE invite_tokens (
  token       TEXT PRIMARY KEY,
  created_by  UUID REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);

-- Physical frames
CREATE TABLE devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id   UUID REFERENCES couples(id),
  mac_address TEXT UNIQUE NOT NULL,
  last_seen   TIMESTAMPTZ,
  firmware    TEXT
);

-- Uploaded content (photos, messages, drawings)
CREATE TABLE content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID REFERENCES couples(id),
  uploaded_by  UUID REFERENCES users(id),
  type         TEXT NOT NULL,     -- 'photo' | 'message' | 'drawing'
  storage_key  TEXT NOT NULL,     -- S3/R2 object key
  caption      TEXT,
  status       TEXT NOT NULL DEFAULT 'queued',  -- 'queued' | 'displayed' | 'archived'
  displayed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- The currently composed and cached frame image for each device
CREATE TABLE frame_state (
  device_id    UUID PRIMARY KEY REFERENCES devices(id),
  image_url    TEXT NOT NULL,
  image_hash   TEXT NOT NULL,     -- SHA-256 of BMP bytes
  composed_at  TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL  -- midnight in couple's timezone
);
```

---

## API endpoints

All authenticated endpoints require `Authorization: Bearer <jwt>` header.

### Auth

```
POST /api/auth/register
Body: { "email": "...", "name": "...", "password": "..." }
Returns: { "token": "jwt", "user": {...} }

POST /api/auth/login
Body: { "email": "...", "password": "..." }
Returns: { "token": "jwt", "user": {...} }
```

### Couple management

```
POST /api/couple/invite
Auth: required
Returns: { "invite_url": "https://p-ink.app/join/xk92-mf7p", "expires_at": "..." }

POST /api/couple/join
Auth: required
Body: { "token": "xk92-mf7p" }
Returns: { "couple": {...} }
```

### Content

```
POST /api/content/upload
Auth: required
Body: multipart/form-data — file + optional caption
Returns: { "content_id": "...", "status": "queued" }

GET /api/content
Auth: required
Returns: [ { "id": "...", "type": "photo", "status": "queued", "uploaded_by": "..." }, ... ]

DELETE /api/content/:id
Auth: required (must be uploader)
```

### Frame

```
POST /api/frame/poll
Headers: X-Device-Mac, User-Agent
Body: { "mac": "...", "firmware": "...", "boot_count": 42 }
Returns: {
  "image_url":         "https://cdn.../frame.bmp",
  "image_hash":        "sha256hex",
  "poll_interval_ms":  60000,
  "ota_url":           "",
  "ota_version":       "",
  "paired":            true
}

POST /api/frame/pair
Auth: required
Body: { "mac": "AA:BB:CC:DD:EE:FF" }
Returns: { "device_id": "..." }
```

---

## Image composition

This is the core of the backend. When the scheduler fires at midnight (or when new content arrives and the frame needs an immediate update), `compose.go` builds a new 800×480 BMP:

```
┌──────────────────────────────────┐
│  DATE LINE          Feb 25       │  ← small text, top-right
│                                  │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │   PHOTO / DRAWING        │    │  ← fills most of the frame
│  │   (dithered to B/W)      │    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  MESSAGE TEXT (if sent)          │  ← Cormorant Garamond italic
│                                  │
└──────────────────────────────────┘
```

**Content priority:**
1. If a **drawing** was sent today → it takes the full frame
2. If a **photo** is in the queue → it occupies the upper 70%, message text below
3. If only a **message** was sent → text is centred with generous padding
4. If nothing is queued → show a soft "nothing yet" placeholder (optional)

**Dithering:**
All photos and drawings go through Floyd-Steinberg dithering before compositing. This converts the full-colour image to a 1-bit (pure black/white) image that looks good on e-ink. The algorithm is in `internal/image/dither.go`.

**Output:**
The final image is encoded as a 24-bit Windows BMP (not PNG — BMP needs no decoder on the firmware side), uploaded to S3/R2, and its URL + SHA-256 hash stored in `frame_state`. On the next poll, the firmware gets this URL.

---

## Content rotation schedule

`internal/scheduler/midnight.go` runs a goroutine that checks every minute whether any couple has passed midnight in their configured timezone. When it triggers:

1. Mark the current `frame_state` as expired
2. Pick the next queued content item (oldest `queued` item, alternating between the two users)
3. Compose a new BMP
4. Update `frame_state` with the new URL and hash
5. The frame will pick it up on its next poll (within 60 seconds)

**Early replacement:** If a user sends new content (photo, message, drawing) while existing content is displayed, the backend immediately recomposes and updates `frame_state`. The frame picks this up on its next poll.

---

## Getting started

### Prerequisites

- Go 1.22+
- PostgreSQL 15+
- An S3-compatible object store (AWS S3, Cloudflare R2, MinIO)
- `imagemagick` or Go's `golang.org/x/image` for font rendering

### Environment variables

```env
DATABASE_URL=postgres://user:pass@localhost/p-ink
JWT_SECRET=your-secret-key
S3_BUCKET=p-ink-assets
S3_ENDPOINT=https://s3.amazonaws.com       # or R2 endpoint
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE=https://cdn.p-ink.app   # public URL prefix for BMP files
VAPID_PRIVATE_KEY=...                       # for push notifications
VAPID_PUBLIC_KEY=...
PORT=8080
```

### Run locally

```bash
cd backend/
go mod tidy
go run ./cmd/server
```

### Run database migrations

```bash
psql $DATABASE_URL < internal/db/schema.sql
```

---

## Font rendering

The backend embeds fonts for text on the frame image. The display font is **Cormorant Garamond** (same as the web UI) rendered via `golang.org/x/image/font/opentype`. Font files live in `internal/image/fonts/`.

Text layout rules:
- Message text wraps at ~60 characters per line
- Font size scales with message length (shorter messages = larger text)
- Line height is 1.4× for readability on e-ink

---

## Push notifications

When a user submits new content, `notify/push.go` sends a Web Push notification to their partner's registered browser. The web app registers a service worker on first load and sends its push subscription to `POST /api/notifications/subscribe`.

Notifications are sent using VAPID (Voluntary Application Server Identification). Generate keys once:

```bash
go run ./cmd/vapid-keygen
```

Set the output as `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` in your environment.

---

## Deployment

The backend is a single statically-linked Go binary. Suggested deployment:

```bash
# Build
GOOS=linux GOARCH=amd64 go build -o p-ink-server ./cmd/server

# Run (e.g. behind nginx or as a systemd service)
./p-ink-server
```

Or containerise with the included Dockerfile:

```bash
docker build -t p-ink-backend .
docker run -p 8080:8080 --env-file .env p-ink-backend
```

---

## Key design decisions

**Why BMP instead of PNG?**
The ESP32 firmware has no PNG decoder. BMP is a raw pixel format — the firmware reads the header, skips to the pixel data, and pushes rows directly to the display without any decoding overhead or library dependency.

**Why compose images server-side?**
E-ink displays on ESP32 have very limited memory and no GPU. Text rendering, font embedding, image resizing, and dithering are complex — keeping them on the server means the firmware stays simple and font/layout changes can be deployed without a firmware update.

**Why poll instead of push to the frame?**
The frame is behind a home NAT. A push-based architecture would require the frame to maintain a persistent connection (costly for battery life) or expose a port (complex network setup). Polling every 60 seconds is a good compromise — changes appear within a minute, and deep-sleep current is ~10 µA between polls.

main.go
  └── api/tamagotchi.go       parses HTTP, calls service, writes response
        └── domain/tamagotchi/service.go   pure business logic
              └── db/tamagotchi.go         raw SQL, returns models
                    └── models/models.go   structs only