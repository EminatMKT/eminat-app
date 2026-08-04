# Spec — Equipo real (Fase A): des-hardcodear el equipo de Stratix a `usuarios`

- **Fecha:** 2026-08-04
- **Autor:** EminatMKT (con Claude)
- **Origen:** decisión del usuario 2026-08-04 (sobre las notas de Freddy). El equipo de Stratix hoy está hardcodeado y la pestaña *Team* muestra un organigrama con "Cuenta por crear" — debe salir de `usuarios` reales.
- **Estado:** diseño, pendiente de revisión del usuario.

## 1. Contexto

El equipo de marketing vive **hardcodeado** en dos sistemas que no comparten fuente de verdad:

- `STRATIX360_ROSTER` (`features/stratix-mkt/components/roster/roster-data.ts`) — organigrama por **nombre**, con `area`/`leader`/`titulo`. 9 personas. Lo consume la pestaña *Team* (`Stratix360Roster.tsx` → `RosterCard.tsx`). Como no matchea con `usuarios` reales, cada persona sale con badge **"Cuenta por crear"**.
- `MIEMBROS_REFS` (`shared/constants/domain.ts`) — mapa **`responsable_ref` → nombre** (7 refs); `ACTIVE_MIEMBROS_REFS` (`team.ts`) le quita `Jonathan_CRM`. Lo consumen ~8 componentes (Kanban, Gantt, tabla de solicitudes, detalle, reporte, dropdown de responsable).

Esta fase **des-hardcodea el equipo**: una sola fuente de verdad = la tabla `usuarios`, filtrada por **departamento = Marketing**. La pestaña *Team* pasa a ser una **lista plana** (sin disciplinas ni badge LÍDER, según las reglas de Freddy: BR2 "sin subdivisiones", BR4 "líder = rol administrativo, no un puesto").

## 2. Modelo objetivo (norte que guía A, B y C)

Confirmado con el usuario. Hay **una sola lista de empresas** (la tabla `empresas`, ya creada y seedeada con EMC/SVN/ERG/VNF/PREMIER/ORNELLA/MENTOR). Sobre esa lista hay **dos relaciones distintas**:

- **Pertenencia** — a qué empresa/equipo *pertenece* una persona (`usuarios`).
- **Atribución** — a qué empresa *beneficia* una actividad (`actividades`).

Las actividades deben apoyarse en las **FK reales que ya existen** en la tabla, no en columnas de texto duplicadas:

| Concepto | FK (usar) | Texto redundante (a eliminar en Fase B) |
|---|---|---|
| Empresa que beneficia | `actividades.empresa_id → empresas.id` | `actividades.empresa` |
| Responsable asignado | `actividades.responsable_id → usuarios.id` | `actividades.responsable_ref` |
| Creador / solicitante | `actividades.solicitante_id → usuarios.id` | `actividades.solicitado_por` |

El responsable y el creador pueden ser el **mismo usuario o distintos**. Este spec (Fase A) **no** migra las actividades a FK todavía (eso es Fase B) — pero deja el equipo como `usuarios` reales, que es el prerequisito para que `responsable_id`/`solicitante_id` puedan apuntar a alguien.

## 3. Alcance de esta fase (A)

**Incluye:**
1. Sembrar el departamento **Marketing** en `departamentos`.
2. Dejar al equipo de marketing como filas reales en `usuarios` (backfill de los que ya existen + alta de los que faltan), con `departamento_id` = Marketing.
3. Exponer el departamento en la app (join en la query de `usuarios`).
4. Pestaña *Team* = **lista plana** de `usuarios` con departamento Marketing (sin agrupar por disciplina, sin badge LÍDER).
5. Derivar de `usuarios` (y **eliminar**) los hardcodes de equipo: `STRATIX360_ROSTER`/`AREA_META` (roster-data.ts), `MIEMBROS_REFS`/`ACTIVE_MIEMBROS_REFS` y las exclusiones de `team.ts`. El dropdown de responsable y todos los lookups `responsable_ref → nombre` salen de `usuarios`.

**No incluye (fases siguientes):**
- **Fase B** — migrar `actividades` a las FK (`responsable_id`/`solicitante_id`/`empresa_id`) y dropear los textos redundantes. Fase A **mantiene** `responsable_ref` como clave de join (ahora provista por `usuarios`, ya no por una constante).
- **Fase C** — CRUD de empresas en `/admin` + de-hardcodear el dropdown "Requested by" (`SOLICITANTES`) + resolver la **pertenencia de empresa** de estos usuarios (`usuarios.empresa`). Fase A **no toca** `usuarios.empresa` (la pestaña Team filtra por departamento, no por empresa).

## 4. Estado actual (verificado en código)

