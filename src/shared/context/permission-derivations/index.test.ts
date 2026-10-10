import {
  describe,
  it,
  expect,
  vi,
} from 'vitest'
import derivePermissions from './index'

const noop = () => {}
const noopAsync = async () => {}

const teamMember = {
  id: 'u1',
  nombre: 'Ana',
  equipos: { departamentos: { codigo: 'MKT' } },
  activo: true,
}

const baseApp = {
  usuario: { id: 'u1', rol: 'admin' },
  actividades: [],
  setActividades: vi.fn(),
  equipo: [],
  usuarios: [teamMember],
  setUsuarios: vi.fn(),
  loading: false,
  horaActual: '',
  onlineCount: 0,
  mensaje: null,
  notificaciones: [],
  setNotificaciones: vi.fn(),
  notifAbiertas: false,
  setNotifAbiertas: vi.fn(),
  adminUsuarios: [{ id: 'u1', nombre: 'Ana', apellido: 'Lopez' }],
  setAdminUsuarios: vi.fn(),
  mostrarMensaje: noop,
  handleLogout: noopAsync,
  roles: [{ key: 'admin', label: 'Administrador', is_system: true }],
  setRoles: vi.fn(),
  roleModuleMap: { admin: [] },
  setRoleModuleMap: vi.fn(),
  reloadRoles: noopAsync,
  empresas: [],
  departamentos: [],
  equipos: [],
  cargos: [],
  jornadas: [],
  vinculaciones: [],
  reloadOrg: noopAsync,
}

describe('derivePermissions', () => {
  it('resolves the admin short-circuit: every module with no role_modules rows', () => {
    const result = derivePermissions(baseApp)
    expect(result.esAdmin).toBe(true)
    expect(result.role).toBe('admin')
  })

  it('cargo uses the role label when the catalog has it', () => {
    expect(derivePermissions(baseApp).cargo).toBe('Administrador')
  })

  it('cargo falls back to the raw role value with no catalog', () => {
    const noRoleCatalog = { ...baseApp, roles: [] }
    expect(derivePermissions(noRoleCatalog).cargo).toBe('admin')
  })

  it('miembrosPorId includes everyone by id, active or not', () => {
    expect(derivePermissions(baseApp).miembrosPorId).toEqual({ u1: 'Ana Lopez' })
  })
})
