'use client'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import DateFilterChip from './DateFilterChip'
import AppointmentRow from './AppointmentRow'

const DATE_FILTERS = [
  { id: 'hoy', label: 'Today' },
  { id: 'manana', label: 'Tomorrow' },
  { id: 'semana', label: 'Week' },
  { id: 'todas', label: 'All' },
]

export default function CitasTab({ onNewCita }: { onNewCita: () => void }) {
  const { t3, border } = useApp()
  const { filterCitaFecha, setFilterCitaFecha, filteredCitas } = useMedical()
  const { cardStyle, btnPrimary } = useMedicalStyles()
  const sorted = [...filteredCitas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {DATE_FILTERS.map(f => <DateFilterChip key={f.id} label={f.label} active={filterCitaFecha === f.id} onClick={() => setFilterCitaFecha(f.id)} />)}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onNewCita} style={btnPrimary}>+ New Appointment</button>
      </div>

      <div style={cardStyle}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: t3 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13 }}>No appointments for this period</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Date', 'Time', 'Patient', 'Type', 'Doctor', 'Room', 'Duration', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{sorted.map(c => <AppointmentRow key={c.id} cita={c} />)}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
