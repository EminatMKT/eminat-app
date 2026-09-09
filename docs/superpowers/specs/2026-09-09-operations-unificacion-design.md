# `operations` — Reuniones y tareas son un solo módulo

**Fecha:** 2026-09-09
**Invierte:** §2.1 y §2.10 del diseño del 29/08 (`2026-08-29-reuniones-design.md`)
**Restituye:** el diseño del 28/08, vivo en la rama `feat/modulo-operaciones`
**Revisado adversarialmente el 09/09** por dos pasadas independientes —modelo de datos y
correspondencia esquema↔UI—. Dieciséis objeciones; las que sobrevivieron están incorporadas y
señaladas con ⚠️ donde cambian una decisión anterior.

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

⚠️ **Pero no todos los argumentos de §2.10 murieron con ése.** El de fondo —*"`actividades` es tres
cosas a la vez: una tarea, un renglón de nómina y una unidad de producción, y nunca se partió"*—
sigue vivo, y este diseño **no lo resuelve**: le agrega un cuarto rol, el de compromiso de acta.
Es una deuda aceptada a sabiendas, no un descuido; partir `actividades` es un refactor propio.

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

⚠️ **Lo que esto NO resuelve, y el documento anterior daba por resuelto.** Escribí *"si ves el acta
es porque tenés el módulo, así que ves las actividades"*. La implicación real corre al revés:

| Tabla | Quién ve una fila |
|---|---|
| `reuniones` | `has_module` **Y** (admin **o** creador **o** participa **o** misma empresa) — `20260830204042:63-71` |
| `actividades` | `has_module`, y nada más — `20260903235201:32` |

Al volver los pendientes filas de `actividades`, **el contenido de un acta reservada queda visible
para todo el que tenga `operations`**. Es la regresión que §2.7 del diseño del 29/08 se escribió
entera para evitar. **Diferido a pedido de Wagner el 09/09** y anotado en el `.todo`: la fase sale
sin esa cláusula de RLS. Mientras tanto, la regla vive en la cabeza de la gente — una reunión
reservada no carga sus compromisos en el sistema.

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
*«`reunion_pendientes` no crece»* decía que si la tabla pedía prioridad, colaboradores o un Kanban
propio, *"eso no es una columna nueva: es la señal de que dejó de ser una lista dentro de un acta"*.
La señal llegó antes de la primera columna.

**Lo que se cobra sin trabajo extra:** cuatro de los cinco costos que §2.1 aceptaba.

| Costo declarado en §2.1 del 29/08 | Después de unificar |
|---|---|
| 1. Las tareas de reunión viven en otra pantalla | Misma tabla, mismo Kanban |
| 2. No hay pantalla de "mis pendientes" | Es el Dashboard de `/operations` filtrado por responsable |
| 3. Las horas no entran al reporte de pago | `actividades.horas` alimenta el reporte; entran solas |
| 4. Las notificaciones quedarían muertas | ⚠️ **No se cobra solo** — ver abajo |
| 5. El checklist no sirve al resto del sistema | Es el checklist de `actividades` |

⚠️ **La fila 4 estaba mal.** `notificaciones.actividad_id` existe, pero `notif_insert_modulo` está
gateada por `has_module('stratix-mkt')` a secas (`20260829210325:139-142`) y el `await` de
`useActividadForm/index.ts:106` no mira su error. `medico_investigacion` —el rol que §2.5
incorpora— no tiene Stratix: **la notificación falla en silencio justo para el público nuevo**.
Deja de ser "un bug ajeno" y entra en la fase: el slug correcto en la policy, y el error chequeado.

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
en la misma fila obligaba a elegir cuál de las cinco versiones del texto imprime cada acta.

Se evaluó una tercera entidad `asuntos` por encima de `reunion_temas`, y Wagner la rechazó con
razón: era el mismo dato dos veces. La relación `N:N` da lo mismo **sin la tabla de más**.

