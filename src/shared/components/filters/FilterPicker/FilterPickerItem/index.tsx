'use client'
import s from './index.module.css'

type Props = {
  label: string
  /** Marcado cuando el filtro SE VE. Lo que se guarda es lo contrario —la lista de ocultos— y
   *  esa asimetría es deliberada: ver `visibleDefs`. */
  visible: boolean
  onAlternar: () => void
}

// Una fila del menú de «+ Filtro». Es un componente y no markup adentro del `.map()` del padre
// porque tiene estilos propios, y ahí es donde empiezan a enredarse con los del contenedor.
export default function FilterPickerItem({ label, visible, onAlternar }: Props) {
  return (
    <label className={s.item}>
      <input type="checkbox" checked={visible} onChange={onAlternar} />
      {label}
    </label>
  )
}
