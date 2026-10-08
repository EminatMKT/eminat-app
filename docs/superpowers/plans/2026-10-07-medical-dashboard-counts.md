# Medical Patient Registry Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/medical` Dashboard from the real EMC patient-register CRM panel without loading the full patient registry on mount.

**Architecture:** Treat `/home/wagner/Descargas/EMC/EMC_CRM_Registro_Pacientes.html` as the only functional reference. Add one Medical count/aggregate data module that returns dashboard-ready numbers, keep the full registry load lazy for the patient list and import workflows, and render the dashboard with existing shared dashboard components plus existing Medical-local rows only where needed.

**Tech Stack:** Next.js client components, React hooks, Supabase PostgREST count queries, existing Medical context, existing shared dashboard components, Vitest.

---

## Scope boundaries

- Use this reference only: `/home/wagner/Descargas/EMC/EMC_CRM_Registro_Pacientes.html`.
- Do not use the public EMC marketing HTML as dashboard content guidance.
- Do not copy embedded patient rows from the HTML into the app.
- Do not load `pacientes`, `paciente_fuentes`, or `paciente_contactos` just because the Dashboard tab opened.
- Reuse existing UI before creating new UI:
  - `src/shared/components/dashboard/Panel`
  - `src/shared/components/dashboard/StatCard`
  - `src/shared/components/dashboard/BarChartCard`
  - `src/shared/components/dashboard/PieChartCard`
  - `src/shared/components/dashboard/theme`
  - Existing Medical rows: `TodayAppointmentItem`, `IncidentAlertCard`, `PendingTrainingItem`, `RecentActivityRow`.
- Keep the full patient table, filters, CSV export, drawer behavior, and import matching in patient workflows, not in the Dashboard performance bite.

## Centinela guardrails

These constraints are part of the plan so implementation does not fight the local guard:

- Edit repository files through patch/Edit tools, not shell redirection, `sed -i`, or interpreter writes.
- Keep all Supabase reads in `src/features/medical/data/...`; components and hooks do not call `supabase` directly.
- Use the existing Supabase singleton from `@/shared/db`; do not create clients or use service-role keys.
- Do not add migrations, RPCs, or database functions in this bite. Nullable aggregate fields stay nullable until a separate database plan is approved.
- Avoid new inline `style` attributes in touched TSX. If `DashboardTab.tsx` needs layout that shared dashboard components do not cover, add a local CSS module beside the component or extract a small component folder with its own CSS module.
- Do not add hard-coded user-facing text in TSX. Add i18n keys in `src/shared/i18n/locales/en.json` and `src/shared/i18n/locales/es.json`, then render through `useT()`.
- Do not add hard-coded colors in new TSX/CSS. Prefer shared dashboard components, `CHART_COLORS`, or existing CSS variables.
- Write CSS sizes in `rem`, not `px`, when adding a CSS module.
- Keep one component per `.tsx` file. If a data-quality row becomes more than a trivial local render helper, create `src/features/medical/components/DataQualityRow/index.tsx`.
- Keep repeated JSX inside `.map()` as a component, not an inline JSX block.
- Keep exported types in `types.ts`, not next to exported functions.
- Keep files small: split the dashboard count module into helper files if it approaches the repo ceiling.
- Build returned objects in named variables before returning them from non-trivial functions.
- Use named intermediate variables for Supabase query chains instead of long inline chains.
- Do not use `as` assertions to force TypeScript. Type values where they are born or narrow them with small helpers.
- Use explicit button types and accessible labels for any new buttons.
- Add tests with any new testable helper; do not invent shallow tests that only import the module.

## Reference mapping

The reference panel has three views: main panel, patient list, and campaign segments. This plan maps only the main panel content into the existing `/medical` Dashboard tab.

