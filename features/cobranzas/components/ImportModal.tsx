'use client'
import { useApp } from '@/shared/context/AppContext'
import { useCobranzas } from './CobranzasContext'
import ModalShell from './ModalShell'

const TARGET_LABEL = { ventas: 'Sales', cuentas: 'Accounts Receivable', depositos: 'Deposits' } as const

export default function ImportModal() {
  const { border, t3, accent } = useApp()
  const { cobModalImport, setCobModalImport, cobTab, handleImportCSV } = useCobranzas()
  if (!cobModalImport) return null
  return (
    <ModalShell title="Import CSV" onClose={() => setCobModalImport(false)}>
      <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>
        Importing to: <strong style={{ color: accent }}>{TARGET_LABEL[cobTab]}</strong>
      </div>
      <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>Drag a CSV file or click to select</div>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCSV} style={{ fontSize: 12 }} />
      </div>
      <div style={{ fontSize: 10, color: t3 }}>CSV columns must match the table fields.</div>
    </ModalShell>
  )
}
