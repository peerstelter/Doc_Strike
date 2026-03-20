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

# ── Port configuration ────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo ""
  echo "⚙️  Port configuration (press Enter to accept defaults):"
  printf "   Frontend port  [8080]: "; read FRONTEND_PORT
  FRONTEND_PORT=${FRONTEND_PORT:-8080}
  printf "   WebSocket port [3001]: "; read WS_PORT
  WS_PORT=${WS_PORT:-3001}

  cat > .env <<EOF
FRONTEND_PORT=${FRONTEND_PORT}
WS_PORT=${WS_PORT}
WS_PATH=/ws
EOF
  echo "   ✅ Saved to .env"
else
  # Load existing values
  # shellcheck disable=SC1091
  . ./.env
  FRONTEND_PORT=${FRONTEND_PORT:-8080}
  WS_PORT=${WS_PORT:-3001}
  echo "▶ Using ports from .env  (frontend=${FRONTEND_PORT}, ws=${WS_PORT})"
  echo "   Delete .env to reconfigure."
fi

# ── Build & start ─────────────────────────────────────────────────────────────
echo ""
echo "▶ Building images…"
docker compose build --pull

echo "▶ Starting services…"
docker compose up -d

# ── Print summary + NPM config ────────────────────────────────────────────────
LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅  Naval Strike is running                                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Services:"
echo "    Frontend  →  http://${LOCAL_IP}:${FRONTEND_PORT}"
echo "    WS relay  →  ws://${LOCAL_IP}:${WS_PORT}"
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Nginx Proxy Manager config                                      ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Proxy Host settings:                                            ║"
echo "║    Scheme              : http                                    ║"
printf "║    Forward Hostname/IP : %-38s║\n" "${LOCAL_IP}"
printf "║    Forward Port        : %-38s║\n" "${FRONTEND_PORT}"
echo "║    Websockets Support  : ✅ ON                                   ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Advanced → Custom Nginx Configuration:                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
cat <<NGINX
location /ws {
    proxy_pass         http://${LOCAL_IP}:${WS_PORT};
    proxy_http_version 1.1;
    proxy_set_header   Upgrade    \$http_upgrade;
    proxy_set_header   Connection "Upgrade";
    proxy_set_header   Host       \$host;
    proxy_set_header   X-Real-IP  \$remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
NGINX
