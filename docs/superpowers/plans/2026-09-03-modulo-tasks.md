# El módulo `/tasks` — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar las tareas de Stratix 360 y ponerlas en un módulo propio, `/tasks`, que sirva a toda la empresa — con una columna nueva (`actividades.created_by_id`), un filtro de área que deriva el departamento del responsable, y Stratix 360 reducido a sus tres secciones que no son de tareas.

**Architecture:** Cinco fases, cada una un PR que deja la app funcionando. La fase 0 no es código: puebla `departamentos`/`equipos` desde `/admin`. La 1 agrega la columna y la escribe al crear. La 2 registra el módulo en los cinco lugares y monta `/tasks` **reusando los componentes donde están** — durante esta fase las mismas vistas se ven desde dos rutas, a propósito. La 3 muda las carpetas a `src/features/tasks/`, mueve el gate de asignables/liquidables a `MODULE.TASKS`, deja a Stratix con Social/Competitors/Team y abre la policy de `actividades` a los dos módulos. La 4 le agrega valores por defecto al motor de filtros que ya existe y estrena el filtro de área. La 5 no sale del spec sino del diagnóstico de rendimiento del 03/09 y **no depende de ninguna de las anteriores**: el `loading.tsx` de la tarea 15 es un archivo que arregla las 12 rutas de hoy y se puede adelantar y desplegar solo en cualquier momento.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + RLS, migraciones por CLI) · Vitest · Playwright (e2e)

**Spec:** `docs/superpowers/specs/2026-09-03-modulo-tasks-design.md`

---

## Global Constraints

Reglas del centinela que aplican a cada tarea. Se verifican antes de cada edición; el mensaje de bloqueo trae el *Motivo* y eso se arregla, no se esquiva.

- **El slug de un módulo se escribe una sola vez: sale de `MODULE`.** Nunca el literal `'tasks'` en TypeScript — siempre `MODULE.TASKS`. En SQL va en una variable con su `RAISE EXCEPTION`.
- **El slug del módulo va en una variable, y la migración aborta si no existe.** `has_module()` abre con `is_admin() OR …`: un slug mal tipeado da `true` para el admin —que es quien escribe y prueba la migración— y `false` en silencio para todo el resto.
- **Nombres de columnas FK:** `<entidad>_id` para clave surrogate (uuid). Por eso la columna es `created_by_id` y no `created_by`.
- **Un archivo se lee de una sentada: 50 líneas, y 150 es el techo.** Si una edición pasa el techo, el archivo se parte — no se agrega una marca de exención sin aprobación de Wagner.
- **Un componente es una carpeta, no un archivo**, y exporta UNA cosa por default.
- **Las páginas de `src/app/` son thin routes:** montan el feature y nada más.
- **Un `index` de carpeta que agrupa sólo re-exporta.**
- **Un directorio de `src/shared/` se importa por su barrel**, no módulo por módulo.
- **Nada de `../../`:** fuera del vecindario se importa con `@/`.
- **i18n: integrar, no ignorar.** Todo texto visible sale de `t()` con su clave en `es.json` **y** `en.json`. Nada de `i18n-ignore`.
- **El atributo `style` está prohibido**, las medidas van en `rem` y los colores salen de variables CSS.
- **Lo que cuenta plata, horas o tareas lleva test.**
- **Los datos de prueba se cargan por el frontend, no por seed.**
- **`supabase db reset` está PROHIBIDO en este repo.** Se usa `pnpm supabase migration up`.
- **Antes de un `db push` a prod: backup y precheck, en ese orden.**
- **No se commitea sin que Wagner apruebe.** Los pasos de commit dejan el árbol listo y muestran qué entra; la aprobación es de él.

Valores exactos que se repiten en varias tareas:

| Qué | Valor |
|---|---|
| Slug del módulo | `tasks` (constante `MODULE.TASKS`) |
| Columna nueva | `created_by_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL` — **nullable, sin default, sin backfill** |
| `PanelKey` nuevo | `'tasks'` |
| Clave de preferencia de pestaña | `tab-tasks` (la de Stratix sigue siendo `tab-stratix`) |
| Tabs de `/tasks` | `overview`, `kanban`, `solicitudes`, `reporte` |
| Tabs que le quedan a Stratix | `social`, `competencia`, `equipo` |
| Gate de asignables **y** liquidables | `MODULE.TASKS` en `team-derivations.ts:38` |
| Policy final de lectura | `has_module('tasks') OR has_module('stratix-mkt')` |

**Quién es asignable y quién es liquidable son la misma pregunta, y se contestan con el módulo `tasks`.** Una sola línea decide las dos (`deriveMiembrosAsignables`), porque de `miembrosAsignables` salen el `<select>` de responsable y, vía `useTablero.idsTeam` → `useReporte`, el `<select>` del reporte de pago. Por eso el Report se muda con todo lo demás y no queda condicionado a nada: dónde vive la pestaña nunca controló su alcance — el provider es uno solo y las dos rutas lo montan. La consecuencia es la política: **darle `tasks` a un rol lo vuelve asignable y liquidable a la vez.**

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| **Crear** `supabase/migrations/<ts>_actividades_created_by.sql` | Fase 1: la columna |
| **Modificar** `src/shared/context/loadAppData.ts` | `Actividad.created_by_id` |
| **Modificar** `src/features/stratix-mkt/hooks/useActividadForm/payload.ts` | `payloadDeAlta()` — el payload del alta, separado del de edición |
| **Modificar** `src/features/stratix-mkt/hooks/useActividadForm/index.ts` | El alta usa `payloadDeAlta` |
| **Modificar** `src/features/stratix-mkt/utils/act-detail-fields/grupos/asignacion.ts` | La fila «Creada por» en la ficha |
| **Modificar** `src/shared/auth/permissions/modulos/slugs.ts` | `MODULE.TASKS` |
| **Modificar** `src/shared/auth/permissions/modulos/index.ts` | Entrada en `MODULE_META` |
| **Modificar** `src/shared/components/shell/appShellConfig/{tipos,nav,paneles,subvistas}.ts` | `PanelKey`, rail, panel y sub-vistas |
| **Modificar** `src/shared/i18n/locales/{es,en}.json` | Claves nuevas |
| **Crear** `supabase/migrations/<ts>_modulo_tasks_role_modules.sql` | Fase 2: la fila en `role_modules`, derivada de quién tiene `stratix-mkt` |
| **Crear** `src/shared/components/shell/ModuloTabs/index.tsx` | El cuerpo compartido: AppShell + título por sección + la vista de la tab |
| **Crear** `src/features/tasks/index.ts` | API pública del feature (`TasksModule` + `access`) |
| **Crear** `src/features/tasks/constants/tabs.ts` | Catálogo de tabs de `/tasks` y su clave de preferencia |
| **Crear** `src/features/tasks/components/TasksModule/index.tsx` | Provider + contenido |
| **Crear** `src/features/tasks/components/TasksContent/index.tsx` | Las tres secciones + los dos modales |
| **Crear** `src/app/(app)/tasks/page.tsx` | Thin route |
| **Modificar** `src/features/stratix-mkt/components/StratixContext/index.tsx` | El provider acepta su catálogo de tabs por prop |
| **Modificar** `src/features/stratix-mkt/components/StratixContent/index.tsx` | Usa `ModuloTabs`; en la fase 3 pierde cuatro vistas |
| **Modificar** `src/features/stratix-mkt/constants/tabs.ts` | En la fase 3 quedan tres tabs y cambia el default |
| **Modificar** `src/shared/context/team-derivations.ts:38` | El gate de asignables/liquidables pasa a `MODULE.TASKS` |
| **Mover** `src/features/stratix-mkt/components/{overview,kanban,solicitudes,reporte,gantt,horas,modals,TaskTable}` | → `src/features/tasks/components/` |
| **Mover** `src/features/stratix-mkt/{hooks,utils}` de tareas + `report-filter.ts` | → `src/features/tasks/` |
| **Crear** `supabase/migrations/<ts>_actividades_policy_tasks.sql` | Fase 3: la policy con las dos condiciones |
| **Modificar** `src/shared/utils/filters.ts` | `defaultValue` en `FilterDef`, `resolveFilterValues`, `defaultFilterValues` |
| **Crear** `src/features/tasks/utils/departamento/index.ts` | `departamentoPorUsuario()` — la derivación responsable → equipo → departamento |
| **Modificar** `src/features/tasks/utils/act-filters/index.ts` | El `FilterDef` de área |

---

# Fase 0 — poblar el catálogo

No es código. Va primero porque sin esto la fase 4 se ve rota aunque esté bien escrita: hoy hay **una** fila en `departamentos` (`MKT · Marketing`) y **1 de 7** usuarios con `equipo_id`.

### Task 1: Departamentos, equipos y la asignación de cada persona

**Files:** ninguno — se carga por la UI. Los datos de prueba se cargan por el frontend, no por seed (regla del centinela: cada fila insertada por SQL esconde un agujero del formulario).

**Interfaces:**
- Consumes: `/admin` → Organización, tabs `departamentos` y `equipos`; `/admin` → Usuarios para el campo Equipo de cada ficha.
- Produces: `departamentos` con una fila por área real, `equipos` con `departamento_id` poblado, y `usuarios.equipo_id` no nulo para las 7 personas activas. Las tareas 12–14 dependen de esto.

- [ ] **Step 1: Levantar el entorno local**

```bash
pnpm supabase start
pnpm dev
```

- [ ] **Step 2: Medir el punto de partida**

```bash
pnpm supabase db psql -c "
  select (select count(*) from departamentos) as departamentos,
         (select count(*) from equipos)       as equipos,
         (select count(*) from equipos where departamento_id is null) as equipos_sin_depto,
         (select count(*) from usuarios where activo and equipo_id is null) as usuarios_sin_equipo;"
```

Anotar los cuatro números. Son el «antes» contra el que se verifica el paso 5.

- [ ] **Step 3: Cargar los departamentos por la UI**

Entrar a `/admin` → Organización → tab **Departamentos** y crear una fila por área real de la empresa (Marketing ya existe como `MKT`). Como mínimo, las que van a cargar tareas en `/tasks`: Marketing, Medical, Research, Cobranzas, TH/HR.

Anotar cualquier fricción del formulario (un campo que no valida, un select vacío, un error de Postgres crudo): eso es un hallazgo de QA y va al `.todo`, no se esquiva insertando por SQL.

- [ ] **Step 4: Cargar los equipos y asignar cada persona**

En el tab **Equipos**, crear los equipos de cada departamento y elegirle el departamento a cada uno. Después, en `/admin` → Usuarios, abrir la ficha de cada persona activa y elegirle su equipo.

- [ ] **Step 5: Verificar que no quedó nadie suelto**

```bash
pnpm supabase db psql -c "
  select count(*) as usuarios_sin_equipo from usuarios where activo and equipo_id is null;
  select count(*) as equipos_sin_depto   from equipos  where departamento_id is null;"
```

Esperado: **0 y 0**. Si no da cero, la fase 4 mostrará «—» para esas personas y el filtro de área las dejará fuera de todo.

- [ ] **Step 6: Repetir en producción**

Esto pasa por la UI de producción, con el usuario admin. No hay migración que llevar: son datos, no esquema. Verificar con el mismo `SELECT` del paso 5 contra prod (Wagner lo corre con `!`, ver la memoria «Consultar prod lo corre Wagner»).

- [ ] **Step 7: Anotar el resultado**

No hay commit — no cambió código. Dejar en el PR de la fase 1 una línea con los cuatro números del paso 2 y los dos del paso 5, para que se pueda auditar después que la fase 0 se hizo y no se salteó.

---

# Fase 1 — la columna

Chica, aditiva y desplegable sola. No depende de la fase 0.

### Task 2: La migración `created_by_id`

**Files:**
- Create: `supabase/migrations/<timestamp>_actividades_created_by.sql`

**Interfaces:**
- Consumes: la tabla `public.actividades` y `public.usuarios(id)`.
- Produces: la columna `actividades.created_by_id uuid NULL`. La consumen la tarea 3 (la escribe) y la 4 (la muestra).

- [ ] **Step 1: Crear el archivo de migración con la CLI**

```bash
pnpm supabase migration new actividades_created_by
```

Anotar la ruta que imprime — el timestamp lo pone la CLI y no se escribe a mano.

- [ ] **Step 2: Escribir la migración**

Contenido completo del archivo:

```sql
-- Quién CARGÓ la tarea. Nullable para siempre, y a propósito.
--
-- Hasta hoy no hacía falta preguntarlo: todas las tareas eran de marketing y el responsable
-- alcanzaba. Con cinco áreas cargando en el mismo tablero, «quién metió esto» pasa a ser una
-- pregunta real. `solicitante_id` NO la contesta: significa quién PIDIÓ el trabajo, no quién
-- cargó la fila, y se usa en 6 de 266 filas.
--
-- Por qué no alcanza con arreglar `historial`: el log ya registra el alta (`accion='created'`),
-- pero su única policy es `historial_admin_read USING is_admin()`. Un usuario normal que abra
-- el detalle de una tarea no vería esa fila — el dato quedaría escrito e invisible justo para
-- quien lo quiere leer. Abrir `historial` a todos no es opción: guarda `valor_anterior` y
-- `valor_nuevo` de cada cambio de cada tabla. Además `historial.registro_id` no tiene FK ni
-- unicidad sobre `accion='created'`: estructuralmente no puede prometer un creador por fila.
--
-- SIN BACKFILL. No hay de dónde sacarlo: `historial` registra las 282 altas con `usuario_id`
-- en NULL. Poner el responsable ahí sería inventar un dato. Las filas viejas muestran «—».
--
-- ON DELETE SET NULL, como el resto de las FK de esta tabla (ver
-- 20260825120000_actividades_fks_set_null.sql): borrar a una persona no borra las tareas que
-- cargó, sólo pierde la atribución.
--
-- El nombre: `created_by_id` y no `creado_por_id` ni `created_by`. `reuniones` ya usa inglés
-- para esta misma columna; el sufijo `_id` es lo que pide la regla de nombres de FK para una
-- clave surrogate (uuid). `reuniones.created_by` se aparta de esa regla y esto no repite la
-- desviación — unificarlas es un trabajo aparte.
--
-- Diseño: docs/superpowers/specs/2026-09-03-modulo-tasks-design.md

ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS created_by_id uuid
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.actividades.created_by_id IS
  'Quién cargó la fila. NO es `solicitante_id` (quién pidió el trabajo) ni `responsable_id` '
  '(quién lo ejecuta). Nullable para siempre: las filas anteriores a 2026-09 no tienen creador '
  'conocido y no se inventa uno. Se escribe sólo en el INSERT — un UPDATE nunca la toca.';
```

