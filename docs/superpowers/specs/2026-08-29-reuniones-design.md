# Módulo Reuniones — diseño

**Fecha:** 2026-08-29
**Origen:** reunión de development del 28/08/2026 (Freddy, Wagner, Angie) + el spec
`STX-SPEC-2026-OMH-001_Operations_Management_Hub` redactado por Freddy.
**Estado:** diseño sin revisar. Sin implementar.

**Historia — por qué este documento reemplaza al del 28/08:** el diseño anterior (*Módulo
Operaciones*) sacaba la gestión de tareas de Stratix 360 y hacía que los temas de una reunión
FUERAN filas de `actividades`. El 28/08 Freddy lo vetó explícitamente: *"reuniones es aparte, que
no se conecten con actividades por el momento"* y *"un módulo de reuniones que no tiene que
conectarse por el momento con nada es un módulo que lo use cualquiera"*. Eso voltea la decisión
central de aquel documento, así que se reescribe entero en vez de parchearse.

**El diseño viejo se recupera así** —`git log --follow` NO lo encuentra, porque el cambio fue tan
grande que git lo registró como borrado + creación en vez de rename:

```bash
git show 688cd97:docs/superpowers/specs/2026-08-28-operaciones-design.md
```

---

## 1. Qué se construye

Un módulo **Reuniones** (`/reuniones`, slug `reuniones`) **autocontenido**: registra el expediente
de una reunión —datos generales, participantes, temas tratados, pendientes, conclusiones— y emite el
acta.

**No toca nada de lo que ya existe.** Ni `actividades`, ni su RLS, ni Stratix 360, ni el reporte de
pago. Cuatro tablas nuevas, un slug nuevo, un directorio nuevo. Se puede borrar entero con un
`DROP` y una migración de rollback sin que ningún otro módulo se entere.

Una vista, con el expediente adentro:

| Sección del expediente | Qué es |
|---|---|
| **Datos generales** | Empresa, título, tipo, fecha, hora, lugar, modalidad, quién preside, quién es secretario |
| **Participantes** | Internos (de `usuarios`) y externos (invitados sin cuenta), con asistencia |
| **Temas tratados** | Qué se trató: título y descripción. Sin dueño ni fecha — un tema no se completa |
| **Pendientes** | Lo que sale de cada tema: título, responsable, fecha comprometida, estado. Es la lista con casillas que Freddy llamó "checklist" |
| **Heredados** | Los pendientes abiertos de reuniones anteriores de la misma empresa |
| **Cierre** | Conclusiones, próxima fecha, y el acta imprimible |

---

## 2. Decisiones tomadas, y contra qué se decidieron

Cada una salió de una discusión concreta. Se anotan con su motivo porque una decisión sin motivo
se revierte sola dentro de tres meses.

### 2.1 Los temas son tabla propia, y el módulo no se conecta con `actividades`

**Esto invierte la decisión §2.1 del diseño anterior, por pedido explícito de Freddy.**

Lo que se trata en una reunión vive en `reunion_temas`, y lo que alguien se compromete a hacer vive
en `reunion_pendientes` (§3.5 y §3.6). Ninguna de las dos es una fila de `actividades`, ninguna
lleva FK a `actividades`, y `actividades` no gana ninguna columna. Juntas son, con menos campos, la
`meeting_topics` que proponía el spec de Freddy — partida en el tema y su consecuencia.

**El argumento a favor —y es bueno:** un módulo que no se conecta con nada se le puede asignar a
cualquier rol sin arrastrarle el dominio de marketing. Hoy `actividades` significa, de hecho,
"tarea de Stratix 360": conectar las reuniones a esa tabla obligaba a mudar el módulo entero y a
mover la RLS de la tabla con la que Angie trabaja todos los días. Eso desaparece.

**Lo que cuesta, dicho sin vueltas:** una tarea nacida en una reunión vive en un lugar distinto de
las tareas de Stratix. Quien tenga los dos módulos va a buscar "mis pendientes" en dos pantallas.
Es el precio de la decisión y está aceptado.

**Cómo se conecta el día que se quiera —y por qué no cuesta nada esperar:** se agrega
`actividades.reunion_pendiente_id` (FK nullable, `ON DELETE SET NULL`) más un botón "promover a
tarea" en el pendiente. Una columna y un handler. **No se agrega hoy ninguna columna preparatoria:** una
columna nullable que nadie escribe es peor que no tenerla, porque después nadie sabe si está vacía
porque no se usa o porque falló algo.

### 2.2 `asignado` no es un estado, y los valores son los que el repo ya usa

El spec propone cinco etapas: `nuevo · asignado · en_proceso · validacion · finalizado`. Pero
`asignado` no describe una etapa del trabajo: describe si el pendiente tiene responsable o no. Es un
**filtro derivado** (`responsable_id IS NULL`), no un dato que alguien elige.