⚠️ **`temas` es un catálogo administrado, no texto libre.** La revisión encontró dos agujeros que
sólo se cierran juntos: sin normalizar el título, *"Presupuesto Q4"* y *"presupuesto q4"* son dos
asuntos y la historia que esta sección quiere unir se rompe con la primera tipeada; y con
`ON DELETE RESTRICT` y sin pantalla de gestión, un tema mal escrito queda para siempre e
inborrable. Entonces:

- `UNIQUE (lower(titulo))` — el duplicado por mayúsculas no entra;
- columna `activo`, para retirar un tema sin borrar el acta que lo cita;
- se administra desde **`/admin` → Organización**, con el mismo CRUD config-driven que ya sirve a
  empresas, departamentos y cargos. No hay que escribir un CRUD nuevo;
- y en el acta, un **buscar-o-crear**: se escribe el título, y si no existe se ofrece crearlo.
  Ese componente **no existe** — `CatalogoSelect` es un `<select>` sobre catálogo fijo, y su propio
  comentario declara ese techo. Es una pieza nueva de la fase (§5).

**Cuesta cero en datos:** `reunion_temas` tiene 0 filas en prod. Es partir una tabla vacía.

### 2.4 La tarea cuelga de la reunión Y del tratamiento

`actividades` gana **dos** columnas: `reunion_id` (de qué reunión salió) y `reunion_tema_id` (de
qué punto, opcional). Las dos nullables — el caso normal sigue siendo una tarea sin reunión.

**Por qué las dos y no sólo el tratamiento, ahora con el motivo correcto.** El documento anterior
descartaba `reunion_id` *"por derivable con un join"* y en el mismo párrafo la agregaba: una
contradicción literal que la revisión encontró. Se resuelve así: `reunion_id` **no es derivable**
en el caso que justifica tenerla — *una tarea que salió en la reunión pero no de ningún punto del
orden del día*. Ahí `reunion_tema_id` es `NULL` y no hay join que devuelva la reunión.

⚠️ **La FK compuesta sola no alcanza, y decir "imposible por estructura" era falso.** Con
`MATCH SIMPLE` —el default— la FK **no se evalúa si cualquiera** de sus columnas es `NULL`, así que
`(reunion_tema_id = tratamiento de la reunión B, reunion_id = NULL)` entraba sin error. Hacen falta
las dos piezas:

- `UNIQUE (id, reunion_id)` en `reunion_temas` + **FK compuesta** desde `actividades` — impide el
  par cruzado cuando las dos columnas tienen valor;
- **`CHECK (reunion_tema_id IS NULL OR reunion_id IS NOT NULL)`** — impide el tratamiento huérfano
  de reunión, que es lo que la FK dejaba pasar.

Con las dos, los tres estados posibles son los tres que tienen sentido: sin reunión, con reunión y
sin punto, con reunión y punto coherente.

⚠️ **`ON UPDATE` queda en `NO ACTION`**, que es el default: mover una fila de `reunion_temas` a otra
reunión falla con un error crudo de Postgres. Es aceptable —un tratamiento no cambia de reunión,
sería reescribir dos actas— pero la UI no debe ofrecerlo.

El segundo regalo de PG 17 (verificado: `config.toml:42`, y prod reporta 17.6) es
`ON DELETE SET NULL (reunion_tema_id)`, que nombra **qué columna** se anula: borrar un punto del
acta deja la tarea sin tema pero **conserva la reunión**.

### 2.5 Dar `operations` a `medico_investigacion` lo vuelve liquidable, y se acepta

`role_modules` hoy reparte así:

| slug | roles |
|---|---|
| `reuniones` | `admin`, `medico_investigacion` |
| `tasks` | `admin`, `stratix360` |

`operations` recibe **la unión**: `admin`, `stratix360`, `medico_investigacion`.

Eso significa que `medico_investigacion` —que hoy sólo veía reuniones— entra al `<select>` de
responsables al cargar una tarea **y** al `<select>` de la hoja de pago, porque
`deriveMiembrosAsignables` produce las dos listas de una sola condición.

