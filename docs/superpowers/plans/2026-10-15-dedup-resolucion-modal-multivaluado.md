# Dedup Resolution Modal + Multivalued Attributes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The original engine (`2026-10-12-motor-duplicados-ambiente.md`) ran through subagent-driven-development, with a review after each task and a final review of the whole branch. Use the same process here.

**Goal:** Replace the inline pair comparison in the Duplicados tab with a modal dialog. Let the reviewer uncheck individual phone and email values of the losing patient before a merge, without any unchecked value coming back through the winner's main `telefono`/`email` column. Keep every discarded child row so a revert can restore it. Show both patients' names in every pending-list row.

**Architecture:**
- **Database.** `fusionar_duplicado` gets a fifth parameter, `p_contactos_excluidos uuid[] DEFAULT '{}'`. An excluded row takes the per-row skip path that already exists for child-row collisions. Every skipped row, for either reason, is now saved whole in a new `duplicados_fusiones.hijos_descartados` column, and `revertir_fusion_duplicado` re-creates those rows.
- **Shared TypeScript engine.** A new `CompareField` component in `src/shared/dedup/` resolves each field. It shows a left/right pick (`FieldCompare`, unchanged) or checkboxes (`MultiValueCompare`, new), and it decides only from `Array.isArray` on the values.
- **Medical's adapter.** It turns `telefono`/`email` into arrays by reading `paciente_contactos` for each side. It also builds the merge values with the exclusion set in hand.
- **The open pair.** The shared open-pair hook holds the excluded ids. Decision state (busy and error flags) is keyed to the pair it belongs to.
- **The dialog.** `PairDetail` is drawn inside the shared `Modal`. It labels which record stays, and it refuses to close mid-decision.
- **The pending list.** It shows pairs immediately and fills in names asynchronously, from a batched `loadSummaries` prop.

**Tech Stack:** Next.js 14 · TypeScript · Supabase (Postgres 17) · vitest (SSR only, no DOM) · plpgsql checks run with `psql -f`

**Spec:** `docs/superpowers/specs/2026-10-15-dedup-resolucion-modal-multivaluado-design.md`. Read it in full before Task 1, and read "Corrections to the spec" below as well. Where the two disagree, this plan wins. Each correction comes from reading the code, and the second revision also draws on two adversarial reviews of the first one, with the repo owner's decisions applied.

## Global Constraints

These come from the spec, this repo's Centinela rules (`rules-here` lists them), and the original engine plan. They apply to every task.

