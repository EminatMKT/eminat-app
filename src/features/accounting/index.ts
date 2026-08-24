// features/accounting/index.ts — API pública de la feature accounting
export { default as AccountingModule } from './components/AccountingModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'accounting' } as const
