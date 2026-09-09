# `operations` — Reuniones y tareas son un solo módulo

**Fecha:** 2026-09-09
**Invierte:** §2.1 y §2.10 del diseño del 29/08 (`2026-08-29-reuniones-design.md`)
**Restituye:** el diseño del 28/08, vivo en la rama `feat/modulo-operaciones`

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
tareas?"*. Con un módulo la pregunta no existe: si ves el acta es porque tenés el módulo, así que
ves las actividades. **La decisión de fusionar es lo que hace innecesaria toda la RLS nueva.**

El nombre no es cosmética. El slug vive en `role_modules` (`text NOT NULL`, sin FK, nadie lo
valida), en el catálogo de permisos, en la ruta, en las claves i18n y en las policies de
`actividades`. Por eso la migración lleva el `RAISE EXCEPTION` que exige `rules/base-de-datos.md`:
un slug mal escrito **no falla, se vuelve invisible**, y es invisible justo para el admin que lo
prueba.

### 2.2 Los pendientes SON actividades; los temas no

`reunion_pendientes` se borra. Lo que alguien se compromete a hacer en una reunión es una fila de
`actividades` con `reunion_tema_id`.

**Los temas no se van con ellos.** Un tema es *lo que se trató* — no algo que alguien deba hacer,
no tiene responsable ni estado ni horas. Convertirlo en actividad (como proponía el diseño del
28/08) obligaría a inventar el estado "tratado" y a que un punto informativo apareciera en un
Kanban. Sí cambian de forma, pero por otro motivo: §2.3.

**Motivo:** es la salida que la propia regla del centinela dejó escrita. El Motivo de
*«`reunion_pendientes` no crece»* decía que si la tabla pedía prioridad, colaboradores o un Kanban
propio, *"eso no es una columna nueva: es la señal de que dejó de ser una lista dentro de un acta"*.
La señal llegó antes de la primera columna.

**`reunion_tema_id` es nullable, y el `NULL` es el caso normal.** Una tarea que surge fuera de una
reunión —las 429 que hay hoy en prod— no tiene tema y no cambia en nada. La columna sólo se llena
cuando la tarea nace dentro de un acta.

### 2.3 Un tema atraviesa reuniones: `temas` N:N `reuniones`

**Corrige el modelo de la fase 1, por planteo de Wagner el 09/09.** Hoy `reunion_temas.reunion_id`
es `NOT NULL`: un punto pertenece a un acta y a ninguna otra. Con eso, "Presupuesto Q4" tratado en
cinco reuniones son **cinco títulos repetidos sin nada que los una**, y no hay forma de ver la
historia del asunto.

Se parte en dos, y cada mitad del texto va donde le corresponde:

```
temas          "Presupuesto Q4"                     el asunto — el título, que es el mismo siempre
  ↕ N:N
reunion_temas  reunion_id + tema_id + posicion       EL TRATAMIENTO — la descripción, que es
               + descripcion                          distinta en cada reunión
reuniones      "Reunión del 8/09"
```

**Motivo:** el título describe el asunto y la descripción describe *qué se dijo ese día*. Tenerlos
en la misma fila obligaba a elegir cuál de las cinco versiones del texto imprime cada acta.

Se evaluó antes una tercera entidad `asuntos` por encima de `reunion_temas`, y Wagner la rechazó
con razón: era el mismo dato dos veces. La relación `N:N` da lo mismo **sin la tabla de más** —
`reunion_temas` deja de ser una entidad y pasa a ser lo que siempre debió ser, la fila del
tratamiento.

**Cuesta cero:** `reunion_temas` tiene 0 filas en prod. Es partir una tabla vacía.

### 2.4 La tarea cuelga de la reunión Y del tratamiento, y la FK compuesta impide que se contradigan

`actividades` gana **dos** columnas: `reunion_id` (de qué reunión salió) y `reunion_tema_id` (de
qué punto, opcional). Las dos nullables — el caso normal sigue siendo una tarea sin reunión.

Antes se había descartado tener las dos por miedo a que se contradijeran: una tarea de la reunión A
apuntando a un tratamiento de la B. **Ese miedo era de un Postgres que este repo no usa.** Con
PG 17 la contradicción se vuelve **imposible por estructura**, sin trigger y sin código:

