#!/usr/bin/env bash
set -euo pipefail

# Run preflight check
/root/.pi/agent/bin/loop-preflight.sh "$@"

target_dir="${1:-$(pwd)}"
label="${2:-autonomous-loop}"

if [ -d "$target_dir" ]; then
  cd "$target_dir"
fi

if command -v herdr >/dev/null 2>&1 && [ "${HERDR_ENV:-0}" = "1" ]; then
  echo "Spawning new Herdr tab for autonomous loop in $(pwd)..."
  herdr tab create --cwd "$(pwd)" --label "$label" --no-focus
else
  echo "Launching Pi with YOLO mode in $(pwd)..."
  exec pi --mode yolo
fi
