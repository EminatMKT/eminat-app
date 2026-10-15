# Dedup Resolution Modal + Multivalued Attributes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The original engine (`2026-10-12-motor-duplicados-ambiente.md`) ran through subagent-driven-development, with a review after each task and a final review of the whole branch. Use the same process here.

**Goal:** Replace the inline pair comparison in the Duplicados tab with a modal dialog. Let the reviewer uncheck individual phone and email values of the losing patient before a merge. Show both patients' names in every pending-list row.

**Architecture:** `fusionar_duplicado` gets a fifth parameter, `p_contactos_excluidos uuid[] DEFAULT '{}'`. Excluded rows take the per-row skip path that already exists for child-row collisions. In TypeScript, a new shared `CompareField` component in `src/shared/dedup/` decides between a left/right pick (`FieldCompare`, unchanged) and checkboxes (`MultiValueCompare`, new). It decides with `Array.isArray` on the values alone and never looks at a field name. Medical's adapter is what turns `telefono`/`email` into arrays: it reads `paciente_contactos` for each side of the pair. The shared open-pair hook holds the excluded ids and passes them to the RPC. `PairDetail` is now drawn inside the shared `Modal`, the same shell `ConfirmModal` uses. The pending list gets names from a new batched `loadSummaries` prop, because a `Pendiente` row carries only ids.

**Tech Stack:** Next.js 14 · TypeScript · Supabase (Postgres 17) · vitest (SSR only, no DOM) · plpgsql checks run with `psql -f`

**Spec:** `docs/superpowers/specs/2026-10-15-dedup-resolucion-modal-multivaluado-design.md`. Read it in full before Task 1, and read "Corrections to the spec found while planning" below as well. Where the two disagree, this plan wins: each correction comes from reading the code, not the spec's summary of it.

## Global Constraints

These come from the spec, this repo's Centinela rules (`rules-here` lists them), and the original engine plan. They apply to every task.

- **Guiding principle (spec):** "the program suggests, the person decides. No merge ever runs on its own."
- **Out of scope (spec):** the import flow (`src/shared/import/MergeCandidateRow`), free-text editing of non-multivalued fields, and any primary/alternate ranking of multivalued values. Do not touch them.
- **`pacientes.telefono`/`pacientes.email` (scalar) resolution is not touched.** `NO_SON_CHOQUE` and `buildMergeValues` stay as they are.
- **The shared engine never imports from `src/features/`**, and never configures behavior by field name.
- **The element type of a multivalued array is generic** (`E extends { id: string }`). The engine never assumes it is a string.
- **`any` is forbidden.** Types are never loosened to make the code compile.
- **No `../../`:** outside a component's own folder, import with `@/shared/…` or `@/features/…`.
- **A component is a folder:** `index.tsx` plus `index.test.tsx`, plus `index.module.css` when it draws markup of its own. **One `export default` per file.** **Exported types live in `types.ts`.** **Constants do not share a file with logic.**
- **A call argument, a comparison or a return never carries a string literal.** Name it as a constant. `import` paths and `t('…')` keys are exempt. Column names used in filters come from `TABLE_COLUMNS` (`src/shared/data/columns`), which is this repo's catalog for them.
- **New identifiers are in English.** Existing Spanish identifiers (`elecciones`, `abierto`, `cargarItem`) stay as they are and are not renamed in passing. Table, column, RPC and parameter names stay exactly as the spec spells them (`p_contactos_excluidos`).
- **i18n:** every visible string goes through `t()`, with the key in both `src/shared/i18n/locales/es.json` and `en.json`.
- **Vitest runs without a DOM:** render with `renderToStaticMarkup` or test pure functions, and never mount a component. Hooks are probed with `src/shared/dedup/DuplicatesTab/capturarHook`, where effects do not run.
- **A test suite is written before the module it covers.** Every new `.ts`/`.tsx` gets a sibling test.
- **An exported symbol is documented with `/** */`**. A module's `index` ends with a comment saying what the module does. A comment says why, in three lines or fewer.
- **Never `pnpm supabase db reset`.**
- **No `git commit` and no `git add -A`.** Queue each task with `bun /home/wagner/.claude/plugins/cache/wsmithdr/centinela/2.30.1/.shared/pending-commits/main.ts add <slug> <message-file> <path>...`. Write the message file outside the repo, as `type(scope): summary`, a blank line, a body that says why, a blank line, then `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. **Never run `apply`.** The repo owner approves applying.
- **Verification before each TS queue:** `pnpm typecheck && pnpm test`. For SQL, run `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f <check>`.

## Corrections to the spec found while planning

Each of these was checked against the code on `feat/motor-duplicados-ambiente` at `19a7ecba`.

1. **Section 5 ("No new data is required") is wrong.** `Pendiente` (`src/shared/dedup/types.ts`) holds only `item_id_a`, `item_id_b`, `nivel` and `detectado_at`. `renderResumen` takes a loaded `T`, and only `useAbrirPendiente` loads one, two at a time, when a pair is opened. Reusing `cargarItem` for every list row would cost two reads per pending pair, and for Medical each read would now also pull that patient's `paciente_contactos`. **Resolution:** a new required prop, `loadSummaries(ids: string[]) => Promise<Record<string, string>>`. The engine calls it once per list reload for every distinct id. Medical implements it as one `select … in (ids)` over `nombre`/`apellido`, in batches of 100 ids, and formats each name with the same `summarizePaciente` that `renderResumen` uses, so the list and the modal print the same text. That is one extra query per reload instead of zero. If the names fail to load, the list still renders, and each row reads "Name unavailable".
2. **Section 2 ("deduplicated by value, for each patient") would lose data.** `paciente_contactos` is `UNIQUE (paciente_id, tipo, valor, fuente)`, so one patient can hold the same phone twice, once per `fuente` (`manual` and `import`). Suppose Medical dedups within one side and keeps only one of the two ids. Unchecking that value excludes one row, the other row still moves, and the phone survives the merge even though the box was unchecked. **Resolution:** Medical's view keeps **one element per row**. The shared `mergeMultiValueRows` merges by displayed text across both sides, and each screen row carries **every** id behind its text. Unchecking a row excludes all of the loser's ids behind it.
3. **Sections 3 and 4 never say what unchecking a value the winner holds should do.** The RPC only excludes rows of the **loser** (Section 4), and the winner's rows never move. A checkbox on the winner's value would be a lie. **Resolution:** a row whose value the winner already holds is drawn checked and **disabled**, with the hint "Already on the record that stays". The RPC is the safety net: a winner's id in `p_contactos_excluidos` is a "foreign id" and rejects the whole merge (tested in Task 1).
4. **Section 4 says the "foreign id" check is against `paciente_contactos.paciente_id`, but `fusionar_duplicado` is generic.** It moves the children listed in `duplicados_entidades.hijos` (for `pacientes`, that is `paciente_fuentes` and `paciente_contactos`) and never names a child table. **Resolution:** the RPC accepts an id if it is the `id` of some child row of the loser, in any registered child table. `paciente_fuentes` has a composite key and no `id` column, so it can never match, and in practice the check is exactly "a `paciente_contactos` row of `p_perdedor_id`". The parameter keeps the spec's name, `p_contactos_excluidos`.
5. **The signature change needs a `DROP`.** `CREATE OR REPLACE` with a fifth parameter creates a second overload next to the 4-argument one, and from then on every 4-argument call is ambiguous. The migration drops the old signature first.
6. **Where the migration change goes.** Commit `5fbd4d88` (the Critical #2 fix) edited `20261012120500_duplicados_motor_fusionar.sql` **in place**, because this branch has never been pushed and nothing in it is in prod. This plan follows the same convention. Before Task 1, run `git branch -r --contains 5fbd4d88`. **If it prints anything, stop**: the branch has been pushed, and the change has to become a new migration instead. A migration that is already applied locally is not re-run by `migration up`. The file starts with `DROP FUNCTION IF EXISTS`, which makes it safe to re-run, so it is applied locally with `psql -f`.
7. **A gap the spec did not mention, fixed along the way:** `comparePacientes` never passed `selectedValue` to `FieldCompare`. No pill ever showed as chosen, not even the winner's value that the merge sends by default. `CompareField` now shows `choices[field]`, or the winner's value when there is no choice yet. That matches what `buildMergeValues` actually sends, because the existing value wins every choque.
8. **Known limitation (no change):** `revertir_fusion_duplicado` restores only the rows listed in `hijos_movidos`. Rows that were excluded go away by cascade with the loser, as colliding rows already do, so a revert does not bring back a contact the reviewer chose to drop. The spec defines exclusion as a discard, so this is consistent, but it is worth saying to the repo owner.

## Review Focus

Inputs the spec implies but no requirement names. Each one is pinned by a test in the task listed.

1. **A value both patients hold** (the most common real duplicate). It shows once, checked and disabled. A winner id sent anyway rejects the merge. Tested in Task 3 (`mergeMultiValueRows`, `MultiValueCompare`) and Task 1 (`…041` rejected).
2. **The same value twice on the loser, under two `fuente`s.** It is one screen row carrying both ids, and unchecking it excludes both. Tested in Task 3 (`mergeMultiValueRows`) and Task 6 (`loadPaciente` keeps both rows).
3. **Reopening another pair after unchecking boxes.** Ids left over from pair 1 would make pair 2's merge fail as "foreign". Opening a pair starts with `excludedIds: []`. Tested in Task 2 (`openedPair`).
4. **Duplicate or `NULL` entries in `p_contactos_excluidos`, or a `NULL` array.** Duplicates are tolerated. A `NULL` element rejects the merge as foreign. A `NULL` array gets the existing "must not be null" error. Tested in Task 1.
5. **A pending pair whose names cannot be loaded** (a network failure, or a patient missing from the result). The list still renders, and that row reads "Name unavailable". Tested in Task 5 (`loadQueue`, `DuplicatesTab`).

---

## File Structure

```
supabase/migrations/20261012120500_duplicados_motor_fusionar.sql   (modify in place — Task 1)
supabase/checks/duplicados-motor-fusionar.sql                       (modify — Task 1)

src/shared/constants/dom/index.ts                                   (modify — CHECKBOX, Task 3)
src/shared/data/columns/index.ts                                    (modify — pacientes, pacienteContactos; Tasks 5, 6)
src/shared/i18n/locales/es.json, en.json                            (modify — Tasks 3, 4, 5, 6)

src/shared/dedup/
  index.ts                                    (modify — export CompareField + CompareControls)
  data/fusionar/index.ts, index.test.ts       (modify — excludedIds → p_contactos_excluidos, Task 2)
  CompareField/                               (create — Task 3)
    index.tsx, index.test.tsx, types.ts
    isMultiValue/index.ts, index.test.ts
    mergeMultiValueRows/index.ts, index.test.ts
    MultiValueCompare/index.tsx, index.module.css, index.test.tsx
  DuplicatesTab/
    types.ts                                  (modify — CompareControls, renderComparacion, loadSummaries)
    index.tsx, index.test.tsx                 (modify — controls, names)
    PairDetail/index.tsx, types.ts, index.test.tsx   (modify — now a Modal, Task 4)
    ParDuplicado/index.tsx, index.test.tsx    (modify — names, Task 5)
    decidirArgsFixture/index.ts               (modify — excludedIds)
    useAbrirPendiente/index.ts, types.ts      (modify — excludedIds, controls, Task 2)
    useAbrirPendiente/openedPair/index.ts, index.test.ts      (create — Task 2)
    useAbrirPendiente/toggleExcluded/index.ts, index.test.ts  (create — Task 2)
    useDecidirPendiente/index.ts, types.ts, valoresFinales.test.ts   (modify — Task 2)
    useDuplicatesTab/index.ts                 (modify — loadSummaries, Task 5)
    useListaDuplicados/index.ts, index.test.tsx      (modify — summaries, Task 5)
    useListaDuplicados/loadQueue/index.ts, index.test.ts, types.ts   (create — Task 5)