- `UNIQUE (id, reunion_id)` en `reunion_temas`, para que sirva de destino;
- **FK compuesta** `(reunion_tema_id, reunion_id) REFERENCES reunion_temas (id, reunion_id)`.

Postgres rechaza el par incoherente. Y como una FK compuesta **no se evalúa si una de sus columnas
es `NULL`** (`MATCH SIMPLE`, el default), el caso *"tarea que salió en la reunión pero no de ningún
punto"* pasa solo, sin inventar un punto "Varios".

El segundo regalo de PG 17 es `ON DELETE SET NULL (reunion_tema_id)`, que nombra **qué columna** se
anula: borrar un punto del acta deja la tarea sin tema pero **conserva la reunión**. Con el
`SET NULL` clásico se anulaban las dos y se perdía el rastro de dónde nació — que era el costo que
esta sección tenía anotado antes y que ahora no existe.

**Se descartó agregar además `actividades.reunion_id`.** Sería derivable del tema con un `join`, y
lo único que agrega es la posibilidad de que las dos columnas se contradigan —una tarea apuntando
a la reunión A y a un tema de la reunión B—, contradicción que habría que sostener con un trigger
para guardar un dato que ya se puede leer.

**Lo que se cobra sin trabajo extra:** los cinco costos que §2.1 aceptaba se pagan solos.

| Costo declarado en §2.1 | Después de unificar |
|---|---|
| 1. Las tareas de reunión viven en otra pantalla | Misma tabla, mismo Kanban |
| 2. No hay pantalla de "mis pendientes" | Es el Dashboard de `/operations` filtrado por responsable |
| 3. Las horas no entran al reporte de pago | `actividades.horas` alimenta el reporte; entran solas |
| 4. Las notificaciones quedarían muertas | `notificaciones.actividad_id` ya existe y sirve |
| 5. El checklist no sirve al resto del sistema | Es el checklist de `actividades` |

### 2.5 Dar `operations` a `medico_investigacion` lo vuelve liquidable, y se acepta

`role_modules` hoy reparte así:

| slug | roles |
|---|---|
| `reuniones` | `admin`, `medico_investigacion` |
| `tasks` | `admin`, `stratix360` |

`operations` recibe **la unión**: `admin`, `stratix360`, `medico_investigacion`.

Eso significa que `medico_investigacion` —que hoy sólo veía reuniones— entra al `<select>` de
responsables al cargar una tarea **y** al `<select>` de la hoja de pago. Es la consecuencia que
documenta el CLAUDE.md: *"dar el módulo `tasks` a un rol lo vuelve asignable Y liquidable a la
vez"*, porque `deriveMiembrosAsignables` produce las dos listas.

**Decidido por Wagner el 09/09: que entre.** Es coherente con el ciclo — si se le asignan
pendientes en una reunión es asignable, y si es asignable es liquidable. Se descartó romper el
acople asignable/liquidable: es una tarea propia y agrandaba esta fase sin necesidad.

### 2.6 `fecha_entrega_original` entra como columna; el historial no la reconstruye

`actividades` gana `fecha_entrega_original date`, y `fecha_entrega` pasa a llamarse
`fecha_entrega_final`. **El par se nombra junto porque se lee junto**: `fecha_original` sola no
dice original de qué. El renombre cuesta un `RENAME COLUMN`, su índice y 48 ocurrencias en 21
archivos de `src/`; es mecánico y va en su propio commit.

**Qué es.** La primera fecha de entrega, congelada. Nadie la escribe a mano:

| Cuándo | Qué pasa | `fecha_entrega_final` | `fecha_entrega_original` |
|---|---|---|---|
| 1/09, en la reunión | "los banners para el 15" | `15/09` | `15/09` ← se copia sola |
| 14/09 | no llegó, se corre | `22/09` | `15/09` |
| 21/09 | tampoco | `30/09` | `15/09` |

Sin ella, el 21/09 la tarea dice "vence el 30" **y parece que siempre venció el 30**. Con ella:
*prometido para el 15, entregado el 30 — quince días, dos postergaciones*. En una reunión eso es lo
único que se pregunta.

