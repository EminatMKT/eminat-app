# Ambient Duplicate-Detection Engine (Medical/pacientes) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the generic deduplication engine (`src/shared/dedup/`) and wire it into Medical/pacientes — a pending-pair queue, discard memory, transactional merge/revert, and a new tab in `/medical`.

**Architecture:** Four generic Postgres tables (discriminated by `entidad`) plus six `SECURITY DEFINER` functions, all already decided at the requirements level (see spec). The TS contract `DedupStrategy<T>` lives in `src/shared/dedup/`, following the pattern already proven by `src/shared/import/identity.ts`; Medical implements the adapter by wrapping `pacienteIdentity`. Every SQL function is built with TDD: a verification script (`supabase/checks/`) that fails before the function exists and passes after — the mechanism that, unlike the spec's 6 adversarial review rounds, catches these bugs in minutes.

**Tech Stack:** Next.js 14 · TypeScript · Supabase (Postgres 17) · vitest · SheetJS (already in use, no changes)

**Spec:** `docs/superpowers/specs/2026-10-12-motor-duplicados-ambiente-design.md` — read it in full before Task 1. This plan translates its requirements into code; it does not repeat the reasoning behind each requirement (that's in the spec, along with the history of the 6 review rounds that produced it).

## Global Constraints

Copied from the spec and this repo's centinela rules. Apply to **every** task.

- **`any` is forbidden** (ESLint `no-explicit-any: error`).
- **No `../../`** — import with `@/features/…` or `@/shared/…`.
- **A component is a folder**: `index.tsx` + `index.module.css` + `index.test.tsx`.
- **The `style` attribute is forbidden**, except to pass a data value as a CSS variable.
- **i18n**: every visible string goes through `useT()`/`t()`, with a key in both `es.json` and `en.json`.
- **`src/shared/` never imports from `src/features/`.**
- **Vitest runs without a DOM**: every component test targets a pure function; never mount a component.
- **Never `pnpm supabase db reset`.** Locally: `pnpm supabase migration up`.
- **The module slug lives in a variable and the migration aborts if it doesn't exist** (centinela rule `base-de-datos.md`) — already applied in the spec for `'medical'`; repeat the pattern if another slug is ever added.
- **A migration that distributes permissions lists the explicit role, never copies it with a `SELECT`.**
- **No policy authorizes just for having a session** (`qual: true` is forbidden).
- **Commits by explicit path**: `git commit path/one.ts path/two.ts -m "…"`. Never `git add -A`.
- **Verification**: `pnpm typecheck && pnpm test` before every TS/UI commit. For SQL checks: the `rls.sh`-style pattern (`psql ... -f file.sql`, skips if the local stack isn't up).

## Review Focus

Cases the spec implies but no task covers unless named here explicitly:

1. **NULL `fecha_nacimiento` in blocking** — `pacienteIdentity.candidatos()` already says "no DOB, no candidates"; `pacientes_candidatos_escaneo()` has to exclude those rows from the self-join, or it builds one giant `NULL` bucket. Test in Task 8.
2. **Two calls to `addPaciente`/import with the same name+DOB before any patient exists yet** — the first registration has nothing to compare against; the second does. Test in Task 4 (adapter) and Task 14 (wiring).
3. **Empty `p_valores_finales` (`{}`)** — trivially passes rules 1/2/3 but fails rule 4 if any column differs; confirms the completeness rule can't be dodged by sending an empty payload. Test in Task 9.
4. **Reusing the same `pg_advisory_xact_lock` across two different entities whose ids happen to collide** — the lock key has to include `p_entidad`, not just the ids. Test in Task 5.
5. **`escanear_duplicados` over an empty patient table (0 rows)** — has to finish cleanly, no division by zero, no "no buckets" exception. Test in Task 8.

---

## File Structure

```
supabase/migrations/
  20261012120000_duplicados_motor_tablas.sql
  20261012120100_duplicados_motor_blocking.sql
  20261012120200_duplicados_motor_registrar.sql
  20261012120300_duplicados_motor_descartes.sql
  20261012120400_duplicados_motor_escaneo.sql
  20261012120500_duplicados_motor_fusionar.sql
  20261012120600_duplicados_motor_revertir.sql

supabase/checks/
  duplicados-motor-tablas.sql
  duplicados-motor-nysiis.sql
  duplicados-motor-registrar.sql
  duplicados-motor-descartes.sql
  duplicados-motor-escaneo.sql
  duplicados-motor-fusionar.sql
  duplicados-motor-revertir.sql

src/shared/dedup/
  strategy.ts                 (create)
  index.ts                    (create — barrel)
  ordenarPendientes.ts         (create — pure sort function, kept outside the component)
  DuplicatesTab/
    index.tsx                 (create)
    index.module.css          (create)

src/features/medical/utils/pacienteDedupStrategy/
  index.ts                    (create)
  index.test.ts               (create)

src/features/medical/components/PacientesDuplicatesTab/
  index.tsx                   (create)

src/shared/import/MergeFieldRow/
  index.tsx                   (modify — add `onChooseValue`/`selectedIndex` props)
  index.module.css             (modify)

src/features/medical/hooks/useMedicalData.ts           (modify — incremental hook in addPaciente)
src/features/medical/utils/pacienteImportPlan/index.ts  (modify — incremental hook in the import)
src/features/medical/components/MedicalModule.tsx       (modify — mount the new tab)
src/shared/components/shell/appShellConfig/subvistas.ts (modify — 'duplicados' entry)
src/shared/i18n/locales/es.json, en.json                (modify — new keys)
```

Table names, column names, and RPC names stay exactly as the spec defines them, matching the rest of the existing schema's naming. Only the prose, comments, and error messages that are new content from this point forward go in English, per the rule this plan itself now follows.

---

## Task 1: Migration — base tables + minimal RLS/GRANT + seed

**Files:**
- Create: `supabase/migrations/20261012120000_duplicados_motor_tablas.sql`
- Create: `supabase/checks/duplicados-motor-tablas.sql`

**Interfaces:**
- Produces: tables `duplicados_entidades`, `duplicados_pendientes`, `duplicados_descartes`, `duplicados_fusiones` — every later task depends on this exact shape existing.

- [ ] **Step 1: Write the failing check**

```sql
-- supabase/checks/duplicados-motor-tablas.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'duplicados_entidades') THEN
    RAISE EXCEPTION 'duplicados_entidades is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_entidades WHERE entidad = 'pacientes' AND tabla = 'pacientes' AND modulo = 'medical') THEN
    RAISE EXCEPTION 'seed row for pacientes is missing in duplicados_entidades';
  END IF;
  IF (SELECT hijos FROM public.duplicados_entidades WHERE entidad = 'pacientes') <>
     '[{"tabla":"paciente_fuentes","columna":"paciente_id"},{"tabla":"paciente_contactos","columna":"paciente_id"}]'::jsonb THEN
    RAISE EXCEPTION 'hijos of the pacientes seed row does not match';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN
      ('duplicados_entidades','duplicados_pendientes','duplicados_descartes','duplicados_fusiones')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'some table of the dedup engine does not have RLS enabled';
  END IF;
  IF has_table_privilege('authenticated', 'public.duplicados_entidades', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated should not be able to INSERT into duplicados_entidades';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.duplicados_pendientes', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated should be able to SELECT from duplicados_pendientes';
  END IF;
END $$;
```

- [ ] **Step 2: Run the check and confirm it fails**

```bash
pnpm supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-tablas.sql
```
Expected: `ERROR: duplicados_entidades is missing`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20261012120000_duplicados_motor_tablas.sql
CREATE TABLE IF NOT EXISTS public.duplicados_entidades (
  entidad            text PRIMARY KEY,
  tabla              text NOT NULL,
  modulo             text NOT NULL,
  hijos              jsonb NOT NULL DEFAULT '[]'::jsonb,
  funcion_candidatos text NOT NULL
);

DO $$
DECLARE
  slug text := 'medical';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'module slug % has no role assigned to it: either it is a typo, or an '
                    'admin removed the module from every role. Check before continuing.', slug;
  END IF;

  INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, hijos, funcion_candidatos) VALUES
    ('pacientes', 'pacientes', slug,
     '[{"tabla":"paciente_fuentes","columna":"paciente_id"},
       {"tabla":"paciente_contactos","columna":"paciente_id"}]'::jsonb,
     'pacientes_candidatos_escaneo')
  ON CONFLICT (entidad) DO NOTHING;
