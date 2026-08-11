# Fase 2 — eliminar `responsable_ref` y `solicitado_por`

**Fecha:** 2026-08-11
**Rama:** `feat/estructura-organizacional` (continúa la fase 1, sin mergear)
**Predecesor:** `2026-08-11-stratix-empresas-design.md` (fase 1, completa — 14 commits)

## Problema

`actividades` identifica a las personas por un texto compuesto (`DG_Joselyn`,
`Coord_MFreddy`) en vez de por la FK uuid que ya existe vacía. El texto viene de
`remote_schema.sql`, el dump del esquema original: no fue una decisión de diseño, es
herencia.

El diagnóstico completo está en la sección "Fuera de scope → Fase 2" del spec de la fase 1
y no se rehace acá. En corto, el ref falla las tres condiciones de una clave natural sana:

- **Codifica datos que ya existen por separado** — cargo (`usuario_cargos`/`cargos`) y
  nombre (`usuarios.nombre`). Por eso `DG_Ariana` quedó con el nombre viejo de Arianna.
- **No es `UNIQUE` ni `NOT NULL`** — 3 de 10 personas no tienen ref.
- **No lo consume ningún sistema externo** — no hay código de Google Sheets y `sheet_row`
  está en 0 filas.

Descartado: sanar el ref con `UNIQUE` + `NOT NULL`. Le daría integridad a un artefacto que
hay que borrar, y obligaría a inventar tres refs nuevos.

### Tres bugs latentes que esto arregla

No son efectos colaterales: son consecuencias directas de que la FK esté vacía.

1. **El RPC de reasignación no transfiere nada.** `admin_reassign_and_delete` hace
   `UPDATE actividades ... WHERE responsable_id = p_old_id`, y `responsable_id` es NULL en
   las 18 filas. Borrar a alguien con tareas o bien transfiere 0, o bien entra por la rama
   "no tiene actividades" y borra al usuario dejando sus actividades apuntando a un ref
   fantasma.
2. **Los no-admin sin ref ven todas las actividades.** `loadAppData` filtra con
   `!isAdmin && usr.responsable_ref ? usr.responsable_ref : undefined`; sin ref el filtro
   es `undefined`, o sea ninguno.
3. **Angie, Tasha y Wagner no son asignables.** `deriveMiembrosAsignables` exige
   `responsable_ref`, y ellos no tienen.

## Estado de los datos (local, verificado)

```
actividades: 18 filas · responsable_id 0 · solicitante_id 0
responsable_ref: EV_Bryan 4 · DG_Joselyn 4 · CM_ Naomi 3 · DG_Ariana 3 · DGA_David 3 · Coord_MFreddy 1
solicitado_por:  Coord_MFreddy 18
```

Los 6 refs resuelven a un usuario existente, incluido `CM_ Naomi` con el espacio. El
backfill es limpio y el `NOT NULL` no rompe.

## Decisiones

### 1. `solicitado_por` → `solicitante_id`, FK a `usuarios`

`SOLICITANTES` mezcla dos naturalezas: 4 personas (Freddy, Rafaella, Vivi CEO, Javier COO)
y 5 empresas (EMC, ERG, SVN, VNF, PREMIER). Las empresas ya están cubiertas por
`actividades.empresa`, que en la fase 1 pasó a ser FK a `empresas.codigo`. El solicitante
es una persona; su lugar es `usuarios`.

`SOLICITANTES` se borra de `shared/constants/domain.ts`.

**Descartado:** conservar las dos naturalezas con dos columnas excluyentes. Reintroduce el
problema que la fase mata — personas identificadas por texto libre.

### 2. Etiqueta en la UI: nombre + apellido

`"Joselyne Guerrero"`, no `"DG_Joselyn"` ni `"Joselyne"`. Hay dos Núñez (Bryan y Angie), así
que el apellido no sobra.

**Descartado:** nombre + cargo. `usuario_cargos` es N:N (David tiene "Lead Editor" y
"Animations"; Naomi "Ejecutiva de Cuentas" y "CM") y no hay orden ni flag de principal:
componer la etiqueta obligaría a inventar uno. El cargo se ve en Team y Directorio, que es
donde vive ese dato.

### 3. Una sola migración, con `DROP COLUMN`

Mismo patrón que la fase 1. Ver "Migración" abajo.

### 4. La excepción `Coord_MFreddy` se generaliza

Hoy el reporte por miembro (`useStratixData.ts:98-103`) cuenta las actividades donde el
miembro es responsable, salvo si el miembro es Freddy: ahí además suma las que él solicitó,
con el ref escrito literal.

La excepción no puede sobrevivir a la migración: el string `'Coord_MFreddy'` deja de
existir y preservarla obligaría a hardcodear el uuid de Freddy, que es peor.

Pasa a ser una regla sin excepción — **tus actividades son las que sos responsable más las
que solicitaste**:

```ts
a.responsable_id === idRep || a.solicitante_id === idRep
```

