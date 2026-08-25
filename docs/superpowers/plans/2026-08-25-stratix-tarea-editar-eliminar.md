# Stratix: editar y eliminar tarea (+ errores silenciados) — Plan de implementación

> **ESTADO (25/08/2026):** Tasks 1–7 ejecutadas y verificadas (commits `200c256`..`02b290f` en `development`; vitest 395/395; migración aplicada vía psql en local). Revisión final whole-branch: ready to merge, 5 minors en diferido. Task 8 omitida por decisión de Wagner (sin PROD_DB_URL). QA manual del Task 7 pendiente. Rollout a dev/prod tras aprobar QA.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una tarea de Stratix se pueda editar (todos sus campos) y eliminar desde su ficha, y que los dos errores silenciados detectados en la auditoría dejen de mentirle al usuario.

**Architecture:** Se reutiliza `NewActivityModal` en modo edición (un solo formulario para crear y editar): un nuevo estado `actEditando` en `useStratixData` decide si guardar crea o actualiza. El borrado es un botón con `confirm()` en `ActivityDetailModal`, siguiendo el patrón existente de Research (`LeadDetailModal.tsx:36`). La lógica pura nueva (mapear Actividad → formulario) ya está extraída y testeada.

**Tech Stack:** Next.js + React, Supabase client directo desde el repo (`src/shared/data/`), Vitest, i18n JSON (en/es).

## Requisitos

- **RF1 — Editar tarea:** desde la ficha, botón Editar abre el formulario existente precargado; guardar actualiza TODOS los campos (incluido limpiarlos) y sobrevive recarga.
- **RF2 — Eliminar tarea:** desde la ficha, botón Eliminar pide confirmación; al borrar desaparece de Kanban/Gantt/reportes y sobrevive recarga. No debe bloquearse por tener notificaciones, slots o solicitudes vinculadas (Task 6).
- **RF3 — Nada silencioso:** todo fallo (red, fila ya borrada por otro usuario) muestra mensaje de error; ningún "ok fantasma". Esto también corrige el drag del Kanban y los pills de estado que hoy mienten.
- **RF4 — i18n completo:** cero strings duros nuevos; en/es paritarios.
- **RF5 — Atribución preservada:** un solicitante inactivo pero existente no pierde quién pidió la tarea (opción deshabilitada en el select); solo ids huérfanos se vacían.

## Limitaciones aceptadas (explícitas, no bugs)

- **L1 — Sin gateo de permisos en la UI:** cualquier usuario ve Editar/Eliminar, incluso un solicitante sobre una tarea ajena. Coherente con el módulo actual (el drag tampoco gatea); el control real llega con la migración de RLS aparte.
- **L2 — Last-write-wins:** dos usuarios editando la misma tarea en campos distintos → el último guarda pisa al primero. La solución real (optimistic concurrency con `updated_at`) queda para cuando haga falta.
- **L3 — Sin notificación al reasignar en edición:** si el responsable cambia, el nuevo no recibe aviso (solo al crear).
- **L4 — Datos fuera de catálogo se normalizan al editar:** empresa o mes legacy se reescriben a valores válidos visibles en el form antes de guardar (decisión ya documentada en `act-form.ts` / efecto de empresa del modal). El impacto sobre el REPORTE de pago se trata en un PLAN APARTE (ver abajo); este plan no cambia cómo se calcula nada del reporte.
- **L5 — Historial huérfano:** al eliminar una tarea, sus filas en `historial` quedan apuntando a un id muerto (no hay trigger de DELETE ni FK; la app no lee esa tabla hoy).

## Global Constraints

