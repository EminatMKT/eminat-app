# Módulo Operaciones — diseño

**Fecha:** 2026-08-28
**Origen:** reunión de development del 28/08/2026 (Freddy, Wagner, Angie) + el spec
`STX-SPEC-2026-OMH-001_Operations_Management_Hub` redactado por Freddy.
**Estado:** diseño aprobado en conversación. Sin implementar.

---

## 1. Qué se construye

Un módulo **Operaciones** (`/operaciones`, slug `operaciones`) que se convierte en el lugar
donde vive la **gestión de tareas de toda la empresa**, y que además registra reuniones — porque
una reunión es uno de los lugares de donde nacen tareas.

No es "el módulo de reuniones". Ese fue el pedido literal de Freddy, pero al revisarlo apareció
algo más grande: la gestión de tareas hoy está encerrada dentro de Stratix 360, que además tiene
redes sociales y análisis de competencia adentro. Las tareas no son de marketing; son de la
empresa. Este módulo las saca de ahí.

Cuatro vistas:

| Vista | Qué es |
|---|---|
| **Tareas** | Kanban, Gantt y tabla sobre `actividades`. Es lo que hoy son las pestañas `kanban` y `solicitudes` de Stratix |
| **Reuniones** | Expediente: datos generales, participantes, temas tratados, checklist, conclusiones, acta |
| **Reporte** | El reporte de pago, tal cual funciona hoy |
| **Tablero** | Cumplimiento por persona y por marca |

Stratix 360 se queda con lo que su nombre dice: `social`, `competencia`, `equipo` y su tablero
de marketing.

---

## 2. Decisiones tomadas, y contra qué se decidieron

Cada una salió de una discusión concreta. Se anotan con su motivo porque una decisión sin motivo
se revierte sola dentro de tres meses.

### 2.1 Las tareas de reunión van a `actividades`, no a una tabla nueva

El spec de Freddy propone `meeting_topics`, una entidad propia. Se descarta.

Comparadas de cerca, `meeting_topics` y `actividades` son la misma fila: título, descripción,
empresa, responsable, aprobador, estado, fecha comprometida. Lo que las diferenciaba era la
contabilidad que cada una arrastra — `mes/trimestre/horas` en una, `plazo_original/prorrogas` en
la otra — y **las dos mitades quedaron fuera del alcance** (§2.3 y §2.4). Sin eso, dos tablas
serían dos nombres para lo mismo, con dos Kanban y dos lugares donde una persona busca "mis
tareas".

**Lo que cuesta y hay que pagar a propósito:** `actividades` hoy significa, de hecho, "tarea de
Stratix 360" — es el único módulo que la escribe. Pasa a significar "tarea de la empresa". Eso
obliga a mudar el módulo entero (§3) y a mover su RLS (§5), no a agregar una columna y seguir.

### 2.2 `asignado` no es un estado

El spec propone cinco etapas: `nuevo · asignado · en_proceso · validacion · finalizado`. Pero
`asignado` no describe una etapa del trabajo: describe si la tarea tiene responsable o no. Es un
**filtro derivado** (`responsable_id IS NULL`), no un dato que alguien elige.

Se mantiene el catálogo que ya existe, `ESTADO` en `src/shared/constants/domain.ts`:
`Pendiente · En proceso · Por aprobar · Completado`. El mapeo contra el spec es directo:

| Spec | Acá |
|---|---|
| `nuevo` + `asignado` | `Pendiente`, con "sin responsable" como filtro |
| `en_proceso` | `En proceso` |
| `validacion` | `Por aprobar` |
| `finalizado` | `Completado` |

Cero valores nuevos, cero migración de datos.

### 2.3 El arrastre con historial queda fuera de esta fase

El spec construye toda su maquinaria alrededor de la **prórroga registrada**: `original_due`
inmutable, `due_date` vigente, contador de `extensions`, marca `is_final` de último plazo, y una
tabla `topic_reviews` con una fila por cada vez que una acción se retoma. Sobre eso monta la
línea de vida y el tablero de arrastres.

