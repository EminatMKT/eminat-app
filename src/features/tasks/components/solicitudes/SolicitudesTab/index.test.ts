import { createElement } from 'react'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SolicitudesTab from './index'

const LIST_MARKER = 'list-view-marker'
const AVAILABILITY_MARKER = 'availability-view-marker'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('@/features/tasks/components/TasksContext', () => ({
  useTasks: () => ({ solTab: 'disponibilidad', setSolTab: () => undefined }),
}))

vi.mock('@/shared/context/AppContext', () => ({
  useApp: () => ({ esAdmin: false }),
}))

vi.mock('../SolicitudesListView', () => ({ default: () => LIST_MARKER }))
vi.mock('../SolicitudesAvailabilityView', () => ({ default: () => AVAILABILITY_MARKER }))

describe('SolicitudesTab', () => {
  it('shows the availability subtab and view to a non-admin Tasks user', () => {
    const html = renderToStaticMarkup(createElement(SolicitudesTab))

    expect(html).toContain('stratix.sol.tabList')
    expect(html).toContain('stratix.sol.tabAvailability')
    expect(html).toContain(AVAILABILITY_MARKER)
    expect(html).not.toContain(LIST_MARKER)
  })
})
