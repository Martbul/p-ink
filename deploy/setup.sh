#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# p-ink VPS bootstrap — run ONCE on a fresh Ubuntu 22.04/24.04 server
# Usage: bash setup.sh <github-repo-url>
#   e.g. bash setup.sh https://github.com/martbul/p-ink.git
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${1:-}"
DEPLOY_DIR="/opt/p-ink"
GO_VERSION="1.22.4"
NODE_VERSION="20"   # LTS

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: bash setup.sh <github-repo-url>"
  exit 1
fi

echo "════════════════════════════════════════"
echo " p-ink VPS setup"
echo " Repo:   $REPO_URL"
echo " Dir:    $DEPLOY_DIR"
echo "════════════════════════════════════════"

# ── 1. System packages ────────────────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq \
  curl wget git build-essential ca-certificates \
  unzip jq caddy

# ── 2. Go ─────────────────────────────────────────────────────────────────────
if ! command -v go &>/dev/null || [[ "$(go version | awk '{print $3}')" != "go${GO_VERSION}" ]]; then
  echo "→ Installing Go ${GO_VERSION}..."
  wget -q "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -O /tmp/go.tar.gz
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tar.gz
  rm /tmp/go.tar.gz
fi

# Persist Go in PATH for all users
cat > /etc/profile.d/go.sh << 'EOF'
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
EOF
source /etc/profile.d/go.sh
echo "✓ Go $(go version)"

# ── 3. Node.js via nvm ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "→ Installing Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
fi
echo "✓ Node $(node --version)"

# ── 4. pnpm + pm2 ─────────────────────────────────────────────────────────────
npm install -g pnpm pm2 --quiet
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
echo "✓ pnpm $(pnpm --version), pm2 $(pm2 --version)"

# ── 5. Clone repo ─────────────────────────────────────────────────────────────
if [[ -d "$DEPLOY_DIR/.git" ]]; then
  echo "→ Repo already cloned at $DEPLOY_DIR, pulling latest..."
  git -C "$DEPLOY_DIR" pull --ff-only
else
  echo "→ Cloning $REPO_URL → $DEPLOY_DIR..."
  git clone "$REPO_URL" "$DEPLOY_DIR"
fi

# ── 6. Backend .env ───────────────────────────────────────────────────────────
if [[ ! -f "$DEPLOY_DIR/backend/.env" ]]; then
  cp "$DEPLOY_DIR/backend/.env.example" "$DEPLOY_DIR/backend/.env"
  echo ""
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  ACTION REQUIRED: fill in backend/.env              │"
  echo "│  nano $DEPLOY_DIR/backend/.env                      │"
  echo "└─────────────────────────────────────────────────────┘"
fi

# ── 7. Frontend .env.local ────────────────────────────────────────────────────
if [[ ! -f "$DEPLOY_DIR/frontend/.env.local" ]]; then
  cat > "$DEPLOY_DIR/frontend/.env.local" << 'ENVEOF'
# Fill in these values
NEXT_PUBLIC_API_URL=http://localhost:7111
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
PORT=7777
ENVEOF
  echo ""
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  ACTION REQUIRED: fill in frontend/.env.local       │"
  echo "│  nano $DEPLOY_DIR/frontend/.env.local               │"
  echo "└─────────────────────────────────────────────────────┘"
fi

echo ""
echo "════════════════════════════════════════"
echo " Setup complete."
echo " Next steps:"
echo "   1. Fill in $DEPLOY_DIR/backend/.env"
echo "   2. Fill in $DEPLOY_DIR/frontend/.env.local"
echo "   3. Run: bash $DEPLOY_DIR/deploy/start.sh"
echo "════════════════════════════════════════"