**No es un segundo campo del formulario.** El trigger ya está escrito en el repo:
`proteger_fecha_original` (`20260829222113_reuniones_triggers.sql`) copia el valor en el `INSERT` y
después **rechaza cualquier cambio**. Sólo hay que mudarlo de `reunion_pendientes` a `actividades`
y renombrar sus columnas.

**Motivo de que sea una columna y no una consulta, verificado el 09/09:** `log_cambio_actividad`
registra **sólo** `estado` y `verificado` (`20260612193730_remote_schema.sql:179`). No registra la
fecha de entrega. Entonces el plazo original **no es derivable del historial**: cada edición
destruye un dato que ninguna migración posterior puede reconstruir.

**Ninguna de las fechas que ya existen sirve** (inventario verificado el 09/09):

| Columna | Qué es |
|---|---|
| `fecha_inicio` | `date NOT NULL`. El **período de imputación del reporte de pago** — decide en qué mes se liquida. No es un vencimiento |
| `fecha_entrega` → `fecha_entrega_final` | El plazo vigente. Dibuja el Gantt, "próximas entregas" y el badge *vencida*. **Se pisa entera en cada `UPDATE`** |
| `fecha_requerida` | Muerta: ningún formulario la escribe desde el 03/09. No se toca en esta fase |
| `fecha_aprobacion` | Un renglón de la ficha |
| `created_at` | Cuándo entró la fila. En las 251 migradas dice *abril de 2026*, no cuándo se acordó el trabajo |

**La alternativa considerada, y por qué no reemplaza a la columna:** extender
`log_cambio_actividad` para registrar `fecha_entrega` daría *todas* las postergaciones, no sólo la
primera, y el precedente exacto existe — `log_reunion()` ya loguea `fecha_comprometida`
(`20260830011448:50-54`). Pero **`historial` es admin-only** (`historial_admin_read USING
is_admin()`): un dato que sólo el admin puede leer no se puede mostrar en la tarjeta de una tarea.
Es el mismo argumento que justificó `created_by_id`. Las dos cosas no compiten —la columna es lo
que se ve, el trigger es la auditoría—, pero **el trigger no entra en esta fase**: es una mejora de
auditoría independiente, y `historial.usuario_id` arrastra el bug de las 277 filas vacías.

### 2.7 El acta escribe la tarea; la tarea no escribe el acta

Las tareas se crean y se editan **desde el modal del tema**, con la reunión abierta. Desde el
formulario de tarea, `reunion_tema_id` no se ve ni se toca: despegar una tarea de su punto, o
moverla a otro, se hace desde el acta y sólo mientras está abierta. Cerrada el acta, el vínculo es
histórico.

**Y eso no se sostiene con la UI.** La RLS de Postgres no gatea por columna: si `actividades` es
actualizable, `reunion_tema_id` es actualizable desde la consola, la API o cualquier cliente. Que
el formulario no muestre el campo no impide nada — es la misma forma del guard faltante de las
rutas API: *no falla, funciona de más*.

Lo hace cumplir un trigger `prevent_reunion_tema_change`, que deja pasar el `UPDATE` de esa columna
sólo si `preside_o_secretaria(reunion_id)` y `reunion_abierta(reunion_id)`. **El patrón ya está en
el repo dos veces** y no hay que inventarlo: `prevent_rol_self_change` protege `usuarios.rol`, y
`20260829222113_reuniones_triggers.sql:45` usa el mismo para *"un acta cerrada es de sólo lectura"*
—su comentario ya cita a `prevent_rol_self_change` como precedente—.

Se evaluó permitir el despegue desde la tarea detrás de un `ConfirmModal` riguroso, del tipo de los
delete. Se descartó: obliga a decidir quién puede hacerlo (¿cualquiera con el módulo? ¿sólo el
responsable? ¿sólo quien presidió?) y convierte "el acta manda" en una regla con excepciones, que
es la clase de regla que nadie recuerda seis meses después.

**Un efecto secundario a favor:** `reunion_pendientes` necesitaba una tercera policy sólo para que
el responsable pudiera actualizar su pendiente con el acta cerrada. Unificados eso es gratis —
cerrar el acta congela el acta, no las tareas: la tarea vive en `actividades` y sigue su ciclo
normal en el Kanban. Se borra una policy en vez de portarla.

### 2.8 Cerrar un acta no existe hoy, y por eso se implementa en esta fase

