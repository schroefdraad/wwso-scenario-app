#!/bin/bash
# PostToolUse (Edit|Write): formatteer het bewerkte bestand met Prettier.
# Alleen voor code- en configbestanden; de rest (markdown, pdf, json-data) laten we met rust.
f=$(jq -r '.tool_input.file_path // empty')
[ -z "$f" ] && exit 0
case "$f" in
  *.ts|*.tsx|*.js|*.mjs|*.css|*.json) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f "$f" ] || exit 0
pnpm exec prettier --write "$f" >/dev/null 2>&1 || true
exit 0