- [ ] **Step 3: Aplicar en local**

```bash
pnpm supabase migration up
```

Esperado: la migración corre sin error. **No** usar `db reset` — está prohibido en este repo (`config.toml` apunta a un `seed.sql` inexistente y un reset borra las actividades sin nada que las restaure).

- [ ] **Step 4: Verificar la forma de la columna**

```bash
pnpm supabase db psql -c "
  select column_name, data_type, is_nullable, column_default
    from information_schema.columns
   where table_name = 'actividades' and column_name = 'created_by_id';
  select count(*) as filas, count(created_by_id) as con_creador from actividades;"
```

Esperado: `uuid | YES | (null)`, y `con_creador = 0` — todas las filas existentes sin creador, que es el diseño.

- [ ] **Step 5: Verificar que la RLS sigue como estaba**

```bash
pnpm db:rls
```

Esperado: verde. La migración no toca policies; esto confirma que agregar una columna no dejó ninguna tabla expuesta (el guard prueba consultando como `anon`, no leyendo el esquema).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(tasks): actividades.created_by_id, la columna de quién cargó la tarea

El log de auditoría ya registra el alta, pero es admin-only: el dato quedaría
escrito e invisible para quien lo quiere leer. Nullable y sin backfill — no hay
de dónde sacar el creador de las 370 filas viejas y el responsable no lo es.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 3: El alta escribe el creador

El payload de `actividades` es **uno solo** para crear y editar, a propósito: si fueran dos, un campo agregado a uno y olvidado en el otro daría una tarea que se puede crear con un valor y nunca más limpiarlo. Pero `created_by_id` es la excepción exacta a esa regla — si viajara en el payload compartido, **cada edición lo pisaría con el editor de turno**, o peor, con `null`. Por eso el alta tiene su propia función, construida sobre la compartida.

**Files:**
- Modify: `src/features/stratix-mkt/hooks/useActividadForm/payload.ts`
- Modify: `src/features/stratix-mkt/hooks/useActividadForm/index.ts`
- Modify: `src/shared/context/loadAppData.ts:64-97` (el tipo `Actividad`)
- Test: `src/features/stratix-mkt/hooks/useActividadForm/payload.test.ts`

