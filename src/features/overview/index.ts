// features/overview/index.ts — API pública de la feature overview
export { default as OverviewModule } from './components/OverviewModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'overview', adminOnly: true } as const
