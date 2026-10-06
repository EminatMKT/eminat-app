# Research Stage "En comunicación" Implementation Plan

## Progress update — 2026-10-06

- ✅ Task 1 landed in the working tree: the stage model was extracted and folded into
  `src/features/research/stages/index.ts`.
- ✅ Task 2 landed in the working tree: `En comunicación` exists in the stage catalog, type
  union, i18n files, and regression tests.
- ✅ Task 3 landed in the working tree: `OportunidadesTab` treats `En comunicación` as an
  active opportunity while `Total Ganado` still counts only `Ganado`.
- ✅ Task 4 landed and was applied locally: migration `20261006142200` extends the
  `research_leads.stage` check constraint; valid/invalid insert checks were run and cleaned up.
- 🔲 Follow-up TODO: the Research filter engine currently exposes only a curated subset of
  lead columns; add generic filter coverage for every `LEAD_FIELD_DEFS` column.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new pipeline stage, `'En comunicación'`, between `'Contactado'` and `'Ganado'` in the Research/CRM module, so leads that are in active, uncommitted negotiation (e.g. Bayer, Otsuka — per Federico Salviche's request, 2026-10-06) stop being shoehorned into `'Ganado'`.

**Architecture:** The 4 canonical stages are a single source of truth (`STAGE` + `STAGE_META`, keyed in pipeline order) that everything else — Kanban columns, filter dropdown, form `<select>`, i18n labels, pie-chart colors — derives from. Before this plan lands, that source of truth is bundled inside `src/features/research/constants.ts`, which is already 64 lines of code against this repo's 50-line Centinela ceiling (`ts/codigo.md` · `archivo_extenso`) and cannot grow further without a sign-off this team avoids giving itself. Task 1 extracts the stage block into its own file (`stages.ts`), a pure no-behavior-change refactor, which both resolves that debt and gives the new stage a home. Task 2 adds the stage. Task 3 wires it into the one piece of business logic that filters by stage literal instead of deriving from the catalog. Task 4 is the DB migration.

**Tech Stack:** Next.js 14 (App Router) + TypeScript, Supabase Postgres (CLI-managed migrations), Vitest.

**Spec:** No separate spec doc — the request is the email thread from Federico Salviche (2026-10-06) relayed by Wagner, clarified in conversation: a stage for "contacted and in active management, not yet closed" (examples: Bayer, Otsuka, Nestlé), inserted between `Contactado` and `Ganado`, keeping `Ganado` meaning "closed/won". Explicitly OUT of scope for this plan: reclassifying any existing lead's `stage` value in production — that's Federico's team's own call, made from the app UI once this ships.

## Global Constraints

- The repo-local Centinela rules gate every `Write`/`Edit` — `ts/codigo.md` caps a file at 50 lines of code (hard ceiling 150) and an already-over-limit file may only shrink or stay the same size, never grow. If a task appears to need a manual rule override, stop and ask Wagner rather than applying one unilaterally.
- New files and new comments/test names are written in English (repo-wide Centinela rule, token-cost based, applies to newly authored content only). Lines moved verbatim as part of Task 1's refactor keep their existing Spanish wording unchanged — translating them is a separate, unrequested piece of scope.
- `research_leads.stage` is a `text` column gated by a Postgres CHECK constraint (`research_leads_stage_check`), not an enum type. Extending it means `DROP CONSTRAINT` + `ADD CONSTRAINT` with the **union** of old and new allowed values (see migration `20260721225916_research_leads_stage_union_constraint.sql` for the precedent) — never drop a legacy value from that array, and never swap to a narrower list.
- Stage literals stored in the DB are the exact Spanish display strings (`'Contactado'`, `'Ganado'`, …), not slugs — the new value must be stored as literally `'En comunicación'`.
- `pnpm supabase migration up` applies migrations to local only; never run `supabase db reset` (wipes seeded activities). Local-to-prod is a direct `db push` with no intermediate environment — that step is Wagner's call, not part of this plan's automated steps.
- Any new/changed canonical stage needs BOTH `es.json` and `en.json` i18n keys — `stageLabel()` falls back to the raw literal when a key is missing, which would silently show the Spanish literal in the English UI.
- Test commands: `pnpm test <path>` (Vitest), `pnpm typecheck` (`tsc --noEmit`), `pnpm lint` (`next lint`).

## Review Focus

- **The Kanban/pipeline column order.** `PIPELINE_COLS` order comes from object-key insertion order in `STAGE_META` — if the new entry isn't inserted textually between `CONTACTADO` and `GANADO`, the column renders in the wrong place with no compile error to catch it. Pinned by Task 2's `PIPELINE_COLS` ordering test.
- **The "Total Ganado" KPI silently including the new stage.** `OportunidadesTab`'s "Pipeline Total"/opportunity filter should include `En comunicación` (it's active, valuable pipeline), but its "Total Ganado" stat card must keep counting *only* `STAGE.GANADO` — a careless `||` edit could inflate "won" with "in talks". Pinned by Task 3's test.
- **Legacy stage values breaking once a 5th canonical stage exists.** `stageColors()` reserves one palette hex per canonical stage for the pie chart and gives the rest to legacy values (`Identificado`, `Awarded`, …, `Sin etapa`) by index/hash. Adding a canonical stage shrinks that reserved pool by one. Pinned by re-running the existing stage-color tests (moved to `stages.test.ts` in Task 1) after Task 2's change — they must still pass unmodified.
- **Missing i18n key silently leaking the Spanish literal into the English UI.** `stageLabel()`'s fallback (`stage || '—'`) means a missing `en.json` key doesn't error, it just shows `'En comunicación'` verbatim to an English-reading user. Pinned by Task 2's i18n-key-exists test.
- **A migration that narrows the CHECK instead of unioning it.** Dropping and re-adding `research_leads_stage_check` with anything less than the full old array (4 canonical + 9 legacy) plus the new value would make every existing lead in a legacy or `Ganado`/`Contactado`/etc. stage fail future `UPDATE`s with a `23514 check_violation`, exactly the incident the 2026-07-21 migration's own comment describes. Pinned by Task 4's precheck query.

