// Barrel del motor de filtros en pantalla (`@/shared/components/filters`). Sólo re-exporta.
//
// Vivían sueltos en `ui/` —`FilterBar` y `SelectFilter`, uno al lado del otro entre veinte
// componentes sin relación—, y ahí no se veía que fueran UNA pieza: la barra y su vocabulario de
// controles. El plan de vistas guardadas le suma cuatro más (el «+ Filtro», el desplegable de
// vistas, el panel armador y el chip), que sueltos habrían sido seis piezas de la misma máquina
// repartidas por orden alfabético.
//
// `ui/` sigue siendo la UI sin dominio; esto es el motor de filtros, que tiene uno.
// Se exporta UNA cosa: la que los módulos montan. `SelectFilter` e `InputFilter` son el adentro
// de la barra —los toma como hermanos, no por acá—, y ponerlos en el barrel los volvía API
// pública para cero consumidores. Cuando exista `FiltersPanel` (el armador con vistas guardadas
// y el «+ Filtro»), la línea de abajo pasa a ser ésa.
export { default as FilterBar } from './FilterBar'
