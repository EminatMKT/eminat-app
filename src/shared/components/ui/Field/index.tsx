import type { ReactNode } from 'react'
import s from '@/shared/components/ui/Field/index.module.css'

// Un campo de formulario: su rótulo y su control. El asterisco de obligatorio lo pone el
// componente, así que no se escribe a mano en cada formulario ni se olvida en uno.
//
// `icon` va por prop y NO dentro de la clave de i18n. En Stratix los emojis viven adentro del
// texto —`"🎨 Marca / Área"`— y es el mismo problema que ya tuvo el "+" de los botones: el
// símbolo se escribe en cada idioma, se desincroniza entre pantallas y falta en unas sí y en
// otras no. Acá el texto es texto y el ícono es del componente.
type Props = {
  label: string
  /** Emoji que acompaña al rótulo. Decorativo: va con aria-hidden. */
  icon?: string
  required?: boolean
  grande?: boolean
  /** El control crece con su contenido en vez de esconder el principio. Para un título o una
   *  URL: se usa con un `<textarea rows={1}>`, que envuelve en vez de scrollear. */
  crece?: boolean
  children: ReactNode
}

export default function Field({ label, icon, required = false, grande = false, crece = false, children }: Props) {
  return (
    <label className={`${s.campo} ${grande ? s.grande : ''} ${crece ? s.crece : ''}`}>
      <span className={s.label}>
        {icon && <span aria-hidden="true">{icon} </span>}
        {label}{required && <span className={s.obligatorio}> *</span>}
      </span>
      {children}
    </label>
  )
}