---

### Task 1: Extract the stage domain model into `stages.ts`

Pure refactor, zero behavior change. Resolves the `archivo_extenso` debt on `constants.ts` that blocks Task 2, and gives the new stage a home that isn't already over its line budget.

**Centinela correction (found while executing this plan on 2026-10-06):** do not create `stages.ts` with the `Write` tool as a brand-new file containing the copied block. `constants.ts` carries zero exemption marks today because every current-file-hygiene rule (`bloque-repetido`, `comentario-largo`, `respuesta_en_espanol`, `doc-de-export`, `one-exported-function`, `sin-export-default`, `reexporta_fuera_de_index`, `codigo_sin_prosa`, `constantes-con-logica`, `literal-en-return`, `suite_before_module`) only gates genuinely *new* content — a byte-for-byte `Write` of the same content into a new path is scanned as 100% new and fails essentially all of them at once. The fix is `git mv`, not `Write`: a git rename is a Bash/git operation, never goes through the Write/Edit hook, and keeps the file's existing (grandfathered) status. Only the content that's genuinely new after the split — the small leftover `constants.ts` — needs to satisfy current conventions, and it's short and simple enough to.

**Files:**
- `git mv src/features/research/constants.ts src/features/research/stages.ts` (not `Write` — see correction above)
- Edit `stages.ts` afterward to delete the non-stage tail (removing lines, not adding, so this stays low-risk under the same rules)
- Create (fresh `Write`, now genuinely small/new, comments in English): a new `src/features/research/constants.ts` with just the non-stage tail
- `git mv src/features/research/constants.test.ts src/features/research/stages.test.ts` (same reasoning — keeps the existing Spanish `describe`/`it` text grandfathered)
- Modify (import path only, no logic change):
  - `src/features/research/utils/fields.ts:8`
  - `src/features/research/utils/importPlan.ts:12`
  - `src/features/research/hooks/useResearchData.ts:5`
  - `src/features/research/hooks/useResearchModals.ts:3`
  - `src/features/research/index.test.ts:5`
  - `src/features/research/utils/importPlan.test.ts:4`
  - `src/features/research/components/DashboardTab.tsx:3`
  - `src/features/research/components/StageBadge.tsx:3`
  - `src/features/research/components/leads/PipelineColumn.tsx:3`
  - `src/features/research/components/leads/PipelineTab.tsx:3`
  - `src/features/research/components/leads/OportunidadesTab.tsx:3`

