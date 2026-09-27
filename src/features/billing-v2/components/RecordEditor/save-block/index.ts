import type { I18nKey } from '@/shared/i18n'
import fieldSpecs from '@/features/billing-v2/components/RecordEditor/field-specs'
import LABEL_VARS from '@/features/billing-v2/components/RecordEditor/label-vars'
import type { FieldErrors, FieldSpec, RecordForm } from '@/features/billing-v2/components/RecordEditor/types'

type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string

const isMissing = (form: RecordForm) => (spec: FieldSpec) => !!spec.required && !String(form[spec.name]).trim()

function sameForm(form: RecordForm, initial: RecordForm): boolean {
  const before = new Map<string, unknown>(Object.entries(initial))
  return Object.entries(form).every(([name, value]) => before.get(name) === value)
}

/** Why Save is held back right now, in words to show beside it — or null when it can save. */
export default function saveBlock(form: RecordForm, initial: RecordForm, errors: FieldErrors, t: Translate): string | null {
  const specs = fieldSpecs(form.recordType)
  const names = (list: FieldSpec[]) => list.map((spec) => t(spec.labelKey, LABEL_VARS)).join(', ')
  const missing = specs.filter(isMissing(form))
  const invalid = specs.filter((spec) => !!errors[spec.name] && !missing.includes(spec))
  if (missing.length && invalid.length) return t('billing.saveBlocked.both', { missing: names(missing), invalid: names(invalid) })
  if (missing.length) return t('billing.saveBlocked.missing', { fields: names(missing) })
  if (invalid.length) return t('billing.saveBlocked.invalid', { fields: names(invalid) })
  return sameForm(form, initial) ? t('billing.saveBlocked.unchanged') : null
}

// An error that can be prevented is prevented: Save stays disabled while a required box is empty,
// while any box holds a value the domain schema refuses, or while the form still equals what was
// stored — instead of being pressed and answered with a complaint. The refusals are the same
// `errors` the field messages are drawn from, computed on every change, so the button and the box
// can never disagree about whether a value is valid. The reason is returned as words because it is
// drawn beside the button, in view, and not hidden in a tooltip: a disabled button that does not
// say why reads as a broken one. What is missing and what is wrong go in ONE sentence, never two
// reasons competing beside one button. A missing field is judged by `trim()`, the same blankness
// the domain schema refuses, and is named once, as missing, not again as wrong.
