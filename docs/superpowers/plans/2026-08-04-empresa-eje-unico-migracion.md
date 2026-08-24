# Migración `empresa` como eje único — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **ESTADO (2026-08-05): plan PARCIALMENTE EJECUTADO — no fallido.**
> - **Task 1 y 2: HECHAS** y commiteadas (`f554a53`, `183d150`, `79d677c`). La migración `supabase/migrations/20260804213205_empresa_rename_eje_unico.sql` está aplicada **solo en local**.
> - **Task 3 / Appendix A (dev remoto + prod): PENDIENTES.** El rollout se difiere al **PR único al final de la cadena** de specs (empresa-rename → equipo-real Fase A → A.2 → B → C). Por eso, el "abrir PR aquí" (Task 3, Step 3) y la Global Constraint *"EN EL MISMO PR"* quedan **superseded** por esa estrategia. El **Appendix A (pre-flight + rollout a prod) sigue vigente** como checklist para ese cierre.
> - **Task 4 (FK `usuarios.empresa`): reubicada** en la **Fase C** del spec `docs/superpowers/specs/2026-08-04-equipo-real-fase-a-design.md`. No ejecutar desde aquí.

**Goal:** Renombrar el esquema para que `empresa/marca` sea el único eje de agrupación (BR1–BR3, BR6 del spec), eliminando la palabra "area" de la base y del código de Stratix, y poblar la tabla `empresas`.

**Architecture:** Migración de esquema puro-rename (`areas`→`empresas`, `area_id`→`empresa_id`, `actividades.area_ref`→`actividades.empresa`) + seed idempotente de `empresas`. El rename de columna acopla un rename mecánico de token en `features/stratix-mkt/` (único consumidor de `area_ref`). `area_id` no lo lee ningún código → su rename es DB-only. El FK de pertenencia (`usuarios.empresa`) queda **fuera** por un choque de vocabulario (Task 4, no se ejecuta).

**Tech Stack:** Supabase CLI (migraciones SQL), Postgres, Next.js 14 + TypeScript, Vitest, Docker (Supabase local).

## Global Constraints

- **DB primero, código después, EN EL MISMO PR.** Renombrar la columna rompe el código que la lee; migración y ajuste de código no pueden ir en PRs separados (spec §6, §7).
- **Orden de aplicación:** local Docker (`pnpm supabase db push` contra el stack local) → dev remoto (`ydcadspinryybextlvyi`) → prod (`ruedelunbtaomhrzgelc`). **Nunca** tocar prod sin dev en verde y sin el pre-flight (Appendix A).
- **Prod es producción:** solo lectura para verificación hasta el paso de rollout. No insertar filas de prueba.
- **Seed de `empresas` = `MARCAS_LIST` tal cual** (BR6). No agregar/quitar empresas (la reconciliación Ondara/Vivi/etc. se hace luego desde `/admin`, no acá).
- **`empresa` ≠ `módulo`** — no tocar `roles`/`role_modules` (spec §8).
- Token de rename: `area_ref` → `empresa` es un token completo distinto de `responsable_ref`; el replace-all por archivo es seguro dentro de `features/stratix-mkt/`.

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/<ts>_empresa_rename_eje_unico.sql` | Rename de tabla+columnas y seed de `empresas` | Crear |
| `features/stratix-mkt/types.ts` | Tipos `Actividad` / `NuevaActForm` | Modificar (`area_ref`→`empresa`) |
| `features/stratix-mkt/hooks/useStratixData.ts` | Hub de datos (default form, filtros, insert, notificación, export HTML) | Modificar |
| `features/stratix-mkt/components/gantt/GanttBar.tsx` | Chip de marca en la barra Gantt | Modificar |
| `features/stratix-mkt/components/modals/ActivityDetailModal.tsx` | Chip de marca en detalle | Modificar |
| `features/stratix-mkt/components/modals/NewActivityModal.tsx` | `<select>` de marca del form | Modificar |
| `features/stratix-mkt/components/overview/RecentActivityRow.tsx` | Línea de actividad reciente | Modificar |
| `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx` | Chip de marca en card Kanban | Modificar |
| `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx` | Chip de marca en tabla | Modificar |
| `features/stratix-mkt/components/solicitudes/MemberAvailabilityCard.tsx` | Punto de color por marca | Modificar |
| `features/stratix-mkt/components/reporte/ReportTableRow.tsx` | Celda de marca en reporte | Modificar |

---

## Task 1: Migración de esquema (rename + seed)

**Files:**
- Create: `supabase/migrations/<timestamp>_empresa_rename_eje_unico.sql` (el timestamp lo genera la CLI)

**Interfaces:**
- Produces: tabla `empresas` (antes `areas`, mismas columnas: `id uuid pk`, `codigo unique`, `nombre`, `color`, `descripcion`, `activo`, `created_at`), poblada con 7 filas (MARCAS_LIST). Columnas renombradas: `actividades.empresa_id`, `actividades.empresa`, `slots_calendario.empresa_id`, `solicitudes.empresa_id`. La app lee `actividades.empresa` (código, ej. `'EMC'`) donde antes leía `area_ref`.

- [ ] **Step 1: Crear el archivo de migración vacío**

Run:
```bash
pnpm supabase migration new empresa_rename_eje_unico
```
Expected: crea `supabase/migrations/<timestamp>_empresa_rename_eje_unico.sql` (vacío).

- [ ] **Step 2: Escribir el SQL de la migración**

Escribir en el archivo creado:
```sql
-- empresa como eje único: rename de esquema + seed de empresas.
-- Ver docs/superpowers/plans/2026-08-04-empresa-eje-unico-migracion.md
-- Idempotente en lo posible; los RENAME fallan si ya se aplicaron (correcto: no re-aplicar).

