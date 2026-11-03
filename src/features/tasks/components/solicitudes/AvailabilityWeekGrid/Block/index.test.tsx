import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import { BLOCK_LABEL_KEY, BLOCK_LABEL_READ_ONLY_KEY } from './constants'
import type { BlockProps } from './types'
import Block from '.'

function mockTranslate(key: string, vars?: Record<string, unknown>): string {
  if (!vars) return key

  const entries = Object.entries(vars).map(([name, value]) => `${name}=${value}`)
  const formatted = `${key}:${entries.join(',')}`

  return formatted
}

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: mockTranslate }),
}))

const PX_PER_MIN = 2
const NOOP = () => undefined
const NO_OVERRIDES: Partial<BlockProps> = {}
const SOME_NOTE = 'Clase de la tarde'

const range = (
  startsAt: string,
  endsAt: string,
  note: string | null = null,
): WeeklyAvailabilityRange => ({
  weekday: 1,
  startsAt,
  endsAt,
  note,
})

const buildProps = (overrides: Partial<BlockProps> = NO_OVERRIDES): BlockProps => ({
  range: range('09:00', '13:00'),
  readOnly: false,
  pxPerMin: PX_PER_MIN,
  onActivate: NOOP,
  ...overrides,
})

const draw = (props: BlockProps) => renderToStaticMarkup(<Block {...props} />)

describe('Block', () => {
  it('positions itself from the range start and sizes itself from its duration', () => {
    const html = draw(buildProps())

    expect(html).toContain('--block-top:1080px')
    expect(html).toContain('--block-height:480px')
  })

  it('shows the start and end time separated by an en dash', () => {
    const html = draw(buildProps())

    expect(html).toContain('09:00–13:00')
  })

  it('sets more note lines on a tall block than on a compact one', () => {
    const compactHtml = draw(buildProps({ range: range('09:00', '09:30', SOME_NOTE) }))
    const tallHtml = draw(buildProps({ range: range('09:00', '17:00', SOME_NOTE) }))
    const compactLines = Number(compactHtml.match(/--note-lines:(\d+)/)?.[1])
    const tallLines = Number(tallHtml.match(/--note-lines:(\d+)/)?.[1])

    expect(tallLines).toBeGreaterThan(compactLines)
  })

  it('renders both resize handles when editable', () => {
    const html = draw(buildProps({ readOnly: false }))

    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2)
  })

  it('suppresses the resize handles and marks itself read-only when not editable', () => {
    const html = draw(buildProps({ readOnly: true }))

    expect(html.match(/aria-hidden="true"/g)).toBeNull()
  })

  it('uses the editable label text when writable', () => {
    const html = draw(buildProps({ readOnly: false }))

    expect(html).toContain(BLOCK_LABEL_KEY)
  })

  it('uses the read-only label text when not writable', () => {
    const html = draw(buildProps({ readOnly: true }))

    expect(html).toContain(BLOCK_LABEL_READ_ONLY_KEY)
  })

  it('includes the note in its label when present', () => {
    const html = draw(buildProps({ range: range('09:00', '13:00', 'Clase') }))

    expect(html).toContain('Clase')
  })
})