src/features/medical/
  constants/index.ts                          (modify — CONTACT_TYPE, Task 6)
  data/patientNames/index.ts, index.test.ts, constants.ts, types.ts     (create — Task 5)
  data/patientContacts/index.ts, index.test.ts, constants.ts, types.ts  (create — Task 6)
  components/MedicalDuplicatesTab/
    index.tsx, index.test.tsx                 (modify — Tasks 4, 5, 6)
    types.ts                                  (create — PatientUnderReview, Task 6)
    summarizePaciente/index.ts, index.test.ts (create — Task 5)
    loadSummaries/index.ts, index.test.ts     (create — Task 5)
    loadPaciente/index.ts, index.test.ts      (modify — Task 6)
    reviewFixture/index.ts, index.test.ts     (create — Task 6)
    comparePacientes/index.tsx, index.test.tsx       (modify — Tasks 4, 6)
    comparePacientes/contactFields/index.ts, index.test.ts, types.ts   (create — Task 6)
```

`FieldCompare` (`src/shared/components/ui/FieldCompare/`), `ConfirmModal` and `Modal` are reused unchanged. `CompareField` has no `index.module.css` because it draws no markup of its own: it only chooses between `FieldCompare` and `MultiValueCompare`.

---

## Task 1: RPC — `fusionar_duplicado` gains `p_contactos_excluidos`

**Files:**
- Modify: `supabase/migrations/20261012120500_duplicados_motor_fusionar.sql` (whole file, shown below)
- Modify: `supabase/checks/duplicados-motor-fusionar.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces: `public.fusionar_duplicado(p_entidad text, p_ganador_id uuid, p_perdedor_id uuid, p_valores_finales jsonb, p_contactos_excluidos uuid[] DEFAULT '{}') RETURNS void`. The new failure is SQLSTATE `22023` with the message `Excluded child rows must belong to the loser`. A `NULL` array gets the existing `22004` message, `Duplicate merge inputs must not be null`. The 4-argument overload no longer exists.

- [ ] **Step 0: Precondition.** Run `git branch -r --contains 5fbd4d88` and expect no output. If it prints anything, stop and report: the in-place edit is only allowed because nothing on this branch has been pushed (correction 6).

- [ ] **Step 1: Write the failing check.** Make these edits in `supabase/checks/duplicados-motor-fusionar.sql`.

Line 3 becomes the new signature, followed by a guard against a leftover overload:

```sql
SELECT 'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])'::regprocedure;
DO $$ BEGIN
  IF to_regprocedure('public.fusionar_duplicado(text,uuid,uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'The 4-argument overload must be gone: next to the new one it makes every 4-argument call ambiguous';
  END IF;
END $$;
```

Add two rows to the existing `INSERT INTO public.pacientes` list (after `…007`):

```sql
  ('d0900000-0000-0000-0000-000000000008', 'MERGE-8', 'Fixture', 'Exclude', NULL),
  ('d0900000-0000-0000-0000-000000000009', 'MERGE-9', 'Fixture', 'Exclude', NULL);
```

(Move the `;` from the `…007` row to the end of the new last row.) Add these rows to the existing `INSERT INTO public.paciente_contactos` list (after `…037`, and move the `;` the same way):

```sql
  ('d0900000-0000-0000-0000-000000000041', 'd0900000-0000-0000-0000-000000000008', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0142'),
  ('d0900000-0000-0000-0000-000000000043', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0143'),
  ('d0900000-0000-0000-0000-000000000044', 'd0900000-0000-0000-0000-000000000009', 'email', 'solo@example.invalid'),
  ('d0900000-0000-0000-0000-000000000045', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000046', 'd0900000-0000-0000-0000-000000000003', 'telefono', '555-0146');
```

Add this row to the `INSERT INTO public.duplicados_pendientes` list (before the `merge_other` row):

```sql
  ('pacientes', 'd0900000-0000-0000-0000-000000000008', 'd0900000-0000-0000-0000-000000000009', 'parcial', 'import'),
```

Replace the `pg_temp.assert_merge_rejected` helper with one that takes the exclusion list. The extra parameter has a default, so every existing 6-argument call keeps working:

```sql
CREATE FUNCTION pg_temp.assert_merge_rejected(p_entity text, p_winner uuid, p_loser uuid, p_payload jsonb, p_state text, p_message text, p_excluded uuid[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text; v_message text;
BEGIN
  BEGIN
    PERFORM public.fusionar_duplicado(p_entity, p_winner, p_loser, p_payload, p_excluded);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
  END;
  IF v_state IS DISTINCT FROM p_state OR (p_message IS NOT NULL AND v_message IS DISTINCT FROM p_message) THEN
    RAISE EXCEPTION 'Expected % / %, got % / %', p_state, p_message, v_state, v_message;
  END IF;
END $$;
```

Insert this block **between** the collision block's closing `END $$;` and the `RESET ROLE;` that comes before the grants block. Every existing merge call in the script stays 4-argument on purpose: those calls now prove that the default (`'{}'`) behaves exactly as before.

```sql
-- Loser …009: the reviewer drops …042, …045 (which would collide with the winner's …041 anyway)
-- and its only email …044, and keeps …043. The list repeats …042 on purpose: duplicates are fine.
DO $$
DECLARE
  v_winner uuid := 'd0900000-0000-0000-0000-000000000008';
  v_loser uuid := 'd0900000-0000-0000-0000-000000000009';
  v_drop uuid[] := ARRAY['d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000044',
    'd0900000-0000-0000-0000-000000000045', 'd0900000-0000-0000-0000-000000000042']::uuid[];
  v_audit public.duplicados_fusiones;
BEGIN
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22004', 'Duplicate merge inputs must not be null', NULL);
  -- The winner's own contact, a third patient's contact, and a NULL entry: all foreign.
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY['d0900000-0000-0000-0000-000000000041']::uuid[]);
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY['d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000046']::uuid[]);
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY[NULL]::uuid[]);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_loser)
     OR (SELECT count(*) FROM public.paciente_contactos WHERE paciente_id = v_loser) <> 4 THEN
    RAISE EXCEPTION 'A rejected exclusion list must leave the loser and its contacts untouched';
  END IF;

  PERFORM public.fusionar_duplicado('pacientes', v_winner, v_loser, '{}', v_drop);
  IF EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = ANY(v_drop))
     OR (SELECT array_agg(id ORDER BY id) FROM public.paciente_contactos WHERE paciente_id = v_winner)
        IS DISTINCT FROM ARRAY['d0900000-0000-0000-0000-000000000041', 'd0900000-0000-0000-0000-000000000043']::uuid[]
     OR NOT EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd0900000-0000-0000-0000-000000000046') THEN
    RAISE EXCEPTION 'Excluded loser contacts must be gone, and every other contact must survive';
  END IF;
  SELECT * INTO STRICT v_audit FROM public.duplicados_fusiones WHERE ganador_id = v_winner;
  IF v_audit.hijos_movidos IS DISTINCT FROM '[{"tabla":"paciente_fuentes","columna":"paciente_id","claves":[]},{"tabla":"paciente_contactos","columna":"paciente_id","claves":[{"id":"d0900000-0000-0000-0000-000000000043"}]}]'::jsonb THEN
    RAISE EXCEPTION 'Audit must list only the contacts that actually moved: %', v_audit.hijos_movidos;
  END IF;
END $$;
```

In the final grants block, change the `regprocedure` literal to `'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])'`.

