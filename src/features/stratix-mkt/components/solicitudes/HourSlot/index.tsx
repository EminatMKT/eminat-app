import s from './index.module.css'

// Una hora de la agenda del día: libre u ocupada.
type Props = {
  hora: number
  ocupado: boolean
}

export default function HourSlot({ hora, ocupado }: Props) {
  return <div className={`${s.slot} ${ocupado ? s.ocupado : ''}`}>{hora}:00</div>
}
