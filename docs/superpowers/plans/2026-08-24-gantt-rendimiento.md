# Gantt de Stratix — rendimiento y saneamiento de fechas

> **Para agentes:** usar `superpowers:subagent-driven-development` o `superpowers:executing-plans`.
> Los pasos usan checkbox (`- [ ]`).

**Goal:** que una fecha mal cargada no pueda volver a congelar la app, y corregir las seis filas
que hoy la congelan.

**Arquitectura:** el cálculo del eje temporal sale de `GanttChart` y pasa a una función pura
testeable (`utils/gantt-rango/`) que descarta fechas absurdas y acota el total de días. El
componente pasa a consumirla y a **decir en pantalla** cuántas tareas dejó fuera. Después se
corrigen los datos de producción y se cierra la puerta de entrada con `min`/`max` en el date.

**Tech Stack:** Next 14 · TypeScript · vitest · Supabase (PostgREST + psql en Docker)

**Spec:** este documento. El diagnóstico completo está abajo, en *Contexto*.

## Estado — 24/08/2026, al cierre

**Ejecutado.** Tasks 1, 2, 3, 5 y 6 hechas; la Task 4 se descartó (ver más abajo). Va en el
PR #52.

Lo que se hizo **de más** respecto a lo planeado, y por qué:

| No estaba en el plan | Por qué apareció |
|---|---|
| `TaskTable` (extraído de `SolicitudesListView`) | El aviso necesitaba listar tareas y la tabla estaba embebida en Requests. Copiarla habría dejado dos que se arreglan por separado |
| `WarningCallout` en `shared/components/ui/` | El aviso del plan era markup suelto dentro de `GanttChart`. Al nombrarlo en voz alta no aparece "Gantt": es compartido |
| `fechaEnRango` / `limitesFecha` | El plan calculaba el rango pero seguía dibujando `actsGantt` entero: el aviso contaba 6 y la pantalla mostraba 6 filas vacías. Hacía falta un predicado único |
| `actividadesRepo.updateFecha` + campo editable | El aviso decía "corregí la fecha" y la app no lo permitía. Sin esto, el mensaje prometía algo que no existía |

Lo que el plan **no previó**: `new Date('2021-01-01')` se parsea en UTC y `getFullYear()` lee en
local, así que en UTC-5 el 1 de enero caía al año anterior y descartaba una fecha válida. Lo
encontró el test de bordes de la Task 1 al escribirlo, no la implementación.

**Medido con los datos reales de prod copiados a local:** 664.781 → 1.147 nodos, 119.797 ms →
197 ms de bloqueo. **No verificado en producción todavía**: el fix no está desplegado, y las
mediciones de "después" son locales.

## Global Constraints

- `any` está prohibido (`no-explicit-any: error`). Usar `Pick`/`Omit`/`Partial`/`unknown`.
- Todo texto visible sale de `useT()`/`t()`, con la clave en `es.json` **y** `en.json`.
- Un módulo testeable es una carpeta: `index.ts` + `index.test.ts`.
- Nada de `../../`: importar con `@/features/...` o `@/shared/...`.
- Prohibido `supabase db reset`. Para local: `pnpm supabase migration up`.
- Antes de tocar dev o prod: **backup y precheck, en ese orden**. `pg_dump` corre **dentro del
  contenedor** (el del host es v14, el servidor es v17).
- Se stagea por ruta y la ruta va **también** en el `git commit`.
- Verificación: `npx tsc --noEmit` y `npx vitest run`. Para build, `pnpm build:check` (nunca
  `next build` con el dev server levantado).

## Contexto — qué se midió

Producción (`app.stratixsolutions.us`), **una** navegación a `/stratix-mkt`:

| | |
|---|---|
| heap | 6 MB → **1.177 MB** |
| long tasks | 10 |
| bloqueo del main thread | **119,8 s** (la peor: 56 s) |

`GanttChart/index.tsx:20-27` arma el eje sin acotarlo y renderiza un `<DayHeader/>` por día.
`MAX_BARRAS = 40` limita las barras, **nada** limita los días. En prod hay **6 actividades con
`fecha_entrega = '0206-03-23'`** (typo de "2026"), así que el rango va del año 206 al 2026:

