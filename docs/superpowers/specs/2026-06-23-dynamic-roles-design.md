# Roles dinámicos (control de acceso configurable por el superadmin) — Diseño

**Fecha:** 2026-06-23
**Estado:** En diseño — pendiente de aprobación para pasar a plan de implementación
**Autor:** EminatMKT (con asistencia)
**Rama:** `feature/dynamic-roles` (sacada de `development`)

## Contexto y problema

Hoy los roles y su acceso a módulos están **hardcodeados en código** en
`shared/auth/permissions.ts`: un type `Role` (unión de 7 strings), un array `ROLES`,
una matriz `PERMISSIONS` (rol→módulos) y `ROLE_LABELS`. Para crear un tipo de rol nuevo
o cambiar qué módulos ve un rol hay que editar código y desplegar.

El superadmin (Freddy) necesita poder **crear tipos de rol y asignarles módulos desde
/admin**, sin pasar por un desarrollador. Según el rol, el usuario ve un set limitado de
opciones tanto en el menú (sidebar/launchpad) como en el gate de `AccessDenied` si conoce
la ruta de un módulo al que no tiene acceso.

Esta es la ruta más escalable: deja `permissions.ts` leyendo de la DB en vez de la matriz
fija. Era el "segundo ciclo" que el refactor by-feature
([2026-06-17-features-shared-refactor-design.md](2026-06-17-features-shared-refactor-design.md))
dejó anotado como fuera de alcance.

## Objetivos

- El superadmin **crea/edita tipos de rol** desde /admin y marca qué módulos ve cada uno.
- Menú (sidebar + launchpad) y `AccessDenied` reflejan los permisos desde la DB.
- **Reutilizar** el patrón existente de chips de rol (`RoleChip`/`RoleFilterBar`) y conectar
  los dropdowns de rol (Create/Edit user) a la lista dinámica en vez del array estático.
- **No romper** el uso actual de roles en la app durante la ventana de deploy.

## Alcance y decisiones tomadas

### Lo que se vuelve dato vs. lo que sigue en código

- **Roles → datos** (tabla `roles` + `role_modules`). El superadmin los gestiona.
- **Módulos → siguen en código.** Cada módulo es una ruta real (`app/(app)/<slug>`). El
  catálogo (`ModuleSlug`, `ALL_MODULES`, `MODULE_META`) se queda en `permissions.ts`.
  - *Por qué no "crear módulos" desde /admin:* un módulo necesita código (la pantalla). Un
    botón "crear módulo" solo registraría un nombre sin pantalla detrás → link roto. Agregar
    un módulo seguirá siendo programar la ruta, como hoy.

### Modelo de rol

Una fila de `roles` tiene:

| Campo | Rol | Editable |
|---|---|---|
| `key` | ID interno (slug), p.ej. `stratix360`. Va en `usuarios.rol` y lo referencia el código. | **Fija** tras crear |
| `label` | Nombre visible, p.ej. "Stratix 360". | Sí |
| `activo` | Soft delete: oculta el rol del menú de asignación sin borrarlo. | Sí |
| `is_system` | Protege roles del sistema (`admin`) de borrado/desactivación. | No |
| módulos | Asignación en `role_modules`. | Sí |

- **Renombrar es trivial y seguro** porque se cambia el `label`, no la `key`. Cambiar la
  `key` rompería las referencias en cada usuario → la `key` queda fija. Esto vale **también
  para `admin`**: el superadmin puede renombrar su label (p.ej. "Administrador" → "Admin");
  la `key` `'admin'` (de la que depende el código vía `SUPERADMIN_ROLE`) no se toca.
- **Borrar definitivo** solo si **ningún usuario** tiene ese rol. Lo blinda la DB: la FK
  `usuarios.rol → roles.key` con `ON DELETE RESTRICT` rechaza borrar un rol en uso. Para
  retirar un rol en uso → `activo=false` (soft delete).
- **`admin` es `is_system`**: no se puede borrar ni desactivar, y sus módulos no se editan
  (ve todo por short-circuit, ver abajo). **Sí** se le edita el `label`. Es el superadmin.
