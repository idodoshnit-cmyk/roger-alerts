#!/bin/bash
# Fetch Rocketbox avatars (FBX + colour/opacity textures) from the blob-less clone, convert FBX -> GLB and
# TGA -> down-sized PNG (the 12-16 MB TGAs are deleted right away). Re-runnable: finished files are skipped.
# Usage: fetch_avatars.sh [raw dir] [list file]
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
RAW="${1:-$ROOT/work/chars/raw}"; LIST="${2:-$HERE/avatars.txt}"
REPO=/home/user/microsoft/microsoft-rocketbox; CONV="$ROOT/rb/node_modules/fbx2gltf/bin/Linux/FBX2glTF"
mkdir -p "$RAW/av_fbx" "$RAW/av_glb" "$RAW/av_tex" "$RAW/tga"
grep -v '^#' "$LIST" | while IFS= read -r name; do
  [ -z "$name" ] && continue
  fbx="$(grep -E "^Assets/.*/$name/Export/$name\.fbx$" "$ROOT/rocketbox_files.txt" | head -1)"
  [ -z "$fbx" ] && { echo "NOT FOUND $name"; continue; }
  dir="$(dirname "$(dirname "$fbx")")"
  if [ ! -s "$RAW/av_glb/$name.glb" ]; then
    git -C "$REPO" show "HEAD:$fbx" > "$RAW/av_fbx/$name.fbx" || { echo "FETCH FAILED $fbx"; rm -f "$RAW/av_fbx/$name.fbx"; continue; }
    "$CONV" -i "$RAW/av_fbx/$name.fbx" -o "$RAW/av_glb/$name" --binary >/dev/null 2>&1 || echo "CONVERT FAILED $name"
  fi
  grep -E "^$dir/Textures/.*_color\.tga$" "$ROOT/rocketbox_files.txt" | while IFS= read -r tp; do
    kind="$(basename "$tp" .tga | sed -E 's/.*_(body|head|opacity|[a-z]+)_color$/\1/')"; [ "$kind" = "$(basename "$tp" .tga)" ] && kind=body
    out="$RAW/av_tex/${name}_$kind.png"
    [ -s "$out" ] && continue
    git -C "$REPO" show "HEAD:$tp" > "$RAW/tga/t.tga" || { echo "FETCH FAILED $tp"; continue; }
    python3 - "$RAW/tga/t.tga" "$out" "$kind" <<'PY'
import sys
from PIL import Image
src, out, kind = sys.argv[1:4]
im = Image.open(src); im.load()
size = 1024 if kind == 'body' else 512
im = im.convert('RGBA' if kind == 'opacity' else 'RGB').resize((size, size), Image.LANCZOS)
im.save(out)
PY
    rm -f "$RAW/tga/t.tga"
  done
  echo "ok $name $(ls "$RAW/av_tex" | grep -c "^${name}_")tex"
done
echo ALLDONE