END $$;

CREATE TABLE IF NOT EXISTS public.duplicados_pendientes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  nivel         text NOT NULL CHECK (nivel IN ('exacta','parcial')),
  origen        text NOT NULL CHECK (origen IN ('import','alta_manual','escaneo')),
  detectado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_pendientes_par_ordenado CHECK (item_id_a < item_id_b)
);

CREATE TABLE IF NOT EXISTS public.duplicados_descartes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  motivo        text NOT NULL CHECK (motivo IN ('no_son_la_misma', 'son_la_misma_separadas')),
  nota          text,
  decidido_por  uuid REFERENCES public.usuarios(id),
  decidido_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_descartes_par_ordenado CHECK (item_id_a < item_id_b),
  CONSTRAINT duplicados_descartes_nota_si_separadas
    CHECK (motivo <> 'son_la_misma_separadas' OR nota IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.duplicados_fusiones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad                 text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  ganador_id              uuid NOT NULL,
  perdedor_id             uuid NOT NULL,
  perdedor_snapshot       jsonb NOT NULL,
  ganador_snapshot_previo jsonb NOT NULL,
  hijos_movidos           jsonb NOT NULL,
  decidido_por            uuid REFERENCES public.usuarios(id),
  decidido_at             timestamptz NOT NULL DEFAULT now(),
  revertido_por           uuid REFERENCES public.usuarios(id),
  revertido_at            timestamptz
);

CREATE INDEX IF NOT EXISTS duplicados_fusiones_ganador_id_idx ON public.duplicados_fusiones (ganador_id);
CREATE INDEX IF NOT EXISTS duplicados_fusiones_perdedor_id_idx ON public.duplicados_fusiones (perdedor_id);

GRANT SELECT ON public.duplicados_entidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicados_entidades TO service_role;

GRANT SELECT
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO service_role;

ALTER TABLE public.duplicados_entidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_descartes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_fusiones   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_por_modulo" ON public.duplicados_entidades
  FOR SELECT USING ((SELECT public.has_module(modulo)));

CREATE POLICY "select_por_modulo" ON public.duplicados_pendientes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_pendientes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_descartes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_descartes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_fusiones
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_fusiones.entidad));
```

- [ ] **Step 4: Apply and re-run the check**

```bash
pnpm supabase migration up
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-tablas.sql
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120000_duplicados_motor_tablas.sql supabase/checks/duplicados-motor-tablas.sql -m "feat(db): base tables for the ambient dedup engine"
```

---

## Task 2: Migration — `nysiis()` + blocking indexes

**Files:**
- Create: `supabase/migrations/20261012120100_duplicados_motor_blocking.sql`
- Create: `supabase/checks/duplicados-motor-nysiis.sql`

**Interfaces:**
- Consumes: the `pacientes` table (already exists).
- Produces: `public.nysiis(text) RETURNS text`, indexes `pacientes_blocking_dmetaphone_idx`/`pacientes_blocking_nysiis_idx` — consumed by Task 8 (`pacientes_candidatos_escaneo()`).

- [ ] **Step 1: Write the failing check (NYSIIS reference vectors, Taft 1970)**

```sql
-- supabase/checks/duplicados-motor-nysiis.sql
DO $$
DECLARE
  casos text[][] := ARRAY[
    ARRAY['HERNANDEZ', 'HARNANAD'],
    ARRAY['GARCIA', 'GARC'],
    ARRAY['KNIGHT', 'NAGT'],
    ARRAY['PFEIFFER', 'FAFFAR'],
    ARRAY['MACDONALD', 'MCANALD']
  ];
  fila text[];
  obtenido text;
BEGIN
  FOREACH fila SLICE 1 IN ARRAY casos LOOP
    obtenido := public.nysiis(fila[1]);
    IF obtenido IS DISTINCT FROM fila[2] THEN
      RAISE EXCEPTION 'nysiis(%) returned % instead of %', fila[1], obtenido, fila[2];
    END IF;
  END LOOP;
END $$;
```

- [ ] **Step 2: Run and confirm it fails**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-nysiis.sql
```
Expected: `function public.nysiis(unknown) does not exist`.

- [ ] **Step 3: Implement `nysiis()` and the indexes**

```sql
-- supabase/migrations/20261012120100_duplicados_motor_blocking.sql
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE OR REPLACE FUNCTION public.nysiis(texto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := upper(trim(texto));
  resultado text;
BEGIN
  IF s = '' OR s IS NULL THEN
    RETURN '';
  END IF;

  s := regexp_replace(s, '^MAC', 'MCC');
  s := regexp_replace(s, '^KN', 'NN');
  s := regexp_replace(s, '^K', 'C');
  s := regexp_replace(s, '^(PH|PF)', 'FF');
  s := regexp_replace(s, '^SCH', 'SSS');

  s := regexp_replace(s, '(EE|IE)$', 'Y');
  s := regexp_replace(s, '(DT|RT|RD|NT|ND)$', 'D');

  resultado := substr(s, 1, 1);
  s := substr(s, 2);

  s := regexp_replace(s, 'EV', 'AF', 'g');
  s := regexp_replace(s, '[AEIOU]', 'A', 'g');
  s := regexp_replace(s, 'Q', 'G', 'g');
  s := regexp_replace(s, 'Z', 'S', 'g');
  s := regexp_replace(s, 'M', 'N', 'g');
  s := regexp_replace(s, 'KN', 'N', 'g');
  s := regexp_replace(s, 'K', 'C', 'g');
  s := regexp_replace(s, 'SCH', 'SSS', 'g');
  s := regexp_replace(s, 'PH', 'FF', 'g');
  s := regexp_replace(s, 'H', '', 'g');
  s := regexp_replace(s, 'W', 'A', 'g');

  resultado := resultado || s;
  resultado := regexp_replace(resultado, '(.)\1+', '\1', 'g');
  resultado := regexp_replace(resultado, 'A$', '');
  resultado := regexp_replace(resultado, 'S$', '');

  RETURN left(resultado, 6);
END;
$$;

CREATE INDEX IF NOT EXISTS pacientes_blocking_dmetaphone_idx
  ON public.pacientes (dmetaphone(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));

CREATE INDEX IF NOT EXISTS pacientes_blocking_nysiis_idx
  ON public.pacientes (public.nysiis(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));
```

Note for the implementer: if any of the 5 vectors from Step 1 doesn't match this implementation, adjust the function until all 5 pass — the vectors are the contract, not this particular implementation.

- [ ] **Step 4: Apply and re-run the check**

```bash
pnpm supabase migration up
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-nysiis.sql
```

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120100_duplicados_motor_blocking.sql supabase/checks/duplicados-motor-nysiis.sql -m "feat(db): nysiis() and blocking indexes for the dedup engine"
```

---

## Task 3: TS — `DedupStrategy<T>` contract

**Files:**
- Create: `src/shared/dedup/strategy.ts`
- Create: `src/shared/dedup/index.ts`

**Interfaces:**
- Produces: `NivelCandidato`, `DedupStrategy<T>` — consumed by Task 4 (Medical adapter) and Task 13 (`DuplicatesTab`).

This file is pure type declarations — no runtime logic, nothing a test could exercise beyond what `pnpm typecheck` already verifies. No test file for it (same reasoning this repo's own `suite_before_module` check already applies to const-only modules).

- [ ] **Step 1: Implement**

```ts
// src/shared/dedup/strategy.ts
export type NivelCandidato = 'exacta' | 'parcial'

