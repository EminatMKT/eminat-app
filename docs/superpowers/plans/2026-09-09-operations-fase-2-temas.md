# `operations` — Fase 2: `temas` sube a tabla propia

> **Para quien ejecute esto:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan
> checkbox (`- [ ]`).

**Objetivo:** que un asunto tratado en cinco reuniones sea **una** fila y no cinco títulos
repetidos — `temas` como tabla propia, `reunion_temas` como puente N:N, `tema_para_acta()` como
único camino de alta, y una pantalla en `/admin` para administrar el catálogo.

**Arquitectura:** el título del asunto se separa del texto de lo que se dijo ese día. `temas`
guarda el título (único por empresa, normalizado con `lower(btrim(...))`); `reunion_temas` guarda
el **tratamiento** — la reunión, el tema, la posición y la descripción. El alta no entra por un
`INSERT` del cliente sino por una función `SECURITY DEFINER`, porque el índice único es un oráculo
que confirma la existencia de asuntos que la RLS esconde. Y como `reunion_temas` tiene **0 filas**,
todo esto es partir una tabla vacía.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres 17) + TypeScript + Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-operations-unificacion-design.md`, §2.3, §3.1, §3.1.1
y §8.

**Fase anterior:** `docs/superpowers/plans/2026-09-09-operations-fase-1-slug.md` (ejecutada
entera; su ledger está en `.superpowers/sdd/2026-09-09-operations-fase-1-slug/progress.md`).

---

## Restricciones globales

- **`main` no acepta push directo:** hay un ruleset, todo va por PR.
- **`pnpm supabase db reset` está PROHIBIDO en este repo:** `config.toml` apunta `sql_paths` a un
  `seed.sql` inexistente y un reset borra las actividades sin que ningún seed las restaure. Para
  aplicar migraciones en local: `pnpm supabase migration up`.
- **`db push` aplica TODAS las migraciones pendientes**, no sólo la última. `pnpm supabase
  migration list --linked` antes de cada push a prod.
- **`db push` aplica cada archivo en su propia transacción**, así que la migración de esta fase va
  envuelta en su propio `BEGIN; … COMMIT;`.
- **Probar permisos con una cuenta de admin no prueba nada:** `has_module()` abre con
  `is_admin() OR …`, y `puedo_ver_reunion()` también. Toda verificación de acceso de esta fase se
  hace con una cuenta que **no** es admin.
- **La RLS se verifica consultando como `anon`**, no leyendo el esquema. `pnpm db:rls` sólo mira
  `relrowsecurity`: es necesario y no alcanza (punto ciego de las vistas, 31/08).
- **Nada persistido se renombra.** En esta fase eso significa: `'tab-admin'` (el `prefKey` de
  `useUserPreference` en `AdminModule/index.tsx:35`) **no se toca**; agregarle un valor nuevo a la
  unión sí, renombrar la clave no. Una clave guardada renombrada resetea el estado de gente real y
  no produce ningún error.
- **No commitear sin que Wagner apruebe:** dejar el árbol listo, correr el gate, mostrar qué entra.
- **Techo de archivo:** el centinela frena a las **50 líneas de código** (`archivo_extenso`,
  blando) y a las 150 (`archivo_indivisible`, duro). Todo componente nuevo de esta fase entra
  abajo de 50. Si uno se pasa, se parte — no se firma una exención.
- **`prod` es la única fuente autoritativa de `role_modules` y de los conteos de filas.** Local
  está drifteado: hoy `reuniones` → `admin, stratix360` en local y `admin, medico_investigacion`
  en prod (verificado el 09/09 contra las dos bases, §8.1 del spec).

---

## Lo que esta fase NO hace

- **No absorbe el módulo `reuniones`.** Su slug sigue vivo, `/reuniones` sigue siendo su ruta y
  `reuniones_select` / `reuniones_insert` siguen gateadas por `has_module('reuniones')`
  (verificado en `pg_policies` el 09/09). De ahí sale la restricción del gate de dos slugs
  (Tarea 2, decisión D3).
- **No escribe la UI del tratamiento** — el modal donde se cargan los puntos del orden del día con
  sus tareas es la fase 3 (§8 del spec). Después de esta fase `reunion_temas` sigue sin ninguna
  pantalla: `grep -rn "reunion_temas" src/` da **cero**, y sigue dando cero.
- **No escribe el buscar-o-crear del acta.** `tema_para_acta()` queda escrita, probada y sin
  consumidor en el bundle: es la superficie que la fase 3 llama. La pieza de UI —que no existe y
  que `CatalogoSelect` no puede cubrir— es de la fase 3.
- **No borra `reunion_pendientes`** ni toca el cuerpo de `log_reunion()`. El `DROP` de §3.4 va con
  la fase 3, que es la que lo necesita.
- **No reparte ningún módulo nuevo.** `medico_investigacion` **no** gana `operations` acá: eso lo
  vuelve liquidable (§2.5) y es una decisión de nómina, no un efecto colateral de una migración de
  catálogo.
- **No toca `actividades`.** Ni `fecha_entrega_original`, ni el renombre, ni el `NOT NULL` de
  `responsable_id`: son las fases 5 y 6.

---

## Orden de despliegue, y por qué

Las seis fases se despliegan **juntas, al final** (§8 del spec). Esta fase no se pushea sola. Pero
su archivo de migración tiene que quedar **ordenado entre la apertura y el cierre de la fase 1**,
y eso impone dos cosas concretas:

| Migración | Timestamp | Qué |
|---|---|---|
| `operations_slug_abre` (1A) | `20260909222149` | ya commiteada |
| **`temas_catalogo` (esta fase)** | **`20260909230000`** | escrito a mano, no generado |
| `operations_slug_cierra` (1C) | `20260909233746` | ya commiteada |

1. **`pnpm supabase migration new` NO sirve acá.** Genera la hora actual, que cae **después** del
   cierre de la fase 1. El archivo se crea con el nombre literal
   `supabase/migrations/20260909230000_temas_catalogo.sql`.
2. **Local ya tiene aplicada la `20260909233746`** (verificado en
   `supabase_migrations.schema_migrations`), así que un archivo con timestamp anterior queda
   *fuera de orden* y `migration up` a secas no lo agarra. Se aplica con
   `pnpm supabase migration up --include-all` (flag verificado en la CLI 2.106).
3. **Por qué antes del cierre y no después.** La secuencia de producción es *pushear la apertura →
   mergear y desplegar → pushear el cierre* (§8.1). El bundle que se despliega en el paso del medio
   ya trae la pantalla de `/admin` de esta fase: si la tabla `temas` llegara recién con el cierre,
   ese bundle pediría una tabla que no existe. Y al revés no rompe: `temas` es una tabla nueva que
   el bundle viejo no conoce, o sea inerte para lo que está corriendo — que es justo lo que la
   regla *«el esquema se despliega antes que el código»* pide.

⚠️ **El timestamp intermedio no alcanza: `db push` no sabe parar en la apertura.** (Segunda
pasada, 09/09.) `db push` aplica **todas** las pendientes, y `20260909233746` (1C) ya está en la
carpeta: "pushear la apertura" aplica 1A + ésta + 1C **de un solo viaje**, y la convivencia que
§8.1 describe no ocurre. El plan de la fase 1 tampoco dice cómo pushear 1A sola (sus pasos 7 de
las Tareas 2 y 5 son el mismo `db push`). Y el mismo razonamiento del punto 3 vale para las
fases 3, 4 y 5: su esquema también lo pide el bundle del paso del medio, y sus archivos van a
tener timestamp **posterior** a 1C. Conclusión: **1C tiene que ser la última migración que se
aplica, no la que tiene el timestamp más viejo después de ésta.** La forma que no toca
`schema_migrations` de local es sacar `20260909233746_operations_slug_cierra.sql` de la carpeta
durante el push de apertura y devolverla para el push de cierre — renombrarla con un timestamp
nuevo la haría "pendiente" otra vez en local. Va como decisión pendiente de Wagner al runbook de
la Tarea 8; sin ella, el orden de este archivo es cosmético.

---

## Estructura de archivos

**Se crean:**

*Base de datos*
- `supabase/migrations/20260909230000_temas_catalogo.sql` — la tabla, el N:N, `puedo_ver_reunion`,
  la RLS, `tema_para_acta()` y los dos triggers de auditoría. **Un solo archivo**: la correctitud
  de la función depende de la tabla y de la RLS, y entre archivos no hay atomicidad
  (`rules/base-de-datos.md` · *«Dos migraciones que se necesitan van en un archivo»*).
- `supabase/rollback/operations-temas-rollback.sql` — se escribe **antes** que la migración.
- `supabase/checks/precheck-temas.sql` — el precheck que aborta si `reunion_temas` o
  `reunion_pendientes` no dan cero.

*Datos y tipos*
- `src/shared/data/temas.ts` — el repo (lecturas y escrituras por RLS, sin ruta de API).
- `src/features/admin/utils/filtrarTemas/index.ts` + `index.test.ts` — el filtro puro del buscador.

*UI*
- `src/features/admin/hooks/useTemas/index.ts`
- `src/features/admin/components/TemasManager/index.tsx` + `index.module.css`
- `src/features/admin/components/TemaFila/index.tsx` + `index.module.css`
- `src/features/admin/components/TemaModal/index.tsx`

*Pruebas*
- `e2e/temas-rls.spec.ts` — la RLS contra tres roles reales, por API y sin browser.

**Se modifican:**
- `src/shared/data/tables.ts:30` — `temas: 'temas'` en `TABLES`
- `src/shared/data/index.ts` — el barrel (`temasRepo`). ⚠️ Faltaba en esta lista aunque la
  Tarea 4 lo toca.
- `src/features/reuniones/types.ts` — el tipo `Tema` y el `ReunionTema` con `tema_id`
- `src/features/admin/components/AdminModule/index.tsx:30,35,61,76` — la vista nueva, el guard
  `oneOf` de la preferencia y la condición de la `TabBar`
- `src/shared/components/shell/appShellConfig/subvistas.ts:41-44` — el ítem de sidebar
- `src/shared/i18n/locales/es.json` y `en.json` — **13** claves. ⚠️ Decía 18: cinco de ellas
  (`titulo`, `campoActivo`, `activoHint`, `tratamientos`, `guardado`) no las leía ningún
  componente del plan, y `buscar` estaba escrita y sin enchufar (Tarea 6).
- `e2e/seed.ts` — exportar `H` (los headers de service_role) para que el spec de la Tarea 5
  pueda limpiar lo que crea. ⚠️ Faltaba.

**Se borra:** nada.

---

## Decisiones que el diseño dejaba abiertas

Están acá arriba y no enterradas en un paso, porque cada una cambia el contenido de varias tareas.

### D1 · `temas` tiene pantalla propia; no entra al CRUD config-driven de Organización

El diseño dice *"con el mismo CRUD config-driven"* y §2.3 ya admite que eso no es gratis. Es peor
que no-gratis: **no se puede**, y el motivo no es de tipos sino de la base.

Los seis catálogos de `ORG_CATALOGS` tienen `codigo` **`UNIQUE` global** — verificado en
`pg_constraint`: `empresas_codigo_key`, `equipos_codigo_key`, `cargos_codigo_key`,
`jornadas_codigo_key`, `vinculaciones_codigo_key`, `departamentos_codigo_key`. Y la ruta de alta
lo deriva sola: `api/admin/org/[cat]/route.ts:24` hace `codigo: row.codigo?.trim() ||
codigoFrom(nombre)`. `temas` es único **por empresa**: el "Presupuesto Q4" de EMC y el de Servi-Net
son dos asuntos distintos a propósito (§2.3). `codigoFrom('Presupuesto Q4')` da `PRESUPUESTO_Q4`
para los dos, y el segundo alta reventaría con un 23505 sobre una constraint que no tiene nada que
ver con la regla real. Darle `codigo` a `temas` además viola la convención de FK del repo: no
codifica nada que no esté ya en `titulo`.

Sin `codigo`, adaptar significa volver `codigo` y `nombre` opcionales en `OrgRow`
(`loadAppData.ts:106-117`, hoy los dos `string` a secas). Eso son **16 archivos** y un tipo
permanentemente más flojo:

| | Adaptar `OrgRow`/`OrgManager` | Pantalla propia |
|---|---|---|
| Archivos tocados | **16** | **16** (9 nuevos en `src/`, 7 modificados) ⚠️ decía "9 (6 nuevos, 3 modificados)": contaba carpetas como archivos y omitía `data/index.ts`, `types.ts` y los dos `.json` |
| De ellos, compartidos | 6 (`loadAppData`, `useAppData`, `AppContext`, `data/org.ts`, `tables.ts`, `subvistas.ts`) | 6 (`tables.ts`, `data/index.ts`, `data/temas.ts`, `subvistas.ts`, `es.json`, `en.json`) — pero ninguno cambia un tipo que otro módulo consuma |
| Sitios que leen `.nombre`/`.codigo` sin guarda y habría que blindar | 5 (`OrgManager:32`, `OrgCard:25,31,38`, `CatalogSelect:29`, `useOrgCatalog:41`) | 0 |
| Ruta de API nueva | reusa `/api/admin/org/[cat]` (service_role) | **ninguna** — `temas_update` ya admite `is_admin()` por RLS |
| Efecto sobre lo existente | `OrgRow` deja de garantizar nombre y código para los seis catálogos que sí los tienen | ninguno |

Y el diseño se queda corto en el conteo: dice **seis** lugares y son **nueve**. Faltan
`useOrgCatalog.ts` (tres mapas `Record<OrgCat, …>` que no compilan sin su entrada — el comentario
del archivo lo dice), `AdminModule/index.tsx` (`type Vista` y el `oneOf` de la preferencia
persistida) y `OrgModal.tsx`.

**Decisión: pantalla propia.** `temas` no es un catálogo organizacional: no describe a la
organización, describe de qué se habla en las reuniones, y su unicidad, su RLS y su alta por
función no se parecen a las de los otros seis.

### D2 · `ON CONFLICT … DO UPDATE SET titulo = public.temas.titulo`, no `EXCLUDED.titulo`

§3.1.1 escribe `DO UPDATE SET titulo = EXCLUDED.titulo`. Eso **contradice a la policy
`temas_update` de §3.1**, que bloquea a propósito reescribir el título de un asunto tratado en un
acta cerrada — *"como el título es N:N, eso reescribe las cinco a la vez"*. `tema_para_acta` es
`SECURITY DEFINER`: no pasa por esa policy. Con `EXCLUDED.titulo`, cualquiera que tipee
`"presupuesto q4"` en un acta abierta le reescribe el título al asunto en las otras cuatro,
incluidas las cerradas, por la puerta de atrás.

El `DO UPDATE` está ahí sólo porque `DO NOTHING` no devuelve fila y hace falta el `RETURNING id`.
Se escribe como asignación a sí mismo: el `RETURNING` funciona y el título no se toca. Verificado
contra el Postgres local: insertar `'Presupuesto Q4'` y después `'  presupuesto q4 '` devuelve
**el mismo `id`** y deja **una** fila con el título original.

### D3 · El gate de módulo nombra **dos** slugs: `operations` **OR** `reuniones`

§3.1 escribe `puedo_ver_reunion` con `has_module('operations')` a secas. Con el estado real de hoy
eso deja el módulo mudo para quien lo usa:

- `reuniones_select` sigue siendo `has_module('reuniones') AND (…)` — verificado en `pg_policies`.
- En **producción** `reuniones` es de `admin, medico_investigacion`, y `operations` —que hoy no
  existe ahí: la fase 1 no se pushó— va a ser de `stratix360` (§8.1 del spec). ⚠️ Decía "es de",
  como si prod ya tuviera la fase 1. O sea que `medico_investigacion` puede abrir un acta y **no
  vería ni un tema**, sin ningún error.

Es exactamente la falla que la fase 1 resolvió con la convivencia `operations OR tasks`, girada.
El gate se declara una vez en una variable del `DO`, con `RAISE EXCEPTION` para **cada** slug, y
colapsa a `operations` solo el día que se absorba `reuniones`. Queda anotado en el `.todo`.

### D4 · `temas_select` gana `public.is_admin() OR`

§3.1 no lo tiene, y sin él un tema **creado y todavía sin tratamiento** es invisible para el admin
— así que la pantalla de `/admin` mostraría un catálogo incompleto sin decirlo. No concede nada
nuevo: `puedo_ver_reunion` ya abre con `public.is_admin()`, así que el admin ve toda reunión y por
lo tanto todo tema que tenga tratamiento. Lo único que agrega es el hueco entre el alta y el primer
tratamiento, que es justo lo que hay que poder depurar desde el catálogo.

### D5 · `reunion_temas_select` pasa a `puedo_ver_reunion(reunion_id)`

Hoy es `EXISTS (SELECT 1 FROM reuniones r WHERE r.id = reunion_temas.reunion_id)` — sin gate de
módulo y confiando en que la subconsulta pase por la RLS de `reuniones`. Es literalmente lo que
§3.1 dice que no hay que hacer (*"la visibilidad se escribe, no se hereda por accidente"*). La fase
ya altera esa tabla; se corrige acá y no se paga dos veces.

### D6 · La auditoría se cuelga `AFTER INSERT OR DELETE`, **sin `UPDATE`**, y `log_reunion()` no se toca

§3.4 pide agregarle el trigger a `reunion_temas` y advierte que *"una función no se parchea, se
vuelve a declarar completa"*. Las ramas de `INSERT` y `DELETE` de `log_reunion()`
(`20260830011448:26-60`) son genéricas —`TG_TABLE_NAME` + `NEW.id`— así que la tentación es colgar
el trigger completo y listo.

⚠️ **Probado contra el Postgres local: el trigger completo rompe la tabla.** Con
`AFTER INSERT OR UPDATE OR DELETE ON public.temas`, el segundo `tema_para_acta()` —el que entra por
`ON CONFLICT DO UPDATE`— aborta con:

```
ERROR:  record "old" has no field "estado"
CONTEXT:  SQL expression "TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado"
          PL/pgSQL function log_reunion() line 15 at IF
