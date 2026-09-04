// Las vistas que le quedan al módulo después de que las tareas se fueron a `/tasks`. Único
// lugar con estos slugs: estaban escritos a mano en el provider (dentro de un `oneOf(...)`) y
// en la config del shell. Un slug mal escrito no falla: la pestaña simplemente no abre.
//
// ⚠️ El valor es el DATO —lo que se guarda en la preferencia `tab-stratix`—, no la etiqueta.
// Cuatro valores dejaron de existir ('overview', 'kanban', 'solicitudes', 'reporte') y mucha
// gente los tiene guardados: el `oneOf(...STRATIX_TABS)` del provider los rechaza y gana el
// default. Por eso el default es SOCIAL y no puede seguir siendo KANBAN, que ya no existe.
export const STRATIX_TAB = {
  SOCIAL: 'social',
  COMPETENCIA: 'competencia',
  EQUIPO: 'equipo',
} as const

export type StratixTab = (typeof STRATIX_TAB)[keyof typeof STRATIX_TAB]

// El orden ES el del sidebar: del tablero a lo operativo.
// El tipo va explícito: `Object.values` ensancha a string[] y el catálogo dejaría de
// estrechar nada en quien lo consuma.
export const STRATIX_TABS: readonly StratixTab[] = Object.values(STRATIX_TAB)

// La clave con la que se recuerda la pestaña abierta entre sesiones.
export const STRATIX_TAB_PREF = 'tab-stratix'
