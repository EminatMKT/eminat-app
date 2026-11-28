import type { Usuario } from '@/shared/context/loadAppData'
import { localeConfig } from '@/shared/i18n'
import row from '@/features/tasks/hooks/useWorkerReport/test-fixtures/row'

/** The signed-in user every useWorkerReport suite exercises by default. */
export const SIGNED_IN_USER: Usuario = { id: 'u1', nombre: 'Ada' }

/** BCP-47 locales `Intl` expects for each build, read from the one i18n config
 *  instead of a re-literal that would collide with locale constants elsewhere. */
const { es: SPANISH_LOCALE, en: ENGLISH_LOCALE } = localeConfig.intl

export { SPANISH_LOCALE, ENGLISH_LOCALE }

/** Re-exported so a consumer needs only one import path into this directory. */
export default row

// Default row/user/locale fixtures `useWorkerReport` suites share, so none re-declares its own.