- Sin comentarios nuevos salvo los que expliquen una decisión no obvia (convención del repo: los comentarios cuentan POR QUÉ).
- Los slugs/estados salen de constantes (`COLUMNAS_KANBAN`, `ESTADO`), nunca literales nuevos.
- Todo texto visible por el usuario pasa por i18n (`src/shared/i18n/locales/en.json` y `es.json`).
- Typecheck: `npx tsc --noEmit` debe salir 0. Tests: `npx vitest run` en verde.
- ÚNICA migración permitida: la de las FKs del Task 6 (patrón ya usado en `20260824150000`). RLS queda fuera (decisión del usuario).
- Nada de este plan modifica cálculos del reporte de pago (ver PLAN APARTE en Fuera de alcance).
- Verificación E2E: SOLO manual por Wagner (extensión de Claude). Sin Playwright ni tests de navegador automatizados.

## Estado previo (ya hecho, commit pendiente)

- ✅ `src/features/stratix-mkt/utils/act-form.ts` — `actividadAForm(a)` mapea `Actividad` → `NuevaActForm` (normaliza nulos a `''`, horas/días numéricos a string, `mes` fuera de catálogo → mes actual, `estado` vacío → `Pendiente`).
- ✅ `src/features/stratix-mkt/utils/act-form.test.ts` — 3 tests, en verde (RED verificado antes de implementar).

---

### Task 1: Repo — `update` y `remove` en actividadesRepo

**Files:**
- Modify: `src/shared/data/actividades.ts`

**Interfaces:**
- Produces: `update(id: string, payload: Record<string, unknown>)` → misma forma que los demás wrappers (Promesa de `{ data, error }`); `remove(id: string)` → Promesa de `{ error }`.

Nota: son wrappers finos sobre el cliente Supabase como `updateEstado`/`updateFecha`; el repo no tiene tests unitarios para estos (no existe patrón de mock de Supabase en el codebase). La lógica pura ya está cubierta en `act-form.test.ts`.

- [x] **Step 1: Agregar las dos funciones** al final de `src/shared/data/actividades.ts`:

```ts
// Edita cualquier campo de la actividad. El payload completo viaja entero
// (con nulls para vacíos): editar tiene que poder LIMPIAR campos, no solo
// cambiarlos — omitirlos dejaría el valor viejo clavado. `.select().single()`
// convierte "0 filas afectadas" (la tarea ya fue borrada por otro usuario)
// en error, en vez de un ok fantasma que resucite la fila en el estado local.
export const update = (id: string, payload: Record<string, unknown>) =>
  supabase.from(TABLES.actividades).update(payload).eq('id', id).select().single()

// Mismo criterio: si la fila ya no existe, single() falla y la UI muestra error.
export const remove = (id: string) =>
  supabase.from(TABLES.actividades).delete().eq('id', id).select().single()
```

- [x] **Step 2: Mismo fix del fantasma en updateEstado y updateFecha** — hoy un UPDATE de 0 filas devuelve `{ error: null }` y la UI dice ok. Agregarles `.select().single()`:

```ts
export const updateEstado = (id: string, estado: string) =>
  supabase.from(TABLES.actividades).update({ estado }).eq('id', id).select().single()

export const updateFecha = (id: string, fecha_entrega: string) =>
  supabase.from(TABLES.actividades).update({ fecha_entrega }).eq('id', id).select().single()
```

Los call sites existentes (`onDrop`, PillToggle del modal, updateFecha en la ficha) solo leen `error`: con 0 filas ahora caen por su rama de error, que es exactamente lo deseado. Sin cambios extra en ellos.

- [x] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0

---

