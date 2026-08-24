'use client'
import { useT } from '@/shared/i18n'
import ContactoRow from '@/features/medical/components/ContactoRow'
import type { FuentePaciente } from '@/features/medical/constants'
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
  // Agrupado POR VALOR, no por fila: el mismo número traído por dos sistemas es UN teléfono con
  // dos procedencias. Sin agrupar, el número aparecía dos veces y -peor- las dos marcadas como
  // «Principal», porque la marca compara por valor. Principal es propiedad del valor, no del par
  // (valor, fuente).
  const porValor = (tipo: PacienteContacto['tipo']) => {
    const orden: string[] = []
    const mapa = new Map<string, FuentePaciente[]>()
    for (const c of contactos) {
      if (c.tipo !== tipo) continue
      if (!mapa.has(c.valor)) { mapa.set(c.valor, []); orden.push(c.valor) }
      const fs = mapa.get(c.valor)!
      if (!fs.includes(c.fuente)) fs.push(c.fuente)
    }
    return orden.map(valor => ({ valor, fuentes: mapa.get(valor)! }))
  }
  const telefonos = porValor('telefono')
  const emails = porValor('email')
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
                <ContactoRow key={c.valor} valor={c.valor} fuentes={c.fuentes} principal={c.valor === paciente.telefono} />
              ))}
            </div>
          )}
          {emails.length > 0 && (
            <div>
              <div className={s.groupLabel}>{t('med.contacts.emails')}</div>
              {emails.map(c => (
                <ContactoRow key={c.valor} valor={c.valor} fuentes={c.fuentes} principal={c.valor === paciente.email} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
