import type { I18nKey } from '@/shared/i18n'
import fieldSpecs from '@/features/billing-v2/components/RecordEditor/field-specs'
import LABEL_VARS from '@/features/billing-v2/components/RecordEditor/label-vars'
import type { FieldSpec, RecordForm } from '@/features/billing-v2/components/RecordEditor/types'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

const isMissing = (form: RecordForm) => (spec: FieldSpec) => !!spec.required && !String(form[spec.name]).trim()

function sameForm(form: RecordForm, initial: RecordForm): boolean {
  const before = new Map<string, unknown>(Object.entries(initial))
  return Object.entries(form).every(([name, value]) => before.get(name) === value)
}

/** Why Save is held back right now, in words to show beside it — or null when it can save. */
export default function saveBlock(form: RecordForm, initial: RecordForm, t: Translate): string | null {
  const missing = fieldSpecs(form.recordType).filter(isMissing(form))
  if (missing.length) {
    const labels = missing.map((spec) => t(spec.labelKey, LABEL_VARS))
    return t('billing.saveBlocked.missing', { fields: labels.join(', ') })
  }
  return sameForm(form, initial) ? t('billing.saveBlocked.unchanged') : null
}

// An error that can be prevented is prevented: Save stays disabled while a required box is empty
// or while the form still equals what was stored, instead of being pressed and answered with a
// complaint. The reason is returned as words because it is drawn beside the button, in view,
// and not hidden in a tooltip: a disabled button that does not say why reads as a broken one.
// A missing field is judged by `trim()`, the same blankness the domain schema refuses.
