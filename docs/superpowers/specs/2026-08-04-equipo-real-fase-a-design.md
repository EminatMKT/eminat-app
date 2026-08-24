# Spec — Equipo real (Fase A): estructura organizacional administrable + des-hardcodear el equipo de Stratix

- **Fecha:** 2026-08-04 (revisado 2026-08-05)
- **Autor:** EminatMKT (con Claude)
- **Origen:** decisión del usuario sobre las notas de Freddy. El equipo de Stratix hoy está hardcodeado y la pestaña *Team* muestra un organigrama con "Cuenta por crear" — debe salir de `usuarios` reales, y toda la estructura (departamentos, equipos, cargos) debe ser **administrable desde `/admin`, igual que los roles**.
- **Estado:** diseño, pendiente de revisión del usuario.

## 1. Contexto

El equipo de marketing vive **hardcodeado** en dos sistemas que no comparten fuente de verdad:

- `STRATIX360_ROSTER` (`features/stratix-mkt/components/roster/roster-data.ts`) — organigrama por **nombre**, con `area`/`leader`/`titulo`. 9 personas. Lo consume la pestaña *Team* (`Stratix360Roster.tsx` → `RosterCard.tsx`). Como no matchea con `usuarios` reales, cada persona sale con badge **"Cuenta por crear"**.
- `MIEMBROS_REFS` (`shared/constants/domain.ts`) — mapa **`responsable_ref` → nombre** (7 refs); `ACTIVE_MIEMBROS_REFS` (`team.ts`) le quita `Jonathan_CRM`. Lo consumen ~8 componentes (Kanban, Gantt, tabla de solicitudes, detalle, reporte, dropdown de responsable).

Esta fase **des-hardcodea el equipo** y crea la estructura organizacional que lo respalda. Fuente de verdad única = `usuarios` + tres catálogos administrables (`departamentos`, `equipos`, `cargos`), gestionados desde `/admin` con el mismo patrón que ya tiene **Roles**.

## 2. Modelo objetivo — empresa (norte que guía B y C)

Confirmado con el usuario. Hay **una sola lista de empresas** (la tabla `empresas`, ya creada y seedeada con EMC/SVN/ERG/VNF/PREMIER/ORNELLA/MENTOR). Sobre esa lista hay **dos relaciones distintas**:

- **Pertenencia** — a qué empresa *pertenece* una persona (`usuarios.empresa`, se resuelve en Fase C).
- **Atribución** — a qué empresa *beneficia* una actividad (`actividades`, Fase B).

Las actividades deben apoyarse en las **FK reales que ya existen**, no en columnas de texto duplicadas:

| Concepto | FK (usar) | Texto redundante (a eliminar en Fase B) |
|---|---|---|
| Empresa que beneficia | `actividades.empresa_id → empresas.id` | `actividades.empresa` |
| Responsable asignado | `actividades.responsable_id → usuarios.id` | `actividades.responsable_ref` |
| Creador / solicitante | `actividades.solicitante_id → usuarios.id` | `actividades.solicitado_por` |

El responsable y el creador pueden ser el **mismo usuario o distintos**. Fase A **no** migra las actividades a FK (eso es Fase B) — pero deja el equipo como `usuarios` reales, prerequisito para que `responsable_id`/`solicitante_id` puedan apuntar a alguien.

## 3. Estructura organizacional (el corazón de esta fase)

Jerarquía confirmada: **un departamento tiene equipos, y cada equipo un líder.** El cargo es ortogonal (lo que la persona *es*, no dónde está).

```
departamento  1───*  equipo  ──►  lider_id → usuarios      (cada equipo un líder)
                       │
                       *  usuarios.equipo_id                (un usuario en UN equipo)

cargo  ── ortogonal ──►  usuarios.cargo_id                  (lo que ERES)
```

Tablas y columnas:

