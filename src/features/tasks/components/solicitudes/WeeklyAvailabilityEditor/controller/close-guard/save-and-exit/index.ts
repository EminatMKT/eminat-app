import type { Dispatch, SetStateAction } from 'react'

function finishSave(
  succeeded: boolean,
  onClose: () => void,
  setConfirming: Dispatch<SetStateAction<boolean>>,
): void {
  setConfirming(false)

  if (succeeded) onClose()
}

export default async function saveAndExit(
  onSave: () => Promise<boolean>,
  onClose: () => void,
  setConfirming: Dispatch<SetStateAction<boolean>>,
): Promise<void> {
  try { finishSave(await onSave(), onClose, setConfirming) } catch (error) {
    setConfirming(false)
    throw error
  }
}

// Clears the confirm flag either way; closes only once the save genuinely succeeded.