| Reference block | Medical Dashboard target | Existing component to reuse |
|---|---|---|
| Registry total KPI | Total patients | `StatCard` |
| Email reach KPI | Patients with email plus missing-email footnote | `StatCard` |
| Median age KPI | Median/min/max age when available from an aggregate module | `StatCard` |
| Current-month birthday KPI | Birthdays this month | `StatCard` |
| Reachability spine | Email-reachable versus phone-only reach by age bucket | `BarChartCard` fallback first; custom SVG only in a later UI bite |
| Birthdays by month | 12-month birthday distribution | `BarChartCard` |
| Composition | Gender split and age buckets | `PieChartCard` plus `BarChartCard` |
| Geographic concentration | Area-code distribution from phone prefix | `BarChartCard` |
| Registry quality | Data-quality alert counts | `Panel` plus Medical-local rows/cards |
| Current operational widgets | Keep below registry panel | Existing Medical rows wrapped in `Panel` |

The reference patient table columns map to chart number, first name, last name, gender, date of birth, age, phone, email, and status. Those belong to `PacientesTab`; do not render that table in Dashboard.

The reference segment examples are useful later as drill-downs, but the first Dashboard implementation should expose only counts that can be computed without loading all rows.

## File Structure

| File | Responsibility |
|---|---|
| `src/features/medical/data/patientDashboardCounts/index.test.ts` | Tests for count/aggregate data returned by the Medical dashboard data module. |
| `src/features/medical/data/patientDashboardCounts/index.ts` | Count-only or aggregate-only reads for the Dashboard. No full row registry loads. |
| `src/features/medical/data/patientDashboardCounts/types.ts` | Export `PatientDashboardCounts` and related named object types. |
| `src/features/medical/data/patientDashboardCounts/monthCounts.ts` | Birthday month count helpers if `index.ts` grows too large. |
| `src/features/medical/data/patientDashboardCounts/ageCounts.ts` | Age bucket count helpers if `index.ts` grows too large. |
| `src/features/medical/data/patientDashboardCounts/areaCounts.ts` | Area-code count helpers if `index.ts` grows too large. |
| `src/features/medical/hooks/usePatientDashboardCounts/index.test.ts` | Tests hook loading/error/reload behavior. |
| `src/features/medical/hooks/usePatientDashboardCounts/index.ts` | Client hook that loads the dashboard aggregate once and exposes reload. |
| `src/features/medical/hooks/usePacientes.ts` | Make full registry loading explicit and lazy. |
| `src/features/medical/hooks/useMedicalData.ts` | Expose dashboard aggregates and explicit patient-registry loader through Medical context. |
| `src/features/medical/components/DashboardTab.tsx` | Replace inline patient stats with reference-based registry panels using shared components. |
| `src/features/medical/components/DashboardTab/index.module.css` | Local layout only if shared dashboard components do not cover a layout need. |
| `src/features/medical/components/DataQualityRow/index.tsx` | Optional extracted row component if the quality panel repeats JSX. |
| `src/features/medical/components/DataQualityRow/index.module.css` | Optional row styling without inline styles. |
| `src/features/medical/components/PacientesTab.tsx` | Trigger full registry load when the user opens the patient list. |
| `src/features/medical/components/PacientesImportModal/index.tsx` | Trigger full registry load before import planning. |
| `src/shared/i18n/locales/en.json` | Add dashboard labels for registry KPIs/charts. |
| `src/shared/i18n/locales/es.json` | Add dashboard labels for registry KPIs/charts. |

## Dashboard data contract

Create this type in `src/features/medical/data/patientDashboardCounts/types.ts` and export it for the hook:

```ts
export type PatientDashboardCounts = {
  totalPatients: number
  withEmail: number
  withoutEmail: number
  medianAge: number | null
  minAge: number | null
  maxAge: number | null
  birthdaysThisMonth: number
  birthdaysByMonth: { month: number; count: number }[]
  gender: { female: number; male: number; unknown: number }
  ageBuckets: {
    child: number
    youngAdult: number
    adult: number
    olderAdult: number
    senior: number
    unknown: number
  }
  areaCodes: { code: string; label: string; count: number }[]
  dataQuality: {
    missingEmail: number
    sharedPhone: number | null
    sharedEmail: number | null
    repeatedName: number | null
    typoEmailDomain: number | null
  }
}
```

