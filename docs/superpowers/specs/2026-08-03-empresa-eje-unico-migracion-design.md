# Spec — `empresa` como eje único: migración de esquema

- **Fecha:** 2026-08-03
- **Autor:** EminatMKT (con Claude)
- **Origen:** 7 notas de voz de Freddy Crespín (2026-08-03, 17:42–18:10) definiendo las reglas de negocio del modelo de datos.
- **Estado:** diseño aprobado, pendiente de plan de implementación.

## 1. Contexto

El código tiene tres conceptos pisándose los nombres:

- **`area`** — usado para DOS cosas distintas: en `actividades.area_ref` = la **marca/empresa** del grupo a la que sirve la tarea (EMC, SVN…); en `roster-data.ts` (`AreaKey`) = la **disciplina** del equipo (Diseño, Edición…).
- **`departamento`** — unidad de empresa (Marketing, Finance…), para el Directorio.
- Datos de equipo **hardcodeados** en `MIEMBROS_REFS`, `STRATIX360_ROSTER` y las exclusiones de `team.ts`.

Freddy zanjó el modelo: **un solo eje de agrupación, `empresa/marca`, sin subdivisiones.** Este spec cubre **solo la migración de esquema** que alinea la base a esas reglas. El resto (roles/visibilidad, UI de admin, selección de empresa en login, des-hardcodear el roster) queda fuera de alcance (§8).

## 2. Reglas de negocio (fuente de verdad — de los audios de Freddy)

- **BR1 — Empresa/marca es el eje único.** Las empresas son las divisiones del Grupo Eminat que **generan ingresos**. *"Antes era área, ahora es empresa."*
- **BR2 — No hay subdivisiones.** Nada de equipos/disciplinas/departamentos/líderes. *"No hay subdivisión… todos reciben tareas, todos cumplen tareas."*
- **BR3 — Una persona pertenece a UNA empresa.** *"Si perteneces a esta empresa, a esa empresa estás y listo."*
- **BR4 — Liderazgo = rol administrativo por empresa.** Dos roles por empresa: `administrativo` (ve todo lo de su empresa) y `operario` (ve solo lo suyo). Encima, un **super-admin** (Freddy) sobre todas las empresas. *(No es organigrama; es el split de rol.)*
- **BR5 — Visibilidad scoped por empresa.** Solo ves datos de tu empresa.
- **BR6 — La lista de empresas se deja como está y debe ser gestionable desde `/admin`** (decisión del usuario). `empresa` se mantiene **separado** de `módulo`.
- **BR7 — El operario no ve datos comprometedores** (p. ej. horas de otros). *(Diferido — no entra en este spec.)*

> BR4, BR5, BR7 son **permisos/visibilidad** → se apoyan en el sistema de **roles dinámicos que ya existe** y se difieren (§8). Este spec implementa la base de datos de BR1–BR3 + BR6.

## 3. Estado actual del esquema (verificado en dev)

- **`areas`** — ES la tabla de empresas, mal nombrada. Columnas: `id (uuid pk)`, `codigo (unique)`, `nombre`, `color`, `descripcion`, `activo`, `created_at`. **0 filas en dev.**
- La referencian por `area_id (uuid)` → `areas.id`: `actividades`, `slots_calendario`, `solicitudes`.
- **`actividades.area_ref`** — `text`, el **código** de empresa (EMC, SVN…). Es lo que usa la app para agrupar (`MARCAS_LIST` matchea por `codigo`). **Sin FK** (texto libre).
- **`usuarios.empresa`** — `text`, sin FK, hoy sin poblar.
- La lista canónica de empresas vive hardcodeada en `shared/constants/domain.ts` → `MARCAS_LIST`: `EMC, SVN, ERG, VNF, PREMIER, ORNELLA, MENTOR`.

## 4. Diseño objetivo

### 4.1 Renombrar `areas` → `empresas`
Renombrar la tabla y las columnas FK que la apuntan, para eliminar la palabra "area" del esquema:

| Antes | Después |
|---|---|
| tabla `areas` | tabla `empresas` |
| `actividades.area_id` | `actividades.empresa_id` |
| `actividades.area_ref` | `actividades.empresa` |
| `slots_calendario.area_id` | `slots_calendario.empresa_id` |
| `solicitudes.area_id` | `solicitudes.empresa_id` |

> **BR1 / BR6.** La tabla ya soporta CRUD (es una tabla común) → habilita la gestión desde `/admin` sin schema extra.

### 4.2 Pertenencia: `usuarios.empresa` → FK
`usuarios.empresa` (ya existe, `text`) pasa a tener **FK a `empresas.codigo`**. `NOT NULL` se aplica **después** del backfill (no en esta migración, para no romper altas existentes).

> **BR3.** Referencia por **clave natural legible** (`empresa` → `empresas.codigo`), siguiendo la convención del repo (`usuarios.rol` → `roles.key`). No se usa `empresa_id` en usuarios.

