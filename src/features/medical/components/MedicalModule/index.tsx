'use client'
import { useState, type ComponentType, type ReactNode } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { AppShell } from '@/shared/components/shell'
import { AccessDenied } from '@/shared/components/access'
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

/** Any of the four creation modals: each one only needs to know how to close itself. */
type MedicalModal = ComponentType<{ onClose: () => void }>

/** Medical's screen: the active section from the sidebar, plus whichever creation modal is open. */
export default function MedicalModule() {
  const { modules } = useApp()
  const [tab, setTab] = useTabPreference<string>(MODULE.MEDICAL, MEDICAL_TABS.defaultSection, MEDICAL_TABS.sections)
  // Only one modal is ever open, so the open one is the state, not four booleans.
  const [OpenModal, setOpenModal] = useState<MedicalModal>()

  if (!modules.includes(MODULE.MEDICAL)) return <AccessDenied />

  const open = (modal: MedicalModal) => () => setOpenModal(() => modal)
  const sections: Record<string, ReactNode> = {
    dashboard: <DashboardTab />,
    pacientes: <MedicalPatientsTab onNewPatient={open(PacienteModal)} onImportPatients={open(PacientesImportModal)} />,
    citas: <CitasTab onNewCita={open(CitaModal)} />,
    hipaa: <HipaaTab onNewIncidente={open(IncidenteModal)} />,
    audit: <AuditTab />,
  }

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <PageTransition>
        <MedicalProvider>
          {sections[tab]}
          {OpenModal && <OpenModal onClose={() => setOpenModal(undefined)} />}
        </MedicalProvider>
      </PageTransition>
    </AppShell>
  )
}

// Mounts Medical behind its module gate. The sections live only in the shell's vertical panel
// (SUB_ITEMS.medical); Medical has no sub-views, so there is no horizontal bar here.
// The section map keys must match those SUB_ITEMS tabs; an unknown tab renders nothing.
