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
