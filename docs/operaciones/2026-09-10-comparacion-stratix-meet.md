# `stratix-meet` frente al modelo de `operations` — comparación relacional y veredicto

*2026-09-10. Compara el esquema que `stratix-meet` tiene desplegado en el proyecto Supabase de producción contra el diseño de `docs/superpowers/specs/2026-09-09-operations-unificacion-design.md`, cuyas seis fases están en ejecución.*

> **Sobre qué está verificado y qué no.** Todo lo que sigue sale de leer el esquema en la base y
> el código de los dos repos. Lo que **no** se verificó es quién ejecutó los cambios: no hay
> registro de quién escribió SQL en el editor de Supabase, y este documento no lo afirma. Donde
> dice "Freddy" en los títulos de §2.1 y §2.2, léase "el modelo de `stratix-meet`" — es una
> etiqueta para distinguir dos diseños, no una atribución de autoría.
>
> Lo que sí está probado, y es más incómodo que cualquier atribución:
>
> - `stratix_meet` no aparece en **ninguna** migración de eminat-app, en ninguna rama, en toda la
>   historia de git. Ninguna migración crea `meetings` ni `topics`.
> - Las policies `actividades_read_stratix_meet` y `actividades_update_stratix_meet` **tampoco
>   están en el repo de `stratix-meet`**: fuera de TypeScript, ese repo menciona `actividades`
>   una sola vez, en un script de prueba.
> - O sea: **esas dos policies no existen en ningún archivo, de ningún repositorio. Sólo en la
>   base de producción.** Nadie puede leerlas, revisarlas ni reconstruirlas sin consultar la base
>   en vivo.
> - `empresas_read_authenticated` es la excepción: está textual en
>   `stratix-meet/supabase/schema.sql:224`, dentro de un comentario, como instrucción a ejecutar.

---

## 1. Los dos modelos, lado a lado

### `stratix-meet`

```
meetings (15 col, 13 filas)
  ├── participants text[]                    nombres denormalizados
  └── meeting_participants (28 filas)  N:N → usuarios
topics (10 col, 31 filas)
  ├── meeting_id       uuid NOT NULL   →  un tema pertenece a UNA reunión
  ├── section          text NOT NULL
  ├── responsable_id   uuid            →  usuarios
  └── actividad_id     uuid NULL       →  actividades   (una columna)
tasks (11 col, 0 filas)                      muerta: el código nunca la consulta
```

### `operations`

```
temas                                        catálogo por empresa
  UNIQUE (empresa, lower(btrim(titulo)))     el asunto, que es el mismo siempre
  activo
    ↕ N:N
reunion_temas  (reunion_id, tema_id, posicion, descripcion)
                                             EL TRATAMIENTO: qué se dijo ESE día
    ↕ N:N
reunion_tema_actividades  (…, rol: 'origen' | 'revisada')
    ↕
actividades                                  el compromiso, en la tabla que ya existe
```

---

## 2. Las cuatro diferencias que importan

### 2.1 Un tema pertenece a una reunión (Freddy) vs. un tema atraviesa reuniones (spec §2.3)

`topics.meeting_id` es `NOT NULL`. Un punto del orden del día existe dentro de un acta y de ninguna otra.

Es **exactamente el modelo que la fase 1 de `operations` tenía y que se corrigió el 09/09**, por el motivo que §2.3 deja escrito: *"«Presupuesto Q4» tratado en cinco reuniones son cinco títulos repetidos sin nada que los una"*.

Y `topics.title` es texto libre sin normalizar. `"Presupuesto Q4"`, `"presupuesto q4"` y `"Presupuesto Q4 "` son tres asuntos distintos. El `UNIQUE (empresa, lower(btrim(titulo)))` del spec existe precisamente porque la historia que se quiere unir se rompe con el primer título mal tipeado.

No es que el modelo de `stratix-meet` sea una alternativa que no se consideró. Es la versión anterior del nuestro, el día después de haberla descartado por escrito.

### 2.2 El vínculo tarea↔acta es una columna (Freddy) vs. una fila (spec §2.4)

`topics.actividad_id` es una columna nullable sobre el tema: un tema tiene a lo sumo **una** actividad.

§2.4 documenta cinco fallas graves encontradas en la versión de *dos* columnas sobre `actividades`. Tres se transfieren tal cual a la versión de una columna sobre `topics`:

| falla de §2.4 | ¿aplica a `topics.actividad_id`? |
|---|---|
| 1. `SET … = NULL` desvincula sin control, con el acta cerrada y sin ser nadie | **sí**, idéntica |
| 3. Mover la tarea del acta A a la B valida sólo B | **sí**: repuntar la columna borra el origen |
| 5. Las FK pueden abortar el borrado de una reunión según el orden de triggers | **no** — `ON DELETE SET NULL` lo evita, al precio de perder el vínculo en silencio |

Pero lo determinante no es ninguna de esas. Es que **el caso de uso central del módulo no se puede representar**. La frase con la que abre §1 del spec —*"se acuerda en una reunión, se ejecuta, se revisa en la siguiente"*— necesita que una tarea se relacione con **dos** tratamientos, con roles distintos (`'origen'`, `'revisada'`). Con una columna: o se repunta y se pierde el origen, o el acta de seguimiento no lista la tarea.