Implementation rules:

- `totalPatients`, `withEmail`, `withoutEmail`, `birthdaysThisMonth`, gender counts, and age bucket counts must use Supabase count queries.
- `birthdaysByMonth` can use twelve count queries, one per month.
- `areaCodes` can use count queries for known prefixes first: `786`, `305`, `954`, `754`, `561`, then calculate `Other` as `totalPatients - knownPrefixTotal`.
- `medianAge`, exact duplicate counts, and typo-domain counts are allowed to be `null` in the first bite if they cannot be computed without a full row load or a database aggregate/RPC. The UI must show an unavailable state instead of triggering a full registry load.
- Do not add a Supabase RPC in this plan unless the user explicitly approves a database-level aggregate bite.

## Task 1: Add dashboard aggregate data module

**Files:**
- Create: `src/features/medical/data/patientDashboardCounts/index.test.ts`
- Create: `src/features/medical/data/patientDashboardCounts/index.ts`
- Create: `src/features/medical/data/patientDashboardCounts/types.ts`

- [ ] **Step 1: Write the failing test**

Create a test that mocks `@/shared/db` and verifies the module returns a complete `PatientDashboardCounts` object with no row arrays. The mock should prove these calls use `select('id', { count: 'exact', head: true })` instead of `.select('*')`.

Expected result shape:

```ts
expect(result).toEqual({
  totalPatients: 7101,
  withEmail: 4200,
  withoutEmail: 2901,
  medianAge: null,
  minAge: null,
  maxAge: null,
  birthdaysThisMonth: 314,
  birthdaysByMonth: expect.arrayContaining([{ month: 1, count: expect.any(Number) }]),
  gender: { female: expect.any(Number), male: expect.any(Number), unknown: expect.any(Number) },
  ageBuckets: {
    child: expect.any(Number),
    youngAdult: expect.any(Number),
    adult: expect.any(Number),
    olderAdult: expect.any(Number),
    senior: expect.any(Number),
    unknown: expect.any(Number),
  },
  areaCodes: expect.arrayContaining([{ code: '786', label: 'Miami-Dade', count: expect.any(Number) }]),
  dataQuality: {
    missingEmail: 2901,
    sharedPhone: null,
    sharedEmail: null,
    repeatedName: null,
    typoEmailDomain: null,
  },
})
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test src/features/medical/data/patientDashboardCounts/index.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement minimal count helpers**

Create `src/features/medical/data/patientDashboardCounts/index.ts` with small helpers. Keep each Supabase chain in named variables:

```ts
import { supabase } from '@/shared/db'
import { TABLES } from '@/shared/data/tables'

async function countPatients(apply?: (query: ReturnType<typeof supabase.from>) => unknown): Promise<number> {
  const table = supabase.from(TABLES.pacientes)
  const base = table.select('id', { count: 'exact', head: true })
  const result = apply ? await apply(base) : await base
  if (result.error) throw result.error
  return result.count ?? 0
}
```

Then implement `patientDashboardCounts()` with only count queries. Use existing columns from `Paciente`: `email`, `telefono`, `fecha_nacimiento`, and `genero`.

If `index.ts` grows toward the file-size ceiling, split month, age, or area helpers into the helper files listed in the File Structure section before continuing.

- [ ] **Step 4: Verify**

```bash
pnpm test src/features/medical/data/patientDashboardCounts/index.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/data/patientDashboardCounts/
git commit -m "feat(medical): count patient registry dashboard data"
```

## Task 2: Add dashboard aggregate hook

**Files:**
- Create: `src/features/medical/hooks/usePatientDashboardCounts/index.test.ts`
- Create: `src/features/medical/hooks/usePatientDashboardCounts/index.ts`

- [ ] **Step 1: Write the failing hook test**

Mock `patientDashboardCounts()` and assert:

```ts
expect(result.current.loading).toBe(true)
await waitFor(() => expect(result.current.loading).toBe(false))
expect(result.current.counts.totalPatients).toBe(7101)
expect(result.current.reload).toEqual(expect.any(Function))
```

- [ ] **Step 2: Run the failing test**

```bash
pnpm test src/features/medical/hooks/usePatientDashboardCounts/index.test.ts
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

