import type { Datos } from '../index'
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

function topSection(datos: Datos, period: string): string {
  const heading = headerBlock(datos.origin)
  const row = buildMemberPeriodRow(datos.nombre, period, datos.t)
  const html = `${heading}${row}`
  return html
}

function taskSection(datos: Datos): string {
  const headers = buildTableHeaders(datos.t)
  const rows = buildTableRows(datos.acts, datos.nombrePorId)
  const html = tableSection(headers, rows)
  return html
}

function bottomSection(datos: Datos): string {
  const notice = emptyNotice(datos.acts, datos.t)
  const signature = signatureBlock(datos.nombre)
  const footer = reportFooter(datos.hoy, datos.t)
  const html = `${notice}${signature}${footer}`
  return html
}

export default function reportContent(datos: Datos, period: string, title: string): string {
  const parts = [topSection(datos, period), taskSection(datos), bottomSection(datos)]
  const content = parts.join(EMPTY_VALUE)
  const html = `${documentHead(title)}${content}</body></html>`
  return html
}

// Composes the tested report sections into a complete printable HTML document.
