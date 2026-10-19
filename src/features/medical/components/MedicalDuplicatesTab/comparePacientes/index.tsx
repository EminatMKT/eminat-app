import type { ReactNode } from 'react'
import type { I18nKey } from '@/shared/i18n'
import { CompareField, type CompareControls } from '@/shared/dedup'
import { pacienteDedupStrategy } from '@/features/medical/utils/pacienteDedupStrategy'
import type { Paciente } from '@/features/medical/types'
import FIELD_MAPS from '../fieldMaps'

/** One `CompareField` per clinical field `pacienteDedupStrategy.fusionar` reports as a conflict
 *  between two candidate patients, or a message when nothing differs. */
export default function comparePacientes(
  a: Paciente,
  b: Paciente,
  controls: CompareControls,
  t: (key: I18nKey) => string,
): ReactNode {
  const { choques } = pacienteDedupStrategy.fusionar(a, b)
  if (choques.length === 0) return <p>{t('dedup.noFieldDiffs')}</p>
  return (
    <>
      {choques.map((field) => {
        const labelKey = FIELD_MAPS.labelKeys[field]
        const valueOf = FIELD_MAPS.values[field]
        if (!labelKey || !valueOf) return null
        return (
          <CompareField
            key={field}
            field={field}
            labelKey={labelKey}
            values={[valueOf(a), valueOf(b)]}
            controls={controls}
          />
        )
      })}
    </>
  )
}

// Field matching and value extraction stay in `pacienteDedupStrategy`/`FIELD_MAPS`; this module
// only turns their output into the shared `CompareField` rows `DuplicatesTab` expects.