- **Guiding principle (spec):** "the program suggests, the person decides. No merge ever runs on its own."
- **Out of scope (spec):** the import flow (`src/shared/import/MergeCandidateRow`), free-text editing of non-multivalued fields, and any primary/alternate ranking of multivalued values. Do not touch them.
- **`NO_SON_CHOQUE` and `buildMergeValues` stay unchanged.** The only change to `telefono`/`email` resolution is Task 7's wrapper. It overrides a value only when that value is one the reviewer unchecked (correction 9).
- **The shared engine never imports from `src/features/`**, and never configures behavior by field name.
- **The element type of a multivalued array is generic** (`E extends { id: string }`). The engine never assumes it is a string.
- **`any` is forbidden.** Types are never loosened to make the code compile. `as` casts in test fixtures count too: annotate a local instead.
- **No `../../`, tests included.** Outside a component's own folder, import with `@/shared/…` or `@/features/…`. A single `../` to a sibling of the same feature folder is fine.
- **A directory under `src/shared/` is imported through its barrel** from outside it. For example `import { supabase } from '@/shared/db'`, never `@/shared/db/supabase`. Tests still `vi.mock('@/shared/db/supabase')`, because the barrel re-exports that module.
- **One import per directory (owner's norm):** two imports into the same directory mean a missing barrel or a missing destructure. This is why Task 6 creates `src/features/medical/data/index.ts`.
- **Two named types or more go to their own `types.ts`, test files included.** In tests, annotate locals instead of declaring a second named type.
- **A component is a folder:** `index.tsx` plus `index.test.tsx`, plus `index.module.css` when it draws markup of its own.
- **One `export default` per file. Exported types live in `types.ts`. Constants do not share a file with logic.**
- **A call argument, a comparison or a return never carries a string literal.** Name it as a constant. `import` paths and `t('…')` keys are exempt. Column names used in filters and orders come from `TABLE_COLUMNS`/`COLUMNS` (`@/shared/schema`).
- **New identifiers are in English.** Existing Spanish identifiers (`elecciones`, `abierto`, `cargarItem`) stay as they are. Table, column, RPC and parameter names stay exactly as spelled (`p_contactos_excluidos`, `hijos_descartados`).
- **i18n:** every visible string goes through `t()`, with the key in both `src/shared/i18n/locales/es.json` and `en.json`. `t(key, { name })` fills `{name}` placeholders.
- **Vitest runs without a DOM:** render with `renderToStaticMarkup` or test pure functions, and never mount a component. Hooks are probed with `@/shared/dedup/DuplicatesTab/capturarHook`, where effects do not run. Behavior that only a re-render could show goes into a pure function, and that function is what gets tested.
- **A test suite is written before the module it covers.** Every new `.ts`/`.tsx` gets a sibling test, re-export-only barrels included.
- **An exported symbol is documented with `/** */`**. A module's `index` ends with a comment saying what the module does. A comment says why, in three lines or fewer.
- **Never `pnpm supabase db reset`.**
- **No `git commit` and no `git add -A`.** Queue each task with `bun /home/wagner/.claude/plugins/cache/wsmithdr/centinela/2.30.1/.shared/pending-commits/main.ts add <slug> <message-file> <path>...`. Write the message file outside the repo, as `type(scope): summary`, a blank line, a body that says why, a blank line, then `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. **Never run `apply`.**
- **Verification before each TS queue:** `pnpm typecheck && pnpm test`. For SQL, run `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f <check>`.

## Corrections to the spec

Each correction was checked against the code on `feat/motor-duplicados-ambiente` at `19a7ecba`/`b33ee4d`. Corrections 9 and 10 are the two Critical review findings, applied as the repo owner decided.

1. **Section 5 ("no new data is required") is wrong.** `Pendiente` holds only `item_id_a`, `item_id_b`, `nivel` and `detectado_at`. `renderResumen` needs a loaded `T`.
   - **Resolution:** a new required `loadSummaries(ids)` prop. Medical implements it as a batched `nombre`/`apellido` read, 100 ids per request, formatted by the same `summarizePaciente` that `renderResumen` uses.
   - **Cost:** one extra round trip per list reload.
   - **Loading behavior:** the round trip never blocks the list. Pairs render at once, each name reads "Loading name…" until it arrives, and a name that cannot be loaded reads "Name unavailable".
2. **Section 2 ("deduplicated by value, for each patient") would lose data.** `paciente_contactos` is `UNIQUE (paciente_id, tipo, valor, fuente)`, so one patient can hold the same value twice, once per `fuente`. Keeping one id per value would let an unchecked value survive under its second row.
   - **Resolution:** one element per row. The shared `mergeMultiValueRows` groups rows by displayed text, and each screen row carries every id behind that text.
3. **What unchecking a value the winner holds should do was never specified.** The RPC only excludes the **loser's** rows.
   - **Resolution:** such a row is drawn checked and disabled, with a hint. The RPC rejects a winner's id as foreign.
4. **The foreign-id check is generic, not tied to `paciente_contactos`.** `fusionar_duplicado` handles every table registered in `duplicados_entidades.hijos`.
   - **Resolution:** an id is accepted if it is the `id` of some child row of the loser. `paciente_fuentes` has no `id` column, so in practice this means "a `paciente_contactos` row of `p_perdedor_id`".
5. **The signature change needs a `DROP`.** Without it the 4-argument overload survives, and every 4-argument call becomes ambiguous.
6. **The migrations are edited in place, by the same convention as `5fbd4d88`.** That is only safe if neither git **nor the linked database** has the migration versions. Supabase tracks migrations by version, not by content. If prod already ran `20261012120500` with the old signature, an in-place edit never reaches prod, and every merge from the new UI would fail. Step 0 of Task 1 therefore checks both. A migration already applied locally is not re-run by `migration up`, so the edited files are applied locally with `psql -f`. Both files are written to be safe to re-run.
7. **A gap fixed along the way:** `comparePacientes` never passed `selectedValue`, so no pill ever showed as chosen. `CompareField` now shows the reviewer's pick, or the winner's value until a pick is made. That is what the merge sends by default.
8. **The winner is invisible today.** The winner is always `item_id_a`, the lower uuid, and the dialog only shows "A ⇄ B". **Resolution:** the summary badges say "Stays" and "Merged in, then removed". The disabled-checkbox hint ("Already on the record that stays") now points at a labelled record.
9. **(Critical C1) An unchecked value can resurface as the winner's main contact.** `buildMergeValues` calls `pacienteIdentity.fusionarCampoSimple`, which fills a blank winner `telefono`/`email` with the loser's value, unaware of what the reviewer excluded. `NO_SON_CHOQUE` keeps those fields out of the comparison grid, but it does not stop this copy.
   - **Example:** the winner has no scalar phone, the loser's scalar phone is `555-0002`, and the reviewer unchecks the loser's `555-0002` contact row. The row is dropped, but `p_valores_finales.telefono` would still be `555-0002`.
   - **Resolution (owner):** `construirValoresFinales` also receives `excludedIds`. Medical's `buildReviewMergeValues` puts back the winner's own value, even `null` or blank, wherever the value it would adopt matches the text of an excluded loser contact. The RPC accepts this: the value still matches the winner's snapshot.
10. **(Critical C2) Skipped child rows were destroyed with no audit trail**, already true of collision skips since `5fbd4d88`, and now also of exclusions.
    - **Resolution (owner):** every skipped row, for either reason, is saved whole in `duplicados_fusiones.hijos_descartados`, and `revertir_fusion_duplicado` re-creates those rows. If a saved row would collide with a current one, the revert refuses with a clear error. It never restores only half of the merge.

## Review Focus

Inputs the spec implies but no requirement names. Each one is pinned by a test in the task listed.

1. **A value both patients hold** (the most common real duplicate). It shows once, checked and disabled. A winner's id sent anyway rejects the merge. Tested in Task 4 (`mergeMultiValueRows`, `MultiValueCompare`) and Task 1 (`…041` rejected).
2. **The winner's main column after an exclusion.** The winner has a blank `telefono`, and the loser's scalar `telefono` is a value the reviewer unchecked. The winner must keep its blank. Tested in Task 7 (`buildReviewMergeValues`), and asserted on `pacientes` in Task 8.
3. **Moving between pairs.** After unchecking boxes or after a failed decision, opening another pair starts clean: no excluded ids and no error flags. A late result from the previous pair neither shows nor closes anything. Tested in Task 3 (`openedPair`, `decisionFor`).
4. **A revert after a merge that skipped rows.** Both a colliding row and an excluded row come back whole, and a conflicting current row makes the revert refuse. Tested in Task 2.
5. **A slow, hung or partly failed name read.** The pending list and the Scan button never wait for names. Batches that loaded keep their names. An older reload answering late cannot overwrite a newer one. Tested in Task 6 (`useListaDuplicados`, `patientNames`).

---

## File Structure

```
supabase/migrations/20261012120500_duplicados_motor_fusionar.sql   (modify in place — Task 1)
supabase/migrations/20261012120600_duplicados_motor_revertir.sql   (modify in place — Task 2)
supabase/checks/duplicados-motor-fusionar.sql                       (modify — Task 1)
supabase/checks/duplicados-motor-revertir.sql                       (modify — Task 2)

src/shared/constants/dom/index.ts                                   (modify — CHECKBOX, Task 4)
src/shared/data/columns/index.ts                                    (modify — pacientes, pacienteContactos; Tasks 6, 7)
src/shared/i18n/locales/es.json, en.json                            (modify — Tasks 4–7)

src/shared/dedup/
  index.ts                                    (modify — export CompareField + CompareControls)
  data/fusionar/index.ts, index.test.ts       (modify — excludedIds → p_contactos_excluidos, Task 3)
  CompareField/                               (create — Task 4)
    index.tsx, index.test.tsx, types.ts
    isMultiValue/index.ts, index.test.ts
    mergeMultiValueRows/index.ts, index.test.ts
    MultiValueCompare/index.tsx, index.module.css, index.test.tsx
  DuplicatesTab/
    types.ts                                  (modify — CompareControls, renderComparacion, construirValoresFinales, loadSummaries)
    index.tsx, index.test.tsx                 (modify — controls, names)
    PairDetail/index.tsx, types.ts, index.test.tsx   (modify — a Modal, Task 5)
    PairDetail/constants.ts                   (create — Task 5)
    PairDetail/closeIntent/index.ts, index.test.ts   (create — Task 5)
    ParDuplicado/index.tsx, index.test.tsx    (modify — names, Task 6)
    decidirArgsFixture/index.ts               (modify — excludedIds)
    useAbrirPendiente/index.ts, types.ts      (modify — excludedIds, controls, Task 3)
    useAbrirPendiente/openedPair/index.ts, index.test.ts      (create — Task 3)
    useAbrirPendiente/toggleExcluded/index.ts, index.test.ts  (create — Task 3)
    useDecidirPendiente/index.ts, types.ts, valoresFinales.test.ts   (modify — Task 3)
    useDecidirPendiente/constants.ts          (create — Task 3)
    useDecidirPendiente/pairKey/index.ts, index.test.ts, constants.ts      (create — Task 3)
    useDecidirPendiente/decisionFor/index.ts, index.test.ts                (create — Task 3)
    useDuplicatesTab/index.ts                 (modify — loadSummaries, Task 6)
    useListaDuplicados/index.ts, index.test.tsx      (modify — counter, async names, Task 6)
    useListaDuplicados/loadNames/index.ts, index.test.ts, types.ts   (create — Task 6)

src/features/medical/
  constants/index.ts                          (modify — CONTACT_TYPE, Task 7)
  data/index.ts, index.test.ts                (create — barrel, Task 6; extended in Task 7)
  data/patientNames/index.ts, index.test.ts, constants.ts, types.ts     (create — Task 6)
  data/patientContacts/index.ts, index.test.ts, constants.ts, types.ts  (create — Task 7)
  components/MedicalDuplicatesTab/
    index.tsx, index.test.tsx                 (modify — Tasks 5, 6, 7)
    types.ts                                  (create — PatientUnderReview, Task 7)
    summarizePaciente/index.ts, index.test.ts (create — Task 6)
    loadSummaries/index.ts, index.test.ts     (create — Task 6)
    loadPaciente/index.ts, index.test.ts      (modify — Task 7)
    reviewFixture/index.ts, index.test.ts     (create — Task 7)
    buildReviewMergeValues/index.ts, index.test.ts   (create — Task 7)
    comparePacientes/index.tsx, index.test.tsx       (modify — Tasks 5, 7)
    comparePacientes/contactFields/index.ts, index.test.ts, types.ts   (create — Task 7)
```

`FieldCompare`, `ConfirmModal`, `Modal` and `buildMergeValues` are reused unchanged. `CompareField` has no `index.module.css`, because it draws no markup of its own.

---

## Task 1: RPC — `fusionar_duplicado` excludes chosen contacts and keeps every skipped row

**Files:**
- Modify: `supabase/migrations/20261012120500_duplicados_motor_fusionar.sql` (whole file, shown below)
- Modify: `supabase/checks/duplicados-motor-fusionar.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - The function `public.fusionar_duplicado(p_entidad text, p_ganador_id uuid, p_perdedor_id uuid, p_valores_finales jsonb, p_contactos_excluidos uuid[] DEFAULT '{}') RETURNS void`. A foreign or `NULL` element fails with `22023` and `Excluded child rows must belong to the loser`. A `NULL` array fails with `22004` and `Duplicate merge inputs must not be null`.
  - The new column `duplicados_fusiones.hijos_descartados jsonb NOT NULL DEFAULT '[]'`. It has one entry per registered child table, `{ "tabla", "columna", "filas": [<full row jsonb>, …] }`, in the same order as `hijos_movidos`. A row is listed there when it collided with the winner or was excluded by the reviewer.
  - The 4-argument overload no longer exists.

- [ ] **Step 0: Preconditions.** Run both checks before editing anything.
  1. `git fetch origin && git branch -r --contains 5fbd4d88` must print nothing.
  2. Ask the repo owner to run `pnpm supabase migration list --linked`. Wait for the result: it reads the linked prod project, and in this repo the owner runs commands that touch prod. `20261012120000`, `20261012120500` and `20261012120600` must all be **absent from the Remote column**.

  If either check fails, stop and report. The changes must then become new migrations instead of in-place edits (correction 6).

- [ ] **Step 1: Write the failing check.** Make these edits in `supabase/checks/duplicados-motor-fusionar.sql`.

Line 3 becomes the new signature, followed by a guard against a leftover overload and a check that the new column exists:

```sql
SELECT 'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])'::regprocedure;
DO $$ BEGIN
  IF to_regprocedure('public.fusionar_duplicado(text,uuid,uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'The 4-argument overload must be gone: next to the new one it makes every 4-argument call ambiguous';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'duplicados_fusiones' AND column_name = 'hijos_descartados') THEN
    RAISE EXCEPTION 'duplicados_fusiones must keep the skipped child rows';
  END IF;
END $$;
```

Add two rows to the existing `INSERT INTO public.pacientes` list, after `…007` (move the `;` to the new last row):

```sql
  ('d0900000-0000-0000-0000-000000000008', 'MERGE-8', 'Fixture', 'Exclude', NULL),
  ('d0900000-0000-0000-0000-000000000009', 'MERGE-9', 'Fixture', 'Exclude', NULL);
```

Add these rows to the existing `INSERT INTO public.paciente_contactos` list, after `…037` (move the `;` the same way):

```sql
  ('d0900000-0000-0000-0000-000000000041', 'd0900000-0000-0000-0000-000000000008', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0142'),
  ('d0900000-0000-0000-0000-000000000043', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0143'),
  ('d0900000-0000-0000-0000-000000000044', 'd0900000-0000-0000-0000-000000000009', 'email', 'solo@example.invalid'),
  ('d0900000-0000-0000-0000-000000000045', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000046', 'd0900000-0000-0000-0000-000000000003', 'telefono', '555-0146');
```

Add this row to `INSERT INTO public.duplicados_pendientes`, before the `merge_other` row:

```sql
  ('pacientes', 'd0900000-0000-0000-0000-000000000008', 'd0900000-0000-0000-0000-000000000009', 'parcial', 'import'),
```

Replace the `pg_temp.assert_merge_rejected` helper with one that takes the exclusion list. Its default keeps every existing 6-argument call working:

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

In the first big `DO` block, right after the existing `hijos_movidos` assertion, add a check that a merge with no skips records none:

```sql
  IF (SELECT count(*) FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas')) <> 0 THEN
    RAISE EXCEPTION 'A merge that skipped nothing must record no discarded rows: %', v_audit.hijos_descartados;
  END IF;
```

In the collision block (`…006`/`…007`), right after its `hijos_movidos` assertion, add:

```sql
  IF (SELECT jsonb_agg(f->>'id') FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f)
       IS DISTINCT FROM '["d0900000-0000-0000-0000-000000000037"]'::jsonb
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f
       WHERE t->>'tabla' = 'paciente_contactos' AND f->>'paciente_id' = v_loser::text AND f->>'valor' = '555-0136') THEN
    RAISE EXCEPTION 'A collision-skipped row must be kept whole in the audit: %', v_audit.hijos_descartados;
  END IF;
```

Insert this block **between** the collision block's closing `END $$;` and the `RESET ROLE;` that comes before the grants block. Every existing merge call in the script stays 4-argument on purpose, because those calls prove the default (`'{}'`) behaves exactly as before.

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
  IF (SELECT jsonb_agg(f->>'id' ORDER BY f->>'id') FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f)
       IS DISTINCT FROM '["d0900000-0000-0000-0000-000000000042","d0900000-0000-0000-0000-000000000044","d0900000-0000-0000-0000-000000000045"]'::jsonb THEN
    RAISE EXCEPTION 'Every excluded row must be kept whole in the audit, once: %', v_audit.hijos_descartados;
  END IF;
END $$;
```

In the final grants block, change the `regprocedure` literal to `'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])'`.

- [ ] **Step 2: Run the check and confirm it fails.**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-fusionar.sql` (start the stack first with `pnpm supabase start` if needed).
Expected: FAIL on line 3, `function "public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])" does not exist`.

- [ ] **Step 3: Rewrite the migration.** Replace the full contents of `supabase/migrations/20261012120500_duplicados_motor_fusionar.sql` with:

```sql
-- The full rows a merge skipped (a collision with the winner, or the reviewer's exclusion): they
-- go away with the loser, so this is the only copy a revert can re-create them from.
ALTER TABLE public.duplicados_fusiones
  ADD COLUMN IF NOT EXISTS hijos_descartados jsonb NOT NULL DEFAULT '[]'::jsonb;

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
  v_skipped_rows jsonb;
  v_skipped jsonb := '[]'::jsonb;
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
    v_skipped_rows := '[]'::jsonb;
    -- One block (one savepoint) per row: a row colliding with the winner's own unique key is
    -- skipped, and cascades away with the loser below. Needs ON DELETE CASCADE on the child FK.
    FOR v_row IN EXECUTE format('SELECT to_jsonb(c) FROM public.%I c WHERE %I = $1 ORDER BY to_jsonb(c) FOR UPDATE',
        v_child->>'tabla', v_child->>'columna') USING p_perdedor_id LOOP
      -- An excluded row takes the collision's path: it never moves and cascades away the same way.
      IF v_row->>'id' = ANY(v_dropped_ids) THEN
        v_skipped_rows := v_skipped_rows || jsonb_build_array(v_row);
        CONTINUE;
      END IF;
      BEGIN
        EXECUTE format('UPDATE public.%I c SET %I = $1 FROM jsonb_populate_record(NULL::public.%I, $2) r WHERE %s
          RETURNING (SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(to_jsonb(c)) e WHERE e.key = ANY($3))',
          v_child->>'tabla', v_child->>'columna', v_child->>'tabla', v_key_match)
          INTO v_key USING p_ganador_id, v_row, v_primary_keys;
        IF v_key IS NOT NULL THEN
          v_moved_keys := v_moved_keys || jsonb_build_array(v_key);
        END IF;
      EXCEPTION WHEN unique_violation THEN
        -- Variables survive the savepoint rollback: the skipped row is still recorded.
        v_skipped_rows := v_skipped_rows || jsonb_build_array(v_row);
      END;
    END LOOP;
    v_moved := v_moved || jsonb_build_array(jsonb_build_object(
      'tabla', v_child->>'tabla', 'columna', v_child->>'columna', 'claves', v_moved_keys));
    v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
      'tabla', v_child->>'tabla', 'columna', v_child->>'columna', 'filas', v_skipped_rows));
  END LOOP;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table) USING p_perdedor_id;
  DELETE FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  DELETE FROM public.duplicados_descartes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  INSERT INTO public.duplicados_fusiones
    (entidad, ganador_id, perdedor_id, perdedor_snapshot, ganador_snapshot_previo, hijos_movidos, hijos_descartados, decidido_por)
    VALUES (p_entidad, p_ganador_id, p_perdedor_id, v_loser, v_winner, v_moved, v_skipped, public.usuario_actual_id());
END;
$$;

REVOKE ALL ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) TO authenticated;
```

Compared with the current file, only these parts change. Do not touch anything else.
- The leading `ALTER TABLE` and `DROP`.
- The fifth parameter.
- Five new `DECLARE` variables.
- `OR p_contactos_excluidos IS NULL`.
- The ownership block before the `UPDATE`.
- The exclusion `IF … CONTINUE` and the recording line in the `unique_violation` handler.
- The `v_skipped` accumulation.
- `hijos_descartados` in the audit `INSERT`.
- The `REVOKE`/`GRANT` signatures.

- [ ] **Step 4: Apply the migration locally and run every dedup check.**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/migrations/20261012120500_duplicados_motor_fusionar.sql
for f in supabase/checks/duplicados-motor-*.sql; do psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "$f" || break; done
```

Expected: each script prints its `PASS:` line. The revert check still passes here because it does not read `hijos_descartados` yet. That changes in Task 2.

- [ ] **Step 5: Queue.** `pending-commits add dedup-modal-t1-rpc-exclusions <msg> supabase/migrations/20261012120500_duplicados_motor_fusionar.sql supabase/checks/duplicados-motor-fusionar.sql`. Use the message `feat(db): let fusionar_duplicado drop chosen loser contacts and keep every skipped row`. In the body, cover the collision-path reuse, the foreign-id rejection, `hijos_descartados` for both skip reasons, and the overload `DROP`.

---

## Task 2: RPC — `revertir_fusion_duplicado` re-creates the skipped rows

**Files:**
- Modify: `supabase/migrations/20261012120600_duplicados_motor_revertir.sql`
- Modify: `supabase/checks/duplicados-motor-revertir.sql`

**Interfaces:**
- Consumes: `duplicados_fusiones.hijos_descartados` from Task 1.
- Produces: the same signature, `revertir_fusion_duplicado(p_fusion_id uuid)`. After a revert, every row listed in `hijos_descartados` exists again, whole and attached to the loser. If any of them collides with a current row, the revert refuses with P0001 and `cannot revert: a discarded <tabla> row conflicts with a current one`, and nothing is restored.

- [ ] **Step 0: Precondition.** Task 1's Step 0 covered `20261012120600` as well. If it was not run in this session, run it now.

- [ ] **Step 1: Write the failing check.** In `supabase/checks/duplicados-motor-revertir.sql`, insert the following between the big `DO` block's closing `END $$;` and the `RESET ROLE;` that comes before the grants block:

```sql
-- A merge that skipped two loser contacts — …041 collides with the winner's …040, …042 was
-- unchecked — must give both back on revert, whole, next to the one that moved (…043).
RESET ROLE;
INSERT INTO public.pacientes (id, mrn, nombre, apellido) VALUES
  ('d1000000-0000-0000-0000-000000000004', 'REVERT-D', 'Rev', 'D'),
  ('d1000000-0000-0000-0000-000000000005', 'REVERT-E', 'Rev', 'D');
INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor) VALUES
  ('d1000000-0000-0000-0000-000000000040', 'd1000000-0000-0000-0000-000000000004', 'telefono', '555-1040'),
  ('d1000000-0000-0000-0000-000000000041', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1040'),
  ('d1000000-0000-0000-0000-000000000042', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1042'),
  ('d1000000-0000-0000-0000-000000000043', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1043');
INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen) VALUES
  ('pacientes', 'd1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000005', 'exacta', 'alta_manual');
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_d uuid := 'd1000000-0000-0000-0000-000000000004';
  v_e uuid := 'd1000000-0000-0000-0000-000000000005';
  v_before jsonb;
  v_fusion uuid;
BEGIN
  SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) INTO v_before FROM public.paciente_contactos c WHERE paciente_id = v_e;
  PERFORM public.fusionar_duplicado('pacientes', v_d, v_e, '{}', ARRAY['d1000000-0000-0000-0000-000000000042']::uuid[]);
  SELECT id INTO STRICT v_fusion FROM public.duplicados_fusiones WHERE ganador_id = v_d AND perdedor_id = v_e;

  -- A current row holding a discarded row's key: the revert must refuse, not restore half.
  INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor)
    VALUES ('d1000000-0000-0000-0000-000000000042', v_d, 'telefono', '555-1099');
  PERFORM pg_temp.assert_revert_rejected(v_fusion, 'P0001', 'cannot revert: a discarded paciente_contactos row conflicts with a current one');
  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_e) THEN
    RAISE EXCEPTION 'A refused revert must leave the loser deleted';
  END IF;
  DELETE FROM public.paciente_contactos WHERE id = 'd1000000-0000-0000-0000-000000000042';

  PERFORM public.revertir_fusion_duplicado(v_fusion);
  IF (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.paciente_contactos c WHERE paciente_id = v_e) IS DISTINCT FROM v_before
     OR (SELECT array_agg(id) FROM public.paciente_contactos WHERE paciente_id = v_d)
        IS DISTINCT FROM ARRAY['d1000000-0000-0000-0000-000000000040']::uuid[] THEN
    RAISE EXCEPTION 'Revert must re-create every skipped contact whole and move the moved one back';
  END IF;
