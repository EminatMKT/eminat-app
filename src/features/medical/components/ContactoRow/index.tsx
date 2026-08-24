'use client'
import { useT } from '@/shared/i18n'
import { fuenteLabel, type FuentePaciente } from '@/features/medical/constants'
import s from './index.module.css'

type Props = {
  valor: string
  fuente: FuentePaciente
  // El principal es el que quedó en `pacientes.telefono`/`email` — el que se usa para listar y
  // buscar. Los demás son evidencia: otro sistema, u otra edición manual, vieron otro valor.
  principal: boolean
}

// Una fila de `paciente_contactos`. Muestra el valor y DE QUÉ SISTEMA VINO — la procedencia es
// el punto de esta tabla, no un adorno: dos fuentes coincidiendo en el mismo teléfono es la
// evidencia de que una fusión de pacientes estuvo bien hecha.
export default function ContactoRow({ valor, fuente, principal }: Props) {
  const { t } = useT()
  return (
    <div className={s.row}>
      <span className={s.valor}>{valor}</span>
      <span className={s.meta}>
        {principal && <span className={s.principal}>{t('med.contacts.principal')}</span>}
        <span className={s.fuente}>{fuenteLabel(fuente, t)}</span>
      </span>
    </div>
  )
}
