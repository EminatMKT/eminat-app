import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MedicalModule from './index'

/** What the shell, motion and provider stand-ins are handed. */
type Wrapper = { children?: ReactNode }

const { app, pref } = vi.hoisted(() => ({
  app: { modules: new Array<string>() },
  pref: { tab: 'dashboard' },
}))

vi.mock('@/shared/context/AppContext', () => ({ useApp: () => app }))
vi.mock('@/shared/hooks', () => ({ useTabPreference: () => [pref.tab, vi.fn()] }))
vi.mock('@/shared/components/shell', () => ({ AppShell: ({ children }: Wrapper) => children }))
vi.mock('@/shared/components/access', () => ({ AccessDenied: () => 'DENIED' }))
vi.mock('@/shared/motion', () => ({ PageTransition: ({ children }: Wrapper) => children }))
vi.mock('../MedicalContext', () => ({ MedicalProvider: ({ children }: Wrapper) => children }))
vi.mock('../DashboardTab', () => ({ default: () => 'DASHBOARD' }))
vi.mock('../MedicalPatientsTab', () => ({ default: () => 'PATIENTS' }))
vi.mock('../CitasTab', () => ({ default: () => 'APPOINTMENTS' }))
vi.mock('../HipaaTab', () => ({ default: () => 'HIPAA' }))
vi.mock('../AuditTab', () => ({ default: () => 'AUDIT' }))
vi.mock('../PacienteModal', () => ({ default: () => 'MODAL' }))
vi.mock('../PacientesImportModal', () => ({ default: () => 'MODAL' }))
vi.mock('../CitaModal', () => ({ default: () => 'MODAL' }))
vi.mock('../IncidenteModal', () => ({ default: () => 'MODAL' }))

const SECTION_MARKERS = ['DASHBOARD', 'PATIENTS', 'APPOINTMENTS', 'HIPAA', 'AUDIT']

describe('MedicalModule', () => {
  beforeEach(() => { app.modules = ['medical']; pref.tab = 'dashboard' })

  it('turns away whoever lacks the medical module without mounting any section', () => {
    app.modules = []
    const html = renderToStaticMarkup(<MedicalModule />)
    expect(html).toContain('DENIED')
    for (const marker of SECTION_MARKERS) expect(html).not.toContain(marker)
  })

  // Every sidebar section maps to exactly one tab, and only that one mounts.
  it.each([
    ['dashboard', 'DASHBOARD'],
    ['pacientes', 'PATIENTS'],
    ['citas', 'APPOINTMENTS'],
    ['hipaa', 'HIPAA'],
    ['audit', 'AUDIT'],
  ])('renders only the %s section when it is the remembered tab', (tab, marker) => {
    pref.tab = tab
    const html = renderToStaticMarkup(<MedicalModule />)
    expect(html).toContain(marker)
    for (const other of SECTION_MARKERS.filter(m => m !== marker)) expect(html).not.toContain(other)
  })

  it('opens with no modal mounted', () => {
    expect(renderToStaticMarkup(<MedicalModule />)).not.toContain('MODAL')
  })

  it('renders no section for a tab the sidebar does not offer', () => {
    pref.tab = 'unknown'
    const html = renderToStaticMarkup(<MedicalModule />)
    for (const marker of SECTION_MARKERS) expect(html).not.toContain(marker)
  })
})
