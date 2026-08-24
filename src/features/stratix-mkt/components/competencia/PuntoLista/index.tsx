import s from './index.module.css'

// Un punto de la lista de fortalezas o debilidades de un competidor.
type Props = {
  texto: string
  contra?: boolean
}

export default function PuntoLista({ texto, contra = false }: Props) {
  return (
    <div className={`${s.linea} ${contra ? s.contra : ''}`}>
      <span className={s.signo}>{contra ? '−' : '+'}</span> {texto}
    </div>
  )
}
