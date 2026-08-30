import { MODULE } from '@/shared/auth/permissions'

// API pública de la feature. La thin route de `src/app/` monta esto y nada más.
export { default as ReunionesModule } from './components/listado/ReunionesListado'

// Convención access-aware, igual que las otras features. El slug sale de `MODULE` y no
// escrito a mano: un literal mal tipeado no rompe el build, sólo deja de coincidir en
// silencio (por eso existe `permissions/modulos/slugs.ts`). Las features viejas todavía
// lo tienen pelado — se migran por contacto.
export const access = { module: MODULE.REUNIONES } as const
