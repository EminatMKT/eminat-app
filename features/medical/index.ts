// features/medical/index.ts — API pública de la feature medical
export { default as MedicalModule } from './components/MedicalModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'medical' } as const