```
departamentos   (YA EXISTE — solo le falta la pestaña CRUD)
  id uuid pk · codigo text unique · nombre · color · icono · activo

equipos   (NUEVO)
  id uuid pk · codigo text unique · nombre
  departamento_id uuid  → departamentos.id   (NOT NULL: el equipo vive en un departamento)
  lider_id        uuid  → usuarios.id        (nullable)
  activo boolean default true

cargos   (NUEVO)
  id uuid pk · codigo text unique · nombre · activo boolean default true

usuarios   (+2 FK, −1 columna)
  + equipo_id uuid → equipos.id  (nullable)  ← ÚNICA membresía
  + cargo_id  uuid → cargos.id   (nullable)
  − departamento_id                          ← se DROPEA: el departamento se deriva del equipo
```

**Membresía única y departamento derivado.** Una persona se ancla por `equipo_id`. Su departamento **se deriva** (`equipos.departamento_id`); no se guarda por separado en `usuarios` para no tener dos fuentes que puedan contradecirse. `usuarios.departamento_id` hoy no lo lee ningún código → se dropea limpio. Persona sin equipo (`equipo_id NULL`) = sin departamento; si algún director necesita departamento sin equipo, se le crea un equipo (ej. "Dirección").

**Todo administrable como Roles.** Los tres catálogos se crean/editan/borran desde `/admin`. El seed de esta fase solo carga datos de arranque (§8); de ahí en adelante se gestionan desde la UI.

### 3.1 Auditoría de redundancias FK↔texto (verificada contra el esquema real)

Antes de crear FK nuevas, se revisó el esquema (`20260612193730_remote_schema.sql` + `20260804213205`). Redundancias existentes:

| Tabla | Columna(s) | Estado / decisión |
|---|---|---|
| `actividades` | `responsable_id` (FK) + `responsable_ref` (text) | Duplicado → dropear texto en **Fase B** |
| `actividades` | `empresa_id` (FK) + `empresa` (text) | Duplicado → dropear texto en **Fase B** |
| `actividades` | `solicitante_id` (FK) + `solicitado_por` (text) | Duplicado → dropear texto en **Fase B** |
| `actividades` | `aprobado_por_id` (FK) | Limpio, sin gemelo de texto |
| `usuarios` | `id_sheet` (text) **==** `responsable_ref` (text) | **🔴 Dos columnas para el MISMO mnemónico de Sheet (`DG_Joselyn`).** Fase A usa `responsable_ref` como puente de join; **ambas caen en Fase B** cuando las actividades resuelven por `responsable_id → usuarios.id` |
| `usuarios` | `cargo` (text) | Redundante al crear `cargo_id → cargos`; se usa como origen del seed y se **dropea en Fase A** (tras migrar y quitar los lectores) |
| `usuarios` | `departamento_id` (FK) | Se **dropea en Fase A** (departamento derivado del equipo) |
| `usuarios` | `empresa` (text, def. `Eminat Holding`) | Debería ser `empresa_id → empresas` → **Fase C** (pertenencia) |
| `solicitudes` | `departamento_destino` (text) | Debería ser `departamento_id → departamentos` ahora que es tabla administrada → **pendiente** (§11), fuera de A/B/C |
| `solicitudes` | `email_solicitante` / `nombre_solicitante` (text) | **Justificado** — snapshot para solicitantes externos sin cuenta (`solicitante_id` NULL). No tocar |

**Segunda pasada (2 agentes, contexto nuevo, 2026-08-05).** Confirmaron todo lo anterior y detectaron redundancias adicionales en `usuarios` (tabla que ya tocamos) — se decide caso por caso, **no** en Fase A salvo que sean triviales:

| Tabla | Columna(s) | Confianza | Decisión |
|---|---|---|---|
| `usuarios` | `tipo` (def `'A'`) **vs** `tipo_jornada` (def `'A'`, CHECK A/B/externo) | alta | 🟡 Gemelas, mismo concepto de jornada. Colapsar a una — **verificar uso en código antes**. Fuera de Fase A (ortogonal al equipo); ticket propio o fase de limpieza |
| `usuarios` | `estado` (text `'activo'`) **vs** `activo` (bool) | media | 🟡 Dos representaciones del mismo estado. Mismo tratamiento: verificar uso, no en Fase A |
| `usuarios` | `validado` (bool) vs `validado_en`/`validado_por` | media | 🟢 Derivable (`validado ⇔ validado_en IS NOT NULL`) — menor, opcional |
| `usuarios` | `horas_dia`/`horas_semana`/`horas_mes` | media | ✅ **Mantener** — derivable en el caso base pero es knob de excepciones (part-time/externo) |
| `slots_calendario` | `usuario_id` / `empresa_id` | media-baja | Derivables de `actividad_id → actividades`. Revisar en Fase B junto con la migración de FK de actividades |

