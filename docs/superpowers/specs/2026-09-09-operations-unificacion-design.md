# `operations` — Reuniones y tareas son un solo módulo

**Fecha:** 2026-09-09
**Invierte:** §2.1 y §2.10 del diseño del 29/08 (`2026-08-29-reuniones-design.md`)
**Restituye parcialmente:** el diseño del 28/08, vivo en la rama `feat/modulo-operaciones` — su
módulo único vuelve, su tratamiento de los temas no (§2.2).

**Dos rondas de revisión adversarial** (09/09): la primera con dos pasadas, la segunda con cuatro
—modelo de datos, esquema↔UI, contradicciones internas y arte previo—, ninguna informada de lo que
había encontrado la anterior. ⚠️ marca dónde una objeción cambió una decisión.

---

## 1. Qué cambió para que esto se pueda hacer

El diseño del 29/08 dejó reuniones desconectada de `actividades` por un veto explícito de Freddy
(*"reuniones es aparte, que no se conecten con actividades por el momento"*). Ese veto está
**levantado**: Wagner lo habló con Freddy y quedaron en que reuniones y tareas son parte de un
mismo ciclo — se acuerda en una reunión, se ejecuta como tarea, se revisa en la siguiente.

Y el terreno cambió solo. El 03/09 `actividades` salió de Stratix y quedó en `/tasks`, un módulo
de toda la empresa. **El argumento principal de §2.10 para no unificar era la RLS**: `actividades`
estaba gateada por `has_module('stratix-mkt')` y meter reuniones ahí adentro las encerraba en
marketing. Ese argumento ya no existe.

⚠️ **Pero no todos los argumentos de §2.10 murieron con ése.** El de fondo —`actividades` es
*"una tarea, una planilla de producción y un circuito de aprobación"* a la vez, y nunca se partió—
sigue vivo, y este diseño **no lo resuelve**: le agrega un cuarto rol, el de compromiso de acta.
Es una deuda aceptada a sabiendas; partir `actividades` es un refactor propio.

Queda un tercer hecho, y es el que abarata la fase entera:

> **`reunion_temas` y `reunion_pendientes` tienen 0 filas en producción** (verificado contra la
> base viva el 09/09, no contra un dump). Hay 3 reuniones cargadas y ningún tema. No hay
> migración de datos: `reunion_pendientes` se borra.

---

## 2. Decisiones, y contra qué se decidieron

### 2.1 Un solo módulo, un solo slug: `operations`

`tasks` y `reuniones` dejan de ser dos módulos. Hay uno, con slug **`operations`**, y reuniones es
su quinta pestaña.

**Motivo:** dos módulos eran dos gates, y dos gates para el mismo ciclo producen la pregunta que
mató al diseño anterior — *"¿qué ve del acta alguien que participó de la reunión pero no tiene
tareas?"*. Con un módulo la pregunta no existe para el acceso al módulo.

⚠️ **Lo que esto NO resuelve.** Escribí *"si ves el acta es porque tenés el módulo, así que ves las
actividades"*. La implicación real corre al revés:

| Tabla | Quién ve una fila |
|---|---|
| `reuniones` | `has_module` **Y** (admin **o** creador **o** participa **o** misma empresa) — `20260830204042:61-69` |
| `actividades` | `has_module`, y nada más — `20260903235201:32` |

Al volver los pendientes filas de `actividades`, **el contenido de un acta reservada queda visible
para todo el que tenga `operations`**. Es la regresión que §2.7 del diseño del 29/08 se escribió
entera para evitar. **Diferido a pedido de Wagner el 09/09** y anotado en el `.todo`: la fase sale
sin esa cláusula de RLS, y la regla vive mientras tanto en la cabeza de la gente.

⚠️ **Lo que sí se resuelve acá, porque lo abre esta fase:** `temas` es una tabla nueva, y una policy
`USING has_module('operations')` dejaría **los títulos de todo asunto tratado** —incluidos los de un
acta reservada— visibles para todo el módulo. Eso no es deuda heredada, es un agujero que abriría
esta migración, y por eso `temas` se lee por reunión, no por módulo (§3.1).

El nombre no es cosmética. El slug vive en `role_modules` (`text NOT NULL`, sin FK, nadie lo
valida), en el catálogo de permisos, en la ruta, en las claves i18n, en las policies de
`actividades` **y en el ámbito de los filtros** (§4). Por eso la migración lleva el
`RAISE EXCEPTION` que exige `rules/base-de-datos.md`: un slug mal escrito **no falla, se vuelve
invisible**, y es invisible justo para el admin que lo prueba.

### 2.2 Los pendientes SON actividades; los temas no

`reunion_pendientes` se borra. Lo que alguien se compromete a hacer en una reunión es una fila de
`actividades`.

**Los temas no se van con ellos.** Un tema es *lo que se trató* — no algo que alguien deba hacer,
no tiene responsable ni estado ni horas. Convertirlo en actividad (como proponía el diseño del
28/08) obligaría a inventar el estado "tratado" y a que un punto informativo apareciera en un
Kanban. Sí cambian de forma, pero por otro motivo: §2.3.

**Motivo:** es la salida que la propia regla del centinela dejó escrita. El Motivo de
*«`reunion_pendientes` no crece»* dice que si la tabla pedía prioridad, colaboradores, adjuntos,
comentarios o un Kanban propio, *"eso no es una columna nueva: es la señal de que dejó de ser una
lista dentro de un acta y se volvió un gestor de tareas — y dos gestores de tareas no se
sostienen"*. La señal llegó antes de la primera columna.

**Y coincide con el arte previo.** En OpenProject el compromiso de una reunión **es** un work
package, no una entidad paralela; Fellow, que sí los tiene aparte, paga el precio de sincronizar
dos registros contra Jira con 2-way sync. Notion documenta lo contrario —bases separadas unidas por
relación—, que es la postura que esta fase descarta.

**Lo que se cobra sin trabajo extra:** cuatro de los cinco costos que §2.1 del 29/08 aceptaba.

| Costo declarado el 29/08 | Después de unificar |
|---|---|
| 1. Las tareas de reunión viven en otra pantalla | Misma tabla, mismo Kanban |
| 2. No hay pantalla de "mis pendientes" | Es el Dashboard de `/operations` filtrado por responsable |
| 3. Las horas no entran al reporte de pago | `actividades.horas` alimenta el reporte; entran solas |
| 4. Las notificaciones quedarían muertas | ⚠️ **No se cobra solo** — ver abajo |
| 5. El checklist no sirve al resto del sistema | Es el checklist de `actividades` |

⚠️ **La fila 4 estaba mal, y arreglarla son tres piezas, no una.**
`notif_insert_modulo` está gateada por `has_module('stratix-mkt')` a secas
(`20260829210325:139-142`), el `await` de `useActividadForm/index.ts:105-106` no mira su error, y
`NotificationsBell/index.tsx:40` hace `router.push(modulePath('stratix-mkt'))` **con el literal
hardcodeado** — así que el aviso que sí llegue lleva a `AccessDenied`. `medico_investigacion` —el
rol que §2.5 incorpora— no tiene Stratix. Las tres entran en la fase, y la policy queda en
`operations OR stratix-mkt`, no en `operations` a secas: si no, se reintroduce el mismo bug girado
para quien tenga sólo Stratix.

### 2.3 Un tema atraviesa reuniones: `temas` N:N `reuniones`

