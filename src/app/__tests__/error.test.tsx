import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import RootError from '../error'

type NoticeProps = { error: Error }
vi.mock('@/shared/components/shell', () => ({ CrashNotice: ({ error }: NoticeProps) => error.message }))

const FAILURE = 'Loading chunk app/(app)/layout failed.'

describe('app error boundary', () => {
  // A thin route: the reload guard and the screen live in the shell component it mounts.
  it('hands the error to the crash notice and nothing else', () => {
    expect(renderToStaticMarkup(<RootError error={new Error(FAILURE)} />)).toBe(FAILURE)
  })
})
