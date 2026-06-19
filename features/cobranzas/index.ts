// features/cobranzas/index.ts — API pública de la feature cobranzas
export { default as CobranzasModule } from './components/CobranzasModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'cobranzas' } as const