export interface DedupStrategy<T> {
  entidad: string
  candidatos(item: T, existentes: readonly T[]): { nivel: NivelCandidato; item: T }[]
  fusionar(existente: Partial<T>, entrante: Partial<T>): { resultado: Partial<T>; choques: string[] }
}
```

```ts
// src/shared/dedup/index.ts
export type { NivelCandidato, DedupStrategy } from './strategy'
```

- [ ] **Step 2: `pnpm typecheck`**

- [ ] **Step 3: Commit**

```bash
git commit src/shared/dedup/strategy.ts src/shared/dedup/index.ts -m "feat(dedup): DedupStrategy<T> contract"
```

---

## Task 4: TS — Medical adapter (`pacienteDedupStrategy`)

**Files:**
- Create: `src/features/medical/utils/pacienteDedupStrategy/index.ts`
- Create: `src/features/medical/utils/pacienteDedupStrategy/index.test.ts`

**Interfaces:**
- Consumes: `pacienteIdentity.candidatos`/`fusionar`, `DedupStrategy<T>` (Task 3).
- Produces: `pacienteDedupStrategy: DedupStrategy<Identificable>`.

This one DOES get a test: `fusionar()` has real logic (the column exclusion), not just a type shape — exactly the kind of behavior `suite_before_module` exists to pin down before writing it.

- [ ] **Step 1: Write the test that requires excluding the identity/audit columns**

```ts
import { describe, it, expect } from 'vitest'
import { pacienteDedupStrategy } from './index'

describe('pacienteDedupStrategy.fusionar', () => {
  it('excludes id/mrn/created_at/updated_at from the result', () => {
    const existente = { id: 'a', mrn: 'MRN-1', created_at: '2026-01-01', updated_at: '2026-01-01', nombre: 'Ana' }
    const entrante = { id: 'b', mrn: 'MRN-2', created_at: '2026-02-01', updated_at: '2026-02-01', apellido: 'Gomez' }
    const { resultado } = pacienteDedupStrategy.fusionar(existente, entrante)
    expect(resultado).not.toHaveProperty('id')
  })
})
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```ts
import { candidatos, fusionar, type Identificable } from '@/features/medical/utils/pacienteIdentity'
import type { DedupStrategy } from '@/shared/dedup'
import type { Paciente } from '@/features/medical/types'

const COLUMNAS_EXCLUIDAS = ['id', 'mrn', 'created_at', 'updated_at'] as const

function sinColumnasExcluidas(valores: Partial<Paciente>): Partial<Paciente> {
  const copia = { ...valores }
  for (const campo of COLUMNAS_EXCLUIDAS) delete copia[campo]
  return copia
}

export const pacienteDedupStrategy: DedupStrategy<Identificable> = {
  entidad: 'pacientes',
  candidatos: (item, existentes) =>
    candidatos(item, existentes).map(({ nivel, paciente }) => ({ nivel, item: paciente })),
  fusionar: (existente, entrante) => {
    const { paciente, choques } = fusionar(existente, entrante)
    return { resultado: sinColumnasExcluidas(paciente), choques }
  },
}
```

- [ ] **Step 4: Run and confirm it passes.**

- [ ] **Step 5: Commit**

```bash
git commit src/features/medical/utils/pacienteDedupStrategy/index.ts src/features/medical/utils/pacienteDedupStrategy/index.test.ts -m "feat(medical): DedupStrategy adapter for pacientes"
```

---

## Task 5: RPC `registrar_candidato_duplicado`

**Files:**
- Create: `supabase/migrations/20261012120200_duplicados_motor_registrar.sql`
- Create: `supabase/checks/duplicados-motor-registrar.sql`

**Interfaces:**
- Consumes: `duplicados_entidades`, `duplicados_pendientes`, `duplicados_descartes`, `has_module(text)`.
- Produces: `public.registrar_candidato_duplicado(p_entidad text, p_item_id_a uuid, p_item_id_b uuid, p_nivel text, p_origen text)` — called by Task 8 and Task 14.

- [ ] **Step 1: Write the failing check**

```sql
DO $$
DECLARE
  id_a uuid; id_b uuid; id_c uuid;
BEGIN
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'UnoDup') RETURNING id INTO id_a;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'DosDup') RETURNING id INTO id_b;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'TresDup') RETURNING id INTO id_c;

  PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_b, 'exacta', 'alta_manual');
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes'
                 AND item_id_a = least(id_a, id_b) AND item_id_b = greatest(id_a, id_b)) THEN
    RAISE EXCEPTION '(1) did not insert the pair';
  END IF;

  PERFORM public.registrar_candidato_duplicado('pacientes', id_b, id_a, 'exacta', 'escaneo');
  IF (SELECT count(*) FROM public.duplicados_pendientes WHERE entidad = 'pacientes'
      AND item_id_a = least(id_a, id_b) AND item_id_b = greatest(id_a, id_b)) <> 1 THEN
    RAISE EXCEPTION '(2) re-detection duplicated the row';
  END IF;

  BEGIN
    PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_a, 'exacta', 'alta_manual');
    RAISE EXCEPTION '(3) should have rejected equal ids';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%cannot be its own candidate%' THEN RAISE; END IF;
  END;

  INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo)
    VALUES ('pacientes', least(id_a, id_c), greatest(id_a, id_c), 'no_son_la_misma');
  BEGIN
    PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_c, 'parcial', 'escaneo');
    RAISE EXCEPTION '(4) should have rejected an already-discarded pair';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%already discarded%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.registrar_candidato_duplicado('pacientes', id_a, gen_random_uuid(), 'parcial', 'escaneo');
    RAISE EXCEPTION '(5) should have rejected a nonexistent id';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  DELETE FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND (item_id_a IN (id_a,id_b,id_c) OR item_id_b IN (id_a,id_b,id_c));
  DELETE FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND (item_id_a IN (id_a,id_b,id_c) OR item_id_b IN (id_a,id_b,id_c));
  DELETE FROM public.pacientes WHERE id IN (id_a, id_b, id_c);
END $$;
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```sql
CREATE OR REPLACE FUNCTION public.registrar_candidato_duplicado(
  p_entidad text, p_item_id_a uuid, p_item_id_b uuid, p_nivel text, p_origen text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tabla  text;
  v_modulo text;
  v_existe boolean;
BEGIN
  SELECT tabla, modulo INTO v_tabla, v_modulo FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF v_tabla IS NULL THEN
    RAISE EXCEPTION 'entidad % is not registered in duplicados_entidades', p_entidad;
  END IF;
  IF NOT public.has_module(v_modulo) THEN
    RAISE EXCEPTION 'missing module % to operate on %', v_modulo, p_entidad;
  END IF;

  IF p_item_id_a = p_item_id_b THEN
    RAISE EXCEPTION 'an item cannot be its own candidate';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(
    p_entidad || '|' || least(p_item_id_a, p_item_id_b)::text || '|' || greatest(p_item_id_a, p_item_id_b)::text
  ));

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 FOR UPDATE)', v_tabla) INTO v_existe USING least(p_item_id_a, p_item_id_b);
  IF NOT v_existe THEN RAISE EXCEPTION 'one of the two items no longer exists'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 FOR UPDATE)', v_tabla) INTO v_existe USING greatest(p_item_id_a, p_item_id_b);
  IF NOT v_existe THEN RAISE EXCEPTION 'one of the two items no longer exists'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.duplicados_descartes
    WHERE entidad = p_entidad AND item_id_a = least(p_item_id_a, p_item_id_b) AND item_id_b = greatest(p_item_id_a, p_item_id_b)
  ) THEN
    RAISE EXCEPTION 'this pair was already discarded';
  END IF;

  INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen)
  VALUES (p_entidad, least(p_item_id_a, p_item_id_b), greatest(p_item_id_a, p_item_id_b), p_nivel, p_origen)
  ON CONFLICT (entidad, item_id_a, item_id_b) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) TO authenticated;
```

- [ ] **Step 4: Apply and re-run the check.**

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120200_duplicados_motor_registrar.sql supabase/checks/duplicados-motor-registrar.sql -m "feat(db): registrar_candidato_duplicado RPC"
```

---

