# Roles dinámicos (control de acceso configurable por el admin) — Diseño

**Fecha:** 2026-06-23
**Estado:** En diseño — pendiente de aprobación para pasar a plan de implementación
**Autor:** EminatMKT (con asistencia)
**Rama:** `feature/dynamic-roles` (sacada de `development`)

## Contexto y problema

Hoy los roles y su acceso a módulos están **hardcodeados en código** en
`shared/auth/permissions.ts`: un type `Role` (unión de 7 strings), un array `ROLES`,
una matriz `PERMISSIONS` (rol→módulos) y `ROLE_LABELS`. Para crear un tipo de rol nuevo
o cambiar qué módulos ve un rol hay que editar código y desplegar.

El admin (Freddy) necesita poder **crear tipos de rol y asignarles módulos desde
/admin**, sin pasar por un desarrollador. Según el rol, el usuario ve un set limitado de
opciones tanto en el menú (sidebar/launchpad) como en el gate de `AccessDenied` si conoce
la ruta de un módulo al que no tiene acceso.

Esta es la ruta más escalable: deja `permissions.ts` leyendo de la DB en vez de la matriz
fija. Era el "segundo ciclo" que el refactor by-feature
([2026-06-17-features-shared-refactor-design.md](2026-06-17-features-shared-refactor-design.md))
dejó anotado como fuera de alcance.

## Objetivos

- El admin **crea/edita tipos de rol** desde /admin y marca qué módulos ve cada uno.
- Menú (sidebar + launchpad) y `AccessDenied` reflejan los permisos desde la DB.
- **Reutilizar** el patrón existente de chips de rol (`RoleChip`/`RoleFilterBar`) y conectar
  los dropdowns de rol (Create/Edit user) a la lista dinámica en vez del array estático.
- **No romper** el uso actual de roles en la app durante la ventana de deploy.

## Alcance y decisiones tomadas

### Lo que se vuelve dato vs. lo que sigue en código

- **Roles → datos** (tabla `roles` + `role_modules`). El admin los gestiona.
- **Módulos → siguen en código.** Cada módulo es una ruta real (`app/(app)/<slug>`). El
  catálogo (`ModuleSlug`, `ALL_MODULES`, `MODULE_META`) se queda en `permissions.ts`.
  - *Por qué no "crear módulos" desde /admin:* un módulo necesita código (la pantalla). Un
    botón "crear módulo" solo registraría un nombre sin pantalla detrás → link roto. Agregar
    un módulo seguirá siendo programar la ruta, como hoy.

### Terminología: `admin` = superadmin (un solo tier)

`admin` y "superadmin" son **lo mismo** en este sistema: un único rol de acceso total.
"Superadmin" era el valor legacy (el CHECK viejo tenía `admin` **y** `superadmin` como valores
distintos); la migración colapsa `superadmin → admin`, así que **post-migración solo existe
`admin`**. Para evitar la ambigüedad "¿admin o superadmin?", se **unifica el vocabulario en
`admin`**: la constante de código pasa a `ADMIN_ROLE='admin'` y el derivado a `esAdmin`
(renombrando los actuales `SUPERADMIN_ROLE`/`esSuperAdmin` en `AppContext`, `loadAppData` y
`AdminModule`, archivos que esta feature igual modifica). No queda la palabra "superadmin" en
código ni en UI.

No se crean **dos niveles** de admin (p.ej. uno que gestione usuarios y otro que gestione
roles): no es expresable con permisos a nivel módulo (ambas cosas viven en el módulo `admin`).
Un segundo tier real requeriría permisos finos intra-módulo (ver *Fuera de alcance*).

### Modelo de rol

Una fila de `roles` tiene:

| Campo | Rol | Editable |
|---|---|---|
| `key` | ID interno (slug), p.ej. `stratix360`. **Autogenerada del `label`** (`slugify`+dedupe) al crear. Va en `usuarios.rol` y la referencia código/RLS. | **Fija** (autogenerada, no se edita) |
| `label` | Nombre visible y **único**, p.ej. "Stratix 360". Lo único que el admin escribe. | Sí |
| `is_system` | Protege roles del sistema (`admin` y el rol por defecto) de borrado. | No |
| módulos | Asignación en `role_modules`. | Sí |

