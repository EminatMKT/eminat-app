# `actividades.fecha_inicio` — el período de imputación deja de ser un texto

**Fecha:** 2026-08-31 · **Módulo:** Stratix 360 (`/stratix-mkt`) · **Toca esquema de producción**

## El problema

`actividades.mes` es `text` y guarda `'Agosto'` — el mes sin el año. El reporte de pago filtra
con `act.mes === mes` (`src/features/stratix-mkt/report-filter.ts:16`), así que **el reporte de un
mes incluye ese mes de todos los años**. Hoy casi no se nota porque hay una sola temporada
cargada; en enero de 2027 el reporte de Enero va a sumar enero de 2026 y se va a leer como que la
persona trabajó el doble, no como un error. Sale impreso en un pago.

Alrededor de `mes` hay tres columnas más que se derivan de él o del calendario y aun así se
guardan aparte: `trimestre`, `semana` y `sheet_row`. Mientras estén, sólo pueden desincronizarse
— y ya lo hicieron.

## Lo que dicen los datos

Medido contra **producción** (`ruedelunbtaomhrzgelc`) el 31/08/2026, 329 filas:

| Hallazgo | Número |
|---|---|
| `trimestre` desincronizado de `mes` (Marzo marcado Q2) | **45 / 329** |
| Tareas creadas por la app (`sheet_row IS NULL`) donde el mes imputado ≠ mes de `created_at` | **0 / 78** |
| Filas migradas del Sheet que recuperan el año de `fecha_requerida` | **246 / 251** (todas 2026) |
| Filas migradas sin ninguna fecha de la que sacar el año | **5** |
| Filas con el año tipeado mal (`0206-03-23`) | **12** |
| `semana` con dato | 226 / 329 |

Dos conclusiones, y las dos gobiernan el diseño:

**El mes no es una decisión: es el calendario copiado a mano.** En las 78 tareas creadas por la
app, el mes imputado fue *siempre* el mes en que se creó la tarea. Cero excepciones. El selector
del formulario existe, es editable, y nadie lo usó nunca para elegir otra cosa. Por eso el
formulario pierde el campo: no se elige un dato que ya sabe el calendario.

**Pero `created_at` no puede ser la fuente.** Las 251 filas restantes entraron por la migración
del Google Sheet y tienen `created_at` en abril de 2026 — cuándo corrió esa migración, no cuándo
se hizo el trabajo. De ellas, 238 están imputadas a enero, febrero o marzo. Derivar el período de
`created_at` movería el 72% de la tabla a abril y dejaría el reporte de marzo en cero. Además
`created_at` es la marca de auditoría: la lee `actividadesRepo.list()` para ordenar el tablero y
la ficha para decir "Creada {fecha}". Reescribirla reordena el Kanban y hace que la ficha afirme
un día que nunca pasó.

## El diseño

Entra **`fecha_inicio date`**: cuándo empieza el trabajo de la tarea. `mes`, `trimestre`, `semana`
y `sheet_row` se borran. El mes del reporte de pago, el trimestre, el filtro y las gráficas se
**derivan** de ella.

```sql
fecha_inicio date NOT NULL DEFAULT CURRENT_DATE
```

### Por qué `fecha_inicio` y no `periodo`

La primera versión de este diseño proponía `periodo date` con el día fijo en 1 — un marcador de
período, no una fecha. Se descartó por tres razones:

1. **La convención de la tabla.** Ya existen `fecha_entrega`, `fecha_requerida` y
   `fecha_aprobacion`. `fecha_inicio` se lee sin que nadie lo explique; `periodo` necesitaba el
   comentario de la columna para entenderse.
2. **Guardar siempre el día 1 tira información** que de acá en adelante se tiene gratis.
3. **El Gantt no tiene dónde empezar la barra** y la finge hacia atrás desde `dias_produccion`
   (`GanttBar/index.tsx:25`, `Math.max(Number(a.dias_produccion) || 1, 1)`). Con una fecha de
   inicio real la barra es inicio → entrega, que es lo que un Gantt es.

