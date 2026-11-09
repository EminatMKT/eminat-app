import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { LocaleProvider } from '@/shared/i18n'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { EditorProps } from '../types'
import useEditorView from './index'

const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerDay: 8 }
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: WORKDAY,
  ranges: [],
  canEdit: true,
}

let seen: ReturnType<typeof useEditorView> | null = null

function Probe(props: EditorProps) {
  seen = useEditorView(props)

  return null
}

const draw = (editorProps: EditorProps) => renderToStaticMarkup(
  createElement(LocaleProvider, null, createElement(Probe, editorProps)),
)

describe('useEditorView', () => {
  it('derives grid props from the member and suppresses the banner/actions when read-only', () => {
    const readOnlyProps = {
      member: MEMBER,
      onCancel: vi.fn(),
      onSaved: vi.fn(),
      readOnly: true,
    }

    draw(readOnlyProps)

    expect(seen?.gridProps.workday).toBe(WORKDAY)
    expect(seen?.gridProps.readOnly).toBe(true)
    expect(seen?.bannerProps).toBeNull()
    expect(seen?.actionsProps).toBeNull()
    expect(seen?.controller.isDirty).toBe(false)
  })

  it('builds the save/cancel actions props when editable', () => {
    const editableProps = {
      member: MEMBER,
      onCancel: vi.fn(),
      onSaved: vi.fn(),
      readOnly: false,
    }

    draw(editableProps)

    expect(seen?.actionsProps).not.toBeNull()
  })
})
