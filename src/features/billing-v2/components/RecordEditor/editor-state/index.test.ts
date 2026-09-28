import { describe, it, expect } from 'vitest'
import recordForm from '@/features/billing-v2/components/RecordEditor/form-state'
import editorState from './index'

const opened = editorState.open(recordForm(null))

describe('editorState', () => {
  // What the form opened with is kept apart, so "nothing changed" can be told.
  it('opens with the boxes as they came, nothing left, nothing tried and nothing failed', () => {
    expect(opened).toMatchObject({ left: [], attempts: 0, failure: null, busy: false })
    expect(opened.form).toBe(opened.initial)
  })

  it('changes one box and leaves what it opened with alone', () => {
    const typed = editorState.edit('title', 'x')(opened)
    expect(typed.form.title).toBe('x')
    expect(typed.initial.title).toBe('')
  })

  it('remembers each box the person left once', () => {
    const twice = editorState.leave('title')(editorState.leave('title')(opened))
    expect(twice.left).toEqual(['title'])
  })

  it('switches the record type without dropping what was typed', () => {
    const typed = editorState.edit('title', 'x')(opened)
    expect(editorState.pick('event')(typed).form).toMatchObject({ recordType: 'event', title: 'x' })
  })

  // A failed write keeps every box; a new attempt clears the old failure while it travels.
  it('tracks a save attempt, a write in flight and a write that failed', () => {
    expect(editorState.attempted(opened).attempts).toBe(1)
    const failed = editorState.failed('billing.saveFailed')(editorState.sending(opened))
    expect(failed).toMatchObject({ busy: false, failure: 'billing.saveFailed', form: opened.form })
    expect(editorState.sending(failed)).toMatchObject({ busy: true, failure: null })
  })

  // The failure answers the form as it was sent; once a box changes, the reason Save gives is
  // about the new form, and the old failure would only compete with it.
  it('forgets a failed write the moment a box changes', () => {
    const failed = editorState.failed('billing.saveFailed')(opened)
    expect(editorState.edit('title', 'y')(failed).failure).toBeNull()
    expect(editorState.pick('event')(failed).failure).toBeNull()
  })
})