- [ ] **Step 2: Run the check and confirm it fails.**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-fusionar.sql` (start the stack first with `pnpm supabase start` if it is down).
Expected: FAIL on line 3, `function "public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])" does not exist`.

- [ ] **Step 3: Rewrite the migration.** Replace the full contents of `supabase/migrations/20261012120500_duplicados_motor_fusionar.sql` with:

```sql
-- Dropped first: adding a parameter with CREATE OR REPLACE would leave the 4-argument version
-- next to it, and every 4-argument call would then be ambiguous.
DROP FUNCTION IF EXISTS public.fusionar_duplicado(text, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.fusionar_duplicado(
  p_entidad text,
  p_ganador_id uuid,
  p_perdedor_id uuid,
  p_valores_finales jsonb,
  p_contactos_excluidos uuid[] DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_table text;
  v_module text;
  v_children jsonb;
  v_first uuid;
  v_second uuid;
  v_id uuid;
  v_locked_id uuid;
  v_winner jsonb;
  v_loser jsonb;
  v_excluded constant text[] := ARRAY['id', 'mrn', 'created_at', 'updated_at'];
  v_columns text[];
  v_assignments text;
  v_child jsonb;
  v_primary_keys text[];
  v_moved_keys jsonb;
  v_moved jsonb := '[]'::jsonb;
  v_key_match text;
  v_row jsonb;
  v_key jsonb;
  v_dropped_ids text[];
  v_owned bigint := 0;
  v_count bigint;
BEGIN
  IF p_entidad IS NULL OR p_ganador_id IS NULL OR p_perdedor_id IS NULL OR p_valores_finales IS NULL
     OR p_contactos_excluidos IS NULL THEN
    RAISE EXCEPTION 'Duplicate merge inputs must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT tabla, modulo, hijos INTO v_table, v_module, v_children
    FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown duplicate entity' USING ERRCODE = '22023';
  END IF;
  IF public.has_module(v_module) IS NOT TRUE THEN
    RAISE EXCEPTION 'Duplicate entity module access denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_valores_finales) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Merge values must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_ganador_id = p_perdedor_id THEN
    RAISE EXCEPTION 'Duplicate candidate IDs must differ' USING ERRCODE = '22023';
  END IF;

  v_first := least(p_ganador_id, p_perdedor_id);
  v_second := greatest(p_ganador_id, p_perdedor_id);
  -- Match registrar/discard pair keys; ordered domain locks also serialize overlapping pairs.
  PERFORM pg_advisory_xact_lock(hashtext(p_entidad || '|' || v_first::text || '|' || v_second::text));
  FOREACH v_id IN ARRAY ARRAY[v_first, v_second] LOOP
    EXECUTE format('SELECT id FROM public.%I WHERE id = $1 FOR UPDATE', v_table)
      INTO v_locked_id USING v_id;
    IF v_locked_id IS NULL THEN
      RAISE EXCEPTION 'Both duplicate candidate rows must exist' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  -- Read authoritative state only after all locks; no unlocked snapshot can authorize a merge.
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = p_entidad AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Duplicate pair is not pending' USING ERRCODE = '22023';
  END IF;
  EXECUTE format('SELECT to_jsonb(p) FROM public.%I p WHERE id = $1', v_table)
    INTO v_winner USING p_ganador_id;
  EXECUTE format('SELECT to_jsonb(p) FROM public.%I p WHERE id = $1', v_table)
    INTO v_loser USING p_perdedor_id;

  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_valores_finales) k WHERE k = ANY(v_excluded)) THEN
    RAISE EXCEPTION 'Merge values contain an excluded column' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(a.attname::text) INTO v_columns FROM pg_attribute a
    WHERE a.attrelid = format('public.%I', v_table)::regclass AND a.attnum > 0 AND NOT a.attisdropped;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_valores_finales) k WHERE NOT k = ANY(v_columns)) THEN
    RAISE EXCEPTION 'Merge values contain an unknown column' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(p_valores_finales) e
      WHERE e.value IS DISTINCT FROM v_winner->e.key AND e.value IS DISTINCT FROM v_loser->e.key) THEN
    RAISE EXCEPTION 'Merge value does not match either current snapshot' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_columns) k
      WHERE NOT k = ANY(v_excluded) AND v_winner->k IS DISTINCT FROM v_loser->k AND NOT p_valores_finales ? k) THEN
    RAISE EXCEPTION 'Merge values omit a differing column' USING ERRCODE = '22023';
  END IF;

  -- Every excluded id must be the `id` of one of the loser's child rows: anything else (the
  -- winner's row, a third patient's, a NULL) is a malformed call, so the whole merge is refused.
  v_dropped_ids := ARRAY(SELECT DISTINCT e::text FROM unnest(p_contactos_excluidos) e);
  FOR v_child IN SELECT value FROM jsonb_array_elements(v_children) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I c WHERE %I = $1 AND to_jsonb(c)->>''id'' = ANY($2)',
      v_child->>'tabla', v_child->>'columna') INTO v_count USING p_perdedor_id, v_dropped_ids;
    v_owned := v_owned + v_count;
  END LOOP;
  IF v_owned <> cardinality(v_dropped_ids) THEN
    RAISE EXCEPTION 'Excluded child rows must belong to the loser' USING ERRCODE = '22023';
  END IF;

  SELECT string_agg(format('%I = v.%I', k, k), ', ' ORDER BY k) INTO v_assignments
    FROM jsonb_object_keys(p_valores_finales) k;
  -- Equal allowed snapshots need no UPDATE; an empty SET clause is invalid SQL.
  IF v_assignments IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I p SET %s FROM jsonb_populate_record(NULL::public.%I, $1) v WHERE p.id = $2',
      v_table, v_assignments, v_table) USING p_valores_finales, p_ganador_id;
  END IF;

  FOR v_child IN SELECT value FROM jsonb_array_elements(v_children) LOOP
    SELECT array_agg(a.attname::text ORDER BY k.ordinality) INTO v_primary_keys
      FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ordinality)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE i.indrelid = format('public.%I', v_child->>'tabla')::regclass AND i.indisprimary
        AND k.ordinality <= i.indnkeyatts;
    IF v_primary_keys IS NULL THEN
      RAISE EXCEPTION 'Registered child table must have a primary key' USING ERRCODE = '22023';
    END IF;
    SELECT string_agg(format('c.%I = r.%I', k, k), ' AND ') INTO v_key_match FROM unnest(v_primary_keys) k;
    v_moved_keys := '[]'::jsonb;
    -- One block (one savepoint) per row: a row colliding with the winner's own unique key is
    -- skipped, and cascades away with the loser below. Needs ON DELETE CASCADE on the child FK.
    FOR v_row IN EXECUTE format('SELECT to_jsonb(c) FROM public.%I c WHERE %I = $1 ORDER BY to_jsonb(c) FOR UPDATE',
        v_child->>'tabla', v_child->>'columna') USING p_perdedor_id LOOP
      -- An excluded row takes the collision's path: it never moves and cascades away the same way.
      CONTINUE WHEN v_row->>'id' = ANY(v_dropped_ids);
      BEGIN
        EXECUTE format('UPDATE public.%I c SET %I = $1 FROM jsonb_populate_record(NULL::public.%I, $2) r WHERE %s
          RETURNING (SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(to_jsonb(c)) e WHERE e.key = ANY($3))',
          v_child->>'tabla', v_child->>'columna', v_child->>'tabla', v_key_match)
          INTO v_key USING p_ganador_id, v_row, v_primary_keys;
        IF v_key IS NOT NULL THEN
          v_moved_keys := v_moved_keys || jsonb_build_array(v_key);
        END IF;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
    v_moved := v_moved || jsonb_build_array(jsonb_build_object(
      'tabla', v_child->>'tabla', 'columna', v_child->>'columna', 'claves', v_moved_keys));
  END LOOP;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table) USING p_perdedor_id;
  DELETE FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  DELETE FROM public.duplicados_descartes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  INSERT INTO public.duplicados_fusiones
    (entidad, ganador_id, perdedor_id, perdedor_snapshot, ganador_snapshot_previo, hijos_movidos, decidido_por)
    VALUES (p_entidad, p_ganador_id, p_perdedor_id, v_loser, v_winner, v_moved, public.usuario_actual_id());
END;
$$;

REVOKE ALL ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) TO authenticated;
```

Compared with the current file, only these lines change: the leading `DROP`, the fifth parameter, the three new `DECLARE` variables, `OR p_contactos_excluidos IS NULL`, the ownership block before the `UPDATE`, the `CONTINUE WHEN` line, and the signatures in `REVOKE`/`GRANT`. Do not touch anything else.

- [ ] **Step 4: Apply the migration locally and run every dedup check.**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/migrations/20261012120500_duplicados_motor_fusionar.sql
for f in supabase/checks/duplicados-motor-*.sql; do psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "$f" || break; done
```

Expected: each script prints its `PASS:` line. `duplicados-motor-revertir.sql` calls the RPC with 4 positional arguments, so it confirms that the default resolves.

- [ ] **Step 5: Queue.** `pending-commits add dedup-modal-t1-rpc-exclusions <msg> supabase/migrations/20261012120500_duplicados_motor_fusionar.sql supabase/checks/duplicados-motor-fusionar.sql`. Suggested message: `feat(db): let fusionar_duplicado drop chosen loser contacts`. In the body, explain the reuse of the collision path, the foreign-id rejection, and why the old overload is dropped.

---

## Task 2: Shared state — excluded ids flow from the open pair to the RPC

**Files:**
- Modify: `src/shared/dedup/data/fusionar/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (add `CompareControls`)
- Modify: `src/shared/dedup/index.ts` (barrel)
- Create: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/toggleExcluded/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/openedPair/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/index.ts`, `types.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useDecidirPendiente/index.ts`, `types.ts`, `valoresFinales.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/decidirArgsFixture/index.ts`

**Interfaces:**
- Consumes: Task 1's `p_contactos_excluidos`.
- Produces:
  - `CompareControls = { choices: Record<string, string>; onChoose: (field: string, value: string) => void; excludedIds: string[]; onToggleExcluded: (ids: string[]) => void }`, exported from `@/shared/dedup` as a type.
  - `useAbrirPendiente` now also returns `excludedIds: string[]`, `onToggleExcluded(ids: string[])` and `controls: CompareControls`.
  - `fusionar({ entidad, ganadorId, perdedorId, valoresFinales, excludedIds })`.
  - `toggleExcluded(current: string[], ids: string[]): string[]`. If every one of `ids` is already excluded it removes them all, and otherwise it adds the missing ones.

- [ ] **Step 1: Write the failing tests.**

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/toggleExcluded/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import toggleExcluded from '.'

