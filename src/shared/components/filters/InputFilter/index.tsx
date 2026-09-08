'use client'
import type { FilterKind } from '@/shared/utils'
import s from './index.module.css'

// centinela-exime: bloques-similares@3 — el candidato es `Field` de `ui/`, y no sirve: es un
// campo de formulario, con el rótulo ENCIMA, su asterisco de obligatorio y sus variantes de modal
// (`grande`, `crece`). Esto es una etiqueta AL LADO, en versalita, dentro de una barra de
// herramientas. Un cambio al diseño de los formularios no movería a ésta, que es la prueba.

// centinela-exime: familia-dispersa@2 — vive junto a `SelectFilter` en el directorio del motor;
// los otros `*Filter` pertenecen a su módulo. La excepción es `DepartmentFilter`, que sí es de
// esta familia y lo unifica la tarea 8 del plan de filtros, como `ChipFilter`.

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
// mientras el otro era un componente con su carpeta. Se extrajo el 04/09/2026, cuando la regla
// del `.map()` estrenó su detector y lo agarró.
//
// El rótulo va VISIBLE y no en el placeholder cuando es una fecha: el input date lo ignora y
// muestra dd/mm/aaaa, así que sin la etiqueta al lado no se sabe si es el desde o el hasta.
export default function InputFilter(props: Props) {
  const { kind, value, onChange, label, className } = props
  return (
    <label className={s.label}>
      {kind === 'date' && <span className={s.rotulo}>{label}</span>}
      <input type={kind} value={value} placeholder={label} className={className}
        onChange={e => onChange(e.target.value)} />
    </label>
  )
}
