'use client'
import type { ComponentProps } from 'react'
import { useT } from '@/shared/i18n'
import { ColorBadge, TabBar, TabButton } from '@/shared/components/ui'
import { useTabPreference } from '@/shared/hooks'
import MEDICAL_TABS from '@/features/medical/constants/tabs'
import { ESTADO_PACIENTE_META } from '@/features/medical/constants'
import PacientesTab from '../PacientesTab'
import MedicalDuplicatesTab from '../MedicalDuplicatesTab'
import usePendingDuplicateCount from './usePendingDuplicateCount'

type Props = ComponentProps<typeof PacientesTab>

/** The Patients section: the patient list, and the duplicates review of those same records. */
export default function MedicalPatientsTab(props: Props) {
  const { t } = useT()
  const [view, setView] = useTabPreference(MEDICAL_TABS.patientsScope, MEDICAL_TABS.patientList, MEDICAL_TABS.patientViews)
  const showDuplicates = view === MEDICAL_TABS.patientDuplicates
  const pendingPairs = usePendingDuplicateCount(view)
  const complianceBadge = <ColorBadge color={ESTADO_PACIENTE_META.activo.color}>🛡️ {t('med.hipaaCompliant')}</ColorBadge>
  return (
    <>
      <TabBar trailing={complianceBadge}>
        <TabButton icon="👥" label={t('med.patientListTab')} active={!showDuplicates} onClick={() => setView(MEDICAL_TABS.patientList)} />
        <TabButton
          icon="🔗"
          label={t('dedup.medicalTab')}
          badge={pendingPairs}
          active={showDuplicates}
          onClick={() => setView(MEDICAL_TABS.patientDuplicates)}
        />
      </TabBar>
      {showDuplicates ? <MedicalDuplicatesTab /> : <PacientesTab {...props} />}
    </>
  )
}

// Duplicates review is about patient records, so it is a view of Patients rather than a section
// beside it. The open view is its own preference, so it never moves which Medical section opens.
// The HIPAA badge rides the tab bar's right edge, so it no longer costs a row of its own.