The hook should:

- Start with a zero/empty count object.
- Load once on mount.
- Expose `{ counts, loading, error, reload }`.
- Never call `usePacientes()`.

- [ ] **Step 4: Verify**

```bash
pnpm test src/features/medical/hooks/usePatientDashboardCounts/index.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/hooks/usePatientDashboardCounts/
git commit -m "feat(medical): load patient dashboard aggregates"
```

## Task 3: Make the full patient registry lazy

**Files:**
- Modify: `src/features/medical/hooks/usePacientes.ts`

- [ ] **Step 1: Write or update hook tests if a test harness exists**

If there is an existing hook test pattern, add a test proving `listPacientes`, `listPacienteFuentes`, and `listPacienteContactos` are not called until the explicit loader runs.

- [ ] **Step 2: Remove mount-time load**

In `usePacientes.ts`:

- Remove the mount `useEffect` that calls `recargar()`.
- Change initial `loading` to `false`.
- Add `loaded` state.
- Add `ensureLoaded()` that calls `recargar()` only once unless a reload is requested.

- [ ] **Step 3: Preserve import behavior**

Keep `importarPacientes()` calling `recargar()` after writes, because import matching needs the full registry after import writes.

- [ ] **Step 4: Verify**

```bash
pnpm test src/features/medical
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/hooks/usePacientes.ts
git commit -m "feat(medical): lazy load patient registry"
```

## Task 4: Wire aggregates into Medical context

**Files:**
- Modify: `src/features/medical/hooks/useMedicalData.ts`

- [ ] **Step 1: Import the aggregate hook**

Import `usePatientDashboardCounts` and call it once inside `useMedicalData()`.

- [ ] **Step 2: Return both aggregate and explicit registry loader**

Return:

```ts
patientDashboard,
ensurePacientesLoaded,
pacientesLoaded,
pacientesLoading,
```

where `patientDashboard` is the hook return value and the other fields come from `usePacientes()`.

- [ ] **Step 3: Stop deriving Dashboard patient stats from arrays**

Do not expose new Dashboard stats based on `pacientes.length` or `pacientesActivos.length`. Those arrays remain for patient workflows.

- [ ] **Step 4: Verify**

```bash
pnpm test src/features/medical
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/medical/hooks/useMedicalData.ts
git commit -m "feat(medical): expose patient dashboard aggregates"
```

## Task 5: Rebuild DashboardTab from the patient-register reference

