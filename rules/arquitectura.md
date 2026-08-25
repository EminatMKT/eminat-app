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

Los componentes visuales del tablero viven en `src/shared/components/dashboard/` y **no saben nada
del módulo que los usa**: reciben datos, colores y etiquetas por props.

Lo que sí es del módulo —qué color le toca a cada etapa, cómo se traduce un valor canónico, qué
filtros existen— se resuelve en `src/features/<modulo>/` y se pasa hacia adentro.

**Motivo:** es lo que permitió que Stratix reusara el tablero de Research sin arrastrarse el
dominio de Research. Un componente compartido que importa de `src/features/` deja de ser compartido:
encadena los dos módulos y el próximo que lo reuse hereda leads que no le importan.

<!-- check: block
     paths: src/shared/components/dashboard/
     pattern: from\s+['"](@/features|\.\./\.\./)
     test: falla @src/shared/components/dashboard/StatCard/index.tsx :: import { STAGE } from '@/features/research'
     test: pasa @src/shared/components/dashboard/StatCard/index.tsx :: import { fmtMonto } from '@/shared/utils'
-->

**Regla práctica:** si al mover un componente a `src/shared/` hay que llevarse un import de
`src/features/`, ese import es la prueba de que falta un prop.

## Antes de crear, buscar el que ya existe

Antes de escribir un componente nuevo, revisar si otro módulo ya resolvió lo mismo. Si existe y
sirve, promoverlo a `src/shared/` y reusarlo. Si existe y no sirve tal cual, promoverlo con el prop
que falte.

**Motivo:** hoy hay tres `StatCard` distintos (`accounting`, `admin`, `research`) que hacen casi
lo mismo. Cada copia se arregla por separado, así que el bug se arregla una vez y sobrevive dos.

## Un componente nuevo nace en `src/shared/` si otro módulo podría pedirlo

La otra mitad de la regla de arriba. Al crear un componente, la pregunta es siempre: **¿otro
módulo pediría este mismo componente?** Si la respuesta es sí —aunque hoy no lo use nadie más—
va directo a `src/shared/components/`, no a `src/features/<modulo>/`.

Sirve preguntarse cómo se lo nombraría en voz alta. Si el nombre natural no menciona el módulo
—una tarjeta de indicador, un panel recogible, una barra de filtros, un modal de confirmación—
es compartido. Si no se lo puede nombrar sin decir "de leads" o "de actividades", es del módulo.

**Esto NO es permiso para agregar generalidad de más.** Mandarlo a `src/shared/` no significa
inventarle props "por si acaso": significa **no meterle el dominio adentro**. Se escribe con los
props que el primer uso necesita, y nada más; lo que lo hace compartible es que no importa de
`src/features/`, no que tenga quince opciones.

**Cuando es mitad y mitad, se parte.** La parte genérica va a `src/shared/` y el pegamento con el
dominio se queda en el módulo: `FilterBar` es compartido y `FiltersPanel` —que le pasa
`LEAD_FILTERS` y el contexto de Research— vive en Research.

**Motivo:** mover un componente después cuesta mucho más que nacerlo en el lugar correcto. El
tablero de Research tardó tres meses en llegar a `src/shared/`, y para entonces ya había tres
`StatCard` en el repo. Cuando se dudó, el costo lo pagó el que vino después.
