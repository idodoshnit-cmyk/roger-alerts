#!/bin/bash
# Copy files an agent OWNS from its private copy into the main game, refusing to clobber files that someone else changed in main meanwhile.
# Usage: tools/integrate.sh <id> <relative/path> [more paths or directories...]
set -e; ROOT="$(cd "$(dirname "$0")/.." && pwd)"; ID="$1"; shift; W="$ROOT/work/$ID"
for rel in "$@"; do
  if [ -d "$W/gk3/$rel" ]; then mkdir -p "$ROOT/gk3/$rel"; cp -r "$W/gk3/$rel/." "$ROOT/gk3/$rel/"; echo "dir  $rel"; continue; fi
  [ -f "$W/gk3/$rel" ] || { echo "MISSING in work copy: $rel"; exit 1; }
  if [ -f "$ROOT/gk3/$rel" ]; then base=$(grep " ./$rel\$" "$W/base.md5" | cut -d' ' -f1); cur=$(md5sum "$ROOT/gk3/$rel" | cut -d' ' -f1)
    if [ -n "$base" ] && [ "$base" != "$cur" ]; then echo "CONFLICT: main gk3/$rel changed since your copy was made. Merge by hand (diff $ROOT/gk3/$rel $W/gk3/$rel), do not overwrite."; exit 2; fi; fi
  mkdir -p "$(dirname "$ROOT/gk3/$rel")"; cp "$W/gk3/$rel" "$ROOT/gk3/$rel"; echo "file $rel"
done
(cd "$ROOT/gk3" && find . -type f -exec md5sum {} + | sort -k2) > "$W/base.md5"; echo "integrated into $ROOT/gk3"
