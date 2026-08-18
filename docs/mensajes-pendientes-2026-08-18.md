# Mensajes pendientes de enviar — 18/08/2026

Borradores para que los mandes vos. No se enviaron desde acá.
Contexto: PR #37, presentación de Federico ~28/08, recap la semana del 24.

---

## 1. Royner — el que destraba el histórico (URGENTE)

**Por qué importa:** el contador ya está en producción, pero arranca en **0** para
todos los leads. Si no cargamos lo ya hecho, el 28 el dashboard va a mostrar el
esfuerzo desde cero y no los ~165–170 alcances reales — que es justo el número
que Federico quiere presentar. Es el único punto que no se arregla con código.

> Hola Royner, ¿cómo va?
>
> Ya está lista la columna para registrar cuántos correos se le enviaron a cada
> estudio. De ahora en más se carga con un clic desde la tabla de leads: se abre
> una ventanita, ponés el número y confirmás.
>
> Para que el tablero muestre el trabajo real y no arranque en cero, necesito de
> vos el número de correos ya enviados por NCT#. Dos opciones, la que te quede
> más cómoda:
>
> 1. Me pasás tu Excel con dos columnas: **NCT#** y **cantidad de correos**, y yo
>    lo subo de una.
> 2. Entrás vos y los vas cargando desde la tabla.
>
> Con la opción 1 lo tenemos listo en minutos. ¿Te sirve mandarme el archivo
> antes del viernes? Federico presenta el 28 y ese número es el centro de la
> presentación.
>
> Gracias!

---

## 2. Federico — dos definiciones + un aviso

**Por qué importa:** las dos primeras cambian lo que se proyecta el 28, y la
tercera evita que crea que ve un error cuando en realidad es lo que pidió.

> Hola Federico, dos consultas y un aviso sobre el tablero de Research.
>
> **1. El porcentaje, ¿sobre qué base?**
> Hoy cada indicador muestra el porcentaje sobre los **leads cargados** (ej.
> "Sin respuesta: 2 · 25% · de 8 leads"). Pero en la reunión lo planteaste sobre
> los **correos**: *"se mandaron 200, de los 200, 50 no nos dieron respuesta"*.
> No son lo mismo: con ~81 estudios y ~170 correos, el mismo indicador da un
> número bastante distinto. ¿Cuál preferís que se lea en la presentación?
> Cambiarlo es un minuto, pero mejor decidirlo antes del 28.
>
> **2. "Contactado" cambió de significado (y es lo que pediste).**
> Ahora cuenta **leads con al menos un correo enviado**, no los que están en la
> etapa "Contactado" — tal cual lo definiste: *"cuántos han sido contactados,
> independientemente de cuántos correos se han enviado"*.
> El efecto que vas a ver: esa tarjeta y la torta de abajo van a mostrar números
> distintos, a propósito. Un estudio en "Sin respuesta" al que se le mandaron 3
> correos **sí** fue contactado, y suma en la tarjeta aunque en la torta aparezca
> en su etapa. Es el solapamiento que vos mismo marcaste en la reunión.
>
> **3. Sigo esperando las convenciones de etapas.**
> Quedó que me mandabas por correo cómo quedan definidas (si "Nuevo" pasa a "No
> contactado", después de cuántos días un contactado pasa a sin respuesta, si
> hace falta "Rechazado"). Sin eso no toco las etapas: cambiarlas mueve todos los
> registros históricos y prefiero hacerlo una sola vez y bien.
>
> Lo demás de la reunión ya está: el contador con su ventana de confirmación, la
> búsqueda por NCT#, el filtro por rango de fechas, los indicadores reordenados,
> y la torta rellena con los porcentajes adentro y la leyenda más grande al
> costado para que se lea proyectada.
>
> Avisame por 1 y 2 y lo dejo cerrado antes del recap de la semana del 24.

---

## 3. No enviar todavía

**Reclasificación de los ~35 leads legacy de prod** (Royner/Freddy). Sigue
pendiente, pero **depende del punto 3 de Federico**: si cambian las etapas
destino, cambia el mapeo. Pedirlo antes obliga a hacer el trabajo dos veces.