**Hallazgo del 09/09, verificado contra el código:** la transición `borrador → en_curso → cerrada`
**no está implementada en ninguna parte**. La capa de datos no manda `estado` nunca
(`src/shared/data/reuniones/reuniones.ts:16` lo dice textual: *"`estado` tiene su DEFAULT"*), y las
únicas dos escrituras —`insert` y `updateForm`— no lo incluyen. **Toda acta nace `'borrador'` y
muere `'borrador'`.** El estado sólo se lee para pintar un badge de color.

Y el `CHECK acta_cerrada_tiene_snapshot` es **un candado sin llave**: `acta_snapshot` no la escribe
nadie (`grep` en todo `src/` da cero), ningún trigger la arma, y la RPC `cerrar_reunion(id)` que el
diseño del 29/08 mandaba escribir nunca se escribió. Cerrar un acta hoy es imposible incluso por
SQL sin construir el `jsonb` a mano.

**Por qué eso obliga a implementarlo acá y no en la fase 3:** toda §2.7 se apoya en
`reunion_abierta()`, que hoy devuelve **siempre true**. El trigger se escribiría y no mordería
nunca — la misma forma del incidente del 29/08, donde las policies estaban escritas y la RLS
apagada. Un guard que no puede fallar tampoco puede probarse.

Entran tres piezas:

1. **La RPC `cerrar_reunion(id)`**, que arma el `acta_snapshot` y pasa el estado a `'cerrada'` en
   la misma transacción. Es lo único que satisface el `CHECK`.
2. **El botón de cerrar** en el expediente, para quien preside o la secretaria.
3. **La reapertura, sólo por admin y con `ConfirmModal`** — el "proceso riguroso" que pidió Wagner
   para este tipo de operación. Es la respuesta a *"se cerró y después vimos que una tarea quedó
   mal asociada"*: hoy el único camino es SQL crudo contra producción.

La reapertura ya está permitida por la base y no hay que tocar RLS: la policy de UPDATE de
`reuniones` (`20260830204042:74`) abre con `is_admin() OR …`, y `proteger_acta_cerrada` devuelve
temprano para el admin (`20260829222113:59`). Lo que falta es la pantalla, no el permiso.

### 2.9 El estado "postergado" no entra

§2.2 del diseño anterior lo dejó *"para decidir al empezar la fase 2"*. Se decide: **no**.

**Motivo:** unificados, agregarlo significa tocar el `CHECK` de `actividades`, que ya declara seis
valores contra los cuatro de `ESTADO` en TypeScript — deuda anotada y no de este módulo. Y un
pendiente postergado se distingue por dato, no por estado:
`fecha_entrega_final > fecha_entrega_original`.

---

## 3. Esquema

**El tema sube a su propia tabla** (§2.3). `reunion_temas` conserva el nombre y pasa a ser la fila
del tratamiento; el título se muda a `temas`:

```sql
CREATE TABLE public.temas (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  titulo     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reunion_temas
  ADD COLUMN tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE RESTRICT,
  DROP COLUMN titulo,
  ADD CONSTRAINT reunion_temas_unicos UNIQUE (reunion_id, tema_id),
  -- Destino de la FK compuesta de `actividades`. Redundante con la PK, y es su función:
  -- sin este UNIQUE, Postgres no acepta el par como referencia.
  ADD CONSTRAINT reunion_temas_id_reunion UNIQUE (id, reunion_id);
```

`ON DELETE RESTRICT` en `tema_id` a propósito: borrar un asunto que se trató en una reunión
reescribiría un acta pasada. Se desactiva, no se borra.

Y `actividades` gana las dos columnas de §2.4 y la fecha de §2.6:

```sql
ALTER TABLE public.actividades
  RENAME COLUMN fecha_entrega TO fecha_entrega_final;

ALTER TABLE public.actividades
  ADD COLUMN reunion_id              uuid REFERENCES public.reuniones(id) ON DELETE SET NULL,
  ADD COLUMN reunion_tema_id         uuid,
  ADD COLUMN fecha_entrega_original  date,
  -- La coherencia, sin trigger: PG rechaza una tarea de la reunión A que apunte a un
  -- tratamiento de la B. Con `reunion_tema_id` en NULL la FK no se evalúa (MATCH SIMPLE),
  -- así que una tarea de la reunión sin punto del orden del día pasa sola.
  ADD CONSTRAINT actividades_tratamiento_fkey
    FOREIGN KEY (reunion_tema_id, reunion_id)
    REFERENCES public.reunion_temas (id, reunion_id)
    ON DELETE SET NULL (reunion_tema_id);

CREATE INDEX ON public.actividades (reunion_id) WHERE reunion_id IS NOT NULL;

DROP TABLE public.reunion_pendientes;
```

