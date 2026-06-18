// features/research/index.ts — API pública de la feature research
export { default as ResearchModule } from './components/ResearchModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'research' } as const