- **Guard del último admin:** no se puede quitar/degradar/borrar al **último** usuario con
  rol `admin` (chequeo server-side en la API de usuarios). Evita quedarse sin nadie que
  administre si un superadmin se cambia el rol o se borra. Crear otro superadmin = asignar
  el rol `admin` a otra persona desde el dropdown de usuario (sin flujo especial).
- **Módulos por defecto de un rol nuevo:** nace **vacío** (el superadmin marca lo que quiera).
  Un rol sin módulos = el usuario ve solo Home (empty state del launchpad) — es un estado
  válido, no un error.
- **Desactivar (`activo=false`) NO revoca acceso a quien ya tiene el rol:** el rol sigue
  teniendo sus `role_modules`, así que los usuarios que lo portan **siguen viendo sus
  módulos**. Desactivar solo lo **oculta del menú de asignación** (no se puede asignar a más
  gente). Para retirar acceso de verdad hay que **reasignar** a esos usuarios a otro rol.

### Edge enforcement: DIFERIDO (decisión explícita)

El middleware (Edge) **hoy NO enforça módulos**: lee el rol de un claim del JWT que nunca
se popula (`custom_access_token_hook` jamás se construyó), así que hace *fail-open*. El gate
real de módulos ya es **client-side** (`AppContext` + `AppShell` ocultan lo no permitido;
las páginas renderizan `AccessDenied`) **+ RLS** en la DB.

**Decisión:** no construir el auth hook ahora. La feature entrega roles dinámicos con la
**misma postura de seguridad que hoy** (client + RLS — la data está protegida por RLS igual).
El middleware queda como gate de **sesión** únicamente. El auth hook queda como follow-up
(anotado en `.todo`: "Edge enforcement de módulos (auth hook)") para retomar después de
completar esta feature.

**Ceiling de propagación (también del lado cliente):** el mapa rol→módulos se carga al montar
`AppContext`. Si el superadmin cambia los módulos de un rol, los usuarios con ese rol **ya
logueados no ven el cambio hasta recargar** la app (paralelo al ceiling de ~1h por token del
Edge). Para el propio superadmin, **`RolesManager` refresca el contexto tras editar** (re-fetch
de `roles`+`role_modules`) para que la pantalla de gestión y su sidebar reflejen el cambio en
el acto. Para los demás usuarios, aplica al próximo load — aceptable para una herramienta
interna.

## Arquitectura

### 1. Esquema (migración `dynamic_roles`)

```
roles(key PK, label, activo=true, is_system=false, created_at, updated_at)
role_modules(role_key FK→roles.key ON UPDATE CASCADE ON DELETE CASCADE,
             module_slug,            -- NO es FK: módulos son code-defined
             PK(role_key, module_slug))
```

- **Seed** `roles` (7 roles, `admin`→`is_system`) y `role_modules` desde la matriz
  `PERMISSIONS` actual.
- **Migración de legacy (orden load-bearing):** `UPDATE usuarios` mapeando
  `superadmin/coordinador→admin` y `colaborador/pasante→stratix360` **antes** de la FK
  (si no, la validación de la FK falla en filas legacy).
- **Swap CHECK→FK:** cambiar default de `rol` a `stratix360`, `DROP CONSTRAINT
  usuarios_rol_check`, agregar `usuarios_rol_fkey` (guard idempotente con `pg_constraint`).
- **Reparar RLS/funciones que referencian roles legacy** (si no, los admins pierden grants
  al desaparecer las filas `superadmin`):
  - políticas `superadmin_all` (actividades, solicitudes), `superadmin_all_marcaciones`,
    `superadmin_all_users`: `'superadmin'` → `'admin'`.
  - `colaborador_read` (actividades): repuntar a `'stratix360'`.
  - función `tiene_acceso_research()`: `IN ('admin','superadmin','coordinador')` → `'admin'`.
- **RLS de tablas nuevas:** `SELECT` para `authenticated` (la app carga la matriz con el
  cliente browser); escritura solo `service_role` (API de admin).