**Corrige el modelo de la fase 1, por planteo de Wagner el 09/09.** Hoy `reunion_temas.reunion_id`
es `NOT NULL`: un punto pertenece a un acta y a ninguna otra. Con eso, "Presupuesto Q4" tratado en
cinco reuniones son **cinco títulos repetidos sin nada que los una**.

Se parte en dos, y cada mitad del texto va donde le corresponde:

```
temas          "Presupuesto Q4"                     el asunto — el título, que es el mismo siempre
  ↕ N:N
reunion_temas  reunion_id + tema_id + posicion       EL TRATAMIENTO — la descripción, que es
               + descripcion                          distinta en cada reunión
reuniones      "Reunión del 8/09"
```

**Motivo:** el título describe el asunto y la descripción describe *qué se dijo ese día*. Tenerlos
en la misma fila obligaba a elegir cuál de las cinco versiones del texto imprime cada acta. Es la
misma partición que usan los modelos de agenda publicados, donde el ítem sólo exige `description`.

Se evaluó una tercera entidad `asuntos` por encima de `reunion_temas`, y Wagner la rechazó con
razón: era el mismo dato dos veces.

⚠️ **`temas` es un catálogo administrado, scopeado por empresa.** Tres objeciones convergen acá:

- sin normalizar el título, *"Presupuesto Q4"*, *"presupuesto q4"* y *"Presupuesto Q4 "* son tres
  asuntos, y la historia que esta sección quiere unir se rompe con el primero tipeado →
  `UNIQUE (empresa, lower(btrim(titulo)))`;
- ⚠️ **un catálogo global fuerza a fusionar homónimos**: el "Presupuesto Q4" de EMC y el de
  Servi-Net serían **el mismo asunto** y la historia unificada mezclaría dos historias. El arte
  previo scopea el asunto recurrente a la serie de reuniones; acá el equivalente disponible es la
  empresa, que es lo que `reuniones` ya lleva. De ahí la `empresa` en el `UNIQUE`;
- con `ON DELETE RESTRICT` y sin pantalla de gestión, un tema mal escrito quedaría para siempre e
  inborrable → columna `activo`, y quien lo creó puede corregirlo mientras el acta esté abierta
  (§3.1), no sólo el admin.

⚠️ **Administrarlo NO es gratis, y decir "no hay que escribir un CRUD nuevo" era falso.**
`OrgManager` busca con `r.nombre.toLowerCase() || r.codigo.toLowerCase()` y `OrgCard` pinta
`row.nombre`, los dos **no opcionales** en `OrgRow` (`loadAppData.ts:106-117`). `temas` tiene
`titulo` y no tiene `codigo`: la búsqueda revienta y la tarjeta sale sin nombre. Adaptarlo toca
`OrgCat`, `ORG_CATALOGS`, `OrgCatalogs`+`fetchOrg`, `orgRepo`, `api/admin/org/[cat]` y el array
`tabs` de `SUB_ITEMS.admin` — **un sexto lugar** que la lista de "cinco lugares" no cubre.

Y en el acta, un **buscar-o-crear**: se escribe el título, y si no existe se ofrece crearlo. Ese
componente **no existe** — `CatalogoSelect` es un `<select>` sobre catálogo fijo, y su propio
comentario declara ese techo.

**Cuesta cero en datos:** `reunion_temas` tiene 0 filas en prod. Es partir una tabla vacía.

### 2.4 El vínculo tarea↔acta es una tabla asociativa, no dos columnas

⚠️ **Reemplaza entero al §2.4 anterior, que ponía `reunion_id` y `reunion_tema_id` en
`actividades`.** La revisión de arte previo encontró que esa forma estaba sobre la cardinalidad
equivocada, y las otras tres pasadas —sin saberlo— encontraron **cinco fallas graves, todas en esas
dos columnas**:

1. `UPDATE actividades SET reunion_id = NULL` desvinculaba **sin control alguno**, con el acta
   cerrada y sin ser nadie.
2. El `DELETE` de una tarea no lo cubría ningún trigger.
3. Al mover una tarea del acta A a la B se validaba **sólo B**: quien preside B podía sacar la
   tarea del acta cerrada A.
4. `payloadDeActividad` manda el payload **completo con nulls por diseño** (`payload.ts:6-8`), así
   que **editar el título de una tarea desde el Kanban mandaba `reunion_id: null`** y el trigger le
   tiraba `RAISE EXCEPTION` a cualquiera que no presidiera con el acta abierta.
5. Las dos FK sobre `reunion_id` más el `CHECK` podían **abortar el borrado de una reunión**, según
   el orden de disparo de los triggers de integridad referencial, que Postgres no garantiza.

```
temas  ↔ reuniones          vía reunion_temas             el TEMA atraviesa reuniones (§2.3)
actividades ↔ reunion_temas vía reunion_tema_actividades   la TAREA atraviesa tratamientos
```

Una tarea acordada en el tratamiento del 1/09 y **revisada** en el del 8/09 son dos filas del
puente, con `rol` `'origen'` y `'revisada'`. Eso es literalmente la frase con la que abre §1 —*"se
acuerda en una reunión, se ejecuta, se revisa en la siguiente"*— que el modelo anterior no podía
representar: o se pisaba `reunion_id` y se perdía el origen, o el acta de seguimiento no listaba la
tarea. Es además lo que hace OpenProject, donde la pestaña "Meetings" de un work package lista
**todas** las reuniones donde fue tratado.

**El beneficio que no se ve venir: el trigger desaparece entero.** Con el vínculo como fila propia,
*"el acta escribe el vínculo"* es una **policy de RLS** con la misma forma que `reunion_temas_write`
— sin `SECURITY DEFINER`, sin `TG_OP`, sin leer `OLD`. El `DELETE` queda cubierto porque es el
borrado de una fila, y el caso A→B se valida solo, porque cada fila se valida por su cuenta. Con
ella se van también el `CHECK`, el `UNIQUE (id, reunion_id)`, la FK compuesta y todo el análisis de
`MATCH SIMPLE`: ese problema no existía.

**El precio, dicho de frente:** el puente cuelga del **tratamiento**, así que una tarea nacida en
una reunión necesita un punto del orden del día — el *"Varios"* de cualquier acta. Y una consulta
lleva un join más.

### 2.5 Dar `operations` a `medico_investigacion` lo vuelve liquidable, y se acepta

`role_modules` hoy reparte así:

| slug | roles |
|---|---|
| `reuniones` | `admin`, `medico_investigacion` |
| `tasks` | `admin`, `stratix360` |

`operations` recibe **la unión de los no-admin**: `stratix360` y `medico_investigacion`.

⚠️ **`admin` no lleva fila, y las de hoy se borran.** `getModulesForRole` corta por short-circuit y
le devuelve todos los módulos tenga filas o no; la migración de roles dinámicos lo dice textual
—*"'admin' NO lleva filas, sembrarlas sería data muerta"*— y `20260829221511` lo respeta borrando
la suya. Además, como la PK de `role_modules` es `(role_key, module_slug)` y `admin` tiene **hoy**
fila de `reuniones` *y* de `tasks`, un `UPDATE ... SET module_slug='operations'` **colisiona con la
PK**. Va `INSERT` de los dos roles reales + `DELETE` de las filas viejas, no un `UPDATE`.

Que `medico_investigacion` gane el módulo significa que entra al `<select>` de responsables **y** al
de la hoja de pago, porque `deriveMiembrosAsignables` produce las dos listas de una sola condición.
**Decidido por Wagner el 09/09: que entre.** Se descartó romper el acople asignable/liquidable: es
una tarea propia.

