import type { ReactNode, RefObject } from 'react'
import type { PressedKey } from '@/shared/components/ui/Combobox/types'

/** What the frame draws from the hook: the open state, the ids, and the box's handlers. */
export type ComboView = {
  root: RefObject<HTMLDivElement | null>
  listId: string
  open: boolean
  shown: readonly unknown[]
  activeId?: string
  onOpen: () => void
  onType: (typed: string) => void
  onKeyDown: (event: PressedKey) => void
}

export type FrameProps = {
  combo: ComboView
  value: string
  placeholder?: string
  ariaLabel?: string
  /** Picks toggle and the panel stays open; closed, the box shows a summary and takes no text. */
  multiple?: boolean
  /** What the panel says when nothing is shown. */
  empty: ReactNode
  /** The rows: one `Option` per shown option. */
  children: ReactNode
}

// The contract between the combobox hook and the markup that draws it.