El argumento a favor de `periodo` era separar el **hecho** (cuándo empezó) de la **decisión** (a
qué mes se paga), para poder re-imputar una tarea a otro mes sin mentir sobre su inicio. Es una
distinción real —la contabilidad la hace entre fecha de operación y fecha contable— pero los datos
dicen que **ese caso no ocurrió nunca**: 78 de 78. Era pagar un nombre opaco y un día tirado para
proteger algo que no existe. Si aparece, ahí se agrega `periodo`; no antes.

### La regla de backfill

Dos casos, y la diferencia entre ellos es lo único delicado:

| Filas | `fecha_inicio` |
|---|---|
| **78** creadas por la app | día 1 del mes que declaraba `mes` **(ver abajo)** |
| **251** migradas del Sheet | día 1 del mes que declaraba `mes` |

O sea: **una sola regla para las 329**, el día 1 del mes imputado, con el año sacado de
`fecha_requerida` → `fecha_entrega` → 2026.

```
fecha_inicio = make_date(año, numero_de_mes(mes), 1)
```

**Por qué el día 1 y no `fecha_requerida`, que existe en 246 filas.** Porque ~16 de ellas tienen
`fecha_requerida` en un mes distinto del que declaraban (una del 27 de febrero imputada a Marzo).
Usarla las movería de mes de pago y cambiaría cifras que Freddy ya vio. El día 1 se lee como
"marzo, día desconocido" — impreciso, pero nunca de otro mes. **De acá en adelante la columna
guarda el día real**, que es el punto de haberla llamado así.

Las 5 filas sin ninguna fecha caen en 2026, que no es inventar: toda la base arranca en enero de
2026 y no hay otro año en ningún registro.

### Fase 1 — una migración, sin pérdida

1. `alter table actividades add column fecha_inicio date`
2. Corregir los 12 años tipeados mal **en `fecha_requerida` y `fecha_entrega`**, no sólo al
   calcular `fecha_inicio`. Si el typo queda, el Gantt sigue dibujando esas tareas en el año 206.
3. Backfill de las 329 con la regla de arriba.
4. `not null` + `default CURRENT_DATE`.

`mes`, `trimestre`, `semana` y `sheet_row` **siguen en la tabla**, sin que el código las lea. El
código escribe `fecha_inicio` y `mes` (las dos) y lee sólo `fecha_inicio`.

Por qué en dos fases: el `CLAUDE.md` de este repo lo dice — *"No hay ensayo intermedio. Sin el
proyecto dev, una migración va de local directo a prod."* Durante la fase 1, `mes` es el testigo:
el backfill se verifica en prod con un `SELECT` que compara el mes de `fecha_inicio` contra `mes`,
sobre datos reales, y volver atrás es revertir código, no restaurar la base. La fase 1 **es** el
ensayo que no existe.

**Criterio para pasar a la fase 2:** en prod, el `SELECT` de desviadas da cero, y sale un ciclo de
reporte de pago real con las cifras esperadas.

### Fase 2 — el drop

`drop column mes, trimestre, semana, sheet_row`, y el código deja de escribir `mes`. Caen con
ellas los `CHECK` de `mes`, `semana` y `trimestre`.

### Qué se deriva ahora, y de dónde

| Antes | Después |
|---|---|
| `mes` (`'Agosto'`) | mes de `fecha_inicio`, formateado por `Intl` según el idioma |
| `trimestre` (columna) | `Math.floor((mes - 1) / 3) + 1` sobre `fecha_inicio` — función pura, con test |
| `semana` (columna) | **se borra sin reemplazo** (ver abajo) |
| `sheet_row` | se borra — resto de la migración del Sheet |

`semana` sale sin reemplazo por decisión explícita: no la lee ningún filtro ni el reporte, es un
campo de sólo lectura en la ficha heredado del Sheet, y para las 251 filas históricas —cuyo
`fecha_inicio` es el día 1— derivarla daría "S1" para todas, que es peor que no mostrarla. Muere
la columna y muere la fila de la ficha.

### Código a tocar