```
totalDias = 664.781   →  664.781 componentes <DayHeader/>
```

Y cada `GanttBar` recibe `--ancho: dias * DIA_W` = 664.781 × 44 = **29.250.364 px** de ancho.

Las 24 actividades con `fecha_entrega` NULL **no participan**: `ganttActs`
(`useStratixData.ts:267`) ya las filtra. No hay nada que decidir sobre ellas.

Filas culpables en prod:

```
0206-03-23  262683bc  "Revisar mensajes"          [Completado]
0206-03-23  0c1022f4  "Subir video a tiktok"      [Completado]
0206-03-23  528fb12d  "Revisar mensajes"          [Completado]
0206-03-23  44bad3b4  "Revisar mensajes"          [Completado]
0206-03-23  144cd739  "Contenido del cronopost"   [Completado]
0206-03-23  c40501a4  "Contenido del cronopost"   [En proceso]
```

Distribución por año: `{2023: 1, 2026: 238, 0206: 6}`.

### De dónde salieron y por qué explotó recién ahora

Las seis filas **no las tipeó nadie en la app**: tienen `sheet_row` 151-156 y `created_at`
idéntico al segundo (`2026-04-05T15:56:20`). Entraron por la importación de Google Sheets del
5 de abril, en seis filas consecutivas de la hoja — el typo venía de la planilla. De las 269
actividades de prod, 255 vienen de esa importación y sólo 14 se cargaron por el formulario.

Y estuvieron **cuatro meses y medio sin hacer daño**, porque el Gantt tenía un techo:

```js
// hasta el 20/08/2026
const MAX_DIAS = 31
const dias = Array.from({ length: Math.min(totalDias, MAX_DIAS) }, ...)
```

El commit `1d9b1e4` (20/08/2026, *"Gantt y Hours bajan al tablero y obedecen su filtro"*) quitó
ese `Math.min` por una razón legítima y documentada en el propio comentario: con el corte a 31
días, las tareas de más adelante quedaban sin barra. Pero ese `Math.min` estaba haciendo **dos**
trabajos —encuadrar la vista y acotar el render— y sólo uno estaba escrito. Al quitarlo se fue
también la única protección contra un rango absurdo.

De ahí sale la forma del fix: el encuadre y el techo son dos cosas distintas y en `gantt-rango`
viven separadas, con el techo explicado en un comentario para que el próximo que lo toque sepa
qué está sacando.

## Orden y por qué

El fix de código va **primero**, antes de tocar los datos. Si se corrigen las seis filas primero,
el síntoma desaparece y se pierde el caso de prueba — y la app queda igual de frágil ante el
próximo typo.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/features/stratix-mkt/utils/gantt-rango/index.ts` | **nuevo** — calcula el eje: descarta fechas absurdas, acota el total de días |
| `src/features/stratix-mkt/utils/gantt-rango/index.test.ts` | **nuevo** — sus tests |
| `src/features/stratix-mkt/components/gantt/GanttChart/index.tsx` | consume la función; muestra el aviso de descartadas |
| `src/features/stratix-mkt/components/gantt/GanttChart/index.module.css` | estilo del aviso |
| `src/shared/i18n/locales/es.json` · `en.json` | clave del aviso |
| `src/features/stratix-mkt/components/modals/NewActivityModal/index.tsx` | `min`/`max` en el date |
| `CLAUDE.md` | URL de producción |
| `src/shared/data/research.ts` | nombre de canal duplicado |

---

### Task 1: `gantt-rango` — la función pura que no puede explotar

**Files:**
- Create: `src/features/stratix-mkt/utils/gantt-rango/index.ts`
- Test: `src/features/stratix-mkt/utils/gantt-rango/index.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `rangoGantt(fechas: (string | null | undefined)[], hoy: Date): RangoGantt`
  donde `type RangoGantt = { fechaMin: Date; totalDias: number; descartadas: number }`.

- [x] **Step 1: Escribir el test que falla**

