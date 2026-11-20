#!/bin/bash
# Create (or refresh) a private working copy of the game for one agent: work/<id>/gk3
# Usage: tools/mkwork.sh <id>            -> fresh copy of main gk3 (keeps an existing copy unless --force)
set -e; ROOT="$(cd "$(dirname "$0")/.." && pwd)"; ID="$1"; [ -z "$ID" ] && { echo "usage: mkwork.sh <id> [--force]"; exit 1; }
W="$ROOT/work/$ID"; mkdir -p "$W/shots"
if [ -d "$W/gk3" ] && [ "$2" != "--force" ]; then echo "exists: $W/gk3 (use --force to recopy)"; else rm -rf "$W/gk3"; cp -r "$ROOT/gk3" "$W/gk3"; (cd "$ROOT/gk3" && find . -type f -exec md5sum {} + | sort -k2) > "$W/base.md5"; echo "created $W/gk3"; fi
echo "run tests with:  GK_DIR=$W/gk3 GK_SHOTS=$W/shots node $ROOT/tools/shot.js <prefix> '<views json>'"
