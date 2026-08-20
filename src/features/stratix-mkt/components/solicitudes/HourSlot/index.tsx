import s from './index.module.css'

// Una hora de la agenda del día: libre u ocupada.
export default function HourSlot({ hora, ocupado }: { hora: number; ocupado: boolean }) {
  return <div className={`${s.slot} ${ocupado ? s.ocupado : ''}`}>{hora}:00</div>
}
