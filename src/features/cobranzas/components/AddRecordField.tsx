'use client'
import { useApp } from '@/shared/context/AppContext'

export default function AddRecordField({ field, value, numeric, onChange }: { field: string; value: string; numeric: boolean; onChange: (v: string) => void }) {
  const { t3, inputStyle } = useApp()
  const label = field.replace(/_/g, ' ')
  return (
    <div>
      <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5, textTransform: 'capitalize' }}>{label}</label>
      <input type={numeric ? 'number' : 'text'} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} placeholder={label} />
    </div>
  )
}