**Interfaces:**
- Consumes: `payloadDeActividad(form: NuevaActForm): Record<string, unknown>` (ya existe), `Actividad` de `@/shared/context/loadAppData`.
- Produces: `payloadDeAlta(form: NuevaActForm, creadorId: string | undefined): Record<string, unknown>` y `Actividad.created_by_id?: string`. Los consume la tarea 4.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/features/stratix-mkt/hooks/useActividadForm/payload.test.ts`, agregar el import y el bloque nuevo al final del archivo:

```ts
import { payloadDeActividad, payloadDeAlta } from './payload'
```

```ts
describe('payloadDeAlta', () => {
  it('agrega el creador al payload compartido', () => {
    const p = payloadDeAlta(form(), 'u9')
    expect(p.created_by_id).toBe('u9')
    // Todo lo demás sigue saliendo del payload compartido: crear y editar no se desincronizan.
    expect(p.titulo).toBe('Reel de agosto')
    expect(p.fecha_inicio).toBe('2026-08-19')
  })

  // Mientras el perfil carga no hay id. Una tarea sin creador es válida —las 370 viejas lo
  // son— y es preferible a un INSERT que revienta con "invalid input syntax for type uuid".
  it('escribe null si todavía no hay usuario', () => {
    expect(payloadDeAlta(form(), undefined).created_by_id).toBeNull()
    expect(payloadDeAlta(form(), '').created_by_id).toBeNull()
  })

  // La razón de que exista una función aparte: el payload de EDICIÓN viaja completo y con
  // nulls, así que si `created_by_id` estuviera adentro, cada edición borraría al creador.
  it('el payload compartido NO lleva la clave, ni siquiera en null', () => {
    expect('created_by_id' in payloadDeActividad(form())).toBe(false)
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
pnpm test src/features/stratix-mkt/hooks/useActividadForm/payload.test.ts
```

Esperado: FAIL — `payloadDeAlta is not a function`.

- [ ] **Step 3: Implementar `payloadDeAlta`**

Al final de `src/features/stratix-mkt/hooks/useActividadForm/payload.ts`:

```ts
// El payload del ALTA: el compartido más el creador. Es la única excepción a "un solo payload",
// y por eso está afuera y no adentro: `created_by_id` se escribe UNA vez y no se toca nunca más.
// Si viajara en `payloadDeActividad`, cada edición lo pisaría con quien esté editando.
//
// Sin usuario (el perfil todavía cargando) va `null` explícito: una tarea sin creador es válida
// —las 370 filas anteriores a esta columna lo son— y es mejor que un uuid vacío que revienta.
export function payloadDeAlta(form: NuevaActForm, creadorId: string | undefined): Record<string, unknown> {
  const fila = { ...payloadDeActividad(form), created_by_id: creadorId || null }
  return fila
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm test src/features/stratix-mkt/hooks/useActividadForm/payload.test.ts
```

Esperado: PASS, los tres nuevos y los que ya estaban.

- [ ] **Step 5: Agregar el campo al tipo `Actividad`**

En `src/shared/context/loadAppData.ts`, dentro de `export type Actividad`, después de la línea `solicitante_id?: string`:

```ts
  // Quién CARGÓ la fila — no quién la pidió (`solicitante_id`) ni quién la ejecuta
  // (`responsable_id`). Vacío en todo lo anterior a 2026-09: no hay de dónde backfillearlo.
  created_by_id?: string
```

- [ ] **Step 6: Usar `payloadDeAlta` en el alta**

En `src/features/stratix-mkt/hooks/useActividadForm/index.ts`:

Cambiar el import:

```ts
import { payloadDeActividad, payloadDeAlta } from './payload'
```

Y en `crearActividad()`, la rama del INSERT (la que corre cuando `editando?.id` es falso) pasa a llamar a `actividadesRepo.create(payloadDeAlta(valores, usuario?.id))` en vez de `create(payload)`. La rama del UPDATE **no se toca**: sigue usando `payload = payloadDeActividad(valores)`.

- [ ] **Step 7: Verificar tipos y tests**

```bash
pnpm typecheck && pnpm test
```

Esperado: sin errores de tipo, toda la suite verde.

- [ ] **Step 8: Probar el alta en el navegador**

Con `pnpm dev` corriendo, entrar a `/stratix-mkt` → Production → «Nueva tarea», llenarla y guardar. Después:

```bash
pnpm supabase db psql -c "
  select a.titulo, u.nombre as creador
    from actividades a left join usuarios u on u.id = a.created_by_id
   order by a.created_at desc limit 3;"
```

Esperado: la tarea recién creada con el nombre del usuario logueado; las anteriores con `creador` en NULL.

- [ ] **Step 9: Probar que editar NO borra el creador**

Abrir esa misma tarea, editarle el título y guardar. Repetir el `SELECT` del paso 8.

Esperado: el título cambió y **el creador sigue puesto**. Éste es el chequeo que justifica la función separada.

- [ ] **Step 10: Commit**

```bash
git add src/shared/context/loadAppData.ts src/features/stratix-mkt/hooks/useActividadForm/
git commit -m "feat(tasks): el alta de una tarea guarda quién la cargó

Payload aparte para el alta, no un campo más en el compartido: el de edición
viaja completo y con nulls, así que ahí adentro cada edición pisaría al creador.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 4: «Creada por» en la ficha de la tarea

**Files:**
- Modify: `src/features/stratix-mkt/utils/act-detail-fields/grupos/asignacion.ts`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/en.json`
- Test: `src/features/stratix-mkt/utils/act-detail-fields/index.test.ts`

**Interfaces:**
- Consumes: `Actividad.created_by_id` (tarea 3), `Deps.miembrosPorId: Record<string, string>`, `campo(label, value, vacio)` de `../tipos`.
- Produces: un tercer `DetalleCampo` en el grupo «Asignación». Nadie más lo consume.

- [ ] **Step 1: Escribir el test que falla**

En `src/features/stratix-mkt/utils/act-detail-fields/index.test.ts`, agregar al final:

```ts
describe('grupo Asignación · quién cargó la tarea', () => {
  const deps = { t: ((k: string) => k) as never, locale: 'es-EC', miembrosPorId: { u1: 'Ana', u9: 'Beto' } }

  it('muestra el nombre de quien la creó', () => {
    const g = camposDeActividad({ responsable_id: 'u1', created_by_id: 'u9' }, deps)[0]
    const creada = g.campos.find(c => c.label === 'stratix.detail.createdBy')
    expect(creada?.value).toBe('Beto')
    expect(creada?.vacio).toBe(false)
  })

  // Las 370 filas anteriores a la columna no tienen creador y nunca lo van a tener. El campo
  // existe igual —que no se sepa ES información— pero atenuado, como el resto de los vacíos.
  it('muestra «—» atenuado cuando no hay creador', () => {
    const g = camposDeActividad({ responsable_id: 'u1' }, deps)[0]
    const creada = g.campos.find(c => c.label === 'stratix.detail.createdBy')
    expect(creada?.value).toBe('—')
    expect(creada?.vacio).toBe(true)
  })
})
```

Si el archivo todavía no importa `camposDeActividad`, agregar `import { camposDeActividad } from './index'` arriba.

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
pnpm test src/features/stratix-mkt/utils/act-detail-fields/index.test.ts
```

Esperado: FAIL — `creada` es `undefined`.

- [ ] **Step 3: Agregar las claves de i18n**

En `src/shared/i18n/locales/es.json`, junto a `"stratix.detail.requestedBy"`:

```json
  "stratix.detail.createdBy": "Creada por",
```

En `src/shared/i18n/locales/en.json`, en la misma posición:

```json
  "stratix.detail.createdBy": "Created by",
```

Ojo con la clave que ya existe: `stratix.detail.created` es «Creada» a secas, el sello de tiempo del pie. Ésta es distinta.

- [ ] **Step 4: Agregar el campo al grupo**

`src/features/stratix-mkt/utils/act-detail-fields/grupos/asignacion.ts` queda así:

```ts
import { campo, type Deps, type GrupoCampos } from '../tipos'
import type { Actividad } from '@/features/stratix-mkt/types'

// Quién ejecuta, quién pidió y quién cargó. Es lo primero que se busca al abrir una ficha.
// Las tres son personas distintas y con cinco áreas en el mismo tablero dejan de coincidir.
export function grupoAsignacion(a: Actividad, { t, miembrosPorId }: Deps): GrupoCampos {
  const persona = (id: string | undefined) => miembrosPorId[id ?? ''] ?? '—'
  return {
    titulo: t('stratix.detail.grupoAsignacion'),
    campos: [
      campo(t('stratix.col.assignee'), persona(a.responsable_id), !a.responsable_id),
      campo(t('stratix.detail.requestedBy'), persona(a.solicitante_id), !a.solicitante_id),
      campo(t('stratix.detail.createdBy'), persona(a.created_by_id), !a.created_by_id),
    ],
  }
}
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

```bash
pnpm test src/features/stratix-mkt/utils/act-detail-fields/
```

Esperado: PASS. Si algún test viejo contaba campos («la ficha tiene 10 campos»), actualizar ese número — pasó a 11.

- [ ] **Step 6: Verificar en el navegador**

Abrir la ficha de la tarea creada en la tarea 3: dice «Creada por» con el nombre. Abrir una vieja: dice «—» atenuado.

- [ ] **Step 7: Gate completo y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

```bash
git add src/features/stratix-mkt/utils/act-detail-fields/ src/shared/i18n/locales/
git commit -m "feat(tasks): la ficha dice quién cargó la tarea

Tercera persona del grupo Asignación. Las viejas muestran «—» atenuado: no hay
creador que backfillear y el responsable no lo es.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

# Fase 2 — el módulo

Al final de esta fase `/tasks` y Stratix muestran **lo mismo**, y eso es a propósito: dos puertas a la misma vista es un estado seguro para verificar antes de mover una sola carpeta.

### Task 5: Registrar el módulo — los cinco lugares y la fila de la RLS

**Files:**
- Modify: `src/shared/auth/permissions/modulos/slugs.ts`
- Modify: `src/shared/auth/permissions/modulos/index.ts`
- Modify: `src/shared/components/shell/appShellConfig/tipos.ts`
- Modify: `src/shared/components/shell/appShellConfig/nav.ts`
- Modify: `src/shared/components/shell/appShellConfig/paneles.ts`
- Modify: `src/shared/components/shell/appShellConfig/subvistas.ts`
- Modify: `src/shared/i18n/locales/{es,en}.json`
- Create: `supabase/migrations/<timestamp>_modulo_tasks_role_modules.sql`
- Test: `src/shared/auth/permissions/rutas/index.test.ts`

**Interfaces:**
- Consumes: `MODULE`, `ModuleSlug`, `PanelKey`, `SubItem`.
- Produces: `MODULE.TASKS = 'tasks'`, la entrada `MODULE_META['tasks']`, el `PanelKey` `'tasks'`, `SUB_ITEMS.tasks` (tres `SubItem`) y la fila `role_modules`. Los consumen las tareas 6, 7 y 13.

- [ ] **Step 1: Escribir el test que falla**

En `src/shared/auth/permissions/rutas/index.test.ts`, dentro del `describe('moduleForPath')`:

```ts
  it('/tasks es su propio módulo', () => {
    expect(moduleForPath('/tasks')).toBe('tasks')
    expect(moduleForPath('/tasks/kanban')).toBe('tasks')
  })
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
pnpm test src/shared/auth/permissions/rutas/index.test.ts
```

Esperado: FAIL — devuelve `null` porque el slug no está en `ALL_MODULES`.

- [ ] **Step 3: El slug (lugar 1 de 5)**

En `src/shared/auth/permissions/modulos/slugs.ts`, primera entrada del objeto `MODULE` (el orden del objeto no significa nada, pero `tasks` arriba de `STRATIX_MKT` deja leer de dónde salió):

```ts
export const MODULE = {
  TASKS: 'tasks',
  STRATIX_MKT: 'stratix-mkt',
  // … el resto sin tocar
```

- [ ] **Step 4: El catálogo (lugar 2 de 5)**

En `src/shared/auth/permissions/modulos/index.ts`, como primera entrada de `MODULE_META`:

```ts
  [MODULE.TASKS]: {
    slug: MODULE.TASKS,
    name: 'Tasks',
    description: 'Las tareas de toda la empresa: tablero, solicitudes y producción.',
    leader: null,
  },
```

`ALL_MODULES` se deriva de acá, así que `moduleForPath` empieza a resolver `/tasks` sin tocar nada más.

- [ ] **Step 5: Correr el test y verificar que pasa**

```bash
pnpm test src/shared/auth/permissions/
```

Esperado: PASS.

- [ ] **Step 6: El `PanelKey` y el rail (lugar 4 de 5, parte 1)**

En `src/shared/components/shell/appShellConfig/tipos.ts`:

```ts
export type PanelKey = 'tasks' | 'mkt' | 'medical' | 'research' | 'admin'
```

En `nav.ts`, como primera entrada de `NAV` (el rail se lee de arriba abajo y las tareas son lo más usado):

```ts
  { slug: MODULE.TASKS, key: 'tasks', icon: '✅', label: 'Tasks', panel: 'tasks' },
```

Y en `AUTO_TITLE`, antes de la entrada de Stratix:

```ts
  [MODULE.TASKS]: 'Tasks — Tareas del grupo',
```

- [ ] **Step 7: El panel y las sub-vistas (lugar 4 de 5, parte 2)**

En `paneles.ts`, primera entrada de `PANEL_META`:

```ts
  tasks: { title: 'Tasks', sub: 'Tareas de todo el grupo', slug: MODULE.TASKS },
```

En `subvistas.ts`, primera entrada de `SUB_ITEMS`:

```ts
  // Las cuatro secciones de tareas, con los MISMOS ids de tab que en Stratix: durante la fase 2
  // las dos rutas montan las mismas vistas y una tab que no coincidiera abriría en blanco.
  tasks: [
    { id: 'tasks-dash', icon: '📊', label: 'Dashboard', tab: 'overview' },
    { id: 'tasks-prod', icon: '⚡', label: 'Production', tab: 'kanban' },
    { id: 'tasks-sol', icon: '📋', label: 'Requests', tab: 'solicitudes' },
    { id: 'tasks-rep', icon: '💰', label: 'Report', tab: 'reporte' },
  ],
```

- [ ] **Step 8: Las claves de i18n (lugar 5 de 5)**

En `src/shared/i18n/locales/es.json`:

```json
  "tasks.title": "Tareas",
  "tasks.filter.allAreas": "Todas las áreas",
```

En `en.json`, en la misma posición:

```json
  "tasks.title": "Tasks",
  "tasks.filter.allAreas": "All areas",
```

`tasks.filter.allAreas` se estrena recién en la tarea 14; se agrega ahora para que las dos claves del módulo entren juntas y `en.json` nunca quede corto (el `satisfies` de `i18n/index.tsx` rompe el build si falta una).

- [ ] **Step 9: La fila en `role_modules` — la mitad invisible**

```bash
pnpm supabase migration new modulo_tasks_role_modules
```

Contenido:

```sql
-- El módulo `tasks` para la RLS. Sin esto el módulo existe para la app y no para Postgres:
-- `has_module('tasks')` da false, las listas vuelven vacías y no hay ningún error. Ya pasó.
--
-- Los roles NO se enumeran a mano: se copian de quién tiene `stratix-mkt` hoy. Es la garantía
-- de que nadie pierde acceso al tablero por esta fase — quien lo veía lo sigue viendo, ahora
-- por las dos puertas.
DO $$
DECLARE
  slug_nuevo text := 'tasks';
  slug_viejo text := 'stratix-mkt';
  copiados int;
BEGIN
  -- El slug viejo va en variable con su verificación por la misma razón de siempre:
  -- `role_modules.module_slug` es text sin FK, y uno mal escrito no falla — copiaría cero filas
  -- y dejaría el módulo mudo para todos menos el admin, que es quien prueba la migración.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;

  INSERT INTO public.role_modules (role_key, module_slug)
  VALUES ('admin', slug_nuevo)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_modules (role_key, module_slug)
  SELECT role_key, slug_nuevo FROM public.role_modules WHERE module_slug = slug_viejo
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO copiados FROM public.role_modules WHERE module_slug = slug_nuevo;
  IF copiados = 0 THEN
    RAISE EXCEPTION 'ningún rol quedó con el módulo %', slug_nuevo;
  END IF;
END $$;
```

- [ ] **Step 10: Aplicar y verificar la migración**

```bash
pnpm supabase migration up
pnpm supabase db psql -c "
  select module_slug, count(*) as roles
    from role_modules where module_slug in ('tasks','stratix-mkt')
   group by module_slug order by module_slug;"
```

Esperado: las dos filas con **el mismo número de roles** (o `tasks` con uno más, si `admin` no estaba en la lista vieja — el admin corta por `is_admin()` de todos modos).

- [ ] **Step 11: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

```bash
git add src/shared/auth/permissions/ src/shared/components/shell/appShellConfig/ src/shared/i18n/locales/ supabase/migrations/
git commit -m "feat(tasks): registrar el módulo en los cinco lugares y en role_modules

Los roles del módulo nuevo se copian de quién tiene stratix-mkt, no se enumeran:
así nadie pierde el tablero por esta fase.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 6: `ModuloTabs` — el cuerpo compartido de un módulo con sub-vistas

`StratixContent` es AppShell + el título de la sección + la vista de la tab. `/tasks` necesita exactamente eso, y después de la fase 3 los dos siguen existiendo (Stratix se queda con tres secciones propias). Son dos consumidores reales y permanentes, no una abstracción especulativa: el markup se unifica antes de duplicarlo.

**Files:**
- Create: `src/shared/components/shell/ModuloTabs/index.tsx`
- Modify: `src/features/stratix-mkt/components/StratixContent/index.tsx`

**Interfaces:**
- Consumes: `AppShell`, `SUB_ITEMS`, `PanelKey` de `@/shared/components/shell/appShellConfig`, `PageTransition` de `@/shared/motion`, `soloDelCatalogo` de `@/shared/utils`.
- Produces:

```ts
function ModuloTabs<T extends string>(props: {
  panel: PanelKey
  titulo: string                       // el prefijo: "Stratix 360" / "Tasks"
  tabs: readonly T[]                   // el catálogo: valida lo que emite AppShell y lo que llega guardado
  activa: string                       // string, no T: viene de una preferencia que puede estar vieja
  onTab: (v: T) => void
  vistas: Record<string, JSX.Element>
  children?: React.ReactNode           // lo que va montado siempre: los modales
}): JSX.Element
```

`activa` entra como `string` y se estrecha **acá adentro**, contra el catálogo. Es lo que evita un `as T` en cada consumidor: la pestaña sale de una preferencia guardada que puede nombrar una sección que ya no existe, y un cast diría que eso no pasa mientras pasa.

La consume la tarea 7.

- [ ] **Step 1: Escribir el componente**

`src/shared/components/shell/ModuloTabs/index.tsx`:

```tsx
'use client'
import AppShell from '@/shared/components/shell/AppShell'
import { SUB_ITEMS, type PanelKey } from '@/shared/components/shell/appShellConfig'
import { PageTransition } from '@/shared/motion'
import { soloDelCatalogo, esDelCatalogo } from '@/shared/utils'

type Props<T extends string> = {
  panel: PanelKey
  titulo: string
  tabs: readonly T[]
  activa: string
  onTab: (v: T) => void
  vistas: Record<string, JSX.Element>
  children?: React.ReactNode
}

// El título sigue a la SECCIÓN abierta, no al módulo, y sale de SUB_ITEMS para que el sidebar y
// el encabezado digan lo mismo siempre — incluso si mañana se renombra una sección.
const tituloDeSeccion = (panel: PanelKey, titulo: string, tab: string) => {
  const item = SUB_ITEMS[panel].find(i => (i.tabs ? i.tabs.includes(tab) : i.tab === tab))
  return item ? `${titulo} — ${item.label}` : titulo
}

// El cuerpo de un módulo con sub-vistas: el shell, el título de la sección y la vista abierta.
// `children` es lo que vive fuera de las tabs (los modales), no la lista de lo que va adentro.
export default function ModuloTabs<T extends string>({ panel, titulo, tabs, activa, onTab, vistas, children }: Props<T>) {
  // AppShell es compartido y emite un string cualquiera; el catálogo del módulo decide qué
  // entra. Sin esta frontera haría falta un `as T`, que no valida nada.
  const cambiarTab = soloDelCatalogo<T>(tabs, onTab)

  // La misma frontera para lo que ENTRA, con el guard que ya existe. `activa` sale de una
  // preferencia guardada y puede nombrar una sección que ya no existe —le pasa a cualquiera que
  // tuviera `kanban` guardado en `tab-stratix`—: acá se degrada a la primera en vez de renderizar
  // `undefined`, que es una pantalla en blanco sin ningún error.
  const tab: T = esDelCatalogo(tabs)(activa) ? activa : tabs[0]

  return (
    <AppShell title={tituloDeSeccion(panel, titulo, tab)} activeTab={tab} onTabChange={cambiarTab}>
      <PageTransition>
        <div>
          {vistas[tab]}
          {children}
        </div>
      </PageTransition>
    </AppShell>
  )
}
```

- [ ] **Step 2: Reescribir `StratixContent` sobre él**

`src/features/stratix-mkt/components/StratixContent/index.tsx` conserva sus imports de vistas y de `useStratix`, y el `tabViews` tal como está; lo que cambia es el cuerpo y desaparecen `sectionTitle`, `soloDelCatalogo`, `AppShell`, `SUB_ITEMS` y `PageTransition`:

```tsx
import ModuloTabs from '@/shared/components/shell/ModuloTabs'
```

```tsx
export default function StratixContent() {
  const { mktTab, setMktTab } = useStratix()

  return (
    <ModuloTabs panel="mkt" titulo="Stratix 360" tabs={STRATIX_TABS} activa={mktTab} onTab={setMktTab} vistas={tabViews}>
      <ActivityDetailModal />
      <NewActivityModal />
    </ModuloTabs>
  )
}
```

- [ ] **Step 3: Verificar que Stratix no cambió**

```bash
pnpm typecheck && pnpm test
```

Con `pnpm dev`, recorrer las siete secciones de `/stratix-mkt`: el título del topbar sigue diciendo `Stratix 360 — <sección>` y los modales siguen abriendo. Es un refactor puro; si algo se ve distinto, se ve distinto por un bug.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/shell/ModuloTabs/ src/features/stratix-mkt/components/StratixContent/
git commit -m "refactor(shell): el cuerpo de un módulo con sub-vistas sale a ModuloTabs

/tasks necesita el mismo shell + título por sección, y después de la mudanza los
dos módulos siguen existiendo. Se unifica antes de duplicarlo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 7: El feature `/tasks`, montando los componentes donde están

Nada se mueve de carpeta todavía. `/tasks` importa las vistas de `@/features/stratix-mkt/…` y monta el mismo provider con su propio catálogo de tabs y su propia clave de preferencia.

**Files:**
- Modify: `src/features/stratix-mkt/components/StratixContext/index.tsx`
- Create: `src/features/tasks/constants/tabs.ts`
- Create: `src/features/tasks/components/TasksContent/index.tsx`
- Create: `src/features/tasks/components/TasksModule/index.tsx`
- Create: `src/features/tasks/index.ts`
- Create: `src/app/(app)/tasks/page.tsx`
- Test: `src/features/tasks/constants/tabs.test.ts`

**Interfaces:**
- Consumes: `StratixProvider` y `useStratix` de `@/features/stratix-mkt/components/StratixContext`; las vistas `OverviewTab`, `KanbanTab`, `SolicitudesTab` y los modales `ActivityDetailModal`, `NewActivityModal` de `@/features/stratix-mkt/components/…`; `ModuloTabs` (tarea 6); `MODULE.TASKS` (tarea 5).
- Produces: `TASKS_TAB`, `TASKS_TABS`, `TASKS_TAB_PREF`, `TasksModule`, y `access = { module: MODULE.TASKS }`. Los consumen las tareas 8, 9 y 13.

- [ ] **Step 1: Escribir el test que falla**

`src/features/tasks/constants/tabs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TASKS_TAB, TASKS_TABS, TASKS_TAB_PREF } from './tabs'
import { STRATIX_TAB } from '@/features/stratix-mkt/constants/tabs'

describe('catálogo de tabs de /tasks', () => {
  // Durante la fase 2 las dos rutas montan las MISMAS vistas: un id de tab distinto abriría
  // /tasks en blanco. Los valores tienen que coincidir con los de Stratix, uno por uno.
  it('los ids coinciden con los de Stratix', () => {
    expect(TASKS_TAB.OVERVIEW).toBe(STRATIX_TAB.OVERVIEW)
    expect(TASKS_TAB.KANBAN).toBe(STRATIX_TAB.KANBAN)
    expect(TASKS_TAB.SOLICITUDES).toBe(STRATIX_TAB.SOLICITUDES)
    expect(TASKS_TAB.REPORTE).toBe(STRATIX_TAB.REPORTE)
  })

  it('son las cuatro secciones de tareas', () => {
    expect([...TASKS_TABS]).toEqual(['overview', 'kanban', 'solicitudes', 'reporte'])
  })

  // La preferencia es POR MÓDULO: si compartieran clave, abrir /tasks en Requests cambiaría
  // la sección con la que abre Stratix.
  it('la clave de preferencia es propia', () => {
    expect(TASKS_TAB_PREF).toBe('tab-tasks')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
pnpm test src/features/tasks/
```

Esperado: FAIL — no existe el módulo.

- [ ] **Step 3: El catálogo de tabs**

`src/features/tasks/constants/tabs.ts`:

```ts
// Las vistas del módulo. Los valores son el DATO —lo que se guarda en la preferencia
// `tab-tasks`—, no la etiqueta: lo que se muestra sale de SUB_ITEMS y de i18n.
//
// Coinciden con los de Stratix a propósito: durante la fase 2 las dos rutas montan las mismas
// vistas.
export const TASKS_TAB = {
  OVERVIEW: 'overview',
  KANBAN: 'kanban',
  SOLICITUDES: 'solicitudes',
  REPORTE: 'reporte',
} as const

export type TasksTab = (typeof TASKS_TAB)[keyof typeof TASKS_TAB]

// El tipo va explícito: `Object.values` ensancha a string[] y el catálogo dejaría de estrechar
// nada en quien lo consuma.
export const TASKS_TABS: readonly TasksTab[] = Object.values(TASKS_TAB)

// La clave con la que se recuerda la pestaña abierta. Propia del módulo: compartirla con
// Stratix haría que abrir uno cambiara la sección del otro.
export const TASKS_TAB_PREF = 'tab-tasks'
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
pnpm test src/features/tasks/constants/tabs.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Parametrizar el provider**

En `src/features/stratix-mkt/components/StratixContext/index.tsx`, la firma de `StratixProvider` pasa a aceptar el catálogo por prop, con los valores de Stratix como default para que ningún consumidor actual se toque:

```tsx
// El provider compone los cinco hooks de datos; QUÉ pestaña está abierta depende de por qué
// ruta se entró. `/tasks` monta los mismos hooks con su propio catálogo y su propia clave: si
// la compartieran, abrir un módulo cambiaría la sección del otro.
export function StratixProvider({
  children,
  prefKey = STRATIX_TAB_PREF,
  tabs = STRATIX_TABS,
  tabInicial = STRATIX_TAB.KANBAN,
}: {
  children: React.ReactNode
  prefKey?: string
  tabs?: readonly string[]
  tabInicial?: string
}) {
  const [mktTab, setMktTab] = useUserPreference<string>(prefKey, tabInicial, oneOf(...tabs))
  // … el resto del cuerpo, sin cambios
```

En el tipo `StratixData`, la pestaña pasa de `StratixTab` a `string` — el catálogo ya no lo fija el provider sino quien lo monta, y `ModuloTabs` lo estrecha contra el suyo:

```ts
  & { mktTab: string; setMktTab: (v: string | ((p: string) => string)) => void }
```

Si `StratixTab` deja de usarse en ese archivo, sacar el import: un import muerto es una pista falsa de que el provider todavía conoce el catálogo.

- [ ] **Step 6: El contenido de `/tasks`**

`src/features/tasks/components/TasksContent/index.tsx`:

```tsx
'use client'
import ModuloTabs from '@/shared/components/shell/ModuloTabs'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import OverviewTab from '@/features/stratix-mkt/components/overview/OverviewTab'
import KanbanTab from '@/features/stratix-mkt/components/kanban/KanbanTab'
import SolicitudesTab from '@/features/stratix-mkt/components/solicitudes/SolicitudesTab'
import ReporteTab from '@/features/stratix-mkt/components/reporte/ReporteTab'
import ActivityDetailModal from '@/features/stratix-mkt/components/modals/ActivityDetailModal'
import NewActivityModal from '@/features/stratix-mkt/components/modals/NewActivityModal'
import { TASKS_TABS } from '@/features/tasks/constants/tabs'

// Fase 2: las vistas se montan DONDE ESTÁN, sin mover una carpeta. Los imports apuntan a
// stratix-mkt a propósito — la mudanza es la fase 3 y así este PR se puede revertir solo.
const tabViews: Record<string, JSX.Element> = {
  overview: <OverviewTab />,
  kanban: <KanbanTab />,
  solicitudes: <SolicitudesTab />,
  reporte: <ReporteTab />,
}

export default function TasksContent() {
  const { mktTab, setMktTab } = useStratix()

  return (
    <ModuloTabs panel="tasks" titulo="Tasks" tabs={TASKS_TABS} activa={mktTab} onTab={setMktTab} vistas={tabViews}>
      <ActivityDetailModal />
      <NewActivityModal />
    </ModuloTabs>
  )
}
```

- [ ] **Step 7: El módulo**

`src/features/tasks/components/TasksModule/index.tsx`:

```tsx
'use client'
import { StratixProvider } from '@/features/stratix-mkt/components/StratixContext'
import { TASKS_TAB, TASKS_TABS, TASKS_TAB_PREF } from '@/features/tasks/constants/tabs'
import TasksContent from '../TasksContent'

export default function TasksModule() {
  return (
    <StratixProvider prefKey={TASKS_TAB_PREF} tabs={TASKS_TABS} tabInicial={TASKS_TAB.KANBAN}>
      <TasksContent />
    </StratixProvider>
  )
}
```

- [ ] **Step 8: La API pública del feature**

`src/features/tasks/index.ts`:

```ts
import { MODULE } from '@/shared/auth/permissions'

// API pública de la feature. La thin route de `src/app/` monta esto y nada más.
export { default as TasksModule } from './components/TasksModule'

// Convención access-aware. El slug sale de `MODULE` y no escrito a mano: un literal mal
// tipeado no rompe el build, sólo deja de coincidir en silencio.
export const access = { module: MODULE.TASKS } as const
```

- [ ] **Step 9: La thin route (lugar 3 de 5)**

`src/app/(app)/tasks/page.tsx`:

```tsx
import { TasksModule } from '@/features/tasks'

export default function TasksPage() {
  return <TasksModule />
}
```

- [ ] **Step 10: Verificar el gate**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

- [ ] **Step 11: Verificar en el navegador — las dos puertas**

Con `pnpm dev`:

1. El rail muestra el ícono ✅ **Tasks** y abre un panel con Dashboard / Production / Requests.
2. `/tasks` renderiza el mismo tablero que `/stratix-mkt`, y crear una tarea desde ahí funciona.
3. Cambiar de sección en `/tasks`, ir a `/stratix-mkt` y volver: cada uno recuerda **su** sección (`tab-tasks` y `tab-stratix` son claves distintas).
4. `/stratix-mkt` sigue con sus siete secciones intactas.

- [ ] **Step 12: Verificar con un rol que NO tiene el módulo**

Con un usuario cuyo rol no esté en `role_modules` para `tasks`, entrar a `/tasks`: tiene que aparecer `AccessDenied`, no una lista vacía. Una lista vacía sin error es el síntoma de que falta la fila de la RLS.

- [ ] **Step 13: Commit**

```bash
git add src/features/tasks/ "src/app/(app)/tasks/" src/features/stratix-mkt/components/StratixContext/
git commit -m "feat(tasks): el módulo /tasks, montando las vistas donde están

Fase 2: nada se mueve de carpeta. Las dos rutas muestran lo mismo a propósito —
es el estado seguro para verificar antes de la mudanza.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

# Fase 3 — la mudanza

Las cuatro tareas de esta fase van juntas en un PR: entre la 8 y la 10 la app no compila.

### Task 8: Mover los componentes de tareas a `src/features/tasks/`

**Files:**
- Move: `src/features/stratix-mkt/components/{overview,kanban,solicitudes,reporte,gantt,horas,modals,TaskTable}` → `src/features/tasks/components/`
- Move: `src/features/stratix-mkt/hooks/{useTablero,useKanban,useSolicitudes,useActividadForm,useReporte}` → `src/features/tasks/hooks/`
- Move: `src/features/stratix-mkt/utils/{act-filters,act-detail-fields,act-form.ts,act-form.test.ts,act-tarjeta,gantt-layout.ts,gantt-rango,periodo,availability,report-html}` → `src/features/tasks/utils/`
- Move: `src/features/stratix-mkt/{report-filter.ts,report-filter.test.ts}` → `src/features/tasks/`
- Move: `src/features/stratix-mkt/components/{StratixContext,StratixContent,StratixModule}` → ver el paso 4
- Modify: `src/features/tasks/components/TasksContent/index.tsx`, `src/features/tasks/components/TasksModule/index.tsx`

**Interfaces:**
- Consumes: todo lo de la tarea 7.
- Produces: las mismas exportaciones, en `@/features/tasks/…`. Las consumen las tareas 9, 10, 13 y 14.

Se mudan las **cuatro** secciones, el Report incluido. Lo que decide su alcance es el gate de la tarea 9, no en qué carpeta vive el componente — y esa distinción es justo la que hacía parecer que mudarlo era arriesgado.

- [ ] **Step 1: Mover con `git mv`, no copiando**

```bash
mkdir -p src/features/tasks/hooks src/features/tasks/utils
for d in overview kanban solicitudes reporte gantt horas modals TaskTable; do
  git mv "src/features/stratix-mkt/components/$d" "src/features/tasks/components/$d"
done
for d in useTablero useKanban useSolicitudes useActividadForm useReporte; do
  git mv "src/features/stratix-mkt/hooks/$d" "src/features/tasks/hooks/$d"
done
for d in act-filters act-detail-fields act-tarjeta gantt-rango periodo availability report-html; do
  git mv "src/features/stratix-mkt/utils/$d" "src/features/tasks/utils/$d"
done
git mv src/features/stratix-mkt/utils/act-form.ts       src/features/tasks/utils/act-form.ts
git mv src/features/stratix-mkt/utils/act-form.test.ts  src/features/tasks/utils/act-form.test.ts
git mv src/features/stratix-mkt/utils/gantt-layout.ts   src/features/tasks/utils/gantt-layout.ts
git mv src/features/stratix-mkt/report-filter.ts        src/features/tasks/report-filter.ts
git mv src/features/stratix-mkt/report-filter.test.ts   src/features/tasks/report-filter.test.ts
git mv src/features/stratix-mkt/types.ts                src/features/tasks/types.ts
```

`types.ts` también, y no es un extra: sus 24 consumidores se mudan todos —`NuevaActForm`, `FormActividad`, `ReporteCriterios`, `SolicitudesCriterios` y `ResumenHoras` son tipos de tareas— y ninguna de las tres secciones que le quedan a Stratix lo importa. Si se quedara, cada componente mudado seguiría importando tipos desde `stratix-mkt` y la mudanza quedaría a medias.

Lo que **no** se mueve: `data.ts` (los datos estáticos de Social y Competencia), `team.ts` (las exclusiones del roster) e `index.ts` con su test.

`git mv` conserva la historia de cada archivo. Copiar y borrar la pierde y hace ilegible el `git log` de todo lo que se mudó.

- [ ] **Step 2: Reescribir los imports**

```bash
grep -rln "@/features/stratix-mkt/\(components/\(overview\|kanban\|solicitudes\|reporte\|gantt\|horas\|modals\|TaskTable\)\|hooks\|utils/\(act-filters\|act-detail-fields\|act-form\|act-tarjeta\|gantt-layout\|gantt-rango\|periodo\|availability\|report-html\)\|types\|report-filter\)" src e2e
```

Cada archivo de esa lista se edita con **Edit**, no con `sed -i`: el centinela sólo intercepta las herramientas de edición, y una reescritura por Bash pasa de largo sus reglas. Son reemplazos de `@/features/stratix-mkt/` por `@/features/tasks/` **sólo en las rutas que se movieron** — `@/features/stratix-mkt/data` y `@/features/stratix-mkt/team` no se tocan.

Ojo con `utils/availability`: lo consume `SolicitudesAvailabilityView`, que también se muda. Y con `@/features/stratix-mkt/constants/tabs`, que **no** se muda: `STRATIX_TAB` sigue siendo de Stratix.

- [ ] **Step 3: Los barrels que quedaron a medias**

`src/features/stratix-mkt/hooks/index.ts` se queda sin nada que exportar: los cinco hooks se mudaron. Se borra con `git rm`, y también `src/features/stratix-mkt/hooks/` si queda vacía — un barrel vacío es una pista falsa de que ahí todavía vive algo.

Crear `src/features/tasks/hooks/index.ts` con los cinco:

```ts
// Barrel de los hooks del módulo. Re-exportación NOMBRADA, no `export *`: es la forma que
// Next 14 resuelve sin arrastrar los vecinos al grafo de módulos.
export { useTablero } from './useTablero'
export { useKanban } from './useKanban'
export { useSolicitudes } from './useSolicitudes'
export { useActividadForm } from './useActividadForm'
export { useReporte } from './useReporte'
```

Que los cinco se muden juntos es lo que deja el feature `tasks` sin ningún import hacia `stratix-mkt`: la mudanza queda en una sola dirección.

- [ ] **Step 4: El provider se muda y se renombra**

`StratixProvider` ya no describe lo que hace: compone los hooks de **tareas** y lo usan los dos módulos. Se muda a `src/features/tasks/components/TasksContext/` y pasa a llamarse `TasksProvider` / `useTasks`, con la misma firma parametrizada de la tarea 7:

```bash
git mv src/features/stratix-mkt/components/StratixContext src/features/tasks/components/TasksContext
```

Dentro del archivo: `StratixProvider` → `TasksProvider`, `useStratix` → `useTasks`, `StratixData` → `TasksData`, y el mensaje del error a `'useTasks debe usarse dentro de <TasksProvider>'`. Los defaults de las props pasan a ser los de `/tasks` (`TASKS_TAB_PREF`, `TASKS_TABS`, `TASKS_TAB.KANBAN`) — Stratix ya no lo va a usar después de la tarea 9.

Los dos campos de la pestaña también se renombran: `mktTab` → `tabActiva`, `setMktTab` → `setTabActiva`. «mkt» dejó de ser cierto en el momento en que este provider pasó a servir a los dos módulos, y un nombre que miente en un contexto compartido es el que hace que alguien monte la cosa equivocada.

Actualizar con **Edit** todos los consumidores:

```bash
grep -rln "useStratix\|StratixProvider\|mktTab\|setMktTab" src
```

- [ ] **Step 5: `TasksModule` y `TasksContent` apuntan a lo propio**

En los dos archivos de la tarea 7, cambiar los imports de `@/features/stratix-mkt/components/…` por `@/features/tasks/components/…`, `useStratix` por `useTasks` y `{ mktTab, setMktTab }` por `{ tabActiva, setTabActiva }`. `TasksModule` deja de pasar props: los defaults del provider ya son los suyos.

```tsx
export default function TasksModule() {
  return (
    <TasksProvider>
      <TasksContent />
    </TasksProvider>
  )
}
```

- [ ] **Step 6: Verificar que compila y que la suite sigue verde**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: sin errores. En este punto `/stratix-mkt` todavía monta sus siete secciones desde `@/features/tasks/…` — se arregla en la tarea 10. Si `typecheck` se queja de `StratixContent`, es exactamente eso.

---

### Task 9: El gate — asignable y liquidable es quien tiene `tasks`

Una línea, y decide las dos listas más caras de la app: a quién se le puede asignar una tarea y a quién se le puede imprimir una hoja de pago. Hoy dice `MODULE.STRATIX_MKT`, que era cierto cuando las tareas eran de marketing y dejaría de serlo en el momento en que otro departamento entre a `/tasks`.

**Files:**
- Modify: `src/shared/context/team-derivations.ts:38`
- Test: `src/shared/context/team-derivations.test.ts`

**Interfaces:**
- Consumes: `getModulesForRole`, `normalizeRole`, `MODULE` de `@/shared/auth/permissions`; el `roleModuleMap` que `AppContext` carga de la DB.
- Produces: `miembrosAsignables` filtrado por `MODULE.TASKS`. Lo consumen los seis lugares de la tabla de abajo, todos ya en `src/features/tasks/` después de la tarea 8.

De `miembrosAsignables` cuelgan las dos listas, y por eso son la misma decisión:

| Quién lo lee | Para qué |
|---|---|
| `ActivityAsignacion` | el `<select>` de responsable en el alta |
| `useActividadForm` | resetea el responsable si la persona dejó de ser asignable |
| `SolicitudesAvailabilityView` | las tarjetas de disponibilidad |
| `useTablero` → `idsTeam` | quién entra en las gráficas por persona |
| `ReporteTab` | **el `<select>` de a quién se le hace el reporte de pago** |
| `useReporte` | el nombre que sale impreso en la hoja |

La sección Team de Stratix **no** está en esta lista: usa `equipoMarketing`, que filtra por el departamento `MKT`. Por eso este cambio no la toca.

- [ ] **Step 1: Escribir el test que falla**

En `src/shared/context/team-derivations.test.ts`, el mapa de roles del archivo (`const map = { disenador: [MODULE.STRATIX_MKT], medico: [MODULE.MEDICAL] }`) pasa a repartir el módulo nuevo, y se agrega una persona de otro departamento que sí lo tiene:

```ts
// Rol -> módulos, como lo carga AppContext desde la DB. `enfermera` es el caso nuevo: otro
// departamento, con el módulo de tareas — exactamente para lo que se creó /tasks.
const map = {
  disenador: [MODULE.TASKS, MODULE.STRATIX_MKT],
  medico: [MODULE.MEDICAL],
  enfermera: [MODULE.TASKS],
}
```

Y el bloque nuevo al final:

```ts
describe('el gate de asignables es el módulo de tareas', () => {
  const conEnfermera = [...usuarios, { id: 'u6', nombre: 'Rosa', apellido: 'Vera', activo: true, rol: 'enfermera', equipos: otro }]

  // Lo que la mudanza viene a habilitar: alguien de otro departamento entra al tablero.
  it('incluye a quien tiene tasks aunque no sea de marketing', () => {
    expect(deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)).toContain('u6')
  })

  // El gate NO es stratix-mkt: si lo fuera, /tasks no serviría para lo que se creó.
  it('excluye a quien no tiene tasks aunque esté activo', () => {
    expect(deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)).not.toContain('u4')
  })

  // La consecuencia que hay que poder señalar: esta misma lista alimenta el <select> del
  // reporte de pago (via useTablero.idsTeam → useReporte). Dar el módulo es volver liquidable.
  it('la lista de asignables ES la lista de liquidables', () => {
    const ids = deriveMiembrosAsignables(conEnfermera, map).map(m => m.id)
    expect(ids).toEqual(['u1', 'u2', 'u5', 'u6'])
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
pnpm test src/shared/context/team-derivations.test.ts
```

Esperado: FAIL — `u6` no está en la lista, porque el filtro todavía pide `stratix-mkt`.

- [ ] **Step 3: Cambiar el gate**

En `src/shared/context/team-derivations.ts`, el comentario de `deriveMiembrosAsignables` y su filtro:

```ts
// Asignables a una tarea: activos que tienen el módulo `tasks`. El permiso se pregunta, no se
// deduce del organigrama (ver codigo.md).
//
// ⚠️ Esta lista es TAMBIÉN la de quién puede aparecer en el reporte de pago: sale de acá,
// pasa por `useTablero.idsTeam` y llega al `<select>` de `useReporte`. O sea que **darle el
// módulo `tasks` a un rol lo vuelve asignable y liquidable a la vez**. Es deliberado: son la
// misma pregunta y tener dos gates distintos era la forma de que se desincronizaran. Quien no
// deba aparecer en una hoja de pago no lleva el módulo.
//
// Decía `MODULE.STRATIX_MKT` hasta la mudanza a `/tasks`, y eso era cierto sólo mientras las
// tareas fueran de marketing: con otro departamento cargando en el mismo tablero, el select de
// responsable no habría ofrecido a su propia gente.
//
// Antes de eso filtraba por `equipos.departamentos.codigo === 'MKT'`, y ese filtro dejaba el
// select vacío o incompleto para todo activo sin `equipo_id` — que es el estado por defecto de
// cualquier alta del panel admin — o cuyo equipo cuelga de otro departamento. No fallaba:
// simplemente no ofrecía a la persona.
export function deriveMiembrosAsignables(
  usuarios: U[],
  roleModuleMap: RoleModuleMap,
): { id: string; nombre: string }[] {
  return usuarios
    .filter((u) => u.activo && u.id)
    .filter((u) => getModulesForRole(roleModuleMap, normalizeRole(u.rol)).includes(MODULE.TASKS))
    .map((u) => ({ id: u.id as string, nombre: nombreCompleto(u) }))
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm test src/shared/context/team-derivations.test.ts
```

Esperado: PASS, los tres nuevos y los que ya estaban. Los viejos siguen verdes porque `disenador` conserva los dos módulos en el mapa de prueba.

- [ ] **Step 5: Verificar que nadie perdió el select en la práctica**

La migración de la tarea 5 copió a `tasks` todos los roles que tenían `stratix-mkt`, así que en local y en prod el conjunto de gente es **el mismo antes y después**. Confirmarlo:

```bash
pnpm supabase db psql -c "
  select r.key as rol,
         bool_or(rm.module_slug = 'tasks')       as tiene_tasks,
         bool_or(rm.module_slug = 'stratix-mkt') as tiene_stratix
    from roles r left join role_modules rm on rm.role_key = r.key
   group by r.key order by r.key;"
```

Esperado: ningún rol con `tiene_stratix = true` y `tiene_tasks = false`. Si aparece uno, esa gente desaparece del select de responsable y del reporte — se le agrega la fila antes de seguir.

- [ ] **Step 6: Verificar en el navegador**

1. `/tasks` → Production → «Nueva tarea»: el `<select>` de responsable lista a la misma gente que antes.
2. `/tasks` → Report: el `<select>` de a quién reportar lista a la misma gente.
3. `/stratix-mkt` → Team: sigue mostrando el equipo de marketing, sin cambios (usa `equipoMarketing`, no esto).

---

### Task 10: Stratix se queda con tres secciones

**Files:**
- Modify: `src/features/stratix-mkt/constants/tabs.ts`
- Modify: `src/features/stratix-mkt/components/StratixContent/index.tsx`
- Modify: `src/features/stratix-mkt/components/StratixModule/index.tsx`
- Modify: `src/shared/components/shell/appShellConfig/subvistas.ts`
- Test: `src/features/stratix-mkt/constants/tabs.test.ts` (crear)

**Interfaces:**
- Consumes: `TasksProvider` de la tarea 8, `Stratix360Roster`, `SocialTab`, `CompetenciaTab` (siguen en stratix-mkt).
- Produces: `STRATIX_TAB` con tres entradas y `STRATIX_TAB.SOCIAL` como pestaña inicial.

- [ ] **Step 1: Escribir el test que falla — la preferencia guardada**

`src/features/stratix-mkt/constants/tabs.test.ts`:

Los tests corren en entorno node, sin DOM: acá no se toca `localStorage` (`readPref` ya tiene los suyos en `usePersistedState.test.ts`). Lo que se prueba es el validador que el provider le pasa, que es donde vive la degradación.

```ts
import { describe, it, expect } from 'vitest'
import { oneOf } from '@/shared/hooks'
import { STRATIX_TAB, STRATIX_TABS } from './tabs'

describe('catálogo de tabs de Stratix después de la mudanza', () => {
  it('quedan las tres que no son de tareas', () => {
    expect([...STRATIX_TABS]).toEqual(['social', 'competencia', 'equipo'])
  })

  // El riesgo real del deploy: mucha gente tiene 'kanban' guardado en `tab-stratix`. El
  // `oneOf(...STRATIX_TABS)` del provider lo rechaza y gana el default; sin eso, la primera
  // pantalla después del deploy es blanca.
  it('rechaza las cuatro secciones que se fueron a /tasks', () => {
    const valida = oneOf(...STRATIX_TABS)
    for (const ida of ['overview', 'kanban', 'solicitudes', 'reporte']) {
      expect(valida(ida), `${ida} ya no existe acá`).toBe(false)
    }
  })

  it('acepta las que quedaron', () => {
    const valida = oneOf(...STRATIX_TABS)
    expect(valida('equipo')).toBe(true)
    expect(valida('social')).toBe(true)
  })

  // El default es a lo que cae una preferencia rechazada: si siguiera siendo 'kanban', la
  // degradación llevaría a una sección que tampoco existe.
  it('la pestaña inicial sigue existiendo', () => {
    expect(oneOf(...STRATIX_TABS)(STRATIX_TAB.SOCIAL)).toBe(true)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
pnpm test src/features/stratix-mkt/constants/tabs.test.ts
```

Esperado: FAIL — el catálogo todavía tiene siete tabs.

- [ ] **Step 3: Recortar el catálogo**

`src/features/stratix-mkt/constants/tabs.ts`:

```ts
// Las vistas que le quedan al módulo después de que las tareas se fueron a `/tasks`.
//
// ⚠️ El valor es el DATO —lo que se guarda en la preferencia `tab-stratix`—, no la etiqueta.
// Cuatro valores dejaron de existir ('overview', 'kanban', 'solicitudes', 'reporte') y mucha
// gente los tiene guardados: el `oneOf(...STRATIX_TABS)` del provider los rechaza y gana el
// default. Por eso el default es SOCIAL y no puede seguir siendo KANBAN, que ya no existe.
export const STRATIX_TAB = {
  SOCIAL: 'social',
  COMPETENCIA: 'competencia',
  EQUIPO: 'equipo',
} as const
```

`StratixTab`, `STRATIX_TABS` y `STRATIX_TAB_PREF` quedan como están.

Las cuatro que se van —`overview`, `kanban`, `solicitudes` y `reporte`— se van todas: el Report también, porque su alcance lo fija el gate de la tarea 9 y no la carpeta donde vive.

- [ ] **Step 4: `StratixContent` monta tres vistas**

```tsx
'use client'
import ModuloTabs from '@/shared/components/shell/ModuloTabs'
import { useTasks } from '@/features/tasks/components/TasksContext'
import Stratix360Roster from '../roster/Stratix360Roster'
import SocialTab from '../social/SocialTab'
import CompetenciaTab from '../competencia/CompetenciaTab'
import { STRATIX_TABS } from '@/features/stratix-mkt/constants/tabs'

// Sin modales: los dos que había (ficha y alta de tarea) se fueron con las tareas. La sección
// Team ES el roster: no hay envoltorio en el medio.
const tabViews: Record<string, JSX.Element> = {
  social: <SocialTab />,
  competencia: <CompetenciaTab />,
  equipo: <Stratix360Roster />,
}

export default function StratixContent() {
  const { tabActiva, setTabActiva } = useTasks()

  return (
    <ModuloTabs panel="mkt" titulo="Stratix 360" tabs={STRATIX_TABS} activa={tabActiva}
      onTab={setTabActiva} vistas={tabViews} />
  )
}
```

`Stratix360Roster` sigue leyendo `actividades` del contexto de la app (cuenta las tareas en proceso por persona) — por eso Stratix necesita el provider igual, y por eso la policy de la tarea 11 lleva las dos condiciones.

- [ ] **Step 5: `StratixModule` monta el provider con SU catálogo**

```tsx
'use client'
import { TasksProvider } from '@/features/tasks/components/TasksContext'
import { STRATIX_TAB, STRATIX_TABS, STRATIX_TAB_PREF } from '@/features/stratix-mkt/constants/tabs'
import StratixContent from '../StratixContent'

export default function StratixModule() {
  return (
    <TasksProvider prefKey={STRATIX_TAB_PREF} tabs={STRATIX_TABS} tabInicial={STRATIX_TAB.SOCIAL}>
      <StratixContent />
    </TasksProvider>
  )
}
```

- [ ] **Step 6: Recortar las sub-vistas del shell**

En `src/shared/components/shell/appShellConfig/subvistas.ts`, `SUB_ITEMS.mkt` queda con tres entradas:

```ts
  mkt: [
    { id: 'sub-social', icon: '📱', label: 'Social Media', tab: 'social' },
    { id: 'sub-competencia', icon: '🎯', label: 'Competitors', tab: 'competencia' },
    { id: 'sub-equipo', icon: '👥', label: 'Team', tab: 'equipo' },
  ],
```

Y en `nav.ts`, `AUTO_TITLE[MODULE.STRATIX_MKT]` deja de decir «Producción», que ya no vive ahí:

```ts
  [MODULE.STRATIX_MKT]: 'Stratix 360 — Marketing',
```

- [ ] **Step 7: Correr los tests y verificar que pasan**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Esperado: PASS, incluidos los tres del paso 1.

- [ ] **Step 8: Verificar en el navegador la degradación**

1. Poner a mano `localStorage.setItem('eminat:<tu-uuid>:tab-stratix', '"kanban"')` en la consola del navegador.
2. Recargar `/stratix-mkt`.
3. Esperado: abre en **Social Media**, no en una pantalla en blanco.
4. `/tasks` sigue mostrando las tres secciones de tareas y los modales.
5. `/stratix-mkt` → Team sigue contando bien las tareas en proceso de cada persona.

---

### Task 11: La policy de `actividades` con las dos condiciones

Stratix no queda sin dependencia de la tabla: `RosterCard` cuenta tareas por persona. Abrir la lectura a los dos módulos es la opción honesta y la más barata; mover el contador o exponer un agregado resuelven menos y cuestan más, y se pueden tomar después sin rehacer nada.

**Files:**
- Create: `supabase/migrations/<timestamp>_actividades_policy_tasks.sql`

**Interfaces:**
- Consumes: la fila `role_modules` con `module_slug = 'tasks'` (tarea 5).
- Produces: las cuatro policies de `actividades` gateadas por `has_module('tasks') OR has_module('stratix-mkt')`.

- [ ] **Step 1: Crear la migración**

```bash
pnpm supabase migration new actividades_policy_tasks
```

- [ ] **Step 2: Escribirla**

```sql
-- Las tareas se leen desde los dos módulos.
--
-- La extracción NO deja a Stratix sin dependencia de esta tabla: la sección Team se queda ahí
-- y `RosterCard` cuenta las tareas en proceso de cada persona. Con la policy gateada sólo por
-- `stratix-mkt`, quien tenga `tasks` y no Stratix vería el tablero vacío sin ningún error; con
-- ella gateada sólo por `tasks`, el contador de Team quedaría en cero para quien tenga Stratix
-- y no `tasks`. Las dos condiciones en OR es lo único que sirve a los dos módulos.
--
-- Si algún día Stratix se disuelve y Team se va al Directorio, esta policy vuelve a una sola
-- condición. Es la única decisión que queda abierta y no bloquea nada.
DO $$
DECLARE
  slug_tasks   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  -- Los dos slugs verificados: `role_modules.module_slug` es text sin FK, y `has_module()` abre
  -- con `is_admin() OR …`, así que uno mal escrito da true para el admin —que es quien prueba
  -- la migración— y false en silencio para todo el resto.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_tasks) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_tasks, slug_stratix);

  -- La de lectura sigue llamándose `colaborador_read` (viene de la migración de roles dinámicos
  -- y renombrarla no compra nada): se reemplaza en su lugar.
  EXECUTE 'DROP POLICY IF EXISTS "colaborador_read" ON public.actividades';
  EXECUTE format('CREATE POLICY "colaborador_read" ON public.actividades FOR SELECT USING %s', cond);

  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_insert_modulo" ON public.actividades
                    FOR INSERT WITH CHECK %s', cond);

  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_update_modulo" ON public.actividades
                    FOR UPDATE USING %s WITH CHECK %s', cond, cond);

  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_delete_modulo" ON public.actividades
                    FOR DELETE USING %s', cond);
END $$;
```

- [ ] **Step 3: Aplicar en local**

```bash
pnpm supabase migration up
```

- [ ] **Step 4: Verificar que las cuatro quedaron con las dos condiciones**

```bash
pnpm supabase db psql -c "
  select policyname, cmd, coalesce(qual, with_check) as condicion
    from pg_policies where tablename = 'actividades' order by policyname;"
```

Esperado: las cuatro nombran `'tasks'` **y** `'stratix-mkt'`. Ver una policy no es ver control de acceso — el paso 5 es el que prueba.

- [ ] **Step 5: Probar consultando, no leyendo el esquema**

```bash
pnpm db:rls
```

Y la prueba que importa, **con un rol que no sea admin** (`is_admin()` corta antes de evaluar nada y con un admin esto siempre da verde):

1. Un rol con `tasks` y sin `stratix-mkt`: `/tasks` muestra el tablero con filas.
2. Un rol con `stratix-mkt` y sin `tasks`: `/stratix-mkt` → Team cuenta bien las tareas en proceso.
3. Un rol sin ninguno de los dos: `/tasks` da `AccessDenied` y `/stratix-mkt` también.

Se crean los roles de prueba en `/admin` → Roles, no por SQL.

- [ ] **Step 6: Correr el e2e**

```bash
pnpm e2e
```

Esperado: verde. Si `roles.spec.ts` enumeraba los módulos esperados por rol, actualizarlo — `tasks` es uno más.

- [ ] **Step 7: Gate completo y commit de la fase**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add -A
git commit -m "feat(tasks): la mudanza — las tareas viven en /tasks y Stratix queda con tres

Los componentes se mueven con git mv (la historia se conserva) y el provider pasa
a llamarse TasksProvider. El Report se muda con el resto: lo que fija su alcance
es el gate de asignables, no la carpeta donde vive.

Ese gate pasa a MODULE.TASKS, y con eso una sola línea decide las dos listas —a
quién se le asigna una tarea y a quién se le puede liquidar—. Dar el módulo tasks
vuelve a alguien asignable y liquidable a la vez, y eso es la política.

La policy de actividades queda con las dos condiciones: Team sigue en Stratix y
sigue contando tareas. La preferencia tab-stratix guardada en una sección que ya
no existe degrada al primer tab en vez de abrir en blanco.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

# Fase 4 — el filtro

No es escribir un motor de filtros: es terminar el que ya existe. `FilterDef` ya soporta un `match` que navega dependencias por parámetro, y `useTablero` ya persiste los valores con `useUserPreference('stratix-act-filters', {})`. Lo que falta son los defaults y que el clear vuelva a ellos.

### Task 12: Valores por defecto en el motor

**Files:**
- Modify: `src/shared/utils/filters.ts`
- Modify: `src/shared/utils/index.ts`
- Test: `src/shared/utils/filters.test.ts`

**Interfaces:**
- Consumes: `FilterDef<T>`, `FilterValues`, `applyFilters` (ya existen).
- Produces:

```ts
FilterDef<T> & { defaultValue?: string }
function defaultFilterValues<T>(defs: FilterDef<T>[]): FilterValues
function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues): FilterValues
```

Los consume la tarea 14.

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `src/shared/utils/filters.test.ts`:

```ts
import { applyFilters, defaultFilterValues, resolveFilterValues, distinctValues, distinctTokens, type FilterDef } from './filters'
```

```ts
const CON_DEFAULT: FilterDef<Row>[] = [
  { key: 'phase', labelKey: 'x', defaultValue: 'Phase 2', match: (x, v) => x.phase.includes(v) },
  { key: 'country', labelKey: 'x', match: (x, v) => x.country.includes(v) },
]

describe('valores por defecto', () => {
  it('defaultFilterValues sólo trae los defs que declaran uno', () => {
    expect(defaultFilterValues(CON_DEFAULT)).toEqual({ phase: 'Phase 2' })
    expect(defaultFilterValues(DEFS)).toEqual({})
  })

  // Lo que hace usable un tablero con cinco áreas juntas: se abre con el área propia puesta.
  it('filtrar con los defaults da lo mismo que ponerlos a mano', () => {
    const conDefault = applyFilters(rows, CON_DEFAULT, defaultFilterValues(CON_DEFAULT))
    const aMano = applyFilters(rows, CON_DEFAULT, { phase: 'Phase 2' })
    expect(conDefault).toEqual(aMano)
  })

  // La distinción que hace que quitar un filtro y recargar den lo mismo: «sin tocar» (la clave
  // no está) toma el default; «vacío» (la clave está en '') es una elección y se respeta.
  it('«sin tocar» toma el default y «vacío» se respeta', () => {
    expect(resolveFilterValues(CON_DEFAULT, {})).toEqual({ phase: 'Phase 2' })
    expect(resolveFilterValues(CON_DEFAULT, { phase: '' })).toEqual({ phase: '' })
    expect(resolveFilterValues(CON_DEFAULT, { phase: 'Phase 3' })).toEqual({ phase: 'Phase 3' })
  })

  it('un valor guardado de un def sin default sobrevive', () => {
    expect(resolveFilterValues(CON_DEFAULT, { country: 'France' }))
      .toEqual({ phase: 'Phase 2', country: 'France' })
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
pnpm test src/shared/utils/filters.test.ts
```

Esperado: FAIL — `defaultFilterValues is not a function`.

- [ ] **Step 3: Implementar**

En `src/shared/utils/filters.ts`, agregar el campo a la interfaz, justo después de `optionLabel`:

```ts
  // Con qué valor arranca el filtro cuando el usuario todavía no lo tocó. Es lo que hace usable
  // un tablero donde conviven cinco áreas: se abre en la propia y desde ahí se abre a las demás.
  // NO es control de acceso — quitarlo muestra todo, y eso es a propósito.
  defaultValue?: string
```

Y al final del archivo:

```ts
// Los defaults declarados, como un FilterValues. Es el estado inicial y también a lo que
// vuelve el clear.
export function defaultFilterValues<T>(defs: FilterDef<T>[]): FilterValues {
  const out: FilterValues = {}
  for (const d of defs) if (d.defaultValue) out[d.key] = d.defaultValue
  return out
}

// Los valores efectivos: lo guardado gana, y lo que nunca se tocó toma su default.
//
// La distinción entre «vacío» y «sin tocar» es todo el punto. Un filtro puesto en «Todos»
// guarda la cadena vacía, que NO es lo mismo que la clave ausente: sin esta diferencia, quitar
// un filtro y recargar la página darían resultados distintos —el default volvería solo— y no
// habría forma de ver el tablero completo.
export function resolveFilterValues<T>(defs: FilterDef<T>[], guardados: FilterValues): FilterValues {
  const out: FilterValues = { ...defaultFilterValues(defs), ...guardados }
  return out
}
```

- [ ] **Step 4: Exportarlas por el barrel**

En `src/shared/utils/index.ts`, línea 15:

```ts
export { applyFilters, distinctValues, distinctTokens, defaultFilterValues, resolveFilterValues } from './filters'
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

```bash
pnpm test src/shared/utils/filters.test.ts
```

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/utils/
git commit -m "feat(filtros): el motor acepta valores por defecto

Con defaults, quitar un filtro y recargar tienen que dar lo mismo: por eso
«vacío» (la clave en '') y «sin tocar» (la clave ausente) son estados distintos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 13: La derivación responsable → equipo → departamento

No hay columna de departamento en `actividades` y no la va a haber: «el departamento de la tarea» es «el departamento del responsable», y `responsable_id` es obligatorio. Esto es esa derivación, pura y testeable.

**Files:**
- Create: `src/features/tasks/utils/departamento/index.ts`
- Test: `src/features/tasks/utils/departamento/index.test.ts`

**Interfaces:**
- Consumes: `Usuario` (con `id: string` y `equipo_id?: string | null`) y `OrgRow` (con `id: string` y `departamento_id?: string | null`) de `@/shared/context/loadAppData`.
- Produces: `departamentoPorUsuario(usuarios: Usuario[], equipos: OrgRow[]): Record<string, string>`. La consume la tarea 14.

- [ ] **Step 1: Escribir el test que falla**

`src/features/tasks/utils/departamento/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { departamentoPorUsuario } from './index'
import type { Usuario, OrgRow } from '@/shared/context/loadAppData'

const equipos = [
  { id: 'e1', codigo: 'DIS', nombre: 'Diseño', departamento_id: 'd-mkt' },
  { id: 'e2', codigo: 'ENF', nombre: 'Enfermería', departamento_id: 'd-med' },
  { id: 'e3', codigo: 'HUE', nombre: 'Huérfano', departamento_id: null },
] as OrgRow[]

const usuarios = [
  { id: 'u1', equipo_id: 'e1' },
  { id: 'u2', equipo_id: 'e2' },
  { id: 'u3', equipo_id: null },     // sin equipo: la fase 0 los deja en cero, pero pasa
  { id: 'u4', equipo_id: 'e3' },     // equipo sin departamento
  { id: 'u5', equipo_id: 'e9' },     // equipo que ya no existe
] as Usuario[]

describe('departamentoPorUsuario', () => {
  it('navega equipo → departamento', () => {
    const m = departamentoPorUsuario(usuarios, equipos)
    expect(m.u1).toBe('d-mkt')
    expect(m.u2).toBe('d-med')
  })

  // El filtro de área se estrena con gente todavía sin equipo asignado: si esto reventara, el
  // tablero entero se caería por un dato de catálogo incompleto.
  it('omite a quien no tiene departamento derivable, sin reventar', () => {
    const m = departamentoPorUsuario(usuarios, equipos)
    expect(m.u3).toBeUndefined()
    expect(m.u4).toBeUndefined()
    expect(m.u5).toBeUndefined()
  })

  it('con catálogos vacíos devuelve un mapa vacío', () => {
    expect(departamentoPorUsuario([], [])).toEqual({})
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
pnpm test src/features/tasks/utils/departamento/
```

Esperado: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

`src/features/tasks/utils/departamento/index.ts`:

```ts
import type { Usuario, OrgRow } from '@/shared/context/loadAppData'

// De qué departamento es cada persona, navegando `usuarios.equipo_id → equipos.departamento_id`.
//
// Es LA razón por la que `actividades` no tiene una columna de departamento: «el departamento de
// la tarea» es «el departamento del responsable», `responsable_id` es obligatorio, y guardarlo
// aparte sería codificar un dato que ya existe por separado.
//
// Quien no tenga equipo, o cuyo equipo no tenga departamento, simplemente no está en el mapa: el
// filtro lo deja fuera y la ficha muestra «—». Reventar acá tiraría el tablero entero por un dato
// de catálogo incompleto, que es exactamente el estado en el que empieza esto (ver la fase 0).
export function departamentoPorUsuario(usuarios: Usuario[], equipos: OrgRow[]): Record<string, string> {
  const departamentoDelEquipo: Record<string, string> = {}
  for (const e of equipos) if (e.departamento_id) departamentoDelEquipo[e.id] = e.departamento_id

  const porUsuario: Record<string, string> = {}
  for (const u of usuarios) {
    const dep = u.equipo_id ? departamentoDelEquipo[u.equipo_id] : undefined
    if (dep) porUsuario[u.id] = dep
  }
  return porUsuario
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm test src/features/tasks/utils/departamento/
```

Esperado: PASS, los tres.

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/utils/departamento/
git commit -m "feat(tasks): derivar el departamento de una tarea desde su responsable

Es por qué actividades NO lleva una columna de departamento: el dato ya existe
por separado y guardarlo aparte sería codificarlo dos veces.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 14: El filtro de área, precargado en el área de quien mira

**Files:**
- Modify: `src/features/tasks/utils/act-filters/index.ts`
- Modify: `src/features/tasks/hooks/useTablero/index.ts`
- Test: `src/features/tasks/utils/act-filters/index.test.ts`

**Interfaces:**
- Consumes: `departamentoPorUsuario` (tarea 13), `defaultFilterValues` / `resolveFilterValues` (tarea 12), `useApp().{usuario, usuarios, equipos, departamentos}`, la clave `tasks.filter.allAreas` (tarea 5).
- Produces: un sexto `FilterDef<Actividad>` con `key: 'departamento'`, y `useTablero` resolviendo valores contra los defaults. Nadie más lo consume.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/features/tasks/utils/act-filters/index.test.ts`, agregar al final:

```ts
describe('filtro de área', () => {
  const deps = {
    t: ((k: string) => k) as never,
    nombrePorId: {},
    intlLocale: 'es-EC',
    departamentoPorResponsable: { u1: 'd-mkt', u2: 'd-med' },
    nombreDepartamento: { 'd-mkt': 'Marketing', 'd-med': 'Medical' },
    departamentoPropio: 'd-mkt',
  }
  const def = () => actividadFilters(deps).find(d => d.key === 'departamento')!

  it('arranca en el área de quien mira', () => {
    expect(def().defaultValue).toBe('d-mkt')
  })

  it('el match navega responsable → departamento', () => {
    expect(def().match({ responsable_id: 'u1' }, 'd-mkt')).toBe(true)
    expect(def().match({ responsable_id: 'u2' }, 'd-mkt')).toBe(false)
  })

  // Con la fase 0 a medias hay gente sin equipo. El filtro las deja fuera; lo que no puede
  // hacer es tirar una excepción y llevarse el tablero.
  it('un responsable sin departamento no matchea y no revienta', () => {
    expect(def().match({ responsable_id: 'u9' }, 'd-mkt')).toBe(false)
    expect(def().match({}, 'd-mkt')).toBe(false)
  })

  it('rotula con el nombre del departamento, no con su uuid', () => {
    expect(def().optionLabel?.('d-med')).toBe('Medical')
    expect(def().optionLabel?.('d-x')).toBe('—')
  })

  // Sin departamento propio (una persona sin equipo, o la fase 0 sin hacer) el filtro existe
  // igual pero abre en «Todas las áreas»: es mejor ver todo que ver nada.
  it('sin área propia no hay default', () => {
    const sinPropia = actividadFilters({ ...deps, departamentoPropio: undefined })
    expect(sinPropia.find(d => d.key === 'departamento')!.defaultValue).toBeUndefined()
  })
})
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
pnpm test src/features/tasks/utils/act-filters/
```

Esperado: FAIL — el def no existe y `Deps` no tiene esos tres campos.

- [ ] **Step 3: Agregar el filtro**

En `src/features/tasks/utils/act-filters/index.ts`, ampliar `Deps`:

```ts
type Deps = {
  t: (k: I18nKey) => string
  nombrePorId: Record<string, string> // uuid de responsable → nombre a mostrar
  intlLocale: string // BCP-47 de quien mira: el período se nombra en su idioma
  departamentoPorResponsable: Record<string, string> // uuid de usuario → uuid de departamento
  nombreDepartamento: Record<string, string> // uuid de departamento → nombre a mostrar
  departamentoPropio?: string // el de quien mira: con eso arranca el filtro
}
```

Y agregar el def al final del array que devuelve `actividadFilters`, desestructurando los tres campos nuevos en la firma:

```ts
    // El área NO sale de una columna: se DERIVA del responsable, que es obligatorio. Arranca en
    // la de quien mira y se puede quitar — es comodidad, no control de acceso: quien tiene el
    // módulo lee todas las tareas de la empresa y la RLS no corta por departamento.
    { key: 'departamento', labelKey: 'tasks.filter.allAreas',
      defaultValue: departamentoPropio,
      options: items => distinctValues(items, a => departamentoPorResponsable[a.responsable_id ?? '']),
      optionLabel: id => nombreDepartamento[id] ?? '—',
      match: (a, v) => departamentoPorResponsable[a.responsable_id ?? ''] === v },
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
pnpm test src/features/tasks/utils/act-filters/
```

Esperado: PASS.

- [ ] **Step 5: Cablear las dependencias y el clear en `useTablero`**

En `src/features/tasks/hooks/useTablero/index.ts`:

```ts
import { useMemo } from 'react'
import { applyFilters, resolveFilterValues, defaultFilterValues, type FilterValues } from '@/shared/utils'
import { departamentoPorUsuario } from '@/features/tasks/utils/departamento'
```

`OrgRow` trae `id`, `codigo` y `nombre`; `equipos` trae además `departamento_id`. Los tres catálogos y `usuarios` salen de `useApp()`, que ya los expone.

Sumar `usuarios`, `equipos` y `departamentos` a lo que se saca de `useApp()`, y reemplazar el bloque de filtros por:

```ts
  const [guardados, setFilterValues] = useUserPreference<FilterValues>('stratix-act-filters', {})

  const departamentoPorResponsable = useMemo(
    () => departamentoPorUsuario(usuarios, equipos), [usuarios, equipos])
  const nombreDepartamento = useMemo(
    () => Object.fromEntries(departamentos.map(d => [d.id, d.nombre])), [departamentos])
  const departamentoPropio = usuario?.id ? departamentoPorResponsable[usuario.id] : undefined

  // `actFilters` va memoizado y NO es opcional: sin esto se recrea en cada render, y como es la
  // entrada de `resolveFilterValues` y de los seis `applyFilters` de abajo, arrastra a todos.
  const actFilters = useMemo(() => actividadFilters({
    t, nombrePorId: miembrosPorId, intlLocale,
    departamentoPorResponsable, nombreDepartamento, departamentoPropio,
  }), [t, miembrosPorId, intlLocale, departamentoPorResponsable, nombreDepartamento, departamentoPropio])

  // Lo guardado gana; lo que nunca se tocó toma su default. Un filtro puesto en «Todas» guarda
  // la cadena vacía y ESO se respeta: si no, quitar el área y recargar la volvería a poner.
  const filterValues = useMemo(() => resolveFilterValues(actFilters, guardados), [actFilters, guardados])
  const setFilterValue = (key: string, value: string) => setFilterValues(p => ({ ...p, [key]: value }))
  // El clear vuelve a los DEFAULTS, no a vacío: si volviera a `{}`, "limpiar" y "recargar"
  // dejarían el tablero en dos estados distintos.
  const clearFilters = () => setFilterValues(defaultFilterValues(actFilters))
  const filtrosActivos = actFilters.filter(d => filterValues[d.key]).length
  const actsFiltradas = useMemo(
    () => applyFilters(actividades, actFilters, filterValues), [actividades, actFilters, filterValues])
```

**Por qué la memoización entra acá y no en su propio PR.** `useTablero` no tiene hoy un solo `useMemo`, y esta tarea le **agrega** tres derivaciones (`departamentoPorResponsable`, `nombreDepartamento`, un filtro más que atraviesa las ~370 actividades). Sin memo, cada una se recalcula en cada render junto con las 26 barridas que el hook ya hace — o sea que esta tarea empeoraría un problema medido el 03/09 (ver el `.todo`, «Cambiar de módulo y elegir una pestaña tarda en reaccionar»). Memoizar lo que se toca no es scope creep: es no dejar el archivo peor de como se encontró. Lo que **no** entra acá es memoizar los otros tres hooks del provider ni el `value` del contexto — eso es su propio trabajo y está anotado en el `.todo`.

Si el archivo pasa el techo de 150 líneas con esto, la derivación de los tres mapas sale a `src/features/tasks/hooks/useTablero/filtros.ts` — no se agrega una marca de exención sin aprobación de Wagner.

- [ ] **Step 6: Verificar tipos y suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

- [ ] **Step 7: Verificar en el navegador**

Con la fase 0 hecha y `pnpm dev`:

1. Entrar a `/tasks` con un usuario de Marketing: el filtro de área dice **Marketing** y el tablero muestra sólo sus tareas. El contador de filtros activos lo cuenta.
2. Ponerlo en «Todas las áreas»: aparecen las tareas de todos los departamentos.
3. **Recargar la página:** sigue en «Todas las áreas». Si volvió a Marketing, la distinción vacío/sin-tocar está rota.
4. Tocar «✕ Limpiar»: vuelve a **Marketing**, no a «Todas».
5. Entrar con un usuario de otro departamento: arranca en el suyo.
6. Un responsable sin equipo: su tarea no aparece con ningún área elegida, y aparece con el filtro en «Todas». Nada revienta.

- [ ] **Step 8: Gate completo y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add src/features/tasks/
git commit -m "feat(tasks): filtro de área precargado en el departamento de quien mira

Deriva del responsable, no de una columna. Es comodidad, no control de acceso:
se puede quitar y quien tiene el módulo lee todas las tareas de la empresa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

# Fase 5 — el peso

Sale del diagnóstico del 03/09/2026 (`.todo` → «Cambiar de módulo y elegir una pestaña tarda en reaccionar»), no del spec de `/tasks`. Entra en este plan porque `/tasks` hereda las cuatro secciones más pesadas de la app y sería la ruta que peor abre; pero **ninguna de las dos tareas depende de las fases anteriores.**

La tarea 15 no depende de nada de este plan: es un archivo, arregla las 12 rutas de hoy y se puede adelantar y desplegar sola en cualquier momento. Si la sensación de trabado molesta ahora, esa es la que se hace primero y no hay razón para esperar a la fase 0.

### Task 15: `loading.tsx` — que la navegación deje de parecer un cuelgue

> **HECHA el 03/09/2026, adelantada.** Se ejecutó fuera de orden porque la regla del centinela
> («Un grupo de rutas lleva su `loading.tsx`») bloquea editar los dos layouts hasta que existan.
> Salieron **dos** archivos y no uno: `src/app/loading.tsx` (cubre `/login` y `/reset-password`)
> y `src/app/(app)/loading.tsx` (las 12 rutas protegidas).
>
> **Los dos usan `LoadingScreen`, de viewport completo, y no el `LoadingView` que este plan
> proponía.** El motivo se descubrió al implementarlo: `AppShell` lo monta **cada página**, no
> `(app)/layout.tsx` —que sólo pone `AppProvider` y `ModuleGate`—, así que durante el fallback el
> sidebar y el topbar no están. Un spinner del tamaño del área de contenido quedaría flotando en
> una página vacía y se leería como una pantalla rota.
>
> Eso deja al descubierto que **subir `AppShell` al layout** es lo que haría del fallback un
> spinner discreto en el área de contenido — es la hipótesis original de Wagner y está anotada en
> el `.todo` junto con las subrutas: son la misma idea. `LoadingView` sigue en uso, como fallback
> de las sub-vistas `dynamic`, donde sí está dentro del shell.

Hoy no hay **ni un** `loading.tsx`, `error.tsx` ni `<Suspense>` en toda la app. Sin un boundary, el App Router deja pintada la pantalla anterior mientras baja y evalúa el chunk de la ruta nueva: no aparece un spinner, no aparece un skeleton, no aparece nada. Lo que se ve es el módulo viejo, quieto — y eso no se lee como «está cargando», se lee como «se colgó».

**Files:**
- Create: `src/app/(app)/loading.tsx`
- Modify: `src/shared/i18n/locales/{es,en}.json`

**Interfaces:**
- Consumes: nada del repo — es un componente de servidor sin estado ni props.
- Produces: el Suspense boundary del grupo `(app)`. No lo consume ningún módulo: lo usa el router.

- [ ] **Step 1: Medir el antes, para poder decir que mejoró**

Con `pnpm dev`, DevTools → Network → throttling **Slow 4G**. Navegar desde `/directorio` a `/stratix-mkt` y cronometrar cuánto tiempo pasa entre el click y el primer píxel nuevo. Anotar el número: sin esto, «se siente mejor» no es un resultado.

- [ ] **Step 2: Las claves de i18n**

En `src/shared/i18n/locales/es.json`:

```json
  "common.loading": "Cargando…",
```

En `en.json`:

```json
  "common.loading": "Loading…",
```

Si `common.loading` ya existe, se reusa y este paso no toca nada.

- [ ] **Step 3: El archivo**

`src/app/(app)/loading.tsx`:

```tsx
import Spinner from '@/shared/components/ui/Spinner'

// El boundary de Suspense del grupo `(app)`, y por lo tanto de las 12 rutas protegidas.
//
// Sin este archivo el App Router no tiene qué mostrar mientras baja el chunk de la ruta nueva,
// así que deja pintada la pantalla ANTERIOR. Medido el 03/09/2026: entrar a `/stratix-mkt` baja
// ~135 kB de JavaScript nuevo y a `/research` ~145 kB, todo eso con el módulo viejo en pantalla
// y sin una sola señal de que algo está pasando. No es lentitud percibida — es ausencia de
// feedback, y se lee como que la app se colgó.
//
// Va en el grupo y no por módulo a propósito: uno solo cubre las 12 rutas. Un `loading.tsx` por
// módulo tiene sentido recién cuando alguno quiera un skeleton con la forma de SU contenido.
export default function AppLoading() {
  return <Spinner />
}
```

Antes de escribirlo, buscar el componente que ya existe en vez de improvisar uno:

```bash
ls src/shared/components/ui/ | grep -i "spinner\|loader\|skeleton"
grep -rn "Cargando\|common.loading" src/shared/components src/shared/i18n/locales/es.json | head
```

Si no hay ninguno, el componente nuevo nace en `src/shared/components/ui/Spinner/` —es transversal por definición— con su texto por `t('common.loading')`, sin `style` inline y con las medidas en `rem`.

- [ ] **Step 4: Verificar que aparece**

```bash
pnpm dev
```

Con el mismo throttling del paso 1, repetir la navegación `/directorio` → `/stratix-mkt`. Ahora el spinner tiene que aparecer **inmediatamente** al click, y la pantalla vieja desaparecer. Comparar contra el número anotado: el tiempo total puede no bajar —el chunk pesa lo mismo—, pero la espera pasa a ser visible, que es todo el punto.

- [ ] **Step 5: Verificar que no se rompió el shell**

Recorrer las 12 rutas del rail. El spinner aparece y se va; ninguna queda trabada en él. Ojo con `/` (el Launchpad) y con una ruta sin permiso: `AccessDenied` tiene que seguir apareciendo, no un spinner infinito.

- [ ] **Step 6: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido
```

```bash
git add "src/app/(app)/loading.tsx" src/shared/components/ui/ src/shared/i18n/locales/
git commit -m "fix(shell): un loading.tsx para el grupo (app)

No había ninguno en toda la app, así que el router dejaba pintada la pantalla
anterior mientras bajaba el chunk de la ruta nueva — ~135 kB al entrar a Stratix,
sin una sola señal. Eso no se lee como 'cargando', se lee como 'se colgó'.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

### Task 16: Las sub-vistas pesadas entran por `next/dynamic`

`TasksContent` importa sus cuatro sub-vistas de forma estática, así que abrir Requests baja también recharts, el Gantt y el reporte imprimible. Medido el 03/09: `/stratix-mkt` son 385 kB de First Load JS y `/research` 395, contra 251 de `/directorio`.

**Files:**
- Modify: `src/features/tasks/components/TasksContent/index.tsx`
- Modify: `src/features/stratix-mkt/components/StratixContent/index.tsx`

**Interfaces:**
- Consumes: `OverviewTab`, `KanbanTab`, `SolicitudesTab`, `ReporteTab` de `@/features/tasks/components/…` (tarea 8); `next/dynamic`.
- Produces: las mismas vistas, en chunks aparte. Nadie las consume distinto — el cambio es invisible salvo en el build.

- [ ] **Step 1: Medir cuál pesa, antes de tocar**

```bash
pnpm build:check 2>&1 | grep -A 20 "Route (app)"
```

Anotar el First Load JS de `/tasks` y `/stratix-mkt`. Y ver quién arrastra recharts:

```bash
grep -rln "recharts" src/features/tasks src/shared/components/dashboard
```

Sólo se convierten las vistas que **realmente** arrastran algo pesado. Envolver en `dynamic` una vista liviana agrega un chunk y un round-trip a cambio de nada.

- [ ] **Step 2: Convertir el mapa de vistas**

En `src/features/tasks/components/TasksContent/index.tsx`, las pesadas pasan a `dynamic` y las livianas se quedan como están:

```tsx
import dynamic from 'next/dynamic'
import Spinner from '@/shared/components/ui/Spinner'

// Las vistas pesadas se bajan cuando se abren, no cuando se entra al módulo. Medido el
// 03/09/2026: con las cuatro estáticas, entrar a Requests bajaba también recharts (Dashboard),
// el Gantt (Production) y la hoja imprimible (Report) — ~135 kB de los que se usaba una parte.
//
// `ssr: false` porque las tres leen del contexto del cliente y no hay nada que prerenderizar;
// el `loading` es el mismo spinner del boundary del grupo, para que la espera se vea igual
// venga de una navegación o de un cambio de pestaña.
const OverviewTab = dynamic(() => import('@/features/tasks/components/overview/OverviewTab'), {
  ssr: false, loading: () => <Spinner />,
})
const KanbanTab = dynamic(() => import('@/features/tasks/components/kanban/KanbanTab'), {
  ssr: false, loading: () => <Spinner />,
})
const ReporteTab = dynamic(() => import('@/features/tasks/components/reporte/ReporteTab'), {
  ssr: false, loading: () => <Spinner />,
})
```

`SolicitudesTab` y los dos modales se dejan estáticos salvo que el paso 1 diga otra cosa: la tabla es la vista más liviana y los modales tienen que poder abrirse sin esperar un chunk.

- [ ] **Step 3: Lo mismo en Stratix, si el paso 1 lo justifica**

`CompetenciaTab` y `SocialTab` leen de `data.ts` (datos estáticos) y el roster es una grilla de tarjetas. Si el build dice que ninguna arrastra nada pesado, **este paso no se hace** — y decirlo es el resultado, no una omisión.

- [ ] **Step 4: Medir el después**

```bash
pnpm build:check 2>&1 | grep -A 20 "Route (app)"
```

Esperado: el First Load JS de `/tasks` baja, y aparecen chunks nuevos que se piden al abrir cada pestaña. Comparar contra los números del paso 1 y anotarlos en el commit: sin el antes y el después, «lo hicimos más liviano» no se puede verificar.

- [ ] **Step 5: Verificar en el navegador que no se rompió nada**

Con throttling Slow 4G, recorrer las cuatro secciones de `/tasks`. Cada una muestra su spinner un instante la primera vez y abre instantáneo la segunda (el chunk queda cacheado). Los dos modales abren sin demora desde cualquier sección.

- [ ] **Step 6: Gate y commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm rules:barrido && pnpm build:check
```

```bash
git add src/features/tasks/components/TasksContent/ src/features/stratix-mkt/components/StratixContent/
git commit -m "perf(tasks): las sub-vistas pesadas se bajan al abrirlas

Abrir Requests bajaba también recharts, el Gantt y la hoja imprimible. First Load
JS de /tasks: <antes> kB → <después> kB.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AGp5V5GJcRch44NzwN211G"
```

---

## Despliegue a producción

Las tres migraciones (`created_by_id`, `role_modules`, la policy) van a prod con el procedimiento que exige el centinela, en este orden y sin saltear ninguno:

- [ ] **Backup primero.** El dump de prod antes de tocar nada.
- [ ] **Precheck.** El ensayo de la migración contra los datos de producción cargados en el Postgres local — el escalón que pide la regla de ensayo. Las tres son aditivas (una columna nullable, filas en un catálogo, policies que sólo agregan un OR), así que el riesgo es bajo; se ensaya igual porque no hay proyecto dev y una migración va de local directo a prod.
- [ ] **`pnpm supabase link --project-ref ruedelunbtaomhrzgelc && pnpm supabase db push`.**
- [ ] **Verificación con `SELECT`**, que Wagner corre con `!`:

```sql
select count(*) filter (where created_by_id is not null) as con_creador,
       count(*) as total
  from actividades;

select module_slug, count(*) as roles
  from role_modules where module_slug in ('tasks','stratix-mkt')
 group by module_slug;

select policyname, cmd from pg_policies where tablename = 'actividades';
```

- [ ] **La fase 0 en producción** (tarea 1, paso 6) tiene que estar hecha antes de que la fase 4 llegue a prod, o el filtro de área se ve roto con el código correcto.
- [ ] **Avisar del cambio.** Stratix 360 pasa de siete secciones a tres, el reporte de pago se abre desde `/tasks` y hay un ícono nuevo en el rail: es un cambio que altera lo que la gente ya vio, y eso se avisa.
- [ ] **Dejar dicho quién administra el módulo `tasks`.** Asignarlo a un rol vuelve a esa gente asignable y liquidable. No hay pantalla que lo advierta y no la va a haber en esta tanda: la regla vive en el comentario de `team-derivations.ts` y en el spec, y quien administre roles tiene que saberla.

---

## Lo que este plan NO hace

Sale del spec y se anota acá para que no se cuele por contacto:

- **Reuniones.** `reunion_pendientes` no se toca ni se migra. Sigue congelada por su regla.
- **Arreglar `historial.usuario_id`.** 282 filas con el campo vacío. Es un bug real del log de auditoría, no reemplazaría a `created_by_id` (el log es admin-only) y va en su propia rama.
- **Renombrar la tabla.** El módulo es `/tasks` y la tabla sigue siendo `actividades`.
- **Adoptar el motor de filtros en los otros siete módulos.** Eso necesita que `FilterBar` deje de recibir estilos por props (`selectStyle`, `clearStyle`, `mutedColor`) — el punto 4 del spec, que va después y no entra en esta tanda.
- **La historia de a qué área perteneció cada persona.** Es una tabla de rangos, hermana de `historial`, no una columna. Se discute aparte.
- **Disolver Stratix 360.** La única decisión que queda abierta. Se queda con sus tres secciones.
- **Un gate separado para la nómina.** Se evaluó y se descartó: asignable y liquidable son la misma pregunta y se contestan con `MODULE.TASKS`. Dos gates distintos habrían sido dos cosas que se desincronizan.
- **Las sub-vistas como subrutas.** Es la forma correcta y es lo que haría el splitting automático, pero no es lo que quita la sensación de trabado (eso es la tarea 15) y rompe el mecanismo de `tab-tasks` / `tab-stratix`, que hoy guarda la pestaña como preferencia. Está anotado en el `.todo` con lo que hay que decidir antes.
- **Memoizar el resto del provider.** La tarea 14 memoiza lo que ella misma toca en `useTablero` para no dejarlo peor; los otros tres hooks (`useKanban`, `useSolicitudes`, `useReporte`) y el `value` del contexto —que se recrea en cada render y hace re-renderizar a todo consumidor— son su propio trabajo, en el `.todo`.
- **Partir los diccionarios de i18n.** 94 kB de JSON en el chunk del layout, un tercio del baseline. Se baja una sola vez y no causa nada de lo medido; es el próximo techo, no éste.
