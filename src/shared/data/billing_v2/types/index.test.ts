import { describe, expect, it } from 'vitest'
import type { BillingV2Record, BillingV2Write } from './index'

const SERVER_OWNED = ['id', 'created_by_id', 'created_at', 'updated_at']

const WRITABLE: Record<keyof BillingV2Write, true> = {
  record_type: true, scheduled_on: true, scheduled_time: true, note_month: true,
  title: true, category: true, payment_status: true, payee_label: true, amount: true,
  currency_code: true, event_type_label: true, note_text: true,
  closing_approval_follow_up: true,
}

const STORED: Record<keyof BillingV2Record, true> = {
  ...WRITABLE, id: true, created_by_id: true, created_at: true, updated_at: true,
}

describe('billing v2 types', () => {
  it('keeps the columns the database owns out of what this layer writes', () => {
    SERVER_OWNED.forEach((column) => expect(Object.keys(WRITABLE)).not.toContain(column))
  })

  it('describes a stored row as the writable columns plus the server-owned ones', () => {
    expect(Object.keys(STORED)).toHaveLength(Object.keys(WRITABLE).length + SERVER_OWNED.length)
  })
})