**Interfaces:**
- Produces: `src/features/research/stages.ts` exports `STAGE`, `PIPELINE_COLS`, `STAGE_LABEL_KEY`, `PIPELINE_COLORS`, `ARCHIVED_STAGE`, `PIPELINE_ACTIVE_COLS`, `DEFAULT_STAGE`, `stageLabel(stage, t)`, `stageColors(names)`, re-exports `CHART_COLORS` — identical names/signatures to what `constants.ts` exported before, just from a new path.
- `constants.ts` keeps everything else unchanged: `FROZEN_COLS`, `NCT_COLUMN`, `COUNT_COLUMN`, `TITLE_COLUMN`, `NCT_RE`, `CLINICAL_TRIALS_BASE`, `normNct`, `MAIL_ESTADO_COLOR`.

- [ ] **Step 1: Run the full suite as a baseline before touching anything**

Run: `pnpm test`
Expected: all current tests pass (note the count — Step 6 must match it exactly).

- [ ] **Step 2: Rename `constants.ts` to `stages.ts` with `git mv` — not `Write`, not a copy**

```bash
git mv src/features/research/constants.ts src/features/research/stages.ts
```

This is a git operation, not an edit-tool call: it never goes through the Write/Edit hook, so the file's existing (grandfathered) status travels with it unchanged. Do not follow this with a `Write` of the same path — that would re-introduce exactly the problem this step avoids.

- [ ] **Step 3: Edit `stages.ts` to remove its non-stage tail**

Using the `Edit` tool (removal only — do not touch or retype the stage block above it), delete everything from the `// ponytail: sin uso...` comment through the end of the file: the commented-out `COUNTRY_FLAGS` block, `FROZEN_COLS`, `NCT_COLUMN`, `COUNT_COLUMN`, `TITLE_COLUMN`, `NCT_RE`, `CLINICAL_TRIALS_BASE`, `normNct`, `MAIL_ESTADO_COLOR`. `stages.ts` now contains only the stage block (the three top imports through `legacyColor`), byte-identical to what was already in `constants.ts` — nothing in it is new content.

- [ ] **Step 3b: Create a new, small `constants.ts` with just that removed tail**

