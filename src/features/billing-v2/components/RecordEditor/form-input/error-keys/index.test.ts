import { it, expect } from 'vitest'
import es from '@/shared/i18n/locales/es.json'
import values from '@/features/billing-v2/domain/record-values'
import fieldSpecs from '@/features/billing-v2/components/RecordEditor/field-specs'
import CONTROL from '@/features/billing-v2/components/RecordEditor/control-kinds'
import ERROR_KEYS from './index'

// Every field of every record type that can be refused has a message of its own; the marker,
// a switch, has no wrong value.
it('has a message for every field the editor draws, except the switch that cannot be wrong', () => {
  const specs = values.recordType.options.flatMap((kind) => fieldSpecs(kind))
  const refusable = specs.filter((spec) => spec.control !== CONTROL.toggle)
  for (const { name } of refusable) expect(Object.keys(ERROR_KEYS.byField)).toContain(name)
})

it('points every message at a key the dictionary has', () => {
  for (const key of Object.values(ERROR_KEYS.byField)) expect(key && es[key]).toBeTruthy()
  expect(es[ERROR_KEYS.tooLong]).toBeTruthy()
})
