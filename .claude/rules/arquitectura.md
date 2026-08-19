# Arquitectura

## El tablero y la operación son cosas distintas

Un **tablero** (dashboard) responde "cómo venimos": indicadores, gráficas, rankings. Se mira de
lejos, muchas veces proyectado. Una **vista operativa** (Kanban, Gantt, tabla, formulario) es
donde se trabaja: se mira de cerca y se toca.

No mezclarlos en el mismo grupo de navegación: el tablero va en su propio ítem de menú, no como
la primera pestaña de la sección de producción.

**Motivo:** son dos usos con dos públicos y dos ritmos. Enterrar el tablero como pestaña 1 de
"Production" obliga a pasar por él para llegar a Kanban, y obliga a entrar a "Production" para
mirar un número — las dos direcciones molestan.

## Un componente de tablero se comparte; el dominio no

Los componentes visuales del tablero viven en `shared/components/dashboard/` y **no saben nada
del módulo que los usa**: reciben datos, colores y etiquetas por props.

Lo que sí es del módulo —qué color le toca a cada etapa, cómo se traduce un valor canónico, qué
filtros existen— se resuelve en `features/<modulo>/` y se pasa hacia adentro.

**Motivo:** es lo que permitió que Stratix reusara el tablero de Research sin arrastrarse el
dominio de Research. Un componente compartido que importa de `features/` deja de ser compartido:
encadena los dos módulos y el próximo que lo reuse hereda leads que no le importan.

**Regla práctica:** si al mover un componente a `shared/` hay que llevarse un import de
`features/`, ese import es la prueba de que falta un prop.

## Antes de crear, buscar el que ya existe

Antes de escribir un componente nuevo, revisar si otro módulo ya resolvió lo mismo. Si existe y
sirve, promoverlo a `shared/` y reusarlo. Si existe y no sirve tal cual, promoverlo con el prop
que falte.

**Motivo:** hoy hay tres `StatCard` distintos (`accounting`, `admin`, `research`) que hacen casi
lo mismo. Cada copia se arregla por separado, así que el bug se arregla una vez y sobrevive dos.
