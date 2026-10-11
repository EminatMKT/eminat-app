export type ReportPerson = {
  name: string
  role: string | null
  organization: string | null
  signature?: string | null
}

export type ReportTask = {
  id: string
  title: string
  description: string | null
  responsible: string | null
  team: string | null
  department: string | null
  dueDate: string | null
  status: string
}

export interface MeetingReportData {
  locale?: 'es' | 'en'
  id: string
  generatedAt: string
  title: string
  company: string | null
  organization: string | null
  location: string | null
  modality: string | null
  meetingType: string | null
  date: string
  startTime: string | null
  endTime: string | null
  duration: string
  objective: string | null
  invitees: ReportPerson[]
  attendees: ReportPerson[]
  absentees: ReportPerson[]
  externalGuests: ReportPerson[]
  tasks: ReportTask[]
  nextMeeting: string | null
  sections: { title: string; items: { title: string; description: string | null }[] }[]
}

const missing = 'No registrado'
const reportCopy = {
  es: { minutes: 'ACTA DE REUNION', code: 'Codigo', generated: 'Generado', info: 'INFORMACION DE LA REUNION', invitees: 'CONVOCADOS', attendees: 'ASISTENTES', absentees: 'AUSENTES', external: 'INVITADOS EXTERNOS', objective: 'OBJETIVO', tasks: 'TASKS', details: 'DETALLES', next: 'PROXIMA REUNION', absent: 'Ausente', attended: 'Asistio', empty: 'Sin registros', noDate: 'Sin fecha', noneExternal: 'Sin invitados externos', noneTasks: 'Sin Tasks vinculadas', notRegistered: 'No registrado' },
  en: { minutes: 'MEETING MINUTES', code: 'Meeting ID', generated: 'Generated', info: 'MEETING INFORMATION', invitees: 'INVITEES', attendees: 'ATTENDEES', absentees: 'ABSENTEES', external: 'EXTERNAL GUESTS', objective: 'OBJECTIVE', tasks: 'TASKS', details: 'DETAILS', next: 'NEXT MEETING', absent: 'Absent', attended: 'Attended', empty: 'No entries', noDate: 'No due date', noneExternal: 'No external guests', noneTasks: 'No linked Tasks', notRegistered: 'Not available' },
} as const
const normalize = (value: string) => value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '')
const escapePdf = (value: string) => normalize(value).replace(/([\\()])/g, '\\$1')

function wrap(value: string, width = 88): string[] {
  const words = normalize(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line)
      line = word
    } else line = `${line} ${word}`.trim()
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['-']
}

const personLine = (person: ReportPerson, status?: string) =>
  [person.name, person.role ?? missing, person.organization ?? missing, status].filter(Boolean).join(' | ')

const personKey = (value: string) => normalize(value).trim().toLowerCase().replace(/\s+/g, ' ')

export function classifyAttendance(invitees: ReportPerson[], attendeeNames: string[]) {
  const attendeeKeys = new Set(attendeeNames.map(personKey))
  const inviteeKeys = new Set(invitees.map((person) => personKey(person.name)))
  const attendees = invitees.filter((person) => attendeeKeys.has(personKey(person.name)))
  const externalGuests = attendeeNames
    .filter((name) => !inviteeKeys.has(personKey(name)))
    .map((name) => ({ name, role: null, organization: null }))
  return {
    attendees,
    absentees: invitees.filter((person) => !attendeeKeys.has(personKey(person.name))),
    externalGuests,
  }
}

