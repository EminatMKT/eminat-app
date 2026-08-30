# UI

## Todo `<select>` obligatorio arranca en un placeholder vacío

Un desplegable cuyo valor es obligatorio lleva `<option value="">— Select —</option>` como primera
opción, y la validación rechaza el vacío.

<!-- check: contact
     requires: <select
     absent: value=""
     exime: select-con-default
     files: .tsx
     version: 2
     test: falla :: <select>{opciones.map(o => <option>{o}</option>)}</select>
     test: pasa existente :: <select>{opciones.map(o => <option>{o}</option>)}</select>
     test: pasa :: <select><option value="">— Select —</option>{opciones.map(o => <option>{o}</option>)}</select>
     test: pasa :: // centinela-exime: select-con-default@2 — "Pendiente" es donde empieza toda tarea\n<select>{opciones.map(o => <option>{o}</option>)}</select>
-->

**La excepción, y hay que saber distinguirla: un default SIGNIFICATIVO.** No es lo mismo la
primera opción de una lista que un valor que significa algo por sí solo. "Pendiente" es donde
empieza toda tarea del Kanban y el mes en curso es el mes en curso: quien no toca ese campo
igual guarda lo correcto, y obligarlo a elegir es fricción sin nada a cambio. Angie, en cambio,
era la primera de un dropdown de personas — ahí el valor no significaba nada, sólo estaba
primero.

La prueba: **¿el default sería el mismo si la lista estuviera en otro orden?** Si sí, es un
default; si cambia con el orden, es un accidente y necesita el placeholder. Se firma con
`select-con-default@2` y su fila en `rules/EXENCIONES.md`.