### 2.6 Un compromiso puede nacer sin responsable

⚠️ **`actividades.responsable_id` pasa a nullable.** Hoy es `NOT NULL`, y el `<select>` sale de
`deriveMiembrosAsignables`, que filtra por tener el módulo (`team-derivations/index.ts:38-41`).
Pero los participantes de un acta son **cualquier usuario, y también externos**
(`features/reuniones/types.ts:37-46`). Un acta de EMC con alguien de cobranzas, o con un invitado,
no podría registrar su compromiso: `crearActividad` corta con `assigneeRequired`.

**Decidido por Wagner el 09/09.** Es además lo que `reunion_pendientes` permitía, y devuelve el
filtro derivado *"sin responsable todavía"* que §2.2 del 29/08 modelaba y que se iba a perder.

Toca: el `NOT NULL` (las 429 filas lo tienen cargado, así que el `DROP NOT NULL` no mueve datos),
el guard de `useActividadForm`, y tolerar el `null` en `datosPorMiembro`, `resumenHoras` e
`idsTeam`. Una tarea sin responsable **no aparece en ninguna hoja de pago**, que es lo correcto.

La otra consecuencia del mismo tipo: el modal debe pedir **`fecha_inicio`**, que es `NOT NULL` con
default `CURRENT_DATE`. Si queda al default, una tarea acordada el 30/09 para empezar en octubre
**se imputa a septiembre en la hoja de pago**. Y `empresa` es obligatoria y debe caer en una de las
siete con `recibe_actividades`.

### 2.7 `fecha_entrega_original` entra como columna; el historial no la reconstruye

`actividades` gana `fecha_entrega_original date`, y `fecha_entrega` pasa a llamarse
`fecha_entrega_final`. **El par se nombra junto porque se lee junto.**

Es el patrón *baseline vs actual* de la gestión de proyectos: MS Project copia la fecha programada
al guardar la línea base y deriva la varianza; PMI define el baseline como *"la versión aprobada que
sólo puede cambiarse por control de cambios formal"*. Jira no lo tiene y en Asana la práctica es un
campo custom "original Due Date".

| Cuándo | Qué pasa | `fecha_entrega_final` | `fecha_entrega_original` |
|---|---|---|---|
| 1/09, en la reunión | "los banners para el 15" | `15/09` | `15/09` ← se copia sola |
| 14/09 | no llegó, se corre | `22/09` | `15/09` |
| 21/09 | tampoco | `30/09` | `15/09` |

⚠️ **La versión anterior de este trigger inventaba datos, y lo dijeron las tres pasadas.** La rama
`ELSIF OLD.fecha_entrega_original IS NULL` disparaba en el **primer `UPDATE` de cualquier fila
vieja** —y como el payload va completo, alcanzaba con cambiar el título— congelando como "original"
el plazo **vigente**. Si ese primer `UPDATE` *era* la postergación, guardaba la fecha ya corrida y
§2.10 daba **false justo en la fila que sí se postergó**. La guarda correcta mira
`OLD.fecha_entrega_final IS NULL`: sólo se congela cuando se pone la **primera** fecha, que es lo
que hacía falta porque `fecha_entrega` es nullable y una tarea puede nacer sin plazo.

**Las 429 filas existentes quedan en `NULL` y no se backfillean:** no hay de dónde sacar el dato. La
consecuencia hay que decirla: *"se postergó"* sólo se puede afirmar de las tareas nacidas después de
esta fase.

⚠️ **El re-baseline queda AFUERA, y es una corrección contra mí mismo.** El arte previo tiene razón
en que congelar para siempre hace que una **replanificación acordada** se lea como postergación
(MS Project ofrece once líneas base, PMI asume control de cambios). Pero la versión que escribí
—"se re-congela sólo desde un acta abierta"— obligaba al trigger de la fecha a **consultar
`reunion_tema_actividades`** para autorizarlo, y con eso contradecía a §2.4: la lógica del vínculo
volvía a un trigger por la puerta de atrás. Y encima se escapaba igual, porque
`fecha_entrega_final` es nullable: borrarla desde el Kanban y volver a ponerla entra por la rama
del primer plazo y re-estampa el original.

Entonces: la fecha original se congela y punto. La consecuencia queda dicha — `final > original`
mide *"cambió el plazo"*, no *"alguien incumplió"*, y en una reunión esa diferencia la pone la
gente, no la columna. El re-baseline con control de cambios es una fase propia (§6).

**Ninguna de las fechas que ya existen sirve** (inventario verificado el 09/09):

| Columna | Qué es |
|---|---|
| `fecha_inicio` | `date NOT NULL`, default `CURRENT_DATE`. El **período de imputación del reporte de pago**. No es un vencimiento |
| `fecha_entrega` → `fecha_entrega_final` | El plazo vigente. Dibuja el Gantt, "próximas entregas" y el badge *vencida*. Se pisa entera en cada `UPDATE` |
| `fecha_requerida` | Muerta: ningún formulario la escribe desde el 03/09. No se toca en esta fase |
| `fecha_aprobacion` | Un renglón de la ficha |
| `created_at` | Cuándo entró la fila. En las 251 migradas dice *abril de 2026*, no cuándo se acordó el trabajo |

**Motivo de que sea una columna y no una consulta:** `log_cambio_actividad` registra **sólo**
`estado` y `verificado` (`20260612193730:179`). No registra la fecha de entrega, así que el plazo
original **no es derivable del historial**. La alternativa —extender ese trigger, como
`log_reunion()` ya hace con `fecha_comprometida`— daría todas las postergaciones, pero **`historial`
es admin-only**: un dato que sólo el admin lee no se muestra en una tarjeta. No compiten; el trigger
de auditoría queda para otra fase.

### 2.8 El acta escribe el vínculo; la tarea no escribe el acta

Las tareas se crean y se editan **desde el modal del tratamiento**, con la reunión abierta. Vincular
una tarea a un punto, moverla o despegarla se hace desde el acta y sólo mientras está abierta.

Con §2.4 eso **es una policy**, no un trigger: `reunion_tema_actividades` se escribe si presidís, sos
secretaria o creaste el acta, y la reunión está abierta — la misma condición que
`reunion_temas_write` (`20260830204042:91-96`). El `SELECT` va por la reunión, igual que
`reunion_temas_select`.

**Un efecto secundario a favor:** `reunion_pendientes` necesitaba una tercera policy sólo para que
el responsable pudiera actualizar su pendiente con el acta cerrada. Unificados eso es gratis —
**cerrar el acta congela el acta, no las tareas**: la tarea vive en `actividades` y sigue su ciclo
normal en el Kanban.

### 2.9 Cerrar un acta no existe hoy, y la policy actual lo hace imposible

**Hallazgo del 09/09, verificado:** la transición `borrador → en_curso → cerrada` **no está
implementada en ninguna parte**. La capa de datos no manda `estado` nunca
(`src/shared/data/reuniones/reuniones.ts:16` lo dice textual): **toda acta nace `'borrador'` y muere
`'borrador'`**. El `CHECK acta_cerrada_tiene_snapshot` es un candado sin llave — `acta_snapshot` no
la escribe nadie y la RPC `cerrar_reunion(id)` que el diseño del 29/08 mandaba escribir nunca se
escribió.

