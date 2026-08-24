'use client'
import { useT } from '@/shared/i18n'
import ContactoRow from '@/features/medical/components/ContactoRow'
import type { Paciente, PacienteContacto } from '@/features/medical/types'
import s from './index.module.css'

type Props = {
  paciente: Pick<Paciente, 'telefono' | 'email'>
  contactos: PacienteContacto[]
}

// Todo teléfono/email que se vio alguna vez para este paciente, agrupado por tipo y con el
// principal marcado. Sin esto, `paciente_contactos` guarda datos que nadie puede ver — y el
// objetivo de la tabla es justamente poder desambiguar una fusión mirando quién dijo qué.
export default function PacienteContactos({ paciente, contactos }: Props) {
  const { t } = useT()
  const telefonos = contactos.filter(c => c.tipo === 'telefono')
  const emails = contactos.filter(c => c.tipo === 'email')
  return (
    <div className={s.card}>
      <div className={s.title}>{t('med.contacts.title')}</div>
      {contactos.length === 0 ? (
        <div className={s.empty}>{t('med.contacts.empty')}</div>
      ) : (
        <div className={s.groups}>
          {telefonos.length > 0 && (
            <div>
              <div className={s.groupLabel}>{t('med.contacts.phones')}</div>
              {telefonos.map(c => (
                <ContactoRow key={c.id} valor={c.valor} fuente={c.fuente} principal={c.valor === paciente.telefono} />
              ))}
            </div>
          )}
          {emails.length > 0 && (
            <div>
              <div className={s.groupLabel}>{t('med.contacts.emails')}</div>
              {emails.map(c => (
                <ContactoRow key={c.id} valor={c.valor} fuente={c.fuente} principal={c.valor === paciente.email} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