```

**PL/pgSQL no corta ese `AND`.** La condición entera se planifica como **una** expresión SQL, así
que `OLD.estado` tiene que resolver contra el tipo de la fila **aunque `TG_TABLE_NAME` no sea
`'reuniones'`**. Ni `temas` ni `reunion_temas` tienen `estado`, así que cualquier `UPDATE` sobre
esas dos tablas abortaría — y sobre `reunion_temas` eso significa que **editar la descripción de un
punto sería imposible**, que es la operación central del acta.

**Decisión: los triggers van `AFTER INSERT OR DELETE`.** Con eso las dos ramas que se ejecutan
son las genéricas, las dos retornan antes de llegar a la línea 15, y la función no se toca — así
esta fase no arrastra la rama de `reunion_pendientes` que la fase 3 tiene que sacar. Verificado:
las cinco pruebas de `tema_para_acta` pasan y `historial` registra `temas | created`.

El precio, dicho: no queda rastro del cambio de título ni del `activo`. Se paga en la fase 3, que
ya tiene que volver a declarar `log_reunion()` de todos modos para sacarle `reunion_pendientes`;
ahí el arreglo correcto es **anidar** los `IF` por tabla en vez de combinarlos con `AND`.

### D9 · `tema_para_acta()` ignora `activo` — decisión pendiente de Wagner

⚠️ (Segunda pasada, reproducido contra el Postgres local.) El plan vende `activo` como la baja:
la clave `admin.temas.activoHint` decía *"un tema inactivo deja de ofrecerse"* y el comentario de
`TemaFila` dice *"la baja es `activo`"*. Pero `tema_para_acta()` hace `ON CONFLICT … DO UPDATE
… RETURNING id` sin mirar la columna: desactivar "Presupuesto Q4" y tipearlo desde un acta
**devuelve el mismo `id` y la fila sigue en `activo = false`** —probado—, así que el acta queda
colgada de un asunto que el catálogo dice que no se ofrece. Y ése es el **único** camino de alta
que la fase 3 va a usar. Hoy `activo` sólo existe para el admin que mira la lista.

Las salidas, y por qué ninguna se toma sola acá:

- **Reactivar al conflicto** (`DO UPDATE SET titulo = public.temas.titulo, activo = true`): sin
  oráculo, y coherente con "es el mismo asunto, se volvió a tratar". Pero deja que cualquiera que
  escriba un acta deshaga la baja del admin, y `temas_update` —que la función saltea— no lo
  permitiría.
- **Rechazar con error propio**: le dice al usuario "ese tema existe y está inactivo", que es
  exactamente el oráculo que §3.1.1 cierra.
- **Dejarlo como está**: `activo` es un rótulo del catálogo y nada más. Es lo que la función hace
  hoy, y es lo que la prueba 6 de la Tarea 3 deja **escrito** para que no se descubra en la fase 3.

Se decide antes de la fase 3, que es donde el buscar-o-crear le da consumidor. Mientras tanto
el texto de la UI no puede prometer lo que la función no cumple: por eso `activoHint` sale de las
claves (Tarea 6).

### D7 · Cómo se prueba esto sin admin, y qué se puede probar de verdad en local

Tres escalones, y el tercero dice qué **no** se puede:

1. **`anon`** — `SET ROLE anon; SELECT * FROM public.temas;` en psql tiene que dar
   `permission denied for table temas`. No `pnpm db:rls`, que sólo lee `relrowsecurity` y da verde
   con la tabla abierta de par en par.
2. **Autenticado y no admin** — sin browser: se pide un JWT real a GoTrue
   (`/auth/v1/token?grant_type=password`) y se llama a PostgREST directo con el fixture `request`
   de Playwright. Tres cuentas, con `ensureUser` de `e2e/seed.ts`: `stratix360` (tiene
   `operations`), `medico_investigacion` (⚠️ en **local** no tiene ni `reuniones` ni
   `operations` — verificado en `role_modules` el 09/09; el spec le da `reuniones` a mano) y
   `sin_asignar` (no tiene ninguno). Es la prueba que muerde, y es barata: ni login ni pantallas.

   ⚠️ **Y muerde sólo si escribe.** (Segunda pasada.) Un `SELECT` filtrado por RLS **no rebota**:
   PostgREST devuelve `200 []` tanto si el gate abre y no hay filas como si el gate cierra.
   Reproducido contra el Postgres local con un usuario sin módulo:
   `has_module → false`, `count(*) → 0`, **sin error**. La única operación que una policy hace
   fallar de forma visible es el **`INSERT`** (`42501` → 403). Por eso el caso positivo de la
   Tarea 5 crea un tema por REST y después lo lee; un spec que sólo hace `GET` y espera `[]`
   pasa con la policy en `USING (false)`.
3. **Lo que local no puede probar.** El reparto real de `role_modules` (local: `reuniones` →
   `admin, stratix360`; prod: `admin, medico_investigacion`), o sea que **D3 es exactamente lo que
   el ensayo local no demuestra**: en local `stratix360` tiene los dos slugs y el `OR` no se
   ejercita. Por eso la Tarea 5 monta el caso a mano quitándole la fila de `operations` a un rol de
   prueba. Y tampoco puede probar que prod tenga 0 filas: eso lo contesta el precheck al momento
   del push, no antes.

---

## Tarea 1: El precheck y el rollback, antes que la migración

`reunion_temas` con filas convierte esta migración en pérdida de datos: `DROP COLUMN titulo` se
lleva los títulos y `ADD COLUMN tema_id … NOT NULL` aborta. Los 0 registros del 09/09 son **una
foto**: reuniones está en producción y nada impide que alguien cargue un punto antes del push.

**Files:**
- Create: `supabase/checks/precheck-temas.sql`
- Create: `supabase/rollback/operations-temas-rollback.sql`

**Interfaces:**
- Consume: las tablas `reunion_temas` y `reunion_pendientes` tal como están hoy
- Produce: un script que **aborta** (exit ≠ 0) si cualquiera de las dos tiene filas; y el rollback
  que la Tarea 2 revierte

- [ ] **Paso 1: Escribir el precheck**

Crear `supabase/checks/precheck-temas.sql`:

```sql
-- Precheck de la fase 2 de `operations`. Corre ANTES del backup y del push, contra la base a la
-- que se va a aplicar la migración.
--
-- Por qué existe: la migración hace `DROP COLUMN titulo` sobre `reunion_temas`. Con una sola fila
-- eso es pérdida de datos, y el `ADD COLUMN tema_id … NOT NULL` aborta a mitad de camino. Las "0
-- filas en prod" del diseño son un corte del 09/09, no una garantía: reuniones está en producción.
--
-- `reunion_pendientes` se cuenta acá aunque ESTA fase no la toque: la fase 3 la dropea, la
-- consulta es el mismo viaje, y descubrir que dejó de estar vacía dos fases antes es gratis.
DO $$
DECLARE
  n_temas bigint;
  n_pend  bigint;
BEGIN
  SELECT count(*) INTO n_temas FROM public.reunion_temas;
  SELECT count(*) INTO n_pend  FROM public.reunion_pendientes;

  RAISE NOTICE 'reunion_temas: % filas · reunion_pendientes: % filas', n_temas, n_pend;

  IF n_temas > 0 THEN
    RAISE EXCEPTION E'reunion_temas tiene % filas.\n\n%', n_temas,
      'La migración 20260909230000_temas_catalogo.sql borra la columna `titulo`. Con filas, '
      'esos títulos se pierden y no hay de dónde reconstruirlos. Antes de seguir hay que '
      'escribir el backfill: por cada fila, un `tema` con su (empresa de la reunión, titulo) y '
      'el `tema_id` apuntando ahí. No existe: el diseño se escribió sobre una tabla vacía.';
  END IF;

  IF n_pend > 0 THEN
    RAISE EXCEPTION E'reunion_pendientes tiene % filas.\n\n%', n_pend,
      'Esta fase no la toca, pero la fase 3 la dropea y el diseño entero se apoya en que esté '
      'vacía. Si tiene filas, hay que decidir qué se hace con ellas ANTES de seguir con la '
      'cadena de fases.';
  END IF;
