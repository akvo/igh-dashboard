#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup SIGINT SIGTERM EXIT

echo "Installing backend dependencies..."
(cd "$ROOT_DIR/backend" && npm install)

echo "Installing frontend dependencies..."
(cd "$ROOT_DIR/frontend" && npm install)

echo ""
echo "Starting dev servers..."
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:3000"
echo ""

(cd "$ROOT_DIR/backend" && npm run dev 2>&1 | sed 's/^/[backend]  /') &
BACKEND_PID=$!

(cd "$ROOT_DIR/frontend" && npm run dev 2>&1 | sed 's/^/[frontend] /') &
FRONTEND_PID=$!

wait
