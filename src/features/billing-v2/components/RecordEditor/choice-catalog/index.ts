import type { I18nKey } from '@/shared/i18n'
import billingLabelKey from '../labels'

type Translate = (key: I18nKey) => string

/** A closed billing vocabulary in the shape the shared catalog select reads. */
export default function choiceCatalog(options: readonly string[]) {
  const label = (value: string | undefined, t: Translate) => (value ? t(billingLabelKey(value)) : '')
  const catalog = { valores: [...options], label }
  return catalog
}

// `CatalogoSelect` already draws a fixed list as a `<select>`; what it needs from a feature is the
// list and how each member is read. This hands it the domain enum and the billing label table, so
// the editor reuses the shared control instead of drawing a second one next to it.
