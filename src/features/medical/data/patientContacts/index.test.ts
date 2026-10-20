import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { COLUMNS, TABLES, TABLE_COLUMNS } from '@/shared/schema'
import patientContacts from '.'

const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn(), order: vi.fn() }))
vi.mock('@/shared/db/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mocks.from(table)
      return {
        select: () => ({
          eq: (column: string, value: string) => {
            mocks.eq(column, value)
            return { order: (by: string) => { mocks.order(by); return { overrideTypes: async () => ({ data: [], error: null }) } } }
          },
        }),
      }
    },
  },
}))

describe('patientContacts', () => {
  it('reads one patient’s contact rows, oldest first', async () => {
    await patientContacts('p1')
    expect(mocks.from).toHaveBeenCalledWith(TABLES.pacienteContactos)
    expect(mocks.eq).toHaveBeenCalledWith(TABLE_COLUMNS.pacienteContactos.pacienteId, 'p1')
    expect(mocks.order).toHaveBeenCalledWith(COLUMNS.createdAt)
  })
})