- **El admin solo escribe el `label`; la `key` se autogenera** (`slugify(label)` +
  dedupe con sufijo si choca) al crear y queda **fija**. Así nadie maneja slugs a mano, y la
  `key` legible la usan código/RLS/`usuarios.rol` (portable dev/prod, sin uuids opacos).
- **Renombrar es trivial y seguro** porque se cambia el `label`, no la `key`. Cambiar la
  `key` rompería las referencias en cada usuario → la `key` queda fija (renombrar el label
  **no** la toca). Esto vale **también para `admin`**: el admin puede renombrar su label
  (p.ej. "Administrador" → "Admin"); la `key` `'admin'` (de la que depende el código vía
  `ADMIN_ROLE`) no se mueve.
- **Borrar definitivo** solo si **ningún usuario** tiene ese rol. Lo blinda la DB: la FK
  `usuarios.rol → roles.key` con `ON DELETE RESTRICT` rechaza borrar un rol en uso. **Para
  retirar un rol:** reasignar sus usuarios a otro rol y luego borrarlo (no hay soft-delete —
  ver decisión abajo).
- **Qué significa `is_system`:** "el sistema **depende** de este rol → no se puede borrar".
  Es puramente una **protección de borrado** (no congela módulos ni label). Hoy lo llevan
  dos roles, por dos dependencias distintas pero del mismo tipo:
  - `admin` → depende el **código/RLS/short-circuit** (la key `'admin'` está cableada).
  - `sin_asignar` → depende el **default de la columna** `usuarios.rol` (borrarlo rompería las
    altas nuevas: el default apuntaría a una key inexistente → falla la FK).
  Es un solo flag reutilizado, no dos mecanismos — "rol del que depende el sistema" describe
  bien a ambos. Lo único extra que se le bloquea **solo a `admin`** (editar módulos) viene del
  short-circuit, no de `is_system`.
- **`admin` es `is_system`**: no se puede borrar, y sus módulos no se editan (ve todo por
  short-circuit, ver abajo). **Sí** se le edita el `label`. Es el admin.
- **Guard del último admin:** no se puede quitar/degradar/borrar al **último** usuario con
  rol `admin` (chequeo server-side en la API de usuarios). Evita quedarse sin nadie que
  administre si un admin se cambia el rol o se borra. Crear otro admin = asignar
  el rol `admin` a otra persona desde el dropdown de usuario (sin flujo especial).
- **Módulos por defecto de un rol nuevo:** nace **vacío** (el admin marca lo que quiera).
  Un rol sin módulos = el usuario ve solo Home (empty state del launchpad) — es un estado
  válido, no un error.
- **Sin soft-delete (`activo`):** se evaluó un flag `activo` para "desactivar sin borrar" y se
  **descartó** (ver Decisiones tomadas). Un rol existe o no existe; retirar = reasignar + borrar.
- **Rol por defecto = `sin_asignar` (baseline "sin poderes").** Un alta nueva nace con este
  rol: **cero módulos** → ve solo Home (el launchpad vacío; Home no es un módulo, siempre se
  muestra) hasta que el admin le asigne su rol funcional. **Por qué no `stratix360`:** ese es
  el rol funcional de **Marketing** (da `stratix-mkt`+`directorio`); como default genérico
  haría que cualquier alta (médica, finanzas, etc.) naciera con acceso a Marketing. `sin_asignar`
  es neutro y le grita al admin "asigná un rol". Está protegido de borrado (`is_system=true`),
  porque es el default de la columna `usuarios.rol` (si se borrara, el default apuntaría a una
  key inexistente → falla la FK).
- **`stratix360`** pasa a ser un rol funcional normal (Marketing), **deja de ser default e
  `is_system`**. Los usuarios legacy `colaborador`/`pasante` **siguen mapeando a `stratix360`**
  (preservan su acceso actual de marketing); solo cambia el default de **altas nuevas**.
