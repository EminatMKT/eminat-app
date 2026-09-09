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

### 2.2 Los pendientes SON actividades; los temas siguen siendo temas

`reunion_pendientes` se borra. Lo que alguien se compromete a hacer en una reunión es una fila de
`actividades` con `reunion_tema_id`.

`reunion_temas` **se queda como tabla propia**. Un tema es *lo que se trató* — no algo que alguien
deba hacer, no tiene responsable ni estado ni horas. Convertirlo en actividad (como proponía el
diseño del 28/08) obligaría a inventar el estado "tratado" y a que un tema informativo apareciera
en un Kanban.

**Motivo:** es la salida que la propia regla del centinela dejó escrita. El Motivo de
*«`reunion_pendientes` no crece»* decía que si la tabla pedía prioridad, colaboradores o un Kanban
propio, *"eso no es una columna nueva: es la señal de que dejó de ser una lista dentro de un acta"*.
La señal llegó antes de la primera columna.

**La cardinalidad es `reuniones 1:N reunion_temas 1:N actividades`.** Una reunión pare muchas
tareas; una tarea tiene a lo sumo **una** reunión de origen, o ninguna.

Se evaluó `N:N` con tabla puente y se descartó. El único caso que la pediría son los *heredados*:
una tarea acordada el 1/09 que no se terminó y **se revisa** el 8/09. Eso es fase 3, y ahí se
resuelve con una consulta —"tareas sin completar de reuniones anteriores de este equipo"—, que es
dato derivable. Un puente que hoy tendría exactamente una fila por tarea es la misma trampa que la
columna nullable que nadie escribe, y reintroduce el patrón de "dos filas para lo mismo" que §3.7
del diseño anterior rechazó. Si algún día "qué se revisó en esta reunión" resulta ser una decisión
editorial y no una consulta, ahí el puente se gana el lugar.

**El costo de colgar del tema y no de la reunión:** si se borra un punto del orden del día, el
`ON DELETE SET NULL` deja la tarea sin tema **y sin reunión** — se pierde el rastro de dónde
nació. Se tapa sin una segunda columna: el acta no deja borrar un punto que tiene tareas colgando,
hay que despegarlas primero.

**`reunion_tema_id` es nullable, y el `NULL` es el caso normal.** Una tarea que surge fuera de una
reunión —las 429 que hay hoy en prod— no tiene tema y no cambia en nada. La columna sólo se llena
cuando la tarea nace dentro de un acta.

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

### 2.3 Dar `operations` a `medico_investigacion` lo vuelve liquidable, y se acepta

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

### 2.4 `fecha_original` entra como columna; el historial no la reconstruye

`actividades` gana `fecha_original date`. Se llena siempre al crear; las 429 filas preexistentes
quedan en `NULL`.

**Motivo, verificado el 09/09:** `log_cambio_actividad` registra **sólo** `estado` y `verificado`
(`20260612193730_remote_schema.sql:179`). No registra `fecha_entrega`. Entonces el plazo original
**no es derivable del historial**: cada edición de la fecha de entrega destruye un dato que
ninguna migración posterior puede reconstruir. Es la misma asimetría que §2.3 del diseño anterior
ya había identificado, y sigue siendo cierta.

**Ninguna de las fechas que ya existen sirve** (inventario verificado el 09/09):

| Columna | Qué es |
|---|---|
| `fecha_inicio` | `date NOT NULL`. El **período de imputación del reporte de pago** — decide en qué mes se liquida. No es un vencimiento |
| `fecha_entrega` | El plazo. Dibuja el Gantt, "próximas entregas" y el badge *vencida*. **Se pisa entera en cada `UPDATE`** |
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

### 2.5 El acta escribe la tarea; la tarea no escribe el acta

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

### 2.6 Cerrar un acta no existe hoy, y por eso se implementa en esta fase

