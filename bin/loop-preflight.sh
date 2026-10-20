#!/usr/bin/env bash
set -euo pipefail

MIN_MEM="${PREFLIGHT_MIN_MEM_MB:-1200}"
FORCE=0

for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    FORCE=1
  fi
done

# 1. Check available RAM
avail_mem=$(free -m | awk '/^Mem:/{print $7}')
if [ "$avail_mem" -lt "$MIN_MEM" ]; then
  if [ "$FORCE" -eq 1 ]; then
    echo "PREFLIGHT WARN: Available memory (${avail_mem}MB) is below threshold (${MIN_MEM}MB), but --force is specified. Proceeding." >&2
  else
    echo "PREFLIGHT FAIL: Available memory (${avail_mem}MB) is below safe threshold (${MIN_MEM}MB)." >&2
    echo "Recommendation: Close stale background containers or idle dev servers, or pass --force." >&2
    exit 1
  fi
fi

# 2. Check Git workspace isolation
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "PREFLIGHT FAIL: Current directory is not a Git repository." >&2
  exit 2
fi

echo "PREFLIGHT PASS: Memory (${avail_mem}MB available) and Git workspace valid."