- **`label` es único** (constraint `UNIQUE` en `roles.label`): evita dos roles distintos con
  el mismo nombre visible (confuso en dropdowns/chips). La API valida y devuelve error claro
  ante duplicado.

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
`AppContext`. Si el admin cambia los módulos de un rol, los usuarios con ese rol **ya
logueados no ven el cambio hasta recargar** la app (paralelo al ceiling de ~1h por token del
Edge). Para el propio admin, **`RolesManager` refresca el contexto tras editar** (re-fetch
de `roles`+`role_modules`) para que la pantalla de gestión y su sidebar reflejen el cambio en
el acto. Para los demás usuarios, aplica al próximo load — aceptable para una herramienta
interna.

## Arquitectura

### 1. Esquema (migración `dynamic_roles`)

```
roles(key PK, label UNIQUE, is_system=false, created_at, updated_at)
role_modules(role_key FK→roles.key ON UPDATE CASCADE ON DELETE CASCADE,
             module_slug,            -- NO es FK: módulos son code-defined
             PK(role_key, module_slug))
```

- **Seed** `roles` (8 roles): los 7 funcionales desde la matriz `PERMISSIONS` actual + el
  baseline **`sin_asignar`** ("Sin asignar", **sin filas en `role_modules`** → cero módulos).
  `admin` y `sin_asignar` (el rol por defecto) → `is_system=true` (protegidos de borrado;
  ver Modelo de rol). `stratix360` queda como rol funcional normal (no is_system).
- `is_system` protege de **borrado** y hace la **key inmutable** — vale para `admin` y
  `sin_asignar`. **No** bloquea editar módulos: eso solo aplica a `admin` (por el short-circuit,
  sus módulos son irrelevantes). Un is_system no-admin (`sin_asignar`) **sí** permite editar
  sus módulos (aunque arranca sin ninguno).
- **Migración de legacy (orden load-bearing):** `UPDATE usuarios` mapeando
  `superadmin/coordinador→admin` y `colaborador/pasante→stratix360` **antes** de la FK
  (si no, la validación de la FK falla en filas legacy). Nota: los legacy van a `stratix360`
  (preservan acceso); el baseline `sin_asignar` solo afecta el **default de altas nuevas**.
- **Swap CHECK→FK:** cambiar default de `rol` a `sin_asignar`, `DROP CONSTRAINT
  usuarios_rol_check`, agregar `usuarios_rol_fkey` (guard idempotente con `pg_constraint`).
- **Reparar/reconciliar la RLS role-gated** (ver § Auditoría RLS). Dos helpers SQL (STABLE,
  SECURITY DEFINER), sin wrappers redundantes por módulo:
  - **`is_admin()`** = `EXISTS(usuarios u WHERE u.auth_id=auth.uid() AND u.rol='admin')`.
  - **`has_module(p_slug text)`** = `is_admin() OR EXISTS(usuarios u JOIN role_modules rm ON
    rm.role_key=u.rol WHERE u.auth_id=auth.uid() AND rm.module_slug=p_slug)` (compone `is_admin`).
  - **Admin-override** (acceso total del admin): las 4 políticas pasan a `USING (is_admin())`
    (1 función, no 4 copias inline del mismo predicado) y de paso se **renombran**
    `superadmin_*` → `admin_*` (termina de sacar "superadmin" del esquema; gratis porque igual
    se DROP/CREATE).
  - **Acceso a data por módulo:** las tablas de negocio se gateaban por rol fijo, lo que
    **divergiría** del matrix dinámico (otorgar un módulo no daría el dato). Las **7 políticas**
    `Acceso cobranzas *` / `Acceso research *` pasan a llamar `has_module('cobranzas')` /
    `has_module('research')` **directo**, y `colaborador_read` (actividades) → `has_module('stratix-mkt')`.
    Las funciones wrapper **`tiene_acceso_cobranzas/research` se ELIMINAN** (eran wrappers de un
    solo slug sobre `has_module`, mismo anti-patrón que el viejo `canAccess`). Así, asignar el
    módulo **sí** otorga el dato — end-to-end.
- **RLS de tablas nuevas:** `SELECT` para `authenticated` (la app carga la matriz con el
  cliente browser); escritura solo `service_role` (API de admin).
