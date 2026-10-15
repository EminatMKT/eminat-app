'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import {
  Button,
  ColorBadge,
  ConfirmModal,
  WarningCallout,
} from '@/shared/components/ui'
import type { Props } from './types'

/** The open pair: a side-by-side summary, the caller's own comparison grid, and the four
 *  decisions available once two candidates are loaded — keep comparing, discard, or merge. */
export default function PairDetail<T>(props: Props<T>) {
  const {
    itemA, itemB, ocupado, error, renderResumen, renderComparacion,
    onElegir, onCancelar, onNotSame, onKeepSeparate, onFusionar,
  } = props
  const { t } = useT()
  const [notaAbierta, setNotaAbierta] = useState(false)

  const confirmNote = (texto?: string) => {
    setNotaAbierta(false)
    if (texto) onKeepSeparate(texto)
  }

  return (
    <>
      <ColorBadge color="var(--c-t3)">{renderResumen(itemA)}</ColorBadge>
      {' ⇄ '}
      <ColorBadge color="var(--c-t3)">{renderResumen(itemB)}</ColorBadge>

      {renderComparacion(itemA, itemB, onElegir)}

      {error && <WarningCallout message={t('dedup.mergeFailed')} />}

      <Button kind="cancel" onClick={onCancelar} />
      <Button kind="notSame" onClick={onNotSame} ocupado={ocupado} />
      <Button kind="keepSeparate" onClick={() => setNotaAbierta(true)} ocupado={ocupado} />
      <Button kind="confirm" label={t('dedup.merge')} onClick={onFusionar} ocupado={ocupado} />

      {notaAbierta && (
        <ConfirmModal
          title={t('dedup.sameSeparated')}
          message={t('dedup.sameSeparatedMessage')}
          confirmLabel={t('dedup.sameSeparated')}
          notaLabel={t('dedup.separatedNotePrompt')}
          onConfirm={confirmNote}
          onClose={() => setNotaAbierta(false)}
        />
      )}
    </>
  )
}

// Composes `ColorBadge`/`Button`/`ConfirmModal`/`WarningCallout` only, no markup of its own.
// "Keep separate" reuses `ConfirmModal`'s free-text mode instead of a bespoke dialog.