END $$;
```

- [ ] **Paso 2: Correrlo contra local y ver que pasa**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 \
  -f supabase/checks/precheck-temas.sql
```

Expected: `NOTICE: reunion_temas: 0 filas · reunion_pendientes: 0 filas` y exit 0.

- [ ] **Paso 3: Ver que el precheck FALLA cuando tiene que fallar**

Un precheck que nadie vio en rojo no es un precheck. Se prueba en una transacción que se revierte:

⚠️ **El ensayo crea su propia reunión.** La versión anterior hacía `SELECT id … FROM reuniones
LIMIT 1`: con una base local sin reuniones inserta **cero** filas, el precheck da verde, y como
psql corre sin `ON_ERROR_STOP` nadie ve que el rojo nunca apareció. Hoy local tiene 2 reuniones;
mañana puede tener 0. El ensayo no puede depender de eso.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
INSERT INTO public.reuniones (empresa, titulo, fecha)
  VALUES ('EMC', 'ensayo del precheck', CURRENT_DATE);
INSERT INTO public.reunion_temas (reunion_id, posicion, titulo)
  SELECT id, 1, 'ensayo del precheck' FROM public.reuniones WHERE titulo = 'ensayo del precheck';
\i supabase/checks/precheck-temas.sql
ROLLBACK;
SQL
```

Expected: `ERROR: reunion_temas tiene 1 filas.` seguido del `ROLLBACK`. Confirmar después que
`select count(*) from reunion_temas` volvió a dar 0 **y** que no quedó ninguna reunión con ese
título.

- [ ] **Paso 4: Escribir el rollback**

Crear `supabase/rollback/operations-temas-rollback.sql`:

```sql
-- Rollback de 20260909230000_temas_catalogo.sql.
--
-- Devuelve `reunion_temas` a su forma de una-fila-un-título y borra todo lo que la migración
-- creó. Es trivial porque la tabla estaba vacía: si esto se corre con filas cargadas, los
-- títulos que quedan son los de `temas` y hay que copiarlos a mano ANTES (el UPDATE de abajo).
BEGIN;

-- ⚠️ EL ORDEN NO ES LIBRE, Y HAY UNA DEPENDENCIA CIRCULAR. Las policies `temas_select` y
--    `temas_update` leen `reunion_temas.tema_id`, y `reunion_temas.tema_id` tiene una FK a
--    `temas`. Así que `DROP TABLE temas` primero falla por la FK, y `DROP COLUMN tema_id`
--    primero falla por las policies — las dos cosas probadas contra el Postgres local. El corte
--    es dropear las POLICIES antes que nada: eso rompe el lado que no es de esquema.

-- 1. Recuperar el texto antes de romper el vínculo. Con 0 filas no hace nada; con filas, es lo
--    único que evita perder los títulos.
ALTER TABLE public.reunion_temas ADD COLUMN IF NOT EXISTS titulo text;
UPDATE public.reunion_temas rt SET titulo = t.titulo
  FROM public.temas t WHERE t.id = rt.tema_id AND rt.titulo IS NULL;
UPDATE public.reunion_temas SET titulo = '(sin título)' WHERE titulo IS NULL;
ALTER TABLE public.reunion_temas ALTER COLUMN titulo SET NOT NULL;

-- 2. Las policies de `temas`, que son las que dependen de la columna. Van primero.
DROP POLICY IF EXISTS temas_select ON public.temas;
DROP POLICY IF EXISTS temas_insert ON public.temas;
DROP POLICY IF EXISTS temas_update ON public.temas;

-- 3. Los triggers de auditoría que agregó la migración, y la función de alta. `log_reunion()` NO
--    se toca: la migración tampoco la tocó.
DROP TRIGGER IF EXISTS trg_log ON public.reunion_temas;
DROP TRIGGER IF EXISTS trg_log ON public.temas;
DROP FUNCTION IF EXISTS public.tema_para_acta(uuid, text);

-- 4. La columna (que se lleva su FK), y recién después la tabla.
ALTER TABLE public.reunion_temas DROP CONSTRAINT IF EXISTS reunion_temas_unicos;
DROP INDEX IF EXISTS public.reunion_temas_tema_id_idx;
ALTER TABLE public.reunion_temas DROP COLUMN IF EXISTS tema_id;
DROP TABLE IF EXISTS public.temas;

-- 5. La policy de `reunion_temas`, exactamente como la dejó 20260829221511. Va DESPUÉS de la
--    tabla: mientras la nueva versión exista, sigue referenciando `puedo_ver_reunion`.
DROP POLICY IF EXISTS reunion_temas_select ON public.reunion_temas;
CREATE POLICY reunion_temas_select ON public.reunion_temas FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reuniones r WHERE r.id = reunion_temas.reunion_id));

DROP FUNCTION IF EXISTS public.puedo_ver_reunion(uuid);

COMMIT;
```

Este orden está **probado**: deja `reunion_temas` con sus siete columnas originales
(`created_at, descripcion, id, posicion, reunion_id, titulo, updated_at`), sin `temas` y sin
`puedo_ver_reunion`.

- [ ] **Paso 5: El gate y el commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add supabase/checks/precheck-temas.sql supabase/rollback/operations-temas-rollback.sql
git commit -m "chore(db): precheck y rollback de la migración de temas"
```

---

## Tarea 2: La migración — `temas`, el N:N y la RLS

**Files:**
- Create: `supabase/migrations/20260909230000_temas_catalogo.sql`

**Interfaces:**
- Consume: `public.empresas(codigo)`, `public.usuarios(id)`, `public.reuniones`,
  `public.role_modules`, y las funciones `is_admin()`, `usuario_actual_id()`,
  `participa_en_reunion(uuid)`, `misma_empresa_reunion(uuid)`, `reunion_abierta(uuid)`
  (verificadas en `pg_proc`, las cinco `SECURITY DEFINER`)
- Produce: la tabla `public.temas`; `public.reunion_temas.tema_id`; la función
  `public.puedo_ver_reunion(p_reunion uuid) RETURNS boolean`, que la fase 3 reusa para
  `reunion_tema_actividades`

- [ ] **Paso 1: Crear el archivo con el timestamp escrito a mano**

**No usar `pnpm supabase migration new`:** genera la hora actual, que cae después del cierre de la
fase 1 (`20260909233746`) y rompe el orden que exige §8 del spec.

```bash
touch supabase/migrations/20260909230000_temas_catalogo.sql
```

- [ ] **Paso 2: Escribir la migración**

Contenido completo de `supabase/migrations/20260909230000_temas_catalogo.sql`:

```sql
-- FASE 2: el tema sube a su propia tabla y `reunion_temas` pasa a ser el TRATAMIENTO.
--
-- Va ordenada ENTRE la apertura (20260909222149) y el cierre (20260909233746) de la fase 1: sus
-- policies nombran el slug `operations`, que la apertura crea, y la pantalla de /admin que las
-- consume viaja en el bundle que se despliega antes del cierre.
--
-- El timestamp está escrito a mano por eso mismo. En local se aplica con
-- `pnpm supabase migration up --include-all`, porque la del cierre ya está puesta.
BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. La guarda que hace que esta migración no pueda perder datos.
--    El precheck (supabase/checks/precheck-temas.sql) contesta lo mismo antes del push, pero es
--    un paso humano y los pasos humanos se saltean. Esto no.
DO $guard$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reunion_temas;
  IF n > 0 THEN
    RAISE EXCEPTION E'reunion_temas tiene % filas y esta migración borra `titulo`.\n\n%', n,
      'No hay backfill escrito: el diseño se hizo sobre una tabla vacía. Ver '
      'supabase/checks/precheck-temas.sql.';
  END IF;
END $guard$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. El asunto. El título es el mismo siempre; lo que cambia por reunión es la descripción, que
--    se queda en `reunion_temas`.
CREATE TABLE public.temas (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- ON UPDATE CASCADE por el mismo motivo que `actividades_empresa_fkey`: el `codigo` de una
  -- empresa se edita desde /admin.
  empresa       text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  titulo        text NOT NULL,
  -- No hay borrado: `tema_id` es ON DELETE RESTRICT porque borrar un asunto ya tratado
  -- reescribiría un acta pasada. `activo` es la baja.
  activo        boolean NOT NULL DEFAULT true,
  creado_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- `btrim` además de `lower`: sin él "Presupuesto Q4 " entra como un asunto distinto y la historia
-- que todo esto quiere unir se parte con el primero mal tipeado. La empresa entra en la clave
-- porque el "Presupuesto Q4" de EMC y el de Servi-Net son dos asuntos, no uno.
CREATE UNIQUE INDEX temas_unicos_por_empresa
  ON public.temas (empresa, lower(btrim(titulo)));
CREATE INDEX temas_empresa_idx ON public.temas (empresa);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. El tratamiento. `titulo` se va: ahora vive una sola vez, en `temas`.
ALTER TABLE public.reunion_temas
  ADD COLUMN tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE RESTRICT,
  DROP COLUMN titulo,
  ADD CONSTRAINT reunion_temas_unicos UNIQUE (reunion_id, tema_id);

-- El UNIQUE de arriba indexa (reunion_id, tema_id); esto sirve al camino inverso —"en qué
-- reuniones se trató este asunto"—, que es la consulta que hace posible la historia.
CREATE INDEX reunion_temas_tema_id_idx ON public.reunion_temas (tema_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permisos y RLS.
--
-- El `DO` va ETIQUETADO (`$do$`) y los dólares anidados no se tocan: el lexer hace longest match
-- del delimitador, así que con `DO $$` un `$q$$f$` consume `$q`, retrocede un `$`, encuentra `$$`
-- —la apertura del DO— y cierra el bloque ahí. Ya pasó: `syntax error at or near "f$"`.
DO $do$
DECLARE
  slug_nuevo text := 'operations';
  slug_viejo text := 'reuniones';
  gate       text;
BEGIN
  -- Los dos slugs verificados. `role_modules.module_slug` es text sin FK y `has_module()` abre
  -- con `is_admin() OR …`: uno mal escrito le da true al admin —que es quien prueba la
  -- migración— y false en silencio a todo el resto.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_nuevo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_nuevo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;

  -- Los DOS slugs, no `operations` a secas: `reuniones_select` sigue gateada por `reuniones` y en
  -- producción ese módulo es de `medico_investigacion`, que NO tiene `operations`. Con un solo
  -- slug, el acta se abre y no se ve ni un tema, sin ningún error. Colapsa a `operations` el día
  -- que se absorba `reuniones` — anotado en el .todo.
  --
  -- El (SELECT …) alrededor de cada `has_module` fuerza un InitPlan, como en 20260821212925:82:
  -- sin él la función corre una vez por fila.
  gate := format('((SELECT public.has_module(%L)) OR (SELECT public.has_module(%L)))',
                 slug_nuevo, slug_viejo);

  -- El predicado de `reuniones_select` en UN solo lugar, para que las tablas hijas no lo copien.
  -- Lee `reuniones` salteando su propia policy —si no, se llamaría a sí misma— y por eso sirve a
  -- las hijas y NO a `reuniones` (advertencia de 20260830204042:33-37).
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.puedo_ver_reunion(p_reunion uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $q$
      SELECT %s AND EXISTS (
        SELECT 1 FROM public.reuniones r
         WHERE r.id = p_reunion AND (
           public.is_admin()
           OR r.created_by = public.usuario_actual_id()
           OR public.participa_en_reunion(r.id)
           OR public.misma_empresa_reunion(r.id)))
    $q$ $f$, gate);

  EXECUTE 'ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY';
  -- Una tabla nueva de `public` recibe GRANT ALL a `anon` por defecto en Supabase: está el
  -- precedente literal en el dump, `GRANT ALL ON TABLE public.reunion_pendientes TO anon`. Sin
  -- este REVOKE, `temas` sería lectura y escritura anónima con la llave que viaja en el bundle.
  EXECUTE 'REVOKE ALL ON public.temas FROM anon';
  -- Y los GRANT NO son opcionales: 20260821212925:62 lo dice textual. Sin ellos la tabla queda
  -- inaccesible con 42501 y la pestaña sale vacía sin que nada explique por qué.
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.temas TO authenticated';
  EXECUTE 'GRANT ALL    ON public.temas TO service_role';

  -- Un tema se ve si se puede ver ALGUNA de las reuniones donde se trató —dicho entero, no
  -- delegado a la RLS de `reunion_temas`—, o si nadie lo trató todavía y lo creaste vos, que es
  -- el hueco entre escribir el título y guardar el punto. Nunca "todos los temas del módulo": eso
  -- filtraría los títulos de las actas reservadas.
  --
  -- `is_admin()` va explícito para que el catálogo de /admin no esconda los temas sin tratamiento
  -- de otra persona. No concede nada: `puedo_ver_reunion` ya abre con is_admin().
  EXECUTE $f$
    CREATE POLICY temas_select ON public.temas FOR SELECT USING (
      public.is_admin()
      OR EXISTS (SELECT 1 FROM public.reunion_temas rt
                  WHERE rt.tema_id = temas.id AND public.puedo_ver_reunion(rt.reunion_id))
      OR creado_por_id = public.usuario_actual_id())$f$;

  -- El alta del acta entra por tema_para_acta(). Esta policy existe para que esa función no sea
  -- la única defensa, y para atar `creado_por_id` a quien escribe: con NULL la fila queda
  -- inmodificable salvo por admin, y sin la igualdad cualquiera la siembra con el id de otro.
  EXECUTE format($f$
    CREATE POLICY temas_insert ON public.temas FOR INSERT
      WITH CHECK (%s AND creado_por_id = public.usuario_actual_id())$f$, gate);

  -- Corregir un tema mientras el acta donde se trató siga abierta. Sin el EXISTS, quien lo creó
  -- podría reescribir el título de un asunto tratado en actas CERRADAS — y como el título es N:N,
  -- eso reescribe las cinco a la vez.
  --
  -- El WITH CHECK va explícito aunque repita: una policy de escritura sin WITH CHECK valida la
  -- fila NUEVA con el USING, y eso es la trampa que dejó a `reuniones_update` sin poder cerrar.
  EXECUTE $f$
    CREATE POLICY temas_update ON public.temas FOR UPDATE
      USING (public.is_admin() OR (creado_por_id = public.usuario_actual_id() AND (
        NOT EXISTS (SELECT 1 FROM public.reunion_temas rt WHERE rt.tema_id = temas.id)
        OR EXISTS (SELECT 1 FROM public.reunion_temas rt
                    WHERE rt.tema_id = temas.id AND public.reunion_abierta(rt.reunion_id)))))
      WITH CHECK (public.is_admin() OR creado_por_id = public.usuario_actual_id())$f$;

  -- La de `reunion_temas` decía `EXISTS (SELECT 1 FROM reuniones r WHERE r.id = reunion_id)`:
  -- sin gate de módulo y apoyada en que la subconsulta pasara por la RLS de `reuniones`. Pasa,
  -- pero deja la confidencialidad de un acta reservada colgando de un detalle que no se lee.
  EXECUTE 'DROP POLICY IF EXISTS reunion_temas_select ON public.reunion_temas';
  EXECUTE $f$
    CREATE POLICY reunion_temas_select ON public.reunion_temas FOR SELECT
      USING (public.puedo_ver_reunion(reunion_id))$f$;
END $do$;

COMMIT;
```

