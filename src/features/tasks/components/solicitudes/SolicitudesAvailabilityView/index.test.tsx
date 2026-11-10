import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { INITIAL_AVAILABILITY_STATE } from './constants'
import type { LoadGateProps } from './load-gate/types'
import SolicitudesAvailabilityView from './index'

const mocked = vi.hoisted(() => ({
  i18n: '@/shared/i18n',
  fetchVisible: '@/features/tasks/data/availability/fetch-visible',
  loadGate: './load-gate',
  fetchVisibleSpy: vi.fn(),
}))

vi.mock(mocked.i18n, () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock(mocked.fetchVisible, () => ({ default: mocked.fetchVisibleSpy }))
vi.mock(mocked.loadGate, () => ({
  default: ({ availability }: LoadGateProps) => availability.status,
}))

describe('SolicitudesAvailabilityView', () => {
  it('hands the gate the initial state before the availability request has answered', () => {
    const html = renderToStaticMarkup(createElement(SolicitudesAvailabilityView))

    expect(html).toBe(INITIAL_AVAILABILITY_STATE.status)
  })

  it('does not request availability while rendering, only once mounted', () => {
    renderToStaticMarkup(createElement(SolicitudesAvailabilityView))

    expect(mocked.fetchVisibleSpy).not.toHaveBeenCalled()
  })
})
