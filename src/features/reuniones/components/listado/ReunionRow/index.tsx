'use client'
import { ColorBadge } from '@/shared/components/ui'
import { fechaCorta, horaCorta } from '@/shared/utils'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import type { Reunion } from '@/features/reuniones/types'
import { ESTADO_REUNION, MODALIDAD } from '@/features/reuniones/constants'
import s from './index.module.css'

// centinela-exime: bloques-similares@2 — leí `ls src/shared/components/ui` entero (20) más
// dashboard/ y shell/. Lo más cerca: MemberCard (Directorio) y UserRow (Admin), y las dos traen
// su dominio adentro —departamento, cargos, rol—, así que no es "agregarles un prop": habría que
// sacarles el dominio primero, que es otro trabajo. De ColorBadge SÍ salió la salida 2: no se
// escribió un chip nuevo, se reusa el que hay. Si aparece una segunda fila así, sube a shared.

type Props = {
  reunion: Reunion
}

// La fila NO es un <button>, y es a propósito: en la fase 1 no hay ficha que abrir —editar una
// reunión existente es la fase 2—, y un botón que no lleva a ningún lado es peor que una fila
// que no lo es: entra en el tab order y no hace nada. Cuando exista la ficha, esto pasa a
// <button> con su `onAbrir` y recupera el teclado de una (rules/ui.md).
export default function ReunionRow({ reunion }: Props) {
  const { colorMarca } = useApp()
  const { t, intlLocale } = useT()
  const { codigo, empresa, titulo, fecha, hora_inicio, modalidad, estado } = reunion

  return (
    <li className={s.fila} style={{ '--marca': colorMarca[empresa] ?? 'var(--c-t3)' }}>
      <span className={s.marca} aria-hidden="true" />
      <span className={s.centro}>
        <span className={s.titulo}>{titulo}</span>
        <span className={s.meta}>
          {codigo && <code className={s.codigo}>{codigo}</code>}
          <span>{fechaCorta(fecha, intlLocale)}</span>
          {hora_inicio && <span>{horaCorta(hora_inicio, intlLocale)}</span>}
          <span>{MODALIDAD.label(modalidad, t)}</span>
        </span>
      </span>
      <ColorBadge color={ESTADO_REUNION.colores[estado]}>{ESTADO_REUNION.label(estado, t)}</ColorBadge>
    </li>
  )
}