- [ ] **Paso 3: Aplicarla en local**

```bash
pnpm supabase migration up --include-all
```

Expected: aplica `20260909230000` sin error. El `--include-all` es obligatorio: la del cierre de
la fase 1 (`20260909233746`) ya está aplicada y ésta queda fuera de orden.

- [ ] **Paso 4: Verificar la forma, no leer el archivo**

```bash
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select relrowsecurity from pg_class where oid = 'public.temas'::regclass;"
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select count(*) as grants_anon from information_schema.role_table_grants
    where table_schema='public' and table_name='temas' and grantee='anon';"
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select policyname, cmd from pg_policies where tablename in ('temas','reunion_temas') order by 1;"
```

Expected: `relrowsecurity = true`; `grants_anon = 0`; cinco policies —`reunion_temas_select`,
`reunion_temas_write`, `temas_insert`, `temas_select`, `temas_update`.

⚠️ **Mirar también lo que tiene `authenticated`, y saber qué significa.** (Segunda pasada,
reproducido en local dentro de una transacción revertida.) Después de la migración
`authenticated` tiene los **siete** privilegios sobre `temas` —`DELETE` y `TRUNCATE` incluidos—,
no los tres del `GRANT SELECT, INSERT, UPDATE`: los privilegios por defecto de Supabase ya le dan
`ALL` a toda tabla nueva de `public`, así que ese `GRANT` es un no-op que documenta una intención
que la base no cumple. Lo que deja el `DELETE` afuera es que **no hay policy de `DELETE`**, no el
`GRANT`. Es el mismo estado que `reunion_temas` y `reuniones` hoy, así que no es un agujero
nuevo — pero que quede escrito, porque alguien que agregue una policy `FOR ALL` a `temas` abre el
borrado sin tocar un `GRANT`.

```bash
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select string_agg(privilege_type, ',' order by 1) from information_schema.role_table_grants
    where table_schema='public' and table_name='temas' and grantee='authenticated';"
```

Expected: los siete. Si algún día da tres, cambió el default de Supabase y hay que revisar el
resto de las tablas.

- [ ] **Paso 5: Confirmar que la guarda del paso 0 muerde**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
-- La tabla ya tiene `tema_id NOT NULL`, así que una fila de prueba necesita un tema. Y una
-- reunión propia: ⚠️ con `FROM reuniones … LIMIT 1` sobre una base sin reuniones el INSERT
-- mete cero filas y la guarda "no dispara" sin que nada lo diga (mismo defecto que el paso 3
-- de la Tarea 1).
INSERT INTO public.reuniones (empresa, titulo, fecha)
  VALUES ('EMC', 'ensayo de la guarda', CURRENT_DATE);
INSERT INTO public.temas (empresa, titulo) VALUES ('EMC', 'ensayo de la guarda');
INSERT INTO public.reunion_temas (reunion_id, posicion, tema_id)
  SELECT r.id, 1, t.id FROM public.reuniones r, public.temas t
   WHERE r.titulo = 'ensayo de la guarda' AND t.titulo = 'ensayo de la guarda';
DO $$ DECLARE n bigint; BEGIN
  SELECT count(*) INTO n FROM public.reunion_temas;
  IF n > 0 THEN RAISE EXCEPTION 'la guarda dispara con % filas', n; END IF;
END $$;
ROLLBACK;
SQL
```

Expected: `ERROR: la guarda dispara con 1 filas` y después el `ROLLBACK`. Confirmar que
`select count(*) from reunion_temas` vuelve a dar 0.

- [ ] **Paso 6: Probar el rollback y volver a aplicar**

Un rollback que nadie corrió no es un rollback.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 \
  -f supabase/rollback/operations-temas-rollback.sql
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "select column_name from information_schema.columns
    where table_schema='public' and table_name='reunion_temas' order by 1;"
```

Expected: `titulo` está y `tema_id` no; `temas` no existe. Después, volver a dejar la base como
tiene que quedar:

```bash
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "delete from supabase_migrations.schema_migrations where version = '20260909230000';"
pnpm supabase migration up --include-all
```

- [ ] **Paso 7: `pnpm db:rls` y el gate**

```bash
pnpm db:rls && pnpm lint && pnpm typecheck && pnpm test
```

Expected: verde. `db:rls` confirma que ninguna tabla de `public` quedó sin RLS — que es necesario
y **no** suficiente: el acceso real lo prueba la Tarea 5.

- [ ] **Paso 8: Mostrar el diff a Wagner y, con su OK, commitear**

```bash
git add supabase/migrations/20260909230000_temas_catalogo.sql
git commit -m "feat(db): temas sube a tabla propia y reunion_temas pasa a ser el tratamiento"
```

---

## Tarea 3: `tema_para_acta()` y el rastro del tratamiento

El `UNIQUE` es un oráculo: `temas_select` esconde el tema de un acta reservada, el índice no. Al
tipear ese título el usuario recibiría `duplicate key value violates unique constraint`, que le
**confirma la existencia** del asunto que la policy le oculta y lo deja en punto muerto — ni lo ve
para reusarlo ni lo puede crear. Por eso el alta va por función.

**Files:**
- Modify: `supabase/migrations/20260909230000_temas_catalogo.sql` (se le agrega la sección 4, antes
  del `COMMIT`)

**Interfaces:**
- Consume: `public.temas`, `public.reuniones`, `is_admin()`, `preside_o_secretaria(uuid)`,
  `creo_la_reunion(uuid)`, `reunion_abierta(uuid)`, `usuario_actual_id()`
- Produce: `public.tema_para_acta(p_reunion uuid, p_titulo text) RETURNS uuid` — la fase 3 la llama
  desde el buscar-o-crear del modal del tratamiento

- [ ] **Paso 1: Escribir la prueba que falla, en SQL**

Crear `supabase/checks/prueba-tema-para-acta.sql`. Corre entero dentro de una transacción que se
revierte, así que no deja nada:

```sql
-- Prueba de tema_para_acta(). Se revierte al final: no ensucia la base.
--
-- Corre como `postgres`, o sea sin JWT: `usuario_actual_id()` da NULL y `is_admin()` da false. Eso
-- es a propósito — lo que se prueba acá es que la función RECHAZA a quien no puede escribir el
-- acta, que es la mitad que un admin nunca vería. El camino feliz se monta suplantando al creador
-- de la reunión con `set_config('request.jwt.claims', …)`, que es lo que hace PostgREST.
BEGIN;

-- Un usuario y una reunión suya, para poder pasar el guard como su creador.
INSERT INTO public.usuarios (email, nombre, apellido, rol, auth_id, validado, activo)
VALUES ('prueba.temas@eminat.net', 'Prueba', 'Temas', 'stratix360',
        '00000000-0000-4000-8000-0000000000aa', true, true);

INSERT INTO public.reuniones (empresa, titulo, fecha, modalidad, created_by)
SELECT (SELECT codigo FROM public.empresas LIMIT 1), 'Reunión de prueba', CURRENT_DATE, 'virtual',
       (SELECT id FROM public.usuarios WHERE email = 'prueba.temas@eminat.net');

-- 1. Sin identidad: tiene que rechazar con 42501, NO crear el tema.
DO $$
DECLARE r uuid; v_reunion uuid;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  BEGIN
    r := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
    RAISE EXCEPTION 'FALLA: dejó crear un tema sin poder escribir el acta (devolvió %)', r;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok 1: rechaza a quien no puede escribir el acta';
  END;
END $$;

-- 2. Como el creador del acta: crea, y la segunda vez con otro casing devuelve EL MISMO id.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-0000000000aa')::text, true);

DO $$
DECLARE v_reunion uuid; a uuid; b uuid; n bigint; guardado text;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  a := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
  b := public.tema_para_acta(v_reunion, '  presupuesto q4 ');
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'FALLA: "presupuesto q4" creó un asunto nuevo (% vs %)', a, b;
  END IF;
  SELECT count(*), min(titulo) INTO n, guardado FROM public.temas;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLA: quedaron % filas en temas', n; END IF;
  IF guardado <> 'Presupuesto Q4' THEN
    RAISE EXCEPTION 'FALLA: el título se pisó con el segundo tipeo (quedó %)', guardado;
  END IF;
  RAISE NOTICE 'ok 2: dedup por (empresa, lower(btrim(titulo))) y el título original intacto';
END $$;

-- 3. La empresa sale de la REUNIÓN, no de quien llama.
DO $$
DECLARE esperado text; real_ text;
BEGIN
  SELECT empresa INTO esperado FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  SELECT empresa INTO real_ FROM public.temas LIMIT 1;
  IF esperado IS DISTINCT FROM real_ THEN
    RAISE EXCEPTION 'FALLA: empresa % en vez de %', real_, esperado;
  END IF;
  RAISE NOTICE 'ok 3: la empresa sale de la reunión';
END $$;

-- 4. Un título vacío no entra.
DO $$
DECLARE v_reunion uuid; r uuid;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  BEGIN
    r := public.tema_para_acta(v_reunion, '   ');
    RAISE EXCEPTION 'FALLA: aceptó un título vacío (devolvió %)', r;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'ok 4: rechaza el título vacío';
  END;
END $$;

-- 5. Una reunión inexistente da el MISMO error que una que no podés escribir. Si diera uno
--    distinto, sería el oráculo otra vez: "esa reunión no existe" vs "no podés escribirla".
DO $$
DECLARE r uuid;
BEGIN
  BEGIN
    r := public.tema_para_acta('00000000-0000-4000-8000-0000000000ff', 'Cualquiera');
    RAISE EXCEPTION 'FALLA: aceptó una reunión inexistente (devolvió %)', r;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok 5: una reunión que no existe y una que no podés escribir dan lo mismo';
  END;
END $$;

-- 6. ⚠️ Un tema INACTIVO se devuelve igual, y sigue inactivo. Esto NO es lo deseable: es lo que
--    la función hace hoy, escrito para que la fase 3 no lo descubra en pantalla (D9). El día
--    que Wagner decida, esta prueba cambia con la función.
DO $$
DECLARE v_reunion uuid; a uuid; b uuid; act boolean;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  a := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
  UPDATE public.temas SET activo = false WHERE id = a;
  b := public.tema_para_acta(v_reunion, 'presupuesto q4');
  SELECT activo INTO act FROM public.temas WHERE id = b;
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'FALLA: un tema inactivo se duplicó (% vs %)', a, b;
  END IF;
  IF act THEN
    RAISE EXCEPTION 'FALLA: la función reactivó el tema — si es a propósito, D9 ya se decidió y hay que actualizar esta prueba';
  END IF;
  RAISE NOTICE 'ok 6: un tema inactivo se devuelve tal cual (D9 pendiente: activo hoy no es una baja para el acta)';
END $$;

ROLLBACK;
```

