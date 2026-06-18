// features/admin/index.ts — API pública de la feature admin
export { default as AdminModule } from './components/AdminModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'admin', adminOnly: true } as const