- **Trigger `prevent_rol_self_change`** (BEFORE UPDATE en `usuarios`): rechaza cambiar `rol`
  salvo desde `service_role` (ver § Seguridad). Protege la columna sin romper los writes de
  `online_at`/`ubicacion` del cliente.

### Normalización del esquema (evaluación)

El esquema nuevo cumple **BCNF** (y por ende 3NF/2NF/1NF). Chequeo formal:

- **1NF — valores atómicos, sin grupos repetidos.** La relación M:N rol↔módulos se modela con
  la **tabla puente `role_modules`** (una fila por par `(role_key, module_slug)`), **no** como
  una lista/CSV de módulos en una columna. Es la forma textbook-correcta; evita el clásico
  anti-patrón de 1NF. `roles` y `usuarios.rol` tienen columnas atómicas. ✓
- **2NF — sin dependencias parciales de parte de la clave.** `role_modules` es una tabla
  **all-key** (PK compuesta, sin atributos no-clave) → 2NF trivial. `roles` tiene PK simple
  (`key`). ✓
- **3NF — sin dependencias transitivas.** En `roles`, `label`/`is_system`/timestamps dependen
  **directo** de `key`. No hay atributo que dependa de otro no-clave. ✓
- **BCNF — todo determinante es clave candidata.** `roles` tiene dos claves candidatas (`key`
  y `label UNIQUE`); el resto de columnas no determina nada. `role_modules` es all-key. ✓

**Decisiones de modelado (conscientes, no violan FN):**

- **`usuarios.rol` usa clave natural (slug) como FK**, no surrogate `uuid`. Ambas opciones son
  válidas en el modelo relacional; se eligió el slug por portabilidad código/RLS (ver Modelo de
  rol). No afecta la normalización.
- **`role_modules.module_slug` NO es FK a una tabla `modules`** — los módulos son code-defined
  (un módulo = una ruta real; una tabla `modules` sería un catálogo que habría que mantener en
  sync con el código, y una fila sin ruta = link roto). El **dominio** de `module_slug` se
  valida en la capa app contra `ALL_MODULES` (catálogo cerrado en código). Es una decisión de
  **frontera código↔DB**, no una desnormalización: no introduce redundancia ni anomalías de
  actualización dentro del modelo relacional.
- **Sin redundancia con el código:** tras la feature, `PERMISSIONS`/`ROLE_LABELS` se **eliminan**
  del código (la matriz y los labels viven solo en la DB). El seed los copia **una vez**; no hay
  doble fuente de verdad en curso.

### 2. Capa de datos (`shared/data`)

- Nuevo `shared/data/roles.ts` (solo lectura): `listRoles()`, `listRoleModules()`.
- `tables.ts`: agregar `roles`, `roleModules`. `index.ts`: exportar `rolesRepo`.

### 3. Capa de app (`shared/auth/permissions.ts`)

- `Role = string` (cualquier key dinámica es válida).
- Nuevos: `RoleModuleMap = Record<string, ModuleSlug[]>`, `RoleRow`, constantes
  `ADMIN_ROLE='admin'` y `DEFAULT_ROLE='sin_asignar'`.
- **Un solo helper puro:** `getModulesForRole(map, role): ModuleSlug[]` (devuelve la lista
  tipada). La pertenencia se chequea con el método nativo `.includes(slug)` — **no** hay
  función `canAccess`: era un wrapper redundante sobre `array.includes()` (y `ModuleSlug` ya
  tipa el slug, así que un typo es error de compilación, no `false` silencioso).
  - **Short-circuit de admin** dentro de `getModulesForRole`: si `role===ADMIN_ROLE` → devuelve
    `ALL_MODULES` (ve todo, incl. módulos nuevos, sin mantenimiento). `null`/desconocido → `[]`.
- `normalizeRole`: mantener como bridge legacy, pero **pasar tal cual** cualquier key no
  legacy (antes devolvía `null` para keys desconocidas → rompería roles nuevos).
- Quitar `ROLES`, `PERMISSIONS`, `ROLE_LABELS` (ahora viven en DB). Conservar `MODULE_META`
  (catálogo, fuente única) y `moduleForPath`. **`ALL_MODULES` pasa a derivarse** de las keys de
  `MODULE_META` (`Object.keys(MODULE_META) as ModuleSlug[]`) — una lista menos a mantener a mano;
  agregar un módulo = una entrada en `MODULE_META`.
