import type { ReactNode } from 'react'
import type { CompareControls, Props as TabProps } from '../types'
import type {
  CLOSE_CONFIRM,
  CLOSE_IGNORED,
  CLOSE_NOW,
  DISCARD_DIALOG,
  NOTE_DIALOG,
} from './constants'

/** The open pair: both loaded items, the in-flight decision state, the caller's two renderers,
 *  the grid's controls, and the four decisions. */
export type Props<T> = Pick<TabProps<T>, 'renderResumen' | 'renderComparacion'> & {
  itemA: T
  itemB: T
  ocupado: boolean
  errorDescarte: boolean
  errorFusion: boolean
  controls: CompareControls
  /** What the merge will save, drawn by the caller below its grid; absent, nothing is drawn. */
  preview?: ReactNode
  onCancelar: () => void
  onNotSame: () => void
  onKeepSeparate: (nota: string) => void
  onFusionar: () => void
}

/** What a close request turns into. */
export type CloseIntent = typeof CLOSE_IGNORED | typeof CLOSE_CONFIRM | typeof CLOSE_NOW

/** Which secondary dialog sits on top of the pair, if any. */
export type OpenDialog = typeof NOTE_DIALOG | typeof DISCARD_DIALOG | null