- **`ON DELETE SET NULL (reunion_tema_id)` nombra la columna** — es PG 15+, y el proyecto corre
  PG 17 (verificado). Con el `SET NULL` clásico se anulaban las dos columnas de la FK y borrar un
  punto del acta se llevaba puesto también el rastro de la reunión.
- **Ningún `CASCADE`.** Borrar un punto no puede borrar una tarea que alguien está haciendo.
- El índice es parcial: la enorme mayoría de las 429 actividades no sale de una reunión.
- El resto ya existe en `actividades`: `titulo`, `responsable_id`, `estado`, `horas`, `empresa`.

Y el trigger de §2.7, que es lo que hace cumplir la dirección de escritura:

```sql
CREATE OR REPLACE FUNCTION public.prevent_reunion_tema_change() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r uuid;
BEGIN
  IF new.reunion_tema_id IS NOT DISTINCT FROM old.reunion_tema_id THEN
    RETURN new;
  END IF;
  SELECT t.reunion_id INTO r
    FROM public.reunion_temas t
   WHERE t.id = coalesce(new.reunion_tema_id, old.reunion_tema_id);
  IF public.is_admin() OR (public.preside_o_secretaria(r) AND public.reunion_abierta(r)) THEN
    RETURN new;
  END IF;
  RAISE EXCEPTION 'el vínculo con el acta se edita desde la reunión, y sólo con el acta abierta';
END $$;
```

El `IS NOT DISTINCT FROM` es lo que deja pasar los `UPDATE` normales de una tarea sin costo: si la
columna no cambia, el trigger devuelve antes de mirar nada.

**Y una limpieza obligatoria que el `DROP` arrastra:** `log_reunion()` tiene una rama entera para
`reunion_pendientes` (`20260830011448:45-54`, la que loguea `estado` y `fecha_comprometida`). Al
borrar la tabla esa rama queda muerta. En Postgres **una función no se parchea, se vuelve a
declarar completa** —lo dice el comentario de esa misma migración—, así que la migración de esta
fase re-declara `log_reunion()` sin ella.

Verificado que **no** se rompe: `admin_reassign_and_delete` menciona `reunion_pendientes` sólo en
un comentario, no en el cuerpo.

**Rollback:** `supabase/rollback/operations-unificacion-rollback.sql`, escrito **antes** del push,
con el `CREATE TABLE` completo de `reunion_pendientes` y sus tres policies. Que hoy tenga 0 filas
hace el rollback trivial y es la razón de hacerlo ahora y no dentro de seis meses.

---

## 4. Permisos y RLS

Una sola migración, con el `DO` block y el `RAISE EXCEPTION` que exige la regla:

1. `role_modules`: las filas de `tasks` y `reuniones` pasan a `operations`, **enumerando los roles**
   (`admin`, `stratix360`, `medico_investigacion`), no copiándolos con un `SELECT` — lo pide
   `rules/base-de-datos.md`.
2. Las policies de `reuniones` y `reunion_temas` cambian `has_module('reuniones')` por
   `has_module('operations')`.
3. La policy de `actividades` (`20260903235201_actividades_policy_tasks.sql`) ya evalúa dos slugs
   en OR por variable: `tasks` pasa a ser `operations` y **`stratix-mkt` se queda**. No es un
   descuido: esa migración explica que el OR existe porque la sección Team de Stratix cuenta las
   tareas en proceso de cada persona (`RosterCard`), y sacarlo dejaría ese contador en cero, sin
   ningún error, para quien tenga Stratix y no `operations`.

**No hay RLS nueva.** Es la consecuencia directa de §2.1: un módulo, un gate.

⚠️ **El precheck del 29/08 aplica entero.** La RLS se verifica consultando como `anon`, no leyendo
el esquema: ver una policy no es ver control de acceso. Y `db push` aplica **todas** las
migraciones pendientes — `migration list --linked` antes.