**Todo eso queda afuera por decisión explícita de Wagner.** No se implementa en esta fase y no se
agregan sus columnas "por si acaso": una columna nullable que nadie escribe es peor que no
tenerla, porque después nadie sabe si está vacía porque no se usa o porque falló algo.

Lo que **sí** se conserva de esa idea, y es la parte valiosa: **cerrar un acta no cierra sus
tareas**. Una tarea abierta reaparece en la reunión siguiente de su empresa. Eso no necesita
ninguna columna nueva — es una consulta (§4.6).

Lo que se pierde sin `topic_reviews` es el **porqué** del arrastre: se ve que una tarea lleva tres
reuniones abierta, pero no qué se decidió en cada una. Si más adelante hace falta, la tabla se
agrega sin tocar nada de lo construido (§6, fase 4).

### 2.4 El "último plazo" y el tier Dirección quedan fuera

El spec presenta el último plazo como su freno central: declarado el último plazo, moverlo exige
rol de Dirección. Para implementarlo haría falta un nivel de mando que esta app no tiene — hoy el
único tier de control es `admin`, y ser admin implica poder crear, borrar y editar usuarios.

Se evaluó agregar `roles.es_direccion` (una casilla en `/admin` → Roles, que habilitaría esa
capacidad sin dar el CRUD de usuarios). **Queda fuera del alcance junto con el arrastre**: sin
prórrogas registradas no hay último plazo que declarar, así que el tier no tiene a qué aplicarse.

Si vuelve el arrastre, vuelve esta decisión con él.

### 2.5 Se reusan `empresas` y `usuarios`; no hay catálogos nuevos

El spec propone tablas `companies` y `app_users` propias. Se descartan las dos:

- **`companies` → `empresas`.** Ya existe, con `codigo` como clave natural, y el admin la
  administra desde `/admin` → Organización. Las siglas que usa el spec (EMG, STX, ODM, DCI, PSC,
  CZS) no coinciden con las del repo (EMINAT, STRATIX, ONDARA, DACOACH…): **se usan las del
  repo**. Las marcas que falten se dan de alta desde el panel, que ya existe — no por migración.
  El propio spec marca "catálogo duplicado" como su riesgo de impacto alto, y tiene razón.
- **`app_users` → `usuarios`.** `usuarios` ya es el espejo de `auth.users` (columna `auth_id`, con
  su backfill hecho en `20260709120000_backfill_usuarios_auth_id.sql`). El trigger de alta
  automática que pide el spec ya está resuelto.

### 2.6 Módulo asignado, no acceso universal

El spec pide que **cualquier** persona autenticada entre al módulo. Acá el acceso se gatea con
`role_modules` + `has_module(slug)`, y el rol `sin_asignar` tiene cero módulos por diseño.

Se mantiene el modelo del repo: `operaciones` es un módulo normal que el admin asigna desde
`/admin` → Roles. La migración lo siembra a **todo rol que hoy tenga `stratix-mkt`**, así que en
la práctica nadie pierde nada y el efecto es casi el mismo que el "acceso universal" que pedía el
spec.

### 2.7 `access_denylist` no se construye

El spec propone exclusiones explícitas por empresa que prevalecen sobre cualquier permiso. No hay
nada parecido en el repo y nadie lo pidió en la reunión. `has_module()` más la pertenencia de la
tarea (responsable o solicitante) cubren el caso real. Se agrega el día que exista el caso que lo
justifique, no antes.

### 2.8 Sin Server Actions: se sigue el patrón del repo

El spec especifica Server Actions con validación Zod en el borde. **Este repo no tiene ni una sola
Server Action.** Escribe por `src/shared/data/*` bajo RLS, y usa rutas API con `requireAdmin()` /
`requireModule()` sólo donde hace falta `service_role`.

