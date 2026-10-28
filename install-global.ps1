# Install ryama-kit secara global (Windows / PowerShell).
# Jalankan: powershell -ExecutionPolicy Bypass -File "$HOME\.claude\ryama-kit\install-global.ps1"
$ErrorActionPreference = "Stop"
$KitDir = $PSScriptRoot
$LibDir = Join-Path $HOME ".claude\design-library"
$RepoDir = Join-Path $LibDir "awesome-design-md"

Write-Host "==> 1/4 Skill global (~\.claude\skills)" -ForegroundColor Cyan
npx -y skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -g -a claude-code -y
npx -y skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines -g -a claude-code -y

Write-Host "==> 2/4 Design library (~\.claude\design-library)" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $LibDir | Out-Null
if (Test-Path (Join-Path $RepoDir ".git")) {
    git -C $RepoDir pull --quiet --ff-only
} else {
    git clone --quiet --depth 1 https://github.com/VoltAgent/awesome-design-md.git $RepoDir
}
$lines = @(
    "# Design library index", "",
    "Sumber: VoltAgent/awesome-design-md (MIT). Path: ~/.claude/design-library/awesome-design-md/design-md/<slug>/DESIGN.md",
    "Preview visual: https://getdesign.md/<slug>/design-md", "",
    "| slug | gaya |", "|---|---|"
)
Get-ChildItem (Join-Path $RepoDir "design-md") -Directory | ForEach-Object {
    $f = Join-Path $_.FullName "DESIGN.md"
    if (Test-Path $f) {
        $desc = (Select-String -Path $f -Pattern '^description:' | Select-Object -First 1).Line
        if ($desc) { $desc = ($desc -replace '^description:\s*', '') -replace '\|', '/' }
        else { $desc = ((Select-String -Path $f -Pattern '^# ' | Select-Object -First 1).Line -replace '^# ', '') }
        if ($desc.Length -gt 220) { $desc = $desc.Substring(0, 220) }
        $lines += "| $($_.Name) | $desc |"
    }
}
$lines | Set-Content -Encoding UTF8 (Join-Path $LibDir "INDEX.md")
Write-Host "   $($lines.Count - 7) gaya terindeks"

Write-Host "==> 3/4 Playwright untuk audit ui-craft (sekali, di folder skill)" -ForegroundColor Cyan
$UiCraft = Join-Path $KitDir "skills\ui-craft"
Push-Location $UiCraft
npm install --no-audit --no-fund
npx playwright install chromium
Pop-Location

# Skill milik kit (folder skills\) -> ~\.claude\skills lewat junction, supaya semua agent menemukannya dan sumbernya tetap satu (di kit).
$SkillSrc = Join-Path $KitDir "skills"
$SkillDst = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $SkillDst | Out-Null
Get-ChildItem $SkillSrc -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") } | ForEach-Object {
    $link = Join-Path $SkillDst $_.Name
    if (Test-Path $link) {
        $item = Get-Item $link -Force
        if ($item.LinkType -eq "Junction" -and $item.Target -ne $_.FullName) { $item.Delete(); New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null; Write-Host "   skill diarahkan ulang: $($_.Name)" }
        else { Write-Host "   skill sudah ada: $($_.Name)" }
    } else { New-Item -ItemType Junction -Path $link -Target $_.FullName | Out-Null; Write-Host "   skill: $($_.Name)" }
}

Write-Host "==> 4/4 Marketplace + plugin (scope user = global)" -ForegroundColor Cyan
claude plugin marketplace add $KitDir
claude plugin install ui-designer-kit@ryama-kit
claude plugin install fullstack-dev@ryama-kit
claude plugin install flow-viewer@ryama-kit

# Semua hook plugin ditulis dengan Node; hanya node yang wajib ada.
foreach ($t in @("node")) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
        Write-Host "PERINGATAN: '$t' belum ada di PATH." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Selesai. Cek: claude plugin list" -ForegroundColor Green
