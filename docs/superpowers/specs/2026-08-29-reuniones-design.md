# Módulo Reuniones — diseño

**Fecha:** 2026-08-29 (segunda versión, tras la revisión adversarial)
**Origen:** reunión de development del 28/08/2026 (Freddy, Wagner, Angie) + el spec
`STX-SPEC-2026-OMH-001_Operations_Management_Hub` redactado por Freddy.
**Estado:** revisado. Sin implementar.

**Historia — dos vueltas, no una:**

1. El **28/08** se diseñó un *Módulo Operaciones* que sacaba la gestión de tareas de Stratix 360 y
   hacía que los temas de reunión FUERAN filas de `actividades`. Freddy lo vetó: *"reuniones es
   aparte, que no se conecten con actividades por el momento"*.
2. El **29/08** se reescribió como módulo autocontenido y se lo sometió a la revisión adversarial
   que pedía su §9.1 — cinco agentes, ángulos disjuntos. **El resultado fue que no estaba listo.**
   Esta versión es la que responde a esos hallazgos.

El informe completo está en `2026-08-29-reuniones-revision-adversarial.md`. Se conserva a
propósito: es el registro de qué se revisó y qué se decidió, no un borrador.

**El diseño del 28/08 se recupera así** —`git log --follow` NO lo encuentra, porque el cambio fue
tan grande que git lo registró como borrado + creación en vez de rename:

```bash
git show 688cd97:docs/superpowers/specs/2026-08-28-operaciones-design.md
```