| Archivo | Qué cambia |
|---|---|
| `src/shared/constants/domain.ts` | `mesATrimestre` se borra; `MESES`/`MESES_Q` quedan (los usa Cobranzas) |
| `src/shared/context/loadAppData.ts` | el tipo `Actividad`: `mes`/`trimestre`/`semana` → `fecha_inicio` |
| `src/shared/data/actividades.ts` | el comentario de `updateFecha` que protege `mes`/`trimestre` |
| `src/features/stratix-mkt/report-filter.ts` | `act.mes === mes` → comparación de la clave `'YYYY-MM'` |
| `.../utils/act-filters/index.ts` | `trimestreDe` deriva; el filtro de mes lleva año |
| `.../utils/act-detail-fields/grupos/periodo.ts` | tres campos pasan a dos |
| `.../utils/act-form.ts`, `hooks/useActividadForm/` | se va el `mes` del formulario |
| `.../hooks/useReporte/`, `useKanban/`, `useTablero/` | criterios y agrupaciones por `fecha_inicio` |
| `.../components/modals/ActivityNumeros/` | **se borra el `<select>` de mes** |
| `KanbanTaskCard`, `TaskTableRow`, `report-html`, `OverviewTab`, `ReporteTab` | muestran el período derivado |

El formateo va con `Intl` a través de `useT().intlLocale`, como ya hace `fechaCorta`
(`src/shared/utils/dates/index.ts`). Tests afectados: `report-filter.test.ts`,
`act-filters/index.test.ts`, `act-form.test.ts`, `act-detail-fields/index.test.ts`.

## Qué va a ver distinto la gente

- **El selector de mes desaparece del formulario de nueva tarea.** Es el punto de todo esto.
- **El filtro de trimestre corrige 45 filas.** Tareas de marzo que estaban marcadas Q2 pasan a
  Q1. Se va a leer como que algo se rompió; es la columna que estaba mal.
- **El mes deja de salir en español con la app en inglés.** Hoy `{a.mes}` imprime `'Agosto'`
  siempre. Con una fecha, `Intl` dice "August".
- **La hoja del reporte deja de tener el año escrito a mano.** `ReporteTab:66` imprime
  literalmente `{mesReporte} 2026`.
- **La ficha pierde la fila "Semana"**, gana "Inicio" y conserva "Trimestre".
- **Las 251 tareas históricas muestran el día 1 como inicio.** Es un marcador, no un dato real, y
  sólo aplica a lo migrado del Sheet.

## Prueba

El reporte se prueba con las **71 tareas de agosto ya cargadas en prod** — no hace falta inventar
datos, que es la regla de `rules/base-de-datos.md`. En local se restaura un dump de prod (la copia
local está en 266 filas, vieja) y se corre el reporte de agosto antes y después de la migración:
las horas y los días de producción por miembro tienen que dar idénticos, porque agosto es el único
mes que hoy no está contaminado por el bug del año.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El backfill imputa mal alguna fila | `mes` queda como testigo toda la fase 1; se compara en prod, y la migración aborta si no coincide |
| Las 5 filas sin fecha caen en el 2026 equivocado | No hay otro año en toda la base; el error posible es cero |
| El día 1 de las 251 históricas se lee como un dato real | Sólo afecta a lo migrado del Sheet, y la alternativa (`fecha_requerida`) movía ~16 filas de mes de pago |
| Una tarea cargada tarde imputa al mes equivocado | `fecha_inicio` es editable en la ficha, a diferencia de `created_at`. Nunca pasó en 78 de 78 |
| Una migración a prod sin ensayo | La fase 1 es el ensayo. Backup + precheck de `rules/base-de-datos.md` antes de cada `db push` |

## Fuera de alcance

- **El Gantt honesto** (barra inicio → entrega en vez de la estimación hacia atrás desde
  `dias_produccion`). Este cambio lo destraba; es su propio ítem.
- **La papelera de 30 días** para el borrado de tareas (decidida el 25/08, sigue pendiente).
- **`actividades.estado` desfasado del catálogo** — el `CHECK` tiene seis valores y `ESTADO` en
  `domain.ts` declara cuatro. Se encontró al lado de esto, es otra decisión.
- **El selector de miembro del reporte de pago**, que sigue siendo sólo-admin desde el cambio del
  31/08. Es una decisión sobre quién ve la plata de quién, no sobre el período.
