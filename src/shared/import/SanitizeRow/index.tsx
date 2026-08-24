import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

// Una fila del paso "Saneamiento" (paso 4): una anomalía que un normalizador del módulo marcó
// -mojibake, fecha futura, teléfono roto, lo que sea- con el valor crudo al lado del
// interpretado. `editable` decide si aparece el input de corrección (hay una celda puntual que
// corregir) o si la fila solo se puede excluir (una anomalía de fila entera, sin una celda a la
// que apuntar -ver `colIndex: null` en `SanitizeIssue`, de `@/shared/import`).
//
// El input de corrección arranca VACÍO (con el crudo como placeholder), no precargado con el
// crudo ni con lo interpretado: lo que se escribe ahí reemplaza la CELDA cruda -se vuelve a
// normalizar al re-armar el plan-, así que precargarlo con lo ya interpretado (una fecha ISO,
// un teléfono ya formateado) haría que el normalizador lo reinterprete como si fuera otro dato
// crudo distinto. Vacío dice "no toqué nada, se usa el crudo tal cual".
type Props = {
  rowIndex: number
  messageKey: I18nKey
  messageParams?: Record<string, string | number>
  crudo: string
  interpretado: string
  editable: boolean
  value: string
  excluded: boolean
  onEdit: (value: string) => void
  onToggleExclude: () => void
}

export default function SanitizeRow({
  rowIndex, messageKey, messageParams, crudo, interpretado, editable, value, excluded, onEdit, onToggleExclude,
}: Props) {
  const { t } = useT()
  return (
    <div className={excluded ? `${s.row} ${s.excluded}` : s.row}>
      <div className={s.info}>
        <span className={s.rowLabel}>{t('import.sanitize.rowLabel', { n: rowIndex + 1 })}</span>
        <span className={s.message}>{t(messageKey, messageParams)}</span>
      </div>
      <div className={s.compare}>
        <div className={s.raw}>{crudo || t('import.valueEmpty')}</div>
        <span className={s.arrow}>→</span>
        <div className={s.interpreted}>{interpretado || t('import.valueEmpty')}</div>
        {editable && (
          <input className={s.input} value={value} disabled={excluded} placeholder={t('import.sanitize.correctPlaceholder')}
            onChange={e => onEdit(e.target.value)} />
        )}
      </div>
      <label className={s.excludeLabel}>
        <input type="checkbox" checked={excluded} onChange={onToggleExclude} />
        {t('import.sanitize.exclude')}
      </label>
    </div>
  )
}