`reunion_pendientes.estado` usa los mismos cuatro valores canónicos que `ESTADO` en
`src/shared/constants/domain.ts` — `Pendiente · En proceso · Por aprobar · Completado` — aunque las
dos tablas no se toquen:

| Spec | Acá |
|---|---|
| `nuevo` + `asignado` | `Pendiente`, con "sin responsable" como filtro |
| `en_proceso` | `En proceso` |
| `validacion` | `Por aprobar` |
| `finalizado` | `Completado` |

**Por qué los mismos valores si las tablas están desconectadas:** porque un tercer vocabulario para
"estado de algo que alguien tiene que hacer" es deuda gratis, y porque el día que se ejecute §2.1
—promover un pendiente a tarea— el mapeo es la identidad en vez de una tabla de traducción.

⚠️ **Hallazgo al verificar esto:** `actividades.estado` tiene un `CHECK` inline con **seis**
valores (`…, 'Rechazado', 'Cancelado'`, `20260612193730_remote_schema.sql:368`) mientras `ESTADO`
en TypeScript declara **cuatro**. Las dos mitades del catálogo no listan lo mismo, que es
exactamente lo que `rules/base-de-datos.md` prohíbe. No es de este módulo arreglarlo — va a
pendientes (§8.4).

### 2.3 El arrastre con historial queda fuera de esta fase

El spec construye toda su maquinaria alrededor de la **prórroga registrada**: `original_due`
inmutable, `due_date` vigente, contador de `extensions`, marca `is_final` de último plazo, y una
tabla `topic_reviews` con una fila por cada vez que una acción se retoma. Sobre eso monta la
línea de vida y el tablero de arrastres.

**Todo eso queda afuera por decisión explícita de Wagner.** No se implementa en esta fase y no se
agregan sus columnas "por si acaso", por el mismo motivo del §2.1.

Lo que **sí** se conserva de esa idea, y es la parte valiosa: **cerrar un acta no cierra sus
pendientes**. Un pendiente abierto reaparece en la reunión siguiente de su empresa. Eso no necesita
ninguna columna nueva — es una consulta (§3.7), y ahora que los pendientes son tabla propia es
**más simple** que en el diseño anterior: no hay que salir de las tablas del módulo.

Lo que se pierde sin `topic_reviews` es el **porqué** del arrastre: se ve que un pendiente lleva tres
reuniones abierto, pero no qué se decidió en cada una. Si más adelante hace falta, la tabla se
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

**Reusar catálogos no es conectarse.** Lo que Freddy vetó es que el módulo escriba en las tablas de
trabajo de otro módulo. Leer `empresas` y `usuarios` es lo que hacen los seis módulos que ya
existen: son la organización, no el dominio de nadie.

### 2.6 Módulo asignado, no acceso universal

El spec pide que **cualquier** persona autenticada entre al módulo. Acá el acceso se gatea con
`role_modules` + `has_module(slug)`, y el rol `sin_asignar` tiene cero módulos por diseño.

Se mantiene el modelo del repo: `reuniones` es un módulo normal que el admin asigna desde
`/admin` → Roles. **Y acá el desacople paga solo:** como el módulo no arrastra las tareas de
marketing, asignárselo a cualquier rol es gratis — que es justo lo que pedía Freddy con "que lo
use cualquiera". No hace falta ninguna migración que siembre el slug a roles existentes: el admin
lo reparte desde el panel el día que quiera.

### 2.7 `access_denylist` no se construye

El spec propone exclusiones explícitas por empresa que prevalecen sobre cualquier permiso. No hay
nada parecido en el repo y nadie lo pidió en la reunión. `has_module()` más la pertenencia
(participante, preside o secretario) cubren el caso real. Se agrega el día que exista el caso que
lo justifique, no antes.

### 2.8 Sin Server Actions: se sigue el patrón del repo

El spec especifica Server Actions con validación Zod en el borde. **Este repo no tiene ni una sola
Server Action.** Escribe por `src/shared/data/*` bajo RLS, y usa rutas API con `requireAdmin()` /
`requireModule()` sólo donde hace falta `service_role`.

Se sigue el patrón del repo. Introducir un segundo modelo de escritura para un solo módulo es
costo permanente de mantenimiento a cambio de nada.

### 2.9 El acta sale como HTML imprimible; el `.docx` es fase posterior

El spec pide Word con la librería `docx` y PDF con Puppeteer, ambos en servidor y desde la misma
plantilla. Puppeteer en Vercel arrastra un Chromium de decenas de megas y cold starts largos.

Se hace HTML con `@media print` — el navegador hace el PDF. El `.docx` editable queda para cuando
alguien lo pida de verdad.

