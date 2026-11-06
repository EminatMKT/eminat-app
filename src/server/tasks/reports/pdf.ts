import { periodoLargo } from '@/features/tasks/utils/periodo'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { STRATIX_LOGO_SVG } from '@/features/tasks/utils/report-html/logo'
import type { ReportData } from './read'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from '@/features/tasks/utils/report-html/disclaimer'

// This receives an authorized operational report, never a task table or user-supplied export payload.
export async function productionReportPdf(report: ReportData) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const width = 595.28, height = 841.89, margin = 38
  let page: PDFPage, y = 0
  // Reject unsupported text rather than silently altering legitimate work descriptions.
  const safe = (text: string) => { font.encodeText(text.replace(/[\r\n]/g, '')); return text }
  function lines(text: string, available: number, size: number, face: PDFFont = font): string[] {
    const output: string[] = []
    for (const paragraph of safe(text).split(/\r?\n/)) {
      let line = ''
      for (const char of paragraph) {
        if (line && face.widthOfTextAtSize(line + char, size) > available) { output.push(line); line = '' }
        line += char
      }
      output.push(line)
    }
    return output
  }
  function draw(text: string, x: number, top: number, size = 10, face = font) {
    page.drawText(safe(text), { x, y: top, size, font: face, color: rgb(.12,.14,.2) })
  }
  function newPage(first = false) {
    page = doc.addPage([width, height]); y = height - margin
    if (first) {
      const scale = 1
      for (const match of Array.from(STRATIX_LOGO_SVG.matchAll(/<path\s+d="([^"]+)"/g))) {
        page.drawSvgPath(match[1], { x: margin, y, scale, color: rgb(0,0,0) })
      }
      // This circle is part of the supplied SVG, in its original color and coordinates.
      page.drawCircle({ x: margin + 171.17 * scale, y: y - 34.67 * scale, size: 4.78 * scale, color: rgb(80/255,70/255,229/255) })
      y -= 80
      draw(PRODUCTION_REPORT_SLOGAN, margin, y, 14, bold); y -= 21
      for (const line of lines(PRODUCTION_REPORT_DISCLAIMER, width - 2 * margin, 10)) { draw(line, margin, y); y -= 14 }
      y -= 15
      draw(report.name, margin, y, 14, bold); y -= 20
      draw(`Período: ${periodoLargo(`${report.month}-01`, 'es-EC')}`, margin, y); y -= 30
    }
    page.drawLine({ start: { x: margin, y: 33 }, end: { x: width - margin, y: 33 }, color: rgb(.85,.86,.9), thickness: .5 })
  }
  newPage(true)
  if (report.metrics) {
    const m = report.metrics
    draw(`Tareas totales: ${m.totalTasks}   Completadas: ${m.completedTasks}   Horas: ${m.totalHours}   Avance: ${m.completionRate}%`, margin, y, 10, bold)
    y -= 18
    draw(`Días de producción: ${m.productionDays ?? 0}`, margin, y, 10, bold); y -= 28
  }
  if (!report.tasks.length) { draw('Sin tareas en este período', margin, y); y -= 20 }
  for (const task of report.tasks) {
    const heading = lines(task.titulo || '', width - 2 * margin, 11, bold)
    const description = lines(task.descripcion || '', width - 2 * margin, 10)
    const items = [
      ...heading.map(text => ({ text, face: bold, size: 11 })),
      ...description.filter(Boolean).map(text => ({ text, face: font, size: 10 })),
      ...lines(`Responsables: ${(task.assignedEmployees ?? []).map(person => person.name).join(', ') || '—'}`, width - 2 * margin, 9).map(text => ({ text, face: font, size: 9 })),
      { text: `Estado: ${task.estado || '—'}`, face: font, size: 9 },
      ...(report.metrics ? [{ text: `Horas: ${task.horas ?? 0}  |  Días de producción: ${task.dias_produccion ?? 0}`, face: font, size: 9 }] : []),
      { text: `${task.empresa || '—'}  |  Inicio: ${task.fecha_inicio || '—'}  |  Entrega: ${task.fecha_entrega || '—'}`, face: font, size: 9 },
    ]
    for (const item of items) {
      if (y < 65) newPage()
      draw(item.text, margin, y, item.size, item.face); y -= 16
    }
    y -= 12
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, color: rgb(.9,.91,.93), thickness: .5 })
    y -= 16
  }
  // Keep both signature blocks together after the final task, including long reports.
  const blockWidth = (width - 2 * margin - 60) / 2
  const signatures = [
    { name: report.name, role: 'Miembro del equipo' },
    { name: 'Freddy Crespín', role: 'Marketing Director — Approved by' },
  ].map(signature => ({ name: lines(signature.name, blockWidth, 12, bold), role: lines(signature.role, blockWidth, 10) }))
  const signatureHeight = Math.max(...signatures.map(signature => signature.name.length * 16 + signature.role.length * 14)) + 48
  if (y - signatureHeight < 50) newPage()
  y -= 40
  signatures.forEach((signature, index) => {
    const x = margin + index * (blockWidth + 60)
    page.drawLine({ start: { x, y }, end: { x: x + blockWidth, y }, color: rgb(.2,.2,.2), thickness: .7 })
    let top = y - 22
    for (const text of signature.name) { draw(text, x + (blockWidth - bold.widthOfTextAtSize(text, 12)) / 2, top, 12, bold); top -= 16 }
    for (const text of signature.role) { draw(text, x + (blockWidth - font.widthOfTextAtSize(text, 10)) / 2, top, 10); top -= 14 }
  })
  doc.getPages().forEach((sheet, index) => {
    sheet.drawText(`LILLY  |  ${index + 1} / ${doc.getPageCount()}`, { x: margin, y: 20, size: 8, font, color: rgb(.5,.5,.55) })
  })
  return doc.save()
}
