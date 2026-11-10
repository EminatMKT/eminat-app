import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import {
  FIVE_PM,
  NINE_AM,
  NINE_THIRTY_AM,
  NINE_TO_ONE_TEXT,
  ONE_PM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import { BLOCK_LABEL_KEY, BLOCK_LABEL_READ_ONLY_KEY } from './constants'
import type { BlockProps } from './types'
import Block from '.'

const VAR_SEPARATOR = ','

function mockTranslate(key: string, vars?: Record<string, unknown>): string {
  if (!vars) return key

  const entries = Object.entries(vars).map(([name, value]) => `${name}=${value}`)
  const formatted = `${key}:${entries.join(VAR_SEPARATOR)}`

  return formatted
}

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({
  useT: () => ({ t: mockTranslate }),
}))

const PX_PER_MIN = 2
const NOOP = () => undefined
const NO_OVERRIDES: Partial<BlockProps> = {}
const SOME_NOTE = 'Clase de la tarde'
const TOP_STYLE = '--block-top:1080px'
const HEIGHT_STYLE = '--block-height:480px'
const NOTE_LINES_PATTERN = /--note-lines:(\d+)/
const HIDDEN_HANDLE_PATTERN = /aria-hidden="true"/g

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
  range: range(NINE_AM, ONE_PM),
  readOnly: false,
  pxPerMin: PX_PER_MIN,
  onActivate: NOOP,
  ...overrides,
})

const draw = (props: BlockProps) => renderToStaticMarkup(<Block {...props} />)

const noteLinesOf = (html: string): number => Number(html.match(NOTE_LINES_PATTERN)?.[1])

describe('Block', () => {
  it('positions itself from the range start and sizes itself from its duration', () => {
    const html = draw(buildProps())

    expect(html).toContain(TOP_STYLE)
    expect(html).toContain(HEIGHT_STYLE)
  })

  it('shows the start and end time separated by an en dash', () => {
    const html = draw(buildProps())

    expect(html).toContain(NINE_TO_ONE_TEXT)
  })

  it('sets more note lines on a tall block than on a compact one', () => {
    const compactHtml = draw(buildProps({ range: range(NINE_AM, NINE_THIRTY_AM, SOME_NOTE) }))
    const tallHtml = draw(buildProps({ range: range(NINE_AM, FIVE_PM, SOME_NOTE) }))

    expect(noteLinesOf(tallHtml)).toBeGreaterThan(noteLinesOf(compactHtml))
  })

  it('renders both resize handles when editable', () => {
    const html = draw(buildProps({ readOnly: false }))

    expect(html.match(HIDDEN_HANDLE_PATTERN)).toHaveLength(2)
  })

  it('suppresses the resize handles and marks itself read-only when not editable', () => {
    const html = draw(buildProps({ readOnly: true }))

    expect(html.match(HIDDEN_HANDLE_PATTERN)).toBeNull()
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
    const html = draw(buildProps({ range: range(NINE_AM, ONE_PM, SOME_NOTE) }))

    expect(html).toContain(SOME_NOTE)
  })
})
