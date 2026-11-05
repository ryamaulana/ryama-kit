#!/bin/bash
# SessionStart hook: pasang ryama-kit di sesi cloud (fullstack-dev + ui-designer-kit, tanpa flow-viewer).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
KIT_DIR="$PWD"

# 1. Skill global (dilewati kalau sudah ada)
[ -d "$HOME/.claude/skills/design-taste-frontend" ] || \
  npx -y skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -g -a claude-code -y
[ -d "$HOME/.claude/skills/web-design-guidelines" ] || \
  npx -y skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines -g -a claude-code -y

# 2. Design library
[ -f "$HOME/.claude/design-library/INDEX.md" ] || bash "$KIT_DIR/setup-library.sh"

# 3. Playwright untuk audit ui-craft: npm install diulang hanya kalau package.json / skrip ini berubah
cd "$KIT_DIR/skills/ui-craft"
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install --no-audit --no-fund
  sha256sum "$KIT_DIR/.claude/hooks/session-start.sh" package.json > "$hashes" || rm -f "$hashes"
fi
cd "$KIT_DIR"

# Chromium: unduhan playwright diblokir di sesi cloud (cdn.playwright.dev), pakai build bawaan environment
if [ -x /opt/pw-browsers/chromium/chrome-linux64/chrome ] || [ -d /opt/pw-browsers/chromium ]; then
  echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/opt/pw-browsers/chromium"' >> "${CLAUDE_ENV_FILE:-/dev/null}"
fi

# 4. Skill milik kit -> ~/.claude/skills (symlink)
mkdir -p "$HOME/.claude/skills"
for d in "$KIT_DIR"/skills/*/; do
  n=$(basename "$d")
  [ -e "$HOME/.claude/skills/$n" ] || ln -s "$d" "$HOME/.claude/skills/$n"
done

# 5. Marketplace + plugin (hanya yang belum terpasang)
claude plugin marketplace add "$KIT_DIR" >/dev/null 2>&1 || true
installed="$(claude plugin list 2>/dev/null || true)"
for p in fullstack-dev ui-designer-kit; do
  grep -q "$p@ryama-kit" <<<"$installed" || claude plugin install "$p@ryama-kit"
done