- [ ] **Paso 2: Correrla y ver que falla**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 \
  -f supabase/checks/prueba-tema-para-acta.sql
```

Expected: FAIL con `function public.tema_para_acta(uuid, text) does not exist`.

- [ ] **Paso 3: Escribir la función**

Agregar a `supabase/migrations/20260909230000_temas_catalogo.sql`, **antes del `COMMIT`**:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 4. El alta de un tema es una función, no un INSERT del cliente.
--
-- El UNIQUE es un oráculo: `temas_select` esconde el tema de un acta reservada y el índice no.
-- Al tipear ese título, el cliente recibiría `duplicate key value violates unique constraint`,
-- que le CONFIRMA la existencia del asunto que la policy le oculta y lo deja sin salida — ni lo
-- ve para reusarlo ni lo puede crear. Y sin RETURNING legible, un `.insert().select().single()`
-- aborta con "new row violates row-level security policy" (el bug de 20260830204042:9-14).
CREATE OR REPLACE FUNCTION public.tema_para_acta(p_reunion uuid, p_titulo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_empresa text;
  v_titulo  text := btrim(p_titulo);
  v_id      uuid;
BEGIN
  IF v_titulo = '' THEN
    RAISE EXCEPTION 'El tema necesita un título.' USING ERRCODE = '23514';
  END IF;

  -- El MISMO predicado que `reunion_temas_write` (20260830204042:91-96). Va acá adentro porque
  -- SECURITY DEFINER saltea toda la RLS: sin esto, la función sería una puerta lateral al acta.
  IF NOT (public.is_admin()
          OR ((public.preside_o_secretaria(p_reunion) OR public.creo_la_reunion(p_reunion))
              AND public.reunion_abierta(p_reunion))) THEN
    RAISE EXCEPTION 'No podés escribir en esa acta.' USING ERRCODE = '42501';
  END IF;

  -- La empresa sale de la REUNIÓN y no del que llama: nada obligaba a que `temas.empresa` fuera
  -- la del acta, y sin esto dos actas de empresas distintas podrían escribir en el mismo asunto.
  SELECT r.empresa INTO v_empresa FROM public.reuniones r WHERE r.id = p_reunion;
  -- Una reunión que no existe da el MISMO error que una que no podés escribir. Distinguirlos
  -- sería reabrir el oráculo por el otro lado.
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'No podés escribir en esa acta.' USING ERRCODE = '42501';
  END IF;

  -- `DO UPDATE` y no `DO NOTHING` porque hace falta el RETURNING: `DO NOTHING` no devuelve fila y
  -- dos usuarios simultáneos chocarían con un 23505 crudo.
  --
  -- Se asigna el título A SÍ MISMO, NO `EXCLUDED.titulo`. Con EXCLUDED, quien tipea
  -- "presupuesto q4" le reescribe el título al asunto en las otras cuatro actas —cerradas
  -- incluidas—, que es justo lo que `temas_update` bloquea con su EXISTS y que esta función,
  -- por ser SECURITY DEFINER, no evalúa.
  INSERT INTO public.temas (empresa, titulo, creado_por_id)
  VALUES (v_empresa, v_titulo, public.usuario_actual_id())
  ON CONFLICT (empresa, lower(btrim(titulo)))
    DO UPDATE SET titulo = public.temas.titulo
  RETURNING id INTO v_id;

  RETURN v_id;
END $fn$;

-- Una función SECURITY DEFINER es ejecutable por PUBLIC por defecto, y PUBLIC incluye a `anon`:
-- sin este REVOKE, la llave que viaja en el bundle del browser podría crear temas en cualquier
-- acta. El REVOKE va primero y el GRANT después, en ese orden.
REVOKE ALL ON FUNCTION public.tema_para_acta(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tema_para_acta(uuid, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. El rastro. `reunion_temas` nunca tuvo trigger, así que el tratamiento —que a partir de
--    ahora carga la descripción del acta— venía sin auditoría desde el 30/08.
--
--    ⚠️ VA SIN `UPDATE`, Y NO ES UN OLVIDO. `log_reunion()` tiene, en su línea 15,
--        TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado
--    y PL/pgSQL NO corta ese AND: la condición entera se planifica como una sola expresión SQL,
--    así que `OLD.estado` tiene que resolver contra el tipo de la fila aunque TG_TABLE_NAME no
--    sea 'reuniones'. Ni `temas` ni `reunion_temas` tienen `estado`, así que con `OR UPDATE`
--    cualquier modificación aborta con `record "old" has no field "estado"` — probado contra el
--    Postgres local: el segundo `tema_para_acta()`, el que entra por ON CONFLICT DO UPDATE,
--    revienta; y editar la descripción de un punto sería imposible.
--
--    Con INSERT y DELETE a secas, las dos ramas que corren son las genéricas y las dos retornan
--    antes de esa línea, así que la función NO se toca — y esta migración no arrastra la rama de
--    `reunion_pendientes` que la fase 3 tiene que sacar. El precio: no queda rastro del cambio de
--    título ni del `activo`. Se paga en la fase 3, anidando los IF por tabla en vez de unirlos
--    con AND.
DROP TRIGGER IF EXISTS trg_log ON public.reunion_temas;
CREATE TRIGGER trg_log AFTER INSERT OR DELETE ON public.reunion_temas
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
DROP TRIGGER IF EXISTS trg_log ON public.temas;
CREATE TRIGGER trg_log AFTER INSERT OR DELETE ON public.temas
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
```

- [ ] **Paso 4: Re-aplicar la migración y correr la prueba**

Como la migración ya está aplicada, se revierte y se vuelve a poner:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 \
  -f supabase/rollback/operations-temas-rollback.sql
pnpm supabase db query --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  "delete from supabase_migrations.schema_migrations where version = '20260909230000';"
pnpm supabase migration up --include-all
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 \
  -f supabase/checks/prueba-tema-para-acta.sql
```

Expected: los **seis** `NOTICE: ok N` y un `ROLLBACK` al final. Ningún `FALLA:`. ⚠️ Decía
cinco; la sexta es la de D9. (La segunda pasada corrió migración + función + las seis pruebas en
una sola transacción revertida contra local: pasan todas.)

- [ ] **Paso 5: Comprobar que el rastro quedó**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
INSERT INTO public.temas (empresa, titulo)
  SELECT codigo, 'ensayo de auditoría' FROM public.empresas LIMIT 1;
SELECT tabla, accion FROM public.historial WHERE tabla = 'temas';
ROLLBACK;
SQL
```

Expected: una fila `temas | created`.

- [ ] **Paso 5b: Ver con los ojos por qué el trigger NO lleva `UPDATE`**

Es la comprobación que evita que alguien "complete" el trigger dentro de tres meses:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
DROP TRIGGER trg_log ON public.temas;
CREATE TRIGGER trg_log AFTER INSERT OR UPDATE OR DELETE ON public.temas
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
INSERT INTO public.temas (empresa, titulo)
  SELECT codigo, 'ensayo del UPDATE' FROM public.empresas LIMIT 1;
UPDATE public.temas SET activo = false WHERE titulo = 'ensayo del UPDATE';
ROLLBACK;
SQL
```

Expected: `ERROR: record "old" has no field "estado"`, con
`CONTEXT: SQL expression "TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado"`.
PL/pgSQL no corta ese `AND`: la condición se planifica entera y `OLD.estado` tiene que resolver
contra el tipo de la fila. Si este paso **no** da error, `log_reunion()` cambió y hay que rehacer
la decisión D6.

- [ ] **Paso 6: El gate y el commit**

```bash
pnpm db:rls && pnpm lint && pnpm typecheck && pnpm test
git add supabase/migrations/20260909230000_temas_catalogo.sql \
        supabase/checks/prueba-tema-para-acta.sql
git commit -m "feat(db): tema_para_acta() y la auditoría del tratamiento"
```

---

## Tarea 4: El tipo y el repo

**Files:**
- Modify: `src/shared/data/tables.ts:30`
- Create: `src/shared/data/temas.ts`
- Modify: `src/shared/data/index.ts` (el barrel)
- Modify: `src/features/reuniones/types.ts`
- Create: `src/features/admin/utils/filtrarTemas/index.ts`
- Test: `src/features/admin/utils/filtrarTemas/index.test.ts`

**Interfaces:**
- Consume: `supabase` de `@/shared/db`, `TABLES`
- Produce:
  - `type Tema = { id, empresa, titulo, activo, creado_por_id, created_at }`
  - `temasRepo.list()`, `temasRepo.crear(fila)`, `temasRepo.actualizar(id, patch)`,
    `temasRepo.paraActa(reunionId, titulo)` — ⚠️ y nada más: `contarTratamientos` salió
    porque no tenía consumidor (paso 6)
  - `filtrarTemas(temas: Tema[], q: string): Tema[]`

- [ ] **Paso 1: Escribir el test que falla**

Crear `src/features/admin/utils/filtrarTemas/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filtrarTemas } from './index'
import type { Tema } from '@/features/reuniones/types'

const tema = (titulo: string, empresa = 'EMC'): Tema => ({
  id: titulo, empresa, titulo, activo: true, creado_por_id: null, created_at: null,
})

const TEMAS = [tema('Presupuesto Q4'), tema('Presupuesto Q4', 'SVN'), tema('Contrataciones')]

describe('filtrarTemas', () => {
  it('sin búsqueda devuelve todo', () => {
    expect(filtrarTemas(TEMAS, '')).toHaveLength(3)
  })

  it('ignora mayúsculas y espacios de sobra', () => {
    expect(filtrarTemas(TEMAS, '  PRESUPUESTO ')).toHaveLength(2)
  })

  // Dos empresas pueden tener el MISMO título a propósito: el UNIQUE es por empresa. Buscar por
  // el código de la empresa es la única forma de distinguirlos en una lista.
  it('busca también por el código de la empresa', () => {
    expect(filtrarTemas(TEMAS, 'svn').map(t => t.empresa)).toEqual(['SVN'])
  })

  it('no encuentra lo que no está', () => {
    expect(filtrarTemas(TEMAS, 'nómina')).toEqual([])
  })
})
```

- [ ] **Paso 2: Correrlo y ver que falla**

Run: `pnpm test src/features/admin/utils/filtrarTemas`
Expected: FAIL — el módulo no existe, el import ni resuelve.

- [ ] **Paso 3: El tipo**

En `src/features/reuniones/types.ts`, agregar después de `ParticipanteNuevo` (línea 48):

⚠️ El archivo ya lleva `centinela-exime: archivo-extenso@2` y está pasado del techo. Si el
centinela frena el `Edit` igual, es el gotcha conocido de la marca ya firmada (memoria del
08/09): se reescribe el archivo con `Write`, **no** se firma otra exención.

```ts
// El ASUNTO: el título, que es el mismo en las cinco reuniones donde se trató. Lo que cambia por
// reunión —la descripción de qué se dijo ese día— vive en `reunion_temas`, no acá.
// `titulo` y no `nombre`: no es un catálogo organizacional (ver el plan de la fase 2, D1).
export type Tema = {
  id: string
  /** El código de la empresa, no su uuid: la FK apunta a `empresas.codigo`. */
  empresa: string
  titulo: string
  /** La baja. No hay borrado: `reunion_temas.tema_id` es ON DELETE RESTRICT, porque borrar un
   *  asunto ya tratado reescribiría un acta pasada. */
  activo: boolean
  creado_por_id: string | null
  created_at: string | null
}

/** El TRATAMIENTO: qué se dijo de ese asunto en esa reunión. */
export type ReunionTema = {
  id: string
  reunion_id: string
  tema_id: string
  posicion: number
  descripcion: string | null
}
```

- [ ] **Paso 4: El filtro**

Crear `src/features/admin/utils/filtrarTemas/index.ts`:

```ts
import type { Tema } from '@/features/reuniones/types'

// El buscador del catálogo. Mira el título y el código de la empresa: el UNIQUE de `temas` es
// (empresa, título), así que dos empresas pueden tener el mismo título a propósito y sin la
// empresa la lista no los distingue.
export function filtrarTemas(temas: Tema[], q: string): Tema[] {
  const busca = q.trim().toLowerCase()
  if (!busca) return temas
  return temas.filter(t =>
    t.titulo.toLowerCase().includes(busca) || t.empresa.toLowerCase().includes(busca))
}
```

- [ ] **Paso 5: Correr el test y ver que pasa**

Run: `pnpm test src/features/admin/utils/filtrarTemas`
Expected: PASS, los cuatro.

- [ ] **Paso 6: El repo**

En `src/shared/data/tables.ts`, agregar dentro de `TABLES` (después de `vistasFiltro`):

```ts
  temas: 'temas',
```

⚠️ Sólo `temas`. La versión anterior agregaba también `reunionTemas` para un
`contarTratamientos()` que **ningún componente del plan llamaba** — un export sin importador, que
es lo que la regla `sin_export_default` viene a evitar (ruling 2 de la fase 1). La fase 3, que
sí lee `reunion_temas`, agrega los dos cuando tenga quién los use.

Crear `src/shared/data/temas.ts`:

```ts
import { supabase } from '@/shared/db'
import type { Tema } from '@/features/reuniones/types'
import { TABLES } from './tables'

