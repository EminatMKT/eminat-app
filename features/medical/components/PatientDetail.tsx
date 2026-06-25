'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import Badge from './Badge'
import PatientApptRow from './PatientApptRow'
import { calcAge } from '../dates'
import type { Paciente } from '../types'

const COLS = ['med.colDate', 'med.colTime', 'med.colType', 'med.colDoctor', 'med.colRoom', 'med.colStatus'] as const

export default function PatientDetail({ paciente, onBack }: { paciente: Paciente; onBack: () => void }) {
  const { s2, t1, t2, t3, border } = useApp()
  const { t } = useT()
  const { citas } = useMedical()
  const { cardStyle, btnSecondary } = useMedicalStyles()
  const apptHistory = citas.filter(c => c.paciente_id === paciente.id)
  return (
    <div>
      <button onClick={onBack} style={{ ...btnSecondary, marginBottom: 16 }}>← {t('med.backToList')}</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Demographics */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('med.patientDetails')}
            <Badge color={paciente.estado === 'activo' ? '#34D399' : paciente.estado === 'alta' ? '#FBB040' : '#F87171'}>{paciente.estado}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            {([
              ['med.colMrn', paciente.mrn],
              ['med.detailName', `${paciente.nombre} ${paciente.apellido}`],
              ['med.dob', `${paciente.fecha_nacimiento} (${calcAge(paciente.fecha_nacimiento)} ${t('med.yearsSuffix')})`],
              ['med.gender', paciente.genero],
              ['med.phone', paciente.telefono],
              ['common.email', paciente.email],
              ['med.insurance', `${paciente.seguro} — ${paciente.seguro_id}`],
              ['med.address', paciente.direccion],
            ] as [I18nKey, string][]).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: t3, marginBottom: 2 }}>{t(label)}</div>
                <div style={{ color: t1, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Info */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>{t('med.clinicalInfo')}</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>{t('med.allergies')}</div>
            {paciente.alergias && paciente.alergias !== 'Ninguna' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {paciente.alergias.split(',').map(a => <Badge key={a.trim()} color="#F87171">{a.trim()}</Badge>)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#34D399' }}>{t('med.noKnownAllergies')}</div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>{t('med.conditions')}</div>
            {paciente.condiciones && paciente.condiciones !== 'Ninguna' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {paciente.condiciones.split(',').map(c => <Badge key={c.trim()} color="#FBB040">{c.trim()}</Badge>)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#34D399' }}>{t('med.noConditions')}</div>
            )}
          </div>
          {paciente.notas && (
            <div>
              <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>{t('common.notes')}</div>
              <div style={{ fontSize: 12, color: t2, padding: '8px 10px', borderRadius: 8, background: s2 }}>{paciente.notas}</div>
            </div>
          )}
        </div>

        {/* Appointment History */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>{t('med.apptHistory')}</div>
          {apptHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: t3, fontSize: 12 }}>{t('med.noApptsRecord')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {COLS.map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{apptHistory.map(c => <PatientApptRow key={c.id} cita={c} />)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
