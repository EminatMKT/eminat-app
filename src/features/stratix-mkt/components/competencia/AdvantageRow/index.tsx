import s from './index.module.css'

type Advantage = { icon: string; title: string; desc: string }

type Props = {
  v: Advantage
}

export default function AdvantageRow({ v }: Props) {
  return (
    <div className={s.fila}>
      <span className={s.icono}>{v.icon}</span>
      <div>
        <div className={s.titulo}>{v.title}</div>
        <div className={s.desc}>{v.desc}</div>
      </div>
    </div>
  )
}
