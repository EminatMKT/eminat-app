import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import MeetingsLayout from './layout'

const state = vi.hoisted(() => ({ pathname: '/meetings' }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }))
vi.mock('@/shared/components/shell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <div data-shell="original">{children}</div> }))
vi.mock('@/features/meet/components/MeetingsOverviewShell', () => ({ default: ({ children }: { children: ReactNode }) => <div data-shell="meetings-overview">{children}</div> }))
vi.mock('@/features/meet/lib/preferences', () => ({ PreferencesProvider: ({ children }: { children: ReactNode }) => children }))

describe('Meetings overlay fix stays inside the authorized routes', () => {
  it.each(['/meetings', '/meetings/new', '/meetings/tasks', '/meetings/history'])('uses the nonblocking overview shell for %s', (path) => {
    state.pathname = path
    expect(renderToStaticMarkup(<MeetingsLayout>{'content'}</MeetingsLayout>)).toContain('data-shell="meetings-overview"')
  })
  it.each(['/meetings/qa-id', '/meetings/qa-id/history'])('preserves the original shell for %s', (path) => {
    state.pathname = path
    expect(renderToStaticMarkup(<MeetingsLayout>{'content'}</MeetingsLayout>)).toContain('data-shell="original"')
  })
})