### 4.3 Seed de `empresas`
Poblar `empresas` (idempotente, `ON CONFLICT (codigo) DO NOTHING`) con la lista actual de `MARCAS_LIST`, tal cual (BR6): `EMC, SVN, ERG, VNF, PREMIER, ORNELLA, MENTOR`, con su `color` actual. **No** se agregan/quitan empresas en esta migración (la reconciliación con la lista de Freddy —Ondara, Vivi, etc.— se hace luego desde el admin).

### 4.4 Lo que NO se construye (BR2)
No se crean `equipos`, ni `departamentos` para el equipo, ni `lider_id`, ni `es_lider`. La rama de organigrama/disciplinas/liderazgo queda **descartada**.

## 5. Operaciones de la migración (orden)

1. **Pre-flight (prod):** verificar que todo `actividades.area_ref` distinto de NULL exista en la lista a seedear. Si hay valores fuera de catálogo (legacy), decidir seed extra o limpieza **antes** de agregar cualquier FK sobre `actividades.empresa`.
2. Seed de `empresas` (upsert idempotente) — **primero**, para que las FKs tengan a quién apuntar.
3. Asegurar `UNIQUE CONSTRAINT` en `empresas.codigo` (hoy hay un unique **index** `areas_codigo_key`; una FK requiere un unique **constraint**, no solo index — agregar si falta).
4. `ALTER TABLE areas RENAME TO empresas`.
5. Renombrar columnas FK (`area_id → empresa_id` en las 3 tablas; `actividades.area_ref → empresa`).
6. `ALTER TABLE usuarios ADD CONSTRAINT usuarios_empresa_fkey FOREIGN KEY (empresa) REFERENCES empresas(codigo)`.
7. *(Opcional / guardado)* FK en `actividades.empresa → empresas(codigo)`. **Solo** si el pre-flight (#1) da limpio; si no, se difiere como segundo migration (mismo patrón que el `research_leads.stage` union→tight).

> Nombres de índices/constraints heredados (`areas_pkey`, `areas_codigo_key`, `actividades_area_id_fkey`) quedan con el nombre viejo tras el rename. Renombrarlos es **cosmético/opcional**; no bloquea.

## 6. Rollout

Orden estándar del repo: **DB primero, código después.**
1. Crear migración con `pnpm supabase migration new empresa_rename_eje_unico`.
2. Aplicar a **dev** (`ydcadspinryybextlvyi`), verificar.
3. Aplicar a **prod** (`ruedelunbtaomhrzgelc`) tras el pre-flight (§5.1).
4. Recién entonces, el código que lea `empresas`/`empresa` (specs siguientes).

⚠️ **Coordinación código↔DB:** renombrar `area_ref→empresa` y `area_id→empresa_id` **rompe** el código que hoy lee esas columnas (`useStratixData`, `KanbanTaskCard`, `GanttBar`, `getColorMarca`, repos de `slots_calendario`/`solicitudes`, etc.). El rename de columnas y el ajuste de código deben ir **en el mismo PR** (o feature flag), no en migraciones sueltas. El plan de implementación debe listar cada call-site.

## 7. Riesgos

- **Rename de columnas con datos en prod** — mecánico pero irreversible sin migración inversa; requiere el PR de código acoplado.
- **`slots_calendario` / `solicitudes`** — parecen dormidas; el rename de su `area_id` es barato pero hay que verificar que nada las lea con el nombre viejo.
- **FK sobre `actividades.empresa`** — puede fallar si prod tiene `area_ref` fuera de catálogo (mismo riesgo que vivimos con `research_leads.stage`). Mitigado por el pre-flight + opción de diferir.
- **Redundancia `empresa_id` (uuid) + `empresa` (código)** en `actividades` — se preserva tal cual (hoy ya conviven `area_id`+`area_ref`). Consolidar a una sola es **fuera de alcance**.

## 8. Fuera de alcance (specs / PRs siguientes)

1. **Roles administrativo/operario por empresa + visibilidad scoped (BR4, BR5, BR7)** — sobre el sistema de roles dinámicos existente + RLS por `empresa`/`responsable_id`. Incluye ocultar horas ajenas al operario.
2. **CRUD de empresas en `/admin`** (BR6).
3. **Selección de empresa al registrarse** en el login (correo `@eminat.net` → elegir empresa).
4. **Des-hardcodear el equipo** — `MIEMBROS_REFS`/roster → derivar de `usuarios` (lista **plana** de personas por empresa, sin disciplinas ni líderes, coherente con BR2). Reemplaza el ticket previo de `equipos`/organigrama, ahora descartado.
5. **Reconciliar la lista de empresas** con la de Freddy (agregar Ondara, Vivi; revisar Premier/Mentor) — se hará desde el admin, no en migración.

## 9. Decisiones abiertas (menores, para el plan)

- **`usuarios.empresa` por código vs uuid** — el spec elige **código** (convención del repo). Si el unique-constraint en `codigo` diera problemas, alternativa: `usuarios.empresa_id → empresas.id`. El plan lo confirma al implementar.
- **FK en `actividades.empresa` ahora o diferida** — depende del pre-flight en prod (§5.1).
