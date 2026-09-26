import { isValidElement, type ReactElement, type ReactNode } from 'react'
import type { NativeProps } from '../types'

/** A native tag placed straight inside: the Field names it itself. A component reads the context. */
export default function nativeChild(node: ReactNode): ReactElement<NativeProps> | null {
  return isValidElement<NativeProps>(node) && typeof node.type === 'string' ? node : null
}

// Only a native tag's props are the box's own —its id, its value, its `maxLength`—, so only it
// can be named and measured from outside. A component draws its box somewhere inside.