describe('toggleExcluded', () => {
  it('excludes every id of a row that was kept', () => {
    expect(toggleExcluded([], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('keeps again a row whose ids were all excluded', () => {
    expect(toggleExcluded(['a', 'b', 'c'], ['a', 'b'])).toEqual(['c'])
  })

  // A value held twice by the loser (two `fuente`s) is one row: half-excluded is not a state.
  it('finishes excluding a row that was only partly excluded', () => {
    expect(toggleExcluded(['a'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})
```

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/openedPair/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import pendienteFixture from '../../pendienteFixture'
import openedPair from '.'

// The bug this guards against: ids unchecked on one pair would ride along to the next pair's
// merge, which the RPC rejects as foreign — the second pair could never be merged.
describe('openedPair', () => {
  it('opens a pair with no choices and nothing excluded', () => {
    const estado = openedPair(pendienteFixture(), { id: 'a' }, { id: 'b' })
    expect(estado.elecciones).toEqual({})
    expect(estado.excludedIds).toEqual([])
    expect(estado.error).toBe(false)
    expect(estado.parCargado?.a).toEqual({ id: 'a' })
  })
})
```

In `src/shared/dedup/data/fusionar/index.test.ts`, add `excludedIds: ['c1']` to `args` and `p_contactos_excluidos: ['c1']` to `esperado`.

In `src/shared/dedup/DuplicatesTab/useDecidirPendiente/valoresFinales.test.ts`, add `excludedIds: []` to the expected `fusionar` call object. Then add:

```ts
  it('sends the ids the reviewer unchecked', async () => {
    const args = decidirArgsFixture({ excludedIds: ['c1', 'c2'] })
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente(args))
    await fusionarPendiente()
    expect(mocks.fusionar).toHaveBeenCalledWith(expect.objectContaining({ excludedIds: ['c1', 'c2'] }))
  })
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup`
Expected: FAIL. `toggleExcluded`/`openedPair` cannot be resolved, `fusionar` is missing `p_contactos_excluidos`, and the `decidirArgsFixture` override has a type error.

- [ ] **Step 3: Implement.**

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/toggleExcluded/index.ts`:

```ts
/** The excluded ids after the reviewer clicks one checkbox row: a row whose ids are all excluded
 *  comes back, any other row ends up fully excluded. */
export default function toggleExcluded(current: string[], ids: string[]): string[] {
  const allExcluded = ids.every(id => current.includes(id))
  const next = allExcluded
    ? current.filter(id => !ids.includes(id))
    : [...current, ...ids.filter(id => !current.includes(id))]
  return next
}
```

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/types.ts`: add `excludedIds: string[]` to `EstadoAbierto<T>`, with the doc line `/** Loser child-row ids the reviewer unchecked on this pair. */`.

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/openedPair/index.ts`:

```ts
import type { Pendiente } from '@/shared/dedup/types'
import type { EstadoAbierto } from '../types'

/** A freshly loaded pair: nothing chosen and nothing excluded yet, whatever the last pair had. */
export default function openedPair<T>(pendiente: Pendiente, a: T, b: T): EstadoAbierto<T> {
  const estado: EstadoAbierto<T> = { parCargado: { pendiente, a, b }, elecciones: {}, excludedIds: [], error: false }
  return estado
}
```

`src/shared/dedup/DuplicatesTab/types.ts`: add below `Props<T>`:

```ts
/** What a caller's comparison grid reads and changes: the reviewer's left/right picks, and the
 *  multivalued values unchecked so far. Built by `useAbrirPendiente`. */
export type CompareControls = {
  choices: Record<string, string>
  onChoose: (field: string, value: string) => void
  excludedIds: string[]
  onToggleExcluded: (ids: string[]) => void
}
```

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/index.ts`: make these changes and leave everything else as it is.
- Add `excludedIds: []` to `vacio()`.
- On a successful load, replace the inline `nuevo` object with `setEstado(openedPair(par, a, b))`.
- Destructure `excludedIds` from `estado`.
- Add:

```ts
  const onToggleExcluded = (ids: string[]) => {
    setEstado(p => ({ ...p, excludedIds: toggleExcluded(p.excludedIds, ids) }))
  }
  const controls: CompareControls = { choices: elecciones, onChoose: onElegir, excludedIds, onToggleExcluded }
```

and add `excludedIds`, `onToggleExcluded` and `controls` to `resultado`. Imports: `import type { CompareControls } from '../types'`, `import openedPair from './openedPair'`, `import toggleExcluded from './toggleExcluded'`. Add one line to the closing comment: the excluded ids reset with every open, like the choices.

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/types.ts`: add `excludedIds: string[]` to `Args<T>`. In `index.ts`, destructure it next to `elecciones` and add `excludedIds` to the `fusionar` args object.

`src/shared/dedup/data/fusionar/index.ts`: add `/** Loser child-row ids the reviewer chose not to keep; `[]` keeps every one. */ excludedIds: string[]` to `Args`, destructure it, and add `p_contactos_excluidos: excludedIds` to `rpcArgs`. Update the closing comment to mention the exclusion list.

`src/shared/dedup/DuplicatesTab/decidirArgsFixture/index.ts`: add `excludedIds: []` to `base`.

`src/shared/dedup/index.ts`:

```ts
export type { NivelCandidato, DedupStrategy } from './strategy'
export type { CompareControls } from './DuplicatesTab/types'

// The dedup engine's public face: the strategy contract a module implements, and what a module's
// comparison grid receives from the shared duplicate-review screen.
```

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. `useDuplicatesTab` spreads `...pair` into `resolveArgs`, which is how `excludedIds` reaches `useDecidirPendiente` with no further change.

- [ ] **Step 5: Queue.** Use slug `dedup-modal-t2-excluded-ids-state` and list every file above by path. Message: `feat(dedup): carry unchecked multivalued ids from the open pair to the merge`.

---

## Task 3: Shared UI — `CompareField` decides left/right vs. checkboxes by shape

**Files:**
- Create: `src/shared/dedup/CompareField/types.ts`
- Create: `src/shared/dedup/CompareField/isMultiValue/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/CompareField/mergeMultiValueRows/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/CompareField/MultiValueCompare/index.tsx`, `index.module.css`, `index.test.tsx`
- Create: `src/shared/dedup/CompareField/index.tsx`, `index.test.tsx`
- Modify: `src/shared/dedup/index.ts` (export `CompareField`)
- Modify: `src/shared/constants/dom/index.ts` (add `CHECKBOX`)
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`dedup.keptOnWinner`)

**Interfaces:**
- Consumes: `CompareControls` (Task 2) and `FieldCompare` (unchanged: `{ labelKey, values: string[], diff, onChooseValue?, selectedValue? }`).
- Produces:
  - `<CompareField<E extends { id: string }> … />`. It takes either scalar props `{ labelKey: I18nKey; controls: CompareControls; field: string; values: [string, string] }` or multivalued props `{ labelKey; controls; values: [E[], E[]]; textOf: (item: E) => string }`. `values[0]` is always the **winner** (`item_id_a`) and `values[1]` the loser.
  - The types `MultiValueItem = { id: string }`, `MultiValueRow = { text: string; keptIds: string[]; removableIds: string[] }`, `ScalarFieldProps` and `MultiFieldProps<E>`.
  - `CHECKBOX` in `@/shared/constants/dom`.

- [ ] **Step 1: Write the failing tests.** Every test uses a non-Medical element shape (`{ id, label }`). That is the proof that the engine assumes nothing about Medical. The checkbox assertions build their needle from `CHECKBOX` instead of retyping the value.

`src/shared/dedup/CompareField/isMultiValue/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import isMultiValue from '.'

const controls: CompareControls = { choices: {}, onChoose: vi.fn(), excludedIds: [], onToggleExcluded: vi.fn() }
type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label

describe('isMultiValue', () => {
  it('reads two strings as a scalar field, whatever it is called', () => {
    expect(isMultiValue<Tag>({ labelKey: 'dedup.merge', controls, field: 'email', values: ['a', 'b'] })).toBe(false)
  })

  it('reads two arrays as multivalued, even empty ones', () => {
    expect(isMultiValue<Tag>({ labelKey: 'dedup.merge', controls, values: [[], []], textOf })).toBe(true)
  })
})
```

`src/shared/dedup/CompareField/mergeMultiValueRows/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import mergeMultiValueRows from '.'

type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label

describe('mergeMultiValueRows', () => {
  it('lists each side’s distinct values, winner first', () => {
    const rows = mergeMultiValueRows<Tag>([{ id: '1', label: 'red' }], [{ id: '2', label: 'blue' }], textOf)
    expect(rows).toEqual([
      { text: 'red', keptIds: ['1'], removableIds: [] },
      { text: 'blue', keptIds: [], removableIds: ['2'] },
    ])
  })

  it('shows a value both sides hold once, kept by the winner', () => {
    const rows = mergeMultiValueRows<Tag>([{ id: '1', label: 'red' }], [{ id: '2', label: 'red' }], textOf)
    expect(rows).toEqual([{ text: 'red', keptIds: ['1'], removableIds: ['2'] }])
  })

  // Same value under two `fuente`s on the loser: one row, and dropping it must drop both rows.
  it('folds a value the loser holds twice into one row carrying both ids', () => {
    const rows = mergeMultiValueRows<Tag>([], [{ id: '2', label: 'red' }, { id: '3', label: 'red' }], textOf)
    expect(rows).toEqual([{ text: 'red', keptIds: [], removableIds: ['2', '3'] }])
  })

  it('has no rows when neither side holds a value', () => {
    expect(mergeMultiValueRows<Tag>([], [], textOf)).toEqual([])
  })
})
```

`src/shared/dedup/CompareField/MultiValueCompare/index.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MultiValueCompare from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const ROWS = [
  { text: '555-1', keptIds: [], removableIds: ['2'] },
  { text: '555-2', keptIds: [], removableIds: ['3'] },
]
const draw = (rows = ROWS, excludedIds: string[] = []) => renderToStaticMarkup(
  <MultiValueCompare labelKey="dedup.merge" rows={rows} excludedIds={excludedIds} onToggle={vi.fn()} />,
)
const count = (html: string, needle: string) => html.split(needle).length - 1

describe('MultiValueCompare', () => {
  it('starts with every value checked, so touching nothing loses nothing', () => {
    expect(count(draw(), 'checked=""')).toBe(2)
  })

  it('unchecks a value once its ids are excluded', () => {
    expect(count(draw(ROWS, ['2']), 'checked=""')).toBe(1)
  })

  it('keeps the winner’s own value checked, disabled, and says why', () => {
    const html = draw([{ text: '555-1', keptIds: ['1'], removableIds: ['2'] }], ['2'])
    expect(html).toContain('checked=""')
    expect(html).toContain('disabled=""')
    expect(html).toContain('dedup.keptOnWinner')
  })

  it('names the group of checkboxes with the field label', () => {
    expect(draw()).toMatch(/<legend[^>]*>dedup\.merge<\/legend>/)
  })
})
```

`src/shared/dedup/CompareField/index.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CHECKBOX } from '@/shared/constants/dom'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import CompareField from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label
const CHECKBOX_INPUT = `type="${CHECKBOX}"`
const controls = (choices: Record<string, string> = {}): CompareControls =>
  ({ choices, onChoose: vi.fn(), excludedIds: [], onToggleExcluded: vi.fn() })
const scalar = (choices?: Record<string, string>) => renderToStaticMarkup(
  <CompareField<Tag> labelKey="dedup.merge" field="seguro" values={['Aetna', 'Cigna']} controls={controls(choices)} />,
)

describe('CompareField', () => {
  it('resolves a scalar field with a left/right pick, not checkboxes', () => {
    const html = scalar()
    expect(html).toContain('aria-pressed')
    expect(html).not.toContain(CHECKBOX_INPUT)
  })

  // The merge sends the winner's value until the reviewer picks; the pill has to say so.
  it('shows the winner’s value as chosen until the reviewer picks', () => {
    const html = scalar()
    expect(html.indexOf('aria-pressed="true"')).toBeLessThan(html.indexOf('aria-pressed="false"'))
  })

  it('shows the reviewer’s pick once made', () => {
    const html = scalar({ seguro: 'Cigna' })
    expect(html.indexOf('aria-pressed="false"')).toBeLessThan(html.indexOf('aria-pressed="true"'))
  })

  it('resolves an array field with checkboxes, whatever its elements are', () => {
    const html = renderToStaticMarkup(
      <CompareField<Tag> labelKey="dedup.merge" values={[[{ id: '1', label: 'red' }], [{ id: '2', label: 'blue' }]]}
        textOf={textOf} controls={controls()} />,
    )
    expect(html).toContain(CHECKBOX_INPUT)
    expect(html).toContain('red')
    expect(html).toContain('blue')
    expect(html).not.toContain('aria-pressed')
  })

  it('draws nothing for an array field empty on both sides', () => {
    const html = renderToStaticMarkup(
      <CompareField<Tag> labelKey="dedup.merge" values={[[], []]} textOf={textOf} controls={controls()} />,
    )
    expect(html).toBe('')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup/CompareField`
Expected: FAIL, because the modules (and `CHECKBOX`) cannot be resolved.

- [ ] **Step 3: Implement.**

`src/shared/constants/dom/index.ts`: add the following before the closing comment.

```ts
/** The `type` of an `<input>` that turns one value on or off. */
export const CHECKBOX = 'checkbox'
```

`src/shared/dedup/CompareField/types.ts`:

```ts
import type { I18nKey } from '@/shared/i18n'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'

/** All the engine needs from a multivalued element: a way to tell it apart from the rest. */
export type MultiValueItem = { id: string }

/** What every compared field carries, scalar or multivalued. */
export type FieldBase = { labelKey: I18nKey; controls: CompareControls }

/** A plain field: the winner's and the loser's value, resolved by picking one. */
export type ScalarFieldProps = FieldBase & { field: string; values: [string, string] }

/** A multivalued field: both sides' lists, resolved by unchecking what not to keep. `textOf` is
 *  how one element reads on screen, and what makes two elements "the same value". */
export type MultiFieldProps<E extends MultiValueItem> = FieldBase & { values: [E[], E[]]; textOf: (item: E) => string }

/** Either kind; which one is decided by the values' shape, never by the field's name. */
export type Props<E extends MultiValueItem> = ScalarFieldProps | MultiFieldProps<E>

/** One distinct value across both sides: the winner's ids always stay, the loser's can be dropped. */
export type MultiValueRow = { text: string; keptIds: string[]; removableIds: string[] }
```

`src/shared/dedup/CompareField/isMultiValue/index.ts`:

```ts
import type { MultiFieldProps, MultiValueItem, Props } from '../types'

/** Structural, on purpose: a field is multivalued because its values are arrays — the engine
 *  never keeps a list of which field names behave that way. */
export default function isMultiValue<E extends MultiValueItem>(props: Props<E>): props is MultiFieldProps<E> {
  const multi = Array.isArray(props.values[0])
  return multi
}
```

`src/shared/dedup/CompareField/mergeMultiValueRows/index.ts`:

```ts
import type { MultiValueItem, MultiValueRow } from '../types'

/** The union of both sides, one row per distinct text, the winner's values first. Every id behind
 *  a text rides along, so dropping a row drops all of the loser's copies of that value. */
export default function mergeMultiValueRows<E extends MultiValueItem>(
  winner: E[],
  loser: E[],
  textOf: (item: E) => string,
): MultiValueRow[] {
  const rows = new Map<string, MultiValueRow>()
  const rowFor = (text: string) => {
    const found = rows.get(text)
    if (found) return found
    const created: MultiValueRow = { text, keptIds: [], removableIds: [] }
    rows.set(text, created)
    return created
  }
  for (const item of winner) rowFor(textOf(item)).keptIds.push(item.id)
  for (const item of loser) rowFor(textOf(item)).removableIds.push(item.id)
  const merged = [...rows.values()]
  return merged
}
```

`src/shared/dedup/CompareField/MultiValueCompare/index.tsx`:

```tsx
'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import { CHECKBOX } from '@/shared/constants/dom'
import type { MultiValueRow } from '../types'
import s from './index.module.css'

type Props = { labelKey: I18nKey; rows: MultiValueRow[]; excludedIds: string[]; onToggle: (ids: string[]) => void }

/** One checkbox per distinct value, all checked until the reviewer unchecks one. A value the
 *  winner already holds stays checked and disabled: a merge never removes the winner's own. */
export default function MultiValueCompare({ labelKey, rows, excludedIds, onToggle }: Props) {
  const { t } = useT()
  return (
    <fieldset className={s.group}>
      <legend className={s.label}>{t(labelKey)}</legend>
      {rows.map(({ text, keptIds, removableIds }) => {
        const kept = keptIds.length > 0
        const dropped = !kept && removableIds.every(id => excludedIds.includes(id))
        return (
          <label key={text} className={s.row}>
            <input type={CHECKBOX} checked={!dropped} disabled={kept} onChange={() => onToggle(removableIds)} />
            {text}
            {kept && <span className={s.hint}>{t('dedup.keptOnWinner')}</span>}
          </label>
        )
      })}
    </fieldset>
  )
}

// The checkbox half of `CompareField`. Unchecking only ever names loser ids; the RPC refuses any
// other id, so this screen and the database enforce the same rule.
```

`src/shared/dedup/CompareField/MultiValueCompare/index.module.css`:

```css
.group {
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: .25rem;
}

/* Same weight as `FieldCompare`'s label: a scalar and a multivalued field read as one grid. */
.label {
  font-size: .6875rem;
  color: var(--c-t3);
  font-weight: 600;
}

.row {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .8125rem;
}

.hint {
  font-size: .6875rem;
  color: var(--c-t3);
}
```

`src/shared/dedup/CompareField/index.tsx`:

```tsx
'use client'
import { FieldCompare } from '@/shared/components/ui'
import isMultiValue from './isMultiValue'
import mergeMultiValueRows from './mergeMultiValueRows'
import MultiValueCompare from './MultiValueCompare'
import type { MultiValueItem, Props } from './types'

/** One field of an open pair: a left/right pick for a scalar, checkboxes for an array — decided
 *  by the values' shape alone. `values[0]` is the winner, whose value is the default pick. */
export default function CompareField<E extends MultiValueItem>(props: Props<E>) {
  const { labelKey, controls } = props
  if (isMultiValue(props)) {
    const [winner, loser] = props.values
    const rows = mergeMultiValueRows(winner, loser, props.textOf)
    if (rows.length === 0) return null
    return <MultiValueCompare labelKey={labelKey} rows={rows} excludedIds={controls.excludedIds}
      onToggle={controls.onToggleExcluded} />
  }
  const { field, values } = props
  const selected = controls.choices[field] ?? values[0]
  return <FieldCompare labelKey={labelKey} values={values} diff selectedValue={selected}
    onChooseValue={value => controls.onChoose(field, value)} />
}

// The seam between the shared engine and a module's adapter: the adapter decides which fields
// to show and in what shape; this decides how each shape is resolved. `FieldCompare` is unchanged.
```

`src/shared/dedup/index.ts`: add `export { default as CompareField } from './CompareField'`, and widen the closing comment so it also covers the per-field compare component.

i18n: insert after `"dedup.noFieldDiffs"` in both files, and add the comma the previous line now needs.
- `en.json`: `"dedup.keptOnWinner": "Already on the record that stays"`
- `es.json`: `"dedup.keptOnWinner": "Ya incluido en ficha conservada"`

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test && grep -rn "@/features" src/shared/dedup`
Expected: typecheck and tests PASS, and the `grep` prints **nothing**.

- [ ] **Step 5: Queue.** Use slug `dedup-modal-t3-comparefield` with every file above. Message: `feat(dedup): resolve multivalued fields with checkboxes, detected by shape`.

---

## Task 4: The modal — `PairDetail` opens in `Modal`, and the grid receives `CompareControls`

**Files:**
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (`renderComparacion` signature)
- Modify: `src/shared/dedup/DuplicatesTab/PairDetail/index.tsx`, `types.ts`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`dedup.pairTitle`)

**Interfaces:**
- Consumes: `CompareControls` and `useAbrirPendiente().controls` (Task 2), and `CompareField` (Task 3). It also uses `Modal` from `@/shared/components/ui`, unchanged: `{ title?, footer?, anchoRem?, role?, onClose, children }`. That component already owns `role="dialog"`, `aria-modal`, focus in, Tab trapping, Escape → `onClose` and focus return (`useDialog`), and a body that scrolls between a fixed head and a fixed footer.
- Produces: `Props<T>.renderComparacion: (a: T, b: T, controls: CompareControls) => ReactNode`. `PairDetail` takes `controls: CompareControls` instead of `onElegir`. Medical's `comparePacientes(a: Paciente, b: Paciente, controls: CompareControls, t)` renders `CompareField` for each scalar choque. Task 6 changes its first two parameters.

- [ ] **Step 1: Write the failing tests.**

Replace `src/shared/dedup/DuplicatesTab/PairDetail/index.test.tsx` with:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import PairDetail from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

// What PairDetail hands the shared Modal, which owns role, focus trap, Escape and focus return
// (tested in `Modal/useDialog`). The mock keeps the props and swallows the markup.
type Seen = { title?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode }
const seen: Seen[] = []
vi.mock('@/shared/components/ui/Modal', () => ({ default: (props: Seen) => { seen.push(props); return null } }))

type Item = { id: string }
const controls: CompareControls = { choices: {}, onChoose: vi.fn(), excludedIds: [], onToggleExcluded: vi.fn() }
const onCancelar = vi.fn()

const open = (errorDescarte = false, errorFusion = false) => {
  seen.length = 0
  renderToStaticMarkup(
    <PairDetail<Item> itemA={{ id: 'a' }} itemB={{ id: 'b' }} ocupado={false}
      errorDescarte={errorDescarte} errorFusion={errorFusion}
      renderResumen={item => item.id} renderComparacion={() => 'grid'} controls={controls}
      onCancelar={onCancelar} onNotSame={vi.fn()} onKeepSeparate={vi.fn()} onFusionar={vi.fn()} />,
  )
  return seen[0]
}
const markup = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)

describe('PairDetail', () => {
  beforeEach(() => onCancelar.mockReset())

  it('opens as a titled dialog whose close (✕, Escape, backdrop) is the cancel', () => {
    const dialog = open()
    expect(dialog.title).toBe('dedup.pairTitle')
    dialog.onClose()
    expect(onCancelar).toHaveBeenCalledOnce()
  })

  // The walkthrough bug: the decisions sat below the whole list. The fixed footer never scrolls.
  it('keeps all four decisions in the fixed footer', () => {
    const footer = markup(open().footer)
    expect(footer.split('<button').length - 1).toBe(4)
    expect(footer).toContain('dedup.merge')
  })

  it('shows both summaries and the caller’s grid in the scrolling body', () => {
    const body = markup(open().children)
    expect(body).toContain('grid')
    expect(body).toContain('a')
  })

  it('does not show a failure warning before any attempt', () => {
    const body = markup(open().children)
    expect(body).not.toContain('dedup.mergeFailed')
    expect(body).not.toContain('dedup.discardFailed')
  })

  it('shows the merge-failed warning once a merge attempt failed', () => {
    expect(markup(open(false, true).children)).toContain('dedup.mergeFailed')
  })

  // A failed discard used to show the merge copy, telling the reviewer to fix field choices.
  it('shows its own warning for a failed discard, not the merge one', () => {
    const body = markup(open(true, false).children)
    expect(body).toContain('dedup.discardFailed')
    expect(body).not.toContain('dedup.mergeFailed')
  })
})
```

In `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.test.tsx`, replace `noop` with `const controls: CompareControls = { choices: {}, onChoose: () => {}, excludedIds: [], onToggleExcluded: () => {} }` (`import type { CompareControls } from '@/shared/dedup'`) and pass `controls` wherever `noop` was passed.

In `src/shared/dedup/DuplicatesTab/index.test.tsx`, add `excludedIds: []`, `onToggleExcluded: () => {}` and `controls: { choices: {}, onChoose: () => {}, excludedIds: [], onToggleExcluded: () => {} }` to `parStub`'s object.

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup/DuplicatesTab/PairDetail src/features/medical/components/MedicalDuplicatesTab`
Expected: FAIL. `seen[0]` is `undefined` (nothing calls `Modal` yet), and the `controls` argument has a type error.

- [ ] **Step 3: Implement.**

`src/shared/dedup/DuplicatesTab/types.ts`: change `renderComparacion` to `(a: T, b: T, controls: CompareControls) => ReactNode`, with the doc line `/** The caller's grid for the open pair; `controls` carries every pick and uncheck back. */`.

`src/shared/dedup/DuplicatesTab/PairDetail/types.ts`:

```ts
import type { CompareControls, Props as TabProps } from '../types'

/** The open pair: both loaded items, the in-flight decision state, the caller's two renderers,
 *  the grid's controls, and the four decisions. */
export type Props<T> = Pick<TabProps<T>, 'renderResumen' | 'renderComparacion'> & {
  itemA: T
  itemB: T
  ocupado: boolean
  errorDescarte: boolean
  errorFusion: boolean
  controls: CompareControls
  onCancelar: () => void
  onNotSame: () => void
  onKeepSeparate: (nota: string) => void
  onFusionar: () => void
}
```

`src/shared/dedup/DuplicatesTab/PairDetail/index.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import {
  Button,
  ColorBadge,
  ConfirmModal,
  Modal,
  WarningCallout,
} from '@/shared/components/ui'
import type { Props } from './types'

/** Wide enough for two values side by side; `Modal` caps it at 95vw on a phone. */
const WIDTH_REM = 48

/** The open pair as a dialog: summaries, any failure and the caller's grid scroll in the body,
 *  while the four decisions stay in the fixed footer, always in view. */
export default function PairDetail<T>(props: Props<T>) {
  const { itemA, itemB, ocupado, errorDescarte, errorFusion, renderResumen, renderComparacion } = props
  const { controls, onCancelar, onNotSame, onKeepSeparate, onFusionar } = props
  const { t } = useT()
  const [notaAbierta, setNotaAbierta] = useState(false)

  const confirmNote = (texto?: string) => {
    setNotaAbierta(false)
    if (texto) onKeepSeparate(texto)
  }

  const actions = (
    <>
      <Button kind="cancel" onClick={onCancelar} />
      <Button kind="notSame" onClick={onNotSame} ocupado={ocupado} />
      <Button kind="keepSeparate" onClick={() => setNotaAbierta(true)} ocupado={ocupado} />
      <Button kind="confirm" label={t('dedup.merge')} onClick={onFusionar} ocupado={ocupado} />
    </>
  )

  return (
    <>
      <Modal title={t('dedup.pairTitle')} anchoRem={WIDTH_REM} onClose={onCancelar} footer={actions}>
        <ColorBadge color="var(--c-t3)">{renderResumen(itemA)}</ColorBadge>
        {' ⇄ '}
        <ColorBadge color="var(--c-t3)">{renderResumen(itemB)}</ColorBadge>
        {errorDescarte && <WarningCallout message={t('dedup.discardFailed')} />}
        {errorFusion && <WarningCallout message={t('dedup.mergeFailed')} />}
        {renderComparacion(itemA, itemB, controls)}
      </Modal>
      {notaAbierta && (
        <ConfirmModal
          title={t('dedup.sameSeparated')}
          message={t('dedup.sameSeparatedMessage')}
          confirmLabel={t('dedup.sameSeparated')}
          notaLabel={t('dedup.separatedNotePrompt')}
          onConfirm={confirmNote}
          onClose={() => setNotaAbierta(false)}
        />
      )}
    </>
  )
}

// Composes `Modal` with `ColorBadge`/`Button`/`ConfirmModal`/`WarningCallout`: no markup of its own.
// The note dialog is a sibling, not a child, so it is never clipped by the pair dialog's box.
```

The warnings sit above the grid on purpose: a long grid scrolls, and a failure has to be seen without scrolling.

`src/shared/dedup/DuplicatesTab/index.tsx`: in the `<PairDetail … />` call, replace `onElegir={par.onElegir}` with `controls={par.controls}`. Change the opening comment from "lives in `PairDetail` instead" to "lives in the `PairDetail` dialog instead".

`src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { CompareField, type CompareControls } from '@/shared/dedup'
import { pacienteDedupStrategy } from '@/features/medical/utils/pacienteDedupStrategy'
import type { Paciente } from '@/features/medical/types'
import FIELD_MAPS from '../fieldMaps'

/** One `CompareField` per clinical field `pacienteDedupStrategy.fusionar` reports as a conflict
 *  between two candidate patients, or a message when nothing differs. */
export default function comparePacientes(
  a: Paciente,
  b: Paciente,
  controls: CompareControls,
  t: (key: I18nKey) => string,
): ReactNode {
  const { choques } = pacienteDedupStrategy.fusionar(a, b)
  if (choques.length === 0) return <p>{t('dedup.noFieldDiffs')}</p>
  return (
    <>
      {choques.map((field) => {
        const labelKey = FIELD_MAPS.labelKeys[field]
        const valueOf = FIELD_MAPS.values[field]
        if (!labelKey || !valueOf) return null
        return <CompareField key={field} field={field} labelKey={labelKey} values={[valueOf(a), valueOf(b)]} controls={controls} />
      })}
    </>
  )
}

// Field matching and value extraction stay in `pacienteDedupStrategy`/`FIELD_MAPS`; this module
// only turns their output into the shared `CompareField` rows `DuplicatesTab` expects.
```

`src/features/medical/components/MedicalDuplicatesTab/index.tsx`: `renderComparacion={(a, b, controls) => comparePacientes(a, b, controls, t)}`.

i18n (after `dedup.keptOnWinner`):
- `en.json`: `"dedup.pairTitle": "Review possible duplicate"`
- `es.json`: `"dedup.pairTitle": "Revisar posible duplicado"`

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Queue.** Use slug `dedup-modal-t4-pair-dialog` with every file above. Message: `feat(dedup): open the pair comparison in a dialog with fixed actions`.

---

## Task 5: Names in the pending list — `loadSummaries`

**Files:**
- Create: `src/shared/dedup/DuplicatesTab/useListaDuplicados/loadQueue/index.ts`, `index.test.ts`, `types.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useListaDuplicados/index.ts`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (`loadSummaries` prop)
- Modify: `src/shared/dedup/DuplicatesTab/useDuplicatesTab/index.ts`
- Modify: `src/shared/dedup/DuplicatesTab/ParDuplicado/index.tsx`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/index.tsx`, `index.test.tsx`
- Modify: `src/shared/data/columns/index.ts` (add `pacientes`)
- Create: `src/features/medical/data/patientNames/index.ts`, `index.test.ts`, `constants.ts`, `types.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/summarizePaciente/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/loadSummaries/index.ts`, `index.test.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`dedup.nameUnavailable`)

**Interfaces:**
- Consumes: `listPendientes`, `ordenarPendientes` (existing), `TABLES.pacientes`, and the shared column groups (`SHARED_COLUMNS.identified`).
- Produces:
  - `LoadSummaries = (ids: string[]) => Promise<Record<string, string>>`
  - `Props<T>.loadSummaries: LoadSummaries` (required)
  - `loadQueue(entidad: string, loadSummaries: LoadSummaries): Promise<Queue | null>`, where `Queue = { pendientes: Pendiente[]; summaries: Record<string, string> }`
  - `useListaDuplicados(entidad, loadSummaries)` also returns `summaries`
  - `ParDuplicado` takes `names: [string, string]`
  - `TABLE_COLUMNS.pacientes.id`
  - Medical: `patientNames(ids: string[]): Promise<PatientName[]>` (it throws on error), `summarizePaciente({ nombre, apellido }): string`, and `loadSummaries(ids)`

- [ ] **Step 1: Write the failing tests.**

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadQueue/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import pendienteFixture from '../../pendienteFixture'
import loadQueue from '.'

const mocks = vi.hoisted(() => ({ listPendientes: vi.fn() }))
vi.mock('@/shared/dedup/data/listPendientes', () => ({ default: mocks.listPendientes }))

const pairs = [pendienteFixture(), pendienteFixture({ item_id_a: 'a', item_id_b: 'c' })]

describe('loadQueue', () => {
  beforeEach(() => mocks.listPendientes.mockReset().mockResolvedValue({ data: pairs, error: null }))

  it('asks for every distinct id of the queue once', async () => {
    const loadSummaries = vi.fn(async () => ({ a: 'Ana', b: 'Bea', c: 'Cris' }))
    const queue = await loadQueue('pacientes', loadSummaries)
    expect(loadSummaries).toHaveBeenCalledOnce()
    expect([...loadSummaries.mock.calls[0][0]].sort()).toEqual(['a', 'b', 'c'])
    expect(queue?.summaries).toEqual({ a: 'Ana', b: 'Bea', c: 'Cris' })
  })

  // Names are a convenience: a failed name read must not hide the pairs waiting on a decision.
  it('still returns the pairs when the names fail to load', async () => {
    const queue = await loadQueue('pacientes', async () => { throw new Error('network') })
    expect(queue?.pendientes).toHaveLength(2)
    expect(queue?.summaries).toEqual({})
  })

  it('does not ask for names when nothing is pending', async () => {
    mocks.listPendientes.mockResolvedValue({ data: [], error: null })
    const loadSummaries = vi.fn()
    await loadQueue('pacientes', loadSummaries)
    expect(loadSummaries).not.toHaveBeenCalled()
  })

  it('reports a failed queue as null', async () => {
    mocks.listPendientes.mockResolvedValue({ data: null, error: new Error('denied') })
    expect(await loadQueue('pacientes', vi.fn())).toBeNull()
  })
})
```

`src/shared/dedup/DuplicatesTab/ParDuplicado/index.test.tsx`: pass `names={['Ana Lopez', 'Ana P. Lopez']}` in both existing renders, and add:

```tsx
  it('names both records of the pair', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={pendienteFixture()} names={['Ana Lopez', 'Ana P. Lopez']} onAbrir={vi.fn()} />)
    expect(html).toContain('Ana Lopez')
    expect(html).toContain('Ana P. Lopez')
  })
```

`src/shared/dedup/DuplicatesTab/index.test.tsx`: put `pendientes` and `summaries` into the hoisted `fallas` state so a test can fill them. Make `listaStub` return `pendientes: fallas.pendientes` and `summaries: fallas.summaries`, reset both in `beforeEach` (`[]` and `{}`), pass `loadSummaries={async () => ({})}` in `renderTab`, and add the following. The pair comes from `pendienteFixture` (ids `a`/`b`), so no match-level literal is retyped.

```tsx
  it('names each pending pair, and says so when a name could not be loaded', () => {
    fallas.pendientes = [pendienteFixture()]
    fallas.summaries = { a: 'Ana Lopez' }
    const html = renderTab()
    expect(html).toContain('Ana Lopez')
    expect(html).toContain('dedup.nameUnavailable')
  })
```

(`import pendienteFixture from './pendienteFixture'`. Type `fallas` as `{ lista: boolean; par: boolean; pendientes: Pendiente[]; summaries: Record<string, string> }`.)

`src/shared/dedup/DuplicatesTab/useListaDuplicados/index.test.tsx`: change every `useListaDuplicados('pacientes')` into `useListaDuplicados('pacientes', async () => ({}))`.

`src/features/medical/data/patientNames/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import patientNames from '.'

const mocks = vi.hoisted(() => ({
  batches: [] as string[][],
  result: { data: [] as { id: string }[], error: null as Error | null },
}))
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (_column: string, batch: string[]) => {
          mocks.batches.push(batch)
          return { overrideTypes: async () => mocks.result }
        },
      }),
    }),
  },
}))