- **Carga de `usuarios`:** `shared/data/usuarios.ts` → `listActivos()` = `usuarios.select('*').eq('activo', true)` → array `usuarios` en `AppContext` (expone `departamento_id`, `responsable_ref`, `cargo`, `color`, `activo`, `email`, `empresa`…). El array `equipo` viene de `v_equipo_hoy` y **no** expone `departamento_id` → la pestaña Team debe filtrar el array **`usuarios`**, no `equipo`.
- **`departamentos`** (tabla `id, codigo unique, nombre, color, icono, activo`): existe, `usuarios.departamento_id` la FK-referencia, pero **ningún código TS la lee** hoy. No hay filtrado por departamento en ninguna parte.
- **Pestaña Team:** `EquipoTab.tsx` → sub-tab `team` renderiza `Stratix360Roster.tsx` (lee `usuarios` + `STRATIX360_ROSTER`, matchea por nombre normalizado, agrupa por `AreaKey`, dibuja LÍDER/"Cuenta por crear" en `RosterCard.tsx`).
- **Dropdown de responsable:** `NewActivityModal.tsx` L4-6,40-41 usa `ACTIVE_MIEMBROS_REFS` (hardcode), `value = responsable_ref`. Mismo patrón en `SolicitudesAvailabilityView.tsx` y `ReporteTab.tsx`.
- **`usuarios.empresa`** default = `'Eminat Holding'` (irrelevante para esta fase).

## 5. Diseño (Fase A)

### 5.1 DB — departamento Marketing + equipo en `usuarios`
Migración nueva (`pnpm supabase migration new equipo_marketing_dept`), orden local Docker → dev remoto → prod:

1. **Seed `departamentos`** (idempotente `ON CONFLICT (codigo) DO NOTHING`): una fila `Marketing` (`codigo='MKT'`, `nombre='Marketing'`, `color`/`icono` a gusto).
2. **Backfill `usuarios`** del equipo (§6): a cada persona que ya existe como usuario, setear `departamento_id` = (id de Marketing) y `cargo` (del `titulo` del roster) si está vacío. La señal de "es del equipo" para el backfill son los `responsable_ref` conocidos + los emails del roster.
3. **Alta de los sin cuenta** (Angie, Tasha; ver §6/§10): filas `usuarios` con `auth_id NULL`, `activo=true`, `departamento_id` Marketing, `cargo`. La UI ya sabe mostrar "sin cuenta todavía" cuando `auth_id`/email faltan.

> En **dev** (usuarios casi vacío) hay que **sembrar** el equipo completo para poder testear; en **prod** la mayoría ya existe → es backfill + alta de los 2-3 que falten. El detalle por-persona se confirma con un audit de `usuarios` en prod al implementar (§10).

### 5.2 Exponer el departamento en la app
`listActivos()` (`shared/data/usuarios.ts`) pasa a `select('*, departamentos(codigo, nombre)')` (embed de Supabase por la FK `departamento_id`). Así cada `usuario` expone `u.departamentos?.codigo`. Sin cambio de tipos (el shape es `any` hoy). `listAll()` puede recibir el mismo embed si el admin lo necesita luego (opcional).

### 5.3 Pestaña Team = lista plana desde `usuarios`
Reescribir `Stratix360Roster.tsx` (o reemplazarlo por un componente plano): renderiza `usuarios.filter(u => u.departamentos?.codigo === 'MKT' && u.activo)`, **sin** agrupar por disciplina y **sin** badge LÍDER. `RosterCard.tsx` se simplifica: nombre, `cargo` (de `usuarios.cargo`), avatar/color, punto online (`online_at`), email o "sin cuenta todavía", y `tareasHoy` (sigue calculándose con `a.responsable_ref === u.responsable_ref` en Fase A). Se **eliminan** `roster-data.ts` (`STRATIX360_ROSTER`, `AREA_META`, `AreaKey`, `RosterEntry`) y su uso.

### 5.4 Derivar `ref → nombre` y dropdowns desde `usuarios` (matar el hardcode)
- Nuevo helper/derivación en contexto (p. ej. en `useAppData`/un `useTeam()` o un memo en `AppContext`): `miembrosRef = Object.fromEntries(usuarios.filter(u => u.responsable_ref).map(u => [u.responsable_ref, u.nombre]))`. Reemplaza `MIEMBROS_REFS`.
- El "equipo de marketing asignable" = `usuarios.filter(u => u.departamentos?.codigo === 'MKT' && u.responsable_ref)`. Reemplaza `ACTIVE_MIEMBROS_REFS`; **la exclusión por nombre de `team.ts` deja de hacer falta** (Jonathan/Javier no tienen departamento Marketing → no aparecen). `team.ts` se borra o se reduce a `normTeamName` si algún consumidor aún lo usa.
- Los consumidores del §7 pasan a leer ese map/lista derivada (vía `useApp()`), no la constante importada. El dropdown de responsable en `NewActivityModal`/`SolicitudesAvailabilityView`/`ReporteTab` itera la lista derivada.

## 6. Inventario del equipo (roster ↔ ref)

