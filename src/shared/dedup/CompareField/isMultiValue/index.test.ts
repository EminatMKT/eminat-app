import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { CompareControls } from '@/shared/dedup/DuplicatesTab/types'
import type { Props } from '../types'
import isMultiValue from '.'

const controls: CompareControls = {
  choices: {},
  onChoose: vi.fn(),
  excludedIds: [],
  onToggleExcluded: vi.fn(),
}
type Tag = { id: string; label: string }
const textOf = ({ label }: Tag) => label

describe('isMultiValue', () => {
  it('reads two strings as a scalar field, whatever it is called', () => {
    const scalar: Props<Tag> = {
      labelKey: 'dedup.merge',
      controls,
      field: 'email',
      values: ['a', 'b'],
    }
    expect(isMultiValue<Tag>(scalar)).toBe(false)
  })

  it('reads two arrays as multivalued, even empty ones', () => {
    const multi: Props<Tag> = {
      labelKey: 'dedup.merge',
      controls,
      values: [[], []],
      textOf,
    }
    expect(isMultiValue<Tag>(multi)).toBe(true)
  })
})
