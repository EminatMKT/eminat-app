'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { MedicalProvider } from './MedicalContext'
import TabButton from '@/shared/components/ui/TabButton'
import DashboardTab from './DashboardTab'
import PacientesTab from './PacientesTab'
import CitasTab from './CitasTab'
import HipaaTab from './HipaaTab'
import AuditTab from './AuditTab'
import PacienteModal from './PacienteModal'
import CitaModal from './CitaModal'
import IncidenteModal from './IncidenteModal'

const TABS = [
  { id: 'dashboard', labelKey: 'med.tabDashboard', icon: '📊' },
  { id: 'pacientes', labelKey: 'med.tabPatients', icon: '👥' },
  { id: 'citas', labelKey: 'med.tabAppointments', icon: '📅' },
  { id: 'hipaa', labelKey: 'med.tabHipaa', icon: '🛡️' },
  { id: 'audit', labelKey: 'med.tabAudit', icon: '📋' },
] as const

export default function MedicalModule() {
  const { modules, border } = useApp()
  const { t } = useT()
  const { hipaaShield } = useMedicalStyles()
  const [tab, setTab] = useState('dashboard')
  const [modalPaciente, setModalPaciente] = useState(false)
  const [modalCita, setModalCita] = useState(false)
  const [modalIncidente, setModalIncidente] = useState(false)

  if (!modules.includes('medical')) return <AccessDenied />

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>
        <MedicalProvider>
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${border}`, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {TABS.map(item => <TabButton key={item.id} label={t(item.labelKey)} icon={item.icon} active={tab === item.id} onClick={() => setTab(item.id)} />)}
            </div>
            <div style={hipaaShield}>🛡️ {t('med.hipaaCompliant')}</div>
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