```ts
// src/features/stratix-mkt/utils/gantt-rango/index.test.ts
import { describe, it, expect } from 'vitest'
import { rangoGantt, MAX_DIAS } from './index'

const hoy = new Date('2026-08-24T12:00:00Z')

describe('rangoGantt', () => {
  it('usa el rango de las fechas cargadas', () => {
    const r = rangoGantt(['2026-08-01', '2026-08-10'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-08-01')
    expect(r.totalDias).toBe(10)
    expect(r.descartadas).toBe(0)
  })

  // La regresión: 6 filas con año 0206 hacían totalDias = 664.781.
  it('descarta un año absurdo en vez de estirar el eje hasta el año 206', () => {
    const r = rangoGantt(['0206-03-23', '2026-04-01', '2026-04-30'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-04-01')
    expect(r.totalDias).toBe(30)
    expect(r.descartadas).toBe(1)
  })

  it('descarta null, vacío y texto no parseable', () => {
    const r = rangoGantt([null, undefined, '', 'mañana', '2026-08-01'], hoy)
    expect(r.descartadas).toBe(4)
    expect(r.totalDias).toBe(MIN_DIAS_ESPERADO)
  })

  it('sin ninguna fecha válida, arranca en hoy y muestra 30 días', () => {
    const r = rangoGantt([null, '0206-03-23'], hoy)
    expect(r.fechaMin.toISOString().slice(0, 10)).toBe('2026-08-24')
    expect(r.totalDias).toBe(31)
    expect(r.descartadas).toBe(2)
  })

  it('nunca devuelve menos de 7 días', () => {
    expect(rangoGantt(['2026-08-01', '2026-08-02'], hoy).totalDias).toBe(7)
  })

  // Red de seguridad independiente del filtro de años: aunque el filtro deje pasar
  // algo, el eje tiene un techo duro.
  it('acota el total de días al techo duro', () => {
    const r = rangoGantt(['2022-01-01', '2030-12-31'], hoy)
    expect(r.totalDias).toBe(MAX_DIAS)
  })
})

const MIN_DIAS_ESPERADO = 7
```

- [x] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/stratix-mkt/utils/gantt-rango`
Expected: FAIL — `Failed to resolve import "./index"`.

- [x] **Step 3: Escribir la implementación mínima**

```ts
// src/features/stratix-mkt/utils/gantt-rango/index.ts
// Eje temporal del Gantt. Vive acá y no en el componente porque decide CUÁNTOS
// nodos se renderizan: es la diferencia entre 30 días y 664.781.
//
// El 24/08/2026 seis filas con `fecha_entrega = '0206-03-23'` (typo de "2026")
// estiraron el eje del año 206 al 2026 y congelaron la app: 1,1 GB de heap y
// 119 s de main thread bloqueado. El `|| hoy` que había antes no protegía nada,
// porque sólo cubría el array vacío y cualquier Date —incluso el del año 206— es
// truthy.

const DIA_MS = 86400000
const MIN_DIAS = 7
const DIAS_POR_DEFECTO = 31
// Techo duro del eje. Es una red independiente del filtro de años de abajo: si la
// heurística deja pasar algo, el número de <DayHeader/> sigue acotado.
export const MAX_DIAS = 1830 // ~5 años
// Ventana aceptable alrededor de hoy. Fuera de esto la fecha es un error de carga,
// no un dato: no existe una tarea de marketing con entrega en el año 206.
const ANIOS_ATRAS = 5
const ANIOS_ADELANTE = 5

export type RangoGantt = {
  fechaMin: Date
  totalDias: number
  /** Cuántas fechas se dejaron fuera del eje. La UI lo dice; si no, el usuario
   *  ve menos tareas de las que cargó y no hay forma de saber por qué. */
  descartadas: number
}

