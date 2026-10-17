import type { MultiFieldProps, MultiValueItem, Props } from '../types'

/** Structural, on purpose: a field is multivalued because its values are arrays — the engine
 *  never keeps a list of which field names behave that way. */
export default function isMultiValue<E extends MultiValueItem>(props: Props<E>): props is MultiFieldProps<E> {
  const multi = Array.isArray(props.values[0])
  return multi
}

// Decides which resolver a CompareField uses by looking only at the shape of its first side.
