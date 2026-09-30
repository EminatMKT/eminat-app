# Centinela attestations

| Project | File | Rule | Date | Reason |
| --- | --- | --- | --- | --- |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/PieChartCard/index.tsx` | `bloques-similares@6` | 2026-09-29 | Tried extracting the shared chart helper first; current dashboard pieces do not cover selectable donut slices with amount-formatted legend columns, and the central TODO tracks that abstraction. |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/LegendItem/index.tsx` | `familia-dispersa@5` | 2026-09-29 | Tried extracting the chart helper first; kept beside PieChartCard until the central TODO extracts the shared selectable-donut legend pattern. |
| `EminatMKT/eminat-app` | `src/shared/components/dashboard/LegendItem/index.tsx` | `bloques-similares@6` | 2026-09-29 | Searched StatCard, Panel and chart rows first; none matches this three-cell amount legend, and the central TODO tracks the shared chart abstraction. |
