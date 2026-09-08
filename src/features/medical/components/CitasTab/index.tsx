'use client'
import { useT, type I18nKey } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import { ChipFilter } from '@/shared/components/filters'
import { useMedical } from '../MedicalContext'
import AppointmentRow from '../AppointmentRow'
import s from './index.module.css'

// centinela-exime: familia-dispersa@2 — los `*Tab` son 27 en 12 directorios porque cada módulo
// tiene los suyos. Es la misma arquitectura que `*Module`: juntarlos sería deshacer
// `src/features/`.

// centinela-exime: bloques-similares@3 — el markup propio son la fila de filtros, la tarjeta y la
// tabla de la agenda. Busqué una tabla compartida y no hay: `UserTable`, `TaskTable` y
// `LeadsTable` son cada una las columnas de su dominio. El botón y las píldoras sí se unificaron.

const COLS: I18nKey[] = ['med.colDate', 'med.colTime', 'med.colPatient', 'med.colType', 'med.colDoctor', 'med.colRoom', 'med.colDuration', 'med.colStatus', 'med.colActions']

type Props = { onNewCita: () => void }

export default function CitasTab({ onNewCita }: Props) {
  const { t } = useT()
  const { citaFilters, filterCitaFecha, setFilterCitaFecha, filteredCitas, citas } = useMedical()
  const sorted = [...filteredCitas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))

  return (
    <div>
      <div className={s.filtros}>
        <ChipFilter def={citaFilters[0]} items={citas} value={filterCitaFecha} onChange={setFilterCitaFecha} />
        <span className={s.alta}><Button kind="new" label={t('med.newAppointment')} onClick={onNewCita} /></span>
      </div>

      <div className={s.tarjeta}>
        {sorted.length === 0 ? (
          <div className={s.vacio}><span>📅</span>{t('med.noAppointmentsPeriod')}</div>
        ) : (
          <table className={s.tabla}>
            <thead>
              <tr>{COLS.map(h => <th key={h}>{t(h)}</th>)}</tr>
            </thead>
            <tbody>{sorted.map(c => <AppointmentRow key={c.id} cita={c} />)}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// La agenda: el filtro por tramo, el alta y la tabla de citas del tramo elegido.
//
// El tramo ya no se dibuja acá. Eran cuatro `DateFilterChip` sobre una lista escrita en este
// archivo, con el predicado a mano en `useMedicalData`; ahora es un `FilterDef` con `kind:
// 'chips'` y las dos mitades salen del mismo lugar. El `<select>` que el motor dibujaría en un
// panel no serviría acá: son tres opciones, y verlas todas ES el control.
