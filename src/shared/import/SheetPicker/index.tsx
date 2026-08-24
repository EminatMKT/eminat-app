import { useT } from '@/shared/i18n'
import s from './index.module.css'

// Paso 2 del import de un .xlsx: qué hoja del libro se está mapeando. El modal decide CUÁNDO
// se muestra (solo si el libro trae más de una hoja, ver `ImportModal`) — este componente solo
// dibuja el desplegable, no sabe cuántas hojas hacían falta para justificarlo.
type Props = {
  hojas: string[]
  value: string
  onChange: (hoja: string) => void
}

export default function SheetPicker({ hojas, value, onChange }: Props) {
  const { t } = useT()
  return (
    <div className={s.row}>
      <span className={s.label}>{t('import.sheetLabel')}</span>
      <select className={s.select} value={value} onChange={e => onChange(e.target.value)}>
        {hojas.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  )
}