**Hallazgo del 09/09, verificado contra el código:** la transición `borrador → en_curso → cerrada`
**no está implementada en ninguna parte**. La capa de datos no manda `estado` nunca
(`src/shared/data/reuniones/reuniones.ts:16` lo dice textual: *"`estado` tiene su DEFAULT"*), y las
únicas dos escrituras —`insert` y `updateForm`— no lo incluyen. **Toda acta nace `'borrador'` y
muere `'borrador'`.** El estado sólo se lee para pintar un badge de color.

Y el `CHECK acta_cerrada_tiene_snapshot` es **un candado sin llave**: `acta_snapshot` no la escribe
nadie (`grep` en todo `src/` da cero), ningún trigger la arma, y la RPC `cerrar_reunion(id)` que el
diseño del 29/08 mandaba escribir nunca se escribió. Cerrar un acta hoy es imposible incluso por
SQL sin construir el `jsonb` a mano.

**Por qué eso obliga a implementarlo acá y no en la fase 3:** toda §2.5 se apoya en
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

### 2.7 El estado "postergado" no entra

§2.2 del diseño anterior lo dejó *"para decidir al empezar la fase 2"*. Se decide: **no**.

**Motivo:** unificados, agregarlo significa tocar el `CHECK` de `actividades`, que ya declara seis
valores contra los cuatro de `ESTADO` en TypeScript — deuda anotada y no de este módulo. Y un
pendiente postergado se distingue por dato, no por estado: `fecha_entrega > fecha_original`.

---

## 3. Esquema

```sql
ALTER TABLE public.actividades
  ADD COLUMN reunion_tema_id uuid REFERENCES public.reunion_temas(id) ON DELETE SET NULL,
  ADD COLUMN fecha_original  date;

CREATE INDEX ON public.actividades (reunion_tema_id) WHERE reunion_tema_id IS NOT NULL;

DROP TABLE public.reunion_pendientes;
```

- **`reunion_tema_id` cuelga del tema, no de la reunión.** Es donde colgaba `reunion_pendientes`, y
  así el acta agrupa por tema sin una consulta extra.
- **`ON DELETE SET NULL`, no `CASCADE`.** Borrar un tema del acta no puede borrar una tarea que
  alguien ya está haciendo en el Kanban. La tarea sobrevive, huérfana de reunión.
- El índice es parcial: la enorme mayoría de las 429 actividades no sale de una reunión.
- El resto ya existe en `actividades`: `titulo`, `responsable_id`, `estado`, `fecha_entrega`
  (que es la `fecha_comprometida` del pendiente), `horas`, `empresa`.

Y el trigger de §2.5, que es lo que hace cumplir la dirección de escritura:

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
(`deriveMiembrosAsignables`), con la consecuencia de nómina que documenta §2.3.

Desde el Kanban y el Dashboard, una tarea que salió de un acta muestra de qué reunión y de qué
punto vino, como enlace de **sólo lectura** (§2.5).

**El cierre del acta** (§2.6) suma dos pantallas: el botón de cerrar en el expediente —para quien
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
- **Romper el acople asignable/liquidable** (§2.3). Tarea propia.
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
  triggers. Las tres piezas de §2.6 nacen con la cobertura que se les escriba en esta fase.
- **Un bug ajeno que apareció al investigar, y es real hoy en producción:** `notif_insert_modulo`
  está gateada por `has_module('stratix-mkt')` a secas
  (`20260829210325_rls_encendida_cuatro_tablas.sql:139-142`) y `useActividadForm/index.ts:106` no
  mira el error de esa inserción. Quien tenga `tasks` y no Stratix crea la tarea y **la
  notificación al responsable falla en silencio**. No es de esta fase; va anotado aparte, pero la
  migración de policies de §4 lo toca de cerca y conviene arreglarlo ahí.
- **`src/features/tasks/types.ts` tiene una DEUDA anotada** (re-exporta `Actividad` sin ser un
  index) que la mudanza de carpeta toca por contacto. No se paga acá: son 21 imports y va en su
  propia rama.
