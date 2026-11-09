import type { Dispatch, SetStateAction } from 'react'
import type {
  Props,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DiscardChangesModal/types'
import discard from '../discard'
import saveAndExit from '../save-and-exit'

export default function buildDialogProps(
  onSave: () => Promise<boolean>,
  onClose: () => void,
  setConfirming: Dispatch<SetStateAction<boolean>>,
): Props {
  const onDiscard = () => discard(onClose, setConfirming)
  const onSaveAndExit = () => saveAndExit(onSave, onClose, setConfirming)
  const onKeepEditing = () => setConfirming(false)

  return { onDiscard, onSaveAndExit, onKeepEditing }
}

// Turns the three raw actions into the exact prop shape DiscardChangesModal expects.
