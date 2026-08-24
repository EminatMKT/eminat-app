// features/stratix-mkt/index.ts — API pública de la feature stratix-mkt
export { default as StratixModule } from './components/StratixModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'stratix-mkt' } as const
