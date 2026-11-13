import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { RosterUser } from '../types'
import RosterName from './index'

const MEMBER_ID = 'roster-member-5'
const DISPLAY_NAME = 'Maricela Ordóñez'
const STRATEGIST = 'Estratega digital'
const EDITOR = 'Editora'
const EXPECTED_POSITIONS = 'Estratega digital, Editora<'

const member: RosterUser = {
  id: MEMBER_ID,
  usuario_cargos: [
    { cargos: { codigo: STRATEGIST, nombre: STRATEGIST } },
    { cargos: null },
    { cargos: { codigo: EDITOR, nombre: EDITOR } },
  ],
}

describe('RosterName', () => {
  it('shows the full name over the named positions only', () => {
    const html = renderToStaticMarkup(<RosterName user={member} fullName={DISPLAY_NAME} />)

    expect(html).toContain(DISPLAY_NAME)
    expect(html).toContain(EXPECTED_POSITIONS)
  })
})