### Task 2: i18n — claves nuevas en en.json y es.json (PRIMERO: `t()` con clave inexistente no compila)

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/es.json`

**Por qué va primero:** `I18nKey = keyof typeof es` (src/shared/i18n/index.tsx) — llamar `t('stratix.edit.saved')` antes de crear la clave rompe el typecheck de los Tasks siguientes.

Claves usadas por los Tasks 3–5 (colocarlas junto a las demás `stratix.detail.*` / `stratix.new.*`):

| Clave | en | es |
|---|---|---|
| `stratix.edit.title` | `Edit task` | `Editar tarea` |
| `stratix.edit.sub` | `Update the fields you need` | `Actualizá los campos que necesites` |
| `stratix.edit.saved` | `Task updated` | `Tarea actualizada` |
| `stratix.edit.saveError` | `Unexpected error saving the task` | `Error inesperado al guardar la tarea` |
| `stratix.new.created` | `Task created successfully` | `Tarea creada` |
| `stratix.new.createError` | `Unexpected error creating the task` | `Error inesperado al crear la tarea` |
| `stratix.new.titleRequired` | `Title is required` | `El título es obligatorio` |
| `stratix.new.assigneeRequired` | `Assignee is required` | `El responsable es obligatorio` |
| `stratix.new.brandRequired` | `Brand / Area is required` | `La marca / área es obligatoria` |
| `stratix.new.inactive` | `inactive` | `inactivo` |
| `stratix.kanban.movedTo` | `Moved to "{col}"` | `Movida a "{col}"` |
| `stratix.kanban.moveError` | `Couldn't move the task` | `No se pudo mover la tarea` |
| `stratix.detail.deleteConfirm` | `Delete this task? This cannot be undone.` | `¿Eliminar esta tarea? No se puede deshacer.` |
| `stratix.detail.deleted` | `Task deleted` | `Tarea eliminada` |
| `stratix.detail.deleteError` | `Couldn't delete the task` | `No se pudo eliminar la tarea` |
| `stratix.detail.statusError` | `Couldn't update the status` | `No se pudo actualizar el estado` |

⚠️ En los JSON las comillas del valor se escriben escapadas: `"stratix.kanban.movedTo": "Moved to \"{col}\""` (mismo patrón que `stratix.detail.statusChanged` en es.json:694). La tabla muestra el string renderizado, no el literal JSON.

(`common.edit`="Edit"/"Editar", `common.delete`="Delete"/"Borrar", `common.saveChanges`, `common.processing`, `common.cancel2`: verificadas en ambos locales.)

Run: `node -e "JSON.parse(require('fs').readFileSync('src/shared/i18n/locales/en.json')); JSON.parse(require('fs').readFileSync('src/shared/i18n/locales/es.json')); console.log('json ok')"`

---

### Task 3: useStratixData — modo edición, eliminar, y fix del error silenciado en onDrop

**Files:**
- Modify: `src/features/stratix-mkt/hooks/useStratixData.ts`

**Interfaces:**
- Consumes: `actividadAForm` de `../utils/act-form`; `actividadesRepo.update/remove` del Task 1.
- Produces (nuevos valores del contexto que consumen los Tasks 4 y 5):
  - `actEditando: Actividad | null`
  - `abrirEdicion(a: Actividad): void`
  - `eliminarAct(a: Actividad): Promise<void>`
  - `cerrarFormAct(): void`

- [x] **Step 1: Imports** — agregar a los imports existentes:

```ts
import { actividadAForm } from '../utils/act-form'
// y sumar estadoLabel al import de domain:
import { ESTADO, ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
```

Además, sumar `usuarios` al destructuring de `useApp()` en la primera línea del hook (lo necesita la normalización de solicitante de `abrirEdicion`).

- [x] **Step 2: Estado nuevo** — junto a los demás `useState` del form:

```ts
const [actEditando, setActEditando] = useState<Actividad | null>(null)
```

- [x] **Step 3: Funciones nuevas** (junto a `crearActividad`). En `crearActividad`, reemplazar la construcción dispersa del payload por uno completo (con nulls) y branchear create/update:

