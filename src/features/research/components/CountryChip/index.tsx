// ponytail: componente oculto por pedido de dirección (reunión 2026-07-20). No borrar — restaurar
// descomentando este archivo y su uso en DashboardTab ("Leads by Country"). Ver .todo Q1.
//
// Migrado a `ColorBadge` el 04/09/2026 sin descomentarlo: era una etiqueta que se LEE dibujada
// con la misma forma que los chips que se eligen, así que la app prometía interacción donde no
// la hay. Restaurarlo sigue siendo una decisión de dirección, no de refactor.
// centinela-exime: familia-dispersa@2 — está comentado desde el 20/07/2026 por decisión de
// dirección. Migrarlo a `ColorBadge` fue el paso que esta regla pide; mudarlo de módulo sería
// restaurarlo por la puerta de atrás.
/*
import { RESEARCH_THEME } from '@/features/research/theme'
import { COUNTRY_FLAGS } from '@/features/research/constants'
import { ColorBadge } from '@/shared/components/ui'

type Props = {
  country: string
  count: number
}

export default function CountryChip(props: Props) {
  const { country, count } = props
  return (
    <ColorBadge color={RESEARCH_THEME.accent}>
      {COUNTRY_FLAGS[country] || '🌍'} {country} · {count}
    </ColorBadge>
  )
}
*/