**Por qué obliga a implementarlo acá:** toda §2.8 se apoya en `reunion_abierta()`, que hoy devuelve
**siempre true**. Cualquier guard que se apoye en ella no muerde nunca — la misma forma del
incidente del 29/08, donde las policies estaban escritas y la RLS apagada.

⚠️ **Y no alcanza con escribir la RPC: la policy actual impide cerrar.** `reuniones_update` se
recreó **sin `WITH CHECK`** (`20260830204042:73-78`), y en Postgres una policy de `UPDATE` sin
`WITH CHECK` usa el `USING` **también para validar la fila nueva**. El `USING` exige
`estado <> 'cerrada'`, así que para todo el que no sea admin **`SET estado='cerrada'` es imposible**:
la fila nueva no pasa su propio check. Cerrar les fallaría exactamente a presidente y secretaria,
que son quienes el diseño dice que cierran. La RPC va `SECURITY DEFINER` con la verificación de
permisos adentro, que además es lo que ya hace `admin_reassign_and_delete`.

Entran tres piezas:

1. **La RPC `cerrar_reunion(id)`**, `SECURITY DEFINER` con `SET search_path`, que verifica
   `preside_o_secretaria() OR creo_la_reunion()`, arma el `acta_snapshot` y pasa el estado, todo en
   la misma transacción.
2. **El botón de cerrar** en el expediente, que hoy **ni siquiera muestra el `estado`** — sólo lo
   pinta el badge del listado.
3. **La reapertura, sólo por admin y con `ConfirmModal`** (`destructive` + `confirmPhrase`, que ya
   existe tal cual). **Va en el expediente, no en `/admin`**: `/admin` no tiene listado de reuniones
   y la decisión es contextual al acta abierta.

### 2.10 El estado "postergado" no entra

§2.2 del diseño anterior lo dejó *"para decidir al empezar la fase 2"*. Se decide: **no**.

**Motivo:** agregarlo significa tocar el `CHECK` de `actividades`, que ya declara seis valores
contra los cuatro de `ESTADO` en TypeScript — deuda anotada y no de este módulo. Y un pendiente
postergado se distingue por dato: `fecha_entrega_final > fecha_entrega_original`, con las dos
salvedades de §2.7 (las filas viejas en `NULL`, y el re-baseline acordado en reunión).

---

## 3. Esquema

### 3.1 El tema sube a su propia tabla

```sql
CREATE TABLE public.temas (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  empresa    text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  titulo     text NOT NULL,
  activo     boolean NOT NULL DEFAULT true,
  creado_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
-- `btrim` además de `lower`: sin él "Presupuesto Q4 " entra como un asunto distinto.
CREATE UNIQUE INDEX temas_unicos_por_empresa
  ON public.temas (empresa, lower(btrim(titulo)));

ALTER TABLE public.reunion_temas
  ADD COLUMN tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE RESTRICT,
  DROP COLUMN titulo,
  ADD CONSTRAINT reunion_temas_unicos UNIQUE (reunion_id, tema_id);
```

`ON UPDATE CASCADE` en `empresa` por el mismo motivo que `actividades_empresa_fkey`: el `codigo` de
una empresa es editable desde `/admin`. `ON DELETE RESTRICT` en `tema_id` a propósito: borrar un
asunto ya tratado reescribiría un acta pasada — para eso está `activo`.

⚠️ **`temas` nace con RLS, y su `SELECT` no es por módulo.** Una tabla nueva de `public` recibe
`GRANT ALL` a `anon` por defecto en Supabase —está el precedente literal en el dump
(`GRANT ALL ON TABLE public.reunion_pendientes TO anon`)—, así que sin esto sería lectura y
escritura anónima. Y un `USING has_module(...)` filtraría los títulos de las actas reservadas
(§2.1), así que se lee **por la reunión**, igual que `reunion_temas`:

⚠️ **La visibilidad se escribe, no se hereda por accidente.** La versión anterior decía *"se ve un
tema si existe algún tratamiento suyo"* y confiaba en que la subconsulta pasara por la RLS de
`reunion_temas`. Es cierto que pasa —una policy se evalúa con los permisos de quien invoca—, pero
dejarlo implícito hace que la confidencialidad de un acta reservada dependa de un detalle que nadie
ve al leer la policy. Se escribe una función con el mismo predicado que `reuniones_select`, de la
familia de `creo_la_reunion()`: `SECURITY DEFINER` con `search_path` fijo, que lee `reuniones`
salteando su propia policy —si no, se llamaría a sí misma— y **sirve para las tablas hijas, no para
`reuniones`**, por la advertencia de `20260830204042:33-37`.

⚠️ **El `DO $$` va etiquetado, y los dos dólares anidados separados.** La versión anterior de este
bloque **no compilaba**, y se reprodujo contra el Postgres local: `syntax error at or near "f$"`.
El lexer hace *longest match* del delimitador — al llegar a `$q$$f$` consume `$q`, retrocede un `$`
y encuentra `$$`, que **es la apertura del `DO`**: el bloque termina ahí y el resto es basura. Por
eso el `DO` lleva etiqueta (`$do$`) y los cierres anidados no se tocan.

```sql
DO $do$
DECLARE slug text := 'operations';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  -- El predicado de `reuniones_select`, en un solo lugar, para que las hijas no lo copien.
  -- `has_module` envuelto en (SELECT …) para que sea InitPlan una sola vez, como en
  -- `20260821212925:82`: si no, corre por fila.
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.puedo_ver_reunion(p_reunion uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $q$
      SELECT (SELECT public.has_module(%L)) AND EXISTS (
        SELECT 1 FROM public.reuniones r
         WHERE r.id = p_reunion AND (
           public.is_admin()
           OR r.created_by = public.usuario_actual_id()
           OR public.participa_en_reunion(r.id)
           OR public.misma_empresa_reunion(r.id)))
    $q$ $f$, slug);

  EXECUTE 'ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL ON public.temas FROM anon';
  -- Los GRANT NO son opcionales: `20260821212925:62` lo dice textual. Sin ellos la tabla queda
  -- inaccesible con 42501 y la pestaña sale vacía, sin que nada explique por qué.
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.temas TO authenticated';
  EXECUTE 'GRANT ALL    ON public.temas TO service_role';

  -- Un tema se ve si se puede ver ALGUNA de las reuniones donde se trató — dicho entero, no
  -- delegado a la RLS de `reunion_temas`. O si nadie lo trató todavía y lo creaste vos, que es
  -- el hueco entre escribir el título y guardar el punto. Nunca "todos los temas del módulo".
  EXECUTE $f$
    CREATE POLICY temas_select ON public.temas FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.reunion_temas rt
         WHERE rt.tema_id = temas.id AND public.puedo_ver_reunion(rt.reunion_id))
      OR creado_por_id = public.usuario_actual_id())$f$;

  -- El alta NO entra por acá: entra por la función de §3.1.1. Esta policy existe para que esa
  -- función no sea la única defensa, y ata `creado_por_id` a quien escribe — si no, un NULL deja
  -- la fila inmodificable salvo admin, y cualquiera puede sembrarla con el id de otro.
  EXECUTE format($f$
    CREATE POLICY temas_insert ON public.temas FOR INSERT
      WITH CHECK ((SELECT public.has_module(%L))
                  AND creado_por_id = public.usuario_actual_id())$f$, slug);

  -- Corregir un tema mientras el acta donde se trató siga abierta. Sin el EXISTS, el creador
  -- podía reescribir el título de un asunto tratado en actas CERRADAS — y como el título es
  -- N:N, eso reescribe las cinco a la vez.
  EXECUTE $f$
    CREATE POLICY temas_update ON public.temas FOR UPDATE
      USING (public.is_admin() OR (creado_por_id = public.usuario_actual_id() AND (
        NOT EXISTS (SELECT 1 FROM public.reunion_temas rt WHERE rt.tema_id = temas.id)
        OR EXISTS (SELECT 1 FROM public.reunion_temas rt
                    WHERE rt.tema_id = temas.id AND public.reunion_abierta(rt.reunion_id)))))
      WITH CHECK (public.is_admin() OR creado_por_id = public.usuario_actual_id())$f$;
END $do$;
```

