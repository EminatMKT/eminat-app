import type { I18nKey } from '@/shared/i18n'

/** The text the merge preview shows for a field or contact type that will be saved blank. */
const NO_VALUE_KEY: I18nKey = 'import.merge.noValue'

export default NO_VALUE_KEY

// NO_VALUE_KEY is shared by the clinical and the contact preview lines, so both spell a blank the
// same way and their tests check against the key the code actually uses.