- **Limpieza menor in-scope:** `MODULE_PATH_PREFIX` es redundante — en los 8 casos es
  `'/' + slug`. Como ya reescribimos `permissions.ts`, se borra el mapa y `moduleForPath`
  computa el prefijo (`'/' + slug`). Cero cambio de comportamiento; un mapa menos que mantener
  al agregar módulos.

### 4. Carga en contexto

- `useAppData`: estado `roles: RoleRow[]` + `roleModuleMap: RoleModuleMap` + setters.
- `loadAppData`: tras el perfil, cargar `roles` + `role_modules` y construir el mapa.
  Si falla, mapa vacío → los gates niegan acceso (seguro).
- `AppContext`: deriva `modules` (= `getModulesForRole(map, role)`), `esAdmin = role===ADMIN_ROLE`,
  `cargo` (label desde `roles`). Expone `roles`, `roleModuleMap`, `modules`. Se quitan los
  booleanos `canCobranzas/canResearch/canMedical` (hardcodeaban 3 slugs en el contexto); cada
  módulo se auto-gatea localmente (ver Consumidores). Se quita el re-export estático `ROLES`.

### 5. Consumidores

- `AppShell`: sidebar **data-driven** — se define una config `SIDEBAR: { slug, icon, label, … }[]`
  y se filtra con `.filter(i => modules.includes(i.slug))`, en vez de un `if` con el slug
  repetido por módulo. El slug vive una vez por ítem, como dato tipado.
- **Auto-gate por módulo:** cada página de módulo se protege sola con
  `modules.includes('<su-slug>')` → `<AccessDenied>` (el slug es intrínseco a esa página).
  Reemplaza a `canCobranzas`/`canResearch`/`canMedical`: `CobranzasModule`+`useCobranzasData`
  (`'cobranzas'`), `ResearchModule` (`'research'`), `MedicalModule` (`'medical'`).
- `middleware.ts`: queda como gate de sesión (se quita el bloque de módulos muerto).
- Dropdowns de rol (`UserRow`, `CreateUserModal`, `EditUserModal`): desde `roles` del
  contexto (value=`key`, texto=`label`).
- `UserRow`: el rol de sistema (`admin`) muestra badge protegido en vez de dropdown; sin
  botones desactivar/eliminar (consistente con la protección de la API).
- `useUserActions.cambiarRol`: deja de escribir directo (`usuariosRepo.updateRol`) y **rutea
  por `/api/admin/update-user`** (ver § Seguridad), para que el cambio de rol pase por authz +
  guard del último admin.
- `RoleChip`/`RoleFilterBar`: chips desde `roles` con `label`.
- `create-user` route: default `DEFAULT_ROLE`; el label del email se trae de la tabla
  `roles` (reemplaza `ROLE_LABELS`).
- **`CLAUDE.md` (docs del proyecto):** actualizar la sección **"Roles de usuario"** (hoy lista
  `superadmin`/`colaborador`/`pasante`, que esta feature elimina) y la referencia a
  `lib/permissions.ts` (hoy `shared/auth/permissions.ts`, ya no matriz hardcodeada). Es parte
  del PR — documentación que miente es deuda.

### 6. UI de gestión (nuevo, dentro de /admin, solo admin)

- `RolesManager` + `CreateRoleModal`: listar roles, crear (**solo label** — la `key` la deriva
  el servidor), grid de checkboxes
  de módulos (`ALL_MODULES` + `MODULE_META[slug].name`), borrar (solo si no está en uso).
  Para el rol `admin` (is_system): label editable, pero key/borrado bloqueados y checkboxes
  de módulos deshabilitados (ve todo por short-circuit).
  - **Conteo de usuarios por rol:** el gestor muestra cuántos usuarios tiene cada rol (query
    `usuarios GROUP BY rol`) y **deshabilita el botón borrar** proactivamente cuando el conteo
    > 0 — en vez de dejar fallar el click contra la FK. El conteo guía la decisión de
    reasignar antes de borrar.
