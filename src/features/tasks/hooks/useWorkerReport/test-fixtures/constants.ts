import type { Usuario } from '@/shared/context/loadAppData'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'

/** Default overrides for `row()` when a test needs no field changed. */
export const NO_ROW_OVERRIDES: Partial<Row> = {}

/** The signed-in user every useWorkerReport suite exercises by default. */
export const SIGNED_IN_USER: Usuario = { id: 'u1', nombre: 'Ada' }

/** BCP-47 locale `Intl` expects for the Spanish-speaking build (es-EC). */
export const SPANISH_LOCALE = 'es-EC'

/** BCP-47 locale `Intl` expects for the English-speaking build (en-US). */
export const ENGLISH_LOCALE = 'en-US'
