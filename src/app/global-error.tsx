'use client'
import './globals.css'
import { LocaleProvider } from '@/shared/i18n'
import { FallbackDocument, CrashNotice } from '@/shared/components/shell'

type Props = { error: Error }

export default function GlobalError({ error }: Props) {
  return <FallbackDocument><LocaleProvider><CrashNotice error={error} /></LocaleProvider></FallbackDocument>
}

// The boundary for the root layout, which no `error.tsx` can catch. It replaces that layout, so
// it brings back the three things the notice needs from it: the document, the global styles and
// `LocaleProvider`. Next only uses it in production; in dev the error overlay shows instead.