**Y no se escribe de cero: el acta reusa el generador del reporte de pago.**
`features/stratix-mkt/utils/report-html/` ya resolvió las dos partes difíciles de una hoja
imprimible — el `style` inline obligado (se abre en otra ventana, sin acceso a las hojas de la
app) y el escapado de lo que viene de la base (un título con `<` rompía el HTML).

Lo compartible es el **armazón**, no la función: `<head>`, estilos base, escapado y pie se van a
`src/shared/utils/hoja-imprimible/`, y cada documento pone su cuerpo. El reporte de pago y el acta
salen de ahí. Sin eso, en tres meses hay dos plantillas con el mismo `<head>` copiado — el mismo
camino por el que aparecieron los tres `StatCard` del repo.

**Es lo único que este módulo toca de Stratix, y no contradice el desacople:** es una utilidad de
presentación que sube a `src/shared/`, exactamente lo que manda `rules/arquitectura.md`. No es una
lectura ni una escritura sobre `actividades`. Se hace **cuando el acta lo necesite** (fase 3), no
antes: hoy `report-html` tiene un solo consumidor, y partirlo en armazón + cuerpo con un solo uso
sería inventar el segundo caso.

### 2.10 `reunion_pendientes` se parece a `actividades`, y por eso se congela

La objeción es legítima y hay que contestarla acá, no en una conversación que se pierde:
`reunion_pendientes` tiene título, responsable, fecha y estado — **es `actividades` otra vez**. Es
el mismo argumento con el que el diseño del 28/08 se negaba a crear la tabla.

**El veredicto, y cuál es el argumento que lo sostiene.** La tabla aparte es correcta, pero **no**
por la forma de las columnas: por la RLS. `actividades` está gateada por `has_module('stratix-mkt')`,
así que meter los puntos de acta ahí deja exactamente dos salidas, y las dos son peores:

| Salida | Qué cuesta |
|---|---|
| Mover `actividades` a un slug nuevo | Es el refactor completo del diseño del 28/08: sacar el módulo de tareas de Stratix y migrar la RLS de la tabla con la que se trabaja todos los días, sin proyecto dev donde ensayarlo |
| Policy `has_module('stratix-mkt') OR has_module('reuniones')` | **Cualquiera con el módulo de reuniones pasa a ver todas las tareas de marketing.** Inaceptable, y encima es el tipo de error que no falla: funciona de más |

Una sola tabla **obliga** al refactor grande — no existe una versión chica de esa idea. Eso vale
con independencia del veto de Freddy: su pedido y la respuesta técnica coinciden, que es la mejor
señal de que la decisión no es sólo obediencia.

**Y el veredicto es condicional.** Se da vuelta el día que pase cualquiera de estas dos:

1. `reunion_pendientes` quiere crecer (prioridad, colaboradores, adjuntos, comentarios).
2. Alguien pide un Kanban de pendientes de reunión, o "mis pendientes en dos pantallas" empieza a
   doler de verdad.

Cualquiera de las dos significa que esto dejó de ser una lista dentro de un acta y se volvió un
gestor de tareas. Dos gestores de tareas no se sostienen: ahí toca Operaciones, no una columna más.

**Primero, el tamaño real de la superposición.** Verificado contra el esquema vivo
(`information_schema.columns`, no el dump de junio, que todavía lista `responsable_ref`, `area_id`
y `solicitado_por` — columnas que ya no existen). `actividades` tiene **veinte** columnas de
negocio, y **no** se parten en dos grupos sino en tres:

| Grupo | Columnas | |
|---|---|---|
| **Núcleo** — se repite | `titulo · descripcion · responsable_id · fecha_requerida · fecha_entrega · estado` | 6 |
| **Derivadas o muertas** — no deberían existir | `mes · trimestre · semana` (se derivan de la fecha) · `sheet_row` (resto de la migración del Sheet) · `dias_produccion` (a confirmar contra `horas`) | 5 |
| **Marketing de verdad** — no se repite | `empresa · horas · verificado · aprobado_por_id · fecha_aprobacion · notas_jefe · drive_url · bloqueada · solicitante_id` | 9 |

**La fila del medio es una corrección, y hay que dejarla escrita:** una versión anterior de esta
sección contaba "4 columnas contra 16 de contabilidad de marketing" y metía `mes`, `trimestre`,
`semana` y `sheet_row` en el lado de "marketing". Es falso, y además Wagner ya lo había marcado el
28/08: son datos derivados que sobran, y sólo siguen ahí porque el reporte de pago los usa. Usar
como argumento las columnas que uno mismo quiere borrar es exactamente la clase de justificación
circular que la revisión adversarial (§9.1) tiene que buscar.