const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`)

describe('patientNames', () => {
  beforeEach(() => {
    mocks.batches.length = 0
    mocks.result = { data: [{ id: 'id-0' }], error: null }
  })

  // A long pending list must not build one request URL past what the API gateway accepts.
  it('reads the ids in batches of at most 100', async () => {
    await patientNames(ids)
    expect(mocks.batches.map(batch => batch.length)).toEqual([100, 50])
  })

  it('returns every batch’s rows together', async () => {
    expect(await patientNames(ids)).toHaveLength(2)
  })

  it('rejects when any batch fails', async () => {
    mocks.result = { data: [], error: new Error('denied') }
    await expect(patientNames(ids)).rejects.toThrow('denied')
  })
})
```

`src/features/medical/components/MedicalDuplicatesTab/summarizePaciente/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import summarizePaciente from '.'

describe('summarizePaciente', () => {
  it('reads first name then last name', () => {
    expect(summarizePaciente({ nombre: 'Ana', apellido: 'Lopez' })).toBe('Ana Lopez')
  })
})
```

`src/features/medical/components/MedicalDuplicatesTab/loadSummaries/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import loadSummaries from '.'

vi.mock('@/features/medical/data/patientNames', () => ({
  default: async () => [{ id: 'a', nombre: 'Ana', apellido: 'Lopez' }],
}))

describe('loadSummaries', () => {
  it('maps each id to the same summary the open pair shows', async () => {
    expect(await loadSummaries(['a'])).toEqual({ a: 'Ana Lopez' })
  })
})
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup src/features/medical/data/patientNames src/features/medical/components/MedicalDuplicatesTab`
Expected: FAIL. The modules are missing, `ParDuplicado` has no `names`, and the hook's second argument has a type error.