**Motivo:** sin placeholder el navegador pinta la primera opción de la lista, pero el estado sigue
en `''`. Las dos formas de terminar mal ya pasaron en este repo: "New task" asignaba tareas a
Angie porque era la primera de la lista y nadie la había elegido (QA 12/08, hallazgo #3), y el
select de marca mostraba una marca elegida mientras guardar respondía *"Brand / Area is required"*
(19/08). Lo que se ve y lo que se guarda tienen que ser lo mismo.

## Lo que se ve tiene que poder explicarse solo
<!-- sin check: criterio de presentación que requiere leer el significado del dato -->

Un número en pantalla que necesita que alguien lo explique al lado es un número mal presentado.
Si una cifra sale de un cálculo con reglas (filtros activos, exclusiones, totales que no suman lo
listado), la pantalla dice cuál es la regla — con un chip, un pie de tarjeta o una columna extra.

**Motivo:** el reporte de pago lista tareas que la persona pidió pero suma solo las que ejecuta
("listar sí, sumar no"); sin la columna *Responsable*, 6h en la fila y 0h en el total parecen un
error de cálculo. Lo mismo con los filtros del tablero: sin el chip "filtrado · N", un número
filtrado se presenta como si fuera el total.

## Lo que solo se puede hacer con el mouse necesita otro camino
<!-- sin check: criterio de accesibilidad que depende de la pantalla completa -->

Si una acción existe únicamente como clic sobre un elemento gráfico —una barra, una porción de
un pie, un área del canvas— tiene que existir la misma acción por otra vía (un desplegable, un
botón), o quedar anotada en `.todo/TODO.md` como deuda. Lo que no se acepta es que no quede
registro.

**Motivo:** el cross-filter del tablero de Research se maneja clickeando barras y no se puede usar
con teclado. Hoy no bloquea a nadie porque los mismos filtros están en los desplegables del panel
— pero eso es una coincidencia afortunada, no una decisión. La próxima gráfica clickeable puede
no tenerla.

## Hay plugins de diseño instalados: usarlos antes de improvisar
<!-- sin check: es un flujo de trabajo previo a escribir, no contenido verificable. Lo que sí
     hace el centinela es RECORDARLO: al crear un .tsx nuevo con estructura inyecta el aviso
     (rules/centinela/sugerencias.ts). No bloquea — un aviso en cada edición se vuelve invisible
     a los dos días, que es como terminó apagado el plugin anterior. -->

Antes de escribir UI nueva o rediseñar una existente, invocar la skill que corresponda. Están
disponibles en este entorno y no hay que pedir permiso para usarlas:

| Skill | Cuándo |
|---|---|
| `frontend-design` | Pantalla, módulo o componente visual nuevo; rediseño de uno existente |
| `dataviz` | **Antes** de escribir la primera línea de una gráfica: tipo de gráfico, paleta, ejes, leyendas |
| `accessibility` | Auditar contra WCAG 2.2 — contraste, foco, teclado, lectores de pantalla |

**No aplica** a un ajuste puntual: cambiar un texto, corregir un padding, agregar el placeholder
de un select. Una skill de diseño para eso es ceremonia, no criterio. Por eso el recordatorio
automático dispara SÓLO al crear un `.tsx` nuevo con tres elementos o más: es el único caso
donde la regla aplica sin discusión.

**Motivo (medido el 25/08/2026):** se crearon SEIS componentes visuales ese día y no se invocó
la skill en ninguno — sólo cuando el usuario lo pidió a mano. El costo no fue teórico: los chips
de estado quedaron en 1.71:1 de contraste y los botones en 2.77:1, contra el 4.5:1 que pide
WCAG AA. Eso lo detecta `accessibility` en un minuto y se descubrió dos horas después, mirando.

Improvisando sale lo genérico — el layout que ya vimos mil veces, la paleta por
defecto, la gráfica que no se lee de lejos. `dataviz` en particular hay que abrirla **antes** y no
después: el tipo de gráfico y la paleta son decisiones que se toman al empezar, y rehacerlas
cuesta el gráfico entero. El pie del tablero de Research se rehizo tres veces —dona, huecos entre
porciones, leyenda abajo— por decidir eso sobre la marcha.

## La acción primaria vive en la barra de su vista, no en el topbar
<!-- sin check: criterio de diseño de layout, no forma textual -->

El botón que crea, importa o exporta va **dentro del contenido**, en la barra de la vista que lo
usa y al lado de lo que opera — junto a los filtros de esa tabla o de ese tablero.

**Referencia: Admin.** El alta de usuarios es `<NewButton>` pasado como `action` a
`RoleFilterBar`, la misma barra donde están la búsqueda y el filtro de rol. Ese es el patrón a
copiar, y `NewButton` es el componente que se reusa: pone el `+` él mismo, así que el símbolo no
se desincroniza entre pantallas.

El topbar es del **shell**: título, notificaciones, quién está en línea, tema. No es de la vista.

**Motivo:** un botón de la vista puesto en el topbar aparece y desaparece según la pestaña —el
shell parpadea al moverse entre Kanban y Gantt— y queda lejos de las tarjetas que crea, en la
otra punta de la pantalla. Además compite con los controles del shell, que son de otra jerarquía:
el usuario los lee juntos y no lo son. "New task" estuvo ahí arriba en Stratix hasta el
20/08/2026, y era la misma corrección que ya se había pedido para Admin.

## Todo proceso destructivo lleva confirmación

<!-- check: block
     requires: Repo\.(remove|delete)|['"]DELETE['"]
     absent: ConfirmModal
     files: .tsx
     except: /shared/data/,/api/
     version: 1
     test: falla :: const r = await apiSend('DELETE', `/api/x/${id}`)
     test: falla :: await usuariosRepo.remove(id)
     test: pasa :: const r = await apiSend('DELETE', url); return <ConfirmModal onConfirm={x} />
     test: pasa :: const filas = rows.filter(Boolean)
     test: falla existente :: await usuariosRepo.remove(id)
-->

Borrar una fila, o pisar una que ya existe, **no ocurre al primer clic**. Va con `ConfirmModal`,
que además tiene su variante `destructive` y su modo de escribir-para-confirmar.

**Qué cuenta como destructivo:** un `DELETE`, un `remove`, y también un guardado que **pisa** algo
que ya existía — el guardado es last-write-wins, así que sobreescribir no tiene vuelta. Crear no
cuenta: una fila de más se borra. Por eso el formulario de tarea pregunta al EDITAR y no al crear.

**Qué NO cuenta, y por eso el check exceptúa dos rutas:** `src/shared/data/` y las rutas API. Ahí
vive la operación, no la decisión — la confirmación es de la pantalla que la dispara. Un `.ts` de
hook tampoco la lleva: el modal es del componente.

**El check mira el archivo que lo dispara.** Si un componente manda un `DELETE` y no menciona
`ConfirmModal`, frena. No puede saber si la confirmación vive dos componentes más arriba, y por
eso pide que esté a la vista de quien lee el borrado — que es exactamente donde uno la busca.

**Motivo:** el 29/08 se encontró que `/admin` borraba sin preguntar en dos lugares. En Roles, un
clic se llevaba el rol y sus módulos asignados. En Organización era peor de leer: el borrado SÍ
se frenaba… pero sólo si la fila estaba en uso, así que una empresa sin dependientes se iba en
silencio y quien tocó el botón por error se enteraba después. Que exista una validación de
integridad no es lo mismo que preguntarle a la persona: la primera protege a la base, la segunda
protege a quien la usa.

Y hay un motivo que ya está escrito en este mismo archivo: **lo que se ve tiene que poder
explicarse solo.** Un botón rojo que borra al tocarlo no da margen para entender qué se va.
