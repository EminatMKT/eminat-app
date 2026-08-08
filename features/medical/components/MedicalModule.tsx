'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import AppShell from '@/shared/components/AppShell'
import AccessDenied from '@/shared/components/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { MedicalProvider } from './MedicalContext'
import DashboardTab from './DashboardTab'
import PacientesTab from './PacientesTab'
import CitasTab from './CitasTab'
import HipaaTab from './HipaaTab'
import AuditTab from './AuditTab'
import PacienteModal from './PacienteModal'
import CitaModal from './CitaModal'
import IncidenteModal from './IncidenteModal'

// Las secciones (Dashboard/Pacientes/Citas/HIPAA/Audit) viven SOLO en el panel
// vertical del shell (SUB_ITEMS.medical). Antes se repetían acá como barra
// horizontal: la misma navegación dos veces, que es lo que la convención del
// shell evita — vertical = secciones, horizontal = sub-vistas de la sección
// activa. Medical no tiene sub-vistas, así que se queda sin barra horizontal.
export default function MedicalModule() {
  const { modules } = useApp()
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
          {/* El sello de cumplimiento no era parte de la navegación: vivía en la
              misma fila que las tabs y se queda, ahora solo. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
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
