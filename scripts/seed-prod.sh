# Seed the three PRODUCTION credentials into THIS shell, so the *:production
# scripts can reuse them (just press Enter at each cred prompt) instead of asking
# on every run. See docs/ops/prod-ingest.md "Running several in a row".
#
#   source scripts/seed-prod.sh        # ✅  exports into your current shell
#   ./scripts/seed-prod.sh             # ❌  runs in a child — exports vanish
#
# You MUST source it: a child process cannot export env vars back into the parent
# shell that launched it. The secrets are read straight into exported env vars —
# nothing is written to disk, and `read` input never lands in your shell history.
# Close the terminal, or `unset DATABASE_URL OPENROUTER_API_KEY EMBED_MODEL_ID`,
# to discard them.
#
# Safe by the same argument as scripts/lib/prompt-prod-creds.ts: this only ever
# touches real exported shell env, never .env / .env.local, and the :production
# scripts still show a redacted target + re-confirm (second Y/N) before running.

# --- refuse to run as a child: exports would silently vanish ---
_seed_sourced=0
if [ -n "${ZSH_VERSION:-}" ]; then
  case "$ZSH_EVAL_CONTEXT" in *file*) _seed_sourced=1 ;; esac
elif [ -n "${BASH_VERSION:-}" ]; then
  [ "${BASH_SOURCE[0]}" != "${0}" ] && _seed_sourced=1
fi
if [ "$_seed_sourced" -eq 0 ]; then
  echo "seed-prod.sh must be SOURCED, not executed — otherwise the exports do not"
  echo "reach your shell. Run:  source scripts/seed-prod.sh"
  unset _seed_sourced
  # `return` works when sourced (graceful); falls back to exit when executed.
  return 1 2>/dev/null || exit 1
fi
unset _seed_sourced

printf 'Seed PRODUCTION credentials into this shell (Ctrl-C to abort)\n'

printf '  DATABASE_URL (postgres://…): '
read -r DATABASE_URL
printf '  OPENROUTER_API_KEY: '
read -rs OPENROUTER_API_KEY
printf '\n'
printf '  EMBED_MODEL_ID (Enter for qwen/qwen3-embedding-8b): '
read -r EMBED_MODEL_ID
[ -z "$EMBED_MODEL_ID" ] && EMBED_MODEL_ID="qwen/qwen3-embedding-8b"

export DATABASE_URL OPENROUTER_API_KEY EMBED_MODEL_ID

case "$DATABASE_URL" in
  postgres://* | postgresql://*) ;;
  *) printf '  ⚠️  DATABASE_URL does not start with postgres:// — double-check it.\n' ;;
esac

# Redacted confirmation: mask the DB password, and the key down to its last 4
# chars — but only when the key is long enough that the last 4 isn't most of it.
# A short/garbage value is fully masked rather than echoed back.
_seed_db_redacted=$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:/@]+:)[^@]*@#\1***@#')
if [ "${#OPENROUTER_API_KEY}" -gt 8 ]; then
  _seed_key_redacted="…${OPENROUTER_API_KEY: -4}"
else
  _seed_key_redacted="***"
fi
printf '\nseeded for this shell:\n'
printf '  DATABASE_URL        %s\n' "$_seed_db_redacted"
printf '  OPENROUTER_API_KEY  %s\n' "$_seed_key_redacted"
printf '  EMBED_MODEL_ID      %s\n' "$EMBED_MODEL_ID"
printf '\nNow run the *:production scripts — press Enter at each cred prompt to reuse.\n'
unset _seed_db_redacted _seed_key_redacted