END $$;
```

- [ ] **Step 2: Run the check and confirm it fails.**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/checks/duplicados-motor-revertir.sql`
Expected: FAIL. `assert_revert_rejected` gets no error, because the current revert never touches `hijos_descartados`: `Expected P0001 / cannot revert: … got <NULL> / <NULL>`.

- [ ] **Step 3: Implement.** Make these edits in `supabase/migrations/20261012120600_duplicados_motor_revertir.sql` and change nothing else.
- Add `v_hijos_descartados jsonb;` and `v_fila jsonb;` to `DECLARE`.
- Add `hijos_descartados` to the opening `SELECT … INTO` column list, and `v_hijos_descartados` to its `INTO` list.
- After the "Move back only the exact child rows" loop and before the final `UPDATE public.duplicados_fusiones`, insert:

```sql
  -- Re-create the rows the merge skipped (a collision, or the reviewer's exclusion). They were
  -- deleted with the loser, which now exists again; a key already taken means the world moved on.
  FOR v_hijo IN SELECT * FROM jsonb_array_elements(v_hijos_descartados) LOOP
    FOR v_fila IN SELECT * FROM jsonb_array_elements(v_hijo->'filas') LOOP
      BEGIN
        EXECUTE format('INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I, $1)).*',
          v_hijo->>'tabla', v_hijo->>'tabla') USING v_fila;
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'cannot revert: a discarded % row conflicts with a current one', v_hijo->>'tabla';
      END;
    END LOOP;
  END LOOP;
```

The `RAISE` aborts the whole function, so the winner restore and the loser re-insert above it roll back too.

- [ ] **Step 4: Apply the migration locally and run every dedup check.**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/migrations/20261012120600_duplicados_motor_revertir.sql
for f in supabase/checks/duplicados-motor-*.sql; do psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "$f" || break; done
```

Expected: each script prints its `PASS:` line.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t2-revert-skipped-rows` and both files. Message: `feat(db): restore the child rows a merge skipped when reverting it`.

---

## Task 3: Shared state — excluded ids, merge values that know them, decisions keyed by pair

**Files:**
- Modify: `src/shared/dedup/data/fusionar/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (`CompareControls`, `construirValoresFinales`)
- Modify: `src/shared/dedup/index.ts` (barrel)
- Create: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/toggleExcluded/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/openedPair/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useAbrirPendiente/index.ts`, `types.ts`
- Create: `src/shared/dedup/DuplicatesTab/useDecidirPendiente/constants.ts`
- Create: `src/shared/dedup/DuplicatesTab/useDecidirPendiente/pairKey/index.ts`, `index.test.ts`, `constants.ts`
- Create: `src/shared/dedup/DuplicatesTab/useDecidirPendiente/decisionFor/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useDecidirPendiente/index.ts`, `types.ts`, `valoresFinales.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/decidirArgsFixture/index.ts`

**Interfaces:**
- Consumes: Task 1's `p_contactos_excluidos`.
- Produces:
  - `CompareControls = { choices: Record<string, string>; onChoose: (field: string, value: string) => void; excludedIds: string[]; onToggleExcluded: (ids: string[]) => void }`, exported as a type from `@/shared/dedup`.
  - `Props<T>.construirValoresFinales: (a: T, b: T, elecciones: Record<string, string>, excludedIds: string[]) => Record<string, unknown>`. A 3-parameter implementation, like today's Medical one, still type-checks.
  - `useAbrirPendiente` now also returns `excludedIds`, `onToggleExcluded(ids)` and `controls: CompareControls`.
  - `fusionar({ entidad, ganadorId, perdedorId, valoresFinales, excludedIds })`.
  - `EstadoDecidir` gains `pair: string | null`. `useDecidirPendiente` only reports the flags of the pair that is open now. A result that lands after its pair closed is dropped: it shows no error and calls no `alDecidir`.
  - `pairKey(abierto: Pendiente | null): string | null` and `decisionFor(estado: EstadoDecidir, pair: string | null): EstadoDecidir`.

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
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import openedPair from '.'

// The bug this guards against: ids unchecked on one pair would ride along to the next pair's
// merge, which the RPC rejects as foreign — the second pair could never be merged.
describe('openedPair', () => {
  it('opens a pair with no choices and nothing excluded', () => {
    const state = openedPair(pendienteFixture(), { id: 'a' }, { id: 'b' })
    expect(state.elecciones).toEqual({})
    expect(state.excludedIds).toEqual([])
    expect(state.error).toBe(false)
    expect(state.parCargado?.a).toEqual({ id: 'a' })
  })
})
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/pairKey/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import pairKey from '.'

describe('pairKey', () => {
  it('names no pair when none is open', () => {
    expect(pairKey(null)).toBeNull()
  })

  it('tells two different pairs apart', () => {
    const other = pendienteFixture({ item_id_a: 'c', item_id_b: 'd' })
    expect(pairKey(pendienteFixture())).not.toBe(pairKey(other))
  })
})
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/decisionFor/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import decisionFor from '.'

