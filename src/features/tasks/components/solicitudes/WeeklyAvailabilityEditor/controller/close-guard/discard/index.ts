import type { Dispatch, SetStateAction } from 'react'

export default function discard(
  onClose: () => void,
  setConfirming: Dispatch<SetStateAction<boolean>>,
): void {
  onClose()
  setConfirming(false)
}

// Discarding never waits on a save: it closes right away and drops the confirm step.