Se sigue el patrón del repo. Introducir un segundo modelo de escritura para un solo módulo es
costo permanente de mantenimiento a cambio de nada.

### 2.9 El acta sale como HTML imprimible; el `.docx` es fase posterior

El spec pide Word con la librería `docx` y PDF con Puppeteer, ambos en servidor y desde la misma
plantilla. Puppeteer en Vercel arrastra un Chromium de decenas de megas y cold starts largos.

Fase 1: HTML con `@media print` — el navegador hace el PDF. El `.docx` editable queda para cuando
alguien lo pida de verdad.

**Y no se escribe de cero: el acta reusa el generador del reporte de pago.**
`features/stratix-mkt/utils/report-html/` ya resolvió las dos partes difíciles de una hoja
imprimible — el `style` inline obligado (se abre en otra ventana, sin acceso a las hojas de la
app) y el escapado de lo que viene de la base (un título con `<` rompía el HTML).

Lo compartible es el **armazón**, no la función: `<head>`, estilos base, escapado y pie se van a
`src/shared/utils/hoja-imprimible/`, y cada documento pone su cuerpo. El reporte de pago y el acta
salen de ahí. Sin eso, en tres meses hay dos plantillas con el mismo `<head>` copiado — el mismo
camino por el que aparecieron los tres `StatCard` del repo.

Se hace **cuando el acta lo necesite** (fase 3), no antes: hoy `report-html` tiene un solo
consumidor, y partirlo en armazón + cuerpo con un solo uso sería inventar el segundo caso.

---

## 3. La mudanza: dos commits que no cambian comportamiento

La parte cara de este módulo no es lo nuevo, es sacar las tareas de Stratix sin romper lo que hoy
funciona y que Angie usa todos los días.

### 3.1 Cómo se parte Stratix hoy

Stratix 360 tiene siete pestañas (`constants/tabs.ts`) y se dividen limpio:

| Se muda | Se queda |
|---|---|
| `kanban`, `solicitudes`, `reporte` | `social`, `competencia`, `equipo` |
| Gantt, `TaskTable`, modales de tarea | `data.ts` (redes y competencia), `team.ts`, roster |
| hooks `useKanban`, `useSolicitudes`, `useReporte`, `useActividadForm`, `useTablero` | — |
| utils `act-*`, `availability`, `gantt-*`, `report-html`, `report-filter` | `social-format`, `comp-format` |
| `overview`: el ranking de equipo por tareas | `overview`: lo de marketing |

### 3.2 Commit 1 — las vistas suben a `src/shared/components/vistas/`

Kanban, Gantt y la tabla **son vistas, no funcionalidad de marketing**. Hoy están pegadas al
dominio: `KanbanTab`, `KanbanTaskCard`, `GanttChart` y `TaskTable` llaman a `useStratix()` **por
dentro** — van a buscar los datos al contexto del módulo en vez de recibirlos. Es exactamente la
señal que describe `rules/arquitectura.md`: *si al mover un componente a `shared` hay que llevarse
un import de `features/`, ese import es la prueba de que falta un prop*.

```
src/shared/components/vistas/
  KanbanBoard/   ← items, columnas, onMover, colorDe, etiquetaDe, onAbrir
  GanttChart/    ← items, rango, colorDe, etiquetaDe
  DataTable/     ← items, columnas, onAbrir
```

El trabajo real es cortarle el cordón a `useStratix()`. Después de eso la misma vista sirve para
tareas, para leads de Research o para pacientes, sin enterarse de qué está mirando.

**Destino declarado, que NO se construye ahora:** unificar las vistas de toda la webapp de modo
que cada persona elija cuál usar sobre los mismos datos — pestañas de vista, filtros y
agrupaciones configurables, vistas guardadas, al estilo de Notion. Este commit **no** construye
nada de eso. Lo único que hace es dejar las vistas sin dominio adentro, que es la parte cara y la
que después no se puede hacer sin reescribir todo.

