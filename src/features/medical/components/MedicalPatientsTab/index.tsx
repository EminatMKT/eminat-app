'use client'
import type { ComponentProps } from 'react'
import { useT } from '@/shared/i18n'
import { TabBar, TabButton } from '@/shared/components/ui'
import { useTabPreference } from '@/shared/hooks'
import MEDICAL_TABS from '@/features/medical/constants/tabs'
import PacientesTab from '../PacientesTab'
import MedicalDuplicatesTab from '../MedicalDuplicatesTab'

type Props = ComponentProps<typeof PacientesTab>

/** The Patients section: the patient list, and the duplicates review of those same records. */
export default function MedicalPatientsTab(props: Props) {
  const { t } = useT()
  const [view, setView] = useTabPreference(MEDICAL_TABS.patientsScope, MEDICAL_TABS.patientList, MEDICAL_TABS.patientViews)
  const showDuplicates = view === MEDICAL_TABS.patientDuplicates
  return (
    <>
      <TabBar>
        <TabButton icon="👥" label={t('med.patientListTab')} active={!showDuplicates} onClick={() => setView(MEDICAL_TABS.patientList)} />
        <TabButton icon="🔗" label={t('dedup.medicalTab')} active={showDuplicates} onClick={() => setView(MEDICAL_TABS.patientDuplicates)} />
      </TabBar>
      {showDuplicates ? <MedicalDuplicatesTab /> : <PacientesTab {...props} />}
    </>
  )
}

// Duplicates review is about patient records, so it is a view of Patients rather than a section
// beside it. The open view is its own preference, so it never moves which Medical section opens.
