const COLOR_ACCENT = 'var(--c-accent)'
const COLOR_WARN = 'var(--c-warn-solid)'
const COLOR_DANGER = 'var(--c-danger)'

/** Shared KPI-tier colors for the patient-registry dashboard, read from the CSS palette
 *  instead of a hex literal so dark mode stays correct automatically. */
const colors = { COLOR_ACCENT, COLOR_WARN, COLOR_DANGER }

export default colors
// `RegistryKpis` and the `DashboardTab` composition root both import these three tier colors
// from here, so the accent/warn/danger palette has exactly one definition to keep in sync.
