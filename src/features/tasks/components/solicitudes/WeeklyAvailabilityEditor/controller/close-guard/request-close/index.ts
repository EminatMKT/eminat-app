import type { Dispatch, SetStateAction } from 'react'

export default function requestClose(
  isDirty: boolean,
  onClose: () => void,
  setConfirming: Dispatch<SetStateAction<boolean>>,
): void {
  if (isDirty) setConfirming(true)
  else onClose()
}

// Decides whether a close request can happen immediately or needs confirmation first.
