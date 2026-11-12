#!/usr/bin/env sh
# Applies supabase/migrations/*.sql in order against a DISPOSABLE Postgres — a new container,
# a new volume, destroyed on exit. The only gate that catches a broken migration today is CI's
# `e2e` job (via `supabase start`), and that runs AFTER the push. This does the same thing in
# seconds, locally, without the rest of the stack (auth/rest/studio/...) or the 70 tests.
#
# Uses the `supabase/postgres` image, not a vanilla Postgres one: that image creates the
# `auth`/`extensions`/etc. schemas on boot, which several migrations assume (`auth.uid()`,
# `extensions.uuid_generate_v4()`). It reuses whichever tag `supabase start` already cached —
# no repull, and it never touches the dev stack (different container, different port).
set -e

HOST="127.0.0.1"

if ! docker info >/dev/null 2>&1; then
  if [ "$CI" = "true" ]; then echo "✖ migraciones-base-fresca: docker not available in CI"; exit 1; fi
  echo "⊘ migraciones-base-fresca: docker is not running, skipped (the hard gate is CI)"
  exit 0
fi

IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '/supabase/postgres:' | sort -V | tail -1)
if [ -z "$IMAGE" ]; then
  if [ "$CI" = "true" ]; then echo "✖ migraciones-base-fresca: no supabase/postgres image in CI"; exit 1; fi
  echo "⊘ migraciones-base-fresca: no supabase/postgres image cached (run 'pnpm supabase start' once), skipped"
  exit 0
fi

CONTAINER="eminat-app-migraciones-fresca-$$"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1' EXIT

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -P "$IMAGE" >/dev/null
PORT=$(docker port "$CONTAINER" 5432/tcp | head -1 | sed 's/.*://')

READY=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 \
    && PGPASSWORD=postgres psql -h "$HOST" -p "$PORT" -U postgres -c 'SELECT 1 FROM auth.users LIMIT 0' >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != 1 ]; then
  echo "✖ migraciones-base-fresca: the disposable Postgres never became ready (auth schema missing)"
  exit 1
fi

DB_URL="postgresql://postgres:postgres@$HOST:$PORT/postgres"
LOG="/tmp/migraciones-base-fresca.$$"

# The supabase/postgres image creates the storage SCHEMA on boot, but storage.buckets and
# storage.objects are created by the Storage API service's own migrations, which this
# disposable Postgres-only container never runs. Every real target (local `supabase start`,
# CI's e2e job, production) has those tables before any app migration runs, so mirror their
# shape here — otherwise any migration that touches storage.* fails this check regardless of
# ordering. Columns match the live local instance (`\d storage.buckets` / `\d storage.objects`).
STORAGE_BOOTSTRAP="/tmp/migraciones-base-fresca-storage.$$.sql"
cat >"$STORAGE_BOOTSTRAP" <<'SQL'
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  owner_id text,
  user_metadata jsonb
);

GRANT ALL ON storage.buckets, storage.objects TO postgres;
SQL
# `postgres` isn't a real superuser in this image (no CREATE on schema storage, and granting
# supabase_admin membership is blocked outright) — supabase_admin is the actual superuser here,
# same password, so only this bootstrap step connects as it.
ADMIN_DB_URL="postgresql://supabase_admin:postgres@$HOST:$PORT/postgres"
if ! psql "$ADMIN_DB_URL" -v ON_ERROR_STOP=1 -q -f "$STORAGE_BOOTSTRAP" >"$LOG" 2>&1; then
  cat "$LOG"
  rm -f "$LOG" "$STORAGE_BOOTSTRAP"
  echo "✖ migraciones-base-fresca: failed to bootstrap the minimal storage.buckets/storage.objects mirror"
  exit 1
fi
rm -f "$STORAGE_BOOTSTRAP"

for f in supabase/migrations/*.sql; do
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f" >"$LOG" 2>&1; then
    cat "$LOG"
    rm -f "$LOG"
    echo "✖ migraciones-base-fresca: $f failed against a fresh database"
    exit 1
  fi
  rm -f "$LOG"
done
echo "✓ migraciones-base-fresca: every migration applies in order against a fresh database"