El slug va **en una variable** y la migración aborta si no existe — `rules/base-de-datos.md`. La
versión anterior lo tenía hardcodeado dos veces, y el check no lo agarraba porque es de archivo.

#### 3.1.1 El alta de un tema es una función, no un `INSERT`

⚠️ **El `UNIQUE` es un oráculo, y el `INSERT` desde el cliente no puede funcionar.** `temas_select`
esconde el tema de un acta reservada; el índice único **no**. Al tipear ese título el usuario recibe
`duplicate key value violates unique constraint` — que le **confirma la existencia** del asunto que
la policy le oculta, y lo deja en punto muerto: no lo ve para reusarlo ni lo puede crear. Es la
misma clase de fuga que §2.1 dice cerrar. Y sin `RETURNING` legible, el
`.insert().select().single()` aborta con *"new row violates row-level security policy"* — el bug
literal que documenta `20260830204042:9-14`.

Por eso el alta va por `tema_para_acta(p_reunion uuid, p_titulo text) RETURNS uuid`,
`SECURITY DEFINER` con `search_path` fijo, que: verifica que quien llama pueda escribir esa acta,
toma la `empresa` **de la reunión** —lo que de paso resuelve que nada obligaba a que
`temas.empresa` fuera la del acta—, busca por `(empresa, lower(btrim(titulo)))`, y devuelve el `id`
existente o crea. Un solo camino, sin oráculo y sin carrera: el `ON CONFLICT … DO UPDATE SET
titulo = EXCLUDED.titulo RETURNING id` resuelve los dos usuarios simultáneos que hoy chocarían con
un 23505 crudo.

### 3.2 El puente tarea↔tratamiento

```sql
CREATE TABLE public.reunion_tema_actividades (
  reunion_tema_id uuid NOT NULL REFERENCES public.reunion_temas(id) ON DELETE CASCADE,
  actividad_id    uuid NOT NULL REFERENCES public.actividades(id)   ON DELETE CASCADE,
  -- 'origen': nació ahí. 'revisada': se retomó en esa reunión. Es el arrastre de la fase 3,
  -- que con esto no necesita esquema nuevo.
  rol             text NOT NULL DEFAULT 'origen' CHECK (rol IN ('origen','revisada')),
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (reunion_tema_id, actividad_id)
);
CREATE INDEX ON public.reunion_tema_actividades (actividad_id);
-- Una tarea nace UNA sola vez; puede revisarse muchas.
CREATE UNIQUE INDEX una_sola_origen
  ON public.reunion_tema_actividades (actividad_id) WHERE rol = 'origen';
```

`ON DELETE CASCADE` en las dos FK, y es lo correcto para un puente: borrar el punto del acta borra
**el vínculo**, no la tarea; borrar la tarea borra el vínculo, no el acta. No hay `SET NULL` que
ordenar, ni `CHECK` que pueda abortar un `DELETE`.

Su RLS, con la forma de `reunion_temas` (§2.8):

```sql
ALTER TABLE public.reunion_tema_actividades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reunion_tema_actividades FROM anon;

-- Explícito por el mismo motivo que `temas_select`: el vínculo dice qué tarea salió de qué acta,
-- así que su visibilidad es la del acta, dicha entera y no heredada de la RLS de `reunion_temas`.
CREATE POLICY rta_select ON public.reunion_tema_actividades FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.reunion_temas t
           WHERE t.id = reunion_tema_id AND public.puedo_ver_reunion(t.reunion_id)));

CREATE POLICY rta_write ON public.reunion_tema_actividades FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.reunion_temas t
     WHERE t.id = reunion_tema_id
       AND (public.preside_o_secretaria(t.reunion_id) OR public.creo_la_reunion(t.reunion_id))
       AND public.reunion_abierta(t.reunion_id)))
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.reunion_temas t
     WHERE t.id = reunion_tema_id
       AND (public.preside_o_secretaria(t.reunion_id) OR public.creo_la_reunion(t.reunion_id))
       AND public.reunion_abierta(t.reunion_id)));
```

El `WITH CHECK` va **explícito** aunque repita el `USING`: es la lección de §2.9 — una policy de
escritura sin `WITH CHECK` valida la fila nueva con el `USING`, y eso se vuelve una trampa.

### 3.3 `actividades`: el renombre, la fecha y el `NOT NULL`

```sql
ALTER TABLE public.actividades
  ADD COLUMN fecha_entrega_original date,
  ALTER COLUMN responsable_id DROP NOT NULL;         -- §2.6
```

⚠️ **El renombre va en su propia migración y DESPUÉS del deploy del código.** Migración y deploy son
pasos separados acá (`db push` a mano, Vercel por merge). Si la columna se renombra antes de que el
bundle nuevo esté sirviendo, **toda lectura de `actividades` devuelve 42703 en producción** durante
la ventana. El orden es: (1) el código lee y escribe `fecha_entrega_final` a través de una vista o
alias, (2) deploy, (3) el renombre. La alternativa —aceptar la ventana— sólo sirve si se hace fuera
de horario y se dice.

```sql
-- Migración aparte, paso 3.
ALTER TABLE public.actividades RENAME COLUMN fecha_entrega TO fecha_entrega_final;
ALTER INDEX public.idx_actividades_fecha_ent RENAME TO idx_actividades_fecha_entrega_final;
```

Verificado que el renombre **no arrastra vistas**: ninguna de las tres (`v_equipo_hoy`,
`v_kpis_globales`, `v_produccion_responsable`) toca `fecha_entrega`.

El trigger del baseline (§2.7):

```sql
CREATE OR REPLACE FUNCTION public.congelar_fecha_entrega_original()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.fecha_entrega_original := NEW.fecha_entrega_final;
    RETURN NEW;
  END IF;
  -- Se congela cuando se pone la PRIMERA fecha, no la primera vez que se toca la fila: si
  -- mirara `fecha_entrega_original IS NULL`, el primer UPDATE de una fila vieja estamparía como
  -- "original" el plazo ya corrido. Y como el payload va completo, alcanzaba con editar el título.
  -- Sólo se congela la PRIMERA vez que hay plazo. Después es de piedra: no consulta el vínculo
  -- con el acta ni a nadie — ese trigger no existe (§2.4) y el re-baseline quedó afuera (§2.7).
  IF OLD.fecha_entrega_original IS NULL AND OLD.fecha_entrega_final IS NULL THEN
    NEW.fecha_entrega_original := NEW.fecha_entrega_final;
  ELSE
    NEW.fecha_entrega_original := OLD.fecha_entrega_original;   -- revierte, no rechaza
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fecha_entrega_original BEFORE INSERT OR UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.congelar_fecha_entrega_original();
```

Es el **único** trigger nuevo sobre `actividades`: el del vínculo se fue con §2.4.

### 3.4 El `DROP` y lo que arrastra