Redundancias fuera de estos módulos (research_*, cobranzas_*: grupo de contacto repetido, `creado_por`/`owner_email` como texto, agregados de campaña, catálogos de laboratorio/estudio) → **ticket de backlog aparte**, no pertenecen a esta cadena de specs.

## 4. Alcance por fases

**Fase A (esta):**
1. Crear tablas `equipos` y `cargos`; agregar `usuarios.equipo_id`/`cargo_id`; dropear `usuarios.departamento_id`.
2. Seed: departamento **Marketing** + un equipo inicial **Marketing** + `cargos` (de los `titulo` del roster) + el equipo de marketing como filas reales en `usuarios` (backfill de los que existen + alta de los que faltan), con `equipo_id` y `cargo_id` seteados.
3. Exponer estructura en la app (embed en la query de `usuarios`).
4. Pestaña *Team* = **lista plana** de `usuarios` cuyo `equipo.departamento.codigo = 'MKT'` (líder marcado desde `equipos.lider_id`; sin disciplinas).
5. Derivar de `usuarios` (y **eliminar**) los hardcodes: `STRATIX360_ROSTER`/`AREA_META`, `MIEMBROS_REFS`/`ACTIVE_MIEMBROS_REFS` y las exclusiones de `team.ts`. Dropdowns y lookups `responsable_ref → nombre` salen de `usuarios`.

**Fuera de alcance (specs/fases siguientes):**
- **Fase A.2 — CRUD en `/admin` (spec aparte).** Tres pestañas estilo Roles (**Departamentos**, **Equipos** con selector de departamento y líder, **Cargos**) para alta/edición/baja vía API admin. A crea las tablas y las siembra; A.2 les pone la UI de gestión. Es un **spec separado que se implementa inmediatamente después de A** (mismo branch `development`). **No se abre PR entre specs** — la cadena completa (A → A.2 → …) va en un **único PR al final**, cuando todo esté completo.
  - **DECIDIDO 2026-08-05 — cargos pasa a N:N al INICIO de A.2** (antes de escribir el CRUD, para no construirlo dos veces). Fase A dejó cargo **único** (`usuarios.cargo_id`, N:1); A.2 lo migra a **N:N**: `CREATE TABLE usuario_cargos (usuario_id → usuarios, cargo_id → cargos, PK compuesta)`, **split de los cargos con `&`** del catálogo en entradas granulares (ej. "Lead Editor & Animations" → "Lead Editor" + "Animations"; "Ejecutiva de Cuentas & CM" → "Cuentas" + "CM"), migrar `cargo_id`→filas de `usuario_cargos`, `DROP COLUMN usuarios.cargo_id`. Razón: hay personas con >1 cargo real y separarlos da **trazabilidad**. El CRUD de A.2 edita cargos por usuario como **multiselección**. (Distinto de granularizar el *contenido* de un cargo — nivel Senior/Junior, sufijo "(Pasante)" — que serían campos en `cargos`, no multiplicidad.)