- [ ] **Step 3: Implement.**

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadQueue/types.ts`:

```ts
import type { Pendiente } from '@/shared/dedup/types'

/** One batched read of display names for the given ids: id → summary. */
export type LoadSummaries = (ids: string[]) => Promise<Record<string, string>>

/** The pending pairs, sorted, and every id's summary that could be loaded. */
export type Queue = { pendientes: Pendiente[]; summaries: Record<string, string> }
```

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadQueue/index.ts`:

```ts
import listPendientes from '@/shared/dedup/data/listPendientes'
import ordenarPendientes from '@/shared/dedup/ordenarPendientes'
import type { LoadSummaries, Queue } from './types'

const NO_SUMMARIES: Record<string, string> = {}

/** The queue with its names, or `null` when the queue itself failed. A failed name read is not a
 *  failed queue: the pairs still show, each unnamed side saying so. */
export default async function loadQueue(entidad: string, loadSummaries: LoadSummaries): Promise<Queue | null> {
  const { data, error } = await listPendientes(entidad)
  if (error) return null
  const pendientes = ordenarPendientes(data ?? [])
  const ids = [...new Set(pendientes.flatMap(({ item_id_a, item_id_b }) => [item_id_a, item_id_b]))]
  const summaries = ids.length === 0 ? NO_SUMMARIES : await loadSummaries(ids).catch(() => NO_SUMMARIES)
  const queue: Queue = { pendientes, summaries }
  return queue
}
```

`src/shared/dedup/DuplicatesTab/useListaDuplicados/index.ts`: add `summaries: Record<string, string>` to `EstadoLista` and `summaries: {}` to `INICIAL`. The signature becomes `useListaDuplicados(entidad: string, loadSummaries: LoadSummaries)`. `recargar` becomes:

```ts
  const recargar = async () => {
    const queue = await loadQueue(entidad, loadSummaries)
    if (!queue) return setEstado(p => ({ ...p, error: true }))
    setEstado(p => ({ ...p, ...queue, error: false }))
  }
```

Add `summaries` to `resultado`, and drop the now-unused `listPendientes`/`ordenarPendientes` imports. Keep `useEffect(…, [entidad])` as it is, because callers pass a module-level function.

`src/shared/dedup/DuplicatesTab/types.ts`: add `/** One batched read of every pending id's display name, for the list rows. */ loadSummaries: LoadSummaries` to `Props<T>` (`import type { LoadSummaries } from './useListaDuplicados/loadQueue/types'`).