### 2. Capa de datos (`shared/data`)

- Nuevo `shared/data/roles.ts` (solo lectura): `listRoles()`, `listRoleModules()`.
- `tables.ts`: agregar `roles`, `roleModules`. `index.ts`: exportar `rolesRepo`.

### 3. Capa de app (`shared/auth/permissions.ts`)

- `Role = string` (cualquier key dinámica es válida).
- Nuevos: `RoleModuleMap = Record<string, ModuleSlug[]>`, `RoleRow`, constantes
  `SUPERADMIN_ROLE='admin'` y `DEFAULT_ROLE='stratix360'`.
- Helpers puros sobre el mapa cargado: `getModulesForRole(map, role)`,
  `canAccess(map, role, slug)`.
  - **Short-circuit de admin:** `canAccess` devuelve `true` si `role===SUPERADMIN_ROLE`,
    sin mirar el mapa. Así el superadmin ve **todos** los módulos, incluidos los nuevos,
    sin mantenimiento. (`getModulesForRole` para admin → `ALL_MODULES`.)
- `normalizeRole`: mantener como bridge legacy, pero **pasar tal cual** cualquier key no
  legacy (antes devolvía `null` para keys desconocidas → rompería roles nuevos).
- Quitar `ROLES`, `PERMISSIONS`, `ROLE_LABELS` (ahora viven en DB). Conservar `MODULE_META`,
  `ALL_MODULES`, `moduleForPath`.
- **Limpieza menor in-scope:** `MODULE_PATH_PREFIX` es redundante — en los 8 casos es
  `'/' + slug`. Como ya reescribimos `permissions.ts`, se borra el mapa y `moduleForPath`
  computa el prefijo (`'/' + slug`). Cero cambio de comportamiento; un mapa menos que mantener
  al agregar módulos.

### 4. Carga en contexto

- `useAppData`: estado `roles: RoleRow[]` + `roleModuleMap: RoleModuleMap` + setters.
- `loadAppData`: tras el perfil, cargar `roles` + `role_modules` y construir el mapa.
  Si falla, mapa vacío → los gates niegan acceso (seguro).
- `AppContext`: deriva `modules`, `esSuperAdmin = role===SUPERADMIN_ROLE`, `cargo` (label
  desde `roles`), `canCobranzas/Research/Medical` desde el mapa. Expone `roles` +
  `roleModuleMap`. Se quita el re-export estático `ROLES`.

### 5. Consumidores

- `AppShell`: sidebar desde `modules.includes(slug)` (en vez de `canAccess` estático).
- `middleware.ts`: queda como gate de sesión (se quita el bloque de módulos muerto).
- Dropdowns de rol (`UserRow`, `CreateUserModal`, `EditUserModal`): desde `roles` del
  contexto (value=`key`, texto=`label`), filtrando `activo` (+ el valor actual).
- `UserRow`: el rol de sistema (`admin`) muestra badge protegido en vez de dropdown; sin
  botones desactivar/eliminar (consistente con la protección de la API).
- `RoleChip`/`RoleFilterBar`: chips desde `roles` con `label`.
- `create-user` route: default `DEFAULT_ROLE`; el label del email se trae de la tabla
  `roles` (reemplaza `ROLE_LABELS`).

### 6. UI de gestión (nuevo, dentro de /admin, solo superadmin)

- `RolesManager` + `CreateRoleModal`: listar roles, crear (key+label), grid de checkboxes
  de módulos (`ALL_MODULES` + `MODULE_META[slug].name`), toggle `activo`, borrar (solo si
  no está en uso). Para el rol `admin` (is_system): label editable, pero key/borrado/
  desactivación bloqueados y checkboxes de módulos deshabilitados (ve todo por short-circuit).
- Nuevas rutas `app/api/admin/roles/` (GET/POST y `[key]` PATCH/DELETE), `service_role`,
  con **authz explícita de superadmin** y **validación de cada `module_slug` contra
  `ALL_MODULES`**.
