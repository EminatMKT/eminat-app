import { describe, expect, it } from 'vitest'
import type { CompareControls } from '@/shared/dedup'
import type { Paciente } from '@/features/medical/types'
import reviewFixture from '@/features/medical/components/MedicalDuplicatesTab/reviewFixture'
import type { PatientUnderReview } from '@/features/medical/components/MedicalDuplicatesTab/types'
import contactRows from '.'

const t = (key: string) => key
const BLANK = 'import.merge.noValue'
const PHONE_LABEL = 'med.field.telefono'
const EMAIL_LABEL = 'med.field.email'
const WINNER_PHONE = { id: 'w1', valor: '555-0001' }
const LOSER_PHONE = { id: 'l1', valor: '555-0002' }
const LOSER_COPY = { id: 'l2', valor: '555-0001' }
const WINNER_EMAIL = { id: 'w2', valor: 'ana@x.com' }
const NO_FIELDS: Partial<Paciente> = {}
const WINNER_CONTACTS: Partial<PatientUnderReview> = { telefono: [WINNER_PHONE], email: [WINNER_EMAIL] }
const LOSER_CONTACTS: Partial<PatientUnderReview> = { telefono: [LOSER_PHONE, LOSER_COPY] }
const NOTHING_EXCLUDED: string[] = []
const LOSER_PHONE_EXCLUDED = [LOSER_PHONE.id]
const LOSER_COPY_EXCLUDED = [LOSER_COPY.id]
const BOTH_LOSER_PHONES_EXCLUDED = [LOSER_PHONE.id, LOSER_COPY.id]

const controlsWith = (excludedIds: string[]): CompareControls => ({
  choices: {},
  onChoose: () => {},
  excludedIds,
  onToggleExcluded: () => {},
})

const winner = reviewFixture(NO_FIELDS, WINNER_CONTACTS)
const loser = reviewFixture(NO_FIELDS, LOSER_CONTACTS)
const valueOf = (rows: ReturnType<typeof contactRows>, field: string) => rows.find(row => row.field === field)?.value

describe('contactRows', () => {
  // The reported bug: a second kept phone never reached the preview.
  it('lists every phone that survives, the winner’s and the loser’s kept one', () => {
    const rows = contactRows(winner, loser, controlsWith(NOTHING_EXCLUDED), t)
    expect(valueOf(rows, 'telefono')).toBe('555-0001, 555-0002')
  })

  it('drops a loser phone the reviewer unchecked', () => {
    const rows = contactRows(winner, loser, controlsWith(LOSER_PHONE_EXCLUDED), t)
    expect(valueOf(rows, 'telefono')).toBe('555-0001')
  })

  // The winner's own copy of a value can never be unchecked, so excluding the loser's copy keeps it.
  it('keeps a value the winner also holds even when the loser’s copy is unchecked', () => {
    const rows = contactRows(winner, loser, controlsWith(LOSER_COPY_EXCLUDED), t)
    expect(valueOf(rows, 'telefono')).toBe('555-0001, 555-0002')
  })

  it('says a contact type will be saved blank when nothing of it survives', () => {
    const rows = contactRows(reviewFixture(), loser, controlsWith(BOTH_LOSER_PHONES_EXCLUDED), t)
    expect(valueOf(rows, 'telefono')).toBe(BLANK)
  })

  it('labels one line per contact type, phones before emails, as the grid does', () => {
    const rows = contactRows(winner, loser, controlsWith(NOTHING_EXCLUDED), t)
    expect(rows.map(({ label }) => label)).toEqual([PHONE_LABEL, EMAIL_LABEL])
    expect(valueOf(rows, 'email')).toBe(WINNER_EMAIL.valor)
  })
})
