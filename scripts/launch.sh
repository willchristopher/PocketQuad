#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 3001 3002 3003)

echo "Clearing used ports: ${PORTS[*]}"
for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti tcp:"$PORT" || true)
  if [[ -n "$PIDS" ]]; then
    echo "Stopping process on port $PORT ($PIDS)"
    kill -9 $PIDS || true
  fi
done

echo ""
echo "Starting Next.js dev server..."
echo ""

# Get local IP for mobile access
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MyQuad Development Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Local:    http://localhost:3000"
if [[ -n "$LOCAL_IP" ]]; then
  echo "  Mobile:   http://${LOCAL_IP}:3000"
  echo ""
  echo "  📱 To access on your phone:"
  echo "     1. Connect your phone to the same WiFi network"
  echo "     2. Open http://${LOCAL_IP}:3000 in your mobile browser"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec npm run dev