// The bug this guards against: one failed merge left "Could not merge" on every pair opened
// after it, before the reviewer had done anything there.
describe('decisionFor', () => {
  const failedOnFirst = { pair: 'first', ocupado: false, errorDescarte: false, errorFusion: true }

  it('shows a pair its own failure', () => {
    expect(decisionFor(failedOnFirst, 'first').errorFusion).toBe(true)
  })

  it('shows another pair as idle', () => {
    const visible = decisionFor(failedOnFirst, 'second')
    expect(visible.errorFusion).toBe(false)
    expect(visible.ocupado).toBe(false)
    expect(visible.pair).toBe('second')
  })
})
```

In `src/shared/dedup/data/fusionar/index.test.ts`, add `excludedIds: ['c1']` to `args` and `p_contactos_excluidos: ['c1']` to `esperado`.

In `src/shared/dedup/DuplicatesTab/useDecidirPendiente/valoresFinales.test.ts`, make the existing assertion `expect(construirValoresFinales).toHaveBeenCalledWith(args.itemA, args.itemB, elecciones, [])`, add `excludedIds: []` to the expected `fusionar` call object, and add:

```ts
  // The adapter needs the unchecked ids too: without them a blank winner column gets filled
  // with the very value the reviewer just dropped.
  it('hands the unchecked ids to construirValoresFinales and to the RPC', async () => {
    const construirValoresFinales = vi.fn(() => ({}))
    const args = decidirArgsFixture({ excludedIds: ['c1', 'c2'], construirValoresFinales })
    const { fusionarPendiente } = capturarHook(() => useDecidirPendiente(args))
    await fusionarPendiente()
    expect(construirValoresFinales).toHaveBeenCalledWith(args.itemA, args.itemB, {}, ['c1', 'c2'])
    expect(mocks.fusionar).toHaveBeenCalledWith(expect.objectContaining({ excludedIds: ['c1', 'c2'] }))
  })
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup`
Expected: FAIL. The new modules cannot be resolved, `fusionar` lacks `p_contactos_excluidos`, and the fixture override has a type error.

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

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/types.ts`: add `/** Loser child-row ids the reviewer unchecked on this pair. */ excludedIds: string[]` to `EstadoAbierto<T>`.

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/openedPair/index.ts`:

```ts
import type { Pendiente } from '@/shared/dedup/types'
import type { EstadoAbierto } from '../types'

/** A freshly loaded pair: nothing chosen and nothing excluded yet, whatever the last pair had. */
export default function openedPair<T>(pendiente: Pendiente, a: T, b: T): EstadoAbierto<T> {
  const state: EstadoAbierto<T> = { parCargado: { pendiente, a, b }, elecciones: {}, excludedIds: [], error: false }
  return state
}
```

`src/shared/dedup/DuplicatesTab/types.ts`: make two changes.
- Change `construirValoresFinales` to `(a: T, b: T, elecciones: Record<string, string>, excludedIds: string[]) => Record<string, unknown>`, and extend its doc with "and the loser child rows the reviewer unchecked, so a value they dropped is never written back through a scalar column".
- Add below `Props<T>`:

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

`src/shared/dedup/DuplicatesTab/useAbrirPendiente/index.ts`: make these changes.
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

Then add `excludedIds`, `onToggleExcluded` and `controls` to `resultado`. The imports are `import type { CompareControls } from '../types'`, `import openedPair from './openedPair'` and `import toggleExcluded from './toggleExcluded'`. Add a line to the closing comment saying the excluded ids reset with every open, as the choices do.

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/pairKey/constants.ts`:

```ts
/** Joins a pair's two ids into the key its decision state is filed under. */
export const PAIR_KEY_SEPARATOR = '|'
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/pairKey/index.ts`:

```ts
import type { Pendiente } from '@/shared/dedup/types'
import { PAIR_KEY_SEPARATOR } from './constants'

/** One string per open pair, or `null` with none open: what the decision flags are filed under. */
export default function pairKey(abierto: Pendiente | null): string | null {
  const key = abierto ? [abierto.item_id_a, abierto.item_id_b].join(PAIR_KEY_SEPARATOR) : null
  return key
}
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/types.ts`: add `excludedIds: string[]` to `Args<T>`. In `EstadoDecidir`, add `/** Which open pair these flags belong to. */ pair: string | null`.

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/constants.ts`:

```ts
import type { EstadoDecidir } from './types'

/** Nothing in flight and nothing failed. */
export const IDLE: Omit<EstadoDecidir, 'pair'> = { ocupado: false, errorDescarte: false, errorFusion: false }
/** What a failed discard leaves on its pair. */
export const FAILED_DISCARD: Partial<EstadoDecidir> = { errorDescarte: true }
/** What a failed merge leaves on its pair. */
export const FAILED_MERGE: Partial<EstadoDecidir> = { errorFusion: true }
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/decisionFor/index.ts`:

```ts
import { IDLE } from '../constants'
import type { EstadoDecidir } from '../types'

/** The decision flags as the open pair should see them: flags filed under another pair read as idle. */
export default function decisionFor(estado: EstadoDecidir, pair: string | null): EstadoDecidir {
  const visible: EstadoDecidir = estado.pair === pair ? estado : { ...IDLE, pair }
  return visible
}
```

`src/shared/dedup/DuplicatesTab/useDecidirPendiente/index.ts`:

```ts
'use client'
import { useRef, useState } from 'react'
import descartar from '@/shared/dedup/data/descartar'
import fusionar from '@/shared/dedup/data/fusionar'
import { FAILED_DISCARD, FAILED_MERGE, IDLE } from './constants'
import decisionFor from './decisionFor'
import pairKey from './pairKey'
import type { Args, EstadoDecidir } from './types'

/** The two ways an open pair stops being pending: discarded with a motive, or merged. */
export default function useDecidirPendiente<T>(args: Args<T>) {
  const { entidad, abierto } = args
  const { itemA, itemB, elecciones, excludedIds } = args
  const { construirValoresFinales, alDecidir } = args
  const pair = pairKey(abierto)
  const [estado, setEstado] = useState<EstadoDecidir>({ ...IDLE, pair })
  const openPair = useRef(pair)
  openPair.current = pair

  // A result that lands after its pair closed belongs to nobody: it neither shows nor closes.
  const settle = (mine: string | null, failure: Partial<EstadoDecidir> | null) => {
    if (openPair.current !== mine) return
    setEstado({ ...IDLE, ...failure, pair: mine })
    if (!failure) alDecidir()
  }
  const descartarPendiente = async (motivo: string, nota: string | null) => {
    if (!abierto) return
    setEstado({ ...IDLE, ocupado: true, pair })
    const discardArgs = { entidad, itemIdA: abierto.item_id_a, itemIdB: abierto.item_id_b, motivo, nota }
    const { error: fallo } = await descartar(discardArgs)
    settle(pair, fallo ? FAILED_DISCARD : null)
  }
  const fusionarPendiente = async () => {
    // Nothing to merge until both sides are loaded: the values are built from the two rows.
    if (!abierto || itemA === null || itemB === null) return
    setEstado({ ...IDLE, ocupado: true, pair })
    const valoresFinales = construirValoresFinales(itemA, itemB, elecciones, excludedIds)
    const mergeArgs = { entidad, ganadorId: abierto.item_id_a, perdedorId: abierto.item_id_b, valoresFinales, excludedIds }
    const { error: fallo } = await fusionar(mergeArgs)
    settle(pair, fallo ? FAILED_MERGE : null)
  }
  const resultado = { ...decisionFor(estado, pair), descartarPendiente, fusionarPendiente }
  return resultado
}

// Owns the "resolve this pair" half of the tab. Its flags are filed under the pair they belong
// to, so opening another pair always starts idle; `useAbrirPendiente` owns what is open.
```

`src/shared/dedup/data/fusionar/index.ts`: add `/** Loser child-row ids the reviewer chose not to keep; `[]` keeps every one. */ excludedIds: string[]` to `Args`, destructure it, add `p_contactos_excluidos: excludedIds` to `rpcArgs`, and mention the exclusion list in the closing comment.

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
Expected: PASS. `useDuplicatesTab` spreads `...pair` into `resolveArgs`, which is how `excludedIds` reaches `useDecidirPendiente`. The existing hook tests still pass, because under `capturarHook` the ref still names the same pair when the mocked RPC resolves.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t3-shared-state` and every file above. Message: `feat(dedup): carry unchecked ids to the merge and key decision state by pair`.

---

## Task 4: Shared UI — `CompareField` decides left/right vs. checkboxes by shape

**Files:**
- Create: `src/shared/dedup/CompareField/types.ts`
- Create: `src/shared/dedup/CompareField/isMultiValue/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/CompareField/mergeMultiValueRows/index.ts`, `index.test.ts`
- Create: `src/shared/dedup/CompareField/MultiValueCompare/index.tsx`, `index.module.css`, `index.test.tsx`
- Create: `src/shared/dedup/CompareField/index.tsx`, `index.test.tsx`
- Modify: `src/shared/dedup/index.ts` (export `CompareField`)
- Modify: `src/shared/constants/dom/index.ts` (`CHECKBOX`)
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`dedup.keptOnWinner`)

**Interfaces:**
- Consumes: `CompareControls` (Task 3) and `FieldCompare` (unchanged: `{ labelKey, values: string[], diff, onChooseValue?, selectedValue? }`).
- Produces:
  - `<CompareField<E extends { id: string }> … />`. It takes either scalar props, `{ labelKey: I18nKey; controls: CompareControls; field: string; values: [string, string] }`, or multivalued props, `{ labelKey; controls; values: [E[], E[]]; textOf: (item: E) => string }`.
  - `values[0]` is always the **winner** (`item_id_a`).
  - The types `MultiValueItem`, `MultiValueRow = { text: string; keptIds: string[]; removableIds: string[] }`, `ScalarFieldProps` and `MultiFieldProps<E>`.
  - `CHECKBOX` in `@/shared/constants/dom`.

- [ ] **Step 1: Write the failing tests.** Every test uses a non-Medical element shape, `{ id, label }`, which is the proof that the engine assumes nothing about Medical. Each test file declares at most one named type.

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
Expected: FAIL, because the modules and `CHECKBOX` cannot be resolved.

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

i18n: add the key after `"dedup.noFieldDiffs"`, and fix the comma on the line before it.
- `en.json`: `"dedup.keptOnWinner": "Already on the record that stays"`
- `es.json`: `"dedup.keptOnWinner": "Ya incluido en ficha conservada"`

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test && grep -rn "@/features" src/shared/dedup`
Expected: typecheck and tests pass, and the `grep` prints nothing.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t4-comparefield` and every file above. Message: `feat(dedup): resolve multivalued fields with checkboxes, detected by shape`.

---

## Task 5: The dialog — `PairDetail` in `Modal`, guarded close, a labelled winner

