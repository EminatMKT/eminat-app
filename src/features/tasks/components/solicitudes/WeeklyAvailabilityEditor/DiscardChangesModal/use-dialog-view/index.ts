'use client'
import { useT } from '@/shared/i18n'
import type { Props } from '../types'

export default function useDialogView(props: Props) {
  const { onKeepEditing } = props
  const { t } = useT()

  return { close: onKeepEditing, t }
}

// Merges the field the caller needs out of props and the translator into one destructured call.