-- 1) Renombrar la tabla areas -> empresas.
ALTER TABLE public.areas RENAME TO empresas;

-- 2) Renombrar las columnas FK uuid (area_id -> empresa_id). Sin call-sites en código.
ALTER TABLE public.actividades      RENAME COLUMN area_id TO empresa_id;
ALTER TABLE public.slots_calendario RENAME COLUMN area_id TO empresa_id;
ALTER TABLE public.solicitudes      RENAME COLUMN area_id TO empresa_id;

-- 3) Renombrar la columna de código legible que usa la app (area_ref -> empresa).
ALTER TABLE public.actividades RENAME COLUMN area_ref TO empresa;

-- 4) Seed idempotente de empresas desde MARCAS_LIST (shared/constants/domain.ts).
--    nombre = label; color = color de MARCAS_LIST.
INSERT INTO public.empresas (codigo, nombre, color, activo) VALUES
  ('EMC',     'Medical Center',    '#60A5FA', true),
  ('SVN',     'Soy Vivi Negrete',  '#F472B6', true),
  ('ERG',     'Research Group',    '#A78BFA', true),
  ('VNF',     'VN Foundation',     '#FB923C', true),
  ('PREMIER', 'Premier',           '#34D399', true),
  ('ORNELLA', 'Ornella IA',        '#F87171', true),
  ('MENTOR',  'Eminat Mentor',     '#FBB040', true)
ON CONFLICT (codigo) DO NOTHING;

