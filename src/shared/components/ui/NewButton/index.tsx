'use client'
import s from './index.module.css'

// Botón de alta de las vistas de administración (usuarios, roles, catálogos).
// El "+" lo pone el componente: vivía duplicado dentro de las claves i18n
// ("+ Nuevo usuario") y faltaba en otras, así que el símbolo se desincronizaba
// entre pantallas. Las claves ahora traen solo el texto.
type Props = {
  label: string
  onClick: () => void
}

export default function NewButton({ label, onClick }: Props) {
  return (
    <button type="button" className={s.boton} onClick={onClick}>
      + {label}
    </button>
  )
}
