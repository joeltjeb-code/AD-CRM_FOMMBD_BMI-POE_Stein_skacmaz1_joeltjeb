#!/usr/bin/env bash
# Installiert Vibe im Codespace. Laeuft einmal beim Erstellen, ohne Rueckfragen.
# Werkzeuge und Skills kommen aus .vibe/ in diesem Repo.
set -euo pipefail
curl -LsSf https://mistral.ai/vibe/install.sh | bash
# MCP-Pakete vorab laden, damit der erste Start von vibe nicht wartet
"$HOME/.local/bin/uvx" mcp-server-fetch --help >/dev/null 2>&1 || true
npx -y @upstash/context7-mcp@latest --help >/dev/null 2>&1 || true
echo "Vibe Lab Setup fertig" > "$HOME/.vibelab-setup.log"
