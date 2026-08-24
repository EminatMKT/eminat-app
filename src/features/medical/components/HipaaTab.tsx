'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import IncidentCard from './IncidentCard'
import TrainingRow from './TrainingRow'

const COLS = ['med.colStaff', 'med.colCourse', 'med.colExpiration', 'med.colScore', 'med.colStatus'] as const

export default function HipaaTab({ onNewIncidente }: { onNewIncidente: () => void }) {
  const { s3, t1, t3, border } = useApp()
  const { t } = useT()
  const { complianceScore, trainings, trainingsPendientes, incidentes, incidentesAbiertos } = useMedical()
  const { cardStyle, statCardStyle, btnPrimary } = useMedicalStyles()
  const scoreColor = complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171'

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>{t('med.statCompliance')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: scoreColor }}>{complianceScore}%</div>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: s3, marginTop: 4 }}>
            <div style={{ height: '100%', borderRadius: 2, background: scoreColor, width: `${complianceScore}%`, transition: 'width .5s' }} />
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>{t('med.statTrainingCompleted')}</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}>{trainings.filter(tr => tr.estado === 'completado').length}/{trainings.length}</div>
          <div style={{ fontSize: 10, color: t3 }}>{trainingsPendientes.length} {t('med.pendingSuffix')}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>{t('med.statIncidents2024')}</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: incidentesAbiertos.length > 0 ? '#FBB040' : '#34D399' }}>{incidentes.length}</div>
          <div style={{ fontSize: 10, color: t3 }}>{incidentesAbiertos.length} {t('med.openSuffix')} · {incidentes.filter(i => i.estado === 'resuelto' || i.estado === 'cerrado').length} {t('med.resolvedSuffix')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1 }}>{t('med.hipaaIncidents')}</div>
            <button onClick={onNewIncidente} style={btnPrimary}>{t('med.report')}</button>
          </div>
          {incidentes.map(i => <IncidentCard key={i.id} incidente={i} />)}
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>{t('med.hipaaTraining')}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {COLS.map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 6px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>{trainings.map(tr => <TrainingRow key={tr.id} training={tr} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
