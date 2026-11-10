import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  NINE_AM,
  NINE_TO_ONE_TEXT,
  ONE_PM,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/constants'
import { BLOCK_LABEL_KEY, BLOCK_LABEL_READ_ONLY_KEY } from '../constants'
import type { BlockProps } from '../types'
import BlockContent from '.'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({ useT: () => ({ t: (key: string) => key }) }))

const READING_NOTE = 'Taller de lectura'
const NOOP = () => undefined
const PROPS: BlockProps = {
  range: {
    weekday: 1,
    startsAt: NINE_AM,
    endsAt: ONE_PM,
    note: null,
  },
  readOnly: false,
  pxPerMin: 1,
  onActivate: NOOP,
}

const draw = (props: BlockProps) => renderToStaticMarkup(<BlockContent {...props} />)

describe('BlockContent', () => {
  it('shows the range as start and end time separated by an en dash', () => {
    expect(draw(PROPS)).toContain(NINE_TO_ONE_TEXT)
  })

  it('shows the note only when the range has one', () => {
    const withNote = { ...PROPS, range: { ...PROPS.range, note: READING_NOTE } }

    expect(draw(withNote)).toContain(READING_NOTE)
    expect(draw(PROPS)).not.toContain(READING_NOTE)
  })

  it('labels itself with the editable or the read-only key', () => {
    const readOnlyProps = { ...PROPS, readOnly: true }

    expect(draw(PROPS)).toContain(BLOCK_LABEL_KEY)
    expect(draw(readOnlyProps)).toContain(BLOCK_LABEL_READ_ONLY_KEY)
  })
})
