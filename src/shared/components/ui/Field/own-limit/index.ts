import type { FieldLimit, NativeProps } from '../types'

/** How full a native box is, read off its own props. `undefined`: it has no length limit. */
export default function ownLimit(props?: NativeProps): FieldLimit | undefined {
  const max = props?.maxLength ?? 0
  const length = typeof props?.value === 'string' ? props.value.length : 0
  const limit = { length, max }
  return max > 0 ? limit : undefined
}

// A native tag inside a Field carries its `maxLength` and value in plain sight, so the Field reads
// them itself. A component control's props are its own, not the box's: it reports instead,
// through `useFieldControl`.