## Task 6: RPC `decidir_descarte_duplicado`

**Files:**
- Create: `supabase/migrations/20261012120300_duplicados_motor_descartes.sql` (also contains `deshacer_descarte_duplicado`, see Task 7 — same file, committed together since they're the two halves of the same UI flow)
- Create: `supabase/checks/duplicados-motor-descartes.sql`

**Interfaces:**
- Produces: `public.decidir_descarte_duplicado(p_entidad text, p_item_id_a uuid, p_item_id_b uuid, p_motivo text, p_nota text)` — called by Task 14.

- [ ] **Step 1: Write the failing check**

```sql
DO $$
DECLARE id_a uuid; id_b uuid;
BEGIN
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'DescA') RETURNING id INTO id_a;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'DescB') RETURNING id INTO id_b;
  PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_b, 'exacta', 'alta_manual');

  PERFORM public.decidir_descarte_duplicado('pacientes', id_b, id_a, 'no_son_la_misma', NULL);
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND item_id_a = least(id_a,id_b) AND item_id_b = greatest(id_a,id_b)) THEN
    RAISE EXCEPTION '(1) did not remove the pending row';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND item_id_a = least(id_a,id_b) AND item_id_b = greatest(id_a,id_b) AND motivo = 'no_son_la_misma') THEN
    RAISE EXCEPTION '(1) did not insert the discard';
  END IF;

  PERFORM public.decidir_descarte_duplicado('pacientes', id_a, id_b, 'no_son_la_misma', NULL);

  DELETE FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND item_id_a = least(id_a,id_b) AND item_id_b = greatest(id_a,id_b);

  BEGIN
    PERFORM public.decidir_descarte_duplicado('pacientes', id_a, id_b, 'son_la_misma_separadas', NULL);
    RAISE EXCEPTION '(3) should have rejected "separadas" without a note';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  DELETE FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND (item_id_a IN (id_a,id_b) OR item_id_b IN (id_a,id_b));
  DELETE FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND (item_id_a IN (id_a,id_b) OR item_id_b IN (id_a,id_b));
  DELETE FROM public.pacientes WHERE id IN (id_a, id_b);
END $$;
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement** (in the same file as Task 7, see below).

```sql
CREATE OR REPLACE FUNCTION public.decidir_descarte_duplicado(
  p_entidad text, p_item_id_a uuid, p_item_id_b uuid, p_motivo text, p_nota text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tabla  text;
  v_modulo text;
  v_existe boolean;
BEGIN
  SELECT tabla, modulo INTO v_tabla, v_modulo FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF v_tabla IS NULL THEN RAISE EXCEPTION 'entidad % is not registered', p_entidad; END IF;
  IF NOT public.has_module(v_modulo) THEN RAISE EXCEPTION 'missing module % for %', v_modulo, p_entidad; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(
    p_entidad || '|' || least(p_item_id_a, p_item_id_b)::text || '|' || greatest(p_item_id_a, p_item_id_b)::text
  ));

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 FOR UPDATE)', v_tabla) INTO v_existe USING least(p_item_id_a, p_item_id_b);
  IF NOT v_existe THEN RAISE EXCEPTION 'one of the two items was merged away'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 FOR UPDATE)', v_tabla) INTO v_existe USING greatest(p_item_id_a, p_item_id_b);
  IF NOT v_existe THEN RAISE EXCEPTION 'one of the two items was merged away'; END IF;

  DELETE FROM public.duplicados_pendientes
  WHERE entidad = p_entidad AND item_id_a = least(p_item_id_a, p_item_id_b) AND item_id_b = greatest(p_item_id_a, p_item_id_b);

  INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo, nota, decidido_por)
  VALUES (p_entidad, least(p_item_id_a, p_item_id_b), greatest(p_item_id_a, p_item_id_b), p_motivo, p_nota, auth.uid())
  ON CONFLICT (entidad, item_id_a, item_id_b) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) TO authenticated;
```

- [ ] **Step 4: Apply and re-run (shared with Task 7).**

- [ ] **Step 5: Commit** — deferred to the end of Task 7 (same file).

---

## Task 7: RPC `deshacer_descarte_duplicado`

**Files:**
- Modify: `supabase/migrations/20261012120300_duplicados_motor_descartes.sql`
- Modify: `supabase/checks/duplicados-motor-descartes.sql`

**Interfaces:**
- Produces: `public.deshacer_descarte_duplicado(p_entidad text, p_item_id_a uuid, p_item_id_b uuid)` — called by Task 14.

- [ ] **Step 1: Append to the check**

```sql
INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'DeshA') RETURNING id INTO id_a;
INSERT INTO public.pacientes (nombre, apellido) VALUES ('Test', 'DeshB') RETURNING id INTO id_b;
INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo)
  VALUES ('pacientes', least(id_a,id_b), greatest(id_a,id_b), 'no_son_la_misma');

PERFORM public.deshacer_descarte_duplicado('pacientes', id_a, id_b);
IF EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad='pacientes' AND item_id_a=least(id_a,id_b) AND item_id_b=greatest(id_a,id_b)) THEN
  RAISE EXCEPTION '(4) did not undo the discard';
END IF;

BEGIN
  PERFORM public.deshacer_descarte_duplicado('pacientes', id_a, id_b);
  RAISE EXCEPTION '(5) should have rejected an undo with nothing to undo';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%was not discarded%' THEN RAISE; END IF;
END;

DELETE FROM public.pacientes WHERE id IN (id_a, id_b);
```

- [ ] **Step 2: Run and confirm this part fails.**

- [ ] **Step 3: Implement**

```sql
CREATE OR REPLACE FUNCTION public.deshacer_descarte_duplicado(
  p_entidad text, p_item_id_a uuid, p_item_id_b uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modulo text;
  v_filas  int;
BEGIN
  SELECT modulo INTO v_modulo FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF v_modulo IS NULL THEN RAISE EXCEPTION 'entidad % is not registered', p_entidad; END IF;
  IF NOT public.has_module(v_modulo) THEN RAISE EXCEPTION 'missing module % for %', v_modulo, p_entidad; END IF;

  DELETE FROM public.duplicados_descartes
  WHERE entidad = p_entidad AND item_id_a = least(p_item_id_a, p_item_id_b) AND item_id_b = greatest(p_item_id_a, p_item_id_b);
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE EXCEPTION 'this pair was not discarded';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) TO authenticated;
```

- [ ] **Step 4: Apply and run the complete check (Tasks 6+7 together).**

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120300_duplicados_motor_descartes.sql supabase/checks/duplicados-motor-descartes.sql -m "feat(db): decidir_descarte_duplicado and deshacer_descarte_duplicado RPCs"
```

---

## Task 8: RPC `escanear_duplicados` + `pacientes_candidatos_escaneo()`

**Files:**
- Create: `supabase/migrations/20261012120400_duplicados_motor_escaneo.sql`
- Create: `supabase/checks/duplicados-motor-escaneo.sql`

**Interfaces:**
- Consumes: `registrar_candidato_duplicado` (Task 5), the blocking indexes (Task 2).
- Produces: `public.escanear_duplicados(p_entidad text)` — called by Task 14.

- [ ] **Step 1: Write the failing check**