// centinela-exime: renombrar-lo-nombrado@1 — el título de un tema se corrige desde el catálogo de
// /admin mientras el acta siga abierta; es la corrección que `temas_update` autoriza a propósito.

// El catálogo de asuntos. NO pasa por /api/admin: las tres operaciones que existen ya están
// autorizadas por RLS (`temas_update` abre con `is_admin()`), así que una ruta con service_role
// sería una segunda implementación de la misma regla, que es lo que ya duele en `blockedBy`.
export const list = () =>
  supabase.from(TABLES.temas).select('*').order('empresa').order('titulo')

export const crear = (fila: Pick<Tema, 'empresa' | 'titulo'> & { creado_por_id: string }) =>
  supabase.from(TABLES.temas).insert(fila).select().single()

export const actualizar = (id: string, patch: Partial<Pick<Tema, 'titulo' | 'activo'>>) =>
  supabase.from(TABLES.temas).update(patch).eq('id', id).select().single()

// El alta desde un acta NO es un insert: el UNIQUE es un oráculo que confirma la existencia de
// asuntos que la RLS esconde. La función resuelve buscar-o-crear de un solo viaje, sin carrera.
// Sin consumidor todavía — la llama el buscar-o-crear del tratamiento, que es la fase 3.
export const paraActa = (reunionId: string, titulo: string) =>
  supabase.rpc('tema_para_acta', { p_reunion: reunionId, p_titulo: titulo })
```

En `src/shared/data/index.ts`, agregar al barrel, con el mismo estilo que `reunionesRepo`:

```ts
export * as temasRepo from './temas'
```

- [ ] **Paso 7: El gate y el commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/shared/data/tables.ts src/shared/data/temas.ts src/shared/data/index.ts \
        src/features/reuniones/types.ts src/features/admin/utils/filtrarTemas
git commit -m "feat(temas): el tipo, el repo y el filtro del catálogo"
```

---

## Tarea 5: La RLS probada con roles reales, sin admin y sin browser

Probar con admin no prueba nada: `has_module()` abre con `is_admin() OR …` y `puedo_ver_reunion()`
también. Y `pnpm db:rls` sólo lee `relrowsecurity`: da verde con la tabla abierta de par en par.

**Files:**
- Create: `e2e/temas-rls.spec.ts`
- Modify: `e2e/seed.ts` — `const H` pasa a `export const H`. ⚠️ Faltaba: el spec necesita
  service_role para borrar el tema que crea y para darle `reuniones` a `medico_investigacion` en
  local, y `H` es la única forma de no copiar la llave.

**Interfaces:**
- Consume: `ensureUser(email, rol)`, `deleteUser(email)`, `getUsuario(email)`, `PASSWORD`, `H`
  de `e2e/seed.ts`
- Produce: nada que otra tarea consuma

⚠️ **Lo que la versión anterior de esta tarea probaba, y no probaba.** (Segunda pasada.) Sus
tests 3 y 4 hacían `GET /rest/v1/temas` y esperaban `200 []`. Un `SELECT` filtrado por RLS
devuelve `200 []` **con el gate abierto y con el gate cerrado** —reproducido en local: usuario
sin módulo, `has_module → false`, `0` filas, sin error—, así que los dos pasaban con la policy en
`USING (false)`, el paso 3 decía "si da 403 es que el gate quedó en `operations` a secas" (un
`SELECT` **nunca** da 403 por policy) y el "ver el rojo" del paso 4 no podía ponerse rojo. Encima
el paso 4 le daba `reuniones` a `medico_investigacion` **después** de correr el spec que lo
necesitaba. La forma que sí discrimina es un **`INSERT`**: es la única operación que una policy
rechaza de forma visible (`42501` → 403), y verificado en local: sin la fila de `role_modules`
rebota, con la fila entra y el creador la ve, y un tercero con `operations` no la ve.

- [ ] **Paso 1: Comprobar el agujero de `anon` a mano, antes de escribir nada**

Es la comprobación que el incidente del 29/08 pide y la que ningún test de TypeScript hace:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
SET LOCAL ROLE anon;
SELECT * FROM public.temas;
ROLLBACK;
SQL
```

Expected: `ERROR: permission denied for table temas`. Si en cambio devuelve filas (o cero filas sin
error), el `REVOKE ALL … FROM anon` de la Tarea 2 no quedó y **la migración no se pushea**.

- [ ] **Paso 2: Escribir el spec que falla**

Crear `e2e/temas-rls.spec.ts`. Va por la API de PostgREST con JWT reales, sin browser: el login por
pantalla es caro, frágil y no aporta nada a lo que se está probando.

```ts
import { test, expect, type APIRequestContext } from '@playwright/test'
import { PASSWORD, H, ensureUser, deleteUser, getUsuario } from './seed'

// Tres roles, y cada uno prueba una cosa distinta:
//   CON_OPS   tiene `operations`  → el gate de módulo lo deja pasar por la rama nueva
//   CON_REU   tiene `reuniones` y NO `operations` → prueba la rama vieja del OR (D3 del plan).
//             En PRODUCCIÓN éste es `medico_investigacion`, que es quien realmente usa las actas.
//             En LOCAL ese rol no tiene ninguno de los dos: `beforeAll` le da `reuniones`.
//   SIN_NADA  no tiene ninguno   → el gate lo tiene que dejar afuera
//
// Ninguno es admin, a propósito: `has_module()` y `puedo_ver_reunion()` abren con `is_admin()`.
//
// El caso positivo ESCRIBE. Un GET filtrado por RLS devuelve `200 []` con el gate abierto y con
// el gate cerrado; el INSERT es lo único que una policy rechaza de forma visible (42501 → 403).
const CON_OPS = 'temas.ops@eminat.net'
const CON_REU = 'temas.reu@eminat.net'
const SIN_NADA = 'temas.nada@eminat.net'
const TITULO = 'Tema de prueba RLS'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
const FILA_REU = `${URL}/rest/v1/role_modules?role_key=eq.medico_investigacion&module_slug=eq.reuniones`

let idReu = ''
let yaTeniaReuniones = false

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await ensureUser(CON_OPS, 'stratix360')
  await ensureUser(CON_REU, 'medico_investigacion')
  await ensureUser(SIN_NADA, 'sin_asignar')
  idReu = (await getUsuario(CON_REU)).id
  // Local está drifteado respecto de prod (§8.1 del spec): acá `medico_investigacion` no tiene
  // `reuniones`. Se le da sólo si no la tenía, y se le saca al final sólo si se le dio.
  yaTeniaReuniones = ((await (await fetch(FILA_REU, { headers: H })).json()) as unknown[]).length > 0
  if (!yaTeniaReuniones) {
    await fetch(`${URL}/rest/v1/role_modules`, {
      method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ role_key: 'medico_investigacion', module_slug: 'reuniones' }),
    })
  }
})

test.afterAll(async () => {
  // `global-teardown.ts` declara con qué usuarios queda la base. Un spec que deja los suyos rompe
  // ese contrato en silencio — el hallazgo de la Tarea 4 de la fase 1. El tema va ANTES que los
  // usuarios: `creado_por_id` es ON DELETE SET NULL y la fila quedaría huérfana.
  await fetch(`${URL}/rest/v1/temas?titulo=eq.${encodeURIComponent(TITULO)}`, { method: 'DELETE', headers: H })
  if (!yaTeniaReuniones) await fetch(FILA_REU, { method: 'DELETE', headers: H })
  for (const email of [CON_OPS, CON_REU, SIN_NADA]) await deleteUser(email)
})

