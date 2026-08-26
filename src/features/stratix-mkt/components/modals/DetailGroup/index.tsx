import type { GrupoCampos } from '@/features/stratix-mkt/utils/act-detail-fields'
import s from './index.module.css'

// Un grupo de la ficha: su rótulo y sus pares dato/valor. Sin cajas — quince recuadros
// idénticos convierten la ficha en una tabla de propiedades donde todo pesa lo mismo.
type Props = {
  grupo: GrupoCampos
}

export default function DetailGroup({ grupo }: Props) {
  return (
    <section className={s.grupo}>
      <h3 className={s.titulo}>{grupo.titulo}</h3>
      <dl className={s.lista}>
        {grupo.campos.map(c => (
          <div key={c.label} className={s.fila}>
            <dt className={s.label}>{c.label}</dt>
            <dd className={c.vacio ? `${s.valor} ${s.vacio}` : s.valor}>{c.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