```ts
function abrirEdicion(a: Actividad) {
  setActEditando(a)
  const f = actividadAForm(a)
  // Mismo hueco que el efecto de empresa del modal, acá para el responsable: si la
  // persona salió del equipo (o está excluida), el <select> se vería vacío mientras
  // el estado conserva el id viejo — lo que se ve ≠ lo que se guarda. Se resetea.
  if (!miembrosAsignables.some(m => m.id === f.responsable_id)) f.responsable_id = ''
  // Ídem para el solicitante, PERO solo si el id está huérfano (el usuario ya no
  // existe): un inactivo EXISTE y el sistema lo sabe mostrar (miembrosPorId incluye
  // inactivos a propósito; borrarle la atribución perdería quién pidió la tarea).
  if (!usuarios.some(u => u.id === f.solicitante_id)) f.solicitante_id = ''
  setNuevaAct(f)
  setModalVerAct(null)
  setModalNuevaAct(true)
}

function cerrarFormAct() {
  setModalNuevaAct(false)
  setActEditando(null)
  setNuevaAct(emptyNuevaAct(usuario?.id || ''))
}

async function eliminarAct(a: Actividad) {
  if (!a.id) return
  const { error } = await actividadesRepo.remove(a.id)
  if (error) { mostrarMensaje('error', t('stratix.detail.deleteError')); return }
  setActividades(prev => prev.filter(x => x.id !== a.id))
  setModalVerAct(null)
  mostrarMensaje('ok', t('stratix.detail.deleted'))
}
```

En `crearActividad`, después de las tres validaciones existentes, reemplazar TODO el bloque de armado del payload y del `create` por:

```ts
    setCreandoAct(true)
    try {
      // Payload completo con nulls (no campos omitidos): así el mismo objeto sirve
      // para crear y para editar, y editar puede limpiar un campo, no solo cambiarlo.
      const payload: Record<string, unknown> = {
        titulo: nuevaAct.titulo.trim(),
        empresa: nuevaAct.empresa,
        responsable_id: nuevaAct.responsable_id,
        mes: nuevaAct.mes,
        trimestre: mesATrimestre[nuevaAct.mes] || 'Q1',
        estado: nuevaAct.estado,
        descripcion: nuevaAct.descripcion || null,
        horas: nuevaAct.horas ? Number(nuevaAct.horas) : null,
        dias_produccion: nuevaAct.dias_produccion ? Number(nuevaAct.dias_produccion) : null,
        fecha_entrega: nuevaAct.fecha_entrega || null,
        solicitante_id: nuevaAct.solicitante_id || null,
        drive_url: nuevaAct.drive_url || null,
      }

      if (actEditando?.id) {
        const { error } = await actividadesRepo.update(actEditando.id, payload)
        if (error) { mostrarMensaje('error', `Error: ${error.message}`); setCreandoAct(false); return }
        setActividades(prev => prev.map(x => (x.id === actEditando.id ? { ...x, ...payload } as Actividad : x)))
        cerrarFormAct()
        mostrarMensaje('ok', t('stratix.edit.saved'))
      } else {
        const { data, error } = await actividadesRepo.create(payload)
        if (error) { mostrarMensaje('error', `Error: ${error.message}`); setCreandoAct(false); return }
        setActividades(prev => [data as Actividad, ...prev])
        if (data && nuevaAct.responsable_id && nuevaAct.responsable_id !== usuario?.id) {
          await notificacionesRepo.insert({ usuario_id: nuevaAct.responsable_id, tipo: 'tarea_asignada', titulo: 'New task assigned', mensaje: `"${nuevaAct.titulo}" — ${nuevaAct.empresa} · ${nuevaAct.mes}`, actividad_id: (data as Actividad).id, leida: false })
        }
        cerrarFormAct()
        mostrarMensaje('ok', t('stratix.new.created'))
      }
    } catch {
      mostrarMensaje('error', t(actEditando ? 'stratix.edit.saveError' : 'stratix.new.createError'))
    }
    setCreandoAct(false)
```

(El comportamiento de creación queda idéntico: insertar null explícito en columna nullable ≡ omitirlo. Con el `.select().single()` del Task 1, si la tarea fue borrada por otro usuario mientras se editaba, `update` devuelve error y cae por la rama de error existente — sin fantasmas. Limitación conocida, fuera de alcance: last-write-wins con payload completo — dos usuarios editando campos distintos de la misma tarea, el último pisa; la solución real es optimistic concurrency con `updated_at`.)

- [x] **Step 4: Fix onDrop** — hoy silencia el error y el mensaje ok está hardcodeado en inglés. Reemplazar el `if (!error) {...}` actual por:

