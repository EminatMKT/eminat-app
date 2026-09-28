'use client'
import { CrashNotice } from '@/shared/components/shell'

type Props = { error: Error }

export default function RootError({ error }: Props) {
  return <CrashNotice error={error} />
}

// The boundary above `(app)/layout.tsx`: a segment's `error.tsx` does not catch its own layout,
// so this is the one that catches a broken `(app)` layout chunk. It renders inside the root
// layout, where `LocaleProvider` already is. The root layout itself is `global-error.tsx`'s.
