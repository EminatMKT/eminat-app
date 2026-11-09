'use client'
import { useState } from 'react'
import type { ControllerResult } from '../types'
import requestClose from './request-close'
import buildDialogProps from './dialog-props'

/** Gates closing the editor behind an unsaved-changes dialog when the controller is dirty. */
export default function useCloseGuard(
  controllerResult: Pick<ControllerResult, 'isDirty' | 'onSave'>,
  onClose: () => void,
) {
  const [confirming, setConfirming] = useState(false)
  const dialogProps = buildDialogProps(controllerResult.onSave, onClose, setConfirming)
  const requestCloseNow = () => requestClose(controllerResult.isDirty, onClose, setConfirming)

  return { confirming, requestClose: requestCloseNow, dialogProps }
}

// Composes the pure close-request, discard, and save-and-exit units into one hook result.