**Con los números corregidos, la comparación honesta es 6 contra 9**, no 4 contra 16. Sigue siendo
una diferencia real —`verificado`, `aprobado_por_id`, `fecha_aprobacion` y `notas_jefe` son un
circuito de aprobación; `horas` es la nómina; `drive_url` es el entregable— y ninguna de esas nueve
tiene sentido en un punto de acta. Pero el margen es más fino de lo que decía antes, y de ahí que
la contención de más abajo sea la parte que importa, no el conteo.

**Segundo, y es lo importante: el problema de fondo no es esta tabla.** Es que `actividades` es
tres cosas a la vez —una tarea, una planilla de producción y un circuito de aprobación— y nunca se
partió. Mientras siga así, ningún otro módulo puede usarla sin heredar las tres. Eso es el proyecto
Operaciones, anotado en `.todo` y hoy sin pedir. Y limpiar las cinco derivadas es su primer paso,
más barato que el resto y útil aunque Operaciones nunca se haga (§8.6).

**Tercero, la regla que impide que esto se pudra:**

> **`reunion_pendientes` no crece.** Sus columnas son las de §3.6 y no se le agregan más.

Si algún día pide `prioridad`, colaboradores N:N, adjuntos, comentarios o un Kanban propio, **eso
no es una columna nueva: es la señal de que hay que unificar con `actividades`** — y entonces se
hace el trabajo de verdad, no se le pega un parche a la tabla espejo.

**Motivo:** un duplicado congelado se banca años sin molestar a nadie; un duplicado que crece se
convierte en un segundo gestor de tareas, con su propio Kanban y su propia noción de "mis
pendientes". Así aparecieron los tres `StatCard` del repo: nadie decidió tener tres, cada uno era
"un bloquecito parecido a aquel" en el momento de escribirlo.

**Y el vocabulario ya está alineado a propósito** (§2.2): los cuatro estados son los mismos, así
que el día que se unifique, la migración es un `INSERT INTO actividades (…) SELECT … FROM
reunion_pendientes` más la columna de §2.1 — no una tabla de traducción.

**Lo único que la gente va a sentir mientras tanto** es "mis pendientes" en dos pantallas. Cuando
moleste de verdad —no antes— se resuelve con una función de lectura en `src/shared/data/` que hace
los dos `SELECT` y concatena. Sin FK, sin vista, sin tocar ninguna RLS: **unificar la lectura no es
conectar las escrituras**, así que no contradice el desacople de §2.1.

---

## 3. Modelo de datos

Cuatro tablas nuevas. **Cero columnas agregadas a tablas existentes.**

### 3.1 `reuniones`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `codigo` | text UNIQUE | `MTG-{codigo empresa}-{AAAA}-{MMDD}-{NNN}`, por trigger. Inmutable |
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
| `acta_snapshot` | jsonb | Se escribe al CERRAR. Ver §3.4 |
| `created_by` | uuid FK → `usuarios` | |
| `created_at` / `updated_at` | timestamptz | |

Sobre el código: con los códigos reales de `empresas` queda `MTG-DACOACH-2026-0828-001`, más largo
que el `MTG-STX-…` del spec, que usa siglas de tres letras que este repo no tiene. Se decidió usar
los códigos del repo igual (§2.5): un segundo catálogo de siglas para que el acta se vea más
prolija es exactamente el error que el propio spec marca como riesgo alto. Si algún día molesta, se
agrega una columna `sigla` a `empresas` y el trigger la prefiere cuando exista.

### 3.2 `reunion_participantes`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reunion_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `usuario_id` | uuid FK → `usuarios` | NULL si es invitado externo |
| `invitado_nombre` / `invitado_empresa` | text | Sólo para externos |
| `rol_en_reunion` | text | Preside · Secretario · Participante · Invitado |
| `asistencia` | `public.asistencia` | DOMAIN: presente · ausente · invitado |

**No lleva `cargo` ni `departamento` congelados**, contra lo que pide el spec de Freddy. Ver §3.4.

### 3.3 Participantes externos

Un cliente o invitado externo **no tiene cuenta y no entra al módulo**: el login está restringido a
los dominios corporativos (`DOMINIOS_VALIDOS` en `src/shared/constants/domain.ts`). Se registra con
`usuario_id` NULL más `invitado_nombre` / `invitado_empresa`, y recibe el acta por correo cuando se
implemente esa parte (Resend ya está configurado).

**Un externo no puede ser responsable de un pendiente.** `reunion_pendientes.responsable_id` es FK a
`usuarios`, y así se queda: si un cliente tiene que hacer algo, el responsable es la persona
interna que responde por eso. Es la misma regla RN-10 del spec de Freddy, y es correcta.

Si algún día un cliente necesita **ver** su pipeline, eso es un tablero público para externos —
que el propio spec de Freddy pone fuera de alcance en su fase 2. Coincidimos.