**Files:**
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (`renderComparacion` signature)
- Create: `src/shared/dedup/DuplicatesTab/PairDetail/constants.ts`
- Create: `src/shared/dedup/DuplicatesTab/PairDetail/closeIntent/index.ts`, `index.test.ts`
- Modify: `src/shared/dedup/DuplicatesTab/PairDetail/index.tsx`, `types.ts`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

**Interfaces:**
- Consumes:
  - `CompareControls` and `useAbrirPendiente().controls` (Task 3), and `CompareField` (Task 4).
  - `Modal` from `@/shared/components/ui`, unchanged: `{ title?, footer?, anchoRem?, role?, onClose, children }`. It already handles `role="dialog"`, `aria-modal`, focus in, Tab trapping, Escape → `onClose`, and returning focus.
  - `Button`, whose existing `deshabilitado` prop disables it.
- Produces:
  - `Props<T>.renderComparacion: (a: T, b: T, controls: CompareControls) => ReactNode`.
  - `PairDetail` takes `controls` instead of `onElegir`.
  - `closeIntent(ocupado: boolean, dirty: boolean): CloseIntent`.
  - Medical's `comparePacientes(a: Paciente, b: Paciente, controls, t)`. Task 7 changes its first two parameters.

- [ ] **Step 1: Write the failing tests.**

`src/shared/dedup/DuplicatesTab/PairDetail/closeIntent/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CLOSE_CONFIRM, CLOSE_IGNORED, CLOSE_NOW } from '../constants'
import closeIntent from '.'

// The bug this guards against: closing mid-merge and opening another pair let pair 1's late
// answer close or mark pair 2; a stray backdrop click silently threw every pick away.
describe('closeIntent', () => {
  it('ignores a close while a decision is in flight', () => {
    expect(closeIntent(true, false)).toBe(CLOSE_IGNORED)
    expect(closeIntent(true, true)).toBe(CLOSE_IGNORED)
  })

  it('asks first when picks or unchecked values would be lost', () => {
    expect(closeIntent(false, true)).toBe(CLOSE_CONFIRM)
  })

  it('closes at once when nothing would be lost', () => {
    expect(closeIntent(false, false)).toBe(CLOSE_NOW)
  })
})
```

Replace `src/shared/dedup/DuplicatesTab/PairDetail/index.test.tsx` with the following. Its one named type is `Seen`, and the items' type is inferred.

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PairDetail from '.'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key, intlLocale: 'en-US' }) }))

// What PairDetail hands the shared Modal, which owns role, focus trap, Escape and focus return
// (tested in `Modal/useDialog`). The mock keeps the props and swallows the markup.
type Seen = { title?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode }
const seen = vi.hoisted(() => {
  const calls: Seen[] = []
  return calls
})
vi.mock('@/shared/components/ui/Modal', () => ({ default: (props: Seen) => { seen.push(props); return null } }))

const onCancelar = vi.fn()
const NO_CHOICES: Record<string, string> = {}

const open = ({ ocupado = false, errorDescarte = false, errorFusion = false, choices = NO_CHOICES } = {}) => {
  seen.length = 0
  const controls = { choices, onChoose: vi.fn(), excludedIds: [], onToggleExcluded: vi.fn() }
  renderToStaticMarkup(
    <PairDetail itemA={{ name: 'Ana Winner' }} itemB={{ name: 'Bea Loser' }} ocupado={ocupado}
      errorDescarte={errorDescarte} errorFusion={errorFusion}
      renderResumen={item => item.name} renderComparacion={() => 'the-grid'} controls={controls}
      onCancelar={onCancelar} onNotSame={vi.fn()} onKeepSeparate={vi.fn()} onFusionar={vi.fn()} />,
  )
  return seen[0]
}
const markup = (node: ReactNode) => renderToStaticMarkup(<>{node}</>)

describe('PairDetail', () => {
  beforeEach(() => onCancelar.mockReset())

  it('opens as a titled dialog that closes on ✕, Escape or backdrop when nothing is at stake', () => {
    const dialog = open()
    expect(dialog.title).toBe('dedup.pairTitle')
    dialog.onClose()
    expect(onCancelar).toHaveBeenCalledOnce()
  })

  it('does not close while a decision is in flight', () => {
    open({ ocupado: true }).onClose()
    expect(onCancelar).not.toHaveBeenCalled()
  })

  it('does not drop picks on a stray close: it asks first', () => {
    open({ choices: { seguro: 'Cigna' } }).onClose()
    expect(onCancelar).not.toHaveBeenCalled()
  })

  // The walkthrough bug: the decisions sat below the whole list. The fixed footer never scrolls.
  it('keeps all four decisions in the fixed footer, all disabled mid-decision', () => {
    expect(markup(open().footer).split('<button').length - 1).toBe(4)
    expect(markup(open({ ocupado: true }).footer).split('disabled=""').length - 1).toBe(4)
  })

  it('says which record stays and which is merged in, in that order', () => {
    const body = markup(open().children)
    const order = ['dedup.winnerLabel', 'Ana Winner', 'dedup.loserLabel', 'Bea Loser', 'the-grid']
    const positions = order.map(needle => body.indexOf(needle))
    expect(positions.every(p => p >= 0)).toBe(true)
    expect([...positions].sort((left, right) => left - right)).toEqual(positions)
  })

  it('shows each failure with its own copy', () => {
    expect(markup(open().children)).not.toContain('dedup.mergeFailed')
    expect(markup(open({ errorFusion: true }).children)).toContain('dedup.mergeFailed')
    const discard = markup(open({ errorDescarte: true }).children)
    expect(discard).toContain('dedup.discardFailed')
    expect(discard).not.toContain('dedup.mergeFailed')
  })
})
```

In `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.test.tsx`, replace `noop` with `const controls: CompareControls = { choices: {}, onChoose: () => {}, excludedIds: [], onToggleExcluded: () => {} }` (`import type { CompareControls } from '@/shared/dedup'`), and pass `controls` wherever `noop` was passed.

In `src/shared/dedup/DuplicatesTab/index.test.tsx`, add `excludedIds: []`, `onToggleExcluded: () => {}` and `controls: { choices: {}, onChoose: () => {}, excludedIds: [], onToggleExcluded: () => {} }` to `parStub`'s object.

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/shared/dedup/DuplicatesTab/PairDetail src/features/medical/components/MedicalDuplicatesTab`
Expected: FAIL. `closeIntent`/`constants` are missing, `seen[0]` is `undefined`, and `controls` has a type error.

- [ ] **Step 3: Implement.**

`src/shared/dedup/DuplicatesTab/types.ts`: change `renderComparacion` to `(a: T, b: T, controls: CompareControls) => ReactNode`, documented as `/** The caller's grid for the open pair; `controls` carries every pick and uncheck back. */`.

`src/shared/dedup/DuplicatesTab/PairDetail/constants.ts`:

```ts
/** A close request while a decision is in flight: nothing happens. */
export const CLOSE_IGNORED = 'close-ignored'
/** A close request that would throw away picks: ask first. */
export const CLOSE_CONFIRM = 'close-confirm'
/** A close request with nothing at stake: close. */
export const CLOSE_NOW = 'close-now'
/** The "keep separate" note dialog. */
export const NOTE_DIALOG = 'note-dialog'
/** The "discard your choices?" dialog. */
export const DISCARD_DIALOG = 'discard-dialog'
```

`src/shared/dedup/DuplicatesTab/PairDetail/types.ts`:

```ts
import type { CompareControls, Props as TabProps } from '../types'
import type { CLOSE_CONFIRM, CLOSE_IGNORED, CLOSE_NOW, DISCARD_DIALOG, NOTE_DIALOG } from './constants'

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

/** What a close request turns into. */
export type CloseIntent = typeof CLOSE_IGNORED | typeof CLOSE_CONFIRM | typeof CLOSE_NOW

/** Which secondary dialog sits on top of the pair, if any. */
export type OpenDialog = typeof NOTE_DIALOG | typeof DISCARD_DIALOG | null
```

`src/shared/dedup/DuplicatesTab/PairDetail/closeIntent/index.ts`:

```ts
import { CLOSE_CONFIRM, CLOSE_IGNORED, CLOSE_NOW } from '../constants'
import type { CloseIntent } from '../types'

/** What a close request (✕, Escape, backdrop, Cancel) does: nothing mid-decision, a question when
 *  picks or unchecked values would be lost, otherwise close. */
export default function closeIntent(ocupado: boolean, dirty: boolean): CloseIntent {
  if (ocupado) return CLOSE_IGNORED
  const intent: CloseIntent = dirty ? CLOSE_CONFIRM : CLOSE_NOW
  return intent
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
import closeIntent from './closeIntent'
import { CLOSE_CONFIRM, CLOSE_NOW, DISCARD_DIALOG, NOTE_DIALOG } from './constants'
import type { OpenDialog, Props } from './types'

/** Wide enough for two values side by side; `Modal` caps it at 95vw on a phone. */
const WIDTH_REM = 48

/** The open pair as a dialog: the labelled summaries, any failure and the caller's grid scroll in
 *  the body; the four decisions stay in the fixed footer, always in view. */
export default function PairDetail<T>(props: Props<T>) {
  const { itemA, itemB, ocupado, errorDescarte, errorFusion, renderResumen, renderComparacion } = props
  const { controls, onCancelar, onNotSame, onKeepSeparate, onFusionar } = props
  const { t } = useT()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const dirty = Object.keys(controls.choices).length > 0 || controls.excludedIds.length > 0

  const requestClose = () => {
    const intent = closeIntent(ocupado, dirty)
    if (intent === CLOSE_NOW) onCancelar()
    if (intent === CLOSE_CONFIRM) setDialog(DISCARD_DIALOG)
  }
  const confirmNote = (texto?: string) => {
    setDialog(null)
    if (texto) onKeepSeparate(texto)
  }
  const confirmDiscard = () => {
    setDialog(null)
    onCancelar()
  }

  const actions = (
    <>
      <Button kind="cancel" onClick={requestClose} deshabilitado={ocupado} />
      <Button kind="notSame" onClick={onNotSame} ocupado={ocupado} />
      <Button kind="keepSeparate" onClick={() => setDialog(NOTE_DIALOG)} ocupado={ocupado} />
      <Button kind="confirm" label={t('dedup.merge')} onClick={onFusionar} ocupado={ocupado} />
    </>
  )

  return (
    <>
      <Modal title={t('dedup.pairTitle')} anchoRem={WIDTH_REM} onClose={requestClose} footer={actions}>
        <ColorBadge color="var(--c-t3)">{t('dedup.winnerLabel')} · {renderResumen(itemA)}</ColorBadge>
        {' ⇄ '}
        <ColorBadge color="var(--c-t3)">{t('dedup.loserLabel')} · {renderResumen(itemB)}</ColorBadge>
        {errorDescarte && <WarningCallout message={t('dedup.discardFailed')} />}
        {errorFusion && <WarningCallout message={t('dedup.mergeFailed')} />}
        {renderComparacion(itemA, itemB, controls)}
      </Modal>
      {dialog === NOTE_DIALOG && (
        <ConfirmModal title={t('dedup.sameSeparated')} message={t('dedup.sameSeparatedMessage')}
          confirmLabel={t('dedup.sameSeparated')} notaLabel={t('dedup.separatedNotePrompt')}
          onConfirm={confirmNote} onClose={() => setDialog(null)} />
      )}
      {dialog === DISCARD_DIALOG && (
        <ConfirmModal title={t('dedup.discardChoicesTitle')} message={t('dedup.discardChoicesMessage')}
          confirmLabel={t('dedup.discardChoicesConfirm')} onConfirm={confirmDiscard} onClose={() => setDialog(null)} />
      )}
    </>
  )
}

// Composes `Modal` with `ColorBadge`/`Button`/`ConfirmModal`/`WarningCallout`: no markup of its own.
// Secondary dialogs are siblings, not children, so the pair dialog's box never clips them.
```

