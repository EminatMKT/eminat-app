'use client'
import { useT, type I18nKey } from '@/shared/i18n'

type Props = {
  value: string
  onChange: (value: string) => void
  labelKey: I18nKey
  className?: string
  // El otro extremo, que acota a éste: `max` en el «desde» y `min` en el «hasta».
  min?: string
  max?: string
}

/** Una punta del rango de fechas. */
export default function RangeEnd(props: Props) {
  const { value, onChange, labelKey, className, min, max } = props
  const { t } = useT()
  return (
    <input type="date" value={value} min={min} max={max} className={className}
      aria-label={t(labelKey)} onChange={e => onChange(e.target.value)} />
  )
}

// Los dos extremos son el MISMO input con otros datos, y escritos uno debajo del otro derivaban:
// el día que uno gane un `disabled` o un formato, el otro se queda atrás sin que nada falle.
//
// El rótulo va como `aria-label` y no visible: el nombre de la columna lo pone la barra una sola
// vez delante de los dos, y repetir «desde» y «hasta» convierte una fila de controles en un
// formulario. Quien no ve la pantalla igual escucha cuál punta está editando.
//
// El acotado es del navegador —`max` acá es el valor de allá y al revés—, así que el calendario
// abre con los días imposibles apagados en vez de dejar elegir uno y explicar después.