-- Nota: índices/constraints heredan el nombre viejo (areas_pkey, areas_codigo_key,
-- actividades_area_id_fkey). Renombrarlos es cosmético y se difiere.
-- NO se agrega FK en usuarios.empresa ni en actividades.empresa (ver Task 4).
```

- [ ] **Step 3: Aplicar al stack local de Docker y verificar el rename**

Run (con Supabase local corriendo):
```bash
pnpm supabase db push --local
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres -c "\d empresas" -c "SELECT count(*) FROM empresas;" -c "\d actividades"
```
Expected: la tabla aparece como `empresas`; `count = 7`; `actividades` muestra columnas `empresa_id` y `empresa` (ya no `area_id`/`area_ref`).

- [ ] **Step 4: Verificar que los datos seedeados sobrevivieron el rename**

Run:
```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres -c "SELECT empresa, count(*) FROM actividades GROUP BY empresa ORDER BY 1;"
```
Expected: las 18 actividades sembradas siguen ahí, agrupadas por su código de empresa (EMC, SVN, …). Ninguna fila perdida.

- [ ] **Step 5: Commit de la migración**

```bash
git add supabase/migrations/
git commit -m "feat(db): rename areas->empresas, area_id->empresa_id, area_ref->empresa + seed"
```

---

## Task 2: Rename `area_ref` → `empresa` en el código de Stratix

**Files:** (todos bajo `features/stratix-mkt/`)
- Modify: `types.ts:7` (`Actividad.area_ref`), `types.ts:28` (`NuevaActForm.area_ref`)
- Modify: `hooks/useStratixData.ts` (líneas 9, 57, 70, 118, 139, 159)
- Modify: `components/gantt/GanttBar.tsx:18`, `components/modals/ActivityDetailModal.tsx:29`, `components/modals/NewActivityModal.tsx:34`, `components/overview/RecentActivityRow.tsx:11`, `components/kanban/KanbanTaskCard.tsx:8,14`, `components/solicitudes/TaskTableRow.tsx:15`, `components/solicitudes/MemberAvailabilityCard.tsx:63`, `components/reporte/ReportTableRow.tsx:9`
- Test: `features/stratix-mkt/index.test.ts` (existente, no se modifica; debe seguir verde)

**Interfaces:**
- Consumes: `actividades.empresa` (Task 1) — mismo valor (código de marca) que antes tenía `area_ref`.
- Produces: `Actividad.empresa?: string` y `NuevaActForm.empresa: string`. Todos los consumidores leen `a.empresa` / `nuevaAct.empresa`.

- [ ] **Step 1: Reemplazar el token `area_ref` por `empresa` en todo el módulo**

Run:
```bash
grep -rl 'area_ref' features/stratix-mkt/ | xargs sed -i 's/area_ref/empresa/g'
```
Nota: `area_ref` es un token completo (no colisiona con `responsable_ref`). Esto cubre el tipo, el default del form (`empresa: 'EMC'`), los filtros, el `insert({ empresa: ... })`, la notificación y el export HTML.

- [ ] **Step 2: Verificar que no quedó ningún `area_ref`**

Run:
```bash
grep -rn 'area_ref' features/ shared/ app/ lib/ || echo "OK: sin area_ref"
```
Expected: `OK: sin area_ref`.

- [ ] **Step 3: Typecheck (esta es la prueba real del rename)**

Run:
```bash
pnpm typecheck
```
Expected: PASS. Si algún consumidor de `area_ref` quedó sin renombrar, `tsc` falla acá con "Property 'area_ref' does not exist".

- [ ] **Step 4: Correr la suite de tests**

Run:
```bash
pnpm test
```
Expected: PASS (incluye `features/stratix-mkt/index.test.ts`).

- [ ] **Step 5: Smoke test en el navegador**

Con `pnpm dev` corriendo y el stack local aplicado (Task 1): abrir `http://localhost:3000/stratix-mkt`, entrar a Kanban y Gantt. Verificar que los chips de marca (EMC, SVN, …) siguen mostrando su color y código. Crear una tarea nueva desde "New task" eligiendo una marca y confirmar que aparece con su chip.
Expected: chips con color correcto; alta de tarea persiste con su empresa.

- [ ] **Step 6: Commit del rename de código**

```bash
git add features/stratix-mkt/
git commit -m "refactor(stratix): area_ref -> empresa tras rename de esquema"
```

---

## Task 3: Aplicar a dev remoto y abrir el PR (DB + código juntos)

**Files:** ninguno (operación de despliegue).

**Interfaces:** N/A.

- [ ] **Step 1: Linkear y aplicar la migración a dev remoto**

Run:
```bash
pnpm supabase link --project-ref ydcadspinryybextlvyi
pnpm supabase db push
```
Expected: aplica `<ts>_empresa_rename_eje_unico.sql` a dev sin error. (Dev estaba con `areas` vacío → seed inserta 7 filas.)

- [ ] **Step 2: Verificar en dev remoto**

Run:
```bash
pnpm supabase db push --dry-run   # debe decir "no changes" tras el push
```
O verificar vía Studio de dev que `empresas` tiene 7 filas y `actividades.empresa` existe.
Expected: esquema de dev sincronizado con la migración.

- [ ] **Step 3: Push de la rama y PR**

```bash
git push -u origin HEAD
gh pr create --base main --head development \
  --title "feat: empresa como eje único (rename de esquema + código Stratix)" \
  --body "Migración areas->empresas, area_id->empresa_id, area_ref->empresa + seed de empresas. DB y código en el mismo PR (el rename de columna rompe el código si van separados). FK de usuarios.empresa y de actividades.empresa quedan diferidos (ver plan Task 4). Prod pendiente de pre-flight (Appendix A)."
```
Expected: PR abierto de `development` → `main`.

> ⚠️ **No mergear ni aplicar a prod** hasta correr el pre-flight de Appendix A y tener el OK del usuario.

---

## Task 4: FK de pertenencia `usuarios.empresa` — DIFERIDO (no ejecutar)

> **Este task NO se implementa en este plan.** Se documenta el bloqueo para el spec de seguimiento.