Con los datos de hoy ninguna cifra cambia: nadie salvo Freddy figura como solicitante.
La excepción nunca fue "Freddy es especial", fue "Freddy es el único que solicita" — un
dato, no una regla.

### 5. El dropdown de solicitante lista todos los usuarios activos

No solo Marketing. Cubre los dos casos reales: el superior de otra área que pide, y el
compañero de equipo que le pide a otro.

## Migración

Una sola, irreversible. Orden obligatorio: el backfill antes del `NOT NULL`, el `NOT NULL`
antes del `DROP`.

```sql
-- 1. backfill por el ref
UPDATE actividades a SET responsable_id = u.id
  FROM usuarios u WHERE u.responsable_ref = a.responsable_ref;
UPDATE actividades a SET solicitante_id = u.id
  FROM usuarios u WHERE u.responsable_ref = a.solicitado_por;

-- 2. la integridad que el ref nunca tuvo
ALTER TABLE actividades ALTER COLUMN responsable_id SET NOT NULL;

-- 3. adiós al artefacto
ALTER TABLE actividades DROP COLUMN responsable_ref, DROP COLUMN solicitado_por;
ALTER TABLE usuarios    DROP COLUMN responsable_ref;

-- 4. el RPC pierde p_new_ref: cambia la firma, así que DROP + CREATE (no REPLACE,
--    que dejaría una sobrecarga vieja viva)
DROP FUNCTION public.admin_reassign_and_delete(uuid, uuid, text, text);
CREATE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid, p_new_id uuid DEFAULT NULL, p_status_override text DEFAULT NULL
) ...
```

Notas:

- `solicitante_id` queda **nullable**: el RPC lo pone en NULL al borrar al solicitante, y
  eso es correcto.
- Las FK ya existen (`actividades_responsable_id_fkey`, `actividades_solicitante_id_fkey`)
  y no se tocan.
- El cuerpo nuevo del RPC es el actual menos las dos referencias a `p_new_ref`: el
  `SET responsable_ref = p_new_ref` del UPDATE y el `v_old_ref` del sello `notas_jefe`
  (que pasa a usar solo `nombre_display`).

### Verificación previa a cada `db push`

Dev y prod tienen datos distintos de local. Si algún ref no resuelve, el `NOT NULL` revienta
la migración a mitad de camino y no hay rollback.

```sql
-- responsables huérfanos
SELECT DISTINCT a.responsable_ref FROM actividades a
 LEFT JOIN usuarios u ON u.responsable_ref = a.responsable_ref
 WHERE u.id IS NULL;

-- solicitantes huérfanos (no bloquean el NOT NULL, pero se pierden en silencio)
SELECT DISTINCT a.solicitado_por FROM actividades a
 LEFT JOIN usuarios u ON u.responsable_ref = a.solicitado_por
 WHERE a.solicitado_por IS NOT NULL AND u.id IS NULL;
```

La primera **debe** devolver 0 filas antes de migrar. La segunda, si devuelve filas, hay
que decidir a qué usuario mapear cada valor (o aceptar el NULL) antes del push.

## Cambios de código

### Derivación — el corazón del cambio

`shared/context/team-derivations.ts`:

```ts
// id -> "Nombre Apellido". Incluye inactivos: las tareas viejas siguen resolviendo.
deriveMiembrosPorId(usuarios): Record<string, string>

// asignables: activo && depto MKT. Se cae el `&& responsable_ref` — ese filtro
// era el bug que dejaba fuera a Angie, Tasha y Wagner.
deriveMiembrosAsignables(usuarios): { id: string; nombre: string }[]
```

### Helper puro nuevo

El filtro del reporte sale de `useStratixData` a una función testeable:

```ts
// features/stratix-mkt/report-filter.ts
esActividadDeMiembro(act, idMiembro, mes?): boolean
```

Es la única lógica no trivial de la fase; hoy vive inline en tres ternarios.

### Reemplazos mecánicos (~25 sitios)

| Archivo | Cambio |
|---|---|
| `shared/constants/domain.ts` | se borra `SOLICITANTES` |
| `shared/context/AppContext.tsx` | `miembrosRef` → `miembrosPorId`; deja de re-exportar `SOLICITANTES` |
| `shared/context/loadAppData.ts` | tipos `Actividad`/`Usuario`: fuera los text, dentro las FK. Filtro → `list(!isAdmin ? usr.id : undefined)` |
| `shared/data/actividades.ts` | `list(responsableId?)` filtra por `responsable_id` |
| `shared/db/session/index.ts` | fuera `responsable_ref` del tipo de sesión |
| `features/stratix-mkt/types.ts` | `NuevaActForm`: `responsable_id`/`solicitante_id`. `ResumenHoras.ref` → `.id` |
| `features/stratix-mkt/hooks/useStratixData.ts` | defaults, filtros y agrupaciones por id; usa el helper nuevo |
| `.../modals/NewActivityModal.tsx` | select de responsable por id; el de solicitante pasa de `SOLICITANTES` a usuarios activos |
| `.../modals/ActivityDetailModal.tsx` | Assignee y "Requested by" por `miembrosPorId` |
| `.../kanban/KanbanTaskCard.tsx` · `.../gantt/GanttBar.tsx` · `.../solicitudes/TaskTableRow.tsx` | `miembrosPorId[a.responsable_id]` |
| `.../overview/RecentActivityRow.tsx` | mostraba el ref crudo → nombre |
| `.../solicitudes/MemberAvailabilityCard.tsx` | `refKey` → `userId`; el `find` por id |
| `.../roster/RosterCard.tsx` | cuenta tareas por `user.id` |
| `features/admin/types.ts` | fuera `responsable_ref` del `Pick` |
| `features/admin/components/DeleteUserModal.tsx` | fuera `newRef`, la `<option disabled>` y el error de heredero sin ref |
| `features/admin/components/OrgCard.tsx` | comentario desactualizado |
| `app/api/admin/reassign-and-delete/route.ts` | fuera `newRef` del body, su validación y `p_new_ref` |
| `supabase/seed/equipo_marketing_dev.sql` | seed sin refs |