```sql
DO $$
DECLARE
  id_a uuid; id_b uuid; id_sin_dob uuid;
BEGIN
  INSERT INTO public.pacientes (nombre, apellido, fecha_nacimiento)
    VALUES ('Maria', 'Hernandez', '1990-05-01') RETURNING id INTO id_a;
  INSERT INTO public.pacientes (nombre, apellido, fecha_nacimiento)
    VALUES ('Maria', 'Ernandez', '1990-05-01') RETURNING id INTO id_b;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('SinDob', 'Test') RETURNING id INTO id_sin_dob;

  PERFORM public.escanear_duplicados('pacientes');

  IF NOT EXISTS (
    SELECT 1 FROM public.duplicados_pendientes
    WHERE entidad = 'pacientes' AND item_id_a = least(id_a,id_b) AND item_id_b = greatest(id_a,id_b)
  ) THEN
    RAISE EXCEPTION '(2) the scan did not find the Hernandez/Ernandez pair';
  END IF;

  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND item_id_a = item_id_b) THEN
    RAISE EXCEPTION '(3) the scan produced a self-pair';
  END IF;

  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND (item_id_a = id_sin_dob OR item_id_b = id_sin_dob)) THEN
    RAISE EXCEPTION '(4) a patient with no DOB should not generate candidates';
  END IF;

  DELETE FROM public.duplicados_pendientes WHERE entidad='pacientes' AND item_id_a=least(id_a,id_b) AND item_id_b=greatest(id_a,id_b);
  INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo) VALUES ('pacientes', least(id_a,id_b), greatest(id_a,id_b), 'no_son_la_misma');
  PERFORM public.escanear_duplicados('pacientes');
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad='pacientes' AND item_id_a=least(id_a,id_b) AND item_id_b=greatest(id_a,id_b)) THEN
    RAISE EXCEPTION '(5) the scan re-inserted an already-discarded pair';
  END IF;

  DELETE FROM public.duplicados_pendientes WHERE entidad='pacientes' AND (item_id_a IN (id_a,id_b,id_sin_dob) OR item_id_b IN (id_a,id_b,id_sin_dob));
  DELETE FROM public.duplicados_descartes WHERE entidad='pacientes' AND (item_id_a IN (id_a,id_b,id_sin_dob) OR item_id_b IN (id_a,id_b,id_sin_dob));
  DELETE FROM public.pacientes WHERE id IN (id_a, id_b, id_sin_dob);
END $$;
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```sql
CREATE OR REPLACE FUNCTION public.pacientes_candidatos_escaneo()
RETURNS TABLE(item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE sql
STABLE
AS $$
  WITH bucket_dmetaphone AS (
    SELECT a.id AS a_id, b.id AS b_id
    FROM public.pacientes a JOIN public.pacientes b
      ON dmetaphone(a.apellido) = dmetaphone(b.apellido)
     AND extract(year FROM a.fecha_nacimiento) = extract(year FROM b.fecha_nacimiento)
     AND left(a.nombre, 1) = left(b.nombre, 1)
     AND a.id < b.id
    WHERE a.fecha_nacimiento IS NOT NULL AND b.fecha_nacimiento IS NOT NULL
  ),
  bucket_nysiis AS (
    SELECT a.id AS a_id, b.id AS b_id
    FROM public.pacientes a JOIN public.pacientes b
      ON public.nysiis(a.apellido) = public.nysiis(b.apellido)
     AND extract(year FROM a.fecha_nacimiento) = extract(year FROM b.fecha_nacimiento)
     AND left(a.nombre, 1) = left(b.nombre, 1)
     AND a.id < b.id
    WHERE a.fecha_nacimiento IS NOT NULL AND b.fecha_nacimiento IS NOT NULL
  ),
  pares AS (
    SELECT a_id, b_id FROM bucket_dmetaphone
    UNION
    SELECT a_id, b_id FROM bucket_nysiis
  )
  SELECT p.a_id, p.b_id, 'parcial'::text
  FROM pares p;
$$;

CREATE OR REPLACE FUNCTION public.escanear_duplicados(p_entidad text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modulo  text;
  v_funcion text;
  r RECORD;
BEGIN
  SELECT modulo, funcion_candidatos INTO v_modulo, v_funcion FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF v_funcion IS NULL THEN RAISE EXCEPTION 'entidad % is not registered', p_entidad; END IF;
  IF NOT public.has_module(v_modulo) THEN RAISE EXCEPTION 'missing module % for %', v_modulo, p_entidad; END IF;

  FOR r IN EXECUTE format('SELECT item_id_a, item_id_b, nivel FROM %I()', v_funcion) LOOP
    BEGIN
      PERFORM public.registrar_candidato_duplicado(p_entidad, r.item_id_a, r.item_id_b, r.nivel, 'escaneo');
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.escanear_duplicados(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.escanear_duplicados(text) TO authenticated;
```

- [ ] **Step 4: Apply and re-run the check.**

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120400_duplicados_motor_escaneo.sql supabase/checks/duplicados-motor-escaneo.sql -m "feat(db): pacientes_candidatos_escaneo and escanear_duplicados"
```

---

## Task 9: RPC `fusionar_duplicado`

The highest-risk operation. **Read spec § Las seis RPC del motor → `fusionar_duplicado` before writing this function** — the four `p_valores_finales` rules have to share the same exclusion list (rules 1 and 4); that is the exact bug that broke the spec in Round 5.

**Files:**
- Create: `supabase/migrations/20261012120500_duplicados_motor_fusionar.sql`
- Create: `supabase/checks/duplicados-motor-fusionar.sql`

**Interfaces:**
- Produces: `public.fusionar_duplicado(p_entidad text, p_ganador_id uuid, p_perdedor_id uuid, p_valores_finales jsonb)` — called by Task 14.

- [ ] **Step 1: Write the failing check (covers spec scenarios e, g, h, i, j, k, l, t)**

```sql
DO $$
DECLARE
  id_a uuid; id_b uuid; id_c uuid;
BEGIN
  INSERT INTO public.pacientes (nombre, apellido, telefono) VALUES ('Fus', 'Ganador', '3051112222') RETURNING id INTO id_a;
  INSERT INTO public.pacientes (nombre, apellido, direccion) VALUES ('Fus', 'Perdedor', 'Calle 1') RETURNING id INTO id_b;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Fus', 'Tercero') RETURNING id INTO id_c;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_a, '{}'::jsonb);
    RAISE EXCEPTION '(e) should have rejected ganador=perdedor';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%cannot be the same item%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{}'::jsonb);
    RAISE EXCEPTION 'should have rejected a pair the system never suggested';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%was not suggested%' THEN RAISE; END IF;
  END;

  PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_b, 'exacta', 'alta_manual');
  PERFORM public.registrar_candidato_duplicado('pacientes', id_b, id_c, 'parcial', 'alta_manual');

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{"columna_fantasma": "x"}'::jsonb);
    RAISE EXCEPTION '(h) should have rejected a nonexistent column';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%does not exist%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{"telefono": "0000000000"}'::jsonb);
    RAISE EXCEPTION '(h) should have rejected a made-up value';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%neither of the two%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, jsonb_build_object('id', id_b));
    RAISE EXCEPTION '(j) should have rejected id as a key';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%identity column%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{"telefono": "3051112222"}'::jsonb);
    RAISE EXCEPTION '(i) should have rejected for incompleteness (direccion is missing)';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%does not decide column%' THEN RAISE; END IF;
  END;

  PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, jsonb_build_object('telefono', '3051112222', 'direccion', 'Calle 1'));

  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = id_b) THEN RAISE EXCEPTION 'the loser row should have been deleted'; END IF;
  IF (SELECT direccion FROM public.pacientes WHERE id = id_a) <> 'Calle 1' THEN RAISE EXCEPTION 'did not apply the chosen value'; END IF;

  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad='pacientes' AND (item_id_a=id_b OR item_id_b=id_b)) THEN
    RAISE EXCEPTION '(d) a pending row referencing the loser was left dangling';
  END IF;

  BEGIN
    PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{}'::jsonb);
    RAISE EXCEPTION 'should have rejected merging an already-resolved pair';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  DELETE FROM public.duplicados_fusiones WHERE entidad='pacientes' AND ganador_id=id_a;
  DELETE FROM public.duplicados_pendientes WHERE entidad='pacientes' AND (item_id_a IN (id_a,id_c) OR item_id_b IN (id_a,id_c));
  DELETE FROM public.pacientes WHERE id IN (id_a, id_c);
END $$;
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```sql
CREATE OR REPLACE FUNCTION public.fusionar_duplicado(
  p_entidad text, p_ganador_id uuid, p_perdedor_id uuid, p_valores_finales jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tabla  text;
  v_modulo text;
  v_hijos  jsonb;
  v_hijo   jsonb;
  v_ganador_snapshot jsonb;
  v_perdedor_snapshot jsonb;
  v_clave  text;
  v_valor  text;
  v_columnas_excluidas text[] := ARRAY['id', 'mrn', 'created_at', 'updated_at'];
  v_hijos_movidos jsonb := '[]'::jsonb;
BEGIN
  SELECT tabla, modulo, hijos INTO v_tabla, v_modulo, v_hijos FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF v_tabla IS NULL THEN RAISE EXCEPTION 'entidad % is not registered', p_entidad; END IF;
  IF NOT public.has_module(v_modulo) THEN RAISE EXCEPTION 'missing module % for %', v_modulo, p_entidad; END IF;

  IF p_ganador_id = p_perdedor_id THEN
    RAISE EXCEPTION 'ganador and perdedor cannot be the same item';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND item_id_a = least(p_ganador_id, p_perdedor_id) AND item_id_b = greatest(p_ganador_id, p_perdedor_id)
  ) THEN
    RAISE EXCEPTION 'this pair was not suggested by the system';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(
    p_entidad || '|' || least(p_ganador_id, p_perdedor_id)::text || '|' || greatest(p_ganador_id, p_perdedor_id)::text
  ));

  EXECUTE format('SELECT 1 FROM %I WHERE id = $1 FOR UPDATE', v_tabla) USING least(p_ganador_id, p_perdedor_id);
  EXECUTE format('SELECT 1 FROM %I WHERE id = $2 FOR UPDATE', v_tabla) USING p_ganador_id, greatest(p_ganador_id, p_perdedor_id);

  EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE id = $1', v_tabla) INTO v_ganador_snapshot USING p_ganador_id;
  EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE id = $1', v_tabla) INTO v_perdedor_snapshot USING p_perdedor_id;

  IF v_ganador_snapshot IS NULL OR v_perdedor_snapshot IS NULL THEN
    RAISE EXCEPTION 'one of the two items no longer exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND item_id_a = least(p_ganador_id, p_perdedor_id) AND item_id_b = greatest(p_ganador_id, p_perdedor_id)
  ) THEN
    RAISE EXCEPTION 'this pair was not suggested by the system';
  END IF;

  FOR v_clave IN SELECT jsonb_object_keys(p_valores_finales) LOOP
    IF v_clave = ANY (v_columnas_excluidas) THEN
      RAISE EXCEPTION 'valores_finales cannot touch an identity column (%)', v_clave;
    END IF;
  END LOOP;

  FOR v_clave IN SELECT jsonb_object_keys(p_valores_finales) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_tabla AND column_name = v_clave
    ) THEN
      RAISE EXCEPTION 'valores_finales references a column that does not exist in %: %', v_tabla, v_clave;
    END IF;
  END LOOP;

  FOR v_clave IN SELECT jsonb_object_keys(p_valores_finales) LOOP
    v_valor := p_valores_finales ->> v_clave;
    IF NOT (
      v_valor IS NOT DISTINCT FROM (v_ganador_snapshot ->> v_clave) OR
      v_valor IS NOT DISTINCT FROM (v_perdedor_snapshot ->> v_clave)
    ) THEN
      RAISE EXCEPTION 'valores_finales has a value that comes from neither of the two records (%)', v_clave;
    END IF;
  END LOOP;

  FOR v_clave IN SELECT key FROM jsonb_each_text(v_ganador_snapshot) LOOP
    IF v_clave = ANY (v_columnas_excluidas) THEN CONTINUE; END IF;
    IF (v_ganador_snapshot ->> v_clave) IS DISTINCT FROM (v_perdedor_snapshot ->> v_clave) THEN
      IF NOT (p_valores_finales ? v_clave) THEN
        RAISE EXCEPTION 'valores_finales does not decide column %, which differs between ganador and perdedor', v_clave;
      END IF;
    END IF;
  END LOOP;

  EXECUTE format('UPDATE %I SET %s WHERE id = $1', v_tabla,
    (SELECT string_agg(format('%I = %L', key, value), ', ')
     FROM jsonb_each_text(p_valores_finales))
  ) USING p_ganador_id;

  FOR v_hijo IN SELECT * FROM jsonb_array_elements(v_hijos) LOOP
    EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', v_hijo->>'tabla', v_hijo->>'columna', v_hijo->>'columna')
      USING p_ganador_id, p_perdedor_id;
    v_hijos_movidos := v_hijos_movidos || jsonb_build_object('tabla', v_hijo->>'tabla');
  END LOOP;

  EXECUTE format('DELETE FROM %I WHERE id = $1', v_tabla) USING p_perdedor_id;

  DELETE FROM public.duplicados_pendientes dp
  WHERE dp.entidad = p_entidad AND (dp.item_id_a = p_perdedor_id OR dp.item_id_b = p_perdedor_id);
  DELETE FROM public.duplicados_descartes dd
  WHERE dd.entidad = p_entidad AND (dd.item_id_a = p_perdedor_id OR dd.item_id_b = p_perdedor_id);

  INSERT INTO public.duplicados_fusiones
    (entidad, ganador_id, perdedor_id, perdedor_snapshot, ganador_snapshot_previo, hijos_movidos, decidido_por)
  VALUES
    (p_entidad, p_ganador_id, p_perdedor_id, v_perdedor_snapshot, v_ganador_snapshot, v_hijos_movidos, auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb) TO authenticated;