The warnings sit above the grid on purpose: a long grid scrolls, and a failure has to be seen without scrolling. If Centinela's repeated-block check objects to the two `ConfirmModal` calls, extract a small `PairDialogs` component into the same folder, rather than signing an exemption. This file is around 70 lines, within the 150-line ceiling.

`src/shared/dedup/DuplicatesTab/index.tsx`: in the `<PairDetail … />` call, replace `onElegir={par.onElegir}` with `controls={par.controls}`.

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

i18n, added after `dedup.keptOnWinner`:

| Key | `en.json` | `es.json` |
|---|---|---|
| `dedup.pairTitle` | `Review possible duplicate` | `Revisar posible duplicado` |
| `dedup.winnerLabel` | `Stays` | `Se conserva` |
| `dedup.loserLabel` | `Merged in, then removed` | `Se elimina tras fusionar` |
| `dedup.discardChoicesTitle` | `Discard your choices?` | `¿Descartar lo elegido?` |
| `dedup.discardChoicesMessage` | `Every pick and unchecked value on this pair is lost.` | `Se pierde todo lo elegido en este par.` |
| `dedup.discardChoicesConfirm` | `Discard` | `Descartar` |

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t5-pair-dialog` and every file above. Message: `feat(dedup): open the pair in a guarded dialog that names the surviving record`.

---

## Task 6: Names in the pending list — never blocking, partial-failure tolerant, race-safe

**Files:**
- Create: `src/shared/dedup/DuplicatesTab/useListaDuplicados/loadNames/index.ts`, `index.test.ts`, `types.ts`
- Modify: `src/shared/dedup/DuplicatesTab/useListaDuplicados/index.ts`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/types.ts` (`loadSummaries`)
- Modify: `src/shared/dedup/DuplicatesTab/useDuplicatesTab/index.ts`
- Modify: `src/shared/dedup/DuplicatesTab/ParDuplicado/index.tsx`, `index.test.tsx`
- Modify: `src/shared/dedup/DuplicatesTab/index.tsx`, `index.test.tsx`
- Modify: `src/shared/data/columns/index.ts` (`pacientes`)
- Create: `src/features/medical/data/patientNames/index.ts`, `index.test.ts`, `constants.ts`, `types.ts`
- Create: `src/features/medical/data/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/summarizePaciente/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/loadSummaries/index.ts`, `index.test.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json`

**Interfaces:**
- Consumes: `listPendientes`, `ordenarPendientes`, `TABLES.pacientes` and `SHARED_COLUMNS.identified`.
- Produces:
  - `LoadSummaries = (ids: string[]) => Promise<Record<string, string>>`, and `Props<T>.loadSummaries: LoadSummaries` (required).
  - `loadNames(pendientes: Pendiente[], loadSummaries: LoadSummaries): Promise<Record<string, string>>`. It never rejects.
  - `useListaDuplicados(entidad, loadSummaries)` also returns `summaries` and `namesLoading`. `recargar` resolves once the pairs are set, without waiting for names. Only the newest reload writes.
  - `ParDuplicado` takes `names: [string, string]`.
  - `TABLE_COLUMNS.pacientes.id`.
  - Medical: `patientNames(ids)`, which returns every batch that loaded and rejects only when all batches failed. Also `summarizePaciente({ nombre, apellido })`, `loadSummaries(ids)`, and the barrel `@/features/medical/data` exporting `getPaciente` and `patientNames`.

- [ ] **Step 1: Write the failing tests.**

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadNames/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'
import loadNames from '.'

const pairs = [pendienteFixture(), pendienteFixture({ item_id_a: 'a', item_id_b: 'c' })]

describe('loadNames', () => {
  it('asks for every distinct id once', async () => {
    const loadSummaries = vi.fn(async () => ({ a: 'Ana' }))
    expect(await loadNames(pairs, loadSummaries)).toEqual({ a: 'Ana' })
    expect([...loadSummaries.mock.calls[0][0]].sort()).toEqual(['a', 'b', 'c'])
  })

  // A failed name read is never a failed queue.
  it('resolves with no names when the read fails', async () => {
    expect(await loadNames(pairs, async () => { throw new Error('network') })).toEqual({})
  })

  it('does not ask when nothing is pending', async () => {
    const loadSummaries = vi.fn()
    await loadNames([], loadSummaries)
    expect(loadSummaries).not.toHaveBeenCalled()
  })
})
```

`src/shared/dedup/DuplicatesTab/useListaDuplicados/index.test.tsx`: change every `useListaDuplicados('pacientes')` into `useListaDuplicados('pacientes', async () => ({}))`, then add:

```tsx
  // Names never hold the queue back: a hung name read must not hang the reload or the scan.
  it('finishes reloading and scanning while names are still loading', async () => {
    mocks.listPendientes.mockResolvedValue({ data: [pendienteFixture()], error: null })
    const hung = () => new Promise<Record<string, string>>(() => {})
    const { recargar, escanearPendientes } = capturarHook(() => useListaDuplicados('pacientes', hung))
    await expect(recargar()).resolves.toBeUndefined()
    await expect(escanearPendientes()).resolves.toBeUndefined()
  })

  // The bug this guards against: an older reload answering late put back a stale queue.
  it('drops a reload that answers after a newer one', async () => {
    let releaseFirst = (_: unknown) => {}
    mocks.listPendientes
      .mockReturnValueOnce(new Promise(resolve => { releaseFirst = resolve }))
      .mockResolvedValueOnce({ data: [pendienteFixture({ item_id_a: 'c', item_id_b: 'd' })], error: null })
    const loadSummaries = vi.fn(async () => ({}))
    const { recargar } = capturarHook(() => useListaDuplicados('pacientes', loadSummaries))
    const first = recargar()
    await recargar()
    releaseFirst({ data: [pendienteFixture()], error: null })
    await first
    expect(loadSummaries).toHaveBeenCalledOnce()
    expect(loadSummaries).toHaveBeenCalledWith(['c', 'd'])
  })
```

(Add `import pendienteFixture from '@/shared/dedup/DuplicatesTab/pendienteFixture'`.)

`src/shared/dedup/DuplicatesTab/ParDuplicado/index.test.tsx`: pass `names={['Ana Lopez', 'Ana P. Lopez']}` in both existing renders, and add:

```tsx
  it('names both records, on screen and in the row’s accessible name', () => {
    const html = renderToStaticMarkup(<ParDuplicado par={pendienteFixture()} names={['Ana Lopez', 'Ana P. Lopez']} onAbrir={vi.fn()} />)
    expect(html).toContain('Ana P. Lopez')
    expect(html).toContain('dedup.openPairAria')
  })
```

`src/shared/dedup/DuplicatesTab/index.test.tsx`: put `pendientes`, `summaries` and `namesLoading` into the hoisted state. Annotate the locals, do not cast them, and add no new named type:

```tsx
const fallas = vi.hoisted(() => {
  const pendientes: Pendiente[] = []
  const summaries: Record<string, string> = {}
  return { lista: false, par: false, pendientes, summaries, namesLoading: false }
})
```

`listaStub` returns `pendientes: fallas.pendientes`, `summaries: fallas.summaries` and `namesLoading: fallas.namesLoading`. `beforeEach` resets all three. `renderTab` passes `loadSummaries={async () => ({})}`. The imports are `import type { Pendiente } from '@/shared/dedup/types'` and `import pendienteFixture from './pendienteFixture'`. Then add:

```tsx
  it('names each pending pair, says when a name is still loading, and when it could not load', () => {
    fallas.pendientes = [pendienteFixture()]
    fallas.summaries = { a: 'Ana Lopez' }
    fallas.namesLoading = true
    expect(renderTab()).toContain('dedup.nameLoading')
    fallas.namesLoading = false
    const html = renderTab()
    expect(html).toContain('Ana Lopez')
    expect(html).toContain('dedup.nameUnavailable')
  })
```

`src/features/medical/data/patientNames/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import patientNames from '.'

const mocks = vi.hoisted(() => {
  const batches: string[][] = []
  const answers: unknown[] = []
  return { batches, answers }
})
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: (_column: string, batch: string[]) => {
          mocks.batches.push(batch)
          return { overrideTypes: async () => mocks.answers.shift() }
        },
      }),
    }),
  },
}))

const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`)
const loaded = (id: string) => ({ data: [{ id, nombre: 'Ana', apellido: 'Lopez' }], error: null })
const failed = { data: null, error: new Error('denied') }

describe('patientNames', () => {
  beforeEach(() => {
    mocks.batches.length = 0
    mocks.answers.length = 0
  })

  // A long pending list must not build one request URL past what the API gateway accepts.
  it('reads the ids in batches of at most 100', async () => {
    mocks.answers.push(loaded('id-0'), loaded('id-100'))
    await patientNames(ids)
    expect(mocks.batches.map(batch => batch.length)).toEqual([100, 50])
  })

  // One failed batch must not throw away the names another batch did load.
  it('keeps the batches that loaded when another one fails', async () => {
    mocks.answers.push(loaded('id-0'), failed)
    expect((await patientNames(ids)).map(({ id }) => id)).toEqual(['id-0'])
  })

  it('rejects only when every batch failed', async () => {
    mocks.answers.push(failed, failed)
    await expect(patientNames(ids)).rejects.toThrow('denied')
  })
})
```

`src/features/medical/data/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))

import { getPaciente, patientNames } from '.'

describe('medical data barrel', () => {
  it('offers the reads the duplicate review uses', () => {
    expect(typeof getPaciente).toBe('function')
    expect(typeof patientNames).toBe('function')
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

vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))
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

Run: `pnpm vitest run src/shared/dedup src/features/medical/data src/features/medical/components/MedicalDuplicatesTab`
Expected: FAIL. The modules are missing, `ParDuplicado` has no `names`, and the hook's second argument has a type error.

- [ ] **Step 3: Implement.**

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadNames/types.ts`:

```ts
/** One batched read of display names for the given ids: id → summary. */
export type LoadSummaries = (ids: string[]) => Promise<Record<string, string>>
```

`src/shared/dedup/DuplicatesTab/useListaDuplicados/loadNames/index.ts`:

```ts
import type { Pendiente } from '@/shared/dedup/types'
import type { LoadSummaries } from './types'

const NO_SUMMARIES: Record<string, string> = {}

/** Every distinct id's summary for the queue. Never rejects: a failed name read is never a
 *  failed queue, and an id the loader did not return simply stays unnamed. */
export default async function loadNames(pendientes: Pendiente[], loadSummaries: LoadSummaries): Promise<Record<string, string>> {
  const ids = [...new Set(pendientes.flatMap(({ item_id_a, item_id_b }) => [item_id_a, item_id_b]))]
  if (ids.length === 0) return NO_SUMMARIES
  const names = await loadSummaries(ids).catch(() => NO_SUMMARIES)
  return names
}
```

