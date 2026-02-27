#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# p-ink update script
#
# Usage:
#   ./update.sh          — update both backend and frontend
#   ./update.sh backend  — update only backend
#   ./update.sh frontend — update only frontend
#
# What it does:
#   1. git pull
#   2. Detects which service has changed (or respects explicit arg)
#   3. Rebuilds only what changed
#   4. Reloads via pm2 (zero-downtime for frontend, graceful restart for backend)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

source /etc/profile.d/go.sh 2>/dev/null || export PATH=$PATH:/usr/local/go/bin

DEPLOY_DIR="/opt/p-ink"
BACKEND_DIR="$DEPLOY_DIR/backend"
FRONTEND_DIR="$DEPLOY_DIR/frontend"
TARGET="${1:-auto}"   # auto | backend | frontend | both

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $*"; }
die()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 1. Pull latest ────────────────────────────────────────────────────────────
log "Pulling latest from origin..."
cd "$DEPLOY_DIR"

BEFORE=$(git rev-parse HEAD)
git fetch origin
git pull --ff-only origin HEAD || die "git pull failed — resolve conflicts manually"
AFTER=$(git rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" && "$TARGET" == "auto" ]]; then
  warn "Already up to date ($(git rev-parse --short HEAD)). Nothing to do."
  pm2 list
  exit 0
fi

log "Updated: $(git log --oneline ${BEFORE}..${AFTER} | head -5)"

# ── 2. Detect what changed ────────────────────────────────────────────────────
CHANGED_BACKEND=false
CHANGED_FRONTEND=false

if [[ "$TARGET" == "auto" ]]; then
  DIFF=$(git diff --name-only "$BEFORE" "$AFTER")
  echo "$DIFF" | grep -q "^backend/"  && CHANGED_BACKEND=true
  echo "$DIFF" | grep -q "^frontend/" && CHANGED_FRONTEND=true
  if ! $CHANGED_BACKEND && ! $CHANGED_FRONTEND; then
    # Changes only in root files (README, deploy scripts, etc.)
    warn "No frontend or backend files changed. Exiting."
    exit 0
  fi
elif [[ "$TARGET" == "backend" ]]; then
  CHANGED_BACKEND=true
elif [[ "$TARGET" == "frontend" ]]; then
  CHANGED_FRONTEND=true
elif [[ "$TARGET" == "both" ]]; then
  CHANGED_BACKEND=true
  CHANGED_FRONTEND=true
else
  die "Unknown target '$TARGET'. Use: auto | backend | frontend | both"
fi

# ── 3. Update backend ─────────────────────────────────────────────────────────
if $CHANGED_BACKEND; then
  log "Rebuilding backend..."
  cd "$BACKEND_DIR"

  go mod download
  go build -o bin/server ./cmd/server || die "Backend build failed"
  log "✓ Backend compiled"

  # Graceful restart — pm2 sends SIGTERM, waits for in-flight requests to finish
  pm2 restart p-ink-backend --update-env
  log "✓ Backend restarted (pm2: p-ink-backend)"
fi

# ── 4. Update frontend ────────────────────────────────────────────────────────
if $CHANGED_FRONTEND; then
  log "Rebuilding frontend..."
  cd "$FRONTEND_DIR"

  # Only reinstall deps if package.json or lockfile changed
  if git diff --name-only "$BEFORE" "$AFTER" | grep -qE "^frontend/(package\.json|pnpm-lock\.yaml)"; then
    log "  package files changed — running pnpm install..."
    pnpm install --frozen-lockfile
  fi

  pnpm build || die "Frontend build failed"
  log "✓ Frontend built"

  # pm2 reload does a rolling restart (keeps old process alive until new one is ready)
  pm2 reload p-ink-frontend --update-env
  log "✓ Frontend reloaded (pm2: p-ink-frontend)"
fi

# ── 5. Save pm2 state ─────────────────────────────────────────────────────────
pm2 save

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
log "Deploy complete — $(git rev-parse --short HEAD)"
$CHANGED_BACKEND  && echo "  Backend:   updated ✓"
$CHANGED_FRONTEND && echo "  Frontend:  updated ✓"
echo ""
pm2 list
echo "════════════════════════════════════════"