| Nombre | `cargo` (de `titulo`) | `responsable_ref` | ¿Cuenta? |
|---|---|---|---|
| Freddy Crespín | Director de Marketing | `Coord_MFreddy` | sí |
| Joselyne Guerrero | Lead Designer | `DG_Joselyn` | sí |
| Arianna Sig-Tú | Graphic Designer | `DG_Ariana` | sí |
| Angie Núñez | Graphic Designer | — | **no** (alta `auth_id NULL`) |
| David Falconi | Lead Editor & Animations | `DGA_David` | sí |
| Bryan Núñez | Video Editor | `EV_Bryan` | sí |
| Tasha Palomino | Video Editor | — | **no** (alta `auth_id NULL`) |
| Wagner Dueñas | Full Stack Developer | — (sin tareas de mkt) | sí (usuario existe; ¿va en el equipo Team?, §10) |
| Naomi Panchana | Ejecutiva de Cuentas & CM | `CM_ Naomi` | sí |

> Ya **no** se guardan `area`/`leader`: la disciplina desaparece (BR2) y el liderazgo será un rol por empresa (BR4, Fase de roles). El `titulo` del roster se preserva como `usuarios.cargo`.

## 7. Archivos afectados (código)

**Eliminar / vaciar:** `features/stratix-mkt/components/roster/roster-data.ts`; `shared/constants/domain.ts` (quitar `MIEMBROS_REFS`); `features/stratix-mkt/team.ts` (quitar `ACTIVE_MIEMBROS_REFS` + exclusiones; conservar `normTeamName` solo si se sigue usando); `shared/context/AppContext.tsx:22` (re-export de `MIEMBROS_REFS`).

**Reescribir para leer de `usuarios`:** `roster/Stratix360Roster.tsx`, `roster/RosterCard.tsx` (lista plana); `hooks/useStratixData.ts` (L59-65,77-92,137: `refsTeam`, `datosPorMiembro`, `resumenHoras`, `nombreRep` desde el map derivado); `components/gantt/GanttBar.tsx:17`; `components/kanban/KanbanTaskCard.tsx:9,23`; `components/solicitudes/TaskTableRow.tsx:17`; `components/modals/ActivityDetailModal.tsx:13`; `components/modals/NewActivityModal.tsx:40-41`; `components/solicitudes/SolicitudesAvailabilityView.tsx`; `components/reporte/ReporteTab.tsx`.

**Datos:** `shared/data/usuarios.ts` (`listActivos` con embed de `departamentos`).

## 8. Fuera de alcance

- **Fase B:** `actividades` por FK (`responsable_id`/`solicitante_id`/`empresa_id`) + drop de `responsable_ref`/`solicitado_por`/`empresa` (texto). Fase A deja `responsable_ref` como join key data-driven.
- **Fase C:** CRUD de empresas en `/admin`; de-hardcodear `SOLICITANTES` ("Requested by"); pertenencia `usuarios.empresa` + reconciliación de vocabulario de empresas.
- Roles administrativo/operario + visibilidad (BR4/5/7).

## 9. Riesgos

- **`equipo` (v_equipo_hoy) no trae `departamento_id`** → la pestaña Team debe filtrar `usuarios` (que sí lo trae con el embed), no `equipo`. Verificado.
- **Refs consumidos por import estático** (`MIEMBROS_REFS`) → volverlos data-driven obliga a pasar el map por contexto a ~8 componentes; hay que revisar cada call-site (§7) y que ninguno quede importando la constante borrada (lo caza `tsc`).
- **`responsable_ref` de actividades históricas** (`DG_Joselyn`, etc.) **no se tocan** — solo cambia de dónde sale el `ref → nombre`. Si un usuario no tiene `responsable_ref` seteado, sus tareas históricas quedarían sin nombre resuelto → el backfill (§5.1) debe respetar los `responsable_ref` existentes.
- **Dev vacío** → hay que sembrar el equipo en dev para testear; el seed de dev y el backfill de prod son scripts distintos.

## 10. Decisiones abiertas (para el plan)

- **¿Wagner va en la pestaña Team de Stratix?** Es "Full Stack Developer / Automatización", sin `responsable_ref` de marketing. Si su departamento es Digital/AI y no Marketing, **no** aparecería (correcto). Confirmar su `departamento`.
- **¿Se dan de alta ahora los sin-cuenta (Angie, Tasha)?** o se difieren hasta que tengan correo. El modelo los soporta (`auth_id NULL`); decisión de datos.
- **Valores exactos por persona** (`responsable_ref`, `cargo`, quién ya existe en prod) → se confirman con un audit de `usuarios` en **prod** al implementar (dev está vacío).
- **`codigo` del departamento** (`MKT` propuesto) y si hay otros departamentos a sembrar de paso (Finanzas, Research…) o solo Marketing por ahora (recomendado: solo Marketing, YAGNI).
