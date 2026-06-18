'use client'
import { useApp } from '@/shared/context/AppContext'
import { StaggerGrid, StaggerItem, AnimatedNumber } from '@/shared/motion'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import Badge from './Badge'
import TodayAppointmentItem from './TodayAppointmentItem'
import IncidentAlertCard from './IncidentAlertCard'
import PendingTrainingItem from './PendingTrainingItem'
import RecentActivityRow from './RecentActivityRow'

export default function DashboardTab() {
  const { t1, t3, accent, border } = useApp()
  const { cardStyle, statCardStyle } = useMedicalStyles()
  const { pacientes, pacientesActivos, citasHoy, citasManana, complianceScore, incidentes, incidentesAbiertos, trainingsPendientes, auditLogs } = useMedical()

  return (
    <div>
      <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StaggerItem style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Active Patients</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: '#34D399' }}><AnimatedNumber value={pacientesActivos.length} /></div>
          <div style={{ fontSize: 10, color: t3 }}>{pacientes.length} total</div>
        </StaggerItem>
        <StaggerItem style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Appointments Today</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: '#60A5FA' }}><AnimatedNumber value={citasHoy.length} /></div>
          <div style={{ fontSize: 10, color: t3 }}>{citasManana.length} tomorrow</div>
        </StaggerItem>
        <StaggerItem style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Compliance Score</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: complianceScore >= 80 ? '#34D399' : complianceScore >= 60 ? '#FBB040' : '#F87171' }}><AnimatedNumber value={complianceScore} suffix="%" /></div>
          <div style={{ fontSize: 10, color: t3 }}>HIPAA compliance</div>
        </StaggerItem>
        <StaggerItem style={statCardStyle}>
          <div style={{ fontSize: 10, color: t3, fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.05em' }}>Open Incidents</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne', color: incidentesAbiertos.length > 0 ? '#F87171' : '#34D399' }}><AnimatedNumber value={incidentesAbiertos.length} /></div>
          <div style={{ fontSize: 10, color: t3 }}>{incidentes.length} total</div>
        </StaggerItem>
      </StaggerGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Today's Appointments
            <Badge color={accent}>{citasHoy.length}</Badge>
          </div>
          {citasHoy.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: t3, fontSize: 12 }}>No appointments today</div>
          ) : citasHoy.map(c => <TodayAppointmentItem key={c.id} cita={c} />)}
        </div>

        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            🛡️ HIPAA Alerts
            {(incidentesAbiertos.length > 0 || trainingsPendientes.length > 0) && <Badge color="#F87171">{incidentesAbiertos.length + trainingsPendientes.length} pending</Badge>}
          </div>
          {incidentesAbiertos.map(i => <IncidentAlertCard key={i.id} incidente={i} />)}
          {trainingsPendientes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t1, marginBottom: 8 }}>Pending Training</div>
              {trainingsPendientes.map(t => <PendingTrainingItem key={t.id} training={t} />)}
            </div>
          )}
          {incidentesAbiertos.length === 0 && trainingsPendientes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>All Clear — No HIPAA alerts</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 Recent PHI Activity
          <Badge color={accent}>Last 3h</Badge>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Time', 'User', 'Action', 'Patient', 'Details', 'Level'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{auditLogs.slice(0, 5).map(l => <RecentActivityRow key={l.id} log={l} />)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
