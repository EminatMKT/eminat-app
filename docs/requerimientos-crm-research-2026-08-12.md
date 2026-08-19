# CRM de Research — requerimientos de la reunión del 12/08/2026

**Participantes:** Federico Salviche (Director of Site Strategy & Partnerships, negocio) y Wagner
Dueñas (desarrollo). El operador del proceso es **Royner**.

**Fuentes contrastadas:** grabación de la reunión (`INDUCACIONES DEL CRM PARA REDEARCH.m4a`,
25:32, transcrita con faster-whisper large-v3), notas automáticas de Gemini, y el correo previo
de Federico con la tabla de ejemplo. Donde las tres difieren, manda la grabación; las
discrepancias están marcadas abajo.

## El problema que origina el pedido

Royner trabaja **fuera del CRM**: busca estudios en clinicaltrials.gov, se queda con los que
tienen NCT#, y manda los correos a mano desde su cuenta de Eminat. La cadencia es de tres toques
— correo, recordatorio a los 3 días, otro a los 2 días. Al final de la semana entra al CRM a
registrar lo que hizo.

El resultado es que el dashboard muestra **81 leads únicos** cuando el esfuerzo real fueron
**~165–170 alcances**. El negocio no ve ese trabajo.

> "quiero que refleje al negocio que sí, de todo lo que enviamos, no nos han respondido la mitad"

Automatizar el envío se descartó explícitamente para esta etapa: *"asumo que se podrá hacer a
futuro, pero hoy en día lo lleva manual"*. El contador es **registro retroactivo**, no un
side-effect de enviar un correo desde la app.

## Prioridad 1 — Contador de seguimiento (`email_count`)

Lo único con fecha comprometida. En el correo de Federico el campo se llama **`Email Count`** y
se lleva **por NCT#**.

| Aspecto | Decisión |
|---|---|
| Dónde | Columna nueva en la tabla de leads + campo en el **Lead Form** (el correo lo pide explícito) |
| Cómo se edita | Click → **pop-up** → incrementar el contador **o** escribir el número directo → confirmación |
| Por qué el pop-up | Requisito explícito, no adorno: *"se te va el dedo y se pierde la trazabilidad"* |
| Granularidad | Correos **por estudio**. Sin direcciones de correo ni fecha por intento (discutido y cerrado en la reunión) |

Impacto en el código actual:

- `research_leads` necesita la columna `email_count` (migración).
- `features/research/types.ts` → agregar `email_count?: number` a `Lead`.
- `features/research/utils/fields.ts` → nuevo `LeadFieldDef` en el grupo `Seguimiento`. **Ojo:**
  `LeadFieldType` no tiene `'number'`, hay que agregarlo.
- `features/research/components/leads/LeadRow.tsx` + `LeadsTab.tsx` → la celda con el botón.
- Modal de confirmación nuevo (hay precedentes en `components/leads/`).

## Prioridad 2 — Búsqueda y filtros en Leads

- **Barra de búsqueda por NCT#** — Royner llega con su lista y pega el NCT.
- **Filtro por rango de fechas de carga** (`date_added`): *"quiero buscar solamente los que subí
  de la semana tal a tal"*.
- Idea mencionada, **no comprometida**: dejar elegir qué filtros se muestran.

Impacto: `features/research/utils/filters.ts` ya centraliza los filtros en `LEAD_FILTERS` y agregar uno
es editar el array. Pero el `FilterDef` actual es `options` + `match(lead, value: string)` — un
**rango de fechas no entra en esa forma** y la barra de búsqueda libre tampoco. Hay que extender
el tipo, no solo agregar una entrada.

## Prioridad 3 — Indicadores del dashboard

Hoy `DashboardTab.tsx` tiene 4 cards en este orden: **Total Leads · Nuevo · Contactado · Ganado**.

Cambios pedidos, de izquierda a derecha por prioridad de lectura:

| # | Card | Estado hoy |
|---|---|---|
| 1 | **# of emails / cadencia** — total de correos + desglose de leads con 1, 2 o 3 toques | No existe |
| 2 | **Sin respuesta** | Solo está en el pie de abajo, **sin card** |
| 3 | **Contactado** (leads con ≥1 correo, sin importar cuántos) | Existe |
| 4 | **Mes / fecha de registro** (`date_added`) | No existe (viene del correo, no salió en la reunión) |
| 5 | **# de IDs únicos** (`nct_number`) — el "Total Leads / 81" | Existe pero **está primero**; va **al extremo derecho** |

El desglose por cadencia (1, 2, 3 toques) sale del correo y es un requisito distinto del total de
correos — no confundirlos.

## Prioridad 4 — Especialidad, sponsor y fase (explícitamente NO prioritario)

Vistas de resumen por **especialidad médica**, **sponsor (farmacéutica)** y **fase del estudio**.
El uso es externo, comercial:

> "si yo voy a una conferencia y me siento con AstraZeneca, yo le voy a dar más información
> actual de la que ellos puedan tener"

Objetivo textual: *"AstraZeneca tiene alrededor de 10 estudios, 5 en esta condición y 5 en esta
otra, y todos son fase 3"*.

Problema conocido y aceptado: los nombres de condición **no son estándar** y derivar la
especialidad del título es frágil (errores de tipeo, nombres no idénticos). Salidas acordadas en
orden de preferencia:

1. Que el servicio de clinicaltrials.gov provea el dato.
2. Si no, **columna `especialidad`** que Royner llena a mano.
3. Si la condición complica demasiado, *"no la agregues"* — quedarse solo con el conteo por
   sponsor.

Nota: `BarChartCard "Leads by Phase"` ya existe en el dashboard, y `Top Sponsors` existe pero está
comentado desde la reunión del 20/07/2026. Parte de esto puede ser restaurar, no construir.