El spec §4.2 (BR3) pedía `usuarios.empresa → FK empresas.codigo`. **No es aplicable tal cual** por un choque de vocabulario descubierto al planificar:

- `actividades.empresa` (ex-`area_ref`) guarda **códigos**: `EMC, SVN, ERG, VNF, PREMIER, ORNELLA, MENTOR` (`MARCAS_LIST`, `shared/constants/domain.ts`).
- `usuarios.empresa` guarda **nombres completos**: `Eminat Group`, `Stratix Communications`, `EMC (Eminat Medical Center)`, `Ondara Media`, `DaCoach IS`, … (`COMPANIES`, `shared/constants/companies.ts`, 10 entradas) + aliases legacy (`Eminat Medical Center`, …) que aparecen en `shared/constants/directorio.ts`.

Un FK `usuarios.empresa → empresas.codigo` **rechazaría** casi todas las filas actuales (los valores no son códigos, y varias empresas de usuarios —Eminat Group, Stratix, Ondara, DaCoach— ni existen en MARCAS_LIST).

**Decisión requerida del usuario antes de este task** (spec de seguimiento):
1. ¿Una sola lista canónica de empresas o dos (marca-de-actividad vs empresa-de-persona)?
2. Si es una: ¿el catálogo `empresas` usa códigos (EMC…) o nombres (Eminat Group…)? ¿Se migran los valores de `usuarios.empresa` a ese formato?
3. ¿Se reconcilian las 10 de `COMPANIES` con las 7 de `MARCAS_LIST` (agregar Ondara/DaCoach/Stratix a `empresas`, o son otra cosa)?

Recién con eso definido se puede: normalizar los valores de `usuarios.empresa`, poblar `empresas` completa, agregar el `UNIQUE CONSTRAINT` en `empresas.codigo` (hoy es solo un unique **index**), y el FK. Igual para el FK opcional en `actividades.empresa` (spec §5.1/§9).

---

## Appendix A: Pre-flight y rollout a producción

> Correr **antes** de aplicar la migración a prod (`ruedelunbtaomhrzgelc`). Solo lectura hasta confirmar.

- [ ] **A1: Pre-flight — códigos de empresa fuera de catálogo en prod**

Contra prod (solo SELECT), verificar que todo `actividades.area_ref` no nulo esté en la lista a seedear:
```sql
SELECT DISTINCT area_ref
FROM public.actividades
WHERE area_ref IS NOT NULL
  AND area_ref NOT IN ('EMC','SVN','ERG','VNF','PREMIER','ORNELLA','MENTOR');
```
Expected: **0 filas.** Si hay valores legacy fuera de catálogo, decidir con el usuario (seed extra o limpieza) **antes** de continuar — no bloquea el rename (no se agrega FK sobre la columna), pero conviene saberlo para el seed y para el spec de FK diferido.

- [ ] **A2: Aplicar a prod**

Run:
```bash
pnpm supabase link --project-ref ruedelunbtaomhrzgelc
pnpm supabase db push
```
Expected: aplica el rename + seed a prod. (Prod ya tiene datos en `actividades`; el rename preserva filas, el seed hace upsert de las 7 empresas.)

- [ ] **A3: Verificar en prod**

```bash
pnpm supabase db push --dry-run   # "no changes"
```
Más una verificación de conteo vía Studio de prod (`empresas` = 7; `actividades.empresa` existe, sin filas perdidas).
Expected: esquema de prod sincronizado; datos intactos.

---

## Self-Review (cobertura del spec)

- **BR1 (empresa = eje único):** Task 1 renombra la tabla y columnas. ✅
- **BR2 (sin subdivisiones):** el plan no crea `equipos`/`departamentos`/`lider`. ✅ (por omisión)
- **BR3 (una persona = una empresa):** el FK de pertenencia queda **diferido y flagueado** (Task 4) por el choque de vocabulario — no se puede implementar correctamente sin decisión del usuario. Divergencia consciente del spec §4.2, documentada.
- **BR6 (lista tal cual, gestionable desde admin):** Task 1 seed = MARCAS_LIST sin cambios; la tabla `empresas` soporta CRUD. ✅ (la UI de admin es spec §8, fuera de alcance)
- **BR4/BR5/BR7 (roles/visibilidad):** fuera de alcance (spec §8). ✅
- **Coordinación DB↔código mismo PR (spec §6/§7):** Tasks 1–3 en la misma rama/PR. ✅
- **Pre-flight prod (spec §5.1):** Appendix A. ✅
