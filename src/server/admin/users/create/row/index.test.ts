import { describe, it, expect } from 'vitest'
import { DEFAULT_ROLE } from '@/shared/auth/permissions'
import CREATE_FIXTURES from '@/server/admin/users/create/fixtures'
import buildRow from '.'

const { newUser, orphanRow: EXISTING } = CREATE_FIXTURES
const INPUT = { ...newUser, empresa_id: 'e-1', equipo_id: '' }
const NEW_IDENTITY = { id: 'a-1', auth_id: 'a-1', email: 'ana@eminat.net' }
const DEFAULTS = { rol: DEFAULT_ROLE, color: '#7C6FF7', ubicacion: 'Guayaquil, Ecuador' }
const FLAGS = { activo: true, validado: true }
const CATALOGS = { empresa_id: 'e-1', equipo_id: null, jornada_id: null }

describe('buildRow', () => {
  it('a new row takes the Auth id as its own, the email, defaults and every catalog (empty is null)', () => {
    const row = buildRow(INPUT, null, 'a-1')
    expect(row).toMatchObject(NEW_IDENTITY)
    expect(row).toMatchObject(DEFAULTS)
    expect(row).toMatchObject(FLAGS)
    expect(row).toMatchObject(CATALOGS)
    expect(row.vinculacion_id).toBeNull()
  })
  it('a link keeps its id, sets auth_id and only writes the catalogs that were chosen', () => {
    const row = buildRow({ ...INPUT, rol: 'mkt' }, EXISTING, 'a-1')
    expect(row.auth_id).toBe('a-1')
    expect(row.rol).toBe('mkt')
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('email')
    expect(row).not.toHaveProperty('equipo_id')
    expect(row.empresa_id).toBe('e-1')
  })
})
