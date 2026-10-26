#!/usr/bin/env bash
# Clone / update awesome-design-md dan bangun INDEX.md ringkas.
# Agent cukup baca INDEX.md (~84 baris), bukan 84 file DESIGN.md (~600k token).
set -euo pipefail

LIB_DIR="${DESIGN_LIBRARY_DIR:-$HOME/.claude/design-library}"
REPO_DIR="$LIB_DIR/awesome-design-md"
INDEX="$LIB_DIR/INDEX.md"

mkdir -p "$LIB_DIR"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" pull --quiet --ff-only
else
  git clone --quiet --depth 1 https://github.com/VoltAgent/awesome-design-md.git "$REPO_DIR"
fi

{
  echo "# Design library index"
  echo
  echo "Sumber: VoltAgent/awesome-design-md (MIT). Path: $REPO_DIR/design-md/<slug>/DESIGN.md"
  echo "Preview visual: https://getdesign.md/<slug>/design-md"
  echo
  echo "| slug | gaya |"
  echo "|---|---|"
  for f in "$REPO_DIR"/design-md/*/DESIGN.md; do
    slug="$(basename "$(dirname "$f")")"
    desc="$(grep -m1 '^description:' "$f" | sed 's/^description:[[:space:]]*//; s/|/\//g' | cut -c1-220 || true)"
    [ -z "$desc" ] && desc="$(grep -m1 '^# ' "$f" | sed 's/^# //' || true)"
    echo "| $slug | $desc |"
  done
} > "$INDEX"

echo "OK: $(grep -c '^| [a-z0-9]' "$INDEX") gaya terindeks -> $INDEX"