- **Validación de la `key` al crear** (server-side): formato slug `^[a-z][a-z0-9_]*$`
  (minúsculas, sin espacios), **única**, y **no reservada**. Set reservado: `{ admin, todos }`
  — `admin` es el superadmin del sistema y `todos` es el centinela del filtro en
  `RoleFilterBar` (una key `todos` rompería el filtro de la tabla de usuarios). La `key` es
  inmutable tras crear; PATCH solo toca `label`/`activo`/módulos.

## Módulos ↔ DB (conexión y qué pasa si cambia uno)

Regla: **el código es la fuente de verdad de qué módulos EXISTEN** (`ALL_MODULES`); la **DB
solo guarda las ASIGNACIONES** (`role_modules`). `module_slug` es texto, NO FK (los módulos
no son filas). La API que escribe asignaciones valida cada `module_slug` contra `ALL_MODULES`
→ imposible asignar un módulo fantasma.

- **Agregar un módulo** (p.ej. `finanzas`): (1) en código sumar el slug a `ModuleSlug` +
  `ALL_MODULES` + `MODULE_META` + `MODULE_PATH_PREFIX` y crear `app/(app)/<slug>/page.tsx`;
  (2) el gestor de roles lo muestra **automáticamente** como checkbox; (3) ningún rol lo ve
  hasta que el superadmin lo marque — salvo `admin`, que lo ve el día 1 por el short-circuit.
- **Quitar un módulo del código**: `ALL_MODULES` se achica; quedan filas huérfanas en
  `role_modules` que son **inofensivas** (AppShell solo renderiza slugs conocidos). Opcional:
  `DELETE FROM role_modules WHERE module_slug NOT IN (...)` en la misma migración que lo quita.

> Nota de namespaces: el **slug de módulo** `'admin'` (la ruta `/admin`) y la **key de rol**
> `'admin'` (el superadmin) son el mismo string en **namespaces distintos** — coincidencia, no
> acoplamiento. El rol `admin` casualmente tiene el módulo `admin`, pero no hay relación forzada.

## Manejo de errores

- Carga de roles falla → mapa vacío, gates niegan (fail-safe), la app no crashea.
- API de roles valida slugs contra el catálogo y rechaza tocar `is_system`.
- Borrado de rol en uso → lo rechaza la FK (`ON DELETE RESTRICT`); la API devuelve error claro.
- **Invariante anti-lockout (admin nunca se auto-bloquea):** `esSuperAdmin` se deriva de
  `normalizeRole(usuario.rol)` (string del perfil, **no** del mapa) y `canAccess` hace
  short-circuit para admin. Por eso, **aunque la carga de `roles`/`role_modules` falle** (mapa
  vacío), el superadmin **sigue viendo todo** y puede entrar a `RolesManager` a arreglar. El
  fail-safe "mapa vacío = negar" aplica a roles no-admin; el admin queda siempre operativo.

## Propagación de migración (dev → prod)

Según `CLAUDE.md`: migración en `supabase/migrations/` vía `pnpm supabase migration new`.
1. Correr app + `pnpm test` contra **dev**.
2. `supabase link --project-ref ydcadspinryybextlvyi && db push` (dev). Verificar.
3. Merge `feature/dynamic-roles` → `development`.
4. Tras soak, merge → `main`; `link --project-ref ruedelunbtaomhrzgelc && db push` (prod).

Sin downtime: el `UPDATE` legacy + swap FK es rápido en la tabla chica `usuarios`; el
middleware fail-open + gates client-side evitan lockout durante la rotación de tokens. El
guard prod-ref de `env.client.ts` no cambia. El shim `normalizeRole` se quita en un PR
follow-up una vez migradas ambas DBs y rotados los tokens.

## Testing

