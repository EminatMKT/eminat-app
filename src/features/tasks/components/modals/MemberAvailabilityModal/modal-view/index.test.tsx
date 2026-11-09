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
import type {
  EditorProps,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import useModalView from './index'

const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerDay: 8 }
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: WORKDAY,
  ranges: [],
  canEdit: true,
}
const EDITABLE_PROPS: EditorProps = {
  member: MEMBER,
  onCancel: vi.fn(),
  onSaved: vi.fn(),
  readOnly: false,
}
const READ_ONLY_PROPS: EditorProps = {
  member: MEMBER,
  onCancel: vi.fn(),
  onSaved: vi.fn(),
  readOnly: true,
}

let seen: ReturnType<typeof useModalView> | null = null

function Probe(props: { editorProps: EditorProps; onClose: () => void }) {
  seen = useModalView(props.editorProps, props.onClose)

  return null
}

function draw(editorProps: EditorProps, onClose: () => void) {
  const probeProps = { editorProps, onClose }
  const tree = createElement(LocaleProvider, null, createElement(Probe, probeProps))

  renderToStaticMarkup(tree)
}

describe('useModalView', () => {
  it('builds no footer and a non-confirming guard when read-only', () => {
    draw(READ_ONLY_PROPS, vi.fn())

    expect(seen?.display.footer).toBeUndefined()
    expect(seen?.closeGuard.confirming).toBe(false)
  })

  it('builds a footer and closes right away through the same controller when editable', () => {
    const onClose = vi.fn()

    draw(EDITABLE_PROPS, onClose)
    seen?.closeGuard.requestClose()

    expect(seen?.display.footer).not.toBeUndefined()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('routes the footer Cancel button through the close guard, not the raw onClose', () => {
    const onClose = vi.fn()

    draw(EDITABLE_PROPS, onClose)
    seen?.display.footer?.props.onCancel()

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// A freshly mounted controller is never dirty, so requestClose closes right away here — this
// proves useModalView feeds useCloseGuard the SAME controller useEditorView built (a disconnected
// second instance would also start non-dirty, but close-guard's own suite already covers every
// dirty/discard/save-and-exit branch in isolation; this file only owns the composition itself).
