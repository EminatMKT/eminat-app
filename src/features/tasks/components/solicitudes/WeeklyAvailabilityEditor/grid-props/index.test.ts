import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { EditableRange, LocalEditorState } from '../component-types/types'
import type { ControllerResult } from '../controller/types'
import type { EditorProps } from '../types'
import { EDITOR_COPY } from '../constants'
import buildGridProps from './index'

const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerWeek: 40 }
const RANGE: EditableRange = {
  id: 'range-1',
  clientId: 'client-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: WORKDAY,
  ranges: [],
  canEdit: true,
}
const ONCHANGE = vi.fn()
const STATE: LocalEditorState = {
  ranges: [RANGE],
  status: EDITOR_COPY.idleStatus,
  message: null,
  pendingRemoval: null,
}
const CONTROLLER: ControllerResult = {
  state: STATE,
  errors: [],
  isDirty: false,
  onChangeRanges: ONCHANGE,
  onSave: vi.fn(),
  onCancel: vi.fn(),
}
const EDITABLE = false
const PROPS: EditorProps = {
  member: MEMBER,
  onCancel: vi.fn(),
  onSaved: vi.fn(),
  readOnly: EDITABLE,
}

describe('buildGridProps', () => {
  it("derives the grid's props from the member's workday and the controller's live ranges", () => {
    const gridProps = buildGridProps(PROPS, CONTROLLER)

    expect(gridProps.ranges).toBe(STATE.ranges)
    expect(gridProps.workday).toBe(WORKDAY)
    expect(gridProps.readOnly).toBe(EDITABLE)
    expect(gridProps.onChange).toBe(ONCHANGE)
  })
})
