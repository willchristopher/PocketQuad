#!/usr/bin/env bash
set -euo pipefail

PORTS=(3000 3001 3002 3003)
FOUND=0

echo "Stopping local PocketQuad processes on ports: ${PORTS[*]}"

for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti tcp:"$PORT" || true)

  if [[ -z "$PIDS" ]]; then
    continue
  fi

  FOUND=1
  echo "Stopping port $PORT ($PIDS)"
  kill $PIDS || true
done

if [[ "$FOUND" -eq 1 ]]; then
  sleep 1
fi

for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti tcp:"$PORT" || true)

  if [[ -z "$PIDS" ]]; then
    continue
  fi

  echo "Force stopping port $PORT ($PIDS)"
  kill -9 $PIDS || true
done

REMAINING=0
for PORT in "${PORTS[@]}"; do
  if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
    REMAINING=1
    echo "Port $PORT is still in use."
  fi
done

if [[ "$FOUND" -eq 0 ]]; then
  echo "No local PocketQuad processes were running."
elif [[ "$REMAINING" -eq 0 ]]; then
  echo "Local PocketQuad processes stopped."
else
  echo "Some processes may still be running."
  exit 1
fi
