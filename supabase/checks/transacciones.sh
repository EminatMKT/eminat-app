#!/usr/bin/env sh
# Runs the transaction checks against LOCAL Supabase: atomicity and the 409 in transacciones.sql,
# then a real two-session lock: while session A holds a task, session B's write has to wait.
set -e
# The local URL comes from the CLI, so it follows whatever port config.toml sets.
[ -z "$SUPABASE_DB_URL" ] && eval "$(pnpm exec supabase status -o env 2>/dev/null | grep '^DB_URL=')"
PSQL_URL="${SUPABASE_DB_URL:-$DB_URL}"

if [ -z "$PSQL_URL" ] || ! psql "$PSQL_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  if [ "$CI" = "true" ]; then echo "✖ transacciones: no Postgres reachable in CI"; exit 1; fi
  echo "⊘ transacciones: local Supabase is not running, skipped (CI is the hard gate)"
  exit 0
fi

psql "$PSQL_URL" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/transacciones.sql"

ACT=$(psql "$PSQL_URL" -Atc "SELECT id FROM public.actividades LIMIT 1")
LOCK_ERR=$(mktemp)
# Session A: lock the task and hold it for 3 seconds, then roll back.
psql "$PSQL_URL" -q -c "BEGIN; SELECT 1 FROM public.actividades WHERE id = '$ACT' FOR UPDATE; SELECT pg_sleep(3); ROLLBACK;" >/dev/null &
HOLDER=$!
sleep 1
# Session B: must hit the lock (55P03), never write past it.
if psql "$PSQL_URL" -q -v ON_ERROR_STOP=1 -c "SET lock_timeout = '300ms'; BEGIN; SELECT public.set_actividad_responsables('$ACT', ARRAY[]::uuid[]); ROLLBACK;" 2>"$LOCK_ERR"; then
  wait $HOLDER
  echo "✖ transacciones: set_actividad_responsables did not wait for the lock"
  exit 1
fi
wait $HOLDER
grep -q "lock timeout" "$LOCK_ERR" || { cat "$LOCK_ERR"; exit 1; }
echo "✔ transacciones: the second writer waits for the first"
