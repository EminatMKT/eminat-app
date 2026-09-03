import { MODULE } from '@/shared/auth/permissions'

// API pública de la feature. La thin route de `src/app/` monta esto y nada más.
export { default as TasksModule } from './components/TasksModule'

// Convención access-aware. El slug sale de `MODULE` y no escrito a mano: un literal mal
// tipeado no rompe el build, sólo deja de coincidir en silencio.
export const access = { module: MODULE.TASKS } as const
