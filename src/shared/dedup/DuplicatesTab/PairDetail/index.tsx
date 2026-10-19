'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import {
  Button,
  ColorBadge,
  Modal,
  WarningCallout,
} from '@/shared/components/ui'
import closeIntent from './closeIntent'
import PairDialogs from './PairDialogs'
import {
  CLOSE_CONFIRM,
  CLOSE_NOW,
  DISCARD_DIALOG,
  NOTE_DIALOG,
  PAIR_WIDTH_REM,
} from './constants'
import type { OpenDialog, Props } from './types'

/** The open pair as a dialog: the labelled summaries, any failure and the caller's grid scroll in
 *  the body; the four decisions stay in the fixed footer, always in view. */
export default function PairDetail<T>(props: Props<T>) {
  const { itemA, itemB, ocupado, errorDescarte, errorFusion, renderResumen, renderComparacion } = props
  const { controls, onCancelar, onNotSame, onKeepSeparate, onFusionar } = props
  const { t } = useT()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const dirty = Object.keys(controls.choices).length > 0 || controls.excludedIds.length > 0
  // ✕, Escape, the backdrop and Cancel all land here, so none of them drops picks unasked.
  const requestClose = () => {
    const intent = closeIntent(ocupado, dirty)
    if (intent === CLOSE_NOW) onCancelar()
    if (intent === CLOSE_CONFIRM) setDialog(DISCARD_DIALOG)
  }
  const confirmNote = (note?: string) => {
    setDialog(null)
    if (note) onKeepSeparate(note)
  }
  const confirmDiscard = () => { setDialog(null); onCancelar() }
  const actions = <>
    <Button kind="cancel" onClick={requestClose} deshabilitado={ocupado} />
    <Button kind="notSame" onClick={onNotSame} ocupado={ocupado} />
    <Button kind="keepSeparate" onClick={() => setDialog(NOTE_DIALOG)} ocupado={ocupado} />
    <Button kind="confirm" label={t('dedup.merge')} onClick={onFusionar} ocupado={ocupado} />
  </>
  // Focus is `Modal`'s job: on open `hold-focus` calls `first.focus()` past the ✕, Tab stays
  // inside, and closing gives it back. The warnings sit above the grid so a failure is seen unscrolled.
  return (
    <>
      <Modal
        title={t('dedup.pairTitle')}
        anchoRem={PAIR_WIDTH_REM}
        onClose={requestClose}
        footer={actions}
      >
        <ColorBadge color="var(--c-t3)">{t('dedup.winnerLabel')} · {renderResumen(itemA)}</ColorBadge>
        <ColorBadge color="var(--c-t3)">{t('dedup.loserLabel')} · {renderResumen(itemB)}</ColorBadge>
        {errorDescarte && <WarningCallout message={t('dedup.discardFailed')} />}
        {errorFusion && <WarningCallout message={t('dedup.mergeFailed')} />}
        {renderComparacion(itemA, itemB, controls)}
      </Modal>
      <PairDialogs
        dialog={dialog}
        onConfirmNote={confirmNote}
        onConfirmDiscard={confirmDiscard}
        onClose={() => setDialog(null)}
      />
    </>
  )
}

// Composes `Modal` with `ColorBadge`/`Button`/`WarningCallout`/`PairDialogs`: no markup of its own.
