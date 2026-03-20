#!/bin/sh
# Naval Strike — Alpine deployment script
# Usage: sh deploy.sh
set -e

REPO="https://github.com/peerstelter/Doc_Strike.git"
APP_DIR="/opt/naval-strike"

# ── Dependencies ──────────────────────────────────────────────────────────────
if ! command -v docker > /dev/null 2>&1; then
  echo "▶ Installing Docker…"
  apk add --no-cache docker docker-cli-compose
  rc-update add docker default
  service docker start
fi

if ! command -v git > /dev/null 2>&1; then
  apk add --no-cache git
fi

# ── Pull code ─────────────────────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "▶ Pulling latest…"
  git -C "$APP_DIR" pull
else
  echo "▶ Cloning repo…"
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# ── First-run .env guard ──────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  First run: edit $APP_DIR/.env with your settings, then run this script again."
  exit 1
fi

# ── Build & start ─────────────────────────────────────────────────────────────
echo "▶ Building images…"
docker compose build --pull

echo "▶ Starting services…"
docker compose up -d

echo ""
echo "✅  Naval Strike is up!"
LOCAL_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}')
echo "   Frontend  →  http://${LOCAL_IP}:8080"
echo "   WS server →  ws://${LOCAL_IP}:3001"
echo ""
echo "   Point your reverse proxy to these addresses."
echo "   See nginx-proxy.conf.example for a ready-to-use config."