Se escriben **sólo los props que el primer uso necesita**, sin opciones "por si acaso"
(`rules/arquitectura.md`: lo que hace compartible a un componente es que no importe de
`features/`, no que tenga quince opciones).

### 3.3 Commit 2 — lo de dominio se muda a `src/features/operaciones/`

Modales, hooks, utils y el reporte se mudan con `git mv`; se arreglan los imports; nada más.

**Los dos commits no cambian comportamiento.** Esa es la condición: el commit que mueve no
cambia, y el que cambia no mueve. Si van juntos, ninguno de los dos se puede revisar
(`rules/proceso.md`).

Recién el tercer commit empieza a agregar reuniones.

### 3.4 Se migra por contacto lo que corresponda

Los archivos que se toquen en la mudanza se dejan en la convención vigente: componente en
carpeta, `../../` a `@/`, imports de `shared` por su barrel. **Sólo los archivos que ya se están
tocando** — no se aprovecha para migrar los vecinos.

---

## 4. Modelo de datos

Tres tablas nuevas y dos columnas. Todo lo demás ya existe.

### 4.1 `reuniones`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `codigo` | text UNIQUE | `MTG-{codigo empresa}-{AAAA}-{MMDD}-{NNN}`, por trigger. Inmutable |

Sobre el código: con los códigos reales de `empresas` queda `MTG-DACOACH-2026-0828-001`, más largo
que el `MTG-STX-…` del spec, que usa siglas de tres letras que este repo no tiene. Se decidió usar
los códigos del repo igual (§2.5): un segundo catálogo de siglas para que el acta se vea más
prolija es exactamente el error que el propio spec marca como riesgo alto. Si algún día molesta, se
agrega una columna `sigla` a `empresas` y el trigger la prefiere cuando exista.

| `empresa` | text FK → `empresas.codigo` | Clave natural sana: legible, UNIQUE + NOT NULL, y no codifica datos que existan por separado (`rules/codigo.md`) |
| `titulo` | text | |
| `tipo` | text | |
| `lugar` | text | Sala o enlace |
| `modalidad` | `public.modalidad_reunion` | DOMAIN: presencial · virtual · hibrida |
| `fecha` | date NOT NULL | Se calcula con `localDate()`, nunca `toISOString()` (`rules/codigo.md`) |
| `hora_inicio` / `hora_fin` | time | CHECK `hora_fin >= hora_inicio` |
| `preside_id` | uuid FK → `usuarios` | |
| `secretario_id` | uuid FK → `usuarios` | Responsable del acta |
| `objetivo` | text | |
| `conclusiones` | text | |
| `proxima_fecha` | date | |
| `proxima_notas` | text | |
| `estado` | `public.estado_reunion` | DOMAIN: borrador · en_curso · cerrada |
| `created_by` | uuid FK → `usuarios` | |
| `created_at` / `updated_at` | timestamptz | |

### 4.2 `reunion_participantes`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reunion_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `usuario_id` | uuid FK → `usuarios` | NULL si es invitado externo |
| `invitado_nombre` / `invitado_empresa` | text | Sólo para externos |
| `rol_en_reunion` | text | Preside · Secretario · Participante · Invitado |
| `asistencia` | `public.asistencia` | DOMAIN: presente · ausente · invitado |

**No lleva `cargo` ni `departamento` congelados**, contra lo que pide el spec de Freddy. Ver §4.4.

### 4.3 Participantes externos

Un cliente o invitado externo **no tiene cuenta y no entra al módulo**: el login está restringido a
los dominios corporativos (`DOMINIOS_VALIDOS` en `src/shared/constants/domain.ts`). Se registra con
`usuario_id` NULL más `invitado_nombre` / `invitado_empresa`, y recibe el acta por correo cuando se
implemente esa parte (Resend ya está configurado).

**Un externo no puede ser responsable de una tarea.** `actividades.responsable_id` es FK a
`usuarios`, y así se queda: si un cliente tiene que hacer algo, el responsable es la persona
interna que responde por eso. Es la misma regla RN-10 del spec de Freddy, y es correcta.