> ⚠️ **Un hallazgo de esa revisión no era de este módulo y ya se resolvió.** `actividades`,
> `usuarios`, `historial` y `notificaciones` corrían en producción sin RLS. Apareció porque este
> documento afirmaba —tres veces— que `actividades` estaba gateada por `has_module('stratix-mkt')`
> y un agente fue a verificarlo. Cerrado el 29/08 (PR #57). Lo que queda de eso acá es la
> desconfianza: **ninguna afirmación sobre la base entra a este documento sin haberse consultado.**

---

## 1. Qué se construye

Un módulo **Reuniones** (`/reuniones`, slug `reuniones`) **autocontenido en su dominio**: registra
el expediente de una reunión y emite el acta. No lee ni escribe `actividades`, ni toca su RLS, ni
Stratix 360.

| Sección del expediente | Qué es |
|---|---|
| **Datos generales** | Empresa, título, tipo, fecha, hora, lugar, modalidad |
| **Participantes** | Internos (de `usuarios`) y externos (invitados sin cuenta), con su rol y su asistencia |
| **Temas tratados** | Qué se trató: título y descripción. Sin dueño ni fecha — un tema no se completa |
| **Pendientes** | Lo que sale de cada tema: título, responsable, fecha, estado. Es la lista con casillas que Freddy llamó "checklist" |
| **Heredados** | Los pendientes abiertos de reuniones anteriores de la misma empresa |
| **Cierre** | Conclusiones, próxima fecha, y el acta imprimible |

### 1.1 Lo que este módulo SÍ toca de lo que ya existe

La versión anterior decía *"no toca nada"*. Era falso y la revisión lo marcó. La lista real:

| Archivo / objeto | Por qué | Fase |
|---|---|---|
| `src/shared/auth/permissions.ts` | `MODULE_META` es de donde salen `ModuleSlug`, el launchpad y las casillas de `/admin` → Roles. **Sin esto el módulo no existe para la app** | 0 |
| `src/shared/components/shell/appShellConfig.ts` | `NAV` y `AUTO_TITLE`: el ítem del rail y el título del topbar | 1 |
| `src/shared/i18n/locales/es.json` · `en.json` | Todas las claves del módulo | 1–3 |
| `CLAUDE.md` | Tabla "Módulos de negocio" y el árbol de `src/features/` (`rules/proceso.md` lo exige en el mismo commit) | 1 |
| `role_modules` | Una fila con el slug (§4.1) | 1 |
| `admin_reassign_and_delete` (función de Postgres) | Limpia una lista **hardcodeada** de tablas antes de borrar un usuario. Sin agregar las del módulo, **un usuario que presidió una reunión queda imborrable** | 1 |
| `src/features/admin/org-catalogs.ts` | `blockedBy` de `empresas` es otra lista a mano. Sin actualizarla, el panel diría que una empresa con 40 reuniones "no está en uso" y el `DELETE` explotaría | 1 |
| `features/stratix-mkt/utils/report-html/` | Se le extrae el armazón a `src/shared/utils/hoja-imprimible/` (§2.9) | 3 |

**Lo que sigue siendo cierto:** no toca `actividades`, ni su RLS, ni el dominio de Stratix. La
reversibilidad es menor a lo que se dijo antes: después de la fase 3, un `DROP` de las cuatro
tablas no deshace la extracción de `hoja-imprimible` ni la fila de `role_modules`.

---

## 2. Decisiones, y contra qué se decidieron

Una decisión sin motivo se revierte sola dentro de tres meses.

### 2.1 Temas y pendientes son tablas propias; el módulo no se conecta con `actividades`

**Invierte la decisión del diseño del 28/08, por pedido explícito de Freddy.**

Lo que se trata vive en `reunion_temas`; lo que alguien se compromete a hacer, en
`reunion_pendientes` (§3.5 y §3.6). Ninguna es fila de `actividades`, ninguna lleva FK a
`actividades`, y `actividades` no gana ninguna columna.

**Lo que cuesta, y es más de lo que decía la versión anterior:**

1. Una tarea nacida en una reunión vive en otro lugar que las de Stratix. Quien tenga los dos
   módulos busca "mis pendientes" en dos pantallas.
2. **Y en las fases 1–3 ni siquiera hay una pantalla de "mis pendientes":** la lista vive dentro de
   cada acta. Para saber qué debe, hay que abrir las actas de a una. Wagner pidió ese filtro en la
   reunión (*"faltaría poner filtros para que cada uno solo vean las tareas que se le han
   asignado"*). No entra en estas fases y hay que decirlo.
3. **Las horas y el pago.** `actividades.horas` alimenta el reporte de pago. Un pendiente de
   reunión no tiene horas y no aparece ahí: el trabajo que nace en una reunión se carga dos veces
   o no se paga.
4. **Las notificaciones no caben sin tocar una tabla existente.** `notificaciones` sólo enlaza por
   `actividad_id` y `solicitud_id`. Un pendiente de reunión produciría una notificación **muerta**
   (sin enlace) o exige `notificaciones.reunion_pendiente_id`. Ver §2.12.
5. El checklist deja de servir para el resto del sistema (§3.6).

Los cinco están aceptados. El primero era el único declarado antes.

**Cómo se conecta el día que se quiera:** `actividades.reunion_pendiente_id` (FK nullable,
`ON DELETE SET NULL`) más un botón "promover a tarea". **No se agrega hoy ninguna columna
preparatoria:** una columna nullable que nadie escribe es peor que no tenerla.

⚠️ **Y eso no es gratis del todo:** promover deja la fila en `reunion_pendientes` **y** crea la de
`actividades`, cada una con su estado. Es el patrón de dos filas para lo mismo que §3.7 rechaza
para los heredados. Cuando se haga, hay que decidir cuál manda — probablemente que promover
**cierre** el pendiente y deje el enlace.

### 2.2 `asignado` no es un estado, y los valores son los que el repo ya usa

El spec propone `nuevo · asignado · en_proceso · validacion · finalizado`. Pero `asignado` no
describe una etapa: describe si hay responsable. Es un **filtro derivado**
(`responsable_id IS NULL`).

`reunion_pendientes.estado` usa los cuatro valores canónicos de `ESTADO`
(`src/shared/constants/domain.ts`): `Pendiente · En proceso · Por aprobar · Completado`.

| Spec | Acá |
|---|---|
| `nuevo` + `asignado` | `Pendiente`, con "sin responsable" como filtro |
| `en_proceso` | `En proceso` |
| `validacion` | `Por aprobar` |
| `finalizado` | `Completado` |

**Por qué los mismos valores si las tablas están desconectadas:** un tercer vocabulario para
"estado de algo que alguien tiene que hacer" es deuda gratis, y el día que se promueva un pendiente
a tarea el mapeo es la identidad.

**Falta un quinto valor y hay que decidirlo, no ignorarlo.** Freddy dijo dos veces *"postergado"*
en la reunión, y es justo el estado que expresa el arrastre. Con los cuatro actuales, un pendiente
postergado es indistinguible de uno "En proceso". Contra: agregarlo rompe la identidad del mapeo
con `ESTADO`. **Se decide al empezar la fase 2**, junto con §8.1.

⚠️ **Hallazgo verificado:** `actividades.estado` tiene un `CHECK` con **seis** valores
(`20260612193730_remote_schema.sql:368` — incluye `Rechazado` y `Cancelado`) mientras `ESTADO` en
TypeScript declara **cuatro**. Las dos mitades del catálogo no listan lo mismo, que es lo que
`rules/base-de-datos.md` prohíbe. No es de este módulo; está en `.todo`. Nota irónica: los dos
valores que sobran allá son parientes del que falta acá.

### 2.3 El arrastre con historial queda fuera — pero `fecha_original` entra desde el día uno

El spec monta toda su maquinaria sobre la **prórroga registrada**: `original_due` inmutable,
`due_date` vigente, contador de `extensions`, marca de último plazo, y una tabla `topic_reviews`
con una fila por cada retoma.

**La maquinaria queda afuera. La fecha original NO.** Y la diferencia entre las dos cosas es la
única asimetría que importa en todo este documento:

| | Conectar con `actividades` (§2.1) | Guardar el plazo original |
|---|---|---|
| Si se difiere | Se agrega una FK y se llena hacia adelante. El pasado no importa | **Cada edición de `fecha_comprometida` destruye un dato que ninguna migración puede reconstruir** |
| Costo de tenerlo hoy | Una columna nullable que nadie escribe — peor que no tenerla | Una columna `date` que **siempre** se llena |

La versión anterior aplicó el argumento de §2.1 —*"no cuesta nada esperar"*— también acá, por
inercia. Es falso: acá esperar cuesta el dato. Decidido el 29/08: **`reunion_pendientes` nace con
`fecha_original`** (§3.6).

Con eso, sin ninguna tabla extra, se puede decir *"prometido para el 5, hoy va por el 19"*. Lo que
sigue faltando —y es lo que `topic_reviews` daría— es el **porqué** de cada movida y cuántas veces
se movió.

Lo que **sí** se conserva de la idea del spec: **cerrar un acta no cierra sus pendientes**. Un
pendiente abierto reaparece en la reunión siguiente de su empresa (§3.7).

### 2.4 El "último plazo" y el tier Dirección quedan fuera

El spec presenta el último plazo como su freno central: declarado, moverlo exige rol de Dirección.
Eso pide un nivel de mando que la app no tiene — hoy el único tier de control es `admin`, y serlo
implica poder crear, borrar y editar usuarios.

Se evaluó `roles.es_direccion` (una casilla en `/admin` → Roles). **Queda fuera junto con las
prórrogas registradas**: sin ellas no hay último plazo que declarar. Si vuelve el arrastre, vuelve
esta decisión con él.

### 2.5 Se reusan `empresas` y `usuarios`; no hay catálogos nuevos

- **`companies` → `empresas`.** Ya existe, con `codigo` como clave natural, administrada desde
  `/admin` → Organización. Las siglas del spec (EMG, STX, ODM…) no coinciden con las del repo
  (EMINAT, STRATIX, ONDARA, DACOACH…): **se usan las del repo**. El propio spec marca "catálogo
  duplicado" como su riesgo alto.
- **`app_users` → `usuarios`.** Ya es el espejo de `auth.users` (columna `auth_id`).

⚠️ **Corrección a la versión anterior:** decía que *"el trigger de alta automática que pide el spec
ya está resuelto"*. **Es falso** — verificado: no hay ningún trigger sobre `auth.users`. El alta la
hace `/api/admin/create-user` con `service_role`. El caso queda cubierto por otra vía, pero no por
la que se afirmaba.

**Reusar catálogos no es conectarse.** Lo que Freddy vetó es que el módulo escriba en las tablas de
trabajo de otro módulo. `empresas` y `usuarios` son la organización, no el dominio de nadie — los
seis módulos existentes las leen. *(Es una lectura del veto, no una cita: hay que confirmarla con
él, §8.5.)*

### 2.6 Módulo asignado, no acceso universal — y el spec pedía otra cosa

El spec (y Freddy en la reunión: *"ese módulo va a estar abierto para todos"*) pide que cualquier
autenticado entre. Acá el acceso se gatea con `role_modules` + `has_module(slug)`, y el rol
`sin_asignar` tiene cero módulos por diseño.

**Se mantiene el modelo del repo, y hay que decir qué se pierde:** el criterio de aceptación CA-12
del spec —*"entrar con un usuario recién creado → accede sin configuración previa"*— **no se
cumple**. Cada alta nueva necesita que el admin le reparta el slug.

La versión anterior decía que asignarlo *"es gratis — que es justo lo que pedía Freddy"*. No se
sigue: "barato de asignar" no es "abierto para todos".

### 2.7 El alcance de lectura se implementa; `access_denylist` no se construye

**Esta sección se reescribió entera: la anterior descartaba las exclusiones citando una pertenencia
que §4 no construía.** El resultado era que cualquiera con el slug leería todas las actas del
grupo — y el acta de la reunión que originó este spec contiene sueldos, días adeudados y una
evaluación de desempeño.

Lo que se construye (§4.2): **la lectura de una reunión requiere `has_module('reuniones')` Y
(ser admin, O participar en ella, O pertenecer a su empresa).** `usuarios.empresa_id` ya existe.

Es lo que Angie describió en la reunión: *"que sea como una especie de drive: que tú seas el dueño,
el host de la reunión, o que lo hayan compartido contigo"*.

Lo que **no** se construye es `access_denylist` —exclusiones explícitas que prevalecen sobre
cualquier permiso—. Sin una lista de pertenencia multi-empresa (`user_companies`, §2.11), una lista
de exclusiones no tiene sobre qué restar. Se agrega el día que exista el caso.

### 2.8 Sin Server Actions: se sigue el patrón del repo

El spec especifica Server Actions con Zod en el borde. **Este repo no tiene ni una.** Escribe por
`src/shared/data/*` bajo RLS y usa rutas API con `requireAdmin()` / `requireModule()` sólo donde
hace falta `service_role`.

Un segundo modelo de escritura para un solo módulo es costo permanente a cambio de nada.

**Consecuencia que hay que resolver, no ignorar:** supabase-js **no tiene transacciones
multi-sentencia**. El cierre del acta (armar el snapshot + marcar cerrada) son dos operaciones, y
si la segunda falla queda una reunión `cerrada` con `acta_snapshot` NULL — o sea un acta en blanco
que sólo un admin puede reabrir. Se resuelve con una **RPC de Postgres** (`cerrar_reunion(id)`) que
hace las dos cosas en una transacción, más el `CHECK` de §3.1. Una RPC no es una Server Action: es
una función de la base, invocada por el cliente bajo RLS.

### 2.9 El acta sale como HTML imprimible; el `.docx` es fase posterior

El spec pide Word con la librería `docx` y PDF con Puppeteer. Puppeteer en Vercel arrastra un
Chromium de decenas de megas y cold starts largos. Se hace HTML con `@media print` — el navegador
hace el PDF.

**Se reusa el armazón del reporte de pago, y es menos de lo que decía la versión anterior.**
Verificado sobre `features/stratix-mkt/utils/report-html/index.ts` (100 líneas):

- El **escapado ya está compartido**: `escapeHtml` vive en `src/shared/utils/html.ts` con su test y
  `report-html` la importa del barrel. Era una de las "dos partes difíciles" que se usaban para
  justificar la extracción, y ya estaba resuelta.
- Lo realmente compartible es el `<!DOCTYPE>` + `<head>` + estilos base + el botón `.no-print`:
  **unas 15 líneas**.
- **El pie NO es compartible**: dice *Freddy Crespín · Marketing Coordinator · Stratix Solutions*.
  Subirlo a `src/shared/` metería dominio de Stratix en compartido, que es lo que
  `rules/arquitectura.md` prohíbe. Se parametriza o se queda en Stratix.

⚠️ **Y hay que tocar una exención firmada.** `report-html/index.ts` lleva
`// centinela-exime: archivo-extenso@2 — es UNA plantilla HTML. Partirla dejaría el <head> en un
archivo y el <body> en otro`. §2.9 es literalmente esa partición. Al hacerlo hay que **reescribir
esa razón o borrar la marca y su fila de `rules/EXENCIONES.md`**. Va en la fase 3.

### 2.10 `reunion_pendientes` se parece a `actividades`, y por eso se congela

`reunion_pendientes` tiene título, responsable, fecha y estado — **es `actividades` otra vez**. Es
el argumento con el que el diseño del 28/08 se negaba a crear la tabla.

**El veredicto y el argumento que lo sostiene.** La tabla aparte es correcta, pero **no** por la
forma de las columnas: por la RLS. `actividades` está gateada por `has_module('stratix-mkt')`
(verificado: policy `colaborador_read`, y desde el 29/08 con RLS efectivamente encendida). Meter
los puntos de acta ahí deja dos salidas y las dos son peores:

| Salida | Qué cuesta |
|---|---|
| Mover `actividades` a un slug nuevo | El refactor completo del diseño del 28/08: sacar el módulo de tareas de Stratix y migrar la RLS de la tabla con la que se trabaja todos los días |
| Policy `has_module('stratix-mkt') OR has_module('reuniones')` | **Cualquiera con el módulo de reuniones vería todas las tareas de marketing** |

Hay una tercera que la versión anterior no nombró: una policy con **predicado por fila**
(`… OR (reunion_pendiente_id IS NOT NULL AND has_module('reuniones'))`). No se elige porque exige
una columna en `actividades`, que es exactamente lo que el veto de Freddy prohíbe — pero se
descarta por eso, no por inexistente.

**El conteo, corregido.** `actividades` tiene 20 columnas de negocio y se parten en **tres** grupos,
no dos:

| Grupo | Columnas | |
|---|---|---|
| **Núcleo** — se repite | `titulo · descripcion · responsable_id · fecha_requerida · fecha_entrega · estado` | 6 |
| **Derivadas o muertas** | `mes · trimestre · semana` (salen de la fecha) · `sheet_row` (resto del Google Sheet) | 4 |
| **Marketing de verdad** | `empresa · horas · dias_produccion · verificado · aprobado_por_id · fecha_aprobacion · notas_jefe · drive_url · bloqueada · solicitante_id` | 10 |

La comparación honesta es **6 contra 10**. Dos correcciones respecto de versiones anteriores de
esta sección, las dos por medir en vez de suponer:

- La primera contaba "4 contra 16" metiendo las derivadas del lado de marketing — usando como
  argumento las columnas que este mismo documento quiere borrar (§8.6). Circular.
- La segunda puso `dias_produccion` entre las derivadas *"a confirmar contra `horas`"*. **Se
  confirmó y no lo es:** de 266 filas, `dias_produccion` está llena en 161 y `horas` en 81, y 65
  filas no cumplen `horas = dias × 8`. Son dos entradas independientes del formulario, se suman por
  separado en el reporte y `dias_produccion` fija el largo de la barra del Gantt.

**El problema de fondo no es esta tabla:** es que `actividades` es tres cosas a la vez —una tarea,
una planilla de producción y un circuito de aprobación— y nunca se partió. Eso es el proyecto
Operaciones, en `.todo`.

**La regla que impide que esto se pudra:**

> **`reunion_pendientes` no crece.** Sus columnas son las de §3.6 y no se le agregan más.

Si algún día pide `prioridad`, colaboradores N:N, adjuntos, comentarios o un Kanban propio, **eso no
es una columna nueva: es la señal de unificar con `actividades`**.

⚠️ **La versión anterior contradecía esta regla en cuatro lugares del mismo documento** — §8.1
agendaba `prioridad` como *"barata"*, §8.2 los colaboradores, y las fases 4 y 5 los adjuntos y el
arrastre. Eran párrafos heredados de cuando el destino era `actividades`, donde una columna sí era
barata. Corregido: §8 ya no los trata como preguntas abiertas rutinarias, y §6 dice que la fase 4
implica el refactor.

**`fecha_original` (§2.3) no viola la regla:** no es una columna que se agrega después bajo presión,
es parte de la forma inicial, decidida antes de escribir la primera línea. Esa es toda la
diferencia.

**Y la regla lleva su check**, como pide `rules/proceso.md`. Va en `rules/base-de-datos.md` en el
mismo commit que la migración de la fase 1:

```
<!-- check: block
     pattern: ALTER TABLE\s+(public\.)?reunion_pendientes\s+ADD COLUMN
     paths: supabase/migrations/
     files: .sql
     version: 1
-->
```

**El costo que la gente va a sentir:** "mis pendientes" en dos pantallas. Cuando moleste de verdad
—no antes— se resuelve con una función de lectura en `src/shared/data/` que hace los dos `SELECT` y
concatena. Sin FK, sin vista, sin tocar RLS: **unificar la lectura no es conectar las escrituras**.

### 2.11 Lo que Freddy pidió y NO se construye

Tres cosas del spec y de la reunión desaparecieron de la versión anterior sin quedar entre lo
descartado — que es peor que descartarlas, porque nadie podía discutirlas. **Decisión del 29/08: las
tres quedan fuera, y acá está el argumento de cada una.**

**a) Trabajo transversal — una acción, varias marcas.** El spec lo pone entre los cinco problemas a
resolver (`related_companies`, RN-12, RN-30, la columna *Empresas* del acta). Acá `reuniones.empresa`
es una sola marca.

*Se descarta porque* el modelo multi-empresa arrastra `user_companies`, el alcance por pertenencia
múltiple y un índice GIN — es un tercio del spec de Freddy y no hay ningún caso pedido con nombre.

*Lo que cuesta, y es real:* la reunión del 28/08 —Freddy, Wagner y Angie, tres marcas— no tiene una
empresa a la cual imputarse, así que se carga bajo la que la convocó. Y el bloque de heredados
filtra por empresa: si una acción compartida se anota en la reunión de EMC, no aparece en la de
STRATIX. **La salida barata cuando duela:** una tabla puente `reunion_empresas` sin tocar nada de lo
construido, porque `reuniones.empresa` seguiría siendo la principal.

**b) Pipeline (Kanban de pendientes).** Freddy lo pidió dos veces en la reunión, con esa palabra.

