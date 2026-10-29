import { createElement } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '@/shared/components/ui'
import EDITOR_COPY from '../constants'
import type { EditorStatus } from '../types'

type EditorActionsProps = {
  status: EditorStatus
  message: string | null
  onCancel: () => void
  onSave: () => void
}

const CONTAINER_TAG = 'div'
const FEEDBACK_TAG = 'p'
const NO_PROPS = null

/** Renders the editor's cancel/save controls and announces the latest operation result. */
export default function EditorActions(props: EditorActionsProps) {
  const {
    status,
    message,
    onCancel,
    onSave,
  } = props
  const isSaving = status === EDITOR_COPY.savingStatus
  const feedbackRole = status === EDITOR_COPY.errorStatus
    ? EDITOR_COPY.alertRole
    : EDITOR_COPY.statusRole
  const cancelButtonProps = {
    kind: 'cancel',
    label: EDITOR_COPY.cancel,
    onClick: onCancel,
  } satisfies ComponentProps<typeof Button>
  const saveButtonProps = {
    kind: 'confirm',
    label: EDITOR_COPY.save,
    ocupado: isSaving,
    ocupadoLabel: EDITOR_COPY.saving,
    onClick: onSave,
  } satisfies ComponentProps<typeof Button>
  const cancelButton = createElement(Button, cancelButtonProps)
  const saveButton = createElement(Button, saveButtonProps)
  const feedbackProps = { role: feedbackRole }
  const feedback = message == null
    ? null
    : createElement(FEEDBACK_TAG, feedbackProps, message)
  const actionBar = createElement(CONTAINER_TAG, NO_PROPS, cancelButton, saveButton, feedback)

  return actionBar
}

// EditorActions keeps operation controls and live feedback separate from the editor lifecycle.