- **vitest:** `shared/auth/permissions.test.ts` para `getModulesForRole`/`canAccess` sobre
  un mapa de prueba (rol desconocido → `[]`, null → `false`) + `moduleForPath` (incl. que
  computa `'/'+slug` tras borrar `MODULE_PATH_PREFIX`). Casos de las reglas nuevas:
  - **Short-circuit de admin:** `canAccess(map, 'admin', cualquierSlug)` → `true` aun con
    mapa vacío; `getModulesForRole(map, 'admin')` → `ALL_MODULES`.
  - **Validación de key** (helper puro): rechaza formato inválido, duplicados y reservadas
    (`admin`, `todos`).
  - **`validateModuleSlugs`** (extraído de la API): rechaza slugs fuera de `ALL_MODULES`.
  - **Guard del último admin** (helper puro `isLastAdmin`/equivalente): dada una lista de
    usuarios, rechaza degradar/borrar si quedaría 0 con rol `admin`.
  `features/admin/index.test.ts` sigue verde.
- **Manual E2E en dev:** admin ve todo; crear rol "soporte" solo con `directorio`, asignar a
  un usuario test → ve solo Directorio; agregar módulo → acceso al refrescar; `admin`
  no borrable ni desactivable; RLS de cobranzas/research siguen OK; `SELECT DISTINCT rol`
  muestra solo keys nuevas.

## Decisiones pendientes

- **Auditoría de cambios de permisos** — Existe tabla `historial` en el esquema. Falta
  decidir si se **audita** quién crea/edita/borra un rol y quién cambia el rol de un usuario.
  Contexto: el sistema toca módulos **médico (HIPAA), RRHH y finanzas**, donde un trail de
  cambios de privilegios suele ser esperable por compliance. Opciones: (a) loguear en
  `historial` desde la API de roles/usuarios dentro de esta feature; (b) dejarlo como ticket
  follow-up; (c) no auditar. **Sin resolver** — definir antes de cerrar el plan de implementación.

## Fuera de alcance (tickets separados)

Regla ponytail: **migrar tabla por tabla, donde haya dolor real + un mantenedor real; cada
blob hardcodeado = su propio PR.** Mezclarlos haría los PRs irrevisables. Esta feature es
solo la matriz de roles. Lo demás queda como tickets propios (brainstorm→spec→plan chico):

- **Edge enforcement (auth hook)** — diferido, anotado en `.todo`.
- **Directorio + departamentos a DB** — ya existen tablas `departamentos`
  (`codigo,nombre,color,icono,activo`) y `usuarios.departamento_id` (FK), pero el directorio
  hardcodea `DEPS_DIR` + `DIRECTORIO_DATA` (54 personas) en `shared/constants/directorio.ts`.
  Leer de `departamentos` + `usuarios` en vez de los arrays. (TODO existente.)
- **Dominios corporativos a DB** — existe tabla `dominios_corporativos`, pero el login los
  hardcodea. Migrar la validación de dominio a leer de la tabla.
- **MODULE_META editable** (name/description/leader/subAreas) — los leaders/subAreas son
  org-chart duplicado (= `usuarios` + tabla `areas`); derivarlos en vez de tabla nueva. YAGNI
  hasta que Freddy lo pida.
- **UI reutilizable de carga CSV** — separar (1) seed inicial one-time = SQL, sin UI; (2)
  carga continua de Freddy en prod = UI CSV, **reusando** el import/export de cobranzas
  (componente compartido de parseo+preview, validación por tabla destino). Construir solo
  cuando haya una tabla concreta que Freddy mantenga.
- **Colores** — usar los colores **por-entidad ya en DB** (`departamentos.color`,
  `areas.color`, `usuarios.color`) y dejar las **paletas fijas** (`COLORES_AVATAR`,
  `ESTADO_COLORS`) en código (son design tokens, no datos de negocio). No se crea "tabla de
  colores".
- **Datos derivables por código** (en otros archivos, no `permissions.ts`) — `MESES_Q`,
  `mesATrimestre` y los `Q1..Q4` de `TRIMESTRES` (en `shared/constants/domain.ts`) son
  función pura del índice de mes (`Math.floor(i/3)`); se pueden calcular en vez de hardcodear.
  Cleanup chico, su propio ticket (no toca esta feature).
- **Permisos finos intra-módulo** (read/write por sub-sección) — no pedido.