**Files:**
- Modify: `src/features/medical/components/DashboardTab.tsx`
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/es.json`
- Optional create: `src/features/medical/components/DashboardTab/index.module.css`
- Optional create: `src/features/medical/components/DataQualityRow/index.tsx`
- Optional create: `src/features/medical/components/DataQualityRow/index.module.css`

- [ ] **Step 1: Replace the KPI row**

Import existing shared pieces:

```ts
import { Panel, StatCard, BarChartCard, PieChartCard } from '@/shared/components/dashboard'
import { CHART_COLORS } from '@/shared/components/dashboard/theme'
```

Render four `StatCard`s:

- Registry patients.
- Email-reachable patients.
- Median age.
- Current-month birthdays.

Use `patientDashboard.counts`, not `pacientes`. Labels, footnotes, unavailable text, and chart titles must come from i18n keys, not inline string literals.

- [ ] **Step 2: Add reference charts using shared components**

Build chart arrays in `DashboardTab.tsx`:

```ts
const birthdayData = counts.birthdaysByMonth.map(({ month, count }) => ({ name: MONTHS[month - 1], value: count }))
const genderData = [
  { name: t('med.dashboard.genderFemale'), value: counts.gender.female },
  { name: t('med.dashboard.genderMale'), value: counts.gender.male },
  { name: t('med.dashboard.genderUnknown'), value: counts.gender.unknown },
].filter(item => item.value > 0)
const ageBucketData = [
  { name: '0-17', value: counts.ageBuckets.child },
  { name: '18-34', value: counts.ageBuckets.youngAdult },
  { name: '35-49', value: counts.ageBuckets.adult },
  { name: '50-64', value: counts.ageBuckets.olderAdult },
  { name: '65+', value: counts.ageBuckets.senior },
]
const areaData = counts.areaCodes.map(item => ({ name: `${item.code} ${item.label}`, value: item.count }))
```

Render:

- `BarChartCard` for birthdays by month.
- `PieChartCard` for gender split.
- `BarChartCard` for age buckets.
- `BarChartCard` with `vertical` for area-code concentration.

- [ ] **Step 3: Add data-quality panel**

Use `Panel` and a local inline row renderer for:

- Missing email.
- Shared phone if non-null, otherwise show an unavailable state.
- Shared email if non-null.
- Repeated name if non-null.
- Typo email domain if non-null.

Do not compute duplicate groups in the browser from loaded patients.

If the row renderer repeats JSX in a `.map()`, extract `DataQualityRow` as its own component folder before adding the panel.

- [ ] **Step 4: Keep existing operational widgets below the registry dashboard**

Keep today's appointments, HIPAA alerts, pending training, and recent PHI activity using existing Medical row components, but wrap their sections with `Panel` instead of new custom cards where practical.

When touching existing inline-style sections, either replace them fully with shared dashboard components or move the remaining layout into the optional CSS module. Do not add new inline style objects to `DashboardTab.tsx`.

- [ ] **Step 5: Verify Dashboard no longer needs patient arrays**

`DashboardTab.tsx` must not destructure `pacientes` or `pacientesActivos` from `useMedical()`.

- [ ] **Step 6: Verify**

```bash
pnpm test src/features/medical
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/medical/components/DashboardTab.tsx
git commit -m "feat(medical): render patient registry dashboard"
```

## Task 6: Load full registry only from patient workflows

**Files:**
- Modify: `src/features/medical/components/PacientesTab.tsx`
- Modify: `src/features/medical/components/PacientesImportModal/index.tsx`

- [ ] **Step 1: Load registry when PacientesTab opens**

In `PacientesTab.tsx`, call the explicit loader on mount:

```ts
useEffect(() => {
  void ensurePacientesLoaded()
}, [ensurePacientesLoaded])
```

Show the existing patient UI once the load is available; preserve current filters and patient rows.

- [ ] **Step 2: Load registry before import planning**

In `PacientesImportModal/index.tsx`, call the same explicit loader before rendering import planning content, because matching needs the complete registry and source identities.

- [ ] **Step 3: Verify**

```bash
pnpm test src/features/medical
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/medical/components/PacientesTab.tsx src/features/medical/components/PacientesImportModal/index.tsx
git commit -m "feat(medical): load registry from patient workflows"
```

## Task 7: Browser verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Open `/medical` on Dashboard**

Expected:

- Dashboard shows the patient-register KPIs and charts from this plan.
- Network does not show bulk reads for `pacientes`, `paciente_fuentes`, or `paciente_contactos`.
- Dashboard count/aggregate requests are visible instead.

- [ ] **Step 2: Open patient list and import modal**

Expected:

- The full registry loads only when entering the patient workflow.
- Import planning still has complete registry/source/contact data.

- [ ] **Step 3: Final gates**

```bash
pnpm test src/features/medical
pnpm typecheck
pnpm lint
pnpm lint:css
```

Expected: PASS.

## Self-Review

- The plan uses only `/home/wagner/Descargas/EMC/EMC_CRM_Registro_Pacientes.html` as the external functional reference.
- The plan reuses existing shared dashboard components and existing Medical row components.
- The plan does not import public marketing-site ideas, fake data, or unrelated features into Medical.
- The plan preserves the original performance goal: Dashboard uses count/aggregate reads and full registry loading stays explicit.
- Exact duplicate/median calculations are deliberately nullable unless implemented with a database aggregate approved in a separate bite.