---

## 5. UI

Reuniones entra como **quinta pestaña** de `/operations`, al lado de Dashboard, Production,
Requests y Report. `/reuniones` deja de existir como ruta y el sidebar muestra un solo ítem.

**El modal del tema es donde nacen las tareas, y es el paso central de la fase.** Al crear o editar
un punto del orden del día se cargan sus tareas en la misma pantalla —título, responsable, fecha
comprometida, horas—, y cada línea es un `INSERT` en `actividades` con `reunion_tema_id`. Eso es lo
que hace que el ciclo exista: la tarea nace en el acta y aparece sola en el Kanban, sin que nadie
la vuelva a cargar. El `<select>` de responsable es el mismo de `/operations`
(`deriveMiembrosAsignables`), con la consecuencia de nómina que documenta §2.5.

Desde el Kanban y el Dashboard, una tarea que salió de un acta muestra de qué reunión y de qué
punto vino, como enlace de **sólo lectura** (§2.7).

**El cierre del acta** (§2.8) suma dos pantallas: el botón de cerrar en el expediente —para quien
preside o la secretaria— y la **reapertura por admin detrás de un `ConfirmModal`**, del tipo de los
delete, diciendo qué acta se va a reabrir y por qué se necesita. `ConfirmModal` ya existe en
`src/shared/components/ui/`; no hay que escribirlo.

Los cinco lugares del catálogo de permisos cambian juntos (los lista el encabezado de
`src/shared/auth/permissions/index.ts`): `modulos/slugs.ts`, `MODULE_META`, la carpeta
`src/app/(app)/operations/`, `shell/appShellConfig.ts` y los dos `.json` de i18n.

**La unificación de carpetas entra, como paso final de la fase.** `src/features/tasks/` pasa a
`src/features/operations/` y `src/features/reuniones/` se muda adentro. Va último a propósito: es
un diff de renombres que taparía el trabajo de esquema y de UI si fuera primero.

---

## 6. Lo que NO entra en esta fase

- **El acta imprimible y los heredados** — seguían siendo fase 3 y lo siguen siendo.
- **Romper el acople asignable/liquidable** (§2.5). Tarea propia.
- **El motor de filtros y vistas guardadas aplicado a reuniones.** Quedó hecho para `/tasks` en el
  PR #68, con imperfecciones conocidas, y debería poder reutilizarse acá. Se decide cuando la
  pestaña esté en pantalla, no antes.
- **El botón "promover a tarea"** que dibujaba §2.1: no hace falta. Un pendiente nace ya siendo
  tarea.

---

## 7. Deuda que esta fase produce, y hay que pagar en ella

- **La regla del centinela *«`reunion_pendientes` no crece»* queda huérfana** cuando la tabla se
  borra. Vive en el repo de datos del usuario
  (`~/.local/share/centinela/reglas/repos/EminatMKT__eminat-app/base-de-datos.md`), no en el
  código, así que no la agarra ningún gate: hay que borrar la sección a mano.
- **El CLAUDE.md miente en tres lugares** apenas esto se mergee: la tabla de módulos, el párrafo
  de `deriveMiembrosAsignables` y el árbol de `src/`. Se corrige en la misma rama.
- **Cero tests del cierre.** Los ocho tests del módulo son de utils puros; ninguno toca RLS ni
  triggers. Las tres piezas de §2.8 nacen con la cobertura que se les escriba en esta fase.
- **Un bug ajeno que apareció al investigar, y es real hoy en producción:** `notif_insert_modulo`
  está gateada por `has_module('stratix-mkt')` a secas
  (`20260829210325_rls_encendida_cuatro_tablas.sql:139-142`) y `useActividadForm/index.ts:106` no
  mira el error de esa inserción. Quien tenga `tasks` y no Stratix crea la tarea y **la
  notificación al responsable falla en silencio**. No es de esta fase; va anotado aparte, pero la
  migración de policies de §4 lo toca de cerca y conviene arreglarlo ahí.
- **`src/features/tasks/types.ts` tiene una DEUDA anotada** (re-exporta `Actividad` sin ser un
  index) que la mudanza de carpeta toca por contacto. No se paga acá: son 21 imports y va en su
  propia rama.
