import { useT, type I18nKey } from '@/shared/i18n'
import s from './index.module.css'

// Una fila del grid de comparación de `MergeCandidateRow`: la etiqueta del campo a la
// izquierda y un valor por entidad (entrante + cada candidato) a la derecha, en las mismas
// columnas que arma el padre. `diff` la resalta cuando el valor no coincide entre entidades —
// es la "regla" que explica por qué la fila cayó en exactas o en parciales (ver ui.md, "lo
// que se ve tiene que poder explicarse solo").
type Props = {
  labelKey: I18nKey
  values: string[]
  diff: boolean
}

export default function MergeFieldRow({ labelKey, values, diff }: Props) {
  const { t } = useT()
  return (
    <>
      <div className={s.fieldLabel}>{t(labelKey)}</div>
      {values.map((v, i) => <div key={i} className={diff ? `${s.cell} ${s.diff}` : s.cell}>{v}</div>)}
    </>
  )
}
