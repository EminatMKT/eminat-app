// Barrel: sólo re-exporta. El archivo suelto llegó a 88 líneas y crece con cada módulo, así que
// se partió en carpeta — la ruta de import no cambió y ningún consumidor se tocó.
export { D } from './colores'
export type { SubItem, PanelKey } from './tipos'
export { SUB_ITEMS } from './subvistas'
export { PANEL_META } from './paneles'
export { NAV, AUTO_TITLE } from './nav'
