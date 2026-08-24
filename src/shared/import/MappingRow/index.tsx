import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

export type MappingFieldDef = {
  column: string
  labelKey: I18nKey
}

// Una fila del paso "Mapeo de columnas": el encabezado tal cual vino en el archivo, a la
// izquierda, y a la derecha el campo del destino al que se asigna (o "Ignorar").
type Props = {
  header: string
  value: string | null
  fieldDefs: MappingFieldDef[]
  onChange: (value: string | null) => void
}

export default function MappingRow({ header, value, fieldDefs, onChange }: Props) {
  const { t } = useT()
  return (
    <div className={s.row}>
      <div className={s.header}>{header}</div>
      <span className={s.arrow}>→</span>
      <select className={s.select} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">{t('import.ignore')}</option>
        {fieldDefs.map(f => <option key={f.column} value={f.column}>{t(f.labelKey)}</option>)}
      </select>
    </div>
  )
}
