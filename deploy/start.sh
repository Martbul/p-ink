#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# p-ink first-time start
# Builds backend + frontend, registers both in pm2, saves process list.
# After this, use ./update.sh for all future deploys.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

source /etc/profile.d/go.sh 2>/dev/null || export PATH=$PATH:/usr/local/go/bin

DEPLOY_DIR="/opt/p-ink"
BACKEND_DIR="$DEPLOY_DIR/backend"
FRONTEND_DIR="$DEPLOY_DIR/frontend"

echo "════════════════════════════════════════"
echo " p-ink — initial start"
echo "════════════════════════════════════════"

# ── Log dirs ──────────────────────────────────────────────────────────────────
mkdir -p /var/log/p-ink

# ── Backend ───────────────────────────────────────────────────────────────────
echo "→ Building backend..."
cd "$BACKEND_DIR"
go mod download
go build -o bin/server ./cmd/server
echo "✓ Backend built → $BACKEND_DIR/bin/server"

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "→ Installing frontend deps..."
cd "$FRONTEND_DIR"
npm install
echo "→ Building frontend..."
npm run build
echo "✓ Frontend built"

# ── pm2 ───────────────────────────────────────────────────────────────────────
echo "→ Starting services under pm2..."

pm2 delete p-ink-backend  2>/dev/null || true
pm2 delete p-ink-frontend 2>/dev/null || true

pm2 start "$DEPLOY_DIR/deploy/ecosystem.config.js"
pm2 save

echo ""
echo "════════════════════════════════════════"
echo " Services running:"
pm2 list
echo ""
echo " Backend:   http://localhost:7111"
echo " Frontend:  http://localhost:7777"
echo " Logs:      pm2 logs"
echo "════════════════════════════════════════"