'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useCobranzas } from './CobranzasContext'
import ModalShell from './ModalShell'

const TARGET_LABEL = { ventas: 'cob.targetSales', cuentas: 'cob.targetAccounts', depositos: 'cob.targetDeposits' } as const

export default function ImportModal() {
  const { border, t3, accent } = useApp()
  const { t } = useT()
  const { cobModalImport, setCobModalImport, cobTab, handleImportCSV } = useCobranzas()
  if (!cobModalImport) return null
  return (
    <ModalShell title={t('cob.importCsv')} onClose={() => setCobModalImport(false)}>
      <div style={{ fontSize: 12, color: t3, marginBottom: 16 }}>
        {t('cob.importingTo')} <strong style={{ color: accent }}>{t(TARGET_LABEL[cobTab])}</strong>
      </div>
      <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 12, color: t3, marginBottom: 12 }}>{t('cob.dragCsv')}</div>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportCSV} style={{ fontSize: 12 }} />
      </div>
      <div style={{ fontSize: 10, color: t3 }}>{t('cob.csvColumnsHint')}</div>
    </ModalShell>
  )
}