```ts
    if (!error) {
      setActividades(prev => prev.map(a => a.id === dragId ? { ...a, estado: col } : a))
      mostrarMensaje('ok', t('stratix.kanban.movedTo', { col: estadoLabel(col, t) }))
    } else {
      mostrarMensaje('error', t('stratix.kanban.moveError'))
    }
```

- [x] **Step 5: i18n de las validaciones de crearActividad** (hoy en inglés duro):

```ts
if (!nuevaAct.titulo.trim()) { mostrarMensaje('error', t('stratix.new.titleRequired')); return }
if (!nuevaAct.responsable_id) { mostrarMensaje('error', t('stratix.new.assigneeRequired')); return }
if (!nuevaAct.empresa) { mostrarMensaje('error', t('stratix.new.brandRequired')); return }
```

- [x] **Step 6: Exponer en el retorno del hook** los cuatro nombres nuevos (`actEditando`, `abrirEdicion`, `cerrarFormAct`, `eliminarAct`) junto a los que ya expone.

- [x] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0

---

### Task 4: NewActivityModal — título/sub/botón según modo, cierre que resetea

**Files:**
- Modify: `src/features/stratix-mkt/components/modals/NewActivityModal/index.tsx`

**Interfaces:**
- Consumes: `actEditando`, `cerrarFormAct` del contexto (Task 3).

- [x] **Step 1:** Agregar `actEditando` y `cerrarFormAct` a la desestructuración de `useStratix()`.

- [x] **Step 2:** TODAS las vías de cierre usan `cerrarFormAct` en vez de `setModalNuevaAct(false)`. Son TRES: el `onClose` del `<Modal>`, el botón cancelar, y el botón ✕ del encabezado (`NewActivityModal/index.tsx:44`). Si alguna queda sin migrar, `actEditando` queda pegado y la próxima "New task" abriría precargada y haría UPDATE sobre la tarea vieja en vez de crear — el peor bug posible de este feature.

- [x] **Step 3:** Encabezado condicional:

```tsx
<div className={s.titulo}>{actEditando ? t('stratix.edit.title') : t('stratix.new.title')}</div>
<div className={s.sub}>{actEditando ? t('stratix.edit.sub') : t('stratix.new.sub')}</div>
```

- [x] **Step 4:** Botón principal condicional — OJO: el estado `creandoAct` también cubre el guardado en edición, así que el label "Creating..." saldría mal al editar. El label de guardado va aparte:

```tsx
{creandoAct
  ? (actEditando ? t('common.processing') : t('stratix.new.creating'))
  : actEditando ? t('common.saveChanges') : t('stratix.new.create')}
```

- [x] **Step 5:** El efecto de sincronización de `empresa` existente queda igual (también aplica en edición). Nota aceptada: si la tarea editada tiene una empresa desactivada, al abrir el editor el select se mueve a la primera marca activa ANTES de guardar — es visible para el usuario, no silencioso, y coincide con el comportamiento de creación.

- [x] **Step 5b: Solicitante inactivo visible en el select** — el select lista solo activos; si la tarea editada tiene un solicitante que existe pero está inactivo, mostrarlo como opción deshabilitada en vez de dejar el id invisible en el estado (la atribución se conserva). Reemplazar el `<Field label={t('stratix.new.requestedBy')}>` por:

```tsx
<Field label={t('stratix.new.requestedBy')}>
  <select value={nuevaAct.solicitante_id} onChange={e => setNuevaAct(p => ({ ...p, solicitante_id: e.target.value }))}>
    <option value="">—</option>
    {usuarios.filter(u => !u.activo && u.id === nuevaAct.solicitante_id).map(u => (
      <option key={u.id} value={u.id as string} disabled>{`${u.nombre || ''} ${u.apellido || ''}`.trim()} ({t('stratix.new.inactive')})</option>
    ))}
    {usuarios.filter(u => u.activo && u.id).map(u => (
      <option key={u.id} value={u.id as string}>{`${u.nombre || ''} ${u.apellido || ''}`.trim()}</option>
    ))}
  </select>
</Field>
```

