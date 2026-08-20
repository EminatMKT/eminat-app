import s from './index.module.css'

// Un punto de la lista de fortalezas o debilidades de un competidor.
export default function PuntoLista({ texto, contra = false }: { texto: string; contra?: boolean }) {
  return (
    <div className={`${s.linea} ${contra ? s.contra : ''}`}>
      <span className={s.signo}>{contra ? '−' : '+'}</span> {texto}
    </div>
  )
}