**Decidido por Wagner el 09/09: que entre.** Es coherente con el ciclo — si se le asignan
pendientes en una reunión es asignable, y si es asignable es liquidable. Se descartó romper el
acople asignable/liquidable: es una tarea propia y agrandaba esta fase.

### 2.6 `fecha_entrega_original` entra como columna; el historial no la reconstruye

`actividades` gana `fecha_entrega_original date`, y `fecha_entrega` pasa a llamarse
`fecha_entrega_final`. **El par se nombra junto porque se lee junto**: `fecha_original` sola no
dice original de qué.

**Qué es.** La primera fecha de entrega, congelada. Nadie la escribe a mano:

| Cuándo | Qué pasa | `fecha_entrega_final` | `fecha_entrega_original` |
|---|---|---|---|
| 1/09, en la reunión | "los banners para el 15" | `15/09` | `15/09` ← se copia sola |
| 14/09 | no llegó, se corre | `22/09` | `15/09` |
| 21/09 | tampoco | `30/09` | `15/09` |

Sin ella, el 21/09 la tarea dice "vence el 30" **y parece que siempre venció el 30**. Con ella:
*prometido para el 15, entregado el 30 — quince días, dos postergaciones*.

⚠️ **`proteger_fecha_original` NO se muda tal cual.** El del repo
(`20260829222113_reuniones_triggers.sql`) sólo copia en el `INSERT`, y ahí funcionaba porque el
flujo del pendiente siempre traía fecha. **`actividades.fecha_entrega` es nullable**: una tarea
creada sin fecha y fechada después quedaría con el original en `NULL` para siempre, y la detección
de postergado (§2.9) daría `NULL`. La versión de acá copia también **en el `UPDATE` que le pone la
primera fecha**, y recién ahí congela. Y una precisión de redacción: el trigger no *"rechaza"* el
cambio — lo **revierte en silencio**, que es lo que dice el comentario de esa migración.

**Las 429 filas existentes quedan en `NULL` y no se backfillean:** no hay de dónde sacar el dato.
La consecuencia hay que decirla: *"se postergó"* sólo se puede afirmar de las tareas nacidas
después de esta fase.

**Ninguna de las fechas que ya existen sirve** (inventario verificado el 09/09):

| Columna | Qué es |
|---|---|
| `fecha_inicio` | `date NOT NULL`, default `CURRENT_DATE`. El **período de imputación del reporte de pago** — decide en qué mes se liquida. No es un vencimiento |
| `fecha_entrega` → `fecha_entrega_final` | El plazo vigente. Dibuja el Gantt, "próximas entregas" y el badge *vencida*. **Se pisa entera en cada `UPDATE`** |
| `fecha_requerida` | Muerta: ningún formulario la escribe desde el 03/09. No se toca en esta fase |
| `fecha_aprobacion` | Un renglón de la ficha |
| `created_at` | Cuándo entró la fila. En las 251 migradas dice *abril de 2026*, no cuándo se acordó el trabajo |

**Motivo de que sea una columna y no una consulta:** `log_cambio_actividad` registra **sólo**
`estado` y `verificado` (`20260612193730:179`). No registra la fecha de entrega. El plazo original
**no es derivable del historial**. La alternativa —extender ese trigger, como `log_reunion()` ya
hace con `fecha_comprometida`— daría todas las postergaciones, pero **`historial` es admin-only**
(`historial_admin_read USING is_admin()`): un dato que sólo el admin lee no se muestra en una
tarjeta. No compiten; el trigger de auditoría queda para otra fase.

### 2.7 El acta escribe la tarea; la tarea no escribe el acta

Las tareas se crean y se editan **desde el modal del tratamiento**, con la reunión abierta. Desde
el formulario de tarea, `reunion_id`/`reunion_tema_id` no se ven ni se tocan: despegar una tarea de
su punto se hace desde el acta y sólo mientras está abierta.

**Y eso no se sostiene con la UI.** La RLS de Postgres no gatea por columna: si `actividades` es
actualizable, esas columnas lo son desde la consola, la API o cualquier cliente.

