'use client'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import Badge from './Badge'
import { calcAge } from '../dates'
import type { Paciente } from '../types'

export default function PatientRow({ paciente: p, onSelect }: { paciente: Paciente; onSelect: (p: Paciente) => void }) {
  const { t1, t2, t3, accent, border } = useApp()
  const { logAction } = useMedical()
  const { btnSecondary } = useMedicalStyles()
  return (
    <tr style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }} onClick={() => { onSelect(p); logAction('VIEW_PHI', 'patient_demographics', p.id, `${p.nombre} ${p.apellido}`, `Acceso a ficha del paciente ${p.mrn}`) }}>
      <td style={{ padding: '10px', fontFamily: 'DM Mono', fontSize: 10, color: accent }}>{p.mrn}</td>
      <td style={{ padding: '10px' }}>
        <div style={{ fontWeight: 600, color: t1 }}>{p.nombre} {p.apellido}</div>
        {p.alergias && p.alergias !== 'Ninguna' && <div style={{ fontSize: 9, color: '#F87171' }}>⚠️ Allergies: {p.alergias}</div>}
      </td>
      <td style={{ padding: '10px', color: t2 }}>{calcAge(p.fecha_nacimiento)}</td>
      <td style={{ padding: '10px', color: t2 }}>{p.genero}</td>
      <td style={{ padding: '10px', color: t2, fontSize: 11 }}>{p.seguro}</td>
      <td style={{ padding: '10px', color: t3, fontSize: 11 }}>{p.telefono}</td>
      <td style={{ padding: '10px' }}><Badge color={p.estado === 'activo' ? '#34D399' : p.estado === 'alta' ? '#FBB040' : '#F87171'}>{p.estado}</Badge></td>
      <td style={{ padding: '10px' }}>
        <button onClick={e => { e.stopPropagation(); onSelect(p) }} style={{ ...btnSecondary, fontSize: 10, padding: '4px 10px' }}>Ver</button>
      </td>
    </tr>
  )
}
