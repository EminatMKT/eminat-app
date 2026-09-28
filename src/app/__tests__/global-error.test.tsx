import { describe, it, expect, vi } from 'vitest'
import type { ComponentProps, PropsWithChildren } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import GlobalError from '../global-error'

type NoticeProps = ComponentProps<typeof GlobalError>

// Each wrapper leaves a mark, so the test can read the order they nest in.
const marks = vi.hoisted(() => ({ document: '[document]', locale: '[locale]' }))
vi.mock('@/shared/components/shell', () => ({
  FallbackDocument: ({ children }: PropsWithChildren) => [marks.document, children],
  CrashNotice: ({ error }: NoticeProps) => error.message,
}))
vi.mock('@/shared/i18n', () => ({ LocaleProvider: ({ children }: PropsWithChildren) => [marks.locale, children] }))

const FAILURE = 'root layout failed'

describe('global error boundary', () => {
  // It replaces the root layout, so it brings back what that layout gave: the document and the
  // translations. Without the provider, `useT` inside the notice would throw a second time.
  it('draws its own document and translations around the crash notice', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error(FAILURE)} />)
    expect(html).toBe(`${marks.document}${marks.locale}${FAILURE}`)
  })
})
