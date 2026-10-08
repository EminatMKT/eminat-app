'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { StaggerGrid, StaggerItem } from '@/shared/motion'
import { Panel } from '@/shared/components/dashboard'
import { useMedicalStyles } from '@/features/medical/hooks/useMedicalStyles'
import { useMedical } from '@/features/medical/components/MedicalContext'
import Badge from '@/features/medical/components/Badge'
import TodayAppointmentItem from '@/features/medical/components/TodayAppointmentItem'
import IncidentAlertCard from '@/features/medical/components/IncidentAlertCard'
import PendingTrainingItem from '@/features/medical/components/PendingTrainingItem'
import RecentActivityRow from '@/features/medical/components/RecentActivityRow'
import RegistryKpis from './RegistryKpis'
import RegistryCharts from './RegistryCharts'
import RegistryQualityPanel from './RegistryQualityPanel'
import colors from './colors'
const COLS = ['med.colTime', 'med.colUser', 'med.colAction', 'med.colPatient', 'med.colDetails', 'med.colLevel'] as const
export default function DashboardTab() {
  const { t1, t3, accent, border } = useApp()
  const { t } = useT()
  const { cardStyle } = useMedicalStyles()
  const { patientDashboard, citasHoy, citasManana, complianceScore, incidentes, incidentesAbiertos, trainingsPendientes, auditLogs } = useMedical()
  const { counts, loading, error } = patientDashboard
  return (
    <>
      <RegistryKpis counts={counts} loading={loading} error={error} citasHoyCount={citasHoy.length}
        citasMananaCount={citasManana.length} complianceScore={complianceScore} incidentesTotal={incidentes.length} incidentesAbiertosCount={incidentesAbiertos.length} />
      {counts && <RegistryCharts counts={counts} />}
      {counts && <RegistryQualityPanel dataQuality={counts.dataQuality} />}
      <StaggerGrid>
        <Panel title={t('med.todaysAppts')} right={<Badge color={accent}>{citasHoy.length}</Badge>}>
          {citasHoy.length === 0
            ? t('med.noApptsToday')
            : citasHoy.map(c => <TodayAppointmentItem key={c.id} cita={c} />)}
        </Panel>
        <Panel title={t('med.hipaaAlerts')} right={
          (incidentesAbiertos.length > 0 || trainingsPendientes.length > 0)
            ? <Badge color={colors.COLOR_DANGER}>{incidentesAbiertos.length + trainingsPendientes.length} {t('med.pendingSuffix')}</Badge>
            : undefined
        }>
          {incidentesAbiertos.map(i => <IncidentAlertCard key={i.id} incidente={i} />)}
          {trainingsPendientes.length > 0 && <StaggerItem>{t('med.pendingTraining')}</StaggerItem>}
          {trainingsPendientes.map(tr => <PendingTrainingItem key={tr.id} training={tr} />)}
          {incidentesAbiertos.length === 0 && trainingsPendientes.length === 0 && <StaggerItem>{t('med.allClear')}</StaggerItem>}
        </Panel>
      </StaggerGrid>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 {t('med.recentPhi')}
          <Badge color={accent}>{t('med.last3h')}</Badge>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {COLS.map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>{auditLogs.slice(0, 5).map(l => <RecentActivityRow key={l.id} log={l} />)}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