```

Note for the implementer: the two `FOR UPDATE` statements right after the advisory lock take the row lock in the stable `least`/`greatest` order (spec, Principle 10) — do not collapse them into one dynamic call that loses that explicit order, and do not skip re-reading the snapshots by role right after: the lock order and the role the snapshot is stored under are two different things.

- [ ] **Step 4: Apply and re-run the check.**

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120500_duplicados_motor_fusionar.sql supabase/checks/duplicados-motor-fusionar.sql -m "feat(db): fusionar_duplicado RPC"
```

---

## Task 10: RPC `revertir_fusion_duplicado`

**Files:**
- Create: `supabase/migrations/20261012120600_duplicados_motor_revertir.sql`
- Create: `supabase/checks/duplicados-motor-revertir.sql`

**Interfaces:**
- Produces: `public.revertir_fusion_duplicado(p_fusion_id uuid)` — called by Task 14.

- [ ] **Step 1: Write the failing check (covers spec scenarios a, b, c)**

```sql
DO $$
DECLARE
  id_a uuid; id_b uuid; id_c uuid; fusion1 uuid; fusion2 uuid;
BEGIN
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Rev', 'A') RETURNING id INTO id_a;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Rev', 'B') RETURNING id INTO id_b;
  INSERT INTO public.pacientes (nombre, apellido) VALUES ('Rev', 'C') RETURNING id INTO id_c;

  PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_b, 'exacta', 'alta_manual');
  PERFORM public.fusionar_duplicado('pacientes', id_a, id_b, '{}'::jsonb);
  SELECT id INTO fusion1 FROM public.duplicados_fusiones WHERE entidad='pacientes' AND ganador_id=id_a AND perdedor_id=id_b;

  PERFORM public.registrar_candidato_duplicado('pacientes', id_a, id_c, 'exacta', 'alta_manual');
  PERFORM public.fusionar_duplicado('pacientes', id_a, id_c, '{}'::jsonb);
  SELECT id INTO fusion2 FROM public.duplicados_fusiones WHERE entidad='pacientes' AND ganador_id=id_a AND perdedor_id=id_c;

  BEGIN
    PERFORM public.revertir_fusion_duplicado(fusion1);
    RAISE EXCEPTION '(a) should have blocked the revert for a later active merge';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%merged again later%' THEN RAISE; END IF;
  END;

  PERFORM public.revertir_fusion_duplicado(fusion2);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = id_c) THEN RAISE EXCEPTION 'did not recreate C'; END IF;

  PERFORM public.revertir_fusion_duplicado(fusion1);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = id_b) THEN RAISE EXCEPTION '(c) did not recreate B'; END IF;

  BEGIN
    PERFORM public.revertir_fusion_duplicado(fusion1);
    RAISE EXCEPTION '(b) should have rejected a double revert';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%already reverted%' THEN RAISE; END IF;
  END;

  DELETE FROM public.duplicados_fusiones WHERE id IN (fusion1, fusion2);
  DELETE FROM public.duplicados_pendientes WHERE entidad='pacientes' AND (item_id_a IN (id_a,id_b,id_c) OR item_id_b IN (id_a,id_b,id_c));
  DELETE FROM public.pacientes WHERE id IN (id_a, id_b, id_c);
END $$;
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```sql
CREATE OR REPLACE FUNCTION public.revertir_fusion_duplicado(p_fusion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entidad text;
  v_tabla   text;
  v_modulo  text;
  v_ganador_id uuid;
  v_perdedor_id uuid;
  v_decidido_at timestamptz;
  v_revertido_at timestamptz;
  v_perdedor_snapshot jsonb;
  v_ganador_snapshot_previo jsonb;
  v_hijos_movidos jsonb;
  v_hijo jsonb;
BEGIN
  SELECT entidad, ganador_id, perdedor_id, decidido_at, revertido_at, perdedor_snapshot, ganador_snapshot_previo, hijos_movidos
  INTO v_entidad, v_ganador_id, v_perdedor_id, v_decidido_at, v_revertido_at, v_perdedor_snapshot, v_ganador_snapshot_previo, v_hijos_movidos
  FROM public.duplicados_fusiones WHERE id = p_fusion_id FOR UPDATE;

  IF v_entidad IS NULL THEN RAISE EXCEPTION 'fusion % does not exist', p_fusion_id; END IF;
  IF v_revertido_at IS NOT NULL THEN RAISE EXCEPTION 'this merge was already reverted'; END IF;

  SELECT tabla, modulo INTO v_tabla, v_modulo FROM public.duplicados_entidades WHERE entidad = v_entidad;
  IF NOT public.has_module(v_modulo) THEN RAISE EXCEPTION 'missing module % for %', v_modulo, v_entidad; END IF;

  EXECUTE format('SELECT 1 FROM %I WHERE id = $1 FOR UPDATE', v_tabla) USING v_ganador_id;

  IF EXISTS (
    SELECT 1 FROM public.duplicados_fusiones f2
    WHERE f2.decidido_at > v_decidido_at AND f2.revertido_at IS NULL
      AND (f2.ganador_id = v_ganador_id OR f2.perdedor_id = v_ganador_id)
  ) THEN
    RAISE EXCEPTION 'cannot revert: this item merged again later';
  END IF;

  EXECUTE format(
    'UPDATE %I SET %s WHERE id = $1', v_tabla,
    (SELECT string_agg(format('%I = %L', key, value), ', ') FROM jsonb_each_text(v_ganador_snapshot_previo))
  ) USING v_ganador_id;

  EXECUTE format(
    'INSERT INTO %I (%s) VALUES (%s)', v_tabla,
    (SELECT string_agg(quote_ident(key), ', ') FROM jsonb_each_text(v_perdedor_snapshot)),
    (SELECT string_agg(quote_nullable(value), ', ') FROM jsonb_each_text(v_perdedor_snapshot))
  );

  FOR v_hijo IN SELECT * FROM jsonb_array_elements(v_hijos_movidos) LOOP
    EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2', v_hijo->>'tabla', 'paciente_id', 'paciente_id')
      USING v_perdedor_id, v_ganador_id;
  END LOOP;

  UPDATE public.duplicados_fusiones SET revertido_por = auth.uid(), revertido_at = now() WHERE id = p_fusion_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revertir_fusion_duplicado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revertir_fusion_duplicado(uuid) TO authenticated;
```

Note: the dynamic `UPDATE`/`INSERT` over `v_hijo->>'tabla'` hardcodes the `paciente_id` column name because it's the only child column that exists today for Medical. If a future entity ever has a different child column, generalize to `v_hijo->>'columna'` instead of the literal — add a test for it when that entity actually arrives.

- [ ] **Step 4: Apply and re-run the check.**

- [ ] **Step 5: Commit**

```bash
git commit supabase/migrations/20261012120600_duplicados_motor_revertir.sql supabase/checks/duplicados-motor-revertir.sql -m "feat(db): revertir_fusion_duplicado RPC"
```

---

## Task 11: Manual verification of real concurrency (scenarios n, r, t)

Not automatable with a single script — it genuinely needs two interleaved sessions.

**Files:** none — manual procedure, documented so it leaves a record.

- [ ] **Step 1:** Open two psql sessions against local. Session 1: begin a transaction and take `pg_advisory_xact_lock` on a given pair without committing. Session 2, same pair: try `decidir_descarte_duplicado` — it has to block until session 1 commits.
- [ ] **Step 2:** Repeat with `registrar_candidato_duplicado` on a pair sharing one id with an in-flight, uncommitted `fusionar_duplicado` on an unrelated pair — confirm session 2 also blocks (scenario t of the spec).
- [ ] **Step 3:** Record the outcome in this task's PR before merging.

---

## Task 12: UI — `MergeFieldRow` with a per-cell choice control

**Files:**
- Modify: `src/shared/import/MergeFieldRow/index.tsx`
- Modify: `src/shared/import/MergeFieldRow/index.module.css`

**Interfaces:**
- Produces: new props `onChooseValue?: (index: number) => void` + `selectedIndex?: number` — consumed by Task 14; existing call sites never pass them, so their behavior is unchanged.

This component has no logic separable from its render — no new unit test for it, per this repo's convention. Verification is visual, folded into Task 14's Step 7.

- [ ] **Step 1: Implement**

```tsx
import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

type Props = {
  labelKey: I18nKey
  values: string[]
  diff: boolean
  onChooseValue?: (index: number) => void
  selectedIndex?: number
}

export default function MergeFieldRow({ labelKey, values, diff, onChooseValue, selectedIndex }: Props) {
  const { t } = useT()
  return (
    <>
      <div className={s.fieldLabel}>{t(labelKey)}</div>
      {values.map((v, i) => {
        const canChoose = Boolean(onChooseValue)
        const chosen = selectedIndex === i
        const extra = [diff ? s.diff : '', canChoose ? s.elegible : '', chosen ? s.elegido : ''].filter(Boolean).join(' ')
        return (
          <div
            key={i}
            className={`${s.cell} ${extra}`.trim()}
            role={canChoose ? 'button' : undefined}
            tabIndex={canChoose ? 0 : undefined}
            onClick={canChoose ? () => onChooseValue?.(i) : undefined}
          >
            {v}
          </div>
        )
      })}
    </>
  )
}
```

```css
.elegible { cursor: pointer; }
.elegido { outline: 2px solid var(--color-accent); }
```

- [ ] **Step 2: Confirm existing call sites keep working** — search for every usage, confirm none pass the new prop, so existing behavior is unchanged.

- [ ] **Step 3: `pnpm typecheck`**

- [ ] **Step 4: Commit**

---

## Task 13: UI — generic `DuplicatesTab` component

**Files:**
- Create: `src/shared/dedup/ordenarPendientes.ts`
- Create: `src/shared/dedup/ordenarPendientes.test.ts`
- Create: `src/shared/dedup/DuplicatesTab/index.tsx`
- Create: `src/shared/dedup/DuplicatesTab/index.module.css`

**Interfaces:**
- Consumes: `DedupStrategy<T>` (Task 3), `MergeCandidateRow`/`MergeFieldRow`, the Supabase client.
- Produces: `<DuplicatesTab entidad={string} ... />` — mounted by Task 14.

- [ ] **Step 1: Test the pure ordering function**

```ts
import { describe, it, expect } from 'vitest'
import { ordenarPendientes } from './ordenarPendientes'

describe('ordenarPendientes', () => {
  it('puts exacta before parcial, oldest first within the same level', () => {
    const pares = [
      { item_id_a: 'a', item_id_b: 'b', nivel: 'parcial' as const, detectado_at: '2026-01-02' },
      { item_id_a: 'c', item_id_b: 'd', nivel: 'exacta' as const, detectado_at: '2026-01-03' },
      { item_id_a: 'e', item_id_b: 'f', nivel: 'exacta' as const, detectado_at: '2026-01-01' },
    ]
    const resultado = ordenarPendientes(pares)
    expect(resultado.map(p => p.item_id_a)).toEqual(['e', 'c', 'a'])
  })
})
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

```ts
type Pendiente = { item_id_a: string; item_id_b: string; nivel: 'exacta' | 'parcial'; detectado_at: string }

export function ordenarPendientes<T extends Pendiente>(pares: readonly T[]): T[] {
  return [...pares].sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel === 'exacta' ? -1 : 1
    return a.detectado_at.localeCompare(b.detectado_at)
  })
}
```

- [ ] **Step 4: Run and confirm it passes.**

- [ ] **Step 5: Implement the component (visual verification, no unit test — plain render)**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { supabase } from '@/shared/db/supabase'
import MergeCandidateRow from '@/shared/import/MergeCandidateRow'
import { ordenarPendientes } from '../ordenarPendientes'
import s from './index.module.css'

type Pendiente = { item_id_a: string; item_id_b: string; nivel: 'exacta' | 'parcial'; detectado_at: string }

type Props<T> = {
  entidad: string
  cargarItem: (id: string) => Promise<T>
  renderResumen: (item: T) => string
  renderComparacion: (a: T, b: T, onElegir: (campo: string, valor: string) => void) => React.ReactNode
}

export default function DuplicatesTab<T>({ entidad, cargarItem, renderResumen, renderComparacion }: Props<T>) {
  const { t } = useT()
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [abierto, setAbierto] = useState<Pendiente | null>(null)

  const recargar = async () => {
    const { data } = await supabase.from('duplicados_pendientes').select('*').eq('entidad', entidad)
    setPendientes(ordenarPendientes(data ?? []))
  }

  useEffect(() => { recargar() }, [entidad])

  const escanear = async () => {
    await supabase.rpc('escanear_duplicados', { p_entidad: entidad })
    recargar()
  }

  const descartar = async (par: Pendiente, motivo: 'no_son_la_misma' | 'son_la_misma_separadas', nota: string | null) => {
    await supabase.rpc('decidir_descarte_duplicado', {
      p_entidad: entidad, p_item_id_a: par.item_id_a, p_item_id_b: par.item_id_b, p_motivo: motivo, p_nota: nota,
    })
    setAbierto(null)
    recargar()
  }

  return (
    <div className={s.contenedor}>
      <div className={s.cabecera}>
        <span className={s.badge}>{pendientes.length}</span>
        <button onClick={escanear}>{t('dedup.scanButton')}</button>
      </div>
      {pendientes.map(par => (
        <MergeCandidateRow key={`${par.item_id_a}-${par.item_id_b}`} onOpen={() => setAbierto(par)} resumen={par.nivel} />
      ))}
      {abierto && (
        <div className={s.detalle}>
          <button onClick={() => descartar(abierto, 'no_son_la_misma', null)}>{t('dedup.notSame')}</button>
          <button onClick={() => { const nota = prompt(t('dedup.separatedNotePrompt')); if (nota) descartar(abierto, 'son_la_misma_separadas', nota) }}>
            {t('dedup.sameSeparated')}
          </button>
        </div>
      )}
    </div>
  )
}
```

Note for the implementer: `renderResumen`/`renderComparacion`/`cargarItem` are typed here, but the body of "Fusionar" (which reads both items, builds the per-cell choice UI with `MergeFieldRow`, and eventually calls `fusionar_duplicado`) gets completed in Task 14, where `pacienteDedupStrategy.fusionar` already exists to build `p_valores_finales` — this generic component cannot know the shape of a `Paciente`.

- [ ] **Step 6: Commit**

---

## Task 14: Wiring into Medical

**Files:**
- Modify: `src/shared/components/shell/appShellConfig/subvistas.ts`
- Modify: `src/features/medical/components/MedicalModule.tsx`
- Modify: `src/features/medical/hooks/useMedicalData.ts`
- Modify: `src/features/medical/utils/pacienteImportPlan/index.ts`
- Create: `src/features/medical/components/PacientesDuplicatesTab/index.tsx`

**Interfaces:**
- Consumes: `DuplicatesTab` (Task 13), `pacienteDedupStrategy` (Task 4), RPCs from Tasks 5 and 9.

- [ ] **Step 1: Add the tab to the vertical menu**

```ts
{ id: 'med-duplicates', icon: '🔗', label: 'Duplicates', tab: 'duplicados' },
```

- [ ] **Step 2: Mount Medical's wrapper**

```tsx
'use client'
import DuplicatesTab from '@/shared/dedup/DuplicatesTab'
import MergeFieldRow from '@/shared/import/MergeFieldRow'
import { pacienteDedupStrategy } from '@/features/medical/utils/pacienteDedupStrategy'
import { supabase } from '@/shared/db/supabase'
import type { Paciente } from '@/features/medical/types'

export default function PacientesDuplicatesTab() {
  return (
    <DuplicatesTab<Paciente>
      entidad="pacientes"
      cargarItem={async (id) => {
        const { data } = await supabase.from('pacientes').select('*').eq('id', id).single()
        return data as Paciente
      }}
      renderResumen={(p) => `${p.nombre} ${p.apellido}`}
      renderComparacion={(a, b, onElegir) => {
        const { resultado, choques } = pacienteDedupStrategy.fusionar(a, b)
        return (
          <>
            {choques.map(campo => (
              <MergeFieldRow
                key={campo}
                labelKey={`med.field.${campo}` as never}
                values={[String(a[campo as keyof Paciente] ?? ''), String(b[campo as keyof Paciente] ?? '')]}
                diff
                onChooseValue={(i) => onElegir(campo, String(i === 0 ? a[campo as keyof Paciente] : b[campo as keyof Paciente]))}
              />
            ))}
          </>
        )
      }}
    />
  )
}
```

- [ ] **Step 3: Mount in `MedicalModule`** — add the import and the render line, conditioned on the new tab id.

- [ ] **Step 4: Incremental hook on manual registration** — inside `addPaciente` (in `useMedicalData.ts`), right after the new patient's id is known, compare it against the existing patient list with `candidatos()` and call `registrar_candidato_duplicado` for each match found, with origin `alta_manual`.

- [ ] **Step 5: Incremental hook on import** — in `pacienteImportPlan/index.ts`, at the point where the import already calls `candidatos()` per row to build the plan, add the same RPC call there with origin `import` — do not duplicate the detection logic.

- [ ] **Step 6: `pnpm typecheck && pnpm test`**

- [ ] **Step 7: Visual verification in the browser** — run `pnpm dev`, open `/medical`, open the new tab, run the scan button, open a pair, choose fields, merge, confirm the pair disappears and the losing patient is gone from the Patients list.

- [ ] **Step 8: Commit**

---

## Task 15: i18n

**Files:**
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/en.json`

- [ ] **Step 1: Add four new keys to `en.json`, under a `dedup` section**

Keys to add: a label for the scan button, a label for "not the same person", a label for "same person, kept separate", and a prompt asking why the two records should stay separate.

- [ ] **Step 2: Add the matching four keys to `es.json`**

Write the natural Spanish copy directly into that file — it is the file whose entire purpose is holding Spanish strings, so write it there, not quoted in this plan.

- [ ] **Step 3: `pnpm typecheck`** — confirms neither locale file is missing a key the other one has.

- [ ] **Step 4: Commit**

---

## Task 16: Final verification

- [ ] **Step 1:** `pnpm typecheck`
- [ ] **Step 2:** `pnpm test`
- [ ] **Step 3:** `pnpm build:check` (never `next build` with the dev server up)
- [ ] **Step 4:** Run all 7 `supabase/checks/duplicados-motor-*.sql` scripts together, end to end, against a freshly-migrated local stack.
- [ ] **Step 5:** Pushing to production is not part of this plan — done by hand, after this plan is merged and reviewed, following the backup and precheck centinela requires.