- **Fase B** — migrar `actividades` a las FK (`responsable_id`/`solicitante_id`/`empresa_id`) y dropear los textos redundantes. Fase A **mantiene** `responsable_ref` como clave de join (ahora provista por `usuarios`).
- **Fase C** — CRUD de `empresas` en `/admin` + de-hardcodear `SOLICITANTES` ("Requested by") + resolver la **pertenencia de empresa** (`usuarios.empresa`). Fase A **no toca** `usuarios.empresa`.
- **Fase D (post-C) — de-hardcodear + consolidar el Directorio.** `/directorio` hoy es 100% hardcode (`DIRECTORIO_DATA`/`CARGOS_DIR` en `shared/constants/directorio.ts`, ~30 personas org-wide). **NO se liquida** (su alcance es toda la empresa; el Team tab es solo Marketing); se **consolida**: sale de `usuarios` + `cargos` + `departamentos`, comparte el componente de tarjeta con el Team tab (Directorio = grid de todos con filtro por departamento; Team = pre-filtrado a Marketing). Necesita: los ~30 como `usuarios` (muchos sin cuenta), **columnas nuevas** (`nickname`, `credenciales`), **sembrar el resto de departamentos** (Leadership/Directors/Finance/Business Dev/Research/Digital&AI/VNF), y la pertenencia de empresa (por eso va **después de C**). Reconciliar dos contradicciones: cargos que no coinciden entre Directorio y el seed del Team, y departamento-organigrama ≠ equipo-operativo (ej. Freddy en *Directors* pero líder del equipo Marketing).

## 5. Estado actual (verificado en código)

- **Carga de `usuarios`:** `shared/data/usuarios.ts` → `listActivos()` = `usuarios.select('*').eq('activo', true)` → array `usuarios` en `AppContext` (expone `departamento_id`, `responsable_ref`, `cargo`, `color`, `activo`, `email`, `empresa`…). El array `equipo` viene de `v_equipo_hoy` y **no** trae la membresía → la pestaña Team debe filtrar el array **`usuarios`**.
- **`departamentos`** (`id, codigo unique, nombre, color, icono, activo`): existe, `usuarios.departamento_id` la referencia, pero **ningún código TS la lee** hoy.
- **Pestaña Team:** `EquipoTab.tsx` → sub-tab `team` → `Stratix360Roster.tsx` (lee `usuarios` + `STRATIX360_ROSTER`, matchea por nombre, agrupa por `AreaKey`, dibuja LÍDER/"Cuenta por crear" en `RosterCard.tsx`).
- **Dropdown de responsable:** `NewActivityModal.tsx` usa `ACTIVE_MIEMBROS_REFS` (hardcode), `value = responsable_ref`. Mismo patrón en `SolicitudesAvailabilityView.tsx` y `ReporteTab.tsx`.
- **Admin roles (patrón a replicar):** panel `/admin` tab Roles hace CRUD de `roles`/`role_modules` vía API admin. Los catálogos nuevos siguen ese molde.

## 6. Diseño DB — migración

Migración nueva (`pnpm supabase migration new estructura_equipos_cargos`), orden local Docker → dev remoto → prod:

1. **`CREATE TABLE cargos`** (`id`, `codigo` unique, `nombre`, `activo`).
2. **`CREATE TABLE equipos`** (`id`, `codigo` unique, `nombre`, `departamento_id` FK NOT NULL, `lider_id` FK nullable, `activo`).
3. **`ALTER TABLE usuarios`** `ADD COLUMN equipo_id → equipos`, `ADD COLUMN cargo_id → cargos`.
4. **Seed** (idempotente, `ON CONFLICT (codigo) DO NOTHING`):
   - `departamentos`: fila `Marketing` (`codigo='MKT'`).
   - `equipos`: fila `Marketing` (`codigo='MKT-GEN'` o similar) en el departamento Marketing.
   - `cargos`: uno por `titulo` distinto del roster (§8).
   - `usuarios`: backfill de los que existen (`equipo_id`=Marketing, `cargo_id` por su título) + alta de los sin cuenta (`auth_id NULL`).
5. **Drops en `usuarios`** (tras el seed y tras que el código deje de leerlas — lo caza `tsc`):
   - `DROP COLUMN departamento_id` (+ su FK) — departamento derivado del equipo. Antes de dropear, si en **prod** tiene datos, úsalos para informar el `equipo_id` del backfill.
   - `DROP COLUMN cargo` (text) — ya migrado a `cargo_id`.
   - `id_sheet` y `responsable_ref` **se conservan en Fase A** (`responsable_ref` es el puente de join de actividades). Ambas se dropean en **Fase B** cuando las actividades resuelvan por `responsable_id`.
6. **RLS**: los tres catálogos son legibles por usuarios autenticados (como `departamentos`/`roles`); escritura solo `service_role` (via API admin). `equipos.lider_id`/`usuarios.equipo_id` no habilitan escalada de permisos — el gating de módulos sigue en roles.

