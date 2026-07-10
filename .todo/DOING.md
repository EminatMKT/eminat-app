# En progreso — Eminat App

_Última actualización: 2026-07-09_

- [ ] **[Research] Unificar campos del lead: form completo + validaciones + export/import paridad** — 🔄 rama `fix/research-lead-form-campos-validaciones`. El form/export/import usaban nombres amigables (`email`, `nct`…) ≠ columnas reales → save manual roto, edición y detalle mostraban vacío, export/import cubrían 17 de ~30 columnas. Fix: `features/research/fields.ts` como fuente única (`{column,label,type,group,required}`); form completo agrupado (Estudio/Contacto/Seguimiento) con input por tipo + validación (email/url/fechas + obligatorios official_title/stage/nct-o-contacto); `saveLead` guarda con columnas reales; export/import derivan de fields. `owner_email` excluido (columna muerta: 0/105 en prod, sin uso). _(creado por: EminatMKT · 2026-07-09)_

  Trabajo adicional YA HECHO en la misma rama (commits `9a0a3e7..0bffaec`):
  - **i18n del form/detalle de leads** (labels, grupos, validación) — es/en a la par.
  - **Autocompletado NCT# desde ClinicalTrials.gov** (`features/research/clinicalTrials.ts` + `handleNctBlur`) — merge no destructivo de vacíos. ⚠️ pisa campos con valor al editar → ver Q1 nuevo.
  - **Rediseño de la ventana de importación estilo Anki** (SDD, ver `docs/superpowers/{specs,plans}/2026-07-09-research-import-redesign*`): `delimited.ts` + `importPlan.ts` (puros, testeados), `ImportModal.tsx` reescrito (separador auto+elegible, preview, mapeo por columna con Ignorar, duplicados update/skip/duplicate por NCT#, resumen vivo), `confirmImport(plan)`. Suite 80/80, tsc 0. Fix de hooks condicionales (crash "more hooks") ya aplicado.

  **GATES PENDIENTES antes de cerrar la rama:**
  - [ ] **Smoke test en navegador** de la importación: `/research` → Leads → Import. Verificar sobre todo que **reimportar el mismo CSV en modo "Actualizar" NO duplique** leads, y que cambiar el separador re-adivine el mapeo.
  - [ ] **Abrir PR `fix/research-lead-form-campos-validaciones` → `development`** (incluye unificación de campos + i18n + NCT autocomplete + rediseño import).
