'use client'
import { createContext } from 'react'
import type { LocaleState } from '@/shared/i18n/types'

const LocaleContext = createContext<LocaleState | null>(null)
export default LocaleContext

// A missing provider stays distinguishable from a deliberately selected default locale.