```sql
DROP TABLE public.reunion_pendientes;
DROP DOMAIN public.estado_pendiente;      -- queda huérfano con la tabla
```

- `log_reunion()` tiene una rama entera para `reunion_pendientes` (`20260830011448:45-54`). Al
  borrar la tabla queda muerta, y en Postgres **una función no se parchea, se vuelve a declarar
  completa**. ⚠️ Y de paso hay que arreglar lo que ya estaba mal: **`log_reunion()` nunca tuvo
  trigger sobre `reunion_temas`**, así que el tratamiento —que a partir de ahora carga la
  descripción del acta— queda **sin auditoría**. Se le agrega.
- Quedan filas de `historial` con `tabla='reunion_pendientes'` sin destino. No se borran (es el
  rastro), pero hay que saberlo.
- En TypeScript queda muerto `EstadoPendiente` (`features/reuniones/types.ts:15`).
- Verificado que `admin_reassign_and_delete` **no** se rompe: menciona la tabla sólo en un
  comentario.

**Rollback:** `supabase/rollback/operations-unificacion-rollback.sql`, escrito **antes** del push,
con el `CREATE TABLE` de `reunion_pendientes`, su dominio, sus tres policies y el `titulo` de
`reunion_temas`. Que hoy haya 0 filas hace el rollback trivial.

---

## 4. Permisos, RLS y lo que el slug arrastra

### 4.1 Qué slug muere, cuál nace y cuál se queda

De los diez de `modulos/slugs.ts` quedan nueve:

| Slug | Qué le pasa | Por qué |
|---|---|---|
| `tasks` | **se renombra** a `operations` | Es el mismo módulo con más superficie |
| `reuniones` | **desaparece** | Se absorbe: pasa a ser una pestaña |
| `stratix-mkt` | **se queda tal cual** | Stratix 360 sigue existiendo: Social Media, Competitors y Team |
| los otros siete | intactos | No los toca nada |

Que `stratix-mkt` sobreviva no es falta de limpieza: el 03/09 se sacaron **las tareas** de Stratix,
no Stratix. Y sigue en el `OR` de la policy de `actividades` por el contador de `RosterCard`.

⚠️ **Qué policies nombran un slug, de verdad:**

| Tabla | Hoy | Después |
|---|---|---|
| `actividades` | `tasks OR stratix-mkt` | `operations OR stratix-mkt` |
| `reuniones` (`_select`, `_insert`) | `reuniones` | `operations` |
| `notificaciones` | `stratix-mkt` | `operations OR stratix-mkt` (§2.2) |
| `temas`, `reunion_tema_actividades` | — | nuevas (§3.1, §3.2) |

**`reunion_temas` no aparece en esa lista, y la versión anterior decía que sí.** Ninguna de sus
policies nombra un slug: `reunion_temas_select` es un `EXISTS` sobre `reuniones`
(`20260829221511:170-172`) y `reunion_temas_write` tampoco lo menciona (`20260830204042:91-96`).
Tampoco `reuniones_update` ni `reuniones_delete`. Heredan el gate por la reunión.

### 4.2 La migración

⚠️ **El orden adentro de la migración no es libre.** La regla exige que una migración con
`has_module` aborte si el slug no existe en `role_modules`. Para un slug **nuevo** esa guarda se
invierte: si las policies corren primero, el `RAISE EXCEPTION` dispara **contra su propio slug** y la
migración se aborta a sí misma. Primero las filas, después las policies, en la misma transacción.

1. `role_modules`: **`INSERT`** de `('stratix360','operations')` y
   `('medico_investigacion','operations')` — enumerados, no copiados con un `SELECT` — y **`DELETE`**
   de las filas de `tasks` y `reuniones`, incluidas las de `admin` (§2.5). No un `UPDATE`: choca con
   la PK.
2. Las policies de `reuniones` pasan a `operations`; la de `actividades` cambia `tasks` por
   `operations` y **conserva `stratix-mkt`**; la de `notificaciones` pasa a
   `operations OR stratix-mkt`.
3. Las tablas nuevas con su RLS (§3.1, §3.2).

⚠️ **4. El slug es también el ámbito de los filtros.** `useFilters(MODULE.TASKS, actFilters)` usa el
slug como `ambito`, y ese ámbito separa las filas de `vistas_filtro` (`ambito='tasks'`). Sin
migrarlo, cada vista guardada del PR #68 desaparece del desplegable **sin un error**:

```sql
UPDATE public.vistas_filtro SET ambito = 'operations' WHERE ambito = 'tasks';
```

**Sobre las claves de columna que guarda adentro:** `act-filters/grupos/fechas.ts:11` declara
`key: 'fecha_entrega'`, y esa clave se persiste en `valores` (jsonb) y `ocultos` (text[]). ⚠️ Pero
**es un identificador de UI, no un nombre de columna** — el filtro aplica un predicado en JS. O sea
que renombrar la `key` es **una elección**: si se deja como está, no hay nada que migrar y no se
rompe nada. Se deja.

⚠️ **El localStorage no se migra, y el shim que proponía la versión anterior no funcionaba.** La
clave real no es `filtros:tasks` sino **`eminat:<userId>:filtros:tasks`** (`useUserPreference.ts:19`)
y el `userId` llega recién cuando `AppContext` resuelve el perfil. Y `TASKS_TAB_PREF` es
`'tab-tasks'` (`constants/tabs/index.ts:21`), una constante **que no deriva del slug**: no hay nada
que migrarle. Se acepta la pérdida de la preferencia local de filtros —vuelve al default en el
primer ingreso— y se dice en la nota del PR.

**El precheck del 29/08 aplica entero.** La RLS se verifica consultando como `anon` y con un rol sin
privilegios, no leyendo el esquema. Y `db push` aplica **todas** las migraciones pendientes —
`migration list --linked` antes.

---

## 5. UI

Reuniones entra como **quinta pestaña** de `/operations`. `/reuniones` deja de existir como ruta
—con **redirect** a `/operations?tab=reuniones`— y el sidebar muestra un solo ítem.

Los cinco lugares del catálogo de permisos cambian juntos, **más un sexto** para el catálogo de
`temas` en `/admin` (§2.3), más ~20 claves i18n nuevas entre temas, cierre y reapertura.

⚠️ **El tamaño real del trabajo.** Hoy no existe **ni un archivo** de temas: `grep -rn
"reunion_temas"` en `src/` da **cero**. No hay repo, ni hook, ni tipo, ni componente. El único
precedente comparable es la mesa de participantes de la fase 1 — **5 componentes + `useParticipantes`
+ 2 utils + 62 claves i18n**, y eso para *una* tabla. Acá son tres.

**El modal del tratamiento es donde nacen las tareas, y es el paso central.** Al crear o editar un
punto se cargan sus tareas en la misma pantalla: título, responsable (que ahora puede ir vacío,
§2.6), `fecha_inicio`, fecha comprometida y horas. Cada línea es un `INSERT` en `actividades` **más**
uno en `reunion_tema_actividades`.

Seis piezas que la revisión encontró faltando:

1. **El buscar-o-crear de `temas`** (§2.3). Pieza nueva; `CatalogoSelect` no sirve.
2. ⚠️ **El formulario de tarea no se reusa tal cual, y no alcanza con el hook.** `useActividadForm`
   es **un estado singleton por provider** —un modal a la vez—, y además `ActivityCampos` /
   `ActivityPlanificacion` **leen `nuevaAct` del contexto**, no de props. "Cada línea es un `INSERT`"
   necesita N estados: son el hook **y** los tres componentes de campos.
