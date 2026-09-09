'use client'
import { RANGE_SEP, type FilterKind } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import RangeEnd from './RangeEnd'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — el candidato es `Field` de `ui/`, y no sirve: es un
// campo de formulario, con el rótulo ENCIMA, su asterisco de obligatorio y sus variantes de modal
// (`grande`, `crece`). Esto es una etiqueta AL LADO, en versalita, dentro de una barra de
// herramientas. Un cambio al diseño de los formularios no movería a ésta, que es la prueba.

// centinela-exime: familia-dispersa@2 — vive junto a `SelectFilter` y `ChipFilter` en el
// directorio del motor; los otros `*Filter` pertenecen a su módulo. El único afuera es
// `tasks/report-filter.ts`, que no es un control sino un predicado, y lo trae la tarea 13.

// Los dos extremos se nombran igual en todos los rangos: el nombre de la COLUMNA lo pone el def
// —«Inicio», «Entrega», «Cargado»— y esto dice qué punta se está editando.
const RANGE_LABEL: [I18nKey, I18nKey] = ['common.rangeFrom', 'common.rangeTo']

type Props = {
  // Los kinds que SON un `<input>`. Excluidos por resta y no enumerados: así un control nuevo
  // del vocabulario —`chips` fue el primero— no entra acá de contrabando como `type="chips"`.
  kind: Exclude<FilterKind, 'select' | 'chips'>
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}

// El control de filtro que es un `<input>`: el hermano de `SelectFilter`. Los dos dibujan una
// forma del mismo vocabulario, pero éste vivía a mano adentro del `.map()` de `FilterBar`,
// mientras el otro era un componente con su carpeta.
export default function InputFilter(props: Props) {
  const { kind, value, onChange, label, className } = props
  if (kind === 'text') {
    return <input type="text" value={value} placeholder={label} className={className}
      onChange={e => onChange(e.target.value)} />
  }
  const [ini = '', fin = ''] = value.split(RANGE_SEP)
  // Los dos vacíos devuelven '' y no '..': para el motor eso es «este filtro no filtra».
  const emit = (a: string, b: string) => onChange(a || b ? `${a}${RANGE_SEP}${b}` : '')
  return (
    <span className={s.label}>
      <span className={s.rotulo}>{label}</span>
      <RangeEnd value={ini} max={fin || undefined} className={className}
        labelKey={RANGE_LABEL[0]} onChange={v => emit(v, fin)} />
      <span className={s.guion} aria-hidden>–</span>
      <RangeEnd value={fin} min={ini || undefined} className={className}
        labelKey={RANGE_LABEL[1]} onChange={v => emit(ini, v)} />
    </span>
  )
}

// El rango dibuja DOS inputs para UNA clave, y ésa es su razón de ser: partido en dos defs, el
// motor cuenta dos filtros activos donde el usuario ve una sola pregunta, y el «+ Filtro» ofrece
// esconder medio rango.
//
// El rótulo va VISIBLE en el rango y como placeholder en el texto: un `<input type="date">`
// ignora el placeholder y muestra dd/mm/aaaa, así que sin la etiqueta al lado no se sabe qué
// columna está pidiendo — y en un tablero de tareas hay más de una fecha por fila.
