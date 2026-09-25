import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BillingV2Record } from '@/shared/data'
import useRecordEditor from './index'

const stored = {
  id: 'r1', record_type: 'payment', scheduled_on: '2026-09-30', scheduled_time: null,
  note_month: null, title: 'Nómina', category: 'payroll', payment_status: 'pending',
  payee_label: 'Equipo EMC', amount: null, currency_code: 'USD', event_type_label: null,
  note_text: null, closing_approval_follow_up: false,
} as BillingV2Record
const onSave = vi.fn()
const onDrop = vi.fn()
let seen: ReturnType<typeof useRecordEditor> | null = null

type ProbeProps = { record: BillingV2Record | null; day?: string }

function Probe({ record, day }: ProbeProps) {
  seen = useRecordEditor(record, onSave, onDrop, day)
  return null
}

describe('useRecordEditor', () => {
  beforeEach(() => {
    onSave.mockReset().mockResolvedValue(true)
    onDrop.mockReset().mockResolvedValue(true)
  })

  it('deletes the record it was opened with, and answers whether it landed', async () => {
    renderToStaticMarkup(<Probe record={stored} />)
    expect(await seen?.drop()).toBe(true)
    expect(onDrop).toHaveBeenCalledWith('r1')
    onDrop.mockResolvedValue(false)
    expect(await seen?.drop()).toBe(false)
  })

  // A record started from a calendar day opens already due on that day.
  it('opens a new record on the day it was started from', () => {
    renderToStaticMarkup(<Probe record={null} day="2026-09-14" />)
    expect(seen?.form.scheduledOn).toBe('2026-09-14')
  })

  it('has nothing to delete while the record is new', async () => {
    renderToStaticMarkup(<Probe record={null} />)
    expect(await seen?.drop()).toBe(false)
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('opens a stored record in the boxes it was typed in', () => {
    renderToStaticMarkup(<Probe record={stored} />)
    expect(seen?.form.title).toBe('Nómina')
    expect(seen?.form.amount).toBe('')
  })

  // A form the schema refuses produces no mutation at all.
  it('sends nothing while the form is invalid', async () => {
    renderToStaticMarkup(<Probe record={null} />)
    expect(await seen?.submit()).toBe(false)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('updates the record it was opened with', async () => {
    renderToStaticMarkup(<Probe record={stored} />)
    expect(await seen?.submit()).toBe(true)
    expect(onSave).toHaveBeenCalledWith('r1', expect.objectContaining({ amount: null }))
  })

  it('answers false when the write fails, so the caller keeps the form open', async () => {
    onSave.mockResolvedValue(false)
    renderToStaticMarkup(<Probe record={stored} />)
    expect(await seen?.submit()).toBe(false)
  })

  // Two clicks before the first answer is one save, not two records.
  it('refuses a second submit while the first is in flight', async () => {
    renderToStaticMarkup(<Probe record={stored} />)
    const both = await Promise.all([seen?.submit(), seen?.submit()])
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(both).toEqual([true, false])
  })
})
