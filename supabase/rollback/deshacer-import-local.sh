#!/usr/bin/env bash
# Deshace un import de prueba del archivo real sobre la base LOCAL, dejándola exactamente como
# estaba antes: las filas que había, y la secuencia de MRN donde estaba.
#
# Por qué restaura la secuencia: un upsert que termina en conflicto igual consume su nextval
# (Postgres evalúa el DEFAULT de la fila propuesta antes de detectar el conflicto), así que sin
# esto cada iteración deja la numeración de MRN corrida y las pruebas dejan de ser comparables.
set -euo pipefail

DUMP="${1:?uso: deshacer-import.sh <ruta-del-predump.sql>}"
SEQ="${2:?uso: deshacer-import.sh <dump> <last_value-original>}"
CT=supabase_db_eminat-app

[ -f "$DUMP" ] || { echo "no existe el dump: $DUMP" >&2; exit 1; }

echo "antes:  $(docker exec $CT psql -U postgres -d postgres -tAc \
  "SELECT (SELECT count(*) FROM public.pacientes)||' pacientes, '||(SELECT count(*) FROM public.paciente_fuentes)||' fuentes'")"

# paciente_fuentes PRIMERO: la FK es ON DELETE SET NULL, así que al revés quedarían tumbas
# huérfanas apuntando a nada en vez de irse con su paciente.
docker exec $CT psql -U postgres -d postgres -q -c \
  "TRUNCATE public.paciente_fuentes; DELETE FROM public.pacientes;"

docker exec -i $CT psql -U postgres -d postgres -q < "$DUMP"

docker exec $CT psql -U postgres -d postgres -tAc \
  "SELECT setval('public.pacientes_mrn_seq', $SEQ, true);" > /dev/null

echo "después: $(docker exec $CT psql -U postgres -d postgres -tAc \
  "SELECT (SELECT count(*) FROM public.pacientes)||' pacientes, '||(SELECT count(*) FROM public.paciente_fuentes)||' fuentes, seq='||(SELECT last_value FROM public.pacientes_mrn_seq)")"
