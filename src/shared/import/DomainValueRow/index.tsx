import { useT } from '@/shared/i18n'
import s from './index.module.css'

// Una fila del paso "Valores de dominio": el valor crudo tal cual vino en el archivo, y el
// canónico al que se resuelve (auto-adivinado o elegido a mano). `resolved=false` marca un
// valor que la auto-normalización no reconoció — se ve con el ⚠ y el select en ámbar.
type Props = {
  raw: string
  value: string
  resolved: boolean
  options: string[]
  onChange: (value: string) => void
}

export default function DomainValueRow({ raw, value, resolved, options, onChange }: Props) {
  const { t } = useT()
  return (
    <div className={s.row}>
      <div className={s.raw}>{raw}{!resolved && ' ⚠'}</div>
      <span className={s.arrow}>→</span>
      <select className={value ? s.select : `${s.select} ${s.unresolved}`} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{t('import.valueEmpty')}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
