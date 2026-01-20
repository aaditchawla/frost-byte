#!/usr/bin/env bash
set -euo pipefail

# Put this script + its children in one job-control group
set -m

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

BACKEND_DIR="$REPO_ROOT/src/app/backend"
FRONTEND_DIR="$REPO_ROOT"
VENV_DIR="$BACKEND_DIR/.venv"

cleanup() {
  echo ""
  echo "🛑 Stopping dev servers..."
  # Kill *everything* in this process group (frontend, backend, reload children)
  kill 0 2>/dev/null || true
  exit 0
}

# One Ctrl+C triggers cleanup
trap cleanup INT TERM

echo "Repo root: $REPO_ROOT"

# --- backend venv bootstrap ---
if [[ ! -f "$VENV_DIR/bin/activate" ]]; then
  echo "⚠️  Backend venv not found at: $VENV_DIR"
  echo "Creating it and installing requirements..."
  (
    cd "$BACKEND_DIR"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    python3 -m pip install --upgrade pip
    python3 -m pip install -r requirements.txt
  )
fi

# --- start backend ---
echo "▶ Starting backend (FastAPI) on :8000..."
(
  cd "$BACKEND_DIR"
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  exec uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

# --- start frontend ---
echo "▶ Starting frontend (Next.js) on :3000..."
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
FRONTEND_PID=$!

# Give Next a moment, then open browser
sleep 2
echo "🌐 Opening browser..."
open "http://localhost:3000" || true

echo ""
echo "✅ Backend:  http://127.0.0.1:8000/docs"
echo "✅ Frontend: http://localhost:3000"
echo "Press Ctrl+C once to stop everything."
echo ""

# Wait for both to exit (if either crashes, script stays up until you Ctrl+C)
wait "$BACKEND_PID" || true
wait "$FRONTEND_PID" || true