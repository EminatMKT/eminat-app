import { createElement } from 'react'
import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { EDITOR_COPY } from '../constants'
import type { EditorStatus } from '../types'
import { EDITOR_ACTIONS } from './constants'
import type { EditorActionsProps, Translate } from './types'
import s from './index.module.css'

function cancelButtonProps(onCancel: () => void, t: Translate) {
  const button = { kind: EDITOR_ACTIONS.cancel, label: t(EDITOR_COPY.cancel), onClick: onCancel }

  return button
}

function saveButtonProps(props: EditorActionsProps, t: Translate) {
  const { status, onSave } = props
  const isSaving = status === EDITOR_COPY.savingStatus
  const action = { kind: EDITOR_ACTIONS.confirm, label: t(EDITOR_COPY.save), onClick: onSave }
  const busy = { ocupado: isSaving, ocupadoLabel: t(EDITOR_COPY.saving) }
  const button = { ...action, ...busy }

  return button
}

function feedbackAttrs(status: EditorStatus) {
  const isError = status === EDITOR_COPY.errorStatus
  const isSaved = status === EDITOR_COPY.savedStatus
  const role = isError ? EDITOR_COPY.alertRole : EDITOR_COPY.statusRole
  const errorTone = isError ? s.feedbackError : EDITOR_ACTIONS.noTone
  const savedTone = isSaved ? s.feedbackSuccess : EDITOR_ACTIONS.noTone
  const attrs = { role, className: `${s.feedback} ${errorTone}${savedTone}` }

  return attrs
}

function feedbackNode(props: EditorActionsProps, t: Translate) {
  const { status, message } = props

  if (message == null) return null

  const attrs = feedbackAttrs(status)

  return createElement(EDITOR_ACTIONS.feedbackTag, attrs, t(message))
}

/** Renders the editor's cancel/save controls and announces the latest operation result. */
export default function EditorActions(props: EditorActionsProps) {
  const { t } = useT()
  const cancelButton = createElement(Button, cancelButtonProps(props.onCancel, t))
  const saveButton = createElement(Button, saveButtonProps(props, t))
  const children = [cancelButton, saveButton, feedbackNode(props, t)]
  const containerProps = { className: s.actions }

  return createElement(EDITOR_ACTIONS.containerTag, containerProps, ...children)
}

// EditorActions keeps operation controls and live feedback separate from the editor lifecycle.
