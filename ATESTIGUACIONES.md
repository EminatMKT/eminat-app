# Centinela attestations

| Project | File | Rule | Date | Reason |
| --- | --- | --- | --- | --- |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/PieChartCard/index.tsx` | `bloques-similares@6` | 2026-09-29 | Tried extracting the shared chart helper first; current dashboard pieces do not cover selectable donut slices with amount-formatted legend columns, and the central TODO tracks that abstraction. |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/LegendItem/index.tsx` | `familia-dispersa@5` | 2026-09-29 | Tried extracting the chart helper first; kept beside PieChartCard until the central TODO extracts the shared selectable-donut legend pattern. |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/LegendItem/index.tsx` | `bloques-similares@6` | 2026-09-29 | Searched StatCard, Panel and chart rows first; none matches this three-cell amount legend, and the central TODO tracks the shared chart abstraction. |
| `EminatMKT/eminat-app` | `src/shared/dedup/CompareField/MultiValueCompare/index.tsx` | `bloques-similares@7` | 2026-10-16 | Looked for a second fieldset+legend importer: EditUserModal.tsx needs an unbounded rewrite over its own archivo_extenso/style_inline debt, ListaRotulada has no visible legend, and ProjectsTab.tsx already exceeds archivo_indivisible's hard ceiling. |
| `EminatMKT/eminat-app` | `src/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/index.tsx` | `bloques-similares@7` | 2026-11-03 | Checked all 28 `src/shared/components/ui/*` entries and `src/features` for an existing dynamically-positioned time-block/card primitive with resize handles; none exists. A hover-only note was rejected: it breaks ihc.md "important information is not hover-only" and is unusable on touch. |