Si algún día un cliente necesita **ver** su pipeline, eso es un tablero público para externos —
que el propio spec de Freddy pone fuera de alcance en su fase 2. Coincidimos.

### 4.4 La trazabilidad del acta: se congela el documento, no las columnas

El spec de Freddy pide copiar `cargo` y `departamento` dentro de `reunion_participantes` para que
el acta de 2024 siga diciendo lo que decía en 2024. El objetivo es correcto; el mecanismo no
funciona en este esquema:

- **`cargo` es multivaluado.** `usuario_cargos` es N:N con PK compuesta
  (`20260805203801_usuario_cargos_nn.sql`). Copiarlo a un `text` aplasta una lista en un string.
- **`departamento` no es una columna.** Se **deriva**: `usuario → equipo → departamento`.
  `20260805175453_estructura_equipos_cargos.sql` dropeó `usuarios.departamento_id` justamente
  porque era dato duplicado. Copiarlo sería replicar una derivación a mano.

El spec no podía saberlo: fue escrito sin conocer el esquema.

**En su lugar:**

```sql
ALTER TABLE public.reuniones ADD COLUMN acta_snapshot jsonb;  -- se escribe al CERRAR
```

| Momento | De dónde sale el acta |
|---|---|
| Borrador y en curso | En vivo, por joins. El cargo se lista como la lista que es; el departamento se deriva del equipo |
| Cerrada | Del `acta_snapshot`. Inmutable |

Al cerrar se congela el documento entero: participantes con los cargos que tenían ese día, temas
con su estado y los nombres de marca de ese momento. El color de marca **no** entra al snapshot:
es presentación, no contenido del acta — si la marca cambia de color, el acta vieja se puede
repintar sin mentir. Es mejor que copiar dos columnas en
cuatro cosas — soporta el multivaluado sin aplastarlo, captura la derivación sin replicarla,
congela **todo** el acta y no sólo dos campos, y es una columna en vez de copias regadas por el
esquema.

**Lo que cuesta, dicho:** un acta en borrador no tiene historia congelada (correcto: todavía no es
un documento), y preguntar "¿qué cargo tenía Angie en 2024?" pasa a ser escarbar jsonb.

**Y eso último marca un límite: el acta no es el sistema de registro del historial de cargos de
nadie.** Si esa trazabilidad hace falta de verdad, se resuelve con `usuario_cargos` ganando
`desde` / `hasta` — sirve a toda la app y es trabajo del módulo de organización, no de éste. Las
dos no se pelean: el snapshot ahora; si algún día existe la vigencia, el acta deja de ser la única
fuente.

### 4.5 `actividad_checklist`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `actividad_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `posicion` | int | Orden dentro de la tarea |
| `texto` | text NOT NULL | |
| `hecho` | boolean NOT NULL DEFAULT false | |
| `hecho_por_id` | uuid FK → `usuarios` | Se llena al marcar, se limpia al desmarcar |
| `hecho_at` | timestamptz | Idem |

Cuelga de `actividades`, no de "tema de reunión": el checklist sirve para cualquier tarea, venga
de donde venga. Es una de las dos cosas que Freddy pidió por nombre en la reunión.

### 4.6 `actividades` — una columna

```sql
ALTER TABLE public.actividades
  ADD COLUMN reunion_id uuid REFERENCES public.reuniones(id) ON DELETE SET NULL;
```

De qué reunión **nació** la tarea. NULL = no nació de ninguna. `ON DELETE SET NULL` sigue el
criterio de `20260825120000_actividades_fks_set_null.sql`: borrar una reunión no borra el trabajo
que salió de ella.

**Y con esa columna alcanza para los heredados.** El bloque de "pendientes de reuniones
anteriores" —lo que Freddy más quiere ver— es una consulta, no un esquema:

