// features/directorio/index.ts — API pública de la feature directorio
export { default as DirectorioModule } from './components/DirectorioModule'

// Convención access-aware (la consume el plan de control de acceso; sin lógica todavía)
export const access = { module: 'directorio' } as const
