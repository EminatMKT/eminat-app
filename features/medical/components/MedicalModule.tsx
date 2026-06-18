'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/AppShell'
import { PageTransition } from '@/shared/motion'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { MedicalProvider } from './MedicalContext'
import MedicalTabButton from './MedicalTabButton'
import DashboardTab from './DashboardTab'
import PacientesTab from './PacientesTab'
import CitasTab from './CitasTab'
import HipaaTab from './HipaaTab'
import AuditTab from './AuditTab'
import PacienteModal from './PacienteModal'
import CitaModal from './CitaModal'
import IncidenteModal from './IncidenteModal'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'pacientes', label: 'Pacientes', icon: '👥' },
  { id: 'citas', label: 'Citas', icon: '📅' },
  { id: 'hipaa', label: 'HIPAA', icon: '🛡️' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
]

export default function MedicalModule() {
  const { canMedical, t1, t3, border } = useApp()
  const { hipaaShield } = useMedicalStyles()
  const [tab, setTab] = useState('dashboard')
  const [modalPaciente, setModalPaciente] = useState(false)
  const [modalCita, setModalCita] = useState(false)
  const [modalIncidente, setModalIncidente] = useState(false)

  if (!canMedical) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>Access denied</div>
          <div style={{ fontSize: 13, color: t3 }}>You don't have access to the Medical HIPAA module</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>
        <MedicalProvider>
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}`, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(t => <MedicalTabButton key={t.id} label={t.label} icon={t.icon} active={tab === t.id} onClick={() => setTab(t.id)} />)}
            </div>
            <div style={hipaaShield}>🛡️ HIPAA Compliant</div>
          </div>

          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'pacientes' && <PacientesTab onNewPatient={() => setModalPaciente(true)} />}
          {tab === 'citas' && <CitasTab onNewCita={() => setModalCita(true)} />}
          {tab === 'hipaa' && <HipaaTab onNewIncidente={() => setModalIncidente(true)} />}
          {tab === 'audit' && <AuditTab />}

          {modalPaciente && <PacienteModal onClose={() => setModalPaciente(false)} />}
          {modalCita && <CitaModal onClose={() => setModalCita(false)} />}
          {modalIncidente && <IncidenteModal onClose={() => setModalIncidente(false)} />}
        </MedicalProvider>
      </PageTransition>
    </AppShell>
  )
}
