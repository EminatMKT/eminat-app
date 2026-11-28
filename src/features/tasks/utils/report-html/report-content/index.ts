import type { Datos } from '../types'
import headerBlock from '../header-block'
import buildMemberPeriodRow from '../member-period-row'
import buildTableHeaders from '../table-headers'
import buildTableRows from '../table-rows'
import tableSection from '../table-section'
import emptyNotice from '../empty-notice'
import signatureBlock from '../signature-block'
import reportFooter from '../report-footer'
import documentHead from '../document-head'
import { EMPTY_VALUE } from './constants'

function topSection(
  { origin, nombre, t }: Pick<Datos, 'origin' | 'nombre' | 't'>,
  period: string,
): string {
  const heading = headerBlock(origin, t)
  const row = buildMemberPeriodRow(nombre, period, t)
  const html = `${heading}${row}`

  return html
}

function taskSection({ t, acts, nombrePorId }: Pick<Datos, 't' | 'acts' | 'nombrePorId'>): string {
  const headers = buildTableHeaders(t)
  const rows = buildTableRows(acts, nombrePorId)
  const html = tableSection(headers, rows)

  return html
}

function bottomSection(
  { acts, t, nombre }: Pick<Datos, 'acts' | 't' | 'nombre'>,
  hoy: Date,
): string {
  const notice = emptyNotice(acts, t)
  const signature = signatureBlock(nombre)
  const footer = reportFooter(hoy, t)
  const html = `${notice}${signature}${footer}`

  return html
}

export default function reportContent(datos: Datos, period: string, title: string): string {
  const parts = [topSection(datos, period), taskSection(datos), bottomSection(datos, datos.hoy)]
  const content = parts.join(EMPTY_VALUE)
  const html = `${documentHead(title)}${content}</body></html>`

  return html
}

// Composes the tested report sections into a complete printable HTML document.
