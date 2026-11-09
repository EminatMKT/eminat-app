import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import footerOf from './index'

type ActionsProps = NonNullable<Parameters<typeof footerOf>[0]>

const ACTIONS_PROPS: ActionsProps = {
  status: EDITOR_COPY.idleStatus,
  message: null,
  onCancel: vi.fn(),
  onSave: vi.fn(),
}

describe('footerOf', () => {
  it('builds no footer when the editor is read-only', () => {
    expect(footerOf(null, vi.fn())).toBeUndefined()
  })

  it('renders the editor actions with Cancel swapped for the guarded close', () => {
    const guardedCancel = vi.fn()

    const footer = footerOf(ACTIONS_PROPS, guardedCancel)

    expect(footer?.props.onCancel).toBe(guardedCancel)
    expect(footer?.props.onSave).toBe(ACTIONS_PROPS.onSave)
  })
})

// The Modal footer's Cancel must go through the close guard, never the editor's raw onCancel.
