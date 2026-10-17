'use client'
import { FieldCompare } from '@/shared/components/ui'
import isMultiValue from './isMultiValue'
import mergeMultiValueRows from './mergeMultiValueRows'
import MultiValueCompare from './MultiValueCompare'
import type { MultiValueItem, Props } from './types'

/** One field of an open pair: a left/right pick for a scalar, checkboxes for an array — decided
 *  by the values' shape alone. `values[0]` is the winner, whose value is the default pick. */
export default function CompareField<E extends MultiValueItem>(props: Props<E>) {
  const { labelKey, controls } = props
  if (isMultiValue(props)) {
    const [winner, loser] = props.values
    const rows = mergeMultiValueRows(winner, loser, props.textOf)
    if (rows.length === 0) return null
    return (
      <MultiValueCompare
        labelKey={labelKey}
        rows={rows}
        excludedIds={controls.excludedIds}
        onToggle={controls.onToggleExcluded}
      />
    )
  }
  const { field, values } = props
  const selected = controls.choices[field] ?? values[0]
  return (
    <FieldCompare
      labelKey={labelKey}
      values={values}
      diff
      selectedValue={selected}
      onChooseValue={value => controls.onChoose(field, value)}
    />
  )
}

// The seam between the shared engine and a module's adapter: the adapter decides which fields
// to show and in what shape; this decides how each shape is resolved. `FieldCompare` is unchanged.
