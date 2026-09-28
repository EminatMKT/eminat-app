import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import fixtureRecord from '@/features/billing-v2/fixture-record'
import useRecordEditor from './index'

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))

type Step = (editor: ReturnType<typeof useRecordEditor>) => void

// Fixtures, not shipped copy.
const CHANGED = 'Payroll, second half'
const stored = fixtureRecord({ id: 'r1', payee_label: 'x' })
const onSave = vi.fn()
const onDrop = vi.fn()
const opened: { record: BillingV2Record | null; day?: string; steps: Step[] } = { record: null, steps: [] }
let seen: ReturnType<typeof useRecordEditor> | null = null

/** Mounts the hook; each render runs the next step —an edit, a leave—, so the last one sees all. */
function Probe() {
  const editor = useRecordEditor(opened.record, onSave, onDrop, opened.day)
  opened.steps.shift()?.(editor)
  seen = editor
  return null
}
const open = (record: BillingV2Record | null, ...steps: Step[]) => {
  Object.assign(opened, { record, steps, day: undefined })
  renderToStaticMarkup(<Probe />)
}
const retitle: Step = (editor) => editor.edit('title', CHANGED)

describe('useRecordEditor', () => {
  beforeEach(() => {
    onSave.mockReset().mockResolvedValue(true)
    onDrop.mockReset().mockResolvedValue(true)
  })
  it('deletes the record it was opened with, and answers whether it landed', async () => {
    open(stored)
    expect(await seen?.drop()).toBe(true)
    expect(onDrop).toHaveBeenCalledWith('r1')
    onDrop.mockResolvedValue(false)
    expect(await seen?.drop()).toBe(false)
  })
  it('opens a new record on the day it was started from, with nothing to delete', async () => {
    Object.assign(opened, { record: null, steps: [], day: '2026-09-14' })
    renderToStaticMarkup(<Probe />)
    expect(seen?.form.scheduledOn).toBe('2026-09-14')
    expect(await seen?.drop()).toBe(false)
    expect(onDrop).not.toHaveBeenCalled()
  })
  // Save gets every error from the first render, before any box shows one; nothing changed holds too.
  it('hands Save every error, even unshown ones, and holds it while nothing changed', async () => {
    open(null)
    expect([seen?.shown, seen?.errors.title]).toEqual([{}, 'billing.error.title'])
    open(stored)
    expect([seen?.errors, seen?.hold]).toEqual([{}, 'billing.saveBlocked.unchanged'])
    expect(await seen?.submit()).toBe(false)
    expect(onSave).not.toHaveBeenCalled()
  })
  // Two clicks before the first answer is one save, not two records.
  it('updates the record once something changed, once per click race', async () => {
    open(stored, retitle)
    expect(seen?.hold).toBeNull()
    expect(await Promise.all([seen?.submit(), seen?.submit()])).toEqual([true, false])
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('r1', expect.objectContaining({ title: CHANGED }))
  })
  it('answers false when the write fails, so the caller keeps the form open', async () => {
    onSave.mockResolvedValue(false)
    open(stored, retitle)
    expect(await seen?.submit()).toBe(false)
  })
  // Validation runs on change, but a box's message only shows once the person left it.
  it('shows the message of a box only after it was left', () => {
    const typo: Step = (editor) => editor.edit('amount', 'abc')
    open(stored, typo)
    expect([seen?.shown, seen?.errors]).toEqual([{}, { amount: 'billing.error.amount' }])
    open(stored, typo, (editor) => editor.leave('amount'))
    expect(seen?.shown).toEqual({ amount: 'billing.error.amount' })
  })
})