`stratix-meet` resuelve el seguimiento con un `boolean carried_over` en su tabla `tasks` — que está muerta, 0 filas, nunca consultada. O sea que **la función de seguimiento entre reuniones, que es el título del producto, no está implementada en ninguna forma que el esquema pueda sostener.**

Y hay un problema de cardinalidad que ni siquiera es del spec: al ser 1:1, un punto de discusión que produce tres compromisos necesita tres puntos de discusión. El orden del día queda modelado en función de la lista de tareas, y no al revés.

### 2.3 Dos fuentes de verdad para los participantes

`meetings.participants text[]` con el comentario *"nombres denormalizados (para vistas)"*, **y además** `meeting_participants` como N:N contra `usuarios`. Nada las sincroniza. Alguien cambia de apellido y el array miente para siempre.

Esto no es un trade-off discutible: es un defecto. `reunion_participantes` es una sola tabla y no tiene el problema.

### 2.4 No hay acta congelada

`meetings.status = 'finalizada'` no congela nada. El acta se re-renderiza desde datos vivos: cambia retroactivamente cuando alguien cambia de cargo, de nombre o de equipo.

El diseño del 28/08 ya había resuelto esto con `reuniones.acta_snapshot jsonb` escrito al cerrar, precisamente porque `cargo` es N:N (`usuario_cargos`) y `departamento` no es columna — se deriva usuario→equipo→departamento. Un acta firmada que se reescribe sola no es un acta.

*(§2.9 del spec de unificación señala, aparte, que cerrar un acta hoy es imposible con la policy actual. Eso es deuda nuestra, no de `stratix-meet`.)*

---

## 3. Lo que `stratix-meet` hace bien, y hay que decirlo

- **Escribe en `actividades` en vez de duplicar las tareas.** Es el instinto correcto, y es el mismo que §2.2 del spec formaliza: *"los pendientes SON actividades"*. La tabla `tasks` propia existe en el esquema pero el código no la usa — o sea que la decisión buena le ganó a la mala dentro del propio repo.
- **Las dos policies sobre `actividades` están bien escritas**: acotadas por `EXISTS (topics t WHERE t.actividad_id = actividades.id AND t.user_id = auth.uid())`, y la de `UPDATE` con `with_check` además del `using`. Eso es lo que la mayoría omite. El problema con ellas no es el contenido: es que están sólo en la base y en ningún archivo, así que ese acierto se pierde en cuanto alguien recree el proyecto.
- **`meeting_participants`** con PK compuesta `(meeting_id, profile_id)` está bien planteada.
- **Usa `empresas` y `usuarios`** en vez de las `companies`/`app_users` que proponía el spec de agosto. Corrigió eso.

---

## 4. Veredicto: ¿se sigue desarrollando a partir de esto?

**El esquema, no. La superficie de producto, sí.**

No por calidad — por dirección. Las dos relaciones que definen el modelo (`topics.meeting_id NOT NULL` y `topics.actividad_id`) son las dos que `operations` corrigió con motivo escrito. Partir de `stratix-meet` significaría cambiar las dos, y cambiar las dos no es "construir encima": es reemplazarlo y quedarse con los nombres.

El costo de no partir de ahí es despreciable:

| qué hay | cuánto cuesta traerlo |
|---|---|
| 13 reuniones, 31 temas, 28 participantes, 13 actividades | dos `INSERT … SELECT` |
| 5 tablas, 2 de ellas muertas | nada: se retiran |
| 2.852 líneas de app | ver abajo |

**Lo que sí conviene cosechar**, porque es producto y no esquema, y ahí el trabajo es real:

1. **El flujo de acta en vivo** — levantar puntos y compromisos durante la reunión, uno por uno. Es una decisión de UX validada con uso real (31 temas en un día).
2. **`components/ActaPrint.tsx`** — el armazón de impresión. El spec ya planea subir `report-html` a `src/shared/utils/hoja-imprimible/` en la fase 3; esto es material para esa fase.
3. **La notificación por correo al asignar** (`app/api/notify-task/route.ts`) con el enlace al acta. §2.2 del spec marca las notificaciones como el único de los cinco costos que *"no se cobra solo"* y que necesita tres piezas. Acá hay una de ellas funcionando.
4. **Arrastrar pendientes de reuniones anteriores a una reunión activa** — la interacción, no su implementación. Es la UI de lo que `reunion_tema_actividades` con `rol='revisada'` modela bien.

**Lo que no se toca:** el esquema, el `schema.sql` (que no reproduce ninguna de las dos bases: dice `position` donde producción tiene `order_index`, y no tiene `section`, `responsable_id`, `actividad_id` ni `meeting_participants`), los dos enums muertos, y el `AuthGate` hasta que tenga `shouldCreateUser: false`.

---

## 5. Resumen en una línea

`stratix-meet` es un buen sistema para **levantar un acta**. `operations` es un sistema para **seguir un compromiso a través de varias actas**. No son dos versiones de lo mismo con distinta prolijidad: son dos alcances, y el segundo no se alcanza desde el modelo del primero sin cambiar sus dos relaciones fundamentales.