### 3.4 La trazabilidad del acta: se congela el documento, no las columnas

El spec de Freddy pide copiar `cargo` y `departamento` dentro de `reunion_participantes` para que
el acta de 2024 siga diciendo lo que decía en 2024. El objetivo es correcto; el mecanismo no
funciona en este esquema:

- **`cargo` es multivaluado.** `usuario_cargos` es N:N con PK compuesta
  (`20260805203801_usuario_cargos_nn.sql`). Copiarlo a un `text` aplasta una lista en un string.
- **`departamento` no es una columna.** Se **deriva**: `usuario → equipo → departamento`.
  `20260805175453_estructura_equipos_cargos.sql` dropeó `usuarios.departamento_id` justamente
  porque era dato duplicado. Copiarlo sería replicar una derivación a mano.

El spec no podía saberlo: fue escrito sin conocer el esquema.

**En su lugar, la columna `acta_snapshot jsonb` de §3.1**, que se escribe al cerrar:

| Momento | De dónde sale el acta |
|---|---|
| Borrador y en curso | En vivo, por joins. El cargo se lista como la lista que es; el departamento se deriva del equipo |
| Cerrada | Del `acta_snapshot`. Inmutable |

Al cerrar se congela el documento entero: participantes con los cargos que tenían ese día, temas
con su estado y los nombres de marca de ese momento. El color de marca **no** entra al snapshot:
es presentación, no contenido del acta — si la marca cambia de color, el acta vieja se puede
repintar sin mentir. Es mejor que copiar dos columnas en cuatro cosas — soporta el multivaluado
sin aplastarlo, captura la derivación sin replicarla, congela **todo** el acta y no sólo dos
campos, y es una columna en vez de copias regadas por el esquema.

**Lo que cuesta, dicho:** un acta en borrador no tiene historia congelada (correcto: todavía no es
un documento), y preguntar "¿qué cargo tenía Angie en 2024?" pasa a ser escarbar jsonb.

**Y eso último marca un límite: el acta no es el sistema de registro del historial de cargos de
nadie.** Si esa trazabilidad hace falta de verdad, se resuelve con `usuario_cargos` ganando
`desde` / `hasta` — sirve a toda la app y es trabajo del módulo de organización, no de éste. Las
dos no se pelean: el snapshot ahora; si algún día existe la vigencia, el acta deja de ser la única
fuente.

### 3.5 `reunion_temas`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reunion_id` | uuid FK NOT NULL | ON DELETE CASCADE |
| `posicion` | int | Orden dentro del acta |
| `titulo` | text NOT NULL | |
| `descripcion` | text | Qué se dijo, qué se discutió |
| `created_at` / `updated_at` | timestamptz | |

**Un tema no tiene responsable, ni fecha, ni estado.** Un tema es *"de esto se habló"*: no se
completa ni vence. Lo que tiene dueño y fecha es lo que sale del tema, y eso vive en
`reunion_pendientes` (§3.6).

Sin `empresa` propia: la hereda de su reunión. Un tema no puede pertenecer a otra marca que la de
la reunión donde se trató, y una columna que siempre copia a su padre se desincroniza sola.

### 3.6 `reunion_pendientes`

Lo que alguien se comprometió a hacer. Es **la lista de tareas del módulo**, paralela a
`actividades` y desconectada de ella por §2.1.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `tema_id` | uuid FK NOT NULL | ON DELETE CASCADE. La reunión y la empresa se derivan por acá |
| `posicion` | int | Orden dentro del tema |
| `titulo` | text NOT NULL | |
| `responsable_id` | uuid FK → `usuarios` | NULL = sin asignar (§2.2) |
| `fecha_comprometida` | date | |
| `estado` | `public.estado_pendiente` NOT NULL DEFAULT `'Pendiente'` | DOMAIN con los cuatro valores de `ESTADO` (§2.2) |
| `completado_por_id` | uuid FK → `usuarios` | Se llena al pasar a `Completado`, se limpia al reabrir |
| `completado_at` | timestamptz | Idem |
| `created_at` / `updated_at` | timestamptz | |

**Por qué el dueño y la fecha viven acá y no en el tema.** Un acta real dice: *"Tema 3: landing de
EMC. Se discutió el enfoque. Angie hace el mockup para el 15/09; Freddy consigue los textos para el
05/09."* Un tema, dos compromisos, dos personas, dos fechas. Con el responsable en el tema eso no se
puede escribir: habría que partir el tema en dos y el acta empezaría a mentir sobre qué se trató.

**Y esto es lo que Freddy llamó "checklist".** Visualmente es eso —una lista con casillas debajo de
cada tema—, pero cada casilla tiene dueño y fecha, que es lo que la hace útil para el arrastre
(§3.7). Una casilla anónima no se puede reclamar.