`src/shared/dedup/DuplicatesTab/useDuplicatesTab/index.ts`: `const list = useListaDuplicados(props.entidad, props.loadSummaries)`.

`src/shared/dedup/DuplicatesTab/ParDuplicado/index.tsx`: add `names: [string, string]` to `Props`, and render

```tsx
      <ColorBadge color={color}>{t(exacta ? 'dedup.levelExact' : 'dedup.levelPartial')}</ColorBadge>
      <span>{names[0]} ⇄ {names[1]}</span>
      {shortMoment(new Date(par.detectado_at), intlLocale)}
```

Also update its doc to "its two records, its match level, and when the scan found it".

`src/shared/dedup/DuplicatesTab/index.tsx`: add `const nameOf = (id: string) => lista.summaries[id] ?? t('dedup.nameUnavailable')` and pass `names={[nameOf(p.item_id_a), nameOf(p.item_id_b)]}` to `ParDuplicado`.

`src/shared/data/columns/index.ts`: add to `TABLE_COLUMNS`, next to the other per-table maps:

```ts
  pacientes: {
    ...identified,
  },
```

Run `pnpm vitest run src/shared/data/columns` after this edit. Its sibling test polices the catalog, and it has to stay green.

`src/features/medical/data/patientNames/constants.ts`:

```ts
/** Ids per request: 100 uuids keep the `in (…)` filter well under a gateway's URL limit. */
export const ID_BATCH = 100
/** Only what a summary needs. */
export const NAME_COLUMNS = 'id, nombre, apellido'
```

`src/features/medical/data/patientNames/types.ts`:

```ts
import type { Paciente } from '@/features/medical/types'

/** The three columns a duplicate-list summary needs. */
export type PatientName = Pick<Paciente, 'id' | 'nombre' | 'apellido'>
```

`src/features/medical/data/patientNames/index.ts`:

```ts
import { supabase } from '@/shared/db/supabase'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { ID_BATCH, NAME_COLUMNS } from './constants'
import type { PatientName } from './types'

/** `id`, `nombre` and `apellido` of each given patient, read `ID_BATCH` ids at a time. Rejects
 *  when any batch fails, so the caller can tell "no names" from "names not loaded". */
export default async function patientNames(ids: string[]): Promise<PatientName[]> {
  const batches: string[][] = []
  for (let start = 0; start < ids.length; start += ID_BATCH) batches.push(ids.slice(start, start + ID_BATCH))
  const reads = batches.map(batch => supabase.from(TABLES.pacientes).select(NAME_COLUMNS)
    .in(TABLE_COLUMNS.pacientes.id, batch).overrideTypes<PatientName[], { merge: false }>())
  const results = await Promise.all(reads)
  const failed = results.find(({ error }) => error)
  if (failed?.error) throw failed.error
  const names = results.flatMap(({ data }) => data ?? [])
  return names
}

// Feeds the pending-duplicates list: one query per 100 ids instead of one per patient.
```

`src/features/medical/components/MedicalDuplicatesTab/summarizePaciente/index.ts`:

```ts
import type { Paciente } from '@/features/medical/types'

/** How a patient reads in the duplicate review — the list rows and the open pair alike. */
export default function summarizePaciente({ nombre, apellido }: Pick<Paciente, 'nombre' | 'apellido'>): string {
  const summary = `${nombre} ${apellido}`
  return summary
}
```

`src/features/medical/components/MedicalDuplicatesTab/loadSummaries/index.ts`:

```ts
import patientNames from '@/features/medical/data/patientNames'
import summarizePaciente from '../summarizePaciente'

/** Medical's `loadSummaries`: every given patient id → its `nombre apellido`, one batched read. */
export default async function loadSummaries(ids: string[]): Promise<Record<string, string>> {
  const rows = await patientNames(ids)
  const summaries: Record<string, string> = {}
  for (const row of rows) summaries[row.id] = summarizePaciente(row)
  return summaries
}
```

`src/features/medical/components/MedicalDuplicatesTab/index.tsx`: delete the local `summarizePaciente` and import it from `./summarizePaciente`. Add `import loadSummaries from './loadSummaries'` and pass `loadSummaries={loadSummaries}`.

i18n (after `dedup.pairTitle`):
- `en.json`: `"dedup.nameUnavailable": "Name unavailable"`
- `es.json`: `"dedup.nameUnavailable": "Nombre no disponible"`

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. The `MedicalDuplicatesTab` empty-state test still passes, because its effect never runs under SSR.

- [ ] **Step 5: Queue.** Use slug `dedup-modal-t5-list-names` with every file above. Message: `feat(dedup): name both records in every pending-duplicate row`. In the body, record that `Pendiente` carries only ids, which is why there is a batched loader and not a per-row `cargarItem`.

---

## Task 6: Medical's multivalued view — phones and emails from `paciente_contactos`

**Files:**
- Modify: `src/features/medical/constants/index.ts` (`CONTACT_TYPE`)
- Modify: `src/shared/data/columns/index.ts` (add `pacienteContactos`)
- Create: `src/features/medical/data/patientContacts/index.ts`, `index.test.ts`, `constants.ts`, `types.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/types.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/reviewFixture/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields/index.ts`, `index.test.ts`, `types.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`med.field.telefono`, `med.field.email`)

**Interfaces:**
- Consumes: `CompareField` and `CompareControls` (Tasks 2–3), `summarizePaciente` (Task 5), and `buildMergeValues(winner: Paciente, loser: Paciente, choices)`, unchanged.
- Produces:
  - `CONTACT_TYPE = { phone, email }`, holding the two values `paciente_contactos.tipo` allows
  - `TABLE_COLUMNS.pacienteContactos.pacienteId`
  - `ContactView = Pick<PacienteContacto, 'id' | 'valor'>`
  - `PatientUnderReview = { paciente: Paciente; telefono: ContactView[]; email: ContactView[] }`, with one entry per `paciente_contactos` row
  - `loadPaciente(id): Promise<PatientUnderReview>`
  - `comparePacientes(a: PatientUnderReview, b: PatientUnderReview, controls, t)`

- [ ] **Step 1: Write the failing tests.**

`src/features/medical/data/patientContacts/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import patientContacts from '.'

const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mocks.from(table)
      return { select: () => ({ eq: (column: string, value: string) => { mocks.eq(column, value); return { overrideTypes: async () => ({ data: [], error: null }) } } }) }
    },
  },
}))

describe('patientContacts', () => {
  it('reads one patient’s rows from its contacts table', async () => {
    await patientContacts('p1')
    expect(mocks.from).toHaveBeenCalledWith(TABLES.pacienteContactos)
    expect(mocks.eq).toHaveBeenCalledWith(TABLE_COLUMNS.pacienteContactos.pacienteId, 'p1')
  })
})
```

Replace `src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.test.ts` with the following. The rows spell their `tipo` through `CONTACT_TYPE`, the same constant the loader filters by.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import { CONTACT_TYPE } from '@/features/medical/constants'
import loadPaciente from '.'

const mocks = vi.hoisted(() => ({ getPaciente: vi.fn(), patientContacts: vi.fn() }))
vi.mock('@/features/medical/data/pacientes', () => ({ getPaciente: mocks.getPaciente }))
vi.mock('@/features/medical/data/patientContacts', () => ({ default: mocks.patientContacts }))

const ROWS = [
  { id: 'c1', tipo: CONTACT_TYPE.phone, valor: '555-0001' },
  { id: 'c2', tipo: CONTACT_TYPE.phone, valor: '555-0001' },
  { id: 'c3', tipo: CONTACT_TYPE.email, valor: 'ana@example.invalid' },
]

describe('loadPaciente', () => {
  beforeEach(() => {
    mocks.getPaciente.mockReset()
    mocks.patientContacts.mockReset().mockResolvedValue({ data: ROWS, error: null })
  })

  it('loads the patient with every phone and email row it holds', async () => {
    const patient = pacienteFixture()
    mocks.getPaciente.mockResolvedValue({ data: patient, error: null })
    const review = await loadPaciente(patient.id)
    expect(review.paciente).toBe(patient)
    expect(review.email).toEqual([{ id: 'c3', valor: 'ana@example.invalid' }])
  })

  // One phone saved under two `fuente`s is two rows: both ids must reach the screen, or
  // unchecking it would drop one row and keep the other.
  it('keeps one entry per row, even for a repeated value', async () => {
    mocks.getPaciente.mockResolvedValue({ data: pacienteFixture(), error: null })
    const review = await loadPaciente('p1')
    expect(review.telefono.map(({ id }) => id)).toEqual(['c1', 'c2'])
  })

  // The bug this guards against: Supabase resolves `{ error }` instead of throwing, so a missing
  // or unreadable patient came back as `null` typed as `Paciente` and the pair silently never opened.
  it('rejects when the patient read resolves with an error', async () => {
    const failure = { code: 'PGRST116', message: 'not found' }
    mocks.getPaciente.mockResolvedValue({ data: null, error: failure })
    await expect(loadPaciente('gone')).rejects.toBe(failure)
  })

  it('rejects when the contacts read fails, instead of showing no phones', async () => {
    const failure = { code: '42501', message: 'denied' }
    mocks.getPaciente.mockResolvedValue({ data: pacienteFixture(), error: null })
    mocks.patientContacts.mockResolvedValue({ data: null, error: failure })
    await expect(loadPaciente('p1')).rejects.toBe(failure)
  })
})
```

`src/features/medical/components/MedicalDuplicatesTab/reviewFixture/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import reviewFixture from '.'

describe('reviewFixture', () => {
  it('builds a patient under review with no contacts unless given', () => {
    const review = reviewFixture({ seguro: 'Aetna' })
    expect(review.paciente.seguro).toBe('Aetna')
    expect(review.telefono).toEqual([])
    expect(review.email).toEqual([])
  })
})
```

`src/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CONTACT_TYPE } from '@/features/medical/constants'
import CONTACT_FIELDS from '.'

describe('CONTACT_FIELDS', () => {
  it('covers exactly the contact types the database allows', () => {
    expect(CONTACT_FIELDS.map(({ key }) => key).sort()).toEqual(Object.values(CONTACT_TYPE).sort())
  })
})
```

Replace `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CHECKBOX } from '@/shared/constants/dom'
import type { CompareControls } from '@/shared/dedup'
import reviewFixture from '../reviewFixture'
import comparePacientes from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

const t = (key: string) => key
const CHECKBOX_INPUT = `type="${CHECKBOX}"`
const controls: CompareControls = { choices: {}, onChoose: () => {}, excludedIds: [], onToggleExcluded: () => {} }
const draw = (a: ReturnType<typeof reviewFixture>, b: ReturnType<typeof reviewFixture>) =>
  renderToStaticMarkup(<>{comparePacientes(a, b, controls, t)}</>)

describe('comparePacientes', () => {
  it('shows a comparison row for every differing field', () => {
    expect(draw(reviewFixture({ seguro: 'Aetna' }), reviewFixture({ seguro: 'Cigna' }))).toContain('med.field.seguro')
  })

  it('offers every phone of both patients as a checkbox', () => {
    const a = reviewFixture({}, { telefono: [{ id: 'c1', valor: '555-0001' }] })
    const b = reviewFixture({}, { telefono: [{ id: 'c2', valor: '555-0002' }] })
    const html = draw(a, b)
    expect(html).toContain('med.field.telefono')
    expect(html).toContain('555-0001')
    expect(html).toContain('555-0002')
    expect(html).toContain(CHECKBOX_INPUT)
  })

  it('leaves out a contact type neither patient has', () => {
    const a = reviewFixture({ seguro: 'Aetna' })
    const b = reviewFixture({ seguro: 'Cigna' })
    expect(draw(a, b)).not.toContain('med.field.email')
  })

  it('shows the no-diff message when nothing differs and no contact exists', () => {
    expect(draw(reviewFixture(), reviewFixture())).toContain('dedup.noFieldDiffs')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/features/medical`