export function rangoGantt(fechas: (string | null | undefined)[], hoy: Date): RangoGantt {
  const minValido = hoy.getFullYear() - ANIOS_ATRAS
  const maxValido = hoy.getFullYear() + ANIOS_ADELANTE

  const validas: number[] = []
  let descartadas = 0
  for (const f of fechas) {
    const t = f ? new Date(f).getTime() : NaN
    if (Number.isNaN(t)) { descartadas++; continue }
    const anio = new Date(t).getFullYear()
    if (anio < minValido || anio > maxValido) { descartadas++; continue }
    validas.push(t)
  }

  if (validas.length === 0) {
    return { fechaMin: new Date(hoy.getTime()), totalDias: DIAS_POR_DEFECTO, descartadas }
  }

  const min = Math.min(...validas)
  const max = Math.max(...validas)
  const bruto = Math.ceil((max - min) / DIA_MS) + 1
  const totalDias = Math.min(Math.max(bruto, MIN_DIAS), MAX_DIAS)
  return { fechaMin: new Date(min), totalDias, descartadas }
}
```

- [x] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/features/stratix-mkt/utils/gantt-rango`
Expected: PASS, 6 tests.

- [x] **Step 5: Commit**

```bash
git add src/features/stratix-mkt/utils/gantt-rango/index.ts src/features/stratix-mkt/utils/gantt-rango/index.test.ts
git commit src/features/stratix-mkt/utils/gantt-rango/index.ts src/features/stratix-mkt/utils/gantt-rango/index.test.ts -m "feat(stratix): rangoGantt acota el eje del Gantt

Una fecha con año 206 estiraba el eje a 664.781 días. La función descarta
fechas no parseables y fuera de la ventana de +-5 anios, y ademas pone un
techo duro de 1.830 dias como red independiente de esa heuristica."
```

---

### Task 2: `GanttChart` consume la función y avisa lo que dejó fuera

**Files:**
- Modify: `src/features/stratix-mkt/components/gantt/GanttChart/index.tsx:20-27`
- Modify: `src/features/stratix-mkt/components/gantt/GanttChart/index.module.css`
- Modify: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`

**Interfaces:**
- Consumes: `rangoGantt(fechas, hoy)` → `{ fechaMin, totalDias, descartadas }` (Task 1).
- Produces: nada nuevo hacia otras tareas.

- [x] **Step 1: Agregar la clave de i18n en los dos diccionarios**

En `src/shared/i18n/locales/es.json`, junto a las otras `stratix.gantt.*`:

```json
"stratix.gantt.fueraDeRango": "{n} tarea(s) no se muestran: su fecha de entrega está fuera de rango",
```

En `src/shared/i18n/locales/en.json`, en la misma posición:

```json
"stratix.gantt.fueraDeRango": "{n} task(s) hidden: their due date is out of range",
```

- [x] **Step 2: Reemplazar el cálculo del eje**

En `src/features/stratix-mkt/components/gantt/GanttChart/index.tsx`, borrar las líneas 20-27
(desde `const fechas = ...` hasta `const dias = Array.from(...)`) y poner:

```tsx
  const { fechaMin, totalDias, descartadas } = rangoGantt(actsGantt.map(a => a.fecha_entrega), hoy)
  const dias = Array.from({ length: totalDias }, (_, i) => new Date(fechaMin.getTime() + i * DIA_MS))
```

Agregar el import (con alias, nada de `../../`):

```tsx
import { rangoGantt } from '@/features/stratix-mkt/utils/gantt-rango'
```

Borrar la constante `MIN_DIAS` del componente: ahora vive en `gantt-rango`. **Dejar** `DIA_MS` y
`MAX_BARRAS`, que se siguen usando.

- [x] **Step 3: Mostrar el aviso**

Justo después de `<div className={s.chart}>`, antes de `<div className={s.scroller}>`:

```tsx
        {descartadas > 0 && (
          <div className={s.aviso}>{t('stratix.gantt.fueraDeRango', { n: descartadas })}</div>
        )}
```

En `index.module.css`:

```css
/* Un número que no cuadra tiene que poder explicarse solo: sin este aviso el usuario
   ve menos barras de las que cargó y lo lee como que se perdieron tareas. */