`tema_id` es NOT NULL: todo pendiente salió de haber hablado de algo. Para anotar uno suelto se crea
antes su tema, aunque sea de una línea — es la disciplina del acta, y ahorra una segunda FK a
`reuniones` que habría que mantener consistente con la primera.

**Nota de alcance, para que no se pierda:** en el diseño anterior el checklist colgaba de
`actividades`, o sea servía para cualquier tarea del sistema. Con el desacople sirve sólo dentro de
una reunión. Si algún día se quiere checklist en las tareas de Stratix, es otra tabla o una
generalización — no sale gratis de ésta.

**Lo que NO existe: un tercer nivel.** Un pendiente no tiene sub-pasos. Si aparece el caso, es otro
tema con sus propios pendientes, no una tabla nueva.

### 3.7 Los heredados: una consulta, cero columnas

El bloque de "pendientes de reuniones anteriores" —lo que Freddy más quiere ver— no necesita
esquema:

```sql
-- pendientes abiertos de esta empresa, comprometidos en reuniones anteriores
SELECT p.*, t.titulo AS tema, r.codigo, r.fecha
FROM reunion_pendientes p
JOIN reunion_temas t ON t.id = p.tema_id
JOIN reuniones     r ON r.id = t.reunion_id
WHERE r.empresa = $empresa
  AND p.estado <> 'Completado'
  AND r.fecha < $fecha_de_esta_reunion
ORDER BY r.fecha;
```

**Se arrastra el pendiente, no el tema.** Es la diferencia práctica que justifica haber partido las
dos tablas: lo que queda debiendo es *"Angie no entregó el mockup"*, no *"volvamos a hablar del
landing"*. Arrastrando el tema entero, la lista de heredados se llena de conversaciones ya
terminadas.

Un pendiente heredado **no se copia** a la reunión nueva: se muestra desde donde está y se edita ahí
mismo. Copiarlo crearía dos filas para lo mismo y la pregunta "¿cuál es la de verdad?".

Lo que falta —el porqué de cada arrastre— es lo que quedó fuera en §2.3.

### 3.8 Enumeraciones

Los cuatro enums (`modalidad_reunion`, `estado_reunion`, `asistencia`, `estado_pendiente`) van como
`CREATE DOMAIN` con nombre, declarados arriba de las tablas en la misma migración, **no** como
`CHECK` inline (`rules/base-de-datos.md`). Cada uno lleva su objeto META en TypeScript con
`labelKey` y color; el valor canónico no se renderiza nunca.

`estado_pendiente` lista exactamente los cuatro valores de `ESTADO` (§2.2). Las dos mitades del
catálogo tienen que seguir listando lo mismo.

### 3.9 Lo que NO se crea

`companies`, `app_users`, `user_companies`, `access_denylist`, `topic_reviews`, `task_updates`,
`attachments`, `audit_logs`, `document_sequences`, `meeting_types`. Diez tablas del spec que este
diseño no necesita, por §2.3, §2.5 y §2.7.

Y **ninguna columna nueva en `actividades`**, por §2.1.

---

## 4. Permisos y RLS

### 4.1 El slug nuevo

`reuniones` se registra en `role_modules`. **No se siembra a ningún rol por migración:** el admin
lo asigna desde `/admin` → Roles a quien quiera. Como el módulo no arrastra datos de nadie, no hay
nada que se rompa por asignarlo de más ni nadie que pierda acceso por no tenerlo (§2.6).

La migración necesita al menos una fila en `role_modules` con este slug para que el `RAISE
EXCEPTION` de las policies no aborte; se siembra al rol `admin`, que ya ve todo por
`is_admin()`.

### 4.2 Las cuatro tablas

`reuniones`, `reunion_temas` y `reunion_pendientes` llevan policy `mod_access` con
`has_module('reuniones')`, generadas desde un `DO` block con el slug en una variable y el
`RAISE EXCEPTION` si no existe (`rules/base-de-datos.md`). El orden importa: **primero** el
`INSERT` en `role_modules`, después las policies — si no, la verificación aborta contra su propio
slug.

`reunion_participantes` va igual.

### 4.3 No hay migración riesgosa

**Y esto es lo mejor del desacople.** El diseño anterior movía la RLS de `actividades` de
`has_module('stratix-mkt')` a otro slug: una policy sobre la tabla con la que trabaja gente todos
los días, que al equivocarla no rompe — deja a alguien sin ver sus tareas, en silencio. Sin
proyecto Supabase dev, ese paso iba con backup y precheck como única red.

Ese paso **ya no existe**. La migración de este módulo sólo crea objetos nuevos: cuatro DOMAIN,
cuatro tablas, sus policies y una fila en `role_modules`. Un `db push` que sólo crea no puede
dejar a nadie sin ver lo que ya veía.

