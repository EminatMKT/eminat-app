'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import Badge from './Badge'
import CitaActionButton from './CitaActionButton'
import { ESTADO_CITA_COLORS } from '../constants'
import type { Cita } from '../types'

export default function AppointmentRow({ cita: c }: { cita: Cita }) {
  const { t1, t2, t3, accent, border } = useApp()
  const { t } = useT()
  const { updateCitaEstado } = useMedical()
  return (
    <tr style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: t2 }}>{c.fecha}</td>
      <td style={{ padding: '10px', fontWeight: 600, color: t1 }}>{c.hora}</td>
      <td style={{ padding: '10px', color: t1, fontWeight: 500 }}>{c.paciente_nombre}</td>
      <td style={{ padding: '10px' }}><Badge color={accent}>{c.tipo}</Badge></td>
      <td style={{ padding: '10px', color: t2, fontSize: 11 }}>{c.doctor}</td>
      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{c.sala}</td>
      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{c.duracion}min</td>
      <td style={{ padding: '10px' }}><Badge color={ESTADO_CITA_COLORS[c.estado] || accent}>{c.estado}</Badge></td>
      <td style={{ padding: '10px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {c.estado === 'programada' && (
            <>
              <CitaActionButton label={t('med.confirm')} color="#34D399" onClick={() => updateCitaEstado(c.id, 'confirmada')} />
              <CitaActionButton label={t('common.cancel')} color="#F87171" onClick={() => updateCitaEstado(c.id, 'cancelada')} />
            </>
          )}
          {c.estado === 'confirmada' && (
            <CitaActionButton label={t('med.start')} color={accent} onClick={() => updateCitaEstado(c.id, 'en_curso')} />
          )}
          {c.estado === 'en_curso' && (
            <CitaActionButton label={t('med.complete')} color="#34D399" onClick={() => updateCitaEstado(c.id, 'completada')} />
          )}
        </div>
      </td>
    </tr>
  )
}