export function meetingDuration(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return missing
  const [startHours, startMinutes] = startTime.slice(0, 5).split(':').map(Number)
  const [endHours, endMinutes] = endTime.slice(0, 5).split(':').map(Number)
  const minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
  if (!Number.isFinite(minutes) || minutes < 0) return missing
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder} min`
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

export function meetingReportLines(report: MeetingReportData): string[] {
  const copy = reportCopy[report.locale ?? 'es']
  const lines = [
    'STRATIX MEET', copy.minutes, `${copy.code}: ${report.id}`, `${copy.generated}: ${report.generatedAt}`, '',
    `1. ${copy.info}`, `Empresa: ${report.company ?? copy.notRegistered}`,
    `Organismo: ${report.organization ?? missing}`, `Lugar: ${report.location ?? missing}`,
    `Modalidad: ${report.modality ?? missing}`, `Tipo de reunion: ${report.meetingType ?? missing}`,
    `Fecha: ${report.date}`, `Hora de inicio: ${report.startTime ?? missing}`,
    `Hora de finalizacion: ${report.endTime ?? missing}`, `Duracion: ${report.duration}`, '',
    `2. ${copy.invitees}`,
    ...(report.invitees.length ? report.invitees.map((person) => personLine(person)) : ['Sin convocados registrados']),
    '', `3. ${copy.attendees}`,
    ...(report.attendees.length ? report.attendees.map((person) => personLine(person, copy.attended)) : [copy.empty]),
    '', `4. ${copy.absentees}`,
    ...(report.absentees.length ? report.absentees.map((person) => personLine(person, copy.absent)) : [copy.empty]),
    '', `5. ${copy.external}`,
    ...(report.externalGuests.length ? report.externalGuests.map((person) => personLine(person, copy.attended)) : [copy.noneExternal]),
    '', `6. ${copy.objective}`, ...wrap(report.objective ?? copy.notRegistered),
  ]
  report.sections.slice(0, 2).forEach((section, sectionIndex) => {
    lines.push('', `${sectionIndex + 7}. ${section.title.toUpperCase()}`)
    if (!section.items.length) lines.push('Sin registros')
    section.items.forEach((item, index) => {
      lines.push(...wrap(`${index + 1}. ${item.title}`))
      if (item.description) lines.push(...wrap(item.description))
    })
  })
  lines.push('', `9. ${copy.tasks}`)
  if (!report.tasks.length) lines.push(copy.noneTasks)
  report.tasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task.title} | ${task.responsible ?? copy.notRegistered} | ${task.team ?? copy.notRegistered} | ${task.department ?? copy.notRegistered} | ${task.dueDate ?? copy.noDate} | ${task.status}`)
    if (task.description) lines.push(...wrap(task.description))
  })
  const details = report.sections[2]
  lines.push('', `10. ${copy.details}`)
  if (!details?.items.length) lines.push('Sin registros')
  details?.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`)
    if (item.description) lines.push(...wrap(item.description))
  })
  lines.push('', `11. ${copy.next}`, report.nextMeeting ?? copy.notRegistered)
  return lines
}

type PdfPage = { commands: string[] }

export function createMeetingPdf(report: MeetingReportData): Uint8Array {
  const copy = reportCopy[report.locale ?? 'es']
  const pages: PdfPage[] = []
  let page: PdfPage
  let y = 0
  const darkGreen = '0.020 0.180 0.086'
  const brand = '0.086 0.639 0.290'
  const lightGreen = '0.863 0.984 0.906'
  const pale = '0.941 0.992 0.957'
  const gray = '0.36 0.40 0.46'
  const border = '0.82 0.85 0.89'
  const rect = (x: number, top: number, width: number, height: number, color: string, stroke?: string) => {
    page.commands.push(`${color} rg ${x} ${top - height} ${width} ${height} re f`)
    if (stroke) page.commands.push(`${stroke} RG 0.6 w ${x} ${top - height} ${width} ${height} re S`)
  }
  const text = (value: string, x: number, top: number, size = 9, bold = false, color = '0.12 0.15 0.20') => {
    page.commands.push(`${color} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${top} Td (${escapePdf(value)}) Tj ET`)
  }
  const footer = () => {
    page.commands.push(`${border} RG 0.5 w 40 35 m 555 35 l S`)
    text('Documento generado por Stratix Meet', 40, 20, 7, false, gray)
    text(`Pagina ${pages.length}`, 505, 20, 7, false, gray)
  }
  const newPage = () => {
    if (pages.length) footer()
    page = { commands: [] }
    pages.push(page)
    rect(0, 842, 595, 82, darkGreen)
    rect(430, 842, 165, 82, '0.063 0.420 0.196')
    rect(520, 842, 75, 82, brand)
    text('STRATIX MEET', 40, 808, 11, true, '1 1 1')
    text(copy.minutes, 40, 781, 20, true, '1 1 1')
    text(`${copy.code}: ${report.id}`, 350, 805, 8, false, '1 1 1')
    text(`${copy.generated}: ${report.generatedAt}`, 350, 787, 8, false, '1 1 1')
    y = 738
  }
  const ensure = (height: number) => { if (y - height < 52) newPage() }
  const section = (number: number, title: string, firstContentHeight = 0) => {
    ensure(34 + firstContentHeight)
    rect(40, y, 515, 25, pale)
    rect(40, y, 5, 25, brand)
    text(`${number}. ${title}`, 54, y - 17, 10, true, darkGreen)
    y -= 37
  }
  const paragraph = (value: string, width = 94) => {
    const lines = wrap(value, width)
    ensure(lines.length * 13 + 8)
    lines.forEach((line) => { text(line, 46, y, 9); y -= 13 })
    y -= 7
  }
  const infoGrid = (items: [string, string][]) => {
    const columnWidth = 251
    for (let index = 0; index < items.length; index += 2) {
      ensure(39)
      items.slice(index, index + 2).forEach(([label, value], column) => {
        const x = 40 + column * 264
        rect(x, y, columnWidth, 34, '1 1 1', border)
        text(label.toUpperCase(), x + 9, y - 12, 6.5, true, gray)
        text(value, x + 9, y - 26, 9, false, darkGreen)
      })
      y -= 34
    }
    y -= 9
  }
  const table = (headers: string[], rows: string[][], widths: number[]) => {
    const drawRow = (cells: string[], header = false) => {
      const wrapped = cells.map((cell, index) => wrap(cell || missing, Math.max(8, Math.floor(widths[index] / 5.5))))
      const height = Math.max(...wrapped.map((lines) => lines.length)) * 12 + 12
      ensure(height + (header ? 0 : 4))
      let x = 40
      cells.forEach((_cell, index) => {
        rect(x, y, widths[index], height, header ? darkGreen : '1 1 1', border)
        wrapped[index].forEach((line, lineIndex) => text(line, x + 7, y - 15 - lineIndex * 12, header ? 7 : 8, header, header ? '1 1 1' : '0.12 0.15 0.20'))
        x += widths[index]
      })
      y -= height
    }
    // Mantiene el encabezado unido al primer registro para evitar tablas
    // huérfanas al final de una página.
    ensure(rows.length ? 76 : 48)
    drawRow(headers, true)
    if (!rows.length) drawRow(['Sin registros', ...headers.slice(1).map(() => '-')])
    else rows.forEach((row) => drawRow(row))
    y -= 12
  }
  const taskTable = (tasks: ReportTask[]) => {
    if (!tasks.length) {
      paragraph('Sin Tasks vinculadas')
      return
    }
    tasks.forEach((task, index) => {
      const titleLines = wrap(task.title, 58)
      const descriptionLines = wrap(task.description ?? (report.locale === 'en' ? 'No description' : 'Sin descripcion'), 92)
      const headerHeight = Math.max(30, titleLines.length * 11 + 14)
      const descriptionHeight = descriptionLines.length * 11 + 17
      ensure(headerHeight + 54 + descriptionHeight + 12)
      rect(40, y, 515, headerHeight, darkGreen, darkGreen)
      rect(40, y, 32, headerHeight, brand, darkGreen)
      text(String(index + 1), 52, y - 19, 11, true, '1 1 1')
      titleLines.forEach((line, lineIndex) => text(line, 82, y - 17 - lineIndex * 11, 9, true, '1 1 1'))
      text(task.status, 480, y - 19, 7, true, lightGreen)
      y -= headerHeight
      const meta = [
        [report.locale === 'en' ? 'ASSIGNEE' : 'RESPONSABLE', task.responsible ?? copy.notRegistered, 145],
        [report.locale === 'en' ? 'TEAM' : 'EQUIPO', task.team ?? copy.notRegistered, 115],
        [report.locale === 'en' ? 'DEPARTMENT' : 'DEPARTAMENTO', task.department ?? copy.notRegistered, 135],
        [report.locale === 'en' ? 'DUE DATE' : 'ENTREGA', task.dueDate ?? copy.noDate, 120],
      ] as const
      let x = 40
      meta.forEach(([label, value, width]) => {
        rect(x, y, width, 45, '1 1 1', border)
        text(label, x + 7, y - 12, 6, true, gray)
        wrap(value, Math.max(8, Math.floor(width / 5.5))).slice(0, 2).forEach((line, lineIndex) => text(line, x + 7, y - 27 - lineIndex * 10, 7.5, false, darkGreen))
        x += width
      })
      y -= 45
      rect(40, y, 515, descriptionHeight, pale, border)
      text(report.locale === 'en' ? 'DESCRIPTION' : 'DESCRIPCION', 47, y - 12, 6, true, gray)
      descriptionLines.forEach((line, lineIndex) => text(line, 47, y - 27 - lineIndex * 11, 8))
      y -= descriptionHeight + 12
    })
  }

  newPage()
  text(report.title, 40, y, 15, true, darkGreen)
  y -= 28
  section(1, copy.info)
  infoGrid(report.locale === 'en' ? [
    ['Company', report.company ?? copy.notRegistered], ['Organization', report.organization ?? copy.notRegistered],
    ['Location', report.location ?? copy.notRegistered], ['Format', report.modality ?? copy.notRegistered],
    ['Meeting type', report.meetingType ?? copy.notRegistered], ['Date', report.date],
    ['Start time', report.startTime ?? copy.notRegistered], ['End time', report.endTime ?? copy.notRegistered],
    ['Duration', report.duration], ['', ''],
  ] : [
    ['Empresa', report.company ?? copy.notRegistered], ['Organismo', report.organization ?? copy.notRegistered],
    ['Lugar', report.location ?? copy.notRegistered], ['Modalidad', report.modality ?? copy.notRegistered],
    ['Tipo de reunion', report.meetingType ?? copy.notRegistered], ['Fecha', report.date],
    ['Hora de inicio', report.startTime ?? copy.notRegistered], ['Hora de finalizacion', report.endTime ?? copy.notRegistered],
    ['Duracion', report.duration], ['', ''],
  ])
  section(2, copy.invitees)
  table(report.locale === 'en' ? ['Name', 'Title / role', 'Team / department'] : ['Nombre', 'Cargo / rol', 'Equipo / departamento'], report.invitees.map((person) => [person.name, person.role ?? copy.notRegistered, person.organization ?? copy.notRegistered]), [185, 145, 185])
  section(3, copy.attendees)
  const hasSignatures = [...report.attendees, ...report.absentees].some((person) => Boolean(person.signature))
  const attendanceWidths = hasSignatures ? [150, 115, 115, 70, 65] : [175, 135, 135, 70]
  const attendanceHeaders = report.locale === 'en'
    ? ['Name', 'Title / role', 'Team / department', 'Status', ...(hasSignatures ? ['Signature'] : [])]
    : ['Nombre', 'Cargo / rol', 'Equipo / departamento', 'Estado', ...(hasSignatures ? ['Firma'] : [])]
  const attendanceRows = (people: ReportPerson[], status: string) => people.map((person) => [person.name, person.role ?? missing, person.organization ?? missing, status, ...(hasSignatures ? [person.signature ?? '-'] : [])])
  table(attendanceHeaders, attendanceRows(report.attendees, copy.attended), attendanceWidths)
  section(4, copy.absentees)
  table(attendanceHeaders, attendanceRows(report.absentees, copy.absent), attendanceWidths)
  section(5, copy.external, 76)
  table(attendanceHeaders, attendanceRows(report.externalGuests, copy.attended), attendanceWidths)
  section(6, copy.objective, 42)
  paragraph(report.objective ?? missing)
  report.sections.slice(0, 2).forEach((group, groupIndex) => {
    section(groupIndex + 7, group.title.toUpperCase(), group.items.length ? 38 : 22)
    if (!group.items.length) paragraph('Sin registros')
    group.items.forEach((item, index) => {
      ensure(30)
      text(`${index + 1}. ${item.title}`, 46, y, 9, true, darkGreen); y -= 14
      if (item.description) paragraph(item.description, 90)
      else y -= 6
    })
  })
  section(9, copy.tasks, report.tasks.length ? 80 : 22)
  taskTable(report.tasks)
  const details = report.sections[2]
  section(10, copy.details, details?.items.length ? 38 : 22)
  if (!details?.items.length) paragraph('Sin registros')
  details?.items.forEach((item, index) => {
    ensure(30)
    text(`${index + 1}. ${item.title}`, 46, y, 9, true, darkGreen); y -= 14
    if (item.description) paragraph(item.description, 90)
    else y -= 6
  })
  section(11, copy.next, 22)
  paragraph(report.nextMeeting ?? copy.notRegistered)
  footer()

  const objects: string[] = []
  const add = (body: string) => { objects.push(body); return objects.length }
  const catalogId = add('')
  const pagesId = add('')
  const regularFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const pageIds: number[] = []
  pages.forEach((pdfPage) => {
    const commands = pdfPage.commands.join('\n')
    const contentId = add(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`)
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  })
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}
