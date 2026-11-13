export { LocaleProvider, useT } from './context'
export { default as translate } from './translate'
export type { I18nKey, Vars } from './types'

// Stable entry point: UI consumers do not depend on storage, dictionaries, or context internals.