.aviso {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--s2);
  color: var(--t2);
  font-size: 13px;
}
```

- [x] **Step 4: Verificar tipos y tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sin salida de tsc; todos los tests en verde.

- [x] **Step 5: Verificar en el navegador con el dato envenenado**

La base local ya tiene las 269 actividades copiadas de prod (incluidas las 6 del año 0206).

1. `pnpm dev`
2. Entrar a `http://localhost:3000/stratix-mkt` → pestaña Gantt.
3. **Esperado:** carga sin congelarse, el eje muestra el rango de 2026 y arriba aparece
   *"6 tarea(s) no se muestran…"*.
4. En la consola: `performance.memory.usedJSHeapSize / 1048576` debe quedar en decenas de MB.

Si la pestaña Gantt no está activa, el selector de vista está en el sidebar de Stratix.

- [x] **Step 6: Commit**

```bash
git add src/features/stratix-mkt/components/gantt/GanttChart/index.module.css
git commit src/features/stratix-mkt/components/gantt/GanttChart/index.tsx src/features/stratix-mkt/components/gantt/GanttChart/index.module.css src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json -m "fix(stratix): el Gantt ya no se cuelga por una fecha mal cargada

Entrar a Stratix en prod consumia 1,1 GB y bloqueaba el main thread 119 s:
seis filas con año 0206 estiraban el eje a 664.781 <DayHeader/>. El eje pasa
por rangoGantt y lo que queda fuera se dice en pantalla, para que no se lea
como tareas perdidas."
```

---

### Task 3: cerrar la puerta de entrada — `min`/`max` en el date

**Files:**
- Modify: `src/features/stratix-mkt/components/modals/NewActivityModal/index.tsx` (el
  `<input type="date">` de `stratix.new.due`)

**Interfaces:**
- Consumes: nada.
- Produces: nada.

Esto no arregla el bug —lo arregla la Task 1— pero evita que se vuelvan a cargar filas así.
Un `<input type="date">` sin `min`/`max` acepta el año 0206 sin una queja.

- [x] **Step 1: Acotar el input**

En el `Field` de `t('stratix.new.due')`:

```tsx
        <Field label={t('stratix.new.due')}>
          {/* Sin min/max el navegador acepta un año de 3 dígitos: así entraron las seis
              filas de 0206-03-23 que colgaban el Gantt (24/08/2026). */}
          <input type="date" min="2020-01-01" max="2035-12-31" value={nuevaAct.fecha_entrega}
            onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} />
        </Field>
```

- [x] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin salida.

- [x] **Step 3: Verificar en el navegador**

Abrir "Nueva tarea", tipear `0206-03-23` en la fecha de entrega. El navegador debe marcar el
campo como inválido.

- [x] **Step 4: Commit**

```bash
git commit src/features/stratix-mkt/components/modals/NewActivityModal/index.tsx -m "fix(stratix): el date de entrega acota el año

Sin min/max el navegador acepta un año de 3 digitos. Asi entraron las seis
filas de 0206-03-23 que colgaban el Gantt."
```

---

### ~~Task 4: corregir las seis filas de producción~~ — DESCARTADA

**No se hace.** Se volvió innecesaria mientras se ejecutaba el plan.

La Task 4 existía porque una fecha mal cargada no tenía arreglo desde la app: `actividadesRepo`
exponía `list`, `create` y `updateEstado`, nada más. La única salida era un `UPDATE` a mano, con
su backup y su precheck.

Al cerrar el círculo del aviso —que ahora lista **cuáles** son y abre la ficha de cada una— se
agregó `updateFecha` y el campo editable, así que las seis filas se corrigen desde la UI. Es
mejor por dos motivos que no son de comodidad:

- **Lo hace quien conoce la tarea**, no quien tiene acceso a `psql`. El `UPDATE` asumía que
  `0206-03-23` había querido ser `2026-03-23`; es lo más probable, pero es una suposición que
  quien cargó la tarea puede confirmar y el que escribe SQL no.
- **No hay que tocar producción a mano.** El paso más riesgoso del plan desaparece entero, con
  su backup, su precheck y su ventana de error.

