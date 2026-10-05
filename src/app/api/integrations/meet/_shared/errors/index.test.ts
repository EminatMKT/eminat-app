import { describe, expect, it } from 'vitest'
import MEET_ERRORS from '.'

const CODE_SHAPE = /^[A-Z_]+$/
const entries = Object.entries(MEET_ERRORS)

describe('MEET_ERRORS', () => {
  it.each(entries)('%s has an HTTP error status, an UPPER_SNAKE code and an English sentence', (_key, error) => {
    expect(error.status).toBeGreaterThanOrEqual(400)
    expect(error.code).toMatch(CODE_SHAPE)
    expect(error.message).toMatch(/^[A-Z][^áéíóúñ¿¡]*\.$/)
  })

  it('keeps the codes Meet already branches on', () => {
    expect(MEET_ERRORS.taskConflict.code).toBe('TASK_CONFLICT')
    expect(MEET_ERRORS.invalidAssigneeInactive.code).toBe('INVALID_ASSIGNEE')
    expect(MEET_ERRORS.invalidCompany.code).toBe('INVALID_COMPANY')
  })
})
