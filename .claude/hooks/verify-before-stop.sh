#!/bin/bash
# Stop: draai typecheck en tests als er iets is gewijzigd. Bij een fout exit 2,
# zodat Claude doorwerkt in plaats van "klaar" te melden.
input=$(cat)
# Voorkom een lus: als Claude al doorwerkt na een eerdere blokkade, niet opnieuw blokkeren.
if [ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then exit 0; fi
cd "$CLAUDE_PROJECT_DIR" || exit 0
# Geen wijzigingen (bijv. alleen een vraag beantwoord): niets te controleren.
[ -z "$(git status --porcelain)" ] && exit 0
out=$(pnpm typecheck 2>&1 && pnpm test 2>&1)
if [ $? -ne 0 ]; then
  echo "Typecheck of tests falen. Los dit op voordat je klaar meldt:" >&2
  echo "$out" | tail -40 >&2
  exit 2
fi
exit 0
