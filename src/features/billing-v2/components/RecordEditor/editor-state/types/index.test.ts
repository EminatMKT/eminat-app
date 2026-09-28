import { it, expect } from 'vitest'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import type { EditorState, EditorUpdate } from './index'

const form = recordForm(null)
const state: EditorState = { initial: form, form, left: [], attempts: 0, failure: null, busy: false }

// A failure is an i18n key, so a raw server message can never reach the screen through it.
it('only lets a dictionary key stand for a failure', () => {
  // @ts-expect-error a raw message is not an i18n key
  const raw: EditorState = { ...state, failure: 'constraint billing_v2_title_length violated' }
  expect(raw.busy).toBe(false)
})

it('describes a change as a function from one state to the next', () => {
  const busy: EditorUpdate = (s) => ({ ...s, busy: true })
  expect(busy(state).busy).toBe(true)
})