Expected: FAIL. `patientContacts`, `reviewFixture`, `contactFields` and `CONTACT_TYPE` are missing, and `review.paciente` is undefined.

- [ ] **Step 3: Implement.**

`src/features/medical/constants/index.ts`: add the following, and keep the file's existing closing comment last. The values are the two members of the `tipo_contacto` domain (`supabase/migrations/20260824001303_paciente_contactos.sql`). `as const` is what lets `ContactField['key']` narrow to them.

```ts
/** The two values `paciente_contactos.tipo` (domain `tipo_contacto`) allows. */
export const CONTACT_TYPE = { phone: 'telefono', email: 'email' } as const
```

`src/shared/data/columns/index.ts`: add to `TABLE_COLUMNS`, next to the `pacientes` map from Task 5:

```ts
  pacienteContactos: {
    ...identified,
    pacienteId: 'paciente_id',
  },
```

and run `pnpm vitest run src/shared/data/columns`.

`src/features/medical/data/patientContacts/constants.ts`:

```ts
/** What the duplicate review needs from each contact row. */
export const CONTACT_COLUMNS = 'id, tipo, valor'
```

`src/features/medical/data/patientContacts/types.ts`:

```ts
import type { PacienteContacto } from '@/features/medical/types'

/** One `paciente_contactos` row as the duplicate review reads it. */
export type PatientContactRow = Pick<PacienteContacto, 'id' | 'tipo' | 'valor'>
```

`src/features/medical/data/patientContacts/index.ts`:

```ts
import { supabase } from '@/shared/db/supabase'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { CONTACT_COLUMNS } from './constants'
import type { PatientContactRow } from './types'

/** Every phone and email row one patient holds, one per row — not deduplicated by value. */
export default function patientContacts(patientId: string) {
  const query = supabase.from(TABLES.pacienteContactos).select(CONTACT_COLUMNS)
    .eq(TABLE_COLUMNS.pacienteContactos.pacienteId, patientId)
  return query.overrideTypes<PatientContactRow[], { merge: false }>()
}

// The duplicate review's read of `paciente_contactos`: each row's id is what a merge may exclude.
```

`src/features/medical/components/MedicalDuplicatesTab/types.ts`:

```ts
import type { Paciente, PacienteContacto } from '@/features/medical/types'

/** One contact row as the duplicate review shows it: which row, and what it says. */
export type ContactView = Pick<PacienteContacto, 'id' | 'valor'>

/** A patient loaded for the duplicate review: its row, plus every phone and email row it holds.
 *  The arrays are what make `CompareField` resolve these two fields with checkboxes. */
export type PatientUnderReview = { paciente: Paciente; telefono: ContactView[]; email: ContactView[] }
```

`src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.ts`:

```ts
import { getPaciente } from '@/features/medical/data/pacientes'
import patientContacts from '@/features/medical/data/patientContacts'
import type { PatientContactRow } from '@/features/medical/data/patientContacts/types'
import { CONTACT_TYPE } from '@/features/medical/constants'
import type { ContactView, PatientUnderReview } from '../types'

const ofType = (rows: PatientContactRow[], type: string): ContactView[] =>
  rows.filter(({ tipo }) => tipo === type).map(({ id, valor }) => ({ id, valor }))

/** One patient by id for the duplicate review, with its contact rows split by type — or a
 *  rejection when either read fails. */
export default async function loadPaciente(id: string): Promise<PatientUnderReview> {
  const [patientRead, contactsRead] = await Promise.all([getPaciente(id), patientContacts(id)])
  if (patientRead.error) throw patientRead.error
  if (contactsRead.error) throw contactsRead.error
  const rows = contactsRead.data ?? []
  const review: PatientUnderReview = {
    paciente: patientRead.data,
    telefono: ofType(rows, CONTACT_TYPE.phone),
    email: ofType(rows, CONTACT_TYPE.email),
  }
  return review
}

// Supabase resolves `{ error }` rather than throwing: rethrowing it is what lets
// `useAbrirPendiente`'s catch mark the pair as failed to open instead of opening nothing.
```

`src/features/medical/components/MedicalDuplicatesTab/reviewFixture/index.ts`:

```ts
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import type { Paciente } from '@/features/medical/types'
import type { PatientUnderReview } from '../types'

const NO_FIELDS: Partial<Paciente> = {}
const NO_CONTACTS: Partial<Omit<PatientUnderReview, 'paciente'>> = {}

/** A `PatientUnderReview` for tests: a valid patient with any field overridden, and no contacts
 *  unless given. */
export default function reviewFixture(
  fields: Partial<Paciente> = NO_FIELDS,
  contacts: Partial<Omit<PatientUnderReview, 'paciente'>> = NO_CONTACTS,
): PatientUnderReview {
  const review: PatientUnderReview = { paciente: pacienteFixture(fields), telefono: [], email: [], ...contacts }
  return review
}
```

`src/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields/types.ts`:

```ts
import type { I18nKey } from '@/shared/i18n'
import type { CONTACT_TYPE } from '@/features/medical/constants'

/** A multivalued contact field: which `PatientUnderReview` list it reads, and its label. */
export type ContactField = { key: (typeof CONTACT_TYPE)[keyof typeof CONTACT_TYPE]; labelKey: I18nKey }
```

`src/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields/index.ts`:

```ts
import { CONTACT_TYPE } from '@/features/medical/constants'
import type { ContactField } from './types'

/** The contact types a patient merge shows as checkboxes, in screen order. */
const CONTACT_FIELDS: ContactField[] = [
  { key: CONTACT_TYPE.phone, labelKey: 'med.field.telefono' },
  { key: CONTACT_TYPE.email, labelKey: 'med.field.email' },
]

export default CONTACT_FIELDS
```

`src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { CompareField, type CompareControls } from '@/shared/dedup'
import { pacienteDedupStrategy } from '@/features/medical/utils/pacienteDedupStrategy'
import FIELD_MAPS from '../fieldMaps'
import CONTACT_FIELDS from './contactFields'
import type { ContactView, PatientUnderReview } from '../types'

const contactText = ({ valor }: ContactView) => valor

/** One `CompareField` per clinical field `pacienteDedupStrategy.fusionar` reports as a conflict,
 *  then one per contact type either patient holds; a message when there is nothing to show. */
export default function comparePacientes(
  a: PatientUnderReview,
  b: PatientUnderReview,
  controls: CompareControls,
  t: (key: I18nKey) => string,
): ReactNode {
  const { choques } = pacienteDedupStrategy.fusionar(a.paciente, b.paciente)
  const scalarRows = choques.flatMap((field) => {
    const labelKey = FIELD_MAPS.labelKeys[field]
    const valueOf = FIELD_MAPS.values[field]
    if (!labelKey || !valueOf) return []
    return [<CompareField key={field} field={field} labelKey={labelKey}
      values={[valueOf(a.paciente), valueOf(b.paciente)]} controls={controls} />]
  })
  const contactFields = CONTACT_FIELDS.filter(({ key }) => a[key].length + b[key].length > 0)
  if (scalarRows.length === 0 && contactFields.length === 0) return <p>{t('dedup.noFieldDiffs')}</p>
  return (
    <>
      {scalarRows}
      {contactFields.map(({ key, labelKey }) => (
        <CompareField key={key} labelKey={labelKey} values={[a[key], b[key]]} textOf={contactText} controls={controls} />
      ))}
    </>
  )
}

// Medical decides WHICH fields and in what shape: scalars from `choques`, arrays from
// `paciente_contactos`. The shared `CompareField` decides how each shape is resolved.
```

`src/features/medical/components/MedicalDuplicatesTab/index.tsx`:

```tsx
'use client'
import { useT } from '@/shared/i18n'
import DuplicatesTab from '@/shared/dedup/DuplicatesTab'
import comparePacientes from './comparePacientes'
import loadPaciente from './loadPaciente'
import loadSummaries from './loadSummaries'
import buildMergeValues from './buildMergeValues'
import summarizePaciente from './summarizePaciente'

/** Medical's wrapper over the shared duplicate-review screen: loads a patient with its contact
 *  rows, names it `nombre apellido`, and compares clinical conflicts plus every phone and email. */
export default function MedicalDuplicatesTab() {
  const { t } = useT()
  return (
    <DuplicatesTab
      entidad="pacientes"
      cargarItem={loadPaciente}
      loadSummaries={loadSummaries}
      renderResumen={({ paciente }) => summarizePaciente(paciente)}
      renderComparacion={(a, b, controls) => comparePacientes(a, b, controls, t)}
      construirValoresFinales={(a, b, choices) => buildMergeValues(a.paciente, b.paciente, choices)}
    />
  )
}

// Wires Medical's patient shape into the shared `DuplicatesTab` contract. The merge values still
// come from the `pacientes` rows alone; contacts travel only as excluded ids.
```

i18n (next to the other `med.field.*` keys):
- `en.json`: `"med.field.telefono": "Phone"`, `"med.field.email": "Email"`
- `es.json`: `"med.field.telefono": "Teléfono"`, `"med.field.email": "Correo"`

Before adding them, `grep -n '"med.field.telefono"\|"med.field.email"' src/shared/i18n/locales/*.json`. If either key already exists, reuse it and do not add it twice.

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. `buildMergeValues`'s own tests are unchanged, which shows that the merge-values half never sees the contact arrays.

- [ ] **Step 5: Queue.** Use slug `dedup-modal-t6-medical-contacts` with every file above. Message: `feat(medical): show every phone and email of a duplicate pair as keep/drop checkboxes`.

---

## Task 7: Final verification

**Files:** none are created. Fix whatever a step below finds, inside the task that owns that file, and queue the fix as its own entry.

- [ ] **Step 1:** `pnpm typecheck`, which is expected to be clean.
- [ ] **Step 2:** `pnpm test`, which is expected to pass in full.
- [ ] **Step 3:** `pnpm build:check`. Never run `next build` while `pnpm dev` is up, and never start a second `pnpm dev` if `:3000` already answers.
- [ ] **Step 4:** Run every `supabase/checks/duplicados-motor-*.sql` against the local stack (the loop from Task 1, Step 4). Each one must print its `PASS:` line.
- [ ] **Step 5:** `grep -rn "@/features" src/shared/dedup`, which is expected to print nothing.
- [ ] **Step 6: Browser walkthrough.** Use `pnpm dev`, `/medical` → Duplicados, a non-admin account with the `medical` module (an admin proves nothing about permissions), and two local test patients created **through the app**, not by seed. Give the winner phone `555-0001`. Give the loser `555-0001` plus `555-0002`, and one email. Then confirm each of the following:
  - Every list row shows both names.
  - Opening a row brings up a dialog. Focus lands inside it, Tab stays inside it, and Esc closes it and returns focus to the row.
  - The four buttons stay visible however long the grid is. Shrink the window to check.
  - `555-0001` is checked, disabled and marked "Already on the record that stays". `555-0002` and the email are checked and can be toggled.
  - "Same person, keep separate" opens its note dialog on top. Esc closes only the note dialog.
  - Uncheck `555-0002` and merge. Then run `select tipo, valor from paciente_contactos where paciente_id = '<winner id>'` on the local DB: it shows `555-0001` and the email, and **not** `555-0002`.
- [ ] **Step 7:** Report to the repo owner the known limitation from correction 8 (a revert does not restore excluded contacts), and remind them that the in-place migration edit has to land before this branch is ever pushed (correction 6).