Lo hace cumplir un trigger `prevent_reunion_tema_change`. **El patrón ya está en el repo dos
veces** (`prevent_rol_self_change`, y `proteger_acta_cerrada` para *"un acta cerrada es de sólo
lectura"*), pero la revisión encontró tres defectos en mi primera versión, y los tres importan:

⚠️ **(a) Tiene que correr también en `INSERT`.** Mi versión leía `old.` y en un `INSERT` `OLD` no
está asignado: plpgsql revienta — el mismo bug que `20260829222113:52-55` documenta. Y si corriera
sólo en `UPDATE`, **un `INSERT` podría apuntar a cualquier tratamiento**, de un acta cerrada o
ajena, y "el acta manda" no existiría. Va `BEFORE INSERT OR UPDATE`, ramificando por `TG_OP`.

⚠️ **(b) Le faltaba `SET search_path = public`.** Todas las `SECURITY DEFINER` del repo lo llevan y
el porqué está escrito en `20260829221511:99-101`.

⚠️ **(c) Le faltaba `creo_la_reunion()`.** `reunion_temas_write` la incluye
(`20260830204042:93-98`): sin ella, quien creó el acta puede crear el punto pero no colgarle una
tarea.

**Un efecto secundario a favor:** `reunion_pendientes` necesitaba una tercera policy sólo para que
el responsable pudiera actualizar su pendiente con el acta cerrada. Unificados eso es gratis —
**cerrar el acta congela el acta, no las tareas**: la tarea vive en `actividades` y sigue su ciclo
normal en el Kanban.

### 2.8 Cerrar un acta no existe hoy, y por eso se implementa en esta fase

**Hallazgo del 09/09, verificado:** la transición `borrador → en_curso → cerrada` **no está
implementada en ninguna parte**. La capa de datos no manda `estado` nunca
(`src/shared/data/reuniones/reuniones.ts:16` lo dice textual), y las únicas dos escrituras
—`insert` y `updateForm`— no lo incluyen. **Toda acta nace `'borrador'` y muere `'borrador'`.**

El `CHECK acta_cerrada_tiene_snapshot` es **un candado sin llave**: `acta_snapshot` no la escribe
nadie (`grep` en `src/` da cero), ningún trigger la arma, y la RPC `cerrar_reunion(id)` que el
diseño del 29/08 mandaba escribir nunca se escribió.

**Por qué obliga a implementarlo acá:** toda §2.7 se apoya en `reunion_abierta()`, que hoy devuelve
**siempre true**. El trigger se escribiría y no mordería nunca — la misma forma del incidente del
29/08, donde las policies estaban escritas y la RLS apagada.

Entran tres piezas:

1. **La RPC `cerrar_reunion(id)`**, que arma el `acta_snapshot` y pasa el estado a `'cerrada'` en
   la misma transacción. Es lo único que satisface el `CHECK`.
2. **El botón de cerrar** en el expediente, para quien preside o la secretaria. Hoy el expediente
   **ni siquiera muestra el `estado`** — sólo lo pinta el badge del listado.
3. **La reapertura, sólo por admin y con `ConfirmModal`** (`destructive` + `confirmPhrase`, que ya
   existe tal cual). **Va en el expediente, no en `/admin`**: `/admin` no tiene listado de
   reuniones, agregarlo sería un tab nuevo del CRUD, y la decisión es contextual al acta abierta.

La base ya lo permite y no hay que tocar RLS: la policy de UPDATE abre con `is_admin() OR …`
(`20260830204042:74`) y `proteger_acta_cerrada` devuelve temprano para el admin
(`20260829222113:59`). Falta la pantalla, no el permiso.

### 2.9 El estado "postergado" no entra

§2.2 del diseño anterior lo dejó *"para decidir al empezar la fase 2"*. Se decide: **no**.

**Motivo:** agregarlo significa tocar el `CHECK` de `actividades`, que ya declara seis valores
contra los cuatro de `ESTADO` en TypeScript — deuda anotada y no de este módulo. Y un pendiente
postergado se distingue por dato, no por estado:
`fecha_entrega_final > fecha_entrega_original` (con la salvedad de §2.6 sobre las filas viejas).

### 2.10 Un compromiso de acta lleva responsable, y eso se pierde

⚠️ **`actividades.responsable_id` es `NOT NULL`**; el de `reunion_pendientes` era nullable. §2.2 del
diseño del 29/08 modelaba *"sin responsable todavía"* como un filtro derivado
(`responsable_id IS NULL`), y **eso desaparece**.

Se acepta, y con una razón, no por inercia: un compromiso sin dueño no es un compromiso — es una
nota, y su lugar es la `descripcion` del tratamiento. Cargar la tarea obliga a decir quién.

La otra consecuencia del mismo tipo: el modal debe pedir **`fecha_inicio`**, que es `NOT NULL` con
default `CURRENT_DATE`. Si se deja al default, una tarea acordada el 30/09 para empezar en octubre
**se imputa a septiembre en la hoja de pago**.

---

## 3. Esquema

### 3.1 El tema sube a su propia tabla

```sql
CREATE TABLE public.temas (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  titulo     text NOT NULL,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX temas_titulo_unico ON public.temas (lower(titulo));

ALTER TABLE public.reunion_temas
  ADD COLUMN tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE RESTRICT,
  DROP COLUMN titulo,
  ADD CONSTRAINT reunion_temas_unicos     UNIQUE (reunion_id, tema_id),
  -- Destino de la FK compuesta de `actividades`. Redundante con la PK, y es su función:
  -- sin este UNIQUE, Postgres no acepta el par como referencia.
  ADD CONSTRAINT reunion_temas_id_reunion UNIQUE (id, reunion_id);
```

`ON DELETE RESTRICT` en `tema_id` a propósito: borrar un asunto ya tratado reescribiría un acta
pasada. Para eso está `activo` (§2.3).

⚠️ **`temas` nace con RLS encendida.** La revisión encontró que §4 decía *"no hay RLS nueva"* y una
tabla nueva de `public` recibe `GRANT ALL` a `anon` por defecto en Supabase — está el precedente
literal en el dump (`GRANT ALL ON TABLE public.reunion_pendientes TO anon`). Sin esto sería
**lectura y escritura anónima**, la forma exacta del incidente del 29/08:

```sql
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.temas FROM anon;
-- Lectura para quien tiene el módulo; escritura sólo desde el flujo del acta o el admin.
CREATE POLICY temas_select ON public.temas FOR SELECT USING (public.has_module('operations'));
CREATE POLICY temas_write  ON public.temas FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin() OR public.has_module('operations'));
```

### 3.2 `actividades` gana las columnas del vínculo

```sql
ALTER TABLE public.actividades
  RENAME COLUMN fecha_entrega TO fecha_entrega_final;
ALTER INDEX public.idx_actividades_fecha_ent RENAME TO idx_actividades_fecha_entrega_final;

ALTER TABLE public.actividades
  ADD COLUMN reunion_id             uuid REFERENCES public.reuniones(id) ON DELETE SET NULL,
  ADD COLUMN reunion_tema_id        uuid,
  ADD COLUMN fecha_entrega_original date,
  -- Las dos piezas de §2.4. La FK impide el par cruzado; el CHECK impide el tratamiento
  -- huérfano de reunión, que la FK deja pasar porque MATCH SIMPLE no evalúa con un NULL.
  ADD CONSTRAINT actividades_tratamiento_fkey
    FOREIGN KEY (reunion_tema_id, reunion_id)
    REFERENCES public.reunion_temas (id, reunion_id)
    ON DELETE SET NULL (reunion_tema_id),
  ADD CONSTRAINT actividades_tema_exige_reunion
    CHECK (reunion_tema_id IS NULL OR reunion_id IS NOT NULL);

CREATE INDEX ON public.actividades (reunion_id) WHERE reunion_id IS NOT NULL;

DROP TABLE public.reunion_pendientes;
DROP DOMAIN public.estado_pendiente;   -- queda huérfano con la tabla
```

- **Ningún `CASCADE`.** Borrar un punto no puede borrar una tarea que alguien está haciendo.
- El índice es parcial: la enorme mayoría de las 429 actividades no sale de una reunión.
- El resto ya existe en `actividades`: `titulo`, `responsable_id`, `estado`, `horas`, `empresa`.

### 3.3 Los dos triggers

```sql
-- §2.6 — la primera fecha de entrega, congelada. A diferencia del de `reunion_pendientes`,
-- éste también la captura en el UPDATE que pone la PRIMERA fecha: `fecha_entrega_final` es
-- nullable y una tarea puede nacer sin plazo.
CREATE OR REPLACE FUNCTION public.congelar_fecha_entrega_original()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.fecha_entrega_original := NEW.fecha_entrega_final;
  ELSIF OLD.fecha_entrega_original IS NULL THEN
    NEW.fecha_entrega_original := NEW.fecha_entrega_final;
  ELSE
    NEW.fecha_entrega_original := OLD.fecha_entrega_original;   -- revierte, no rechaza
  END IF;
  RETURN NEW;
END $$;

-- §2.7 — el vínculo con el acta se escribe desde el acta, y con el acta abierta.
CREATE OR REPLACE FUNCTION public.proteger_vinculo_con_el_acta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid;
BEGIN
  -- En INSERT no se puede leer OLD (plpgsql revienta), así que las dos ramas van separadas
  -- y ninguna menciona OLD fuera de la suya. Mismo motivo que `proteger_acta_cerrada`.
  IF TG_OP = 'UPDATE' AND NEW.reunion_tema_id IS NOT DISTINCT FROM OLD.reunion_tema_id
                      AND NEW.reunion_id      IS NOT DISTINCT FROM OLD.reunion_id THEN
    RETURN NEW;                                   -- el UPDATE normal de una tarea no paga nada
  END IF;
  r := NEW.reunion_id;
  IF r IS NULL THEN RETURN NEW; END IF;           -- tarea sin reunión: no es asunto del acta
  IF public.is_admin()
     OR ((public.preside_o_secretaria(r) OR public.creo_la_reunion(r))
         AND public.reunion_abierta(r)) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'el vínculo con el acta se edita desde la reunión, y sólo con el acta abierta';
END $$;

CREATE TRIGGER trg_fecha_entrega_original BEFORE INSERT OR UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.congelar_fecha_entrega_original();
CREATE TRIGGER trg_vinculo_acta          BEFORE INSERT OR UPDATE ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.proteger_vinculo_con_el_acta();
```

### 3.4 Limpieza que el `DROP` arrastra

`log_reunion()` tiene una rama entera para `reunion_pendientes` (`20260830011448:45-54`). Al borrar
la tabla queda muerta, y en Postgres **una función no se parchea, se vuelve a declarar completa**.
Verificado que `admin_reassign_and_delete` **no** se rompe: la menciona sólo en un comentario.

**Rollback:** `supabase/rollback/operations-unificacion-rollback.sql`, escrito **antes** del push,
con el `CREATE TABLE` de `reunion_pendientes`, su dominio, sus tres policies, y el `titulo` de
`reunion_temas`. Que hoy haya 0 filas hace el rollback trivial y es la razón de hacerlo ahora.

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

Tabla por tabla:

| Tabla | Hoy | Después |
|---|---|---|
| `actividades` | `tasks OR stratix-mkt` | `operations OR stratix-mkt` |
| `reuniones`, `reunion_temas` | `reuniones` | `operations` |
| `reunion_pendientes` | `reuniones` | *(la tabla se borra)* |
| `temas` | — | `operations` (RLS nueva, §3.1) |
| `notificaciones` | `stratix-mkt` | `operations` — es el bug de §2.2 |

### 4.2 La migración

⚠️ **El orden adentro de la migración no es libre.** `rules/base-de-datos.md` exige que una
migración con `has_module` aborte si el slug no existe en `role_modules`. Para un slug **nuevo** esa
guarda se invierte: si las policies corren primero, el `RAISE EXCEPTION` dispara **contra su propio
slug** y la migración se aborta a sí misma. El orden obligado es **primero las filas de
`role_modules`, después las policies**, en la misma transacción.

Una sola migración, con el `DO` block y el `RAISE EXCEPTION` que exige la regla:

1. `role_modules`: las filas de `tasks` y `reuniones` pasan a `operations`, **enumerando los roles**
   (`admin`, `stratix360`, `medico_investigacion`), no copiándolos con un `SELECT`.
2. Las policies de `reuniones` y `reunion_temas` cambian `has_module('reuniones')` por
   `has_module('operations')`.
3. La policy de `actividades` evalúa dos slugs en OR por variable: `tasks` pasa a `operations` y
   **`stratix-mkt` se queda** — la sección Team de Stratix cuenta las tareas en proceso de cada
   persona (`RosterCard`), y sacarlo dejaría ese contador en cero sin ningún error.
4. **El bug de `notif_insert_modulo`** (§2.2): la policy pasa a `operations` y
   `useActividadForm/index.ts:106` chequea el error.

⚠️ **5. El slug es también el ámbito de los filtros, y eso rompe lo que se mergeó ayer.**
`useFilters(MODULE.TASKS, actFilters)` usa el slug como `ambito`, y ese ámbito separa **las filas de
`vistas_filtro`** (`ambito='tasks'`) y **la clave de localStorage** `filtros:${ambito}`. Sin
migrarlo, cada vista guardada del PR #68 desaparece del desplegable **sin un error**:

```sql
UPDATE public.vistas_filtro SET ambito = 'operations' WHERE ambito = 'tasks';
```

⚠️ **6. Y el renombre de la columna lo rompe otra vez, por otra puerta.**
`act-filters/grupos/fechas.ts:11` declara `key: 'fecha_entrega'`, y esa clave **se persiste** dentro
de `vistas_filtro.valores` (jsonb) y `ocultos` (text[]). La misma migración reescribe esas claves.

**El localStorage no se puede migrar desde la base.** Va un shim de una lectura: si no hay
`filtros:operations` y sí `filtros:tasks`, se copia y se borra el viejo. Lo mismo con
`TASKS_TAB_PREF`.

⚠️ **No hay RLS nueva sobre `actividades`** — la cláusula de confidencialidad de §2.1 quedó
diferida—, **pero sí sobre `temas`** (§3.1). La frase "no hay RLS nueva" del documento anterior era
falsa.

**El precheck del 29/08 aplica entero.** La RLS se verifica consultando como `anon` y con un rol sin
privilegios, no leyendo el esquema: ver una policy no es ver control de acceso. Y `db push` aplica
**todas** las migraciones pendientes — `migration list --linked` antes.

---

## 5. UI

Reuniones entra como **quinta pestaña** de `/operations`. `/reuniones` deja de existir como ruta
—con **redirect** a `/operations?tab=reuniones`, que el documento anterior no mencionaba— y el
sidebar muestra un solo ítem.

Los cinco lugares del catálogo de permisos cambian juntos (los lista el encabezado de
`src/shared/auth/permissions/index.ts`), más las claves i18n: **no son "los dos `.json`" y ya**, son
~20 claves nuevas entre temas, cierre y reapertura.

⚠️ **El tamaño real del trabajo, que el documento anterior despachaba en un párrafo.** Hoy no existe
**ni un archivo** de temas: `grep -rn "reunion_temas"` en `src/` da **cero**. No hay repo, ni hook,
ni tipo, ni componente. El único precedente comparable es la mesa de participantes de la fase 1 —
**5 componentes + `useParticipantes` + 2 utils + 62 claves i18n**, y eso para *una* tabla. Acá son
tres y una FK compuesta.

**El modal del tratamiento es donde nacen las tareas, y es el paso central.** Al crear o editar un
punto se cargan sus tareas en la misma pantalla: título, responsable, **`fecha_inicio`** (§2.10),
fecha comprometida y horas. Cada línea es un `INSERT` en `actividades` con `reunion_id` +
`reunion_tema_id`.

Tres piezas que la revisión encontró faltando:

1. **El buscar-o-crear de `temas`** (§2.3). Pieza nueva; `CatalogoSelect` no sirve.
2. ⚠️ **El formulario de tarea no se reusa tal cual.** `useActividadForm` es **un estado singleton
   por provider** —un modal a la vez—, y adentro del acta quedarían tres `Modal` anidados con el
   mismo `z-index`. Además `payloadDeAlta` no acepta las columnas nuevas. Reusarlo exige refactorar
   el hook para admitir más de una instancia.
3. ⚠️ **Montar reuniones en `TasksProvider` se lo cobra Stratix.** `StratixModule` monta el mismo
   provider y los hooks se componen **incondicionalmente**: un `useReuniones()` ahí dispararía
   fetches en `/stratix-mkt`, donde la pestaña no existe. El hook va detrás de una condición.

⚠️ **El "enlace de sólo lectura" a la reunión de origen no puede ser un enlace hoy.**
`useSearchParams` tiene **cero ocurrencias en todo `src/`**: el expediente es un `Modal` abierto por
`useState`, y una reunión concreta nunca tuvo URL. La pestaña activa vive en
`useUserPreference('tab-tasks')`, no en el pathname. Entra en la fase el routing mínimo por query
param —`?tab=reuniones&reunion=<id>`— que además es lo que hace posible el redirect de `/reuniones`.

**El cierre del acta** (§2.8) suma el botón en el expediente —que primero tiene que mostrar el
`estado`— y la reapertura por admin con `ConfirmModal`.

**La unificación de carpetas entra, como paso final de la fase.** `src/features/tasks/` pasa a
`src/features/operations/` y `src/features/reuniones/` se muda adentro. Va último a propósito: es
un diff de renombres que taparía el trabajo de esquema y de UI si fuera primero.

---

## 6. Lo que NO entra en esta fase

- **La cláusula de confidencialidad en la RLS de `actividades`** (§2.1). Diferida por Wagner el
  09/09, anotada en el `.todo`. Es la deuda más grande que la fase deja abierta.
- **El acta imprimible y los heredados** — seguían siendo fase 3 y lo siguen siendo.
- **Romper el acople asignable/liquidable** (§2.5). Tarea propia.
- **Partir `actividades`** en sus tres (ahora cuatro) roles. El argumento de fondo de §2.10 sigue
  vivo (§1).
- **El motor de filtros aplicado a reuniones.** Quedó hecho para `/tasks` en el PR #68 y debería
  reutilizarse acá; se decide cuando la pestaña esté en pantalla.
- **Extender `log_cambio_actividad` a las fechas** (§2.6). Mejora de auditoría independiente.
- **El botón "promover a tarea"** que dibujaba §2.1 del 29/08: no hace falta. Un pendiente nace ya
  siendo tarea.

---

## 7. Deuda que esta fase produce, y hay que pagar en ella

- **La regla del centinela *«`reunion_pendientes` no crece»* queda huérfana** cuando la tabla se
  borra. Vive en el repo de datos del usuario, no en el código, así que no la agarra ningún gate:
  hay que borrar la sección a mano.
- **El CLAUDE.md miente en tres lugares** apenas esto se mergee: la tabla de módulos, el párrafo de
  `deriveMiembrosAsignables` y el árbol de `src/`. Se corrige en la misma rama.
- **Cero tests del cierre.** Los ocho tests del módulo son de utils puros; ninguno toca RLS ni
  triggers. Las tres piezas de §2.8 nacen con la cobertura que se les escriba acá.
- **`src/features/tasks/types.ts` tiene una DEUDA anotada** (re-exporta `Actividad` sin ser un
  index) que la mudanza de carpeta toca por contacto. No se paga acá: son 21 imports.
