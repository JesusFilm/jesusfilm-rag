#!/usr/bin/env bash
#
# copy-raws.sh — bulk-copy ONE source's raw_documents rows local → prod, so prod
# can re-embed the source WITHOUT re-fetching it. Zero Firecrawl credits in prod.
#
# WHY THIS EXISTS (issue #115, part of #112). For a Firecrawl-WALLED source,
# re-running `acquire:production` would re-scrape the site through Firecrawl and
# pay the metered credit cost a SECOND time (the first was the local acquire).
# `raw_documents` is flat, keyed by `source_key`, with no foreign keys, so one
# source's rows copy local→prod as a single-table operation. `index:production`
# then drains those pending rows (normalize → chunk → embed → write) and never
# fetches — so prod pays for embedding only, and Firecrawl is billed exactly once.
#
#   acquire (local, Firecrawl — the only paid fetch)
#     → index locally → eval        # validate the source before prod sees it
#     → copy-raws.sh → prod         # ingested_at reset to NULL (see GOTCHA)
#     → index:production            # embed in prod, no fetching
#
# WHEN TO USE IT. Primarily walled sources (the credit-saving case). A non-walled
# source CAN use it too (skips a re-crawl), but its normal path is
# `acquire:production` — re-fetching a non-walled source over plain HTTP is free.
# Full ops writeup: docs/ops/copy-raws.md.
#
# THE GOTCHA THIS SCRIPT EXISTS TO PREVENT. `raw_documents.ingested_at` is NULL
# until Ingestion consumes a row; the reader drains `WHERE ingested_at IS NULL`
# and stamps `SET ingested_at = now()`. Because we copy AFTER local indexing,
# every local row is already stamped. Copying verbatim would land pre-stamped
# rows in prod and `index:production` would drain NOTHING — a silent no-op, not
# an error. Fix (no explicit transform): `id` AND `ingested_at` are omitted from
# both column lists, so prod regenerates `id` via gen_random_uuid() and leaves
# `ingested_at` NULL. This also removes any PK-collision risk from reused uuids.
#
# DE-DUP. There is NO unique constraint on (source_key, canonical_url) — the
# table intentionally allows one ingested-history row plus one pending row per
# URL — so a naive copy-all would duplicate pages in prod after any re-acquire.
# The source SELECT is `DISTINCT ON (canonical_url) ... ORDER BY fetched_at DESC`,
# keeping the newest row per URL.
#
# ─── SAFETY (this is a NEW WRITE PATH INTO THE PROD CORPUS) ───────────────────
# It bypasses acquire:production's Y/N gates, so it carries its own guard rails,
# matching the bar in scripts/lib/prompt-prod-creds.ts:
#   • The TARGET (prod) is resolved from  DATABASE_URL || JFRAG_POSTGRESQL_DB_URL
#     — never from .env/.env.local (this script never reads those for the target).
#   • --expect-host <substr>: abort unless the resolved target host contains it
#     (use rlwy.net for Railway). REQUIRED in --non-interactive mode.
#   • Interactive: a redacted target + row counts are shown and re-confirmed (y).
#   • --non-interactive additionally requires JFRAG_ALLOW_PROD_WRITE=1, so a
#     stray --non-interactive can never start an unattended prod write on its own.
#   • Refuses to run if the target already has rows for this source (duplication
#     guard) unless --force is passed.
# Credentials live only in memory (env / doppler-injected); nothing touches disk.
#
# ─── USAGE ───────────────────────────────────────────────────────────────────
#   Interactive (seed prod creds once, then run):
#     source scripts/seed-prod.sh            # exports DATABASE_URL=<prod> …
#     bash scripts/copy-raws.sh --source everystudent
#
#   Unattended / agent (creds from doppler forge-rag/prd):
#     doppler run --project forge-rag --config prd -- \
#       env JFRAG_ALLOW_PROD_WRITE=1 \
#       bash scripts/copy-raws.sh --source everystudent \
#         --non-interactive --expect-host rlwy.net
#
#   Dry run (no write; resolves + counts + host-guard check only):
#     doppler run --project forge-rag --config prd -- \
#       bash scripts/copy-raws.sh --source everystudent --expect-host rlwy.net --dry-run
#
# The SOURCE (local) DB is SRC_DATABASE_URL, or DATABASE_URL from the repo .env
# if unset. Exit codes: 0 ok · 2 usage · 3 fail-closed (creds/host/guard).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The raw_documents columns to copy — id and ingested_at DELIBERATELY absent
# (see "THE GOTCHA" above). Keep the two lists identical and in the same order.
COLS="source_key, url, canonical_url, title, raw_content, status, body_hash, etag, last_modified, fetched_at, not_modified"

