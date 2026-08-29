#!/usr/bin/env sh
# Corre supabase/checks/rls-encendida.sql contra el Supabase LOCAL.
#
# Si el stack no está levantado, SALTA en vez de fallar: en pre-push, un check que exige
# `supabase start` para poder pushear se saltea con --no-verify y deja de existir. El gate duro
# es el CI, donde el job e2e ya levanta el stack y ahí no hay salida.

set -e
PSQL_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if ! psql "$PSQL_URL" -c 'SELECT 1' >/dev/null 2>&1; then
  if [ "$CI" = "true" ]; then
    echo "✖ rls: no hay Postgres en $PSQL_URL y estamos en CI — el stack tiene que estar arriba"
    exit 1
  fi
  echo "⊘ rls: Supabase local no está levantado, se saltea (el gate duro es CI)"
  exit 0
fi

psql "$PSQL_URL" -v ON_ERROR_STOP=1 -q -f "$(dirname "$0")/rls-encendida.sql"
echo "✓ rls: toda tabla de public tiene RLS encendida (salvo la deuda declarada en el .sql)"
