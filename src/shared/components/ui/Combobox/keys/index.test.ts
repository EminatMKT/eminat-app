import { describe, it, expect } from 'vitest'
import CLOSED from '../closed'
import type { ComboState } from '../types'
import onKey from './index'

const COUNT = 3
const OPENED: ComboState = { ...CLOSED, open: true }
const open = (active: number): ComboState => ({ open: true, active })
const press = (key: string, state = OPENED, multiple = false) => {
  const input = {
    state,
    key,
    count: COUNT,
    multiple,
  }
  return onKey(input)
}
const outcome = (state: ComboState, handled: boolean) => ({ state, handled })
const picked = (state: ComboState, pick: number) => ({ state, pick, handled: true })
const IGNORED = { handled: false }

describe('combobox keys', () => {
  it('Escape closes an open panel and claims the key', () => {
    expect(press('Escape')).toEqual(outcome(CLOSED, true))
  })

  it('Escape on a closed panel is left to whoever is around', () => {
    expect(press('Escape', CLOSED)).toEqual(outcome(CLOSED, false))
  })

  it('Tab closes without stealing focus movement', () => {
    expect(press('Tab')).toEqual(outcome(CLOSED, false))
  })

  it('Enter picks the highlighted option and closes a single combobox', () => {
    expect(press('Enter', open(1))).toEqual(picked(CLOSED, 1))
  })

  it('Enter toggles the highlighted option and keeps a multiple one open', () => {
    expect(press('Enter', open(2), true)).toEqual(picked(open(2), 2))
  })

  it('Enter, Space and ArrowDown open a closed multiple combobox', () => {
    for (const key of ['Enter', ' ', 'ArrowDown']) expect(press(key, CLOSED, true)).toEqual(outcome(OPENED, true))
  })

  it('Space types in an open box', () => {
    expect(press(' ', OPENED, true)).toEqual(IGNORED)
  })

  it('the arrows roll the highlight around the list', () => {
    expect(press('ArrowDown')).toEqual(outcome(open(0), true))
    expect(press('ArrowUp')).toEqual(outcome(open(2), true))
    expect(press('ArrowDown', open(2))).toEqual(outcome(open(0), true))
  })
})
