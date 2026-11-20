#!/bin/bash
# Durable backup of the Grand Kifisia sources (not the large regenerable assets) to the session's git branch.
SRC=/tmp/claude-0/-home-user-roger-alerts/1b3b0d86-8923-5c5e-87ff-3268c67302f8/scratchpad; REPO=/home/user/roger-alerts; DST=$REPO/grand-kifisia
mkdir -p "$DST" && cd "$SRC" || exit 1
tar -cf - --exclude='gk3/models' --exclude='gk3/tex' --exclude='node_modules' --exclude='docs/research/img' --exclude='*.glb' --exclude='*.fbx' --exclude='*.tga' gk3 tools docs build_map2.py build_map3.py osmload.py elev.json route.json 2>/dev/null | tar -C "$DST" -xf -
for d in work/*/; do id=$(basename "$d"); mkdir -p "$DST/work/$id"; cp "$d/PROGRESS.md" "$DST/work/$id/" 2>/dev/null; [ -d "$d/gk3/js" ] && { mkdir -p "$DST/work/$id/js"; cp "$d"/gk3/js/*.js "$DST/work/$id/js/" 2>/dev/null; }; done
find "$DST" -type f -size +3M -delete
cd "$REPO" && git add grand-kifisia >/dev/null 2>&1 && git commit -q -m "Grand Kifisia: backup of game sources, tools, docs and bot progress ($1)

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011jVRWwhx78hmir4qKt4mXG" && for i in 1 2 3 4; do git push -q -u origin claude/friendly-pasteur-5edxg6 && break || sleep $((i*4)); done; git log --oneline | head -1; du -sh "$DST" | cut -f1
