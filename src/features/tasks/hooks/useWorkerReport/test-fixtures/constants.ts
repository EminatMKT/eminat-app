import type { Usuario } from '@/shared/context/loadAppData'
import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import { localeConfig } from '@/shared/i18n'
import row from './row'

/** Default overrides for `row()` when a test needs no field changed. */
export const NO_ROW_OVERRIDES: Partial<Row> = {}

/** The signed-in user every useWorkerReport suite exercises by default. */
export const SIGNED_IN_USER: Usuario = { id: 'u1', nombre: 'Ada' }

/** BCP-47 locales `Intl` expects for each build, read from the one i18n config
 *  instead of a re-literal that would collide with locale constants elsewhere. */
const { es: SPANISH_LOCALE, en: ENGLISH_LOCALE } = localeConfig.intl

export { SPANISH_LOCALE, ENGLISH_LOCALE }

/** Re-exported so a consumer needs only one import path into this directory. */
export default row
