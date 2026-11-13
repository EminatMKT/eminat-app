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
import type { MemberAvailabilityModalProps } from '../types'
import useModalView from './index'

const WORKDAY = { id: 'workday-1', name: 'Full time', hoursPerWeek: 40 }
const MEMBER: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana',
  team: null,
  workday: WORKDAY,
  ranges: [],
  canEdit: true,
}
const READ_ONLY_MEMBER: AvailabilityMemberDto = { ...MEMBER, canEdit: false }
const NO_JORNADA_MEMBER: AvailabilityMemberDto = { ...MEMBER, workday: null }

let seen: ReturnType<typeof useModalView> | null = null

function Probe(props: MemberAvailabilityModalProps) {
  seen = useModalView(props)

  return null
}

function draw(member: AvailabilityMemberDto, onClose: () => void) {
  const probeProps: MemberAvailabilityModalProps = { member, onClose, onSaved: vi.fn() }
  const tree = createElement(LocaleProvider, null, createElement(Probe, probeProps))

  renderToStaticMarkup(tree)
}

describe('useModalView', () => {
  it('builds no footer and a non-confirming guard when read-only', () => {
    draw(READ_ONLY_MEMBER, vi.fn())

    expect(seen?.modal.footer).toBeUndefined()
    expect(seen?.closeGuard.confirming).toBe(false)
  })

  it('keeps an editable member without a jornada read-only', () => {
    draw(NO_JORNADA_MEMBER, vi.fn())

    expect(seen?.modal.footer).toBeUndefined()
  })

  it('titles the modal after the member and closes it through the guard', () => {
    draw(MEMBER, vi.fn())

    expect(seen?.modal.title).toBe(MEMBER.name)
    expect(seen?.modal.onClose).toBe(seen?.closeGuard.requestClose)
  })

  it('builds a footer and closes right away through the same controller when editable', () => {
    const onClose = vi.fn()

    draw(MEMBER, onClose)
    seen?.closeGuard.requestClose()

    expect(seen?.modal.footer).not.toBeUndefined()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('routes the footer Cancel button through the close guard, not the raw onClose', () => {
    const onClose = vi.fn()

    draw(MEMBER, onClose)
    seen?.modal.footer?.props.onCancel()

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// A freshly mounted controller is never dirty, so requestClose closes right away here. This file
// owns only the composition: close-guard's own suite covers every dirty/discard/save-and-exit
// branch in isolation.
