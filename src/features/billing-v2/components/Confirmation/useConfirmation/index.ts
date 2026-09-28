'use client'
import { useEffect, useMemo, useState } from 'react'
import type { I18nKey } from '@/shared/i18n'
import fadeTimer from '../fade-timer'

const LIFE_MS = 4000

/** The confirmation of a write that landed —«Registro guardado.»—, kept for a few seconds. */
export default function useConfirmation() {
  const [said, setSaid] = useState<I18nKey | null>(null)
  const timer = useMemo(() => fadeTimer(setSaid, LIFE_MS), [])
  useEffect(() => timer.stop, [timer])
  return { said, say: timer.say }
}

// The editor closes on a landed write, and a modal that just vanishes leaves the person unsure
// it worked. Four seconds is long enough to read a short line and short enough not to linger.
