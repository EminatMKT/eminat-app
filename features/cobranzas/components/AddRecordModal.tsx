'use client'
import { useApp } from '@/shared/context/AppContext'
import { useCobranzas } from './CobranzasContext'
import ModalShell from './ModalShell'
import AddRecordField from './AddRecordField'

export default function AddRecordModal() {
  const { border, t2, accent } = useApp()
  const { cobModalAdd, setCobModalAdd, addFields, isNumericField, cobNewRecord, setCobNewRecord, handleAddRecord } = useCobranzas()
  if (!cobModalAdd) return null
  return (
    <ModalShell title="Add record" onClose={() => setCobModalAdd(false)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {addFields.map(field => (
          <AddRecordField key={field} field={field} numeric={isNumericField(field)}
            value={String(cobNewRecord[field] ?? '')}
            onChange={v => setCobNewRecord(p => ({ ...p, [field]: v }))} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setCobModalAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleAddRecord} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
      </div>
    </ModalShell>
  )
}