```sql
-- tareas abiertas de esta empresa que nacieron en una reunión anterior
SELECT * FROM actividades a
JOIN reuniones r ON r.id = a.reunion_id
WHERE a.empresa = $empresa
  AND a.estado <> 'Completado'
  AND r.fecha < $fecha_de_esta_reunion;
```

Cero columnas para el 80% del valor. Lo que falta —el porqué de cada arrastre— es lo que quedó
fuera en §2.3.

### 4.7 Enumeraciones

Los tres enums (`modalidad_reunion`, `estado_reunion`, `asistencia`) van como `CREATE DOMAIN` con
nombre, declarados arriba de la tabla en la misma migración, **no** como `CHECK` inline
(`rules/base-de-datos.md`). Cada uno lleva su objeto META en TypeScript con `labelKey` y color; el
valor canónico no se renderiza nunca.

### 4.8 Lo que NO se crea

`companies`, `app_users`, `user_companies`, `access_denylist`, `meeting_topics`, `topic_reviews`,
`task_updates`, `attachments`, `audit_logs`, `document_sequences`, `meeting_types`. Once tablas
del spec que este diseño no necesita, por §2.1, §2.3, §2.5 y §2.7.

---

## 5. Permisos y RLS

### 5.1 El slug nuevo

`operaciones` se registra en `role_modules` y se siembra a **todo rol que hoy tenga
`stratix-mkt`**. Sin ese paso, la gente abre el módulo y no ve ninguna tarea.

### 5.2 La RLS de `actividades` se muda

Hoy `actividades` está gateada por `has_module('stratix-mkt')`. Pasa a `has_module('operaciones')`.

**Este es el paso riesgoso de todo el diseño.** Es una policy sobre la tabla con la que trabaja
gente todos los días, y equivocarla no rompe: deja a alguien sin ver sus tareas, en silencio. Va
con:

1. Backup de `actividades`, `roles` y `role_modules` (`pg_dump` **dentro** del contenedor, ver
   `rules/base-de-datos.md`).
2. **Precheck contra prod:** qué roles tienen `stratix-mkt`, cuántos usuarios hay por rol, y la
   comprobación de que ningún rol se queda sin `operaciones` después de la migración.
3. Recién ahí el `push`, y una consulta que verifique el resultado.

Sin proyecto Supabase dev, el precheck es la única red que queda.

### 5.3 Las tablas nuevas

`reuniones`, `reunion_participantes` y `actividad_checklist` llevan policy `mod_access` con
`has_module('operaciones')`, generadas desde un `DO` block con el slug en una variable y el
`RAISE EXCEPTION` si no existe (`rules/base-de-datos.md`). El orden importa: **primero** el
`INSERT` en `role_modules`, después las policies — si no, la verificación aborta contra su propio
slug.

### 5.4 Capacidades dentro del módulo

Sin tier Dirección (§2.4), quedan dos niveles y los dos ya existen:

- `is_admin()` — cerrar y reabrir actas de cualquiera, editar cualquier tarea.
- El resto — edita las tareas donde es responsable o solicitante, marca su checklist, y edita las
  reuniones donde preside o es secretario (sale de `reunion_participantes`, no de un rol nuevo).

Nunca se compara contra el nombre de un rol: los roles son dinámicos y el admin puede volver falsa
esa condición sin tocar código (`rules/codigo.md`).

---

## 6. Fases

Por requerimiento, no por fecha. Ninguna fase depende de una fecha de demo.