### Averiguado el 18/08/2026 — qué provee realmente la API de clinicaltrials.gov

Resuelve la salida 1 de arriba: **la API NO tiene campo `specialty`** (verificado contra el
esquema completo en `/api/v2/studies/metadata`). Pero la especialidad **se puede derivar** de un
dato que sí trae y que hoy no estamos bajando.

**Qué trae** — `derivedSection.conditionBrowseModule`:

| Campo | Qué es | Sirve |
|---|---|---|
| `meshes[]` | La condición normalizada al diccionario MeSH (id + término). "Breast Cancer", "Breast Carcinoma" y "CA de mama" → todas `D001943` | ✅ Resuelve el problema de nombres no estándar |
| `ancestors[]` | La cadena de ancestros MeSH, que sube hasta ~26 categorías raíz (`Neoplasms`, `Cardiovascular Diseases`, `Endocrine System Diseases`…) | ✅ **Esa raíz es el proxy de especialidad**, mapeable ~1:1 |
| `browseLeaves` / `browseBranches` | Serían la clasificación en ramas ya hecha | ❌ Declarados en el metadata pero **vuelven vacíos** en todas las respuestas probadas (`fields=DerivedSection`, path punteado y nombres legacy). No usar |

**Dos límites, medidos sobre 50 estudios reales `RECRUITING` con sponsor `INDUSTRY`:**

1. **12/50 (24%) no traen ningún MeSH** → ahí no hay nada que derivar. No es al azar: son los
   registrados más recientemente (mediana 2025 vs 2024 en los que sí traen) porque CT.gov tarda en
   catalogarlos. Es justo la población que rastrea Royner.
2. **22/50 (44%) caen en más de una especialidad.** Cáncer de mama sube por `Neoplasms` +
   `Skin Diseases` + `Female Urogenital Diseases` + `Endocrine System Diseases`. Hace falta una
   **regla de prioridad** (ej. si aparece `Neoplasms`, gana oncología), no una lista.

**Salida recomendada: 1 + 2, no una u otra.** Derivar de MeSH cuando viene (3 de cada 4) y dejar
igual la columna `especialidad` editable, para el cuarto que queda vacío y para corregir cuando la
derivación pifie. La salida 1 sola deja el 24% en blanco; la 2 sola le carga a Royner trabajo
manual que la máquina hace en el 76%.

**Costo de implementación:** `features/research/utils/clinicalTrials.ts` pide hoy solo
`fields=protocolSection`, así que no baja `derivedSection` — hay que agregarlo al fetch, más una
tabla de ~26 raíces MeSH → especialidad, la regla de prioridad y la columna editable.

**Sponsor y fase no necesitan nada.** Ya se importan limpios de CT.gov y están en la base
(`lead_sponsor`, `sponsor_type`, `phase`). La vista *"AstraZeneca tiene 10 estudios, todos fase 3"*
es mostrar lo que ya hay.

**Estado: NO implementar antes del 28/08.** Sigue siendo Prioridad 4.

## Visualización

- **Selector absolutos / porcentaje** en los indicadores, **por defecto absolutos**. Ideal: los
  dos valores uno al lado del otro. Caso de uso: exposiciones a Javier y Viviana.
- **Pie relleno** en vez de dona, con el porcentaje adentro. Hoy `StagePieChart.tsx` tiene
  `innerRadius={45}`.
- **Leyenda más grande y al lado derecho.** Hoy va centrada abajo. El motivo es literal: se
  presenta en la sala de conferencias y *"todo el mundo está ciego"*.

## ⚠️ Punto ABIERTO — etapas del pipeline (NO implementar todavía)

Etapas actuales (`features/research/constants.ts`, union canónica en `types.ts`):
`Nuevo` · `Contactado` · `Ganado` · `Sin respuesta`.

Lo que se discutió **sin cerrar**:

1. Renombrar `Nuevo` → `No contactado`, porque "nuevo" no describe un estado sino una tanda de carga.
2. **El solapamiento sin resolver:** `Contactado` y `Sin respuesta` no son excluyentes — *"por
   defecto al contactar a alguien no tienes respuesta; la única manera de cambiar de estado es
   que te contesten"*.
3. Se propuso un estado `Rechazado` que hoy no existe.
4. **Falta la regla temporal:** tras cuántos días un `Contactado` pasa a `Sin respuesta`. Se
   habló de ~1 semana (3+2 de recordatorios), no se decidió.

Cierre real de la discusión en la grabación: se dejan **las 4 etapas actuales tal cual** y
Federico **manda un correo aparte** con las convenciones.

> **Discrepancia con las notas de Gemini.** Gemini lista bajo "Decisiones · Acordada" que las
> etapas "se redefinirán a: No contactado, Contactado, Ganado y Sin respuesta" y que "Sin
> respuesta servirá como el equivalente a Rechazado". **Eso no fue acordado en la reunión.** El
> propio Gemini se contradice: en "Próximos pasos" le asigna a Federico *"Definir las
> convenciones internas para las etapas y comunicárselas a Wagner"*.
>
> No es un matiz de redacción: renombrar `Nuevo` implica migrar datos de `research_leads.stage`
> y tocar la union canónica `Stage`. **No se toca hasta que llegue el correo de Federico.**

## Fechas

- Arranque: la semana del 17/08/2026 (Wagner venía con otro módulo).
- **Presentación objetivo: ~28/08/2026.** Recapitulación en la semana del 24.
- Lo único que tiene que estar para esa fecha: **el contador y su indicador**.

## Cabos sueltos

- El correo de Federico con las convenciones de etapas (pendiente de su lado).
- Feedback de Royner sobre la columna `Email Count` de la tabla del correo — Federico se lo pidió
  y no consta que haya llegado.
