# UI

## Todo `<select>` obligatorio arranca en un placeholder vacío

Un desplegable cuyo valor es obligatorio lleva `<option value="">— Select —</option>` como primera
opción, y la validación rechaza el vacío.

**Motivo:** sin placeholder el navegador pinta la primera opción de la lista, pero el estado sigue
en `''`. Las dos formas de terminar mal ya pasaron en este repo: "New task" asignaba tareas a
Angie porque era la primera de la lista y nadie la había elegido (QA 12/08, hallazgo #3), y el
select de marca mostraba una marca elegida mientras guardar respondía *"Brand / Area is required"*
(19/08). Lo que se ve y lo que se guarda tienen que ser lo mismo.

## Lo que se ve tiene que poder explicarse solo

Un número en pantalla que necesita que alguien lo explique al lado es un número mal presentado.
Si una cifra sale de un cálculo con reglas (filtros activos, exclusiones, totales que no suman lo
listado), la pantalla dice cuál es la regla — con un chip, un pie de tarjeta o una columna extra.

**Motivo:** el reporte de pago lista tareas que la persona pidió pero suma solo las que ejecuta
("listar sí, sumar no"); sin la columna *Responsable*, 6h en la fila y 0h en el total parecen un
error de cálculo. Lo mismo con los filtros del tablero: sin el chip "filtrado · N", un número
filtrado se presenta como si fuera el total.

## Lo que solo se puede hacer con el mouse necesita otro camino

Si una acción existe únicamente como clic sobre un elemento gráfico —una barra, una porción de
un pie, un área del canvas— tiene que existir la misma acción por otra vía (un desplegable, un
botón), o quedar anotada en `.todo/TODO.md` como deuda. Lo que no se acepta es que no quede
registro.

**Motivo:** el cross-filter del tablero de Research se maneja clickeando barras y no se puede usar
con teclado. Hoy no bloquea a nadie porque los mismos filtros están en los desplegables del panel
— pero eso es una coincidencia afortunada, no una decisión. La próxima gráfica clickeable puede
no tenerla.

## Hay plugins de diseño instalados: usarlos antes de improvisar

Antes de escribir UI nueva o rediseñar una existente, invocar la skill que corresponda. Están
disponibles en este entorno y no hay que pedir permiso para usarlas:

| Skill | Cuándo |
|---|---|
| `frontend-design` | Pantalla, módulo o componente visual nuevo; rediseño de uno existente |
| `dataviz` | **Antes** de escribir la primera línea de una gráfica: tipo de gráfico, paleta, ejes, leyendas |
| `accessibility` | Auditar contra WCAG 2.2 — contraste, foco, teclado, lectores de pantalla |

**No aplica** a un ajuste puntual: cambiar un texto, corregir un padding, agregar el placeholder
de un select. Una skill de diseño para eso es ceremonia, no criterio.

**Motivo:** improvisando sale lo genérico — el layout que ya vimos mil veces, la paleta por
defecto, la gráfica que no se lee de lejos. `dataviz` en particular hay que abrirla **antes** y no
después: el tipo de gráfico y la paleta son decisiones que se toman al empezar, y rehacerlas
cuesta el gráfico entero. El pie del tablero de Research se rehizo tres veces —dona, huecos entre
porciones, leyenda abajo— por decidir eso sobre la marcha.

## La acción primaria vive en la barra de su vista, no en el topbar

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