- Nuevas rutas `app/api/admin/roles/` (GET/POST y `[key]` PATCH/DELETE), `service_role`,
  con **authz explícita de admin** y **validación de cada `module_slug` contra
  `ALL_MODULES`**.
- **Reglas de `slugify(label)`:** minúsculas → **strip de diacríticos** (`Investigación` →
  `investigacion`, `Médico` → `medico`) → reemplazar todo lo no-`[a-z0-9]` por `_` y colapsar/
  trim (`Contabilidad / RRHH` → `contabilidad_rrhh`). Si el resultado queda **vacío** (label de
  puro símbolo/emoji) o no empieza con `[a-z]`, **fallback** a `rol_<n>`. Resultado debe matchear
  `^[a-z][a-z0-9_]*$`.
- **Validación al crear/editar** (server-side): el cliente manda solo `label`; el servidor
  deriva `key = slugify(label)`, **deduplica** con sufijo si choca, y rechaza si cae en una
  **reservada** (`{ admin, todos }` — `admin` es el rol de
  acceso total del sistema y `todos` el centinela del filtro en `RoleFilterBar`). `label` **único** (error claro ante
  duplicado). La `key` es inmutable tras crear; PATCH solo toca `label`/módulos.

### 7. Seguridad: prevención de escalada de privilegios

Con roles dinámicos, **`usuarios.rol` es un vector de privilegio**: quien pueda escribirlo se
puede hacer `admin`. Hay que blindar las tres puertas:

1. **Toda escritura de `usuarios.rol` pasa por el servidor.** Hoy `cambiarRol` (dropdown inline
   de `UserRow`) escribe **directo** con el cliente browser (`usuariosRepo.updateRol`),
   salteando cualquier guard. Se **rutea por `/api/admin/update-user`** (como ya hace
   `toggleActivo`), para que apliquen authz + guard del último admin + (futuro) audit.
2. **Authz server-side en las rutas admin.** Helper `requireAdmin(req)` que lee la sesión
   del que llama y verifica `rol===ADMIN_ROLE` **en la DB** (no confiar en el gating del
   cliente). Lo usan TODAS las rutas admin que mutan usuarios o roles
   (`create/update/delete-user`, `reassign-and-delete`, `roles/*`). Hoy esas rutas no lo
   verifican — es un hueco preexistente que esta feature **debe** cerrar porque ahora el rol
   define privilegios. El cliente service_role se obtiene de un factory compartido
   **`shared/db/supabaseAdmin()`** (las rutas nuevas lo usan en vez de repetir el
   `createClient(...service_role...)` inline — mismo principio anti-duplicación).
3. **La columna `rol` no se puede escribir desde el cliente.** Ojo: no alcanza con "cortar el
   UPDATE del cliente a `usuarios`", porque hay writes legítimos del browser que **deben
   seguir** — el heartbeat (`touchOnline` → `online_at`) y `updateUbicacion`. Hace falta
   protección **a nivel columna**, que RLS de Postgres no hace fácil. Solución: un **trigger**
   `prevent_rol_self_change` (BEFORE UPDATE en `usuarios`) que **rechace si `NEW.rol <> OLD.rol`
   y el rol de ejecución no es `service_role`**. Así el cliente puede tocar `online_at`/
   `ubicacion` pero nunca `rol`; la única vía para cambiar `rol` es la API admin con
   service_role (que ya pasa por `requireAdmin` + guard del último admin). El trigger va en la
   migración.

**Race del guard del último admin (TOCTOU):** dos requests degradando a dos admins distintos
cuando hay 2 podrían pasar ambos el chequeo "hay más de 1 admin" y dejar 0. El chequeo +
update se hacen en una **transacción** (RPC Postgres `SELECT ... FOR UPDATE` o constraint), no
en dos pasos read-then-write del lado app.

## Módulos ↔ DB (conexión y qué pasa si cambia uno)

Regla: **el código es la fuente de verdad de qué módulos EXISTEN** (`ALL_MODULES`); la **DB
solo guarda las ASIGNACIONES** (`role_modules`). `module_slug` es texto, NO FK (los módulos
no son filas). La API que escribe asignaciones valida cada `module_slug` contra `ALL_MODULES`
→ imposible asignar un módulo fantasma.