| Fase | Alcance | Cómo se verifica |
|---|---|---|
| **0** | Vistas a `src/shared/components/vistas/` recibiendo props; se les corta `useStratix()` | `tsc` + `vitest` en verde y Stratix funciona **igual** — no cambia comportamiento |
| **1** | Mudanza de tareas a `features/operaciones/`; slug `operaciones`; RLS movida con su backup y precheck | Cada rol que tenía `stratix-mkt` ve sus tareas en `/operaciones`; Stratix queda con sus tres pestañas de marketing |
| **2** | Reuniones: expediente, participantes con cargo congelado, temas (= `actividades` con `reunion_id`), checklist | Se levanta un acta completa de principio a fin sin salir de la pantalla |
| **3** | Heredados (la consulta de §4.4) + acta en HTML imprimible | Cerrar un acta no cierra sus tareas, y las abiertas reaparecen en la reunión siguiente |
| **4** | *(a confirmar)* El arrastre con historial: `topic_reviews`, línea de vida, último plazo, tier Dirección | — |
| **5** | *(a confirmar)* Notificaciones, adjuntos, auditoría, `.docx` editable | — |
| **—** | *(proyecto aparte)* Selector de vista por usuario, filtros y agrupaciones configurables | — |

Las fases 0 y 1 no agregan una sola funcionalidad y son las que más riesgo tienen. Es el orden
correcto: refactor primero, feature después.

**Hasta dónde llega este documento, dicho sin vueltas:** las fases **0 a 3 están diseñadas** — su
modelo de datos, su RLS y sus decisiones están en las secciones de arriba, contrastadas contra
este repo. Las fases **4 y 5 están nombradas, no diseñadas**: salen del spec de Freddy, que sí las
describe en detalle, pero **no fueron revisadas contra este esquema** como sí lo fue el resto. Ya
apareció una vez lo que pasa cuando se da eso por sentado — el congelado de `cargo` y
`departamento` de §4.4 sonaba razonable en el spec y no funciona acá.

Cuando toque una de ellas, lleva su propio pase de diseño antes de escribir código. Lo que hay
acá es el alcance, no el plan.

---

## 7. Lo que este diseño se compromete a cumplir del repo

No es una lista aspiracional; es contra lo que se revisa.

- **Tests donde se cuenta.** Toda función que sume, cuente o decida qué entra en un total lleva su
  `.test.ts` (`rules/codigo.md`). Aplica a lo que se mude del reporte y a los heredados.
- **i18n en los dos idiomas.** Cada texto nuevo con su clave en `es.json` **y** `en.json`. Nada de
  `i18n-ignore`.
- **Un componente es una carpeta** con su `index.module.css`. Sin `style` inline salvo variables
  CSS con datos. Medidas en `rem`.
- **Archivos que se leen de una sentada:** 50 líneas, 150 el techo. Lo que pase, se parte o lleva
  su marca versionada con razón escrita, más su fila en `rules/EXENCIONES.md`.
- **Fechas en hora local:** `localDate()` / `localMonth()`, nunca `toISOString().split('T')[0]`.
- **Consultas en `src/shared/data/`**, nunca un `.from()` al lado de un botón.
- **Datos de prueba por el frontend**, no por seed. Si el formulario no permite crear algo que hace
  falta, **eso es el bug**.
- **Antes de decir que funciona:** `npx tsc --noEmit`, `npx vitest run`, y abrirlo en el navegador
  — y si no se abrió, se dice que no se abrió.

---

## 8. Preguntas abiertas

Ninguna bloquea el arranque. La fase 0 no depende de ninguna.

1. **El tablero de Stratix (`overview`) se parte.** Hay que decidir qué ranking se queda del lado
   de marketing y cuál se muda. Se resuelve al llegar a la fase 1, mirando la pantalla.
2. **`prioridad` en las tareas.** El spec la pide (`baja · media · alta · critica`); `actividades`
   no la tiene. Es una columna con su DOMAIN y es barata, pero nadie la pidió en la reunión. Se
   decide al empezar la fase 2.
3. **Colaboradores de una tarea.** El spec los tiene como N:N. Hoy hay `responsable_id` y
   `solicitante_id`, nada más. Fase posterior si aparece el caso.
4. **`mes` y `trimestre` de `actividades`.** Wagner los considera datos derivados que sobran; sólo
   siguen ahí porque el reporte de pago los usa. Sacarlos es un trabajo aparte, no de este módulo,
   pero conviene anotarlo mientras se toca el reporte.
