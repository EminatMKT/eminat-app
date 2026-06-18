'use client'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import IncidentCard from './IncidentCard'
import TrainingRow from './TrainingRow'

export default function HipaaTab({ onNewIncidente }: { onNewIncidente: () => void }) {
  const { s3, t1, t3, border } = useApp()
  const { complianceScore, trainings, trainingsPendientes, incidentes, incidentesAbiertos } = useMedical()
  const { cardStyle, statCardStyle, btnPrimary } = useMedicalStyles()
  const scoreColor = complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171'

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Compliance Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: scoreColor }}>{complianceScore}%</div>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: s3, marginTop: 4 }}>
            <div style={{ height: '100%', borderRadius: 2, background: scoreColor, width: `${complianceScore}%`, transition: 'width .5s' }} />
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Training Completed</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}>{trainings.filter(t => t.estado === 'completado').length}/{trainings.length}</div>
          <div style={{ fontSize: 10, color: t3 }}>{trainingsPendientes.length} pending</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Incidentes 2024</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: incidentesAbiertos.length > 0 ? '#FBB040' : '#34D399' }}>{incidentes.length}</div>
          <div style={{ fontSize: 10, color: t3 }}>{incidentesAbiertos.length} open · {incidentes.filter(i => i.estado === 'resuelto' || i.estado === 'cerrado').length} resolved</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1 }}>HIPAA Incidents</div>
            <button onClick={onNewIncidente} style={btnPrimary}>+ Report</button>
          </div>
          {incidentes.map(i => <IncidentCard key={i.id} incidente={i} />)}
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>HIPAA Training</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Staff', 'Course', 'Expiration', 'Score', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 6px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{trainings.map(t => <TrainingRow key={t.id} training={t} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