async function token(request: APIRequestContext, email: string): Promise<string> {
  const r = await request.post(`${URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email, password: PASSWORD },
  })
  expect(r.ok(), `login de ${email}`).toBe(true)
  return (await r.json()).access_token
}

const como = (jwt: string) => ({ apikey: ANON, Authorization: `Bearer ${jwt}` })
const crear = (request: APIRequestContext, jwt: string, creado_por_id: string) =>
  request.post(`${URL}/rest/v1/temas`, {
    headers: { ...como(jwt), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    data: { empresa: 'EMC', titulo: TITULO, creado_por_id },
  })

test('anon no llega a la tabla ni con la llave del bundle', async ({ request }) => {
  const r = await request.get(`${URL}/rest/v1/temas?select=id`, { headers: { apikey: ANON } })
  // 401/403: el GRANT está revocado. Un 200 con [] sería el modo de falla peligroso —parece
  // "no hay temas" y es "la tabla está abierta y todavía vacía".
  expect(r.status(), 'anon tiene que rebotar, no ver una lista vacía').toBeGreaterThanOrEqual(401)
})

test('un rol sin ningún módulo no pasa el gate: el INSERT rebota', async ({ request }) => {
  const jwt = await token(request, SIN_NADA)
  const r = await crear(request, jwt, (await getUsuario(SIN_NADA)).id)
  expect(r.status(), '42501 → 403: la policy temas_insert lo dejó afuera').toBe(403)
})

test('un rol con `reuniones` y sin `operations` pasa el gate: crea y ve su tema', async ({ request }) => {
  const jwt = await token(request, CON_REU)
  // Es el caso que en producción usa las actas. Con el gate en `operations` a secas este POST
  // da 403 — y eso es lo que el paso 4 tiene que ver en rojo.
  expect((await crear(request, jwt, idReu)).status(), 'temas_insert por la rama `reuniones`').toBe(201)
  const r = await request.get(`${URL}/rest/v1/temas?select=titulo`, { headers: como(jwt) })
  expect(r.status()).toBe(200)
  expect(await r.json()).toEqual([{ titulo: TITULO }])   // `creado_por_id = usuario_actual_id()`
})

test('un rol con el módulo no ve el tema de otro sin tratamiento común', async ({ request }) => {
  const jwt = await token(request, CON_OPS)
  const r = await request.get(`${URL}/rest/v1/temas?select=titulo`, { headers: como(jwt) })
  expect(r.status()).toBe(200)
  // Ahora hay UN tema en la base, y esta cuenta no lo creó ni comparte acta con él: si aparece,
  // `temas_select` está dejando pasar de más. (Con la tabla vacía esta aserción no probaba nada.)
  expect(await r.json()).toEqual([])
})
```

- [ ] **Paso 3: Correrlo**

Run: `pnpm e2e e2e/temas-rls.spec.ts`
Expected: los cuatro PASS. ⚠️ Si el **tercero** da 403 en el `POST`, el gate quedó en
`operations` a secas (o `beforeAll` no pudo dar la fila de `role_modules`) y hay que volver a la
Tarea 2. Decía "si da 403 en vez de 200" sobre un `GET`: un `SELECT` nunca da 403 por policy.

- [ ] **Paso 4: Ver el rojo — que el gate de dos slugs esté haciendo algo**

⚠️ Ya no hay nada que montar a mano: el spec le da `reuniones` a `medico_investigacion` en
`beforeAll` y se lo saca en `afterAll` (la versión anterior lo hacía en este paso, **después** de
haber corrido el spec en el 3). Lo que queda es ver que el `OR` es portante:

1. Comentar `OR (SELECT public.has_module(%L))` del `gate` en la migración (y el segundo
   argumento del `format`).
2. Re-aplicar: rollback + `delete from supabase_migrations.schema_migrations where version =
   '20260909230000'` + `pnpm supabase migration up --include-all` (el mismo ciclo del paso 4 de
   la Tarea 3).
3. `pnpm e2e e2e/temas-rls.spec.ts` → el **tercero** tiene que fallar con `403` en el `POST`.
4. Descomentar, re-aplicar, volver a verde.

Sin este paso, la única defensa de la convivencia con `reuniones` queda sin comprobar en ningún
momento — es la lección del paso 6b de la fase 1.

- [ ] **Paso 5: El gate y el commit**

```bash
pnpm db:rls && pnpm lint && pnpm typecheck && pnpm test
git add e2e/temas-rls.spec.ts
git commit -m "test(e2e): la RLS de temas, probada con tres roles reales y como anon"
```

---

## Tarea 6: El hook y la pantalla del catálogo (sólo lectura)

**Files:**
- Create: `src/features/admin/hooks/useTemas/index.ts`
- Create: `src/features/admin/components/TemaFila/index.tsx`, `index.module.css`
- Create: `src/features/admin/components/TemasManager/index.tsx`, `index.module.css`
- Modify: `src/features/admin/components/AdminModule/index.tsx:30,35,61,76`
- Modify: `src/shared/components/shell/appShellConfig/subvistas.ts:41-44`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

**Interfaces:**
- Consume: `temasRepo` de `@/shared/data`, `filtrarTemas`, `Tema`
- Produce: `useTemas()` → `{ temas, cargando, error, recargar, guardar, alternarActivo }`, que la
  Tarea 7 usa para el alta y la corrección

- [ ] **Paso 1: Las claves de i18n**

Agregar a `src/shared/i18n/locales/es.json` **y** a `en.json` (las mismas **13** claves en los
dos: si falta una, `satisfies` no compila):

⚠️ Eran 18. Cinco no las leía ningún componente de las Tareas 6 y 7 —`titulo` (el sidebar usa
el literal `label: 'Temas'`, como los demás ítems de `SUB_ITEMS`), `campoActivo`, `tratamientos`
(su `contarTratamientos` salió en la Tarea 4), `guardado`, y `activoHint`, que además prometía
una baja que `tema_para_acta()` no cumple (D9)—. `satisfies` sólo exige que `en.json` tenga las
mismas claves; una clave muerta no la frena nada, y por eso no se había visto. Y `buscar` estaba
escrita sin enchufar: `ListToolbar` recibe `placeholderKey`, y sin él cae en `common.search`
(paso 4).

```json
"admin.temas.sub": "Los asuntos que se tratan en las reuniones. Un asunto es uno solo aunque se trate muchas veces.",
"admin.temas.nuevo": "Nuevo tema",
"admin.temas.buscar": "Buscar por título o empresa",
"admin.temas.vacio": "Todavía no hay ningún tema.",
"admin.temas.sinResultados": "Ningún tema coincide con la búsqueda.",
"admin.temas.campoTitulo": "Título",
"admin.temas.campoEmpresa": "Empresa",
"admin.temas.inactivo": "Inactivo",
"admin.temas.desactivar": "Desactivar",
"admin.temas.activar": "Activar",
"admin.temas.errorDuplicado": "Esa empresa ya tiene un tema con ese título.",
"admin.temas.errorGuardar": "No se pudo guardar el tema.",
"admin.temas.errorCargar": "No se pudieron cargar los temas."
```

En `en.json`, las mismas claves con el texto en inglés.

- [ ] **Paso 2: El hook**

Crear `src/features/admin/hooks/useTemas/index.ts`:

```ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import { temasRepo } from '@/shared/data'
import { useT, type I18nKey } from '@/shared/i18n'
import type { Tema } from '@/features/reuniones/types'

type Estado = { temas: Tema[]; cargando: boolean; error: I18nKey | null }
const VACIO: Estado = { temas: [], cargando: true, error: null }

// 23505 es el UNIQUE (empresa, lower(btrim(titulo))). El mensaje nace del error de la base y no
// de una validación paralela en el cliente, que se desincroniza — mismo criterio que `falloDe`.
const claveDe = (code?: string): I18nKey =>
  code === '23505' ? 'admin.temas.errorDuplicado' : 'admin.temas.errorGuardar'

export function useTemas() {
  const [estado, setEstado] = useState<Estado>(VACIO)
  const { t } = useT()

  const recargar = useCallback(async () => {
    const { data, error } = await temasRepo.list()
    setEstado({ temas: data ?? [], cargando: false, error: error ? 'admin.temas.errorCargar' : null })
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  // Las escrituras recargan: lo que se ve es lo que dice la base, no lo que el cliente cree haber
  // escrito. Es lo que hace visible el rechazo de una policy o de un UNIQUE.
  const guardar = useCallback(async (id: string | null, fila: { empresa: string; titulo: string; creado_por_id: string }) => {
    const { error } = id
      ? await temasRepo.actualizar(id, { titulo: fila.titulo })
      : await temasRepo.crear(fila)
    if (error) { setEstado(p => ({ ...p, error: claveDe(error.code) })); return false }
    await recargar()
    return true
  }, [recargar])

  const alternarActivo = useCallback(async (tema: Tema) => {
    const { error } = await temasRepo.actualizar(tema.id, { activo: !tema.activo })
    if (error) { setEstado(p => ({ ...p, error: claveDe(error.code) })); return }
    await recargar()
  }, [recargar])

  return { ...estado, mensaje: estado.error ? t(estado.error) : null, recargar, guardar, alternarActivo }
}
```

- [ ] **Paso 3: La fila**

Crear `src/features/admin/components/TemaFila/index.tsx`:

```tsx
'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { FilaLista, ColorBadge, Button } from '@/shared/components/ui'
import type { Tema } from '@/features/reuniones/types'
import s from './index.module.css'

// Una fila del catálogo de asuntos. No tiene botón de borrar a propósito: `reunion_temas.tema_id`
// es ON DELETE RESTRICT porque borrar un asunto ya tratado reescribiría un acta pasada. La baja
// es `activo`.
export default function TemaFila({ tema, onEditar, onAlternar }: {
  tema: Tema
  onEditar: () => void
  onAlternar: () => void
}) {
  const { colorMarca } = useApp()
  const { t } = useT()
  const color = colorMarca[tema.empresa] ?? '#7C6FF7'
  return (
    <FilaLista color={color}>
      <div className={s.datos}>
        <span className={tema.activo ? s.titulo : s.tituloInactivo}>{tema.titulo}</span>
        {/* ColorBadge toma `children`, no un prop `label`. */}
        <ColorBadge color={color}>{tema.empresa}</ColorBadge>
        {!tema.activo && <span className={s.inactivo}>{t('admin.temas.inactivo')}</span>}
      </div>
      <div className={s.acciones}>
        <Button kind="edit" onClick={onEditar} />
        {/* Activar/desactivar NO es un `kind` de Button: `BUTTON_META` enumera ocho clases y
            ninguna es ésta, y agregar una fila es una decisión de diseño, no un atajo para tener
            un botón. Se usa un <button> con su clase, igual que `OrgCard`. */}
        <button type="button" className={s.accion} onClick={onAlternar}>
          {t(tema.activo ? 'admin.temas.desactivar' : 'admin.temas.activar')}
        </button>
      </div>
    </FilaLista>
  )
}
```

`Button` toma su rótulo de `BUTTON_META[kind].labelKey` cuando no se le pasa `label`, así que
`kind="edit"` ya dice "Editar" — pisarlo con un `label` es lo que hizo mentir al botón de imprimir
el 31/08.

Y `index.module.css` con `.datos`, `.titulo`, `.tituloInactivo`, `.inactivo`, `.acciones`,
`.accion`. Nada de `style=` en el JSX: está prohibido por regla.

- [ ] **Paso 4: La pantalla**

Crear `src/features/admin/components/TemasManager/index.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ListToolbar } from '@/shared/components/ui'
import { useTemas } from '@/features/admin/hooks/useTemas'
import { filtrarTemas } from '@/features/admin/utils/filtrarTemas'
import TemaFila from '../TemaFila'
import type { Tema } from '@/features/reuniones/types'
import s from './index.module.css'

// El catálogo de asuntos. NO usa OrgManager: `temas` no tiene `codigo` y su unicidad es por
// empresa, no global — el porqué largo está en la decisión D1 del plan de la fase 2.
export default function TemasManager() {
  const { t } = useT()
  const { temas, cargando, mensaje, alternarActivo } = useTemas()
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<{ tema?: Tema } | null>(null)

  const visibles = filtrarTemas(temas, busqueda)
  const vacio = temas.length === 0 ? 'admin.temas.vacio' : 'admin.temas.sinResultados'

  return (
    <div>
      <p className={s.sub}>{t('admin.temas.sub')}</p>
      {/* ⚠️ `placeholderKey`: sin él la barra dice "Buscar…" y `admin.temas.buscar` queda muerta. */}
      <ListToolbar busqueda={busqueda} setBusqueda={setBusqueda} placeholderKey="admin.temas.buscar"
        action={<Button kind="new" label={t('admin.temas.nuevo')} onClick={() => setEditando({})} />} />
      {mensaje && <p className={s.error}>{mensaje}</p>}
      {!cargando && visibles.length === 0 && <p className={s.vacio}>{t(vacio)}</p>}
      <ul className={s.lista}>
        {visibles.map(tema => (
          <TemaFila key={tema.id} tema={tema}
            onEditar={() => setEditando({ tema })} onAlternar={() => void alternarActivo(tema)} />
        ))}
      </ul>
      {/* El modal entra en la Tarea 7. */}
      {editando && null}
    </div>
  )
}
```

- [ ] **Paso 5: Enchufarla al shell**

En `src/shared/components/shell/appShellConfig/subvistas.ts`, agregar como **tercer** ítem de
`admin` (después de `adm-org`):

```ts
    { id: 'adm-temas', icon: '🗂️', label: 'Temas', tab: 'temas' },
```

En `src/features/admin/components/AdminModule/index.tsx`:

- línea 30 — la vista nueva:

```ts
type Vista = 'usuarios' | 'roles' | 'temas' | OrgCat
```

- línea 35 — el guard de la preferencia. **La clave `'tab-admin'` NO se toca:** es un `prefKey` de
  `useUserPreference`, o sea estado guardado de gente real; agregarle un valor a la unión es
  legítimo, renombrarla resetearía la pestaña activa de todo el mundo sin ningún error.

```ts
  const [vista, setVista] = useUserPreference<Vista>('tab-admin', 'usuarios',
    oneOf('usuarios', 'roles', 'temas', ...ORG_CATS))
```

- línea 61 — la condición de la `TabBar` pasa a ser **positiva**. Con `!isOrgCat(vista)` a secas,
  la vista `temas` haría aparecer la barra de Usuarios/Roles encima del catálogo; y una condición
  negativa crece con cada sección nueva:

```tsx
        {(vista === 'usuarios' || vista === 'roles') && (
```

- línea 76 — montar la pantalla, junto a las otras:

```tsx
        {vista === 'temas' && <TemasManager />}
```

Y su import, al lado de `OrgManager`:

```ts
import TemasManager from '../TemasManager'
```

- [ ] **Paso 6: Correr el gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: verde. `tsc` es la red del paso 5: si `Vista` y el `oneOf` no coinciden, no compila.

- [ ] **Paso 7: Verlo en el navegador**

```bash
pnpm dev
```

Entrar con la cuenta de admin, ir a `/admin` → **Temas**. Con la base local vacía tiene que verse
la barra, el botón de alta y el texto de `admin.temas.vacio` — **no** un spinner colgado ni la
barra de Usuarios/Roles encima. Cambiar de pestaña, recargar, y confirmar que la pestaña activa
vuelve donde estaba (la preferencia `tab-admin` sobrevive).

- [ ] **Paso 8: Mostrar a Wagner y commitear**

```bash
git add src/features/admin/hooks/useTemas src/features/admin/components/TemaFila \
        src/features/admin/components/TemasManager \
        src/features/admin/components/AdminModule/index.tsx \
        src/shared/components/shell/appShellConfig/subvistas.ts \
        src/shared/i18n/locales
git commit -m "feat(admin): el catálogo de temas, en su propia pantalla"
```

---

## Tarea 7: El alta y la corrección desde el catálogo

Sin esto, la fase entera queda sin forma de meter un tema por la UI hasta la fase 3 — y "los datos
de prueba se cargan por el frontend, no por seed" es regla del repo: cada fila insertada por SQL
esconde un agujero de la pantalla.

**Files:**
- Create: `src/features/admin/components/TemaModal/index.tsx`
- Modify: `src/features/admin/components/TemasManager/index.tsx` (la línea del modal)

**Interfaces:**
- Consume: `useTemas().guardar`, `useApp().empresas`, `useApp().usuario`
- Produce: nada que otra tarea consuma

⚠️ **`empresas`, no `marcas`.** (Segunda pasada.) `marcas` es `activo && recibe_actividades`:
siete de las once. Pero una reunión se abre para **cualquier empresa activa**
—`DatosGenerales/index.tsx:18-20` lo dice textual y a propósito—, y en local ya hay un acta de
`STRATIX`, que no recibe actividades. `tema_para_acta()` toma la empresa **de la reunión**, así que
esa acta va a crear temas de `STRATIX` que el catálogo mostraría con su chip y que el admin **no
podría crear ni corregir de empresa** porque el `<select>` no la ofrece. Sin error: la opción
simplemente no está. La lista del modal tiene que ser la misma que la del acta.

- [ ] **Paso 1: El modal**

Crear `src/features/admin/components/TemaModal/index.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Modal, Field, Button } from '@/shared/components/ui'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { Tema } from '@/features/reuniones/types'

// Alta y corrección de un asunto. La empresa se elige SÓLO al crear: cambiarla después movería el
// asunto de historia —el UNIQUE es (empresa, título)— y las actas donde ya se trató quedarían
// hablando de otra cosa.
//
// El alta directa se puede hacer acá y no desde un acta porque el admin ve el catálogo entero
// (`temas_select` abre con `is_admin()`): no hay oráculo que cerrar, el duplicado se ve en la
// lista antes de tipearlo. Desde un acta NO se puede, y por eso existe `tema_para_acta()`.
export default function TemaModal({ tema, onGuardar, onCerrar }: {
  tema?: Tema
  onGuardar: (id: string | null, fila: { empresa: string; titulo: string; creado_por_id: string }) => Promise<boolean>
  onCerrar: () => void
}) {
  const { empresas, usuario, inputStyle } = useApp()
  const { t } = useT()
  // Las mismas que ofrece el acta (`DatosGenerales`): TODAS las activas, no `marcas`. Un tema
  // nace con la empresa de su reunión, y una reunión puede ser de una empresa que no recibe
  // actividades.
  const ofrecibles = empresas.filter(e => e.activo)
  const [titulo, setTitulo] = useState(tema?.titulo ?? '')
  const [empresa, setEmpresa] = useState(tema?.empresa ?? ofrecibles[0]?.codigo ?? '')
  const [guardando, setGuardando] = useState(false)

  const listo = titulo.trim() !== '' && empresa !== '' && Boolean(usuario?.id)

  async function enviar() {
    if (!listo || !usuario?.id) return
    setGuardando(true)
    const ok = await onGuardar(tema?.id ?? null,
      { empresa, titulo: titulo.trim(), creado_por_id: usuario.id })
    setGuardando(false)
    if (ok) onCerrar()
  }

  // `kind="confirm"` y sin `label`: su rótulo por defecto ES "Guardar cambios" y su tono sale del
  // kind — pisarlo con un `label` es lo que hizo mentir al botón de imprimir el 31/08. Los props
  // de estado se llaman `deshabilitado` y `ocupado`, no `disabled`/`loading`
  // (`Button/index.tsx:39`).
  const guardarBtn = <Button kind="confirm" deshabilitado={!listo} ocupado={guardando} onClick={enviar} />

  return (
    <Modal title={t(tema ? 'common.edit' : 'admin.temas.nuevo')} anchoRem={30}
      onClose={onCerrar} footer={guardarBtn}>
      <Field label={t('admin.temas.campoTitulo')} required>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} style={inputStyle} />
      </Field>
      <Field label={t('admin.temas.campoEmpresa')} required>
        <select value={empresa} disabled={Boolean(tema)} style={inputStyle}
          onChange={e => setEmpresa(e.target.value)}>
          {ofrecibles.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
        </select>
      </Field>
    </Modal>
  )
}
```

- [ ] **Paso 2: Enchufarlo**

En `TemasManager/index.tsx`, sacar `const { temas, cargando, mensaje, alternarActivo } = useTemas()`
y poner `guardar` también; después reemplazar la línea `{editando && null}` por:

```tsx
      {editando && (
        <TemaModal tema={editando.tema} onGuardar={guardar} onCerrar={() => setEditando(null)} />
      )}
```

con su import: `import TemaModal from '../TemaModal'`.

- [ ] **Paso 3: El gate**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: verde. Si `TemasManager` pasó las 50 líneas de código, el centinela lo frena: partir la
lista en un subcomponente, **no** firmar una exención.

- [ ] **Paso 4: La prueba que vale — cargar datos por la pantalla**

```bash
pnpm dev
```

Como admin, en `/admin` → Temas:

1. Crear **"Presupuesto Q4"** en EMC. Tiene que aparecer en la lista con el chip de EMC.
2. Crear **"Presupuesto Q4"** en Servi-Net. Tiene que **entrar**: el UNIQUE es por empresa y son
   dos asuntos distintos a propósito.
3. Crear **"  presupuesto q4  "** otra vez en EMC. Tiene que rebotar con
   `admin.temas.errorDuplicado`, no con el error crudo de Postgres — y **no** debe crear una fila.
4. Editar el título del primero a "Presupuesto Q4 2027" y confirmar que se guarda (la policy
   `temas_update` lo permite: es admin, y además el tema no tiene tratamientos).
5. Desactivarlo y confirmar que la fila queda con el rótulo *Inactivo* y **sin** botón de borrar.
6. Buscar `svn` y confirmar que queda sólo el de Servi-Net.
7. ⚠️ Abrir el `<select>` de empresa y confirmar que ofrece una que **no** recibe actividades
   (en local, `Stratix` o `Eminat`). Si sólo lista siete, el modal volvió a `marcas` y el
   catálogo no puede seguir a las actas.

Anotar el resultado en el PR en una línea. Los pasos 2, 3 y 7 son los que prueban que la clave
única y la lista de empresas son las correctas, y ningún test los cubre.

- [ ] **Paso 5: Mostrar a Wagner y commitear**

```bash
git add src/features/admin/components/TemaModal src/features/admin/components/TemasManager
git commit -m "feat(admin): alta y corrección de un tema desde el catálogo"
```

---

## Tarea 8: El precheck en el runbook y la deuda anotada

Esta fase no se pushea sola, pero deja instrucciones que dentro de tres fases nadie va a recordar.

**Files:**
- Modify: `docs/superpowers/plans/2026-09-09-operations-fase-2-temas.md` (esta sección, marcando lo
  hecho)
- Modify: `.todo/TODO.md` del pool central (`~/.local/share/todo/eminat-app/.todo/`)

- [ ] **Paso 1: Anotar las deudas que esta fase produce**

⚠️ Decía "las tres" y la lista tenía cinco. Ahora son siete: la 6 y la 7 las agregó la segunda
pasada.

En el `.todo`:

1. **Colapsar el gate de dos slugs.** `puedo_ver_reunion` y `temas_insert` nombran
   `operations OR reuniones`. El día que se absorba `reuniones`, el `OR` sale y queda
   `operations` a secas. Marcado con un comentario en la migración.
2. **`reunion_temas` sigue sin UI.** Después de esta fase la columna `tema_id` existe y nada la
   escribe: el modal del tratamiento es la fase 3. Hasta entonces, un acta no tiene orden del día.
3. **Ninguna fase de §8 absorbe `reuniones`.** El spec da por hecho que pasa a ser una pestaña,
   pero su tabla de seis fases no le asigna esa tarea a ninguna: la fase 1 la difirió a "la fase
   3" y la fase 3 de §8 es el puente. Hay que decidir de quién es.
4. **`log_reunion()` no puede auditar un `UPDATE` de ninguna tabla sin `estado`.** Su línea 15
   combina `TG_TABLE_NAME = 'reuniones'` con `OLD.estado` en un solo `AND`, y PL/pgSQL no lo
   corta. Cuando la fase 3 la vuelva a declarar para sacarle `reunion_pendientes`, los `IF` por
   tabla van **anidados**; recién ahí los triggers de `temas` y `reunion_temas` pueden llevar
   `OR UPDATE`.
5. **`supabase/checks/prueba-tema-para-acta.sql` no corre en ningún gate.** `pnpm db:rls` es el
   único check de SQL enchufado al pre-push. Sumarla es un PR de una línea en `.githooks/`.
6. ⚠️ **`tema_para_acta()` ignora `activo`** (D9). Decidir antes de la fase 3 si un tema inactivo
   se reactiva al tratarlo, se rechaza, o `activo` es sólo un rótulo del catálogo. La prueba 6
   de `prueba-tema-para-acta.sql` pinta el comportamiento de hoy y cambia con la decisión.
7. ⚠️ **La mudanza de la fase 6 crece siete archivos.** `Tema` vive en
   `features/reuniones/types.ts` y lo importan `shared/data/temas.ts`, `filtrarTemas` (index y
   test), `useTemas`, `TemaFila`, `TemasManager` y `TemaModal`. El conteo de 119 del preflight
   se hizo antes de esta fase.

- [ ] **Paso 2: Dejar escrito el paso del runbook de despliegue**

Cuando llegue el push conjunto de las seis fases, en el orden que manda §8.1:

⚠️ **Decisión pendiente de Wagner, antes de ese día:** `db push` aplica todo lo pendiente y
`20260909233746` (1C) está en la carpeta, así que "pushear la apertura" hoy aplicaría 1A, esta
migración **y el cierre** de un solo viaje — y lo mismo les pasa a las fases 3 a 5, cuyos
archivos van a quedar *después* de 1C. Ver «Orden de despliegue». La opción que no ensucia
`schema_migrations` de local: sacar el archivo de 1C de `supabase/migrations/` para el push de
apertura y devolverlo para el de cierre.

```bash
# 1. El precheck, contra PROD, antes de todo lo demás. Aborta si alguna de las dos tablas
#    dejó de estar vacía desde el 09/09. `db query` acepta `--file`: es el MISMO archivo que
#    se probó en local, no una consulta parecida escrita a mano.
pnpm supabase db query --linked --file supabase/checks/precheck-temas.sql
#    Si aborta: PARAR. No hay backfill escrito.

# 2. El backup, en DOS piezas — un --data-only no cubre policies ni funciones, y esta
#    migración reemplaza `reunion_temas_select` y crea dos funciones.
#    ⚠️ La versión anterior hacía `docker exec supabase_db_eminat-app pg_dump …`: ése es el
#    contenedor de Supabase LOCAL. Habría "respaldado" la base equivocada con un archivo lleno
#    y nadie lo habría notado hasta necesitarlo. A prod se entra sólo por `--linked` (memoria
#    del 09/09); la receta es la de la fase 1, Tarea 5.
pnpm supabase db dump --linked -f supabase/rollback/predump-temas-$(date +%Y%m%d)-schema.sql
pnpm supabase db dump --linked --data-only \
  -f supabase/rollback/predump-temas-$(date +%Y%m%d)-data.sql
ls -la supabase/rollback/predump-temas-*   # un archivo de 0 bytes es el modo de falla conocido

# 3. Ver TODO lo que se va a aplicar, no sólo esta.
pnpm supabase migration list --linked

# 4. El push (con la aprobación explícita de Wagner).
pnpm supabase db push
```

Y la verificación posterior, que **no** se hace con la cuenta de admin:

```bash
pnpm supabase db query --linked \
  "select relrowsecurity from pg_class where oid = 'public.temas'::regclass;"
pnpm supabase db query --linked \
  "select count(*) from information_schema.role_table_grants
    where table_schema='public' and table_name='temas' and grantee='anon';"
```

Expected: `true` y `0`.

- [ ] **Paso 3: El barrido y el gate completo**

```bash
pnpm rules:barrido
pnpm db:rls && pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

El barrido cobra la rama entera, no sólo lo que esta fase tocó: si aparecen hallazgos en archivos
que la rama tocó por primera vez, es deuda vieja y la decisión de qué hacer es de Wagner.

- [ ] **Paso 4: Commitear**

```bash
git add docs/superpowers/plans/2026-09-09-operations-fase-2-temas.md
git commit -m "docs(operations): runbook y deuda de la fase 2"
```

---

## Cierre de la fase 2

- [ ] **La pasada por navegador la hace un humano.** Los seis pasos de la Tarea 7, paso 4. Un
      subagente manejando el browser para un login es caro y frágil, y es justo la comprobación
      que conviene que mire una persona (ruling 5 de la fase 1).
- [ ] **El CLAUDE.md no miente todavía** por esta fase: no cambia módulos, ni rutas, ni el árbol
      de `src/`. Sí lo van a hacer las fases 3 y 6.
- [ ] **`supabase/checks/prueba-tema-para-acta.sql` queda en el repo.** No corre en ningún gate
      —`pnpm db:rls` es el único check de SQL enchufado— pero es la única prueba de la función
      hasta que la fase 3 le ponga un consumidor. Enchufarla al pre-push es un PR de una línea y
      está en el `.todo`.

## Lo que esta fase deja sin hacer

- **El buscar-o-crear del acta.** `tema_para_acta()` existe y nadie la llama desde el bundle. La
  pieza de UI no existe y `CatalogoSelect` (`src/shared/components/ui/CatalogoSelect`) no sirve: es
  un `<select>` sobre catálogo fijo y **su propio comentario declara ese techo** —"Acá las opciones
  son un catálogo fijo… El techo está dicho". Ojo con el homónimo:
  `src/features/admin/components/CatalogSelect.tsx` es otra cosa (un select de FK a un catálogo
  organizacional) y tampoco sirve.
- **El orden del día en el acta.** `reunion_temas.tema_id` está y nada lo escribe: la fase 3.
- **`reunion_pendientes` sigue en pie**, con su dominio `estado_pendiente` y su rama en
  `log_reunion()`. La fase 3 la dropea.
- **El gate de dos slugs sigue puesto.** Sale cuando `reuniones` se absorba, y hoy ninguna fase de
  §8 tiene esa tarea asignada.
- ⚠️ **`activo` no es una baja para el acta** (D9): `tema_para_acta()` devuelve un tema inactivo
  como si nada. Decisión de Wagner antes de la fase 3.
- ⚠️ **`temas_insert` no defiende el camino del acta.** La policy gatea por módulo; la función es
  `SECURITY DEFINER` y no la evalúa. Es lo que el diseño pide —la función copia
  `reunion_temas_write`, que tampoco nombra un slug—, pero el comentario de la migración dice
  que la policy existe "para que la función no sea la única defensa", y para ese camino **es** la
  única. Lo que la policy cubre es el `/admin`.
- **`historial` no registra ningún `UPDATE` de `temas` ni de `reunion_temas`** — ni el cambio de
  título, ni el `activo`, ni la descripción de un punto. El trigger va `AFTER INSERT OR DELETE`
  porque con `UPDATE` la tabla se rompe entera: `log_reunion()` evalúa `OLD.estado` en una
  condición que PL/pgSQL no corta (D6, reproducido contra el Postgres local). Arreglarlo obliga a
  volver a declarar la función con los `IF` anidados por tabla, y eso es exactamente lo que la
  fase 3 tiene que hacer igual para sacarle la rama de `reunion_pendientes`. Va ahí, de una vez.