> En **dev** (usuarios casi vacío) hay que **sembrar** el equipo completo para testear; en **prod** la mayoría ya existe → backfill + alta de los 2-3 que falten. El detalle por-persona se confirma con un audit de `usuarios` en prod al implementar (§11).

## 7. Diseño app

### 7.1 Exponer la estructura
`listActivos()` (`shared/data/usuarios.ts`) pasa a:
```
select('*, equipos(codigo, nombre, departamentos(codigo, nombre)), cargos(codigo, nombre)')
```
Así cada `usuario` expone `u.equipos?.departamentos?.codigo` (para el filtro MKT), `u.equipos?.lider_id` y `u.cargos?.nombre`. Shape sigue siendo `any`.

### 7.2 Pestaña Team = lista plana desde `usuarios`
Reescribir `Stratix360Roster.tsx` (o reemplazarlo por un componente plano): renderiza `usuarios.filter(u => u.equipos?.departamentos?.codigo === 'MKT' && u.activo)`, **sin** agrupar por disciplina. El badge **LÍDER** ahora sí tiene fuente real: `u.id === u.equipos?.lider_id`. `RosterCard.tsx` se simplifica: nombre, cargo (`u.cargos?.nombre`), avatar/color, punto online (`online_at`), email o "sin cuenta todavía", y `tareasHoy` (`a.responsable_ref === u.responsable_ref` en Fase A). Se **eliminan** `roster-data.ts` y su uso.

### 7.3 Derivar `ref → nombre` y dropdowns desde `usuarios`
- Memo/derivación en `AppContext`/`useAppData`: `miembrosRef = Object.fromEntries(usuarios.filter(u => u.responsable_ref).map(u => [u.responsable_ref, u.nombre]))`. Reemplaza `MIEMBROS_REFS`.
- "Equipo asignable" = `usuarios.filter(u => u.equipos?.departamentos?.codigo === 'MKT' && u.responsable_ref)`. Reemplaza `ACTIVE_MIEMBROS_REFS`; la exclusión por nombre de `team.ts` deja de hacer falta (los de fuera de Marketing no aparecen). `team.ts` se borra o se reduce a `normTeamName` si algún consumidor lo usa.
- Los consumidores del §9 leen ese map/lista vía `useApp()`, no la constante importada.

> El **CRUD de estos catálogos en `/admin`** (Departamentos/Equipos/Cargos) es la **Fase A.2**, spec aparte y pendiente — no es parte de esta fase. Aquí los datos se cargan por seed/backfill.

## 8. Inventario del equipo + seed (roster → usuarios/cargos)

| Nombre | `cargo` (de `titulo`) | `responsable_ref` | ¿Cuenta? |
|---|---|---|---|
| Freddy Crespín | Director de Marketing | `Coord_MFreddy` | sí — **líder** del equipo Marketing |
| Joselyne Guerrero | Lead Designer | `DG_Joselyn` | sí |
| Arianna Sig-Tú | Graphic Designer | `DG_Ariana` | sí |
| Angie Núñez | Graphic Designer | — | **no** (alta `auth_id NULL`) |
| David Falconi | Lead Editor & Animations | `DGA_David` | sí |
| Bryan Núñez | Video Editor | `EV_Bryan` | sí |
| Tasha Palomino | Video Editor | — | **no** (alta `auth_id NULL`) |
| Wagner Dueñas | Full Stack Developer | — (sin tareas de mkt) | sí (¿va en el equipo Team?, §11) |
| Naomi Panchana | Ejecutiva de Cuentas & CM | `CM_ Naomi` | sí |

- **`cargos` a sembrar** (distintos): Director de Marketing, Lead Designer, Graphic Designer, Lead Editor & Animations, Video Editor, Full Stack Developer, Ejecutiva de Cuentas & CM.
- **`equipos.lider_id`** del equipo Marketing = Freddy (recupera el `leader` del roster como dato real, BR4: rol administrativo).
- Ya **no** se guardan `area`/disciplina: desaparece (BR2). El `titulo` del roster se normaliza a `cargos`.