3. ⚠️ **`ReunionesListado` monta su propio `AppShell` + `PageTransition`**, que `ModuloTabs` ya
   monta. Como pestaña hay que sacárselos.
4. ⚠️ **Montar reuniones en `TasksProvider` se lo cobra Stratix.** `StratixModule` monta el mismo
   provider y los hooks se componen **incondicionalmente**: un `useReuniones()` ahí dispararía
   fetches en `/stratix-mkt`. El hook va detrás de una condición.
5. ⚠️ **`PanelKey` es una unión literal** usada como `panel="tasks"`: el renombre toca `NAV`,
   `PANEL_META`, `SUB_ITEMS` y el tipo.
6. **El routing mínimo.** `useSearchParams` tiene **cero ocurrencias en todo `src/`**: el expediente
   es un `Modal` abierto por `useState` y una reunión nunca tuvo URL. Entra `?tab=reuniones&reunion=<id>`,
   que además es lo que hace posible el redirect y los enlaces del punto 7.
7. ⚠️ **La ficha de una tarea no muestra "su" reunión: muestra la lista.** Con el puente de §2.4 una
   tarea puede haberse tratado en varias —una con `rol='origen'` y las demás `'revisada'`—, así que
   el renglón es una **lista de reuniones con su fecha y su punto**, no un enlace. Es la pestaña
   "Meetings" de OpenProject, y es lo que hace visible el ciclo desde el lado de la tarea.

**El cierre del acta** (§2.9) suma el botón en el expediente —que primero tiene que mostrar el
`estado`— y la reapertura por admin con `ConfirmModal`.

Verificado que degrada bien: `LAST_MODULE_KEY` valida con `isModuleSlug`, así que ante el slug
muerto el atajo del Launchpad **desaparece en vez de romperse**.

**La unificación de carpetas entra, como paso final de la fase.** `src/features/tasks/` pasa a
`src/features/operations/` y `src/features/reuniones/` se muda adentro. Va último a propósito: es un
diff de renombres que taparía el trabajo de esquema y de UI si fuera primero.

---

## 6. Lo que NO entra en ninguna de las seis fases

- **El re-baseline con control de cambios** (§2.7). Sale porque su única implementación posible
  hacía que el trigger de la fecha consultara el vínculo con el acta, contradiciendo a §2.4. Es una
  fase propia el día que la métrica de postergación moleste de verdad.

- **La cláusula de confidencialidad en la RLS de `actividades`** (§2.1). Diferida por Wagner el
  09/09, anotada en el `.todo`. Es la deuda más grande que la fase deja abierta.
- **El acta imprimible** — sigue siendo fase 3. El **arrastre**, en cambio, ya no necesita esquema
  nuevo: es una fila más en el puente con `rol='revisada'` (§2.4).
- **Romper el acople asignable/liquidable** (§2.5). Tarea propia.
- **Partir `actividades`** en sus tres (ahora cuatro) roles. El argumento de fondo de §2.10 del
  29/08 sigue vivo (§1).
- **El motor de filtros aplicado a reuniones.** Quedó hecho para `/tasks` en el PR #68 y debería
  reutilizarse acá; se decide cuando la pestaña esté en pantalla.
- **Extender `log_cambio_actividad` a las fechas** (§2.7). Mejora de auditoría independiente.
- **El botón "promover a tarea"** que dibujaba §2.1 del 29/08: no hace falta. Un pendiente nace ya
  siendo tarea.

---

## 7. Deuda que esta fase produce, y hay que pagar en ella

- **La regla del centinela *«`reunion_pendientes` no crece»* queda huérfana** cuando la tabla se
  borra. Vive en el repo de datos del usuario, no en el código, así que no la agarra ningún gate:
  hay que borrar la sección a mano.
- **El CLAUDE.md miente en tres lugares** apenas esto se mergee: la tabla de módulos, el párrafo de
  `deriveMiembrosAsignables` y el árbol de `src/`. Se corrige en la misma rama.
- **Cero tests del cierre.** Los **siete** archivos de test del módulo son de utils puros; ninguno
  toca RLS ni triggers. Las tres piezas de §2.9 nacen con la cobertura que se les escriba acá.
- **`src/features/tasks/types.ts` tiene una DEUDA anotada** (re-exporta `Actividad` sin ser un
  index) que la mudanza de carpeta toca por contacto. No se paga acá: **21 archivos** traen
  `Actividad` desde ahí — lo dice el propio comentario del archivo; 29 importan algún tipo de ese
  módulo.

---

## 8. Esto no es una fase: son seis, y van sueltas

**Decisión de Wagner del 09/09, después de tres rondas de revisión.** Cada ronda encontró fallas
graves **nuevas**, y ninguna repetida. Eso dejó de ser un dato sobre los revisores: el documento
describe seis cambios con riesgos independientes, y acoplarlos en un solo despliegue multiplica
las formas de romper producción sin que nada avise.

Cada fase lleva **su migración, su rollback, su PR y su verificación**, y se despliega sola.

| # | Fase | Qué desbloquea | Su riesgo propio |
|---|---|---|---|
| **1** | **La fusión de los módulos**, con convivencia | Todo lo demás | El apagón: no hay orden seguro migración↔deploy (§8.1) |
| **2** | `temas` N:N + `tema_para_acta()` + el catálogo en `/admin` | El orden del día | El oráculo del `UNIQUE`, la RLS, el CRUD que no se adapta solo |
| **3** | El puente tarea↔acta + el modal del tratamiento + **la absorción de `reuniones`** | El ciclo completo | Dos `INSERT` no transaccionales con policies distintas |
| **4** | El cierre del acta (RPC, botón, reapertura) | Que `reunion_abierta()` signifique algo | La policy sin `WITH CHECK`; la RPC saltea toda la RLS |
| **5** | `fecha_entrega_original` + el renombre | La métrica de postergación | Expand/contract sobre 48 ocurrencias en 21 archivos |
| **6** | La mudanza de carpetas | Cerrar la deuda | 119 archivos, 54 imports absolutos internos |

⚠️ **`responsable_id` nullable se mudó de la 6 a la 3** (preflight del 09/09). El modal del
tratamiento tiene que poder registrar un compromiso de alguien que no es asignable —es la razón por
la que §2.6 existe—, así que la fase 3 lo necesita y la 6 lo tenía último. Un conflicto de orden
del propio diseño. Cuesta un `DROP NOT NULL` más en la 3.

⚠️ **Y `pnpm db:rls` NO verifica lo que este documento decía que verifica.** Lee
`pg_class.relrowsecurity` y nada más: **cero `SET ROLE`, cero comprobación de `GRANT`**. O sea que
da verde exactamente en el punto ciego del incidente del 31/08 —vistas sin `security_invoker`
puenteando la RLS— y no reemplaza a consultar como `anon`. Donde este diseño decía "se verifica
con `pnpm db:rls` como `anon`", hay que leer: **hace falta una prueba que de verdad asuma otro rol**
(`SET ROLE anon` en psql, o un JWT real contra PostgREST).

⚠️ **Las seis fases se despliegan JUNTAS, al final** — decisión de Wagner del 09/09. Se sigue
partiendo el trabajo (cada fase con su migración, su revisión y sus commits), pero producción se
toca una sola vez, cuando reuniones ya esté adentro y `operations` signifique de verdad
operaciones. Mientras tanto todo se prueba en local.

