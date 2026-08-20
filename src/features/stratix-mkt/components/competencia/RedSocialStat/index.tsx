import s from './index.module.css'

// Seguidores de un competidor en una red. Se repetía tres veces escrito a mano.
export default function RedSocialStat({ red, valor, extra }: { red: string; valor: string; extra?: string }) {
  return (
    <div className={s.box}>
      <div className={s.red}>{red}</div>
      <div className={s.valor}>{valor}</div>
      {extra && <div className={s.extra}>{extra}</div>}
    </div>
  )
}