- **Agregar un módulo** (p.ej. `finanzas`): (1) en código sumar el slug a `ModuleSlug` +
  `ALL_MODULES` + `MODULE_META` (el prefijo de ruta lo deriva `moduleForPath`) y crear
  `app/(app)/<slug>/page.tsx`;
  (2) el gestor de roles lo muestra **automáticamente** como checkbox; (3) ningún rol lo ve
  hasta que el admin lo marque — salvo `admin`, que lo ve el día 1 por el short-circuit.
- **Quitar un módulo del código**: `ALL_MODULES` se achica; quedan filas huérfanas en
  `role_modules` que son **inofensivas** (AppShell solo renderiza slugs conocidos). Opcional:
  `DELETE FROM role_modules WHERE module_slug NOT IN (...)` en la misma migración que lo quita.

> Nota de namespaces: el **slug de módulo** `'admin'` (la ruta `/admin`) y la **key de rol**
> `'admin'` (el rol de acceso total) son el mismo string en **namespaces distintos** — coincidencia, no
> acoplamiento. El rol `admin` casualmente tiene el módulo `admin`, pero no hay relación forzada.

## Auditoría RLS role-gated

Inventario de **todas** las políticas RLS que dependen del rol, y qué se hace con cada una:

| Tabla(s) | Política / función | Hoy | Acción |
|---|---|---|---|
| `cobranzas_cuentas/depositos/ventas` | `Acceso cobranzas *` (vía `tiene_acceso_cobranzas()`) | `rol='admin'` | política → `has_module('cobranzas')` directo; **borrar** `tiene_acceso_cobranzas()` |
| `research_activities/campaigns/leads/recipients` | `Acceso research *` (vía `tiene_acceso_research()`) | `rol IN('admin','superadmin','coordinador')` | política → `has_module('research')` directo; **borrar** `tiene_acceso_research()` |
| `actividades` | `colaborador_read` | `rol IN('colaborador','coordinador','pasante')` | → `has_module('stratix-mkt')` |
| `actividades`, `solicitudes` | `superadmin_all` | `rol='superadmin'` (inline) | → `is_admin()`; renombrar a `admin_all` |
| `marcaciones` | `superadmin_all_marcaciones` | `rol IN('superadmin','coordinador')` (inline) | → `is_admin()`; renombrar a `admin_all_marcaciones` |
| `usuarios` | `superadmin_all_users` | `rol='superadmin'` (inline) | → `is_admin()`; renombrar a `admin_all_users` |
| `usuarios` | `usuario_own_profile`, `Lectura autenticada/pública` | own / SELECT | sin cambio (no role-gated) + trigger `prevent_rol_self_change` |
| `marcaciones` | `usuario_own_marcaciones` | own (`auth_id`) | sin cambio (no role-gated) |

Dos patrones, **dos helpers, cero wrappers por módulo**: **override de admin** (`is_admin()`, una
función para las 4 políticas) y **acceso por módulo** (`has_module(slug)` llamado directo por las
políticas). Las funciones `tiene_acceso_cobranzas/research` se **eliminan** (eran el mismo
anti-patrón que `canAccess`: un wrapper por slug). Las `own_*`/lectura no dependen del rol y no se
tocan (salvo el trigger de `usuarios`). No quedan políticas role-gated sin reconciliar.

## Manejo de errores

- Carga de roles falla → mapa vacío, gates niegan (fail-safe), la app no crashea.
- API de roles valida slugs contra el catálogo y rechaza tocar `is_system`.
- Borrado de rol en uso → lo rechaza la FK (`ON DELETE RESTRICT`); la API devuelve error claro.
- **Invariante anti-lockout (admin nunca se auto-bloquea):** `esAdmin` se deriva de
  `normalizeRole(usuario.rol)` (string del perfil, **no** del mapa) y `getModulesForRole` hace
  short-circuit para admin (→ `ALL_MODULES`). Por eso, **aunque la carga de `roles`/`role_modules`
  falle** (mapa
  vacío), el admin **sigue viendo todo** y puede entrar a `RolesManager` a arreglar. El
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