`src/shared/dedup/DuplicatesTab/useListaDuplicados/index.ts`:

```ts
'use client'
import { useEffect, useRef, useState } from 'react'
import listPendientes from '@/shared/dedup/data/listPendientes'
import escanear from '@/shared/dedup/data/escanear'
import ordenarPendientes from '@/shared/dedup/ordenarPendientes'
import type { Pendiente } from '@/shared/dedup/types'
import loadNames from './loadNames'
import type { LoadSummaries } from './loadNames/types'

type EstadoLista = {
  pendientes: Pendiente[]
  summaries: Record<string, string>
  namesLoading: boolean
  ocupado: boolean
  error: boolean
}

const INICIAL: EstadoLista = { pendientes: [], summaries: {}, namesLoading: false, ocupado: false, error: false }

/** The pending-pair queue for one entity, its display names, and the scan that refills it. */
export default function useListaDuplicados(entidad: string, loadSummaries: LoadSummaries) {
  const [estado, setEstado] = useState<EstadoLista>(INICIAL)
  const { pendientes, summaries, namesLoading, ocupado, error } = estado
  const request = useRef(0)

  // Only the newest reload writes: an older one answering late would put back a stale queue.
  const recargar = async () => {
    const mine = ++request.current
    const { data, error: fallo } = await listPendientes(entidad)
    if (request.current !== mine) return
    if (fallo) return setEstado(p => ({ ...p, error: true }))
    const queue = ordenarPendientes(data ?? [])
    setEstado(p => ({ ...p, pendientes: queue, namesLoading: true, error: false }))
    void loadNames(queue, loadSummaries).then((names) => {
      if (request.current === mine) setEstado(p => ({ ...p, summaries: names, namesLoading: false }))
    })
  }

  useEffect(() => { void recargar() }, [entidad])

  const escanearPendientes = async () => {
    setEstado(p => ({ ...p, ocupado: true, error: false }))
    const { error: fallo } = await escanear(entidad)
    if (fallo) return setEstado(p => ({ ...p, ocupado: false, error: true }))
    await recargar()
    setEstado(p => ({ ...p, ocupado: false }))
  }

  const resultado = { pendientes, summaries, namesLoading, ocupado, error, escanearPendientes, recargar }
  return resultado
}

// Owns the pending-pair queue for `DuplicatesTab`. Pairs show as soon as they load; their names
// follow from `loadNames` without ever holding the list or the scan back.
```

`src/shared/dedup/DuplicatesTab/types.ts`: add `/** One batched read of every pending id's display name, for the list rows. */ loadSummaries: LoadSummaries` to `Props<T>` (`import type { LoadSummaries } from './useListaDuplicados/loadNames/types'`).

`src/shared/dedup/DuplicatesTab/useDuplicatesTab/index.ts`: `const list = useListaDuplicados(props.entidad, props.loadSummaries)`.

`src/shared/dedup/DuplicatesTab/ParDuplicado/index.tsx`: add `names: [string, string]` to `Props`, and give the row its names in both places:

```tsx
    <FilaLista color={color} onAbrir={onAbrir} etiqueta={t('dedup.openPairAria', { a: names[0], b: names[1] })}>
      <ColorBadge color={color}>{t(exacta ? 'dedup.levelExact' : 'dedup.levelPartial')}</ColorBadge>
      <span>{names[0]} ⇄ {names[1]}</span>
      {shortMoment(new Date(par.detectado_at), intlLocale)}
    </FilaLista>
```

Then update its doc to "its two records, its match level, and when the scan found it".

`src/shared/dedup/DuplicatesTab/index.tsx`: add

```tsx
  const pendingName = t(lista.namesLoading ? 'dedup.nameLoading' : 'dedup.nameUnavailable')
  const nameOf = (id: string) => lista.summaries[id] ?? pendingName
```

and pass `names={[nameOf(p.item_id_a), nameOf(p.item_id_b)]}` to `ParDuplicado`.

`src/shared/data/columns/index.ts`: add `pacientes: { ...identified },` to `TABLE_COLUMNS`, then run `pnpm vitest run src/shared/data/columns`.

`src/features/medical/data/patientNames/constants.ts`:

```ts
/** Ids per request: 100 uuids keep the `in (…)` filter well under a gateway's URL limit. */
export const ID_BATCH = 100
/** Only what a summary needs. */
export const NAME_COLUMNS = 'id, nombre, apellido'
/** `PromiseSettledResult.status` of a batch that loaded. */
export const FULFILLED = 'fulfilled'
/** `PromiseSettledResult.status` of a batch that failed. */
export const REJECTED = 'rejected'
```

`src/features/medical/data/patientNames/types.ts`:

```ts
import type { Paciente } from '@/features/medical/types'

/** The three columns a duplicate-list summary needs. */
export type PatientName = Pick<Paciente, 'id' | 'nombre' | 'apellido'>
```

`src/features/medical/data/patientNames/index.ts`:

```ts
import { supabase } from '@/shared/db'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { FULFILLED, ID_BATCH, NAME_COLUMNS, REJECTED } from './constants'
import type { PatientName } from './types'

const readBatch = async (batch: string[]): Promise<PatientName[]> => {
  const { data, error } = await supabase.from(TABLES.pacientes).select(NAME_COLUMNS)
    .in(TABLE_COLUMNS.pacientes.id, batch).overrideTypes<PatientName[], { merge: false }>()
  if (error) throw error
  const rows = data ?? []
  return rows
}

/** `id`, `nombre` and `apellido` of each given patient, `ID_BATCH` ids per request. Batches that
 *  loaded are kept even when another failed; it rejects only when every batch failed. */
export default async function patientNames(ids: string[]): Promise<PatientName[]> {
  const batches: string[][] = []
  for (let start = 0; start < ids.length; start += ID_BATCH) batches.push(ids.slice(start, start + ID_BATCH))
  const settled = await Promise.allSettled(batches.map(readBatch))
  const names = settled.flatMap(result => (result.status === FULFILLED ? result.value : []))
  const failure = settled.find(result => result.status === REJECTED)
  if (names.length === 0 && failure?.status === REJECTED) throw failure.reason
  return names
}

// Feeds the pending-duplicates list: one query per 100 ids instead of one per patient.
```

`src/features/medical/data/index.ts`:

```ts
export { getPaciente } from './pacientes'
export { default as patientNames } from './patientNames'

// What Medical's data layer offers to its components, so a component reading two of these imports
// one directory once. Older callers still import `./pacientes` by path until they are touched.
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
import { patientNames } from '@/features/medical/data'
import summarizePaciente from '../summarizePaciente'

/** Medical's `loadSummaries`: every given patient id → its `nombre apellido`, one batched read. */
export default async function loadSummaries(ids: string[]): Promise<Record<string, string>> {
  const rows = await patientNames(ids)
  const summaries: Record<string, string> = {}
  for (const row of rows) summaries[row.id] = summarizePaciente(row)
  return summaries
}
```

`src/features/medical/components/MedicalDuplicatesTab/index.tsx`: delete the local `summarizePaciente` and import it from `./summarizePaciente`. Import `loadSummaries` from `./loadSummaries` and pass `loadSummaries={loadSummaries}`. Make `loadPaciente` import `getPaciente` from `@/features/medical/data`, and point its test's `vi.mock` at `@/features/medical/data/pacientes` as before.

i18n, added after `dedup.discardChoicesConfirm`:

| Key | `en.json` | `es.json` |
|---|---|---|
| `dedup.nameLoading` | `Loading name…` | `Cargando nombre…` |
| `dedup.nameUnavailable` | `Name unavailable` | `Nombre no disponible` |
| `dedup.openPairAria` | `Compare {a} with {b}` | `Comparar {a} frente a {b}` |

`dedup.openAria` is no longer used once `ParDuplicado` switches. Remove it from both files only if `grep -rn "dedup.openAria" src` finds no other caller.

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t6-list-names` and every file above. Message: `feat(dedup): name both records in every pending row without blocking the list`. In the body, explain three things: `Pendiente` carries only ids, the names load asynchronously and per batch, and a request counter guards reloads.

---

## Task 7: Medical — phones and emails as checkboxes, and merge values that respect them

**Files:**
- Modify: `src/features/medical/constants/index.ts` (`CONTACT_TYPE`)
- Modify: `src/shared/data/columns/index.ts` (`pacienteContactos`)
- Create: `src/features/medical/data/patientContacts/index.ts`, `index.test.ts`, `constants.ts`, `types.ts`
- Modify: `src/features/medical/data/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/types.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/reviewFixture/index.ts`, `index.test.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/contactFields/index.ts`, `index.test.ts`, `types.ts`
- Create: `src/features/medical/components/MedicalDuplicatesTab/buildReviewMergeValues/index.ts`, `index.test.ts`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/comparePacientes/index.tsx`, `index.test.tsx`
- Modify: `src/features/medical/components/MedicalDuplicatesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `en.json` (`med.field.telefono`, `med.field.email`)

**Interfaces:**
- Consumes: `CompareField`/`CompareControls` (Tasks 3–4), the 4-argument `construirValoresFinales` (Task 3), `summarizePaciente` and the data barrel (Task 6), and `buildMergeValues(winner: Paciente, loser: Paciente, choices)`, unchanged.
- Produces:
  - `CONTACT_TYPE` and `TABLE_COLUMNS.pacienteContactos.pacienteId`.
  - `ContactView = Pick<PacienteContacto, 'id' | 'valor'>`.
  - `PatientUnderReview = { paciente: Paciente; telefono: ContactView[]; email: ContactView[] }`, with one entry per row.
  - `loadPaciente(id): Promise<PatientUnderReview>`.
  - `buildReviewMergeValues(winner, loser, choices, excludedIds)`.
  - `comparePacientes(a: PatientUnderReview, b: PatientUnderReview, controls, t)`.

- [ ] **Step 1: Write the failing tests.**

`src/features/medical/data/patientContacts/index.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { COLUMNS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import patientContacts from '.'

const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn(), order: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mocks.from(table)
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            mocks.eq(column, value)
            return { order: (by: string) => { mocks.order(by); return { overrideTypes: async () => ({ data: [], error: null }) } } }
          },
        }),
      }
    },
  },
}))

describe('patientContacts', () => {
  it('reads one patient’s contact rows, oldest first', async () => {
    await patientContacts('p1')
    expect(mocks.from).toHaveBeenCalledWith(TABLES.pacienteContactos)
    expect(mocks.eq).toHaveBeenCalledWith(TABLE_COLUMNS.pacienteContactos.pacienteId, 'p1')
    expect(mocks.order).toHaveBeenCalledWith(COLUMNS.createdAt)
  })
})
```

In `src/features/medical/data/index.test.ts`, also import and assert `patientContacts`.

Replace `src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import pacienteFixture from '@/features/medical/hooks/usePacientes/fixture'
import { CONTACT_TYPE } from '@/features/medical/constants'
import loadPaciente from '.'

