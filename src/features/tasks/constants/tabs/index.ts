// Las vistas del módulo. Los valores son el DATO —lo que se guarda en la preferencia
// `tab-tasks`—, no la etiqueta: lo que se muestra sale de SUB_ITEMS y de i18n.
//
// Coinciden con los de Stratix a propósito: durante la fase 2 las dos rutas montan las mismas
// vistas.
export const TASKS_TAB = {
  OVERVIEW: 'overview',
  KANBAN: 'kanban',
  SOLICITUDES: 'solicitudes',
  PROJECTS: 'projects',
  CALENDAR: 'calendar',
  TEAM: 'team',
  REPORTE: 'reporte',
} as const

export type TasksTab = (typeof TASKS_TAB)[keyof typeof TASKS_TAB]

// El tipo va explícito: `Object.values` ensancha a string[] y el catálogo dejaría de estrechar
// nada en quien lo consuma.
export const TASKS_TABS: readonly TasksTab[] = Object.values(TASKS_TAB)

// La clave con la que se recuerda la pestaña abierta. Propia del módulo: compartirla con
// Stratix haría que abrir uno cambiara la sección del otro.
export const TASKS_TAB_PREF = 'tab-tasks'

// La vista global de rendimiento sólo pertenece al rol admin existente.
export const visibleTasksTabs = (admin: boolean): readonly TasksTab[] =>
  admin ? TASKS_TABS : TASKS_TABS.filter(tab => tab !== TASKS_TAB.OVERVIEW)
