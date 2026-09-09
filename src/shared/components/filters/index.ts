// Barrel del motor de filtros en pantalla (`@/shared/components/filters`). Sólo re-exporta.
//
// Vivían sueltos en `ui/` —`FilterBar` y `SelectFilter`, uno al lado del otro entre veinte
// componentes sin relación—, y ahí no se veía que fueran UNA pieza: la barra y su vocabulario de
// controles. El plan de vistas guardadas le suma cuatro más (el «+ Filtro», el desplegable de
// vistas, el panel armador y el chip), que sueltos habrían sido seis piezas de la misma máquina
// repartidas por orden alfabético.
//
// `ui/` sigue siendo la UI sin dominio; esto es el motor de filtros, que tiene uno.
// Se exporta UNA cosa: la que los módulos montan, hoy el armador. `FilterBar`, `FilterPicker`,
// `FilterPresets`, `SelectFilter` e `InputFilter` son su adentro —se toman entre hermanos, no
// por acá—, y ponerlos en el barrel los volvía API pública para cero consumidores.
export { default as FiltersPanel } from './FiltersPanel'
// `ChipFilter` sí sale: lo montan Admin, Medical y Directorio, que dibujan su propia fila de
// controles en vez del panel armador. Es el único control del vocabulario que se usa suelto.
export { default as ChipFilter } from './ChipFilter'