*Se descarta porque* un Kanban de pendientes de reunión es, por §2.10, la señal de que esto dejó de
ser una lista dentro de un acta y se volvió un gestor de tareas — y dos gestores de tareas no se
sostienen. Construirlo sería empezar Operaciones por el techo.

*Hay que decírselo así*, y no dejarlo como "condición de reversión futura": su disparador está
cumplido desde el día cero, y presentarlo como hipótesis es esconder la decisión.

**c) Panel ejecutivo.** Seis KPIs, cumplimiento por empresa y por responsable, vencidos y
arrastrados.

*Se descarta porque* con las fases 1–3 no hay volumen que medir: un tablero sobre tres actas no
dice nada. **Y hay que decir lo que se pierde: ninguna de las seis métricas con las que Freddy
definió el éxito del módulo es medible sin él.** Se reevalúa cuando haya un trimestre de actas
cargadas — y ahí es barato, porque `src/shared/components/dashboard/` se reusa sin arrastrar
dominio (`rules/arquitectura.md`).

**Además, sin sección propia pero dicho:** el **bloque de firmas** del acta (pedido en la reunión,
en el spec y en el prototipo) es markup sobre datos que §3.1 ya tiene — entra en la fase 3, es
gratis. El **`aprobador`** de cada pendiente y el campo **evidencia** salen impresos en el
prototipo y no existen acá: quedan fuera, anotados.