## 9. Archivos afectados (código)

**Eliminar / vaciar:** `features/stratix-mkt/components/roster/roster-data.ts`; `shared/constants/domain.ts` (quitar `MIEMBROS_REFS`); `features/stratix-mkt/team.ts` (quitar `ACTIVE_MIEMBROS_REFS` + exclusiones); `shared/context/AppContext.tsx:22` (re-export de `MIEMBROS_REFS`).

**Reescribir para leer de `usuarios`:** `roster/Stratix360Roster.tsx`, `roster/RosterCard.tsx` (lista plana + líder real); `hooks/useStratixData.ts` (`refsTeam`, `datosPorMiembro`, `resumenHoras`, `nombreRep` desde el map derivado); `components/gantt/GanttBar.tsx`; `components/kanban/KanbanTaskCard.tsx`; `components/solicitudes/TaskTableRow.tsx`; `components/modals/ActivityDetailModal.tsx`; `components/modals/NewActivityModal.tsx`; `components/solicitudes/SolicitudesAvailabilityView.tsx`; `components/reporte/ReporteTab.tsx`.

**Datos:** `shared/data/usuarios.ts` (`listActivos` con embed).

> Los archivos de la UI de admin (vistas + rutas API para departamentos/equipos/cargos) pertenecen a la **Fase A.2** (spec aparte), no a esta.

## 10. Riesgos

- **`equipo` (v_equipo_hoy) no trae la membresía** → la pestaña Team filtra `usuarios` (con embed), no `equipo`. Verificado.
- **Dropear `usuarios.departamento_id`** en prod puede perder datos si estaba poblado → leerlos ANTES para informar el `equipo_id` del backfill; hacerlo en la misma migración tras el backfill.
- **Refs consumidos por import estático** (`MIEMBROS_REFS`) → volverlos data-driven obliga a pasar el map por contexto a ~8 componentes; `tsc` caza cualquier call-site que quede importando la constante borrada.
- **`responsable_ref` de actividades históricas** no se tocan — solo cambia de dónde sale el `ref → nombre`. El backfill debe respetar los `responsable_ref` existentes.
- **Dev vacío** → seed completo en dev para testear; seed de dev y backfill de prod son scripts distintos.
- **Referencia circular equipos↔usuarios** (`equipos.lider_id → usuarios`, `usuarios.equipo_id → equipos`): se resuelve seedando en orden (usuarios sin `equipo_id` → equipos → `UPDATE usuarios SET equipo_id` → `UPDATE equipos SET lider_id`). Ambas FK nullable lo permiten.

## 11. Decisiones abiertas (para el plan)

- **¿Wagner va en la pestaña Team de Stratix?** Es "Full Stack Developer / Automatización". Si su equipo no es de departamento Marketing, **no** aparece (correcto). Confirmar.
- **¿Se dan de alta ahora los sin-cuenta (Angie, Tasha)?** o se difieren. El modelo los soporta (`auth_id NULL`).
- **Valores exactos por persona** (`responsable_ref`, título, quién existe en prod) → audit de `usuarios` en **prod** al implementar.
- **`codigo` de equipo Marketing** (`MKT-GEN`? ¿o el equipo inicial se llama igual que el depto?) — cosmético, se ajusta en seed.

**Pendientes anotados (fuera de A/B/C, discutir luego):**
- **`solicitudes.departamento_destino` (text) → `departamento_id → departamentos`**: ahora que `departamentos` es tabla administrada, este texto es una FK-en-espera. Ticket propio.
- **¿`solicitudes` es redundante con `actividades`?** Sospecha del usuario: una solicitud es la misma actividad, pedida por alguien de otro departamento y asignada a otra persona. Posible fusión/colapso de tablas. **No se toca la tabla por ahora** — discusión de modelo aparte antes de decidir.

**Cerrado:** Fase A.2 (CRUD admin) se separa en su propio spec y se implementa inmediatamente después de A sobre el mismo branch `development`. **No hay PR por spec**: la cadena completa se mergea a `main` en un único PR al final, con todo completo y probado en local/dev.
