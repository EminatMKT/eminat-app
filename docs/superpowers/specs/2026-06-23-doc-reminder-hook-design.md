# Hook de git: recordatorio de actualizar README.md / CLAUDE.md — Diseño

**Fecha:** 2026-06-23
**Estado:** En diseño — pendiente de aprobación
**Autor:** EminatMKT (con asistencia)

## Contexto y problema

La documentación del proyecto (`CLAUDE.md`, `README.md`) describe arquitectura, roles, módulos
y convenciones. Cuando se cambia algo estructural y **no** se toca la doc, queda mintiendo
(p.ej. la feature de roles dinámicos deja obsoleta la sección "Roles de usuario" de `CLAUDE.md`).
Nadie se acuerda de actualizarla en el momento. Queremos un **recordatorio automático**.

## Objetivo

Avisar al dev, en el momento de compartir cambios, cuando el changeset toca **paths
estructurales** pero **no** incluye `README.md` ni `CLAUDE.md` — para que decida si la doc
quedó desactualizada.

## Decisiones de diseño

- **Recordar, no bloquear.** El hook **nunca** corta el push (siempre `exit 0`). Bloquear por
  docs es molesto y se termina bypasseando con `--no-verify` (y entrena a ignorar el hook). Es
  un aviso amarillo, no un gate.
- **En `pre-push`, no `pre-commit`.** El push es el momento de "compartir" — el aviso sale una
  vez por push, no en cada commit (que sería ruidoso). Se **reusa el `.githooks/pre-push`
  existente** (el proyecto ya tiene `core.hooksPath=.githooks`), agregando el chequeo como
  último paso, después del typecheck+tests.
- **Heurística de disparo:** si los archivos del rango a pushear matchean algún **glob
  estructural** y **ninguno** es `README.md`/`CLAUDE.md` → avisar. Si la doc ya está en el
  push, silencio (se asume atendida).

## Paths estructurales (configurable en el hook)

Lista inline en el script (un `case`/grep), fácil de editar:

```
shared/auth/permissions.*     middleware.ts
supabase/migrations/*         app/(app)/*/page.tsx      (rutas/módulos)
shared/**                     features/*/index.*        (API pública de features)
package.json                  (deps/scripts)
```

> Criterio: paths cuyo cambio suele alterar algo **documentado** (roles, módulos, esquema,
> arquitectura, stack). No se dispara por cambios de UI internos, estilos, tests, etc.

## Comportamiento

```
▶ pre-push: typecheck + tests        (lo existente, hard gate)
...
⚠ pre-push: tocaste paths estructurales (shared/auth/permissions.ts, supabase/migrations/…)
   y el push no incluye README.md ni CLAUDE.md. ¿La doc quedó al día?
   (esto es solo un aviso — el push sigue)
✓ pre-push OK
```

- Computa los archivos del rango leyendo el **stdin de pre-push** (`<local_ref> <local_sha>
  <remote_ref> <remote_sha>` por línea): `git diff --name-only $remote_sha..$local_sha`.
  Caso rama nueva (remote_sha = ceros) → diff contra la rama por defecto (`origin/HEAD`) o,
  fallback, listar todos los commits a pushear.
- Filtra por los globs estructurales; si hay match y `README.md`/`CLAUDE.md` no están en la
  lista → imprime el aviso. Siempre `exit 0`.

## Archivos

- **Editar** `.githooks/pre-push` (único archivo). ~15 líneas POSIX `sh`, mismo estilo que el
  hook actual (markers `▶ ⚠ ✓`, sin dependencias nuevas). Versionado, se comparte solo con el
  repo (ya está `core.hooksPath=.githooks`).

## Fuera de alcance

- **Verificar que la doc esté *correcta*** (no solo presente) — imposible automatizar bien;
  el hook solo recuerda.
- **Bloquear / requerir confirmación interactiva** — el stdin en `pre-push` no es TTY confiable
  y bloquear es contraproducente.
- **Detección semántica** de qué sección de la doc actualizar — fuera de alcance; el dev decide.

## Verificación

- Push con cambio en `shared/auth/permissions.ts` sin tocar docs → aparece el aviso, el push
  procede.
- Mismo push incluyendo `CLAUDE.md` → sin aviso.
- Push que solo toca un componente de UI → sin aviso.
- `git push --no-verify` → no corre (esperado).