Run: `npx tsc --noEmit` → exit 0

---

### Task 5: ActivityDetailModal — botones Editar/Eliminar + fix del error silenciado en PillToggle

**Files:**
- Modify: `src/features/stratix-mkt/components/modals/ActivityDetailModal/index.tsx`
- Modify: `src/features/stratix-mkt/components/modals/ActivityDetailModal/index.module.css`

**Interfaces:**
- Consumes: `abrirEdicion`, `eliminarAct` (Task 3).

**Alcance del cambio:** la ficha se abre desde TRES lugares (`KanbanTaskCard`, `GanttBar`, `TaskTableRow`) y todos usan este mismo modal → los botones Editar/Eliminar aparecen en los tres automáticamente. No hay que tocar nada por separado.

- [x] **Step 1:** Agregar `abrirEdicion` y `eliminarAct` a la desestructuración de `useStratix()`.

- [x] **Step 2: Fix PillToggle** — el onClick hoy ignora `error`. Reemplazar por:

```tsx
onClick={async () => {
  if (!modalVerAct.id) return
  const { error } = await actividadesRepo.updateEstado(modalVerAct.id, col)
  if (error) { mostrarMensaje('error', t('stratix.detail.statusError')); return }
  setActividades(prev => prev.map(a => (a.id === modalVerAct.id ? { ...a, estado: col } : a)))
  setModalVerAct(p => ({ ...p, estado: col }))
  mostrarMensaje('ok', t('stratix.detail.statusChanged', { estado: estadoLabel(col, t) }))
}}
```

- [x] **Step 3: Fila de acciones** antes del link de Drive:

```tsx
<div className={css.acciones}>
  <button type="button" className={css.editar} onClick={() => abrirEdicion(modalVerAct)}>
    ✏️ {t('common.edit')}
  </button>
  <button type="button" className={css.eliminar}
    onClick={() => { if (confirm(t('stratix.detail.deleteConfirm'))) void eliminarAct(modalVerAct) }}>
    🗑 {t('common.delete')}
  </button>
</div>
```

(`confirm()` nativo, mismo criterio que `LeadDetailModal` en Research.)

- [x] **Step 4: CSS** — agregar al module.css, siguiendo el estilo existente del archivo:

```css
.acciones {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.editar,
.eliminar {
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.editar { background: #7C6FF720; color: #7C6FF7; }

.eliminar { background: #F8717120; color: #F87171; }
```

(Ajustar variables de color si el archivo ya define tokens propios.)

Run: `npx tsc --noEmit` → exit 0

---

### Task 6: Migración — FKs hacia actividades con ON DELETE SET NULL

**Files:**
- Create: `supabase/migrations/20260825120000_actividades_fks_set_null.sql`

**Por qué:** `notificaciones`, `slots_calendario` y `solicitudes` tienen `actividad_id uuid` (nullable) con FK hacia `actividades(id)` **sin ON DELETE** → NO ACTION. Eliminar una tarea que tenga notificación, slot o solicitud vinculada revienta con `FK violation`. Es el mismo bug de departamentos/dominios arreglado en `20260824150000`; se aplica el mismo patrón. Con SET NULL, la referencia muere sola (la notificación/slot/solicitud sigue existiendo, solo pierde el link a una tarea que ya no está).

- [x] **Step 1: Crear la migración**:

```sql
-- Borrar una tarea referenciada por notificaciones, slots_calendario o solicitudes
-- fallaba con FK violation (las tres FKs eran NO ACTION). Las tres columnas son
-- nullable y el link no tiene sentido sin la tarea: SET NULL desvincula en vez
-- de bloquear (mismo patrón que 20260824150000 para dominios_corporativos).
ALTER TABLE public.notificaciones
  DROP CONSTRAINT notificaciones_actividad_id_fkey;

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;

ALTER TABLE public.slots_calendario
  DROP CONSTRAINT slots_calendario_actividad_id_fkey;

ALTER TABLE public.slots_calendario
  ADD CONSTRAINT slots_calendario_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;

ALTER TABLE public.solicitudes
  DROP CONSTRAINT solicitudes_actividad_id_fkey;

ALTER TABLE public.solicitudes
  ADD CONSTRAINT solicitudes_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;
```