### 2.12 Las notificaciones no entran, y no es gratis

Es el pedido más repetido de Freddy en la reunión (*"tendría que llegar una notificación al correo:
te han asignado esta tarea"*). Queda fuera de las fases 1–3.

**Y hay un costo técnico que la versión anterior no vio:** `notificaciones` sólo enlaza por
`actividad_id` y `solicitud_id` (verificado). Un pendiente de reunión sólo puede producir una
notificación **muerta**, sin enlace clickeable, o exige `notificaciones.reunion_pendiente_id` — o
sea **una columna nueva en una tabla existente**, que contradice §3 (*"cero columnas agregadas"*).

Cuando se haga, esa columna es el precio y hay que aceptarlo entonces, no descubrirlo.

---

## 3. Modelo de datos

Cuatro tablas nuevas. **Cero columnas agregadas a tablas existentes** — con la excepción declarada
de §2.12 el día que haya notificaciones.

### 3.1 `reuniones`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `codigo` | text UNIQUE NOT NULL | `MTG-{empresa}-{AAAA}{MMDD}-{NNN}`, por trigger. Ver §3.10 |
| `empresa` | text NOT NULL, FK → `empresas.codigo` **ON UPDATE CASCADE** | El `codigo` de una empresa **es editable** desde `/admin` (`org-catalogs.ts:46`), y `actividades_empresa_fkey` ya usa cascade por eso |
| `titulo` | text NOT NULL | |
| `tipo` | `public.tipo_reunion` | DOMAIN, §3.9 |
| `lugar` | text | Sala o enlace |
| `modalidad` | `public.modalidad_reunion` NOT NULL | DOMAIN: presencial · virtual · hibrida |
| `fecha` | date NOT NULL | `localDate()`, nunca `toISOString()` |
| `hora_inicio` / `hora_fin` | time | CHECK `hora_fin >= hora_inicio` |
| `objetivo` | text | |
| `conclusiones` | text | |
| `proxima_fecha` | date | |
| `proxima_notas` | text | |
| `estado` | `public.estado_reunion` NOT NULL DEFAULT `'borrador'` | DOMAIN: borrador · en_curso · cerrada |
| `acta_snapshot` | jsonb | Se escribe al cerrar. §3.4 |
| `acta_snapshot_at` | timestamptz | Cuándo se congeló |
| `created_by` | uuid FK → `usuarios` **ON DELETE SET NULL** | |
| `created_at` / `updated_at` | timestamptz | |

```sql
CONSTRAINT acta_cerrada_tiene_snapshot
  CHECK (estado <> 'cerrada' OR acta_snapshot IS NOT NULL)
```

Ese `CHECK` es lo que impide un acta cerrada en blanco, y por eso el cierre va por RPC (§2.8).

**No lleva `preside_id` ni `secretario_id`.** La versión anterior los tenía **y además** tenía
`rol_en_reunion` en `reunion_participantes` con los valores `Preside · Secretario`: el mismo dato en
dos lugares, sin nada que los sincronice — justo lo que §3.5 condena. Y peor: §4 lee la
autorización de `reunion_participantes`, o sea de la copia. **Fuente única: `reunion_participantes`.**

**El `ON DELETE` de cada FK está declarado a propósito.** La versión anterior no especificaba
ninguno, o sea `NO ACTION`: dar de baja a alguien que creó una reunión habría hecho fallar
`admin_reassign_and_delete` con rollback completo, dejándolo **imborrable**.

### 3.2 `reunion_participantes`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reunion_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `usuario_id` | uuid FK → `usuarios` | NULL si es externo. **ON DELETE SET NULL** |
| `invitado_nombre` / `invitado_empresa` | text | Sólo externos |
| `invitado_email` | text | Sólo externos. §3.3 |
| `rol_en_reunion` | `public.rol_en_reunion` NOT NULL | DOMAIN: preside · secretario · participante · invitado |
| `asistencia` | `public.asistencia` NOT NULL DEFAULT `'presente'` | DOMAIN: presente · ausente · invitado |

```sql
CONSTRAINT participante_unico       UNIQUE (reunion_id, usuario_id),
CONSTRAINT interno_xor_externo      CHECK (
  (usuario_id IS NOT NULL AND invitado_nombre IS NULL) OR
  (usuario_id IS NULL     AND invitado_nombre IS NOT NULL)
)
```

Los dos faltaban. Sin el `UNIQUE`, nada impide anotar dos veces a la misma persona; sin el `CHECK`,
la invariante entera de §3.3 vive sólo en la UI.

**`invitado_email` entra ahora aunque el envío del acta sea de otra fase** (§2.12): agregarlo
después es una columna, pero las actas ya cerradas tendrían el snapshot congelado **sin** el correo,
y no habría de dónde recuperarlo.

### 3.3 Participantes externos

Un externo **no tiene cuenta y no entra al módulo**: el login está restringido a los dominios
corporativos. Se registra con `usuario_id` NULL más nombre, empresa y correo.

**Un externo no puede ser responsable de un pendiente.** `responsable_id` es FK a `usuarios`: si un
cliente tiene que hacer algo, el responsable es la persona interna que responde por eso. Es la
RN-10 del spec y es correcta.

⚠️ **Y hay un riesgo que abre el envío del acta, dicho ahora:** el acta es **un** documento sin
noción de ítem interno. El día que se mande por correo, la única opción es mandar todo — el cliente
de PREMIER recibiría el acta completa, con el pendiente interno *"revisar por qué le facturamos de
menos"* incluido. El snapshot ya la congela en esa forma indivisible. Cuando llegue esa fase, hace
falta un flag `interno` por pendiente, o dos actas.

### 3.4 La trazabilidad del acta: se congela el documento, no las columnas

El spec pide copiar `cargo` y `departamento` en `reunion_participantes`. El objetivo es correcto; el
mecanismo no funciona acá:

- **`cargo` es multivaluado.** `usuario_cargos` es N:N con PK compuesta (verificado). Copiarlo a un
  `text` aplasta una lista.
- **`departamento` no es una columna.** Se deriva: `usuario → equipo → departamento`.
  `20260805175453_estructura_equipos_cargos.sql` dropeó `usuarios.departamento_id` justamente por
  ser dato duplicado.

En su lugar, `acta_snapshot jsonb` (§3.1), escrito al cerrar.

| Momento | De dónde sale el acta |
|---|---|
| Borrador / en curso | En vivo, por joins |
| Cerrada | Del `acta_snapshot` |

**Qué congela, con precisión — porque la versión anterior se contradecía acá.** Decía *"temas con su
estado"*, y §3.5 dice que un tema no tiene estado. Y si se refería a los pendientes, chocaba con el
arrastre. **La regla:**

> El snapshot congela **lo que el acta dijo ese día**. Los pendientes siguen vivos después.

O sea: el snapshot guarda cada pendiente con el estado que tenía **al cerrar**, etiquetado como tal
(*"al cierre: En proceso"*). La fila de `reunion_pendientes` sigue moviéndose, y el bloque de
heredados (§3.7) lee la fila viva, no el snapshot. **No hay dos verdades: hay un documento
histórico y un estado actual, y el acta dice cuál es cuál.**

Eso es literalmente §2.3: *cerrar un acta no cierra sus pendientes*. Sin esta regla, cualquier
trigger de inmutabilidad rompería el arrastre.

**El color de marca no entra al snapshot:** es presentación, no contenido — si la marca cambia de
color, el acta vieja se repinta sin mentir.

**La forma del jsonb lleva versión adentro:** `{"v": 1, "reunion": {…}, "participantes": […],
"temas": […]}`. Es una columna que se escribe una vez y se lee durante años; el día que la forma
cambie, sin `v` no hay manera de distinguir las viejas de las nuevas. Su tipo TypeScript vive en
`src/features/reuniones/types.ts` y su armado lleva `.test.ts` (`rules/codigo.md`).

**Reabrir un acta** (§4.4, sólo admin): el snapshot **se conserva**, y al volver a cerrar **se
sobrescribe**. Lo que se pierde: un acta distribuida y luego corregida no deja traza de la versión
anterior. Se acepta a sabiendas; si algún día importa, es una tabla `reunion_actas` con una fila por
cierre. Anotado.

**Límite explícito:** el acta **no es el sistema de registro del historial de cargos**. Si eso hace
falta, se resuelve con `usuario_cargos` ganando `desde`/`hasta` — trabajo del módulo de
organización.

### 3.5 `reunion_temas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reunion_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `posicion` | int NOT NULL | Orden dentro del acta |
| `titulo` | text NOT NULL | |
| `descripcion` | text | Qué se dijo, qué se discutió |
| `created_at` / `updated_at` | timestamptz | |

**Un tema no tiene responsable, ni fecha, ni estado.** Es *"de esto se habló"*: no se completa ni
vence. Lo que tiene dueño y fecha es lo que sale del tema (§3.6).

Sin `empresa` propia: la hereda de su reunión. Una columna que siempre copia a su padre se
desincroniza sola.

### 3.6 `reunion_pendientes`

Lo que alguien se comprometió a hacer. Es **la lista de tareas del módulo**, paralela a
`actividades` y desconectada de ella por §2.1.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `tema_id` | uuid FK NOT NULL | ON DELETE CASCADE. La reunión y la empresa se derivan por acá |
| `posicion` | int NOT NULL | Orden dentro del tema |
| `titulo` | text NOT NULL | |
| `responsable_id` | uuid FK → `usuarios` **ON DELETE SET NULL** | NULL = sin asignar (§2.2) |
| `fecha_original` | date | **Se escribe al crear y no se toca nunca.** §2.3 |
| `fecha_comprometida` | date | La vigente. Se mueve |
| `estado` | `public.estado_pendiente` NOT NULL DEFAULT `'Pendiente'` | Los cuatro valores de `ESTADO` (§2.2) |
| `completado_por_id` | uuid FK → `usuarios` **ON DELETE SET NULL** | Se llena al pasar a `Completado`, se limpia al reabrir |
| `completado_at` | timestamptz | Idem |
| `created_at` / `updated_at` | timestamptz | |

`fecha_original` la escribe un trigger `BEFORE INSERT` (`NEW.fecha_original := NEW.fecha_comprometida`)
y otro `BEFORE UPDATE` la protege de cambios. Que sea el cliente quien la respete es exactamente lo
que no funciona: es un dato que sólo sirve si nadie puede tocarlo.

**Por qué el dueño y la fecha viven acá y no en el tema.** Un acta real dice: *"Tema 3: landing de
EMC. Angie hace el mockup para el 15/09; Freddy consigue los textos para el 05/09."* Un tema, dos
compromisos. Con el responsable en el tema habría que partir el tema en dos y el acta mentiría
sobre qué se trató.

**Y esto es lo que Freddy llamó "checklist".** Visualmente es eso —casillas debajo de cada tema—
pero cada una con dueño y fecha, que es lo que la hace reclamable en el arrastre.

`tema_id` es NOT NULL: todo pendiente salió de haber hablado de algo. Para anotar uno suelto se crea
antes su tema, aunque sea de una línea.

**El `CASCADE`, dicho:** borrar una reunión se lleva sus temas y sus pendientes. Es estructural
—`tema_id` es NOT NULL, no hay dónde dejarlos huérfanos— y por eso **borrar una reunión cerrada es
sólo de admin** (§4.2): se lleva compromisos que otras reuniones muestran como heredados.

**Nota de alcance:** en el diseño del 28/08 el checklist colgaba de `actividades` y servía para
cualquier tarea. Con el desacople sirve sólo dentro de una reunión.

**Y no hay tercer nivel:** un pendiente no tiene sub-pasos. Si aparece el caso, es otro tema.

### 3.7 Los heredados: una consulta, cero columnas

```sql
SELECT p.*, t.titulo AS tema, r.codigo, r.fecha
FROM reunion_pendientes p
JOIN reunion_temas t ON t.id = p.tema_id
JOIN reuniones     r ON r.id = t.reunion_id
WHERE r.empresa = $empresa
  AND r.estado <> 'borrador'            -- un borrador no ocurrió
  AND r.id <> $reunion_id               -- no arrastrarse a sí misma
  AND r.fecha <= $fecha_de_esta_reunion -- '<=' , no '<': ver abajo
  AND p.estado <> 'Completado'
ORDER BY r.fecha, p.posicion;
```

**Tres correcciones sobre la versión anterior, las tres encontradas por la revisión:**

- **`<=` y no `<`.** Dos reuniones de la misma empresa el mismo día —una a las 9, otra a las 16— y
  la de la tarde no veía lo abierto a la mañana. La auto-exclusión se resuelve por `id`, no por
  fecha. Es la RN-15 del spec de Freddy, que ya lo decía así.
- **Se excluyen los borradores.** Sin eso, una reunión en borrador con fecha pasada inyecta
  compromisos de una reunión **que nunca ocurrió**, indistinguibles de los reales.
- **Índices.** Postgres no indexa el lado referenciante de una FK: hacen falta
  `reunion_temas(reunion_id)`, `reunion_pendientes(tema_id)` y `reuniones(empresa, fecha)`. Sin
  ellos, cada apertura de un expediente es un seq-scan sobre las tres tablas.

**Se arrastra el pendiente, no el tema.** Lo que queda debiendo es *"Angie no entregó el mockup"*,
no *"volvamos a hablar del landing"*.

**Un heredado no se copia:** se muestra desde donde está y se edita ahí mismo. Copiarlo crearía dos
filas para lo mismo. Que eso sea posible —editar una fila que cuelga de un acta cerrada— es
coherente con §3.4: **el documento está congelado, el compromiso no.** Y §4.2 lo autoriza
explícitamente, que es lo que faltaba antes.

**Falta una salida y hay que decirlo:** un pendiente que dejó de tener sentido —el cliente canceló
el proyecto— sólo sale de la lista marcándolo `Completado` (mentira) o borrando la fila (sin
rastro). El catálogo de §2.2 no tiene `Cancelado`. Es el otro argumento a favor del quinto valor.

### 3.8 Índices

```sql
CREATE INDEX ON public.reunion_temas (reunion_id);
CREATE INDEX ON public.reunion_pendientes (tema_id);
CREATE INDEX ON public.reunion_pendientes (responsable_id) WHERE estado <> 'Completado';
CREATE INDEX ON public.reuniones (empresa, fecha DESC);
CREATE INDEX ON public.reunion_participantes (reunion_id);
CREATE INDEX ON public.reunion_participantes (usuario_id);
```

El de `usuario_id` no es opcional: la policy de lectura (§4.2) pregunta por participación en cada
fila.

### 3.9 Enumeraciones

Seis DOMAIN con nombre, declarados arriba de las tablas en la misma migración, **no** como `CHECK`
inline (`rules/base-de-datos.md`): `modalidad_reunion`, `estado_reunion`, `asistencia`,
`estado_pendiente`, **`tipo_reunion`** y **`rol_en_reunion`**.

Los dos últimos son correcciones: la versión anterior los dejaba como `text` libre con la lista de
valores escrita en la columna "Notas" — o sea peor que el `CHECK` inline que la regla prohíbe.

`tipo_reunion` cubre lo que el spec resolvía con la tabla `meeting_types` (§3.11): seguimiento ·
planificación · revisión por la dirección · comité · extraordinaria. Es un DOMAIN y no una tabla
porque el catálogo lo edita quien escribe migraciones, no el admin — y una tabla más de catálogo
administrable exige una UI que hoy no existe.

Cada uno lleva su objeto META en TypeScript con `labelKey` y color; el valor canónico no se
renderiza nunca. `estado_pendiente` lista exactamente los cuatro valores de `ESTADO`.

### 3.10 El código de la reunión

`MTG-{empresa}-{AAAA}{MMDD}-{NNN}` por trigger. **El `{NNN}` necesita un mecanismo y el spec lo
tenía en `document_sequences`, que §3.11 descarta.** Contar filas y sumar uno es una condición de
carrera: dos altas simultáneas de la misma empresa el mismo día leen el mismo máximo y el `UNIQUE`
rechaza la segunda con un error crudo de Postgres.

**Se resuelve con un advisory lock** por `(empresa, fecha)` dentro del trigger:
`PERFORM pg_advisory_xact_lock(hashtext(NEW.empresa || NEW.fecha::text))`. Se libera solo al
terminar la transacción, no necesita tabla y no agrega nada que mantener.

**El `codigo` es un folio, no una clave natural, y hay que decirlo** porque codifica empresa y
fecha — lo mismo que hacía `responsable_ref` (`rules/codigo.md`). La fuente de verdad de esos dos
datos son las columnas `empresa` y `fecha`. Si la empresa se renombra, `reuniones.empresa` sigue el
cascade y el `codigo` queda diciendo lo viejo: **eso es correcto para un número de documento** —RN-03
del spec elige la inmutabilidad a propósito— pero sería un bug si alguien lo leyera como dato.

### 3.11 Lo que NO se crea

`companies`, `app_users`, `user_companies`, `access_denylist`, `topic_reviews`, `task_updates`,
`attachments`, `audit_logs`, `document_sequences`, `meeting_types`.

**Cada una con su razón, porque la versión anterior las despachaba en bloque citando tres secciones
que sólo cubrían cuatro:**

| Tabla | Por qué no |
|---|---|
| `companies` · `app_users` | Ya existen como `empresas` / `usuarios` (§2.5) |
| `user_companies` | Pertenencia multi-empresa. Sin transversalidad (§2.11a) no tiene a qué servir. `usuarios.empresa_id` alcanza para el alcance de §4.2 |
| `access_denylist` | Sin lista de pertenencia, no hay de qué restar (§2.7) |
| `topic_reviews` | El arrastre con historial queda fuera (§2.3) |
| `task_updates` · `audit_logs` | Historial y auditoría. No hay pedido concreto y `historial` ya audita `actividades` con otro mecanismo. **Consecuencia aceptada: borrar una reunión no deja rastro** |
| `attachments` | Evidencias. Exige Storage y su política de acceso; ninguna fase lo pide |
| `document_sequences` | Su único uso era el `{NNN}`, resuelto con advisory lock (§3.10) |
| `meeting_types` | Resuelto con el DOMAIN `tipo_reunion` (§3.9) |

---

## 4. Permisos y RLS

**Esta sección se reescribió entera.** La anterior ponía una sola policy `mod_access` `FOR ALL` y
describía en prosa un modelo de capacidades que esa policy no implementaba: cualquiera con el slug
podía leer, editar y **borrar** cualquier acta de cualquier empresa, cerrada incluida. Es la forma
que `rules/codigo.md` describe — *no falla, funciona de más* — y Freddy ya lo había escrito en su
spec: *"ocultar un botón no es seguridad"*.

### 4.1 El slug

`reuniones` se registra en `role_modules`. La migración necesita al menos una fila con ese slug para
que el `RAISE EXCEPTION` del guard no aborte.

⚠️ **No se siembra al rol `admin`.** La versión anterior lo hacía y era un error: `CLAUDE.md` declara
que admin **no tiene filas** en `role_modules` (short-circuit de `is_admin()`), sería la primera de
la historia del repo, y **se borra sola** si alguien abre el rol admin en el panel y guarda —
dejando cualquier migración futura del módulo abortando con "slug desconocido".

En su lugar: la migración inserta la fila, genera las policies y **borra la fila** en el mismo `DO`
block. El guard cumple su función —verificar que el slug se escribió bien— sin dejar un dato
decorativo y mutable atrás.

El reparto real lo hace el admin desde `/admin` → Roles, **y eso exige el paso 0 de §6**: sin la
entrada en `MODULE_META`, `validateModuleSlugs` rechaza el slug con `Módulos inválidos: reuniones` y
la casilla ni siquiera se dibuja.

El `INSERT` lleva `ON CONFLICT DO NOTHING`: `role_modules` tiene PK `(role_key, module_slug)` y
`rules/base-de-datos.md` prescribe aplicar el `.sql` por psql cuando el historial se desalinea — o
sea que la migración tiene que ser idempotente.

### 4.2 Las policies, por operación

No hay `FOR ALL`. Cada tabla lleva sus policies separadas, con `WITH CHECK` explícito donde
corresponde.

**Función auxiliar** (una vez, `STABLE SECURITY DEFINER`, `SET search_path = public`, como
`is_admin()`):

```sql
-- ¿el usuario actual participa de esta reunión?
public.participa_en_reunion(p_reunion uuid) RETURNS boolean

-- ¿pertenece a la empresa de esta reunión?  (usuarios.empresa_id → empresas.codigo)
public.misma_empresa_reunion(p_reunion uuid) RETURNS boolean
```

| Tabla | Operación | Condición |
|---|---|---|
| `reuniones` | SELECT | `has_module('reuniones') AND (is_admin() OR participa_en_reunion(id) OR misma_empresa_reunion(id))` |
| | INSERT | `has_module('reuniones')` — cualquiera con el módulo convoca |
| | UPDATE | `is_admin() OR (preside o secretario, vía participantes)`, **y sólo si `estado <> 'cerrada'`** |
| | DELETE | `is_admin()` únicamente |
| `reunion_participantes` | SELECT | se puede ver la reunión |
| | INSERT/UPDATE/DELETE | `is_admin() OR (preside o secretario)`, reunión no cerrada |
| `reunion_temas` | SELECT | se puede ver la reunión |
| | INSERT/UPDATE/DELETE | `is_admin() OR (preside o secretario)`, reunión no cerrada |
| `reunion_pendientes` | SELECT | se puede ver la reunión |
| | INSERT/DELETE | `is_admin() OR (preside o secretario)`, reunión no cerrada |
| | **UPDATE** | `is_admin() OR (preside o secretario de su reunión) OR responsable_id = yo` — **también si la reunión está cerrada** |

**Esa última fila es la que hace posible el arrastre**, y es deliberada: por §3.4 el documento está
congelado pero el compromiso sigue vivo, así que el responsable puede cerrar su pendiente desde la
reunión siguiente. La versión anterior prometía ese flujo en §3.7 y lo prohibía en §4.4.

**La inmutabilidad del acta cerrada se refuerza con un trigger**, no sólo con policies: un
`BEFORE UPDATE OR DELETE` sobre `reuniones`, `reunion_temas` y `reunion_participantes` que rechaza
si la reunión está `cerrada` y quien opera no es admin. El repo ya usa ese patrón en
`prevent_rol_self_change`. Las policies protegen del acceso; el trigger protege de la lógica.

Todo lo que usa el slug va en un `DO` block con la variable y su `RAISE EXCEPTION`
(`rules/base-de-datos.md`): `has_module()` abre con `is_admin() OR …`, así que un slug mal tipeado
devuelve `true` para el admin —que es quien escribe y prueba la migración— y `false` en silencio
para todos los demás.

### 4.3 La migración, y por qué SÍ lleva precheck

La versión anterior decía *"no hay migración riesgosa: un `db push` que sólo crea no puede dejar a
nadie sin ver lo que ya veía"*. La primera mitad es cierta. La segunda confundía **"no rompe
permisos"** con **"no aborta"**, que es lo que el precheck mide. Tres formas de abortar, las tres
contestables con un `SELECT`:

1. El `INSERT` en `role_modules` sin `ON CONFLICT` (PK compuesta) — resuelto en §4.1.
2. Colisión de nombre de `CREATE DOMAIN`. `asistencia` y `tipo_reunion` son genéricos; el esquema
   vivo puede no ser el que muestran las migraciones. **Precheck:** `information_schema.domains`.
3. `empresa text REFERENCES empresas(codigo)` exige `UNIQUE` en la columna referida. Existe — pero
   se verifica, no se supone.

**Y hay dos roturas que ninguna de esas tres cubre**, porque no están en el SQL sino en código y en
una función que nadie mira:

- **`admin_reassign_and_delete`** limpia una lista hardcodeada de tablas
  (`historial · marcaciones · notificaciones · slots_calendario · solicitudes · actividades`,
  verificado). Sin agregar las del módulo, dar de baja a alguien que presidió una reunión hace
  fallar la FK, la función entera hace rollback y **ese usuario queda imborrable**.
- **`org-catalogs.ts`** declara `blockedBy` de `empresas` como otra lista a mano. Sin `reuniones`,
  el panel cuenta 0 dependientes para una empresa con 40 reuniones y el `DELETE` explota.

Las dos van **en la misma fase que la migración**, no después.

**Backup previo** de `roles` y `role_modules` (`pg_dump` dentro del contenedor). Y el rollback se
escribe **antes** del push: es DDL, no restore de datos.

### 4.4 Capacidades

Sin tier Dirección (§2.4), dos niveles y los dos ya existen:

- **`is_admin()`** — todo, incluido cerrar, **reabrir** y borrar actas de cualquiera.
- **El resto** — según §4.2: convoca reuniones, edita las que preside o secretaría mientras estén
  abiertas, y cierra los pendientes de los que es responsable aunque el acta esté cerrada.

⚠️ **Reabrir contradice el spec y hay que registrarlo:** RN-04 dice *"no hay camino de vuelta desde
cerrada"* y RN-05 que una reunión cerrada es de solo lectura total. Se desvía a propósito —el admin
tiene que poder corregir— y el costo está en §3.4: un acta reabierta y vuelta a cerrar pisa su
snapshot sin dejar traza.

Nunca se compara contra el nombre de un rol: los roles son dinámicos.

---

## 5. Estructura de código

```
src/features/reuniones/
  components/
    expediente/                    ← agrupa; SIN index.tsx
      ExpedienteView/index.tsx + index.module.css
      DatosGenerales/
      BloqueCierre/
    participantes/
      ParticipantesPanel/
      ParticipanteRow/
      InvitadoExternoForm/
    temas/
      TemasPanel/  TemaCard/
    pendientes/
      PendientesLista/  PendienteRow/  PendienteEstadoChip/
    heredados/
      HeredadosPanel/  HeredadoRow/
    acta/
      ActaPreview/
  context/
    ReunionProvider/index.tsx      ← compone los hooks; lo usa la vista
  hooks/
    useReunion/  useParticipantes/  useTemas/  usePendientes/  useHeredados/
    index.ts                       ← barrel: SÓLO re-exporta
  utils/
    armarActaSnapshot/index.ts + index.test.ts
    camposDelActa/index.ts + index.test.ts
  types.ts
  constants/index.ts               ← los seis META de §3.9

src/shared/data/reuniones/
  index.ts                         ← barrel: SÓLO re-exporta
  reuniones.ts  participantes.ts  temas.ts  pendientes.ts  heredados.ts

src/app/(app)/reuniones/page.tsx   ← thin route
```

**Tres correcciones que la revisión encontró corriendo el centinela contra archivos de ejemplo:**

- **`constants/index.ts`, no `constants.ts`.** El check `tres_tipos_o_mas` cuenta cada `as const`
  como una forma, y su excepción es la subcadena `/constants/` — una **carpeta**, no el archivo.
  Seis META en un `constants.ts` frenan.
- **`src/shared/data/reuniones/` como carpeta**, no un archivo. `research.ts` son 59 líneas para
  **un** dominio; cuatro tablas más los heredados pasan las 150, donde el check bloquea sin
  exención posible.
- **El barrel de `src/shared/data/index.ts` gana `export * as reunionesRepo from './reuniones'`**, y
  se consume por `@/shared/data`. Importar `@/shared/data/reuniones` directo frena.

**El formulario del expediente es UN objeto de estado**, desestructurado una vez
(`rules/componentes.md`: el umbral de `useState` es uno). Con doce campos, un `useState` por campo
frena el archivo.

---

## 6. Fases

| Fase | Alcance | Cómo se verifica |
|---|---|---|
| **0** | **Partir `src/shared/auth/permissions.ts`** y registrar el slug en `MODULE_META` | `tsc` + `vitest` verdes y la app funciona **igual**. Sin esto no hay fase 1 |
| **1** | Migración (6 DOMAIN + 4 tablas + índices + RLS + triggers) · expediente · participantes · las dos listas hardcodeadas de §4.3 · `CLAUDE.md` | Un rol NO admin con el módulo crea una reunión, se ve en `/reuniones`, y un rol sin el módulo no la ve. Y se puede dar de baja a un usuario que presidió una reunión |
| **2** | Temas y pendientes, con `fecha_original` | Se levanta un acta completa de principio a fin sin salir de la pantalla |
| **3** | Heredados · acta imprimible con firmas · `acta_snapshot` + RPC de cierre · `hoja-imprimible` | Cerrar un acta no cierra sus pendientes; los abiertos reaparecen en la siguiente; el acta cerrada no cambia si después se renombra un cargo |
| **—** | *(no se hace, §2.11)* Transversalidad · pipeline · panel ejecutivo | — |
| **—** | *(no se hace, §2.12)* Notificaciones — y cuando se haga, cuesta una columna en `notificaciones` | — |
| **—** | *(implica el refactor de Operaciones, §2.10)* Arrastre con historial · adjuntos · comentarios · prioridad · colaboradores | — |

**La fase 0 es nueva y es obligatoria.** `permissions.ts` tiene **162 líneas** y el check
`archivo-extenso` corta en 150 **sin marca que valga**: el Edit se rechaza. Registrar el slug es
imposible hasta partirlo. Lo importan el middleware, el AppShell, el launchpad, admin y dos suites
de test, así que es un commit propio que no cambia comportamiento.

**El criterio de verificación de la fase 1 cambió a propósito.** Antes decía *"un rol sin el módulo
no la ve"* — el caso negativo, que pasa trivialmente porque ningún rol lo tiene. `has_module()` abre
con `is_admin() OR …`, así que **probando con un admin no se prueba ninguna policy**. Hay que probar
con un rol no-admin que sí tenga el módulo.

**Última fila, dicha sin vueltas:** por la regla de §2.10, el arrastre con historial **no** es
"agregar `topic_reviews` sin tocar nada" como decía la versión anterior. Necesita `prorrogas` y
`es_final` en `reunion_pendientes`, o sea el disparador de unificar. Lo único que se salva es
`fecha_original`, y por eso entra ahora (§2.3).

---

## 7. Lo que este diseño se compromete a cumplir del repo

No es aspiracional: es contra lo que se revisa. La versión anterior listaba nueve reglas y le
faltaban veintiuna.

**Base de datos** — DOMAIN con nombre, nunca `CHECK` inline · el slug en variable con su `RAISE` ·
**una tabla nace con RLS encendida y su policy, en la misma migración** · backup y precheck antes
del push · datos de prueba por el frontend, no por seed.

**Arquitectura** — consultas en `src/shared/data/`, nunca un `.from()` al lado de un botón · lo que
otro módulo pediría nace en `src/shared/` · antes de crear un componente, buscar el que ya existe.

**Componentes** — un componente es una carpeta con su `index.module.css` · una carpeta que agrupa no
lleva `index.tsx` · un `.tsx` declara UN componente · sin `style` inline salvo variables CSS con
datos · medidas en `rem` · el tipo de las props arriba, no en la firma · lo que se repite en un
`.map()` es un componente · el JSX que se pasa por una prop es un componente · una función con
cuerpo no va dentro de una prop · una tabla de datos no se declara adentro de un componente ·
**más de un `useState` es sospechoso** y el objeto de estado se desestructura una vez · el
componente renderiza, todo lo demás vive afuera.

**Código** — nada de `any` · thin routes · un `route.ts` sólo exporta handlers · animaciones desde
`src/shared/motion` · los permisos se preguntan, no se deducen · el singleton de Supabase ·
`service_role` sólo en ruta API con guard · i18n en los dos idiomas, sin `i18n-ignore` · ningún
texto que ve un usuario se escribe inline · fechas con `localDate()` · los valores de dominio salen
de constantes y **el valor canónico no es la etiqueta** · el "sin filtro" sale de `SIN_FILTRO` ·
nada de `../../` · `src/shared/` se importa por su barrel · tres tipos o más van a su propio
archivo · **lo que se devuelve se arma en una variable con nombre** · **50 líneas, 150 el techo** ·
lo que cuenta plata, horas o tareas lleva test.

**UI** — todo `<select>` obligatorio arranca en placeholder vacío (**el expediente tiene seis**) · lo
que se ve tiene que poder explicarse solo · `frontend-design`, `dataviz` y `accessibility` **antes**
de escribir la pantalla · la acción primaria vive en la barra de su vista, no en el topbar.

**Proceso** — toda regla nueva nace con su check (§2.10 trae el suyo) · los archivos de contexto se
corrigen en el mismo commit que los desmiente · un commit es una unidad revisable y se stagea por
ruta · lo que se decidió y no se hizo se anota en `.todo` · **antes de decir que funciona:** `tsc`,
`vitest`, y abrirlo en el navegador — y si no se abrió, se dice.

⚠️ **Dos que este módulo va a pagar caro y conviene decidir antes de empezar:**

- **Cada `.tsx` nuevo con tres elementos o más frena** hasta llevar su marca `bloques-similares@1`
  **y su fila en `rules/EXENCIONES.md`**. El expediente son 15–25 componentes; hoy `EXENCIONES.md`
  tiene 12 filas y esa clave no aparece ni una vez en `src/`. **Antes de la fase 1 hay que decidir
  qué sube a `src/shared/components/`** (fila, chip de estado, panel recogible, barra de filtros)
  para que la búsqueda termine en reuso y no en veinte firmas.
- **`MODULE_META` guarda `name` y `description` en español duro** y `appShellConfig.ts` su `label`.
  Ninguno es `.tsx`, así que el check de i18n no los ve — pero §7 promete i18n total. O el módulo
  entra con literales como los otros ocho y se anota la deuda, o se pasa `labelKey`. **Decidirlo en
  la fase 0**, no descubrirlo.

---

## 8. Preguntas abiertas

Ninguna bloquea el arranque de la fase 0.

1. **El quinto estado, `Cancelado` o `Postergado`** (§2.2, §3.7). Freddy dijo "postergado" dos veces
   en la reunión y hoy no hay dónde ponerlo; y sin `Cancelado` un pendiente muerto sólo sale de los
   heredados mintiendo. Contra: rompe la identidad del mapeo con `ESTADO`. **Se decide al empezar
   la fase 2.**
2. **`prioridad` y colaboradores N:N.** ⚠️ **No son preguntas abiertas rutinarias: son los
   disparadores de §2.10.** Si alguien los pide, la respuesta no es una columna — es que llegó el
   momento de unificar con `actividades`. Quedan acá para que nadie los agregue por descuido.
3. **Historial de cargos con vigencia.** `usuario_cargos` con `desde`/`hasta` resolvería la
   trazabilidad para toda la app, no sólo para las actas (§3.4). Trabajo del módulo de organización.
4. **El desfase de `actividades.estado`** (§2.2): seis valores en la base contra cuatro en el
   catálogo. No es de este módulo. En `.todo`.
5. **Qué se le dice a Freddy.** Su spec son nueve a diez semanas y este diseño descarta diez tablas
   y tres de sus siete bloques. **Tiene que enterarse por una conversación, no por un commit** — y
   §2.11 existe para que esa conversación tenga de qué agarrarse. Lo que hay que decirle, en orden:
   el pipeline y el panel no se hacen y por qué; una acción no puede ser de varias marcas; el acta
   no va a poder imprimir la tabla de prórrogas que él llama el corazón del módulo.
6. **Las columnas derivadas de `actividades`** (§2.10): `mes`, `trimestre`, `semana` y `sheet_row`.
   Wagner las marcó como sobrantes el 28/08 y sólo siguen porque el reporte de pago las usa. No es
   trabajo de este módulo, pero es el primer paso —y el más barato— del proyecto Operaciones.
   ⚠️ Y no son 100% derivables: **6 filas tienen `mes` sin ninguna fecha** de la cual derivarlo, y
   una tiene un `mes` que no coincide. El pendiente incluye decidir esas siete a mano.

---

## 9. Pendientes antes de escribir la primera línea

### 9.1 La revisión adversarial — HECHA el 29/08

Cinco agentes, ángulos disjuntos. Encontró ~20 hallazgos que cambian el diseño y uno que no era del
diseño: las cuatro tablas sin RLS en producción. **Este documento es la respuesta a esa revisión.**

Lo que quedó demostrado y conviene no olvidar: **la mitad de los hallazgos eran párrafos heredados**
del diseño del 28/08 que sobrevivieron a la inversión de la decisión central y pasaron a justificar
lo contrario de lo que justificaban. Una reescritura grande no es "cambiar lo que cambió": es
releer todo con la decisión nueva en la cabeza.

**Cuando este documento se vuelva a tocar en serio, se vuelve a revisar.** No porque sea ritual:
porque el modo de falla ya se vio dos veces.

### 9.2 Los dominios de login se van a la base

`DOMINIOS_VALIDOS` es hoy un array en `src/shared/constants/domain.ts`. Es **política de empresa**,
no una constante de código: cambia cuando entra una marca al grupo y hoy exige un deploy.

⚠️ **Corrección: la tabla ya existe.** `public.dominios_corporativos` está creada desde el dump de
junio (`dominio text UNIQUE`, `departamento_id`, `activo`), con **cero filas**, **cero policies** y
**cero referencias desde `src/`**. El trabajo no es crearla: es poblarla, darle policy y conectarla.
La mitad hecha y muerta.

Y el array tiene **cuatro** dominios, no los tres que lista `CLAUDE.md`: el cuarto es
`@stratix360.com`. Ese archivo está desactualizado en ese punto.

Entra en este trabajo porque el módulo toca justo eso: los participantes externos (§3.3) son
exactamente quienes **no** tienen un dominio de la lista.

### 9.3 Qué otras constantes bajan a la base — analizado

| Constante | ¿A la base? | Por qué |
|---|---|---|
| `DOMINIOS_VALIDOS` | **Sí** | §9.2. Política de empresa |
| `ESTADO` / `VERIFICADO` | **Todavía no** | Cada valor arrastra su clave i18n y su color: hacerlo administrable exige una UI que no existe |
| `MESES`, `TRIMESTRES`, `mesATrimestre` | **No** | Es el calendario |
| `SIN_FILTRO`, `TRIMESTRE_GENERAL` | **No** | Centinelas de interfaz, no datos |
| `COLORES_AVATAR` | **No** | Es una paleta; su lugar es CSS |

### 9.4 Unificar componentes duplicados — fuera de este plan

Los tres `StatCard` (`accounting`, `admin`, `research`) son trabajo aparte: entraban cuando la fase
0 movía vistas a `src/shared/`, y esa fase ya no existe. En `.todo`.

Lo que **sí** aplica es la mitad preventiva de `rules/componentes.md`, con el costo mecánico que
§7 detalla.

### 9.5 Reglas nuevas que este módulo produce

Ya no está "sin analizar". Tres, con su check propuesto:

1. **"Una hoja imprimible sale de `src/shared/utils/hoja-imprimible`"** — verificable:
   `pattern: <!DOCTYPE\s+html`, `files: .ts,.tsx`, `except: /shared/utils/hoja-imprimible`. Mismo
   patrón que la regla de Framer Motion. Se escribe en la fase 3, con el trabajo.
2. **"`reunion_pendientes` no crece"** (§2.10) — su check ya está redactado ahí. Va en la fase 1.
3. **"Un snapshot congela el documento, no la presentación"** — qué entra al `acta_snapshot` y qué
   no. No se verifica por forma: sale con `<!-- sin check: criterio sobre el significado del dato -->`.

Y una cuarta que este trabajo hace evidente y no es del módulo: **"agregar un módulo toca estos
cinco lugares"** (`permissions.ts`, `appShellConfig.ts`, la ruta de `src/app/(app)/`, los dos
`locales/*.json`, `CLAUDE.md`). Hoy ese checklist vive como comentario en el encabezado de
`permissions.ts` y está incompleto: nombra dos de los cinco.
