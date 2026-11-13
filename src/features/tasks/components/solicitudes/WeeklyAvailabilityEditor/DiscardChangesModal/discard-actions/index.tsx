import { Button } from '@/shared/components/ui'
import { useT } from '@/shared/i18n'
import { DISCARD_MODAL_COPY } from '../constants'
import type { Props } from '../types'

export default function Actions(
  { onDiscard, onSaveAndExit, onKeepEditing }: Props,
  t: ReturnType<typeof useT>['t'],
) {
  return <>
    <Button kind="cancel" label={t(DISCARD_MODAL_COPY.discard)} onClick={onDiscard} />
    <Button kind="confirm" label={t(DISCARD_MODAL_COPY.saveAndExit)} onClick={onSaveAndExit} />
    <Button kind="cancel" label={t(DISCARD_MODAL_COPY.keepEditing)} onClick={onKeepEditing} />
  </>
}

// Builds the dialog's buttons from resolved props and an already-looked-up translator.