Queda pendiente **hacerlo**: producción sigue con sus 6 filas hasta que este cambio se despliegue
y alguien las corrija desde la ficha.

---

### Task 5: la URL de producción del `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (línea 3, "Desplegada en Vercel en `eminat.app`")

- [x] **Step 1: Corregir**

`eminat.app` da `DNS_PROBE_FINISHED_NXDOMAIN`. La URL real es `app.stratixsolutions.us`.

```markdown
Sistema operativo interno de Eminat Group. Plataforma de gestión empresarial desarrollada con Next.js 14 + Supabase. Desplegada en Vercel en `app.stratixsolutions.us`.
```

- [x] **Step 2: Commit**

```bash
git commit CLAUDE.md -m "docs: la URL de produccion es app.stratixsolutions.us

eminat.app no resuelve (NXDOMAIN). Se descubrio al medir el rendimiento en
produccion: el primer intento de abrir la app fue a un dominio inexistente."
```

---

### Task 6: el nombre de canal duplicado en Research

**Files:**
- Modify: `src/shared/data/research.ts:32`

`subscribeToTable` busca el canal previo por `topic === 'realtime:' + opts.channel`, y este
caller ya pasa `channel: 'realtime:research_leads'` — o sea que busca
`realtime:realtime:research_leads` y **nunca lo encuentra**. El dedupe contra el doble montaje de
StrictMode/Fast Refresh no funciona para Research. No causa fuga (el `useEffect` de
`useResearchData.ts:44` limpia al desmontar), pero el mecanismo está roto.

- [x] **Step 1: Sacar el prefijo**

```ts
  subscribeToTable<T>({ channel: TABLES.researchLeads, table: TABLES.researchLeads }, h)
```

- [x] **Step 2: Verificar**

Run: `npx tsc --noEmit && npx vitest run`

- [x] **Step 3: Verificar en el navegador**

Con `pnpm dev`, entrar a `/research` y en la consola:

```js
// no debe crecer al recargar con Fast Refresh
```

Comprobar que al entrar y salir de Research el número de canales no crece.

- [x] **Step 4: Commit**

```bash
git commit src/shared/data/research.ts -m "fix(research): el nombre del canal llevaba realtime: duplicado

subscribeToTable busca el canal previo por 'realtime:'+channel, y este caller
ya pasaba el prefijo: buscaba realtime:realtime:research_leads y nunca
encontraba nada, asi que el dedupe contra el doble montaje no corria."
```

---

## Fuera de este plan

Estos ya están anotados en `.todo/TODO.md` § Stratix y **no** se tocan acá. Se listan para que
quede claro que se decidieron, no que se olvidaron.

| Pendiente | Por qué no entra |
|---|---|
| `actividades.mes` sin año (el reporte de pago suma todos los agostos) | 🔴 Es el más grave de los cuatro, pero es una migración que toca datos históricos y **necesita una decisión previa**: qué año se le asigna a lo ya cargado. Merece su propio plan. |
| El mes se renderiza crudo (i18n) | Conviene hacerlo **junto** con el anterior: si `mes` pasa a `date`, el `mesLabel()` nace con otra firma. Hacerlo suelto es escribirlo dos veces. |
| Textos hardcodeados en crear/mover tarea | Independiente, barato, sin relación con el Gantt. |
| `horas`/`dias_produccion` aceptan negativos | Independiente, dos líneas de validación. |
| `<html lang="es">` clavado (WCAG 3.1.1) | Independiente; el arreglo es en `LocaleProvider`, no en el layout. |

## Riesgos

- **Task 4 toca producción y no tiene deshacer barato.** Sin el backup del Step 1, un `UPDATE`
  con un `WHERE` mal escrito se lleva puestas fechas buenas.
- **El techo de `MAX_DIAS` puede cortar un rango legítimo.** Con la ventana de ±5 años el máximo
  real es ~3.650 días, así que el techo de 1.830 recorta un caso extremo pero plausible (filtro en
  "General" con varios años cargados). Es a propósito: preferimos un Gantt recortado y un aviso
  antes que la app congelada. Si molesta, se sube el techo — pero no se saca.