Sigue valiendo el backup previo de `roles` y `role_modules` de `rules/base-de-datos.md` —se escribe
una fila ahí—, pero el precheck de "qué roles se quedan sin acceso" no tiene a qué aplicarse.

### 4.4 Capacidades dentro del módulo

Sin tier Dirección (§2.4), quedan dos niveles y los dos ya existen:

- `is_admin()` — cerrar y reabrir actas de cualquiera, editar cualquier reunión.
- El resto — edita las reuniones donde preside o es secretario (sale de `reunion_participantes`, no
  de un rol nuevo), y cierra los pendientes donde es responsable.

Nunca se compara contra el nombre de un rol: los roles son dinámicos y el admin puede volver falsa
esa condición sin tocar código (`rules/codigo.md`).

---

## 5. Estructura de código

```
src/features/reuniones/
  components/     ← expediente, participantes, temas, pendientes, acta
  hooks/
  utils/          ← con sus .test.ts
  types.ts
  constants.ts    ← los META de los cuatro enums
src/shared/data/reuniones.ts   ← todas las consultas (rules/arquitectura.md)
src/app/(app)/reuniones/page.tsx  ← thin route
```

Nada fuera de ahí, salvo `src/shared/utils/hoja-imprimible/` en la fase 3 (§2.9).

---

## 6. Fases

Por requerimiento, no por fecha. Ninguna fase depende de una fecha de demo.

| Fase | Alcance | Cómo se verifica |
|---|---|---|
| **1** | Migración (4 DOMAIN + 4 tablas + RLS + slug) y el expediente: datos generales y participantes, internos y externos | Se crea una reunión con participantes y se ve en `/reuniones`; un rol sin el módulo no la ve |
| **2** | Temas y pendientes | Se levanta un acta completa de principio a fin sin salir de la pantalla |
| **3** | Heredados (§3.7) + acta imprimible + `acta_snapshot` al cerrar | Cerrar un acta no cierra sus pendientes, y los abiertos reaparecen en la reunión siguiente. El acta cerrada no cambia si después se renombra un cargo |
| **4** | *(a confirmar)* El arrastre con historial: `topic_reviews`, línea de vida, último plazo, tier Dirección | — |
| **5** | *(a confirmar)* Notificaciones, envío del acta por correo, adjuntos, auditoría, `.docx` editable | — |
| **—** | *(a confirmar, §2.1)* Conexión con `actividades`: `reunion_pendiente_id` + "promover a tarea" | — |
| **—** | *(proyecto aparte)* Módulo Operaciones: sacar la gestión de tareas de Stratix 360 | — |

**Hasta dónde llega este documento, dicho sin vueltas:** las fases **1 a 3 están diseñadas** — su
modelo de datos, su RLS y sus decisiones están en las secciones de arriba, contrastadas contra
este repo. Las fases **4 y 5 están nombradas, no diseñadas**: salen del spec de Freddy, que sí las
describe en detalle, pero **no fueron revisadas contra este esquema** como sí lo fue el resto. Ya
apareció una vez lo que pasa cuando se da eso por sentado — el congelado de `cargo` y
`departamento` de §3.4 sonaba razonable en el spec y no funciona acá.

Cuando toque una de ellas, lleva su propio pase de diseño antes de escribir código. Lo que hay
acá es el alcance, no el plan.

**Lo que se ganó con el desacople:** desaparecieron las dos fases más caras y más riesgosas del
diseño anterior —el corte del cordón entre las vistas y `useStratix()`, y la mudanza del módulo
de tareas con su RLS— que juntas no agregaban una sola funcionalidad. Este módulo empieza
directamente por lo que Freddy pidió.

---

## 7. Lo que este diseño se compromete a cumplir del repo

No es una lista aspiracional; es contra lo que se revisa.

- **Tests donde se cuenta.** Toda función que sume, cuente o decida qué entra en un total lleva su
  `.test.ts` (`rules/codigo.md`). Acá aplica a los heredados (§3.7) y al armado del `acta_snapshot`.
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
- **`<select>` obligatorio con placeholder vacío** (`rules/ui.md`): el expediente tiene seis
  desplegables obligatorios y es exactamente el caso que ya rompió dos veces en este repo.
- **`frontend-design` y `accessibility` antes de escribir la pantalla**, no después
  (`rules/ui.md`).
- **Antes de decir que funciona:** `npx tsc --noEmit`, `npx vitest run`, y abrirlo en el navegador
  — y si no se abrió, se dice que no se abrió.

---

## 8. Preguntas abiertas

Ninguna bloquea el arranque de la fase 1.