- [x] **Step 2: Aplicarla SOLO al Supabase local** (NO `db reset`: borra los datos de QA). ⚠️ AJUSTADO en ejecución: el CLI estaba linkeado al proyecto REMOTO dev (`ydcadspinryybextlvyi`), así que `migration up` habría aplicado en dev antes del QA. Se aplicó vía `psql` contra el postgres local dentro de la verificación del Task 7 — verificado `confdeltype = 'n'` en las tres FKs.

Run: verificar en local que las 3 FKs quedaron con `ON DELETE SET NULL`:
```sql
SELECT conrelid::regclass, conname, confdeltype FROM pg_constraint WHERE conname LIKE '%actividad_id_fkey';
-- confdeltype esperado: 'n' (set null) en las tres
```

---

### Task 7: Verificación

**Automática (la hace el agente que ejecuta el plan):**
- [x] `npx tsc --noEmit` → exit 0
- [x] `npx vitest run` → todos en verde (incluye los 3 de `act-form.test.ts`)
- [x] Chequeo SQL de la migración contra Supabase local (vincular dependencias y borrar una tarea por SQL, verificar `actividad_id = null` en las tres tablas — mismo ensayo del Task 8 Step 6, sin UI)

**Manual (la hace WAGNER con la extensión de Claude en el navegador — sin Playwright, sin scripts).** Login local: `freddy@eminat.net` / `eminat123`. Checklist en orden, ~5 min:

1. Crear tarea → aparece en Kanban.
2. Ficha → **Editar** → cambiar título/responsable/horas → Guardar → se ve el cambio y sobrevive F5.
3. Editar → limpiar descripción/drive_url → Guardar → quedan vacíos tras F5.
4. Ficha → **Eliminar** → confirmar → desaparece y sobrevive F5.
5. Editar → Cancelar con la ✕ del encabezado → "New task" → abre LIMPIO en modo creación (no precargado).
6. Español: validaciones y mensajes sin inglés duro.
7. Opcional: borrar desde el Gantt y desde Solicitudes (misma ficha, mismos botones).

Si algo falla acá, volver al plan y corregir antes de tocar dev/prod.

---

### Task 8: Ensayo general — copia de producción en local, migración aplicada sobre datos reales

**Files:**
- Create (fuera del repo): `/tmp/opencode/prod-{roles,schema,data}.sql`

**Por qué:** la migración de FKs y el feature de borrado corren contra datos que nunca vimos: drift de esquema entre entornos, constraints con nombres distintos, filas huérfanas, volumen real en el Gantt. Ensayar en local con una copia de prod lo revela sin riesgo.

⚠️ Reglas duras:
- El dump contiene PII real: SOLO a `/tmp/opencode/`, NUNCA dentro del repo ni se commitea.
- `npx supabase migration up` / `db push` usan el proyecto LINKEADO (`supabase/.temp/` puede apuntar a PROD): en este task la migración se aplica SIEMPRE por `psql` contra el postgres local. Ningún comando de push en todo el task.
- Solo lectura contra prod: únicamente `db dump`, jamás escritura.

- [ ] **Step 1: Verificar a qué proyecto está linkeado el CLI** (`ls supabase/.temp/`, ref esperado de prod: `ruedelunbtaomhrzgelc`) y conseguir la DB URL de prod (session pooler, en `.env` o dashboard). Confirmar que es la de PROD antes de dump.

- [ ] **Step 2: Dump completo de prod** (roles + schema + data):

```bash
npx supabase db dump --db-url "$PROD_DB_URL" -f /tmp/opencode/prod-roles.sql --role-only
npx supabase db dump --db-url "$PROD_DB_URL" -f /tmp/opencode/prod-schema.sql
npx supabase db dump --db-url "$PROD_DB_URL" -f /tmp/opencode/prod-data.sql --data-only --use-copy
```

