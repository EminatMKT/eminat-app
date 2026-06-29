'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import DateFilterChip from './DateFilterChip'
import AppointmentRow from './AppointmentRow'

const DATE_FILTERS = [
  { id: 'hoy', labelKey: 'med.filterToday' },
  { id: 'manana', labelKey: 'med.filterTomorrow' },
  { id: 'semana', labelKey: 'med.filterWeek' },
  { id: 'todas', labelKey: 'common.all' },
] as const

const COLS = ['med.colDate', 'med.colTime', 'med.colPatient', 'med.colType', 'med.colDoctor', 'med.colRoom', 'med.colDuration', 'med.colStatus', 'med.colActions'] as const

export default function CitasTab({ onNewCita }: { onNewCita: () => void }) {
  const { t3, border } = useApp()
  const { t } = useT()
  const { filterCitaFecha, setFilterCitaFecha, filteredCitas } = useMedical()
  const { cardStyle, btnPrimary } = useMedicalStyles()
  const sorted = [...filteredCitas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {DATE_FILTERS.map(f => <DateFilterChip key={f.id} label={t(f.labelKey)} active={filterCitaFecha === f.id} onClick={() => setFilterCitaFecha(f.id)} />)}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onNewCita} style={btnPrimary}>{t('med.newAppointmentBtn')}</button>
      </div>

      <div style={cardStyle}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: t3 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13 }}>{t('med.noAppointmentsPeriod')}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {COLS.map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t(h)}</th>
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
