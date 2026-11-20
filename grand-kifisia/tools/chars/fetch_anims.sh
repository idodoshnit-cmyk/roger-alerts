#!/bin/bash
# Fetch the Rocketbox animation FBX files named in a list from the blob-less clone and convert them to GLB.
# Usage: fetch_anims.sh [raw dir] [list file]     (re-runnable; finished files are skipped; writes raw/anim_kinds.txt = "name static|xy|xyz")
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
RAW="${1:-$ROOT/work/chars/raw}"; LIST="${2:-$HERE/anims_fetch.txt}"
REPO=/home/user/microsoft/microsoft-rocketbox; CONV="$ROOT/rb/node_modules/fbx2gltf/bin/Linux/FBX2glTF"
mkdir -p "$RAW/anim_fbx" "$RAW/anim_glb"; : > "$RAW/anim_kinds.new"
grep -v '^#' "$LIST" | while IFS= read -r n; do
  [ -z "$n" ] && continue
  p="$(grep -E "^Assets/Animations/all_animations_max_motextr_(static|xy|xyz)/$n\.max\.fbx$" "$ROOT/rocketbox_files.txt" | head -1)"
  [ -z "$p" ] && { echo "NOT FOUND $n"; continue; }
  kind="$(echo "$p" | sed -E 's#.*motextr_([a-z]+)/.*#\1#')"
  [ -s "$RAW/anim_fbx/$n.fbx" ] || git -C "$REPO" show "HEAD:$p" > "$RAW/anim_fbx/$n.fbx" || { echo "FETCH FAILED $p"; rm -f "$RAW/anim_fbx/$n.fbx"; continue; }
  [ -s "$RAW/anim_glb/$n.glb" ] || "$CONV" -i "$RAW/anim_fbx/$n.fbx" -o "$RAW/anim_glb/$n" --binary >/dev/null 2>&1 || echo "CONVERT FAILED $n"
  echo "$n $kind" >> "$RAW/anim_kinds.new"
done
mv "$RAW/anim_kinds.new" "$RAW/anim_kinds.txt"; rm -f "$RAW/anim_kinds.tmp"
echo "ALLDONE: $(ls "$RAW/anim_glb" | wc -l) glb"