- [ ] **Step 3: Restaurar en el postgres local** (Supabase local corriendo: `npx supabase start`). Reemplaza TODO el esquema local:

```bash
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$DB" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
psql "$DB" -f /tmp/opencode/prod-roles.sql
psql "$DB" -f /tmp/opencode/prod-schema.sql
psql "$DB" -f /tmp/opencode/prod-data.sql
```

- [ ] **Step 4: Resetear la contraseña del admin local** (los hashes de prod son desconocidos):

```sql
psql "$DB" -c "UPDATE auth.users SET encrypted_password = crypt('eminat123', gen_random_uuid()::text) WHERE email = 'freddy@eminat.net';"
```

- [ ] **Step 5: Aplicar la migración del Task 6 A MANO sobre la copia**:

```bash
psql "$DB" -f supabase/migrations/20260825120000_actividades_fks_set_null.sql
```

Verificar: `confdeltype = 'n'` en las tres FKs, y que el `DROP CONSTRAINT` no reventó por drift de nombres.

- [ ] **Step 6: Ensayo transaccional del borrado con datos reales** (elegir una tarea que SÍ tenga dependencias; si no hay, vincular una por SQL como en el QA del Task 7):

```sql
BEGIN;
-- Elegir una tarea con dependencias (si no hay, vincular una primero):
SELECT id, titulo FROM actividades
WHERE id IN (SELECT actividad_id FROM notificaciones WHERE actividad_id IS NOT NULL)
LIMIT 1;
-- Si devolvió cero filas, crear la dependencia y reintentar:
-- UPDATE notificaciones SET actividad_id = '<id-tarea-cualquiera>' WHERE id = (SELECT id FROM notificaciones WHERE actividad_id IS NULL LIMIT 1);

SELECT count(*) FROM notificaciones WHERE actividad_id = '<id>'; -- antes: >= 1
DELETE FROM actividades WHERE id = '<id>';
SELECT count(*) FROM notificaciones WHERE actividad_id = '<id>'; -- después: 0, sin error de FK
ROLLBACK;
```

Expected: el DELETE no revienta por FK; las notificaciones vinculadas quedan con `actividad_id` anulado; tras el ROLLBACK nada cambió.

- [ ] **Step 7: Smoke de la app contra los datos reales**: `npm run dev` ya apunta al Supabase local — login con freddy, navegar Stratix: Kanban/Gantt/reportes cargan con el volumen de prod, abrir fichas, editar y eliminar una tarea de prueba (creada recién, no una real).

- [ ] **Step 8: Dejar todo como estaba**: `npx supabase db reset` restaura el estado local desde las migraciones (los dumps quedan solo en `/tmp/opencode/`).

## Fuera de alcance (explícito)

- **PLAN APARTE — Período de imputación del reporte:** `mes` guardado sin año, `trimestre` derivado, `horas = 0` indistinguible de vacío, y cómo una edición reescribe la imputación. Wagner: eso compromete la funcionalidad del reporte y NO se toca acá — va en su propio plan de cambios. Este plan no altera ningún cálculo del reporte.
- **Rollout a dev/prod**: cadena de PRs + `db push` de la migración, como los releases anteriores. Se hace al aprobar el QA, no en este plan.
- **RLS** en actividades/usuarios/notificaciones: decisión y migración aparte (cierra L1).
- **Notificar reasignación al editar** (cierra L3): YAGNI hasta que se pida.
- **Toggle de `verificado`**: se muestra en la ficha pero no es editable; funcionalidad nueva, no bug.
- **Optimistic concurrency / updated_at** (cierra L2): cuando el multiusuario real lo pida.
- **Pruebas E2E automatizadas (Playwright o similar): EXCLUIDAS por decisión de Wagner.** La verificación de navegador la hace él con la extensión de Claude sobre la checklist del Task 7. Este plan solo lleva tests unitarios puros (Vitest) + typecheck.