usage() {
  sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//; s/^#$//'
  exit "${1:-2}"
}

redact() { printf '%s' "$1" | sed -E 's#(://[^:/@]+:)[^@]*@#\1***@#'; }
host_of() { printf '%s' "$1" | sed -E 's#^[a-z]+://[^@]*@?([^:/?]+).*#\1#'; }
die()    { printf '✗ %s\n' "$1" >&2; exit "${2:-3}"; }

# ─── parse args ───────────────────────────────────────────────────────────────
SRC_KEY=""
NON_INTERACTIVE=0
EXPECT_HOST=""
DRY_RUN=0
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --source)          SRC_KEY="${2:-}"; [ -z "$SRC_KEY" ] && die "--source needs a value" 2; shift 2 ;;
    --non-interactive|--yes|-y) NON_INTERACTIVE=1; shift ;;
    --expect-host)     EXPECT_HOST="${2:-}"; [ -z "$EXPECT_HOST" ] && die "--expect-host needs a value" 2; shift 2 ;;
    --dry-run)         DRY_RUN=1; shift ;;
    --force)           FORCE=1; shift ;;
    -h|--help)         usage 0 ;;
    *)                 die "unknown argument: $1" 2 ;;
  esac
done

[ -z "$SRC_KEY" ] && die "--source <key> is required" 2
# source_key is interpolated into SQL below; constrain it to a safe charset so it
# can never carry an injection. (Matches the registry key convention.)
printf '%s' "$SRC_KEY" | grep -qE '^[a-z0-9][a-z0-9-]*$' \
  || die "invalid --source '$SRC_KEY' (allowed: lowercase letters, digits, hyphen)" 2

command -v psql >/dev/null 2>&1 || die "psql not found on PATH"

# ─── resolve SOURCE (local) ───────────────────────────────────────────────────
SRC_URL="${SRC_DATABASE_URL:-}"
if [ -z "$SRC_URL" ] && [ -f "$ROOT/.env" ]; then
  # Read the local dev DATABASE_URL straight from .env (the target NEVER comes
  # from here — only the local source side does).
  SRC_URL="$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | cut -d= -f2- | sed -E 's/^["'\'']//; s/["'\'']$//')"
fi
[ -z "$SRC_URL" ] && die "no local source DB: set SRC_DATABASE_URL or a DATABASE_URL in $ROOT/.env"

# ─── resolve TARGET (prod) — plain-name first, then doppler JFRAG_ fallback ───
DST_URL="${DATABASE_URL:-}"
[ -z "$DST_URL" ] && DST_URL="${JFRAG_POSTGRESQL_DB_URL:-}"
[ -z "$DST_URL" ] && die "no target DB: export DATABASE_URL (prod) or run under 'doppler run --project forge-rag --config prd'"

case "$DST_URL" in postgres://*|postgresql://*) ;; *) die "target DATABASE_URL is not a postgres URL" ;; esac

SRC_HOST="$(host_of "$SRC_URL")"
DST_HOST="$(host_of "$DST_URL")"

# ─── guard rails ──────────────────────────────────────────────────────────────
[ "$SRC_URL" = "$DST_URL" ] && die "source and target are the SAME database — refusing"

if [ -n "$EXPECT_HOST" ]; then
  # Exact host, or a dot-boundary subdomain — deliberately STRICTER than
  # prompt-prod-creds.ts's substring match, so "rlwy.net" can't be satisfied by
  # "evilrlwy.net" or "rlwy.net.attacker". Our real target zephyr.proxy.rlwy.net
  # matches *.rlwy.net.
  case "$DST_HOST" in
    "$EXPECT_HOST" | *".$EXPECT_HOST") ;;
    *) die "--expect-host '$EXPECT_HOST' does not match target host '$DST_HOST'" ;;
  esac
fi

