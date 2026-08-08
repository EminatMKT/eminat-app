'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { I18nKey } from '@/shared/i18n'
import type { OrgRow } from '@/shared/context/loadAppData'

// Select de una FK a un catálogo organizacional (empresa, jornada, vinculación…).
// Las tres fichas de usuario lo usan igual: opción vacía = sin asignar, que se
// guarda como NULL. Evita repetir el mismo <select> por cada catálogo nuevo.
export default function CatalogSelect({ labelKey, value, rows, onChange }: {
  labelKey: I18nKey
  value: string | null
  rows: OrgRow[]
  onChange: (id: string | null) => void
}) {
  const { t3, inputStyle } = useApp()
  const { t } = useT()
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: t3, display: 'block', marginBottom: 5 }}>{t(labelKey)}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} style={inputStyle}>
        <option value="">{t('admin.org.none')}</option>
        {rows.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>
    </div>
  )
}