**Reversa (forward-only):** la migración **no** trae down-script (las migraciones Supabase son
forward-only). Como toca `usuarios` (drop CHECK, add FK, UPDATE de datos), el plan B ante
falla en prod es **manual**: `DROP CONSTRAINT usuarios_rol_fkey`, recrear el CHECK previo, y
(si hace falta) `DROP TABLE role_modules, roles`. Los `UPDATE` de legacy (superadmin→admin,
etc.) **no son reversibles** por dato (se pierde el valor original) — por eso conviene verificar
en dev antes de prod. Mitigación: backup/snapshot del proyecto Supabase antes del `db push` a prod.

## Testing

- **vitest:** `shared/auth/permissions.test.ts` para `getModulesForRole` sobre un mapa de
  prueba (rol desconocido → `[]`, null → `[]`) + `moduleForPath` (incl. que computa `'/'+slug`
  tras borrar `MODULE_PATH_PREFIX`). Casos de las reglas nuevas:
  - **Short-circuit de admin:** `getModulesForRole(map, 'admin')` → `ALL_MODULES` aun con mapa
    vacío (de ahí, `modules.includes(x)` es `true` para cualquier `x`).
  - **Validación de key** (helper puro): rechaza formato inválido, duplicados y reservadas
    (`admin`, `todos`).
  - **`validateModuleSlugs`** (extraído de la API): rechaza slugs fuera de `ALL_MODULES`.
  - **Guard del último admin** (helper puro `isLastAdmin`/equivalente): dada una lista de
    usuarios, rechaza degradar/borrar si quedaría 0 con rol `admin`.
  `features/admin/index.test.ts` sigue verde.
- **Manual E2E en dev:** admin ve todo; crear rol "soporte" solo con `directorio`, asignar a
  un usuario test → ve solo Directorio; agregar módulo → acceso al refrescar; `admin`
  no borrable; un alta nueva sin rol especificado → cae en `sin_asignar` → ve solo Home
  (launchpad vacío); `SELECT DISTINCT rol` muestra solo keys nuevas.
- **RLS↔módulos (el fix de esta pasada):** dar el módulo `cobranzas` a un rol no-admin y
  asignarlo a un usuario test → **ve filas** de `cobranzas_*` (antes la RLS admin-only las
  negaba); quitar el módulo → deja de verlas. Idem `research` y `actividades` (`stratix-mkt`).
  Verifica que `has_module()` está bien cableado en las políticas.

## Decisiones tomadas (que estuvieron pendientes)

- **Soft-delete (`activo`) — descartado.** Se evaluó un flag `activo` para "desactivar un rol
  sin borrarlo". Tres semánticas posibles: (B) ocultar del dropdown pero conservar acceso
  (confuso — "desactivar" no apaga nada), (C) suspender acceso (un rol inactivo no otorga
  módulos), (A) no tener el flag. **Elegido: A.** Retirar roles es raro en una org chica; sin
  `activo` el modelo es más simple (un rol existe o no existe) y se elimina la semántica
  confusa. Retirar un rol = reasignar sus usuarios y borrarlo (la FK `ON DELETE RESTRICT` ya lo
  blinda). Si más adelante hace falta un interruptor de suspensión, se agrega como la
  semántica (C).

- **Auditoría de cambios de permisos** — ✅ **Resuelto: ticket aparte, fuera de esta feature.**
  Esta feature **no audita**. El trail de cambios de privilegios (quién crea/edita/borra un
  rol, quién cambia el rol de un usuario) se trata en un ticket propio, donde queda por definir
  el **modelado de storage** (reusar `historial` text a nivel campo / tabla nueva `audit_log`
  jsonb / migrar `historial` a jsonb) — la tabla `historial` ya existe pero la comparte el
  trigger de `actividades`. Ver `.todo` § "[Auth] Auditoría de cambios de permisos". Esto
  **desbloquea** el plan de implementación de roles.

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
- **Permisos finos intra-módulo** (read/write por sub-sección) — no pedido. Acá viviría
  también un **segundo tier de admin** (p.ej. un "gestor de usuarios" que no toca roles): hoy
  imposible porque gestionar usuarios y roles comparten el módulo `admin`.
