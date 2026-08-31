#!/usr/bin/env sh
# Corre el centinela, que ya no vive en este repo: es un plugin instalado por desarrollador
# (`b907aec` sacó el motor, `9f3a357` las reglas). Ese commit borró los scripts `rules:*` de
# package.json pero dejó el `pre-push` llamándolos, así que desde entonces TODO push moría con
# "Did you mean build:check?" y las tres verificaciones no corrían para nadie.
#
# Existe este intermediario y no una ruta en cada script por dos motivos:
#
# 1. El caché del plugin va por versión (`cache/<marketplace>/centinela/<VERSION>/`), así que una
#    ruta fija se rompe sola en la próxima actualización. Acá se resuelve la más nueva.
# 2. La ausencia del plugin no puede abortar. En CI no está —es privado y el runner no puede
#    clonarlo, decisión escrita en ci.yml— y en la máquina de alguien que no lo usa tampoco. Un
#    gate que frena por eso se saltea con --no-verify, y de paso se saltea el typecheck y los
#    tests. Se avisa y se sigue: lo que no puede pasar es que falte en silencio.
#
# Sale 0 cuando no está instalado, y con el código del motor cuando sí.
CENTINELA=$(ls -d "$HOME"/.claude/plugins/cache/*/centinela/*/motor/main.ts 2>/dev/null | sort -V | tail -1)
if [ -z "$CENTINELA" ]; then
  echo "⚠ centinela no instalado: '$*' no se verificó. Ver rules/README.md"
  exit 0
fi
exec bun "$CENTINELA" "$@"