const mocks = vi.hoisted(() => ({ getPaciente: vi.fn(), patientContacts: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({ supabase: {} }))
vi.mock('@/features/medical/data/pacientes', () => ({ getPaciente: mocks.getPaciente }))
vi.mock('@/features/medical/data/patientContacts', () => ({ default: mocks.patientContacts }))
vi.mock('@/features/medical/data/patientNames', () => ({ default: vi.fn() }))

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

`src/features/medical/components/MedicalDuplicatesTab/buildReviewMergeValues/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import reviewFixture from '../reviewFixture'
import buildReviewMergeValues from '.'

// The winner has no main phone; the loser's main phone is 555-0002, also one of its contact rows.
const winner = reviewFixture({ telefono: null, email: null },
  { telefono: [{ id: 'w1', valor: '555-0001' }, { id: 'w2', valor: '555-0009' }] })
const loser = reviewFixture({ telefono: '555-0002', email: 'b@example.invalid' }, {
  telefono: [{ id: 'l1', valor: '555-0001' }, { id: 'l2', valor: '555-0002' }],
  email: [{ id: 'l3', valor: 'b@example.invalid' }],
})

// The bug this guards against (review C1): the merge filled the winner's blank main phone with
// the very loser value the reviewer had just unchecked.
describe('buildReviewMergeValues', () => {
  it('keeps the winner’s blank phone when the loser’s phone was unchecked', () => {
    expect(buildReviewMergeValues(winner, loser, {}, ['l2']).telefono).toBeNull()
  })

  it('still adopts the loser’s phone when it was kept', () => {
    expect(buildReviewMergeValues(winner, loser, {}, []).telefono).toBe('555-0002')
  })

  it('treats email the same way', () => {
    expect(buildReviewMergeValues(winner, loser, {}, ['l3']).email).toBeNull()
    expect(buildReviewMergeValues(winner, loser, {}, []).email).toBe('b@example.invalid')
  })

  it('leaves the phone alone when the unchecked value is a different one', () => {
    expect(buildReviewMergeValues(winner, loser, {}, ['l1']).telefono).toBe('555-0002')
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
    expect(draw(reviewFixture({ seguro: 'Aetna' }), reviewFixture({ seguro: 'Cigna' }))).not.toContain('med.field.email')
  })

  it('shows the no-diff message when nothing differs and no contact exists', () => {
    expect(draw(reviewFixture(), reviewFixture())).toContain('dedup.noFieldDiffs')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail.**

Run: `pnpm vitest run src/features/medical`
Expected: FAIL, because the new modules and `CONTACT_TYPE` are missing.

- [ ] **Step 3: Implement.**

`src/features/medical/constants/index.ts`: add the following, and keep the file's existing closing comment last. The two values are the members of the `tipo_contacto` domain (`supabase/migrations/20260824001303_paciente_contactos.sql`). `as const` is what lets `ContactField['key']` narrow to them.

```ts
/** The two values `paciente_contactos.tipo` (domain `tipo_contacto`) allows. */
export const CONTACT_TYPE = { phone: 'telefono', email: 'email' } as const
```

`src/shared/data/columns/index.ts`: add the following next to `pacientes`, then run `pnpm vitest run src/shared/data/columns`.

```ts
  pacienteContactos: {
    ...identified,
    pacienteId: 'paciente_id',
  },
```

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
import { supabase } from '@/shared/db'
import { COLUMNS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import { CONTACT_COLUMNS } from './constants'
import type { PatientContactRow } from './types'

/** Every phone and email row one patient holds, oldest first, one per row — never deduplicated
 *  by value, since each row's id is what a merge may exclude. */
export default function patientContacts(patientId: string) {
  const query = supabase.from(TABLES.pacienteContactos).select(CONTACT_COLUMNS)
    .eq(TABLE_COLUMNS.pacienteContactos.pacienteId, patientId).order(COLUMNS.createdAt)
  return query.overrideTypes<PatientContactRow[], { merge: false }>()
}

// The duplicate review's read of `paciente_contactos`, in a stable order so the checkboxes do not
// reshuffle between two openings of the same pair.
```

`src/features/medical/data/index.ts`: add `export { default as patientContacts } from './patientContacts'` and `export type { PatientContactRow } from './patientContacts/types'`.

`src/features/medical/components/MedicalDuplicatesTab/types.ts`:

```ts
import type { Paciente, PacienteContacto } from '@/features/medical/types'

/** One contact row as the duplicate review shows it: which row, and what it says. */
export type ContactView = Pick<PacienteContacto, 'id' | 'valor'>

/** A patient loaded for the duplicate review: its row, plus every phone and email row it holds.
 *  The arrays are what make `CompareField` resolve these two fields with checkboxes. */
export type PatientUnderReview = { paciente: Paciente; telefono: ContactView[]; email: ContactView[] }
```

`src/features/medical/components/MedicalDuplicatesTab/loadPaciente/index.ts`. It reads both sources through one barrel import, per the one-import-per-directory norm.

```ts
import { getPaciente, patientContacts, type PatientContactRow } from '@/features/medical/data'
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

`src/features/medical/components/MedicalDuplicatesTab/buildReviewMergeValues/index.ts`:

```ts
import buildMergeValues from '../buildMergeValues'
import CONTACT_FIELDS from '../comparePacientes/contactFields'
import type { PatientUnderReview } from '../types'

/** The merge values for the reviewed pair. `fusionarCampoSimple` fills a blank winner `telefono`/
 *  `email` from the loser without knowing what was unchecked: where the value it would adopt is
 *  one the reviewer dropped, the winner keeps its own value instead — even a blank one. */
export default function buildReviewMergeValues(
  winner: PatientUnderReview,
  loser: PatientUnderReview,
  choices: Record<string, string>,
  excludedIds: string[],
): Record<string, unknown> {
  const values = buildMergeValues(winner.paciente, loser.paciente, choices)
  for (const { key } of CONTACT_FIELDS) {
    const dropped = loser[key].filter(({ id }) => excludedIds.includes(id)).map(({ valor }) => valor.trim())
    const adopted = values[key]
    if (typeof adopted === 'string' && dropped.includes(adopted.trim())) values[key] = winner.paciente[key]
  }
  return values
}

// The winner's own value always matches its own snapshot, so the RPC's "matches either side"
// rule still holds for the override.
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
import buildReviewMergeValues from './buildReviewMergeValues'
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
      construirValoresFinales={buildReviewMergeValues}
    />
  )
}

// Wires Medical's patient shape into the shared `DuplicatesTab` contract. Contacts travel to the
// RPC as excluded ids, and `buildReviewMergeValues` keeps those exclusions out of the main columns.
```

i18n, added next to the other `med.field.*` keys. First run `grep -n '"med.field.telefono"\|"med.field.email"' src/shared/i18n/locales/*.json`, and reuse a key if it already exists.
- `en.json`: `"med.field.telefono": "Phone"`, `"med.field.email": "Email"`
- `es.json`: `"med.field.telefono": "Teléfono"`, `"med.field.email": "Correo"`

- [ ] **Step 4: Run and confirm everything passes.**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. `buildMergeValues`'s own tests are unchanged.

- [ ] **Step 5: Queue.** Use the slug `dedup-modal-t7-medical-contacts` and every file above. Message: `feat(medical): review every phone and email of a duplicate pair, and keep unchecked ones out`.

---

## Task 8: Final verification

**Files:** this task creates nothing. Fix whatever a step finds inside the task that owns that file, and queue the fix as its own entry.

- [ ] **Step 1:** `pnpm typecheck`, expected to be clean.
- [ ] **Step 2:** `pnpm test`, expected to pass in full.
- [ ] **Step 3:** `pnpm build:check`. Never run `next build` while `pnpm dev` is up, and never start a second `pnpm dev` if `:3000` already answers.
- [ ] **Step 4:** Run every `supabase/checks/duplicados-motor-*.sql`, using the loop from Task 1, Step 4. Each one must print `PASS:`.
- [ ] **Step 5:** `grep -rn "@/features" src/shared/dedup`, expected to print nothing.
- [ ] **Step 6: Browser walkthrough.** Use `pnpm dev` and `/medical` → Duplicados, logged in with a **non-admin** account that has the `medical` module. An admin proves nothing about permissions. Use patients created **through the app**, not by seed.
  1. Create two patients with the same name and date of birth, and leave both phone and email blank. Scan.
  2. **Find out who the winner is before assigning anything.** The winner is `item_id_a`, and nobody can choose it in advance. Run this against the local DB:
     ```sql
     select item_id_a as winner, item_id_b as loser from duplicados_pendientes
       where entidad = 'pacientes' order by detectado_at desc limit 1;
     ```
     Then match both ids against `select id, nombre, apellido from pacientes`.
  3. Edit the patients through the app:
     - **Winner:** add phone `555-0001`, and leave its main email blank.
     - **Loser:** give it main phone `555-0002`, main email `b@example.invalid`, and an extra phone `555-0001`.
     - Confirm in `paciente_contactos` that the mirroring created those rows.
  4. Open the pair. Confirm each of the following.
     - The list row shows both names, and its accessible name mentions both.
     - The dialog takes focus and keeps Tab inside.
     - The badges read "Stays · <winner>" and "Merged in, then removed · <loser>", and the winner is the record identified in step 2.
     - The four buttons stay visible however long the grid is. Shrink the window to check.
     - `555-0001` is checked, disabled and hinted. `555-0002` and the email are checked and can be toggled.
     - Esc with nothing touched closes the dialog and returns focus to the row.
  5. Reopen the pair and uncheck `555-0002` and the email.
     - Esc now asks "Discard your choices?". Answer Cancel and stay.
     - "Same person, keep separate" opens its note dialog on top, and Esc closes only that one.
  6. Merge. While the merge is running, Esc and ✕ do nothing. Afterwards, check the database:
     ```sql
     select telefono, email from pacientes where id = '<winner>';
     select tipo, valor from paciente_contactos where paciente_id = '<winner>' order by valor;
     select jsonb_path_query(hijos_descartados, '$[*].filas[*].valor') from duplicados_fusiones where ganador_id = '<winner>';
     ```
     Expected:
     - `telefono` and `email` are both still **blank**, not `555-0002` or `b@example.invalid` (correction 9).
     - The contacts are only `555-0001`.
     - The discarded rows list `555-0002`, the email, and the colliding `555-0001` (correction 10).
- [ ] **Step 7:** Report the deferred items below to the repo owner, with the reminder that the in-place migration edits must land before this branch is ever pushed or linked-pushed (correction 6).

## Deferred, noted on purpose

- **`isMultiValue` checks only `values[0]`.** Under the types, both sides are arrays or both are scalars. Untyped data with `null` on one side could still crash `mergeMultiValueRows`. No adapter produces that today, so it is left alone. Revisit it if an adapter ever builds the arrays from unchecked input.
- **The import flow (`MergeCandidateRow`)** gets none of this yet. Out of scope per the spec.
- **No revert UI.** `revertir_fusion_duplicado` is still reached only through SQL. Task 2 makes it complete, not visible.
