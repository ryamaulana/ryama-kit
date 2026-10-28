#!/usr/bin/env bash
# Install ryama-kit secara global (berlaku di semua project).
# Jalankan dari mana saja: bash /path/ke/ryama-kit/install-global.sh
set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/4 Skill global (~/.claude/skills/)"
npx -y skills add https://github.com/Leonxlnx/taste-skill \
  --skill design-taste-frontend -g -a claude-code -y
npx -y skills add https://github.com/vercel-labs/agent-skills \
  --skill web-design-guidelines -g -a claude-code -y

echo "==> 2/4 Design library (~/.claude/design-library/)"
bash "$KIT_DIR/setup-library.sh"

echo "==> 3/4 Playwright untuk audit ui-craft (sekali, di folder skill)"
(cd "$KIT_DIR/skills/ui-craft" && npm install --no-audit --no-fund && npx playwright install chromium)

echo "==> Skill milik kit -> ~/.claude/skills (symlink)"
mkdir -p "$HOME/.claude/skills"
for d in "$KIT_DIR"/skills/*/; do
  n=$(basename "$d")
  [ -e "$HOME/.claude/skills/$n" ] || ln -s "$d" "$HOME/.claude/skills/$n"
done

echo "==> 4/4 Marketplace + plugins (scope user = global)"
claude plugin marketplace add "$KIT_DIR" || echo "   (marketplace sudah terdaftar, lanjut)"
claude plugin install ui-designer-kit@ryama-kit || echo "   (plugin sudah terpasang, lanjut)"
claude plugin install fullstack-dev@ryama-kit || echo "   (fullstack-dev sudah terpasang, lanjut)"
claude plugin install flow-viewer@ryama-kit || echo "   (flow-viewer sudah terpasang, lanjut)"

echo
echo "Selesai. Cek dengan: claude plugin list"
echo "Edit file di $KIT_DIR langsung kepake di sesi berikutnya (atau /reload-plugins)."
