import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { CompareField, type CompareControls } from '@/shared/dedup'
import pacienteDedupStrategy from '@/features/medical/utils/pacienteDedupStrategy'
import FIELD_MAPS from '../fieldMaps'
import CONTACT_FIELDS from './contactFields'
import contactText from './contactText'
import type { PatientUnderReview } from '../types'

/** One `CompareField` per clinical field `pacienteDedupStrategy.fusionar` reports as a conflict,
 *  then one per contact type either patient holds; a message when there is nothing to show. */
export default function comparePacientes(
  a: PatientUnderReview,
  b: PatientUnderReview,
  controls: CompareControls,
  t: (key: I18nKey) => string,
): ReactNode {
  const { choques } = pacienteDedupStrategy.fusionar(a.paciente, b.paciente)
  const scalarRows = choques.flatMap((field) => {
    const labelKey = FIELD_MAPS.labelKeys[field]
    const valueOf = FIELD_MAPS.values[field]
    if (!labelKey || !valueOf) return []
    return [
      <CompareField
        key={field}
        field={field}
        labelKey={labelKey}
        values={[valueOf(a.paciente), valueOf(b.paciente)]}
        controls={controls}
      />,
    ]
  })
  const contactFields = CONTACT_FIELDS.filter(({ key }) => a[key].length + b[key].length > 0)
  if (scalarRows.length === 0 && contactFields.length === 0) return <p>{t('dedup.noFieldDiffs')}</p>
  return (
    <>
      {scalarRows}
      {contactFields.map(({ key, labelKey }) => (
        <CompareField
          key={key}
          labelKey={labelKey}
          values={[a[key], b[key]]}
          textOf={contactText}
          controls={controls}
        />
      ))}
    </>
  )
}

// Medical decides WHICH fields and in what shape: scalars from `choques`, arrays from
// `paciente_contactos`. The shared `CompareField` decides how each shape is resolved.
