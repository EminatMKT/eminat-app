# En progreso — Eminat App

_Última actualización: 2026-07-09_

- [ ] **[Research] Unificar campos del lead: form completo + validaciones + export/import paridad** — 🔄 rama `fix/research-lead-form-campos-validaciones`. El form/export/import usaban nombres amigables (`email`, `nct`…) ≠ columnas reales → save manual roto, edición y detalle mostraban vacío, export/import cubrían 17 de ~30 columnas. Fix: `features/research/fields.ts` como fuente única (`{column,label,type,group,required}`); form completo agrupado (Estudio/Contacto/Seguimiento) con input por tipo + validación (email/url/fechas + obligatorios official_title/stage/nct-o-contacto); `saveLead` guarda con columnas reales; export/import derivan de fields. `owner_email` excluido (columna muerta: 0/105 en prod, sin uso). _(creado por: EminatMKT · 2026-07-09)_