**Lo que eso NO elimina, y conviene que quede escrito:** la maquinaria de convivencia de la fase 1
sigue haciendo falta. No era por tener varios deploys — era porque **migración y deploy son dos
pasos separados en este proyecto** (`db push` a mano, Vercel por merge), y ese hueco existe aunque
se mergee todo junto. Los dos órdenes siguen rompiendo: migraciones primero deja al bundle viejo
sin `tasks` y encima viéndolo a `operations`, que no conoce; deploy primero deja al código pidiendo
un slug que la base no tiene. La secuencia final sigue siendo **pushear la apertura → mergear y
desplegar → pushear el cierre**, una sola vez.

⚠️ **«Ordenadas entre la apertura y el cierre» NO se logra con el timestamp, y ésa era la
instrucción anterior.** `db push` aplica **todo lo pendiente de un viaje**, y el archivo del cierre
ya está en `supabase/migrations/`: pushear la apertura aplicaría apertura + fase 2 + **cierre**,
junto. Y al revés, las fases 3 a 6 van a nacer con timestamp *posterior* al cierre, que es
exactamente lo contrario de lo que hace falta.

**Decisión de Wagner del 09/09: el archivo del cierre se re-fecha al final.** Justo antes del
despliegue, se renombra con el timestamp más alto de todos, para que sea **la última que se
aplica** — que es lo que su contenido exige: retira el slug viejo cuando ya no queda nada que lo
use. Hasta entonces, ninguna fase tiene que preocuparse por dónde cae su timestamp.

Consecuencia a manejar una vez: en local va a figurar aplicada con el nombre viejo, así que hay que
reconciliar `supabase_migrations` a mano el día del renombre. Es un `UPDATE` de una fila y va en el
runbook del despliegue final.

⚠️ **La absorción de `reuniones` es de la fase 3, y hasta el 09/09 no era de nadie.** La fase 1 la
difirió "a la fase 3" al descubrir que borrar el slug con `src/app/(app)/reuniones/` viva deja
`moduleForPath` en `null` y `ModuleGate` **pasa con `null` por diseño** — la pantalla habría quedado
sin gate. Pero esta tabla nunca se lo asignó a nadie: quedó huérfana entre las dos. Lo encontró la
planificación de la fase 2, al preguntarse por qué su gate necesitaba nombrar dos slugs.

**Consecuencia mientras tanto:** hasta que la 3 la absorba, `reuniones_select` sigue gateada por el
slug `reuniones` —que en producción es de `medico_investigacion`, un rol que **no** tiene
`operations`—, así que **toda policy nueva que sirva a las actas tiene que nombrar los dos slugs**
(`operations OR reuniones`). Con uno solo, quien usa las actas no ve nada y sin ningún error.

**Por qué ese orden.** La 1 es la única que las demás necesitan: hasta que exista `operations`, todo
lo que se escriba apunta a un slug que va a morir. La 4 tiene que ir antes que la 3 esté en manos de
la gente —si no, el gate de "acta abierta" de las policies del puente no restringe nada, que es la
forma del incidente del 29/08—, pero después de la 2, porque no hay acta que cerrar sin temas. La 5
y la 6 son independientes de todo y van últimas por ser las más caras y las menos urgentes.

### 8.1 La fase 1 necesita convivencia, y esto no estaba en ninguna versión anterior

⚠️ **No hay un orden seguro entre la migración y el deploy, y los dos apagan la app sin un error.**

- **Migración primero:** el `DELETE` de las filas `tasks`/`reuniones` deja al bundle viejo pidiendo
  `MODULE.TASKS`; `getModulesForRole` devuelve `'operations'`, que el `isModuleSlug` viejo rechaza
  → el módulo desaparece del Launchpad y `/tasks` cae en `AccessDenied`.
- **Deploy primero:** `has_module('operations')` da `false` porque las filas todavía no existen.

Entonces la fase 1 son **tres migraciones**, no una:

1. **1A — abrir.** `INSERT` de `operations` **sin borrar nada**, y las policies pasan a
   `operations OR tasks` / `operations OR reuniones`. La app vieja sigue andando.
2. **1B — deploy.** El bundle nuevo pide `operations`, que ya existe.
3. **1C — cerrar.** `DELETE` de las filas viejas y las policies quedan en `operations` solo.

Y tres cosas más que la fase 1 tiene que llevar sí o sí:

- ⚠️ **`db push` aplica cada archivo en su propia transacción**, así que cada migración va envuelta
  en su `BEGIN/COMMIT` y `migration list --linked` se mira antes.
- ⚠️ **Editar roles en `/admin` durante la convivencia revienta**: `roleValidation` rechaza
  `'operations'` como slug desconocido, y la ruta **borra todas las filas antes de insertar**. El
  catálogo de TypeScript tiene que conocer los dos slugs mientras dure 1A→1C.
- ⚠️ **La enumeración de roles es una foto y se resuelve contra la base viva al momento del push.**
  Ni las migraciones ni local cuentan la historia. Verificado el 09/09 contra las dos bases:

  | `module_slug` | local | **prod** |
  |---|---|---|
  | `reuniones` | admin, **stratix360** | admin, **medico_investigacion** |
  | `tasks` | admin, stratix360 | admin, stratix360 |

  En prod `admin` tiene fila de `reuniones` **y** de `tasks` aunque `20260829221511:205` borre la
  suya — alguien la repuso desde `/admin`. Por eso el `UPDATE ... SET module_slug` choca con la PK.
  El catálogo `roles` sí coincide en las dos bases (los mismos 8), así que el `INSERT` no viola la
  FK en local y la migración **se puede ensayar** — pero el ensayo **no prueba el resultado en
  prod**, porque el estado de partida es otro: en local `medico_investigacion` gana el módulo desde
  cero, en prod lo hereda de `reuniones`.

- ⚠️ **El `DELETE` va por `module_slug`, no enumerando roles.** Ahí es justo donde el drift muerde:
  una fila que existe en prod y no en local se escapa de una lista escrita a mano. La regla del
  repo pide enumerar **a quién se le da** el módulo —el `INSERT`—; el borrado por slug es
  determinista y da lo mismo en las dos bases.

### 8.2 Lo que no se puede probar antes, y con qué se reemplaza

No hay tier `development`: cada migración va de local a prod sin ensayo. Queda sin poder probarse
(a) las policies contra los roles reales, porque local no tiene los usuarios de Auth; (b) el apagón
de §8.1, que sólo existe con bundle viejo contra base nueva; (c) el trigger del baseline contra las
429 filas históricas; y (d) el `DROP TABLE` con datos reales.

Los sustitutos, que entran como trabajo de la fase 1:

- una cuenta sembrada **por rol real** en `e2e/seed.ts` (`stratix360`, `medico_investigacion`,
  `sin_asignar`) y su `e2e/roles.spec.ts` — probar con el admin no prueba nada, porque
  `has_module()` abre con `is_admin() OR …`;
- `pnpm db:rls` consultando **como `anon`**, no leyendo el esquema — la lección del 29/08 y del
  punto ciego de las vistas del 31/08;
- y para el apagón: **correr el bundle de `main` contra la base local ya migrada.** Es la única
  forma de ver esa falla antes de causarla.
- Un `SELECT count(*)` sobre `reunion_pendientes` y `reunion_temas` en el precheck, **que aborte si
  no da cero**: "0 filas" es un corte del 09/09, no una garantía — reuniones está en producción y
  alguien puede cargar un pendiente antes del push.