**Consecuencia visible en Admin:** al borrar un usuario, **todos** los usuarios pasan a ser
herederos elegibles. Hoy los que no tienen ref aparecen deshabilitados. Se van con eso 4
claves i18n de `es.json`/`en.json`: `admin.del.heirNoRef`, `heirNoRefHint1`,
`heirNoRefHint2`, `notEligibleSuffix`.

### Tests

- `shared/context/team-derivations.test.ts` — fixtures por id; caso "inactivo con
  actividades históricas sigue resolviendo el nombre".
- `features/stratix-mkt/report-filter.test.ts` (nuevo) — responsable sí, solicitante sí,
  ninguno de los dos no, y el cruce con el filtro de mes.
- `features/admin/index.test.ts` — fixtures sin `responsable_ref`.

TDD sobre las derivaciones y el helper. El resto es reemplazo de campo: lo cubren `tsc`,
ESLint y los 118 tests existentes.

### QA manual (los tres flujos que tocan la FK)

1. Crear una actividad → responsable y solicitante se guardan como uuid.
2. Reporte por miembro → las cifras de la tabla de arriba no se mueven (Bryan 4, Joselyne
   4, Naomi/Ariana/David 3, Freddy 18).
3. Borrar un usuario con tareas eligiendo heredero → **transfiere de verdad** (hoy
   transfiere 0).

## Fuera de scope

- **El alta de Vivi, Javier y Rafaella como usuarios.** Es acción del admin desde /admin,
  no código, y **no bloquea la migración**: el backfill solo necesita a Freddy, que existe.
  Aviso: crear un usuario dispara un mail con contraseña temporal a esa persona.
- **El cargo "Directivo" y el rol para directivos.** `cargos` y `roles` ya son catálogos
  administrables desde /admin. Cero líneas de código.
- **El módulo de directivos.** Su propia fase; no depende de esta.
- **Limpieza de refs sucios** (`CM_ Naomi`, `Jonathan_CRM`, `DG_Ariana`): sin sentido, el
  ref se borra.
- **`slots_calendario`, `solicitudes`, `social_accounts.brand`**: heredado de la fase 1,
  sigue fuera. Ver la nota de abajo sobre `solicitudes`.

### Nota: Solicitudes es una vista, no una entidad

Hay dos diseños compitiendo en el esquema y conviene dejarlo escrito antes de que se
decida por accidente.

**El que está vivo:** la pestaña Solicitudes de Stratix (`SolicitudesTab`,
`SolicitudesListView`, `MemberAvailabilityCard`) lee de `useApp().actividades`. Una
solicitud *es* una actividad, mirada desde el otro lado: alguien pide, otro la ejecuta.

**El que está muerto:** la tabla `solicitudes` — 22 columnas, 0 filas, con `actividad_id`,
`estado: 'recibida'`, `motivo_rechazo`, `notas_coordinador`. Modela lo contrario: un pedido
que vive aparte y se *convierte* en actividad. Nunca se usó, igual que `slots_calendario`.

Esta fase empuja al diseño vivo sin cerrar la puerta al otro. Al llenar `solicitante_id`,
la vista puede filtrar "lo que me pidieron" de verdad — hoy no puede, porque
`solicitado_por` vale `Coord_MFreddy` en las 18 filas y no discrimina nada.

Queda pendiente decidir si la tabla `solicitudes` se borra. No es trabajo de esta fase.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El `DROP COLUMN` es irreversible y dev/prod tienen datos distintos | Las dos consultas de verificación previa, corridas en cada entorno antes del push |
| Un ref huérfano hace fallar el `NOT NULL` a mitad de migración | Idem — la primera consulta debe dar 0 filas |
| `CREATE OR REPLACE` sobre el RPC dejaría viva la sobrecarga de 4 args | `DROP FUNCTION` explícito con la firma completa |
| El reporte por miembro cambia de semántica | Verificado contra los datos: ninguna cifra se mueve hoy |