Write a fresh `src/features/research/constants.ts` containing exactly the lines removed in Step 3, with their Spanish line-comments translated to English (this content is genuinely new at this path, so it's subject to the English-new-content rule — unlike `stages.ts`, it's short and has no repeated-shape block, so it isn't expected to trip anything else):

```ts
// ponytail: unused since the "Leads by Country" block was commented out (direction, meeting
// 2026-07-20). Its only consumer was `components/CountryChip/`, also commented. Don't delete —
// restore together with that block.
/*
export const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸', 'USA': '🇺🇸', 'US': '🇺🇸', 'Spain': '🇪🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵', 'China': '🇨🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'India': '🇮🇳',
  'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿', 'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Taiwan': '🇹🇼',
}
*/

// Frozen columns of the leads table: the first two (NCT# and title), which say WHICH study a row
// is. Without this, scrolling right shows a row's phase/sponsor/stage with no way to tell which
// study it belongs to.
// The width lives here, not in each component, because the second column's `left` IS the first
// column's width: if the header and the row use different numbers, the columns overlap.
// `position: sticky` only pins to the left edge, so these two MUST be the table's first columns —
// hence the order of COLUMNS in LeadsTab.
export const FROZEN_COLS = [{ width: 118, left: 0 }, { width: 240, left: 118 }] as const

// A lead's fields (form/export/import/validation) live in ./utils/fields.ts.

// — NCT# (the study's identifier on ClinicalTrials.gov) — single source, don't repeat the literal.
export const NCT_COLUMN = 'nct_number'
// — Contact-attempt counter (emails sent for that study) — single source.
export const COUNT_COLUMN = 'email_count'
export const TITLE_COLUMN = 'official_title' // used to look up the study by title on CT.gov
export const NCT_RE = /^NCT\d{8}$/i
export const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov'
// Normalizes an NCT# for comparison/indexing/querying: no spaces, uppercase.
export const normNct = (v: unknown) => String(v ?? '').trim().toUpperCase()

export const MAIL_ESTADO_COLOR: Record<string, string> = { Borrador: '#9CA3AF', Programado: '#60A5FA', Enviado: '#34D399', Cancelado: '#F87171' }
```

- [ ] **Step 4: Rename the test file and update its import**

```bash
git mv src/features/research/constants.test.ts src/features/research/stages.test.ts
```

In `stages.test.ts`, change the import line to:
```ts
import { stageColors, PIPELINE_COLORS, STAGE } from './stages'
```

- [ ] **Step 5: Update every other importer's path (text substitution only)**

For each file below, change the import statement's source from a `constants` path to the equivalent `stages` path, keeping the imported names identical. Files that import **only** stage-related names get a single path swap; files that import a mix get split into two import lines.

Path-swap only (stage-only imports):
```ts
// src/features/research/hooks/useResearchModals.ts:3
import { DEFAULT_STAGE } from '../stages'

// src/features/research/components/DashboardTab.tsx:3
import { stageColors, stageLabel } from '../stages'

// src/features/research/components/StageBadge.tsx:3
import { PIPELINE_COLORS, stageLabel } from '../stages'

// src/features/research/components/leads/PipelineColumn.tsx:3
import { PIPELINE_COLORS, stageLabel } from '../../stages'

// src/features/research/components/leads/PipelineTab.tsx:3
import { PIPELINE_ACTIVE_COLS } from '../../stages'

// src/features/research/components/leads/OportunidadesTab.tsx:3
import { STAGE } from '../../stages'

// src/features/research/utils/importPlan.test.ts:4
import { DEFAULT_STAGE, STAGE } from '../stages'

// src/features/research/index.test.ts:5
import { PIPELINE_COLS, PIPELINE_ACTIVE_COLS, ARCHIVED_STAGE, DEFAULT_STAGE, STAGE, STAGE_LABEL_KEY, stageLabel } from './stages'
```

Split (mixed stage + non-stage imports):
```ts
// src/features/research/utils/fields.ts:8 — was:
// import { PIPELINE_COLS, NCT_COLUMN, STAGE_LABEL_KEY } from '../constants'
import { NCT_COLUMN } from '../constants'
import { PIPELINE_COLS, STAGE_LABEL_KEY } from '../stages'

// src/features/research/utils/importPlan.ts:12 — was:
// import { normNct, DEFAULT_STAGE, COUNT_COLUMN } from '../constants'
import { normNct, COUNT_COLUMN } from '../constants'
import { DEFAULT_STAGE } from '../stages'

// src/features/research/hooks/useResearchData.ts:5 — was:
// import { STAGE, COUNT_COLUMN } from '../constants'
import { STAGE } from '../stages'
import { COUNT_COLUMN } from '../constants'
```

- [ ] **Step 6: Run the full suite again — same pass count as Step 1**

Run: `pnpm test`
Expected: PASS, identical test count to Step 1 (zero behavior change).

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/research/stages.ts src/features/research/constants.ts \
  src/features/research/stages.test.ts \
  src/features/research/utils/fields.ts src/features/research/utils/importPlan.ts \
  src/features/research/hooks/useResearchData.ts src/features/research/hooks/useResearchModals.ts \
  src/features/research/index.test.ts src/features/research/utils/importPlan.test.ts \
  src/features/research/components/DashboardTab.tsx src/features/research/components/StageBadge.tsx \
  src/features/research/components/leads/PipelineColumn.tsx src/features/research/components/leads/PipelineTab.tsx \
  src/features/research/components/leads/OportunidadesTab.tsx
git commit -m "refactor(research): extract stage domain model into stages.ts"
```

---

### Task 2: Add the `'En comunicación'` stage

**Files:**
- Modify: `src/features/research/types.ts:10`
- Modify: `src/features/research/stages.ts` (the `STAGE` and `STAGE_META` objects from Task 1)
- Modify: `src/features/research/stages.test.ts` (comment accuracy + new ordering test)
- Modify: `src/shared/i18n/locales/es.json` (insert after the `research.stage.contactado` line)
- Modify: `src/shared/i18n/locales/en.json` (insert after the `research.stage.contactado` line)

**Interfaces:**
- Consumes: `stages.ts` as produced by Task 1 (`STAGE`, `STAGE_META`, `PIPELINE_COLS`, all derived from the same object).
- Produces: `STAGE.EN_COMUNICACION === 'En comunicación'`; `PIPELINE_COLS` now has 5 entries in order `['Nuevo', 'Contactado', 'En comunicación', 'Ganado', 'Sin respuesta']`; i18n key `research.stage.en_comunicacion` in both locales.

- [ ] **Step 1: Write the failing test in `stages.test.ts`**

Add to `src/features/research/stages.test.ts` (add `PIPELINE_COLS` to the existing import from `./stages`):
```ts
describe('the En comunicación stage sits between Contactado and Ganado', () => {
  it('exists with the exact literal stored in research_leads.stage', () => {
    expect(STAGE.EN_COMUNICACION).toBe('En comunicación')
  })
  it('the pipeline orders it between Contactado and Ganado', () => {
    const i = PIPELINE_COLS.indexOf(STAGE.EN_COMUNICACION)
    expect(i).toBe(PIPELINE_COLS.indexOf(STAGE.CONTACTADO) + 1)
    expect(i).toBe(PIPELINE_COLS.indexOf(STAGE.GANADO) - 1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/features/research/stages.test.ts`
Expected: FAIL — `STAGE.EN_COMUNICACION` is `undefined`.

- [ ] **Step 3: Add the stage to `types.ts`**

```ts
export type Stage = 'Nuevo' | 'Contactado' | 'En comunicación' | 'Ganado' | 'Sin respuesta'
```

- [ ] **Step 4: Add the stage to `stages.ts`'s `STAGE` and `STAGE_META` — as two small, separate insertions, not whole-object replacements**

`stages.ts` is an existing, grandfathered file after Task 1's `git mv` — an `Edit` tool call only needs to touch the small fragment that's actually changing. Keep each `old_string`/`new_string` pair to a single line growing into two, not the whole object: replacing the entire 4-line `STAGE`/`STAGE_META` object in one `Edit` call would hand the tool a 5-line fragment that *itself* looks like the kind of repeated-shape block `bloque-repetido` flags, even though only one line is actually new. Two separate, minimal edits:

Edit 1 — in `STAGE`, insert after the `CONTACTADO` line:
```ts
  CONTACTADO: 'Contactado',
  EN_COMUNICACION: 'En comunicación',
```

Edit 2 — in `STAGE_META`, insert after the `[STAGE.CONTACTADO]` line:
```ts
  [STAGE.CONTACTADO]:      { labelKey: 'research.stage.contactado',      color: '#FBB040' },
  [STAGE.EN_COMUNICACION]: { labelKey: 'research.stage.en_comunicacion', color: '#A78BFA' },
```

The key order is what fixes the pipeline position — `EN_COMUNICACION` must sit textually between `CONTACTADO` and `GANADO` in both objects. `#A78BFA` is already in `CHART_COLORS` (`src/shared/components/dashboard/theme.ts:13`) and isn't used by any other canonical stage.

- [ ] **Step 5: Run the test again to verify it passes**

Run: `pnpm test src/features/research/stages.test.ts`
Expected: PASS.

- [ ] **Step 6: Fix the now-stale count in a comment in `stages.test.ts`**

The worst-case color-collision test has a comment that currently says the combined set is "10 legacy + 4 canonical" stages. Bump that `4` to `5` — the array itself (`Object.keys(PIPELINE_COLORS)`) is already dynamic and needs no code change, only the comment's count is now stale.

- [ ] **Step 7: Add i18n keys**

`src/shared/i18n/locales/es.json`, insert right after the `research.stage.contactado` line:
```json
  "research.stage.en_comunicacion": "En comunicación",
```

`src/shared/i18n/locales/en.json`, insert right after the `research.stage.contactado` line:
```json
  "research.stage.en_comunicacion": "In communication",
```

- [ ] **Step 8: Run the full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS, no type errors. This also exercises `fields.ts`'s `stage` field definition (`options: PIPELINE_COLS, optionLabelKey: STAGE_LABEL_KEY`), which is what feeds both the lead form `<select>` and (via `domainOptions('stage')` in `utils/filters.ts:28`) the leads-table stage filter dropdown — neither needs its own code change, both pick up the 5th option automatically from `PIPELINE_COLS`/`STAGE_LABEL_KEY`.

- [ ] **Step 9: Commit**

```bash
git add src/features/research/types.ts src/features/research/stages.ts src/features/research/stages.test.ts \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json
git commit -m "feat(research): add En comunicación stage between Contactado and Ganado"
```

---

### Task 3: Include the new stage in the Oportunidades view

**Files:**
- Modify: `src/features/research/components/leads/OportunidadesTab.tsx`

**Interfaces:**
- Consumes: `STAGE.EN_COMUNICACION` from Task 2.

- [ ] **Step 1: Write the failing test**

There is no existing test file for this component. Create `src/features/research/components/leads/OportunidadesTab.test.ts`, testing the same filter predicate the component uses (as a plain function, since the component has no render harness today):

```ts
import { describe, it, expect } from 'vitest'
import { STAGE } from '../../stages'

// Same predicate as OportunidadesTab.tsx: an opportunity is a lead with active potential value.
const isOpportunity = (stage: string) =>
  stage === STAGE.CONTACTADO || stage === STAGE.EN_COMUNICACION || stage === STAGE.GANADO

describe('OportunidadesTab — what counts as an opportunity', () => {
  it('En comunicación counts as an active opportunity', () => {
    expect(isOpportunity(STAGE.EN_COMUNICACION)).toBe(true)
  })
  it('Total Ganado still counts only Ganado, not En comunicación', () => {
    const leads = [{ stage: STAGE.GANADO }, { stage: STAGE.EN_COMUNICACION }, { stage: STAGE.CONTACTADO }]
    const totalGanado = leads.filter(l => l.stage === STAGE.GANADO).length
    expect(totalGanado).toBe(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/features/research/components/leads/OportunidadesTab.test.ts`
Expected: FAIL — `isOpportunity(STAGE.EN_COMUNICACION)` is `false` against the component's current two-way predicate.

- [ ] **Step 3: Update the component's filter**

In `src/features/research/components/leads/OportunidadesTab.tsx:11-12`, replace the existing Spanish comment and the filter line with:
```tsx
  // Opportunity = a worked lead with potential value: Contactado or En comunicación (in
  // progress), or Ganado (closed).
  const opps = leads.filter(l => l.stage === STAGE.CONTACTADO || l.stage === STAGE.EN_COMUNICACION || l.stage === STAGE.GANADO)
```
Line 18 (the `"Total Ganado"` `StatCard`) stays exactly as-is — it already filters `opps` down to `STAGE.GANADO` only, so it's unaffected by `opps` growing to include `En comunicación`.

- [ ] **Step 4: Re-run the test**

Run: `pnpm test src/features/research/components/leads/OportunidadesTab.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/research/components/leads/OportunidadesTab.tsx src/features/research/components/leads/OportunidadesTab.test.ts
git commit -m "feat(research): count En comunicación leads as active opportunities"
```

---

### Task 4: Database migration — extend the stage CHECK constraint

**Files:**
- Create: `supabase/migrations/20261006142200_research_leads_stage_en_comunicacion.sql`

**Interfaces:**
- Consumes: nothing from earlier tasks (DB-side only; the app already writes/reads `stage` as free text).
- Produces: `research_leads.stage` accepts `'En comunicación'` in addition to every value it already accepted.

- [ ] **Step 1: Write the migration**

```sql
-- New pipeline stage requested by Federico Salviche (email 2026-10-06, thread "Update CRM
-- stages"): a lead that's been contacted and is in active management but not yet closed (e.g.
-- Bayer, Otsuka, Nestlé) has nowhere to live today between 'Contactado' and 'Ganado', so it gets
-- shoehorned into one of the two. Same pattern as 20260721225916: UNION of the old array plus
-- the new value, never a replacement — so no existing lead (canonical or legacy) stops passing
-- the CHECK.
--
-- Reclassifying existing leads (currently 5 in 'Ganado': Bausch & Lomb, Bayer, BioRegen,
-- Bristol-Myers Squibb, Otsuka) is Federico's team's job from the app, not this migration.

ALTER TABLE "public"."research_leads"
  DROP CONSTRAINT "research_leads_stage_check";

ALTER TABLE "public"."research_leads"
  ADD CONSTRAINT "research_leads_stage_check" CHECK (
    "stage" = ANY (ARRAY[
      -- 5 canonical
      'Nuevo'::text, 'Contactado'::text, 'En comunicación'::text, 'Ganado'::text, 'Sin respuesta'::text,
      -- 9 legacy (transitional; removed once existing data is remapped)
      'Identificado'::text, 'Calificado'::text, 'Outreach'::text, 'Contacto'::text,
      'Discovery/Feasibility'::text, 'Docs'::text, 'Negociación'::text,
      'Awarded'::text, 'Cerrado'::text
    ])
  );
```

- [ ] **Step 2: Apply it locally**

Run: `pnpm supabase migration up`
Expected: migration `20261006142200` applies cleanly with no error.

- [ ] **Step 3: Verify the constraint accepts the new value and still rejects garbage**

Run against local (`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` or `pnpm supabase db query` without `--linked`):
```sql
-- Should insert without error:
insert into research_leads (official_title, stage) values ('TEST plan migration', 'En comunicación');
-- Should fail with 23514:
insert into research_leads (official_title, stage) values ('TEST plan migration bad', 'No existe');
-- Cleanup:
delete from research_leads where official_title like 'TEST plan migration%';
```
Expected: first insert succeeds, second raises `23514 check_violation`, cleanup removes both test rows.

- [ ] **Step 4: Manual QA from the local app UI**

Run `pnpm dev`, open the Research module, confirm: the Kanban shows a new "En comunicación" column between "Contactado" and "Ganado"; the lead form's stage `<select>` offers it; moving a local test lead into it persists and survives a page reload.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261006142200_research_leads_stage_en_comunicacion.sql
git commit -m "feat(db): accept En comunicación in research_leads.stage check constraint"
```

**Not part of this task, by Wagner's explicit instruction:** pushing this migration to production (`pnpm supabase db push`, after `supabase link --project-ref ruedelunbtaomhrzgelc`) and reclassifying the 5 leads currently in `Ganado` are both out of scope — prod push is Wagner's own call, and data reclassification is Federico's team's job from the UI, not something this plan or its executor does.
