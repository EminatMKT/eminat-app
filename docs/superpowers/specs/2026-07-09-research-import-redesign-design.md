# Rediseño de la ventana de importación de leads (Research)

**Fecha:** 2026-07-09
**Rama:** `fix/research-lead-form-campos-validaciones` (o rama nueva desde ella)
**Estado:** diseño aprobado, pendiente de plan de implementación

## Problema

La importación actual (`features/research/components/leads/ImportModal.tsx`, 99 líneas) es de un
solo paso y tiene tres carencias:

1. **Siempre inserta.** Reimportar el mismo archivo duplica todos los leads. No hay match contra
   lo existente.
2. **Mapeo silencioso.** Los headers se auto-mapean vía `leadColumnFor`; los que no se reconocen
   se descartan sin avisar. El usuario no puede corregir un match ni ver qué se ignoró.
3. **Separador fijo (coma) y formato engañoso.** El input dice aceptar `.xlsx/.xls` pero solo lee
   texto plano — un Excel binario se rompe.

## Objetivo

Rediseñar el modal inspirándose en el diálogo de importación de Anki: separador elegible,
preview, manejo de duplicados por NCT#, y field mapping manual columna→campo.

## Decisiones (tomadas en brainstorming)

| Decisión | Elección |
|---|---|
| Duplicados | Match por `nct_number`: **Actualizar / Saltar / Duplicar** |
| Field mapping | Auto-detecta + **override manual por columna** (con opción "Ignorar") |
| Formatos | **CSV / TSV texto**, separador elegible (`, ; \t :`). Sin xlsx binario, sin deps nuevas |
| Layout | **Panel único con scroll** estilo Anki, botón Import arriba a la derecha |
| Backend | **Match client-side**. Sin migración, sin constraint UNIQUE. Reusa `insertLeads` + `updateLead` |

Se descartó el upsert nativo de Postgres (requeriría UNIQUE en `nct_number`, pero hay leads sin
NCT# y posibles duplicados legítimos → rompería datos; además "Saltar" no es upsert nativo).

## Arquitectura

El estado de `useResearchData` ya tiene **todos** los leads en memoria (`leads`), así que el match
contra lo existente es client-side y gratis: no hay fetch extra ni cambio de esquema.

Se separa el parsing y la planificación (puros, testeables) de la UI (dumb, solo dibuja el plan).

### Módulos nuevos

**`features/research/csv.ts`** — parsing sin React. Mueve el `parseCsvRow` quote-aware que hoy vive
inline en `ImportModal` y lo generaliza a cualquier separador.

- `detectSeparator(headerLine: string): string` — adivina entre `, ; \t :` contando ocurrencias
  fuera de comillas en la primera línea. Default `,` si empatan o no hay señal.
- `parseDelimited(text: string, sep: string): { headers: string[]; rows: string[][] }` — normaliza
  `\r\n?` → `\n`, filtra líneas vacías, parsea respetando comillas y `""` escapadas.

**`features/research/importPlan.ts`** — planificación pura.

- `guessMapping(headers: string[]): (string | null)[]` — por cada header, su columna real (string)
  vía `leadColumnFor` (normalizando `lower/trim`, espacios→`_`, quita `#`); `null` = Ignorar.
- `buildImportPlan(input): ImportPlan` donde:
  ```ts
  input = {
    rows: string[][],
    mapping: (string | null)[],       // columna real por índice de columna; null = ignorar
    existingByNct: Map<string, string>, // nct_number normalizado → lead.id
    dupMode: 'update' | 'skip' | 'duplicate',
  }
  ImportPlan = {
    toInsert: Record<string, any>[],
    toUpdate: { id: string; values: Record<string, any> }[],
    skipped: number,
  }
  ```
  - Cada fila → objeto usando `buildLeadPayload`/`coerceLeadValue` de `fields.ts`
    (celda vacía → `null`; checkbox → bool; columnas desconocidas descartadas).
  - Match key = `nct_number` normalizado (`trim().toUpperCase()`). Fila **sin** NCT# nunca matchea
    → siempre `toInsert`.
  - Modo `update`: matcheada → `toUpdate`; no matcheada → `toInsert`.
  - Modo `skip`: matcheada → `skipped++`; no matcheada → `toInsert`.
  - Modo `duplicate`: ignora el match → todas a `toInsert`.

### Rework

**`ImportModal.tsx`** — panel único con scroll:

- **Archivo:** dropdown separador (pre-seleccionado por `detectSeparator`) + preview de las
  primeras 5 filas parseadas con el separador elegido. Cambiar el separador re-parsea.
- **Duplicados:** `<select>` Actualizar / Saltar / Duplicar.
- **Mapeo de columnas:** una fila por columna del CSV — `header → <select con los 29 campos +
  "Ignorar">`, pre-seleccionado por `guessMapping`. Cambiar un select recalcula el plan.
- **Resumen vivo:** "N nuevos · M a actualizar · K saltados", recomputado en cada cambio de
  separador / mapeo / modo.
- **Botón Import** en el header, deshabilitado si 0 columnas mapeadas.
- Todo el texto vía `t()`.

**`useResearchData.confirmImport`** — cambia de firma: recibe el `ImportPlan` ya armado (el modal
lo construye) en vez de un array crudo.

- `insertLeads(plan.toInsert)` (con `.select()` para recuperar filas).
- `Promise.all(plan.toUpdate.map(u => updateLead(u.id, u.values)))`.
- Patchea `leads` en estado: prepend de los insertados + reemplazo in-place de los actualizados.
- Mensaje: `"{X} importados, {Y} actualizados, {Z} saltados"`.

### i18n

Nuevas claves `research.import.*` en `es.json` y `en.json` (a la par): título, separador y sus
nombres, duplicados y los 3 modos, encabezado de mapeo, "Ignorar", plantilla del resumen, botón
Import. `es.json` es la fuente; `en.json` debe cubrir el mismo set (validado por el
`satisfies Record<I18nKey,string>`).

## Manejo de errores

- Archivo vacío o < 2 líneas → `mostrarMensaje('error', ...)`, no abre preview.
- Ninguna columna mapeada → botón Import deshabilitado (no es error, es guía).
- Separador que colapsa todo en 1 columna → visible en el preview; el usuario cambia el dropdown.
- Error de insert/update de Supabase → mensaje de error, no cierra el modal.

## Testing

- **`csv.test.ts`:** `detectSeparator` (coma vs `;` vs tab vs `:`, empate → coma); `parseDelimited`
  con comas y comillas escapadas dentro de campos, CRLF, líneas vacías.
- **`importPlan.test.ts`:** `guessMapping` (header amigable, header real, desconocido → null);
  `buildImportPlan` en los 3 modos — `update` matchea por NCT# y separa insert/update, `skip` cuenta
  `skipped` y no toca lo existente, `duplicate` manda todo a insert; fila sin NCT# siempre insert.

## Fuera de alcance (YAGNI)

- Parsing de `.xlsx` binario (SheetJS ~500KB). El export de la app y "Guardar como CSV" cubren el caso.
- Toggle "Allow HTML", tags de Anki, "Note Type/Deck" — conceptos de Anki sin análogo en leads.
- Deshacer una importación. Preview + resumen vivo cubren la verificación previa.