if [ "$NON_INTERACTIVE" -eq 1 ]; then
  [ -z "$EXPECT_HOST" ] && die "--non-interactive requires --expect-host <substr> (e.g. rlwy.net)"
  [ "${JFRAG_ALLOW_PROD_WRITE:-}" = "1" ] || [ "$DRY_RUN" -eq 1 ] \
    || die "non-interactive prod WRITE refused: set JFRAG_ALLOW_PROD_WRITE=1 as a deliberate second signal"
fi

# ─── counts (evidence) ────────────────────────────────────────────────────────
SRC_TOTAL="$(psql "$SRC_URL" -tAX -c "SELECT count(*) FROM raw_documents WHERE source_key = '$SRC_KEY';")"
SRC_DISTINCT="$(psql "$SRC_URL" -tAX -c "SELECT count(DISTINCT canonical_url) FROM raw_documents WHERE source_key = '$SRC_KEY';")"
DST_EXISTING="$(psql "$DST_URL" -tAX -c "SELECT count(*) FROM raw_documents WHERE source_key = '$SRC_KEY';")"

[ "$SRC_TOTAL" -eq 0 ] && die "local source '$SRC_KEY' has 0 raw_documents rows — nothing to copy"

if [ "$DST_EXISTING" -ne 0 ] && [ "$FORCE" -ne 1 ]; then
  die "target already has $DST_EXISTING '$SRC_KEY' rows — refusing to duplicate (no unique constraint on (source_key,canonical_url)). Re-run with --force only if you intend to append."
fi

# ─── summary ──────────────────────────────────────────────────────────────────
cat <<EOF

⚠️  COPY raw_documents  (local → PROD)
   source key   : $SRC_KEY
   FROM (local) : $(redact "$SRC_URL")   host=$SRC_HOST
   TO   (prod)  : $(redact "$DST_URL")   host=$DST_HOST
   rows to copy : $SRC_DISTINCT distinct canonical_url  (of $SRC_TOTAL total; newest per URL)
   target now   : $DST_EXISTING existing '$SRC_KEY' rows$([ "$DST_EXISTING" -ne 0 ] && echo '  (--force append)')
   columns      : $COLS
                  (id + ingested_at omitted → prod regenerates uuid, ingested_at stays NULL)
EOF

if [ "$DRY_RUN" -eq 1 ]; then
  printf '\n✓ dry run — nothing written.\n'
  exit 0
fi

if [ "$NON_INTERACTIVE" -ne 1 ]; then
  printf '\nProceed with the copy into PROD? [y/N] '
  read -r reply
  case "$reply" in y|Y|yes|YES) ;; *) printf 'aborted.\n'; exit 0 ;; esac
fi

# ─── the copy ─────────────────────────────────────────────────────────────────
# Stream COPY-out (source) straight into COPY-in (target). pipefail makes a
# failed source read abort the whole pipe. ON_ERROR_STOP makes the target abort
# on any error (the COPY is one statement, so it is all-or-nothing).
psql "$SRC_URL" -qAtX -c \
  "COPY (SELECT DISTINCT ON (canonical_url) $COLS FROM raw_documents WHERE source_key = '$SRC_KEY' ORDER BY canonical_url, fetched_at DESC) TO STDOUT" \
| psql "$DST_URL" -qX -v ON_ERROR_STOP=1 -c \
  "COPY raw_documents ($COLS) FROM STDIN"

# ─── verify ───────────────────────────────────────────────────────────────────
DST_AFTER="$(psql "$DST_URL" -tAX -c "SELECT count(*) FROM raw_documents WHERE source_key = '$SRC_KEY';")"
DST_PENDING="$(psql "$DST_URL" -tAX -c "SELECT count(*) FROM raw_documents WHERE source_key = '$SRC_KEY' AND ingested_at IS NULL;")"

# Always suggest a concrete host in the follow-up, even if --expect-host was
# omitted (interactive runs) — index:production --non-interactive requires one.
NEXT_HOST="${EXPECT_HOST:-$DST_HOST}"

cat <<EOF

✓ copy complete.
   prod '$SRC_KEY' rows : $DST_EXISTING → $DST_AFTER
   pending (ingested_at IS NULL, ready for index:production) : $DST_PENDING

Next (embed the copied rows — the metered OpenRouter step, separate from this copy):
   doppler run --project forge-rag --config prd -- env JFRAG_ALLOW_PROD_WRITE=1 \\
     pnpm index:production --non-interactive --expect-host $NEXT_HOST --source $SRC_KEY
EOF
