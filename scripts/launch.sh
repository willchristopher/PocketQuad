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

echo "Starting Next.js dev server..."
exec npm run dev
