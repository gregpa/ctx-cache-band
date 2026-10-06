#!/usr/bin/env bash
# Claude Code cloud environment setup script: fetches ctx-cache-band and points
# every session at it. Paste into the environment's "Setup script" field.
# Never fails the session start: a fetch error is logged and the session goes on
# without the mod.
DIR="$HOME/.claude/mods/ctx-cache-band"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only || echo "ctx-cache-band: pull failed, keeping the copy on disk"
else
  mkdir -p "$(dirname "$DIR")"
  git clone --depth 1 https://github.com/gregpa/ctx-cache-band.git "$DIR" \
    || echo "ctx-cache-band: clone failed (private repo without access?)"
fi
