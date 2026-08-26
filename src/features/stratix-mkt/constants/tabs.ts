// Las vistas del módulo. Único lugar con estos slugs: estaban escritos a mano en el provider
// (dentro de un `oneOf(...)`), en `OverviewTab` y en la config del shell — tres listas que nada
// obligaba a mantener iguales. Un slug mal escrito no falla: la pestaña simplemente no abre.
//
// ⚠️ El valor es el DATO —lo que se guarda en la preferencia `tab-stratix`—, no la etiqueta.
// Lo que se muestra sale de i18n, como con ESTADO.
export const STRATIX_TAB = {
  OVERVIEW: 'overview',
  KANBAN: 'kanban',
  SOLICITUDES: 'solicitudes',
  SOCIAL: 'social',
  COMPETENCIA: 'competencia',
  EQUIPO: 'equipo',
  REPORTE: 'reporte',
} as const

export type StratixTab = (typeof STRATIX_TAB)[keyof typeof STRATIX_TAB]

// El orden ES el del sidebar: del tablero a lo operativo.
// El tipo va explícito: `Object.values` ensancha a string[] y el catálogo dejaría de
// estrechar nada en quien lo consuma.
export const STRATIX_TABS: readonly StratixTab[] = Object.values(STRATIX_TAB)

// La clave con la que se recuerda la pestaña abierta entre sesiones.
export const STRATIX_TAB_PREF = 'tab-stratix'
