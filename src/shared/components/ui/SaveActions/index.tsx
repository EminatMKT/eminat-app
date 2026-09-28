'use client'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import Button from '../Button'
import ActionStrip from './ActionStrip'
import SaveStatus from './SaveStatus'
import saveReason from './save-reason'
import type { SaveErrors, SaveField } from './types'

type Props = {
  /** Every field's current error, computed on change — the whole map, not only the ones shown. */
  errors: SaveErrors
  /** The form's fields in the order drawn: how the reason names each one, and whether it is empty. */
  fields: readonly SaveField[]
  /** A save is travelling: Save is disabled until it answers. */
  busy: boolean
  onSave: () => void
  onCancel: () => void
  /** Save's own words, when the form names what it saves. */
  saveLabel?: string
  /** A hold that is not validation —nothing changed yet—, in words. Only ever on top of the errors. */
  hold?: string | null
  /** A write that did not land —refused by the server, or lost on the network—, in words. */
  failure?: string | null
  /** The form's own actions —a deletion—, drawn before Cancel and Save. */
  children?: ReactNode
}

export default function SaveActions(props: Props) {
  const { errors, fields, busy, onSave, onCancel, saveLabel, hold, failure, children } = props
  const { t } = useT()
  const reason = saveReason(errors, fields, t) ?? hold
  const line = failure ?? reason

  return (
    <ActionStrip>
      {line && <SaveStatus tone={failure ? 'failure' : 'reason'}>{line}</SaveStatus>}
      {children}
      <Button kind="cancel" onClick={onCancel} />
      <Button kind="confirm" label={saveLabel} onClick={onSave} ocupado={busy} deshabilitado={!!reason} />
    </ActionStrip>
  )
}

// The one Save of a form, and the only place that decides whether it can be pressed. It is handed
// the form's errors whole —every field's, not only those already shown— and has no `disabled`
// prop: Save is held while a save travels or any error is unresolved, so no caller can forget an
// error kind or pass a hand-made boolean that skips one. The reason is written beside the button
// from the same errors the fields draw under their boxes, so the two cannot disagree. A caller may
// add a hold that is not validation, but it is only said once no error is left to say.
// A failed write belongs to no field, so it is said here, next to the action that failed; while
// it is shown it is the only line, never beside an unrelated reason competing for the same glance.
