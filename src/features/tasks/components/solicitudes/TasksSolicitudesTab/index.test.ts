import { createElement } from 'react'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TasksSolicitudesTab from './index'

const LIST_MARKER = 'list-view-marker'
const AVAILABILITY_MARKER = 'availability-view-marker'
const LIST_TAB_KEY = 'stratix.sol.tabList'
const AVAILABILITY_TAB_KEY = 'stratix.sol.tabAvailability'

const mocked = vi.hoisted(() => ({
  i18n: '@/shared/i18n',
  tasksContext: '@/features/tasks/components/TasksContext',
  appContext: '@/shared/context/AppContext',
  listView: '../SolicitudesListView',
  availabilityView: '../SolicitudesAvailabilityView',
}))

vi.mock(mocked.i18n, () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock(mocked.tasksContext, () => ({
  useTasks: () => ({ solTab: 'disponibilidad', setSolTab: () => undefined }),
}))

vi.mock(mocked.appContext, () => ({
  useApp: () => ({ esAdmin: false }),
}))

vi.mock(mocked.listView, () => ({ default: () => LIST_MARKER }))
vi.mock(mocked.availabilityView, () => ({ default: () => AVAILABILITY_MARKER }))

describe('TasksSolicitudesTab', () => {
  it('shows the availability subtab and view to a non-admin Tasks user', () => {
    const html = renderToStaticMarkup(createElement(TasksSolicitudesTab))
    const shown = [LIST_TAB_KEY, AVAILABILITY_TAB_KEY, AVAILABILITY_MARKER]

    for (const text of shown) {
      expect(html).toContain(text)
    }

    expect(html).not.toContain(LIST_MARKER)
  })
})
