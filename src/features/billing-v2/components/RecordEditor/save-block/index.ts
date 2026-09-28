import type { I18nKey } from '@/shared/i18n'
import type { SaveField } from '@/shared/components/ui'
import fieldSpecs from '@/features/billing-v2/components/RecordEditor/field-specs'
import LABEL_VARS from '@/features/billing-v2/components/RecordEditor/label-vars'
import type { RecordForm } from '@/features/billing-v2/components/RecordEditor/types'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

function sameForm(form: RecordForm, initial: RecordForm): boolean {
  const before = new Map<string, unknown>(Object.entries(initial))
  return Object.entries(form).every(([name, value]) => before.get(name) === value)
}

/** What the editor tells its Save besides the errors: how each field is named, and why else it
 *  is held — nothing changed —, in words. */
export default function saveBlock(form: RecordForm, initial: RecordForm, t: Translate) {
  const fields: SaveField[] = fieldSpecs(form.recordType).map((spec) => ({
    name: spec.name, label: t(spec.labelKey, LABEL_VARS), blank: !String(form[spec.name]).trim(),
  }))
  const hold = sameForm(form, initial) ? t('billing.saveBlocked.unchanged') : null
  return { fields, hold }
}

// Save is held by the errors the domain schema gives, and the shared footer turns those into the
// reason; what it cannot know is how the editor names its boxes, which are empty, and the one hold
// that is not validation: a stored record opened and left alone has nothing to save. A box is
// empty by `trim()`, the same blankness the domain schema refuses, so a required box left empty
// is named once, as missing, and not again as wrong. The labels are the ones drawn above the
// boxes —with the currency the amount is typed in—, so the reason names what the person sees.
