'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/shared/components/shell/AppShell'
import AccessDenied from '@/shared/components/access/AccessDenied'
import { PageTransition } from '@/shared/motion'
import { MedicalProvider } from '../MedicalContext'
import DashboardTab from '../DashboardTab'
import MedicalPatientsTab from '../MedicalPatientsTab'
import CitasTab from '../CitasTab'
import HipaaTab from '../HipaaTab'
import AuditTab from '../AuditTab'
import PacienteModal from '../PacienteModal'
import PacientesImportModal from '../PacientesImportModal'
import CitaModal from '../CitaModal'
import IncidenteModal from '../IncidenteModal'
import { useTabPreference } from '@/shared/hooks'
import { MODULE } from '@/shared/auth/permissions'
import MEDICAL_TABS from '@/features/medical/constants/tabs'

// Las secciones (Dashboard/Pacientes/Citas/HIPAA/Audit) viven SOLO en el panel
// vertical del shell (SUB_ITEMS.medical). Antes se repetían acá como barra
// horizontal: la misma navegación dos veces, que es lo que la convención del
// shell evita — vertical = secciones, horizontal = sub-vistas de la sección
// activa. Medical no tiene sub-vistas, así que se queda sin barra horizontal.
export default function MedicalModule() {
  const { modules } = useApp()
  const [tab, setTab] = useTabPreference<string>(MODULE.MEDICAL, MEDICAL_TABS.defaultSection, MEDICAL_TABS.sections)
  const [modalPaciente, setModalPaciente] = useState(false)
  const [modalImportPacientes, setModalImportPacientes] = useState(false)
  const [modalCita, setModalCita] = useState(false)
  const [modalIncidente, setModalIncidente] = useState(false)

  if (!modules.includes(MODULE.MEDICAL)) return <AccessDenied />

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>
        <MedicalProvider>
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'pacientes' && <MedicalPatientsTab onNewPatient={() => setModalPaciente(true)} onImportPatients={() => setModalImportPacientes(true)} />}
          {tab === 'citas' && <CitasTab onNewCita={() => setModalCita(true)} />}
          {tab === 'hipaa' && <HipaaTab onNewIncidente={() => setModalIncidente(true)} />}
          {tab === 'audit' && <AuditTab />}

          {modalPaciente && <PacienteModal onClose={() => setModalPaciente(false)} />}
          {modalImportPacientes && <PacientesImportModal onClose={() => setModalImportPacientes(false)} />}
          {modalCita && <CitaModal onClose={() => setModalCita(false)} />}
          {modalIncidente && <IncidenteModal onClose={() => setModalIncidente(false)} />}
        </MedicalProvider>
      </PageTransition>
    </AppShell>
  )
}