1. **`prioridad` en los pendientes.** El spec la pide (`baja · media · alta · critica`). Es una columna
   con su DOMAIN y es barata, pero nadie la pidió en la reunión. Se decide al empezar la fase 2.
2. **Colaboradores de un pendiente.** El spec los tiene como N:N. Este diseño tiene `responsable_id` y
   nada más. Fase posterior si aparece el caso.
3. **Historial de cargos con vigencia.** `usuario_cargos` con `desde` / `hasta` resolvería la
   trazabilidad de verdad y para toda la app, no sólo para las actas (§3.4). Está fuera del
   alcance de este módulo — es trabajo del módulo de organización. Si algún día se hace, el
   `acta_snapshot` deja de ser la única fuente, pero no estorba.
4. **El desfase de `actividades.estado`** (§2.2): seis valores en el `CHECK` de la base contra
   cuatro en `ESTADO`. No es de este módulo, pero alguien tiene que decidir si sobran dos valores
   en la base o faltan dos en el catálogo. Anotado en `.todo`.
5. **Qué se le dice a Freddy.** Su spec son nueve a diez semanas y este diseño descarta diez de
   sus tablas. Conviene que se entere por una conversación y no por el código. La buena noticia es
   que el desacople que él pidió acerca este diseño al suyo: los temas vuelven a ser entidad
   propia, como él proponía.
6. **Las columnas derivadas de `actividades`** (§2.10, fila del medio). `mes`, `trimestre` y
   `semana` se derivan de la fecha; `sheet_row` es un resto de la migración del Google Sheet;
   `dias_produccion` hay que confirmarlo contra `horas`. Wagner las marcó como sobrantes el
   28/08 y sólo siguen ahí porque el reporte de pago las usa.

   **Esta pregunta estaba en el spec del 28/08 y se perdió al reescribirlo**, con el agravante de
   que §2.10 después las usó como argumento a favor de la tabla separada. Vuelve, y con más peso
   que antes: mientras sigan ahí, cualquier comparación entre `actividades` y otra tabla de tareas
   está inflada por columnas que nadie defiende.

   No es trabajo de este módulo —Reuniones no toca `actividades`— pero es el primer paso del
   proyecto Operaciones y el más barato: sacar `sheet_row` no rompe nada, y `mes`/`trimestre`/
   `semana` salen el día que el reporte de pago las calcule con `localMonth()` en vez de leerlas.
   Anotado en `.todo`.

---

## 9. Pendientes antes de escribir la primera línea de código

Decididos el 28/08/2026, revisados el 29/08 tras el veto. **No ejecutados.**

### 9.1 Revisión adversarial de este documento

Este documento **no fue revisado por nadie más que quien lo escribió**. Antes de pasarlo a plan de
implementación, someterlo a una revisión adversarial —varios agentes buscando huecos por separado—
que busque específicamente: supuestos sobre el esquema que no se verificaron contra la base, casos
del spec de Freddy que se descartaron sin argumento suficiente, y decisiones que se justifican
entre sí en círculo.

**Motivo:** el congelado de `cargo` y `departamento` (§3.4) sonaba perfectamente razonable y no
funcionaba en este esquema. Lo agarró Wagner leyendo, no el proceso. Un documento de este tamaño
tiene más de uno de esos.

**Se corre sobre ESTA versión, no sobre la del 28/08.** Auditar los párrafos de una decisión
volteada es pagar por revisar texto que ya se borró.

### 9.2 Los dominios de login se van a la base

`DOMINIOS_VALIDOS` es hoy un array en `src/shared/constants/domain.ts`. Es **política de la
empresa**, no una constante de código: cambia cuando entra una marca nueva al grupo, y hoy
cambiarla exige un deploy. Va a una tabla administrable desde `/admin` → Organización, al lado de
`empresas`.

Entra en este trabajo porque el módulo toca justo eso: participantes externos (§3.3) son
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

**Deja de ser parte del plan.** En el diseño anterior entraba porque la fase 0 ya movía vistas a
`src/shared/`; sin esa fase, barrer los tres `StatCard` del repo (`accounting`, `admin`,
`research`) es un trabajo aparte que no tiene por qué viajar con este módulo. Queda anotado en
`.todo`, no acá.

Lo que **sí** aplica a este módulo es la mitad preventiva de `rules/componentes.md`: cada bloque
de markup nuevo se busca antes de escribirlo, y si ya existe se unifica y sube a `src/shared/`.

### 9.5 Qué reglas nuevas necesita `rules/`

Sin analizar todavía. Este módulo va a producir convenciones que hoy no están escritas —cómo se
arma una hoja imprimible, qué se congela en un snapshot y qué no, cuándo una constante baja a la
base— y `rules/proceso.md` pide que una regla nueva nazca con su check en el mismo commit.
Revisar al cerrar cada fase, no al final.
