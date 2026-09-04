// Barrel del shell. Sólo re-exporta.
//
// Lo que consume el resto de la app es `AppShell`: los demás son sus piezas y hoy sólo lo usa
// él. Están igual porque un barrel exporta lo público del directorio, no lo que hoy tiene dos
// llamadores — y porque el día que una vista necesite un `DevBadge` suelto, ya está el camino.
//
// `appShellConfig` NO se re-exporta acá: es config (NAV, AUTO_TITLE, los tokens del shell), no
// un componente, y tiene su propio barrel en `shell/appShellConfig`.
export { default as AppShell } from './AppShell'
export { default as DevBadge } from './DevBadge'
export { default as LoadingScreen } from './LoadingScreen'
export { default as ModuloTabs } from './ModuloTabs'
export { default as NotificationItem } from './NotificationItem'
export { default as NotificationsBell } from './NotificationsBell'
export { default as Onboarding } from './Onboarding'
export { default as OnlineBadge } from './OnlineBadge'
export { default as PanelItem } from './PanelItem'
export { default as RailButton } from './RailButton'
export { default as RailProfile } from './RailProfile'
export { default as Sidebar } from './Sidebar'
export { default as SidebarPanel } from './SidebarPanel'
export { default as ThemeToggle } from './ThemeToggle'
export { default as Topbar } from './Topbar'
export { default as TopbarBrands } from './TopbarBrands'
export { default as TopbarMessage } from './TopbarMessage'