5. **Historial de cargos con vigencia.** `usuario_cargos` con `desde` / `hasta` resolvería la
   trazabilidad de verdad y para toda la app, no sólo para las actas (§4.4). Está fuera del
   alcance de este módulo — es trabajo del módulo de organización. Si algún día se hace, el
   `acta_snapshot` deja de ser la única fuente, pero no estorba.
6. **Qué se le dice a Freddy.** Su spec son nueve a diez semanas y este diseño descarta once de
   sus tablas. Conviene que se entere por una conversación y no por el código.

---

## 9. Pendientes antes de escribir la primera línea de código

Decididos el 28/08/2026 y **no ejecutados**. Ninguno es opcional: los cuatro primeros cambian lo
que se va a construir.

### 9.1 Revisión adversarial del spec

Este documento **no fue revisado por nadie más que quien lo escribió**. Antes de pasarlo a plan de
implementación, someterlo a una revisión adversarial —varios agentes buscando huecos por separado—
que busque específicamente: supuestos sobre el esquema que no se verificaron contra la base, casos
del spec de Freddy que se descartaron sin argumento suficiente, y decisiones que se justifican
entre sí en círculo.

**Motivo:** el congelado de `cargo` y `departamento` (§4.4) sonaba perfectamente razonable y no
funcionaba en este esquema. Lo agarró Wagner leyendo, no el proceso. Un documento de este tamaño
tiene más de uno de esos.

### 9.2 Los dominios de login se van a la base

`DOMINIOS_VALIDOS` es hoy un array en `src/shared/constants/domain.ts`. Es **política de la
empresa**, no una constante de código: cambia cuando entra una marca nueva al grupo, y hoy
cambiarla exige un deploy. Va a una tabla administrable desde `/admin` → Organización, al lado de
`empresas`.

Entra en este trabajo porque el módulo toca justo eso: participantes externos (§4.3) son
exactamente las personas que **no** tienen un dominio de la lista.

### 9.3 Qué otras constantes bajan a la base — analizado

Primer pase sobre `src/shared/constants/domain.ts`, para no bajar todo por inercia:

| Constante | ¿A la base? | Por qué |
|---|---|---|
| `DOMINIOS_VALIDOS` | **Sí** | §9.2. Política de empresa, cambia sin código |
| `ESTADO` / `VERIFICADO` | **Todavía no** | Son catálogos que el admin querría editar, pero cada valor arrastra su clave i18n y su color: hacerlo administrable exige una UI que hoy no existe. Se anota y se decide cuando alguien pida un estado nuevo |
| `MESES`, `MESES_Q`, `mesATrimestre`, `TRIMESTRES` | **No** | Es el calendario. No cambia, y bajarlo agrega una consulta para saber que después de Enero viene Febrero |
| `SIN_FILTRO`, `TRIMESTRE_GENERAL` | **No** | Son centinelas de la interfaz, no datos |
| `COLORES_AVATAR` | **No** | Es una paleta, y su lugar correcto es CSS (`rules/componentes.md`), no la base |

### 9.4 Unificar los componentes que en realidad son el mismo

Parte del plan, no un extra. El repo tiene **tres `StatCard`** (`accounting`, `admin`, `research`)
que hacen casi lo mismo, así que un bug se arregla una vez y sobrevive dos. La fase 0 ya mueve
vistas a `src/shared/`; es el momento de barrer lo demás que esté duplicado, con el criterio de
`rules/componentes.md`: se unifica por **significado**, no por parecido — dos bloques que hoy se
parecen pero responden a cosas distintas no se tocan.

### 9.5 Qué reglas nuevas necesita `rules/`

Sin analizar todavía. Este módulo va a producir convenciones que hoy no están escritas —cómo se
arma una hoja imprimible, qué se congela en un snapshot y qué no, cuándo una constante baja a la
base— y `rules/proceso.md` pide que una regla nueva nazca con su check en el mismo commit.
Revisar al cerrar cada fase, no al final.
