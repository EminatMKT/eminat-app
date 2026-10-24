import { PDFDocument, type PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type MembershipPdfData = {
  code: string
  memberCode?: string
  firstName: string
  lastName: string
  plan: 'ESSENTIAL' | 'PLUS' | 'MAX' | 'LEGACY_UNSPECIFIED'
  membershipType: 'INDIVIDUAL' | 'FAMILY' | 'LEGACY_UNSPECIFIED'
  duration: 'MONTHLY' | '2M' | '3M' | '6M' | '12M' | 'LEGACY_UNSPECIFIED'
  issuedAt: string
  expiresAt: string
  status: string
  qaSynthetic?: boolean
  locale?: 'es' | 'en'
}

const navy = rgb(0.07, 0.16, 0.24)
const coral = rgb(0.91, 0.17, 0.40)
const pale = rgb(0.99, 0.95, 0.97)
const safe = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ')
  .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, '?')
const durationLabel = (value: MembershipPdfData['duration']) => value === 'MONTHLY' ? 'Mes a mes' :
  value === '2M' ? 'Plazo histórico de 2 meses' :
  value === 'LEGACY_UNSPECIFIED' ? 'Plazo histórico sin especificar' : `${value.slice(0,-1)} meses`
const typeLabel = (value: MembershipPdfData['membershipType']) =>
  value === 'FAMILY' ? 'Familiar' : value === 'INDIVIDUAL' ? 'Individual' : 'Tipo histórico sin especificar'
const statusLabel = (value: string) => ({ ACTIVE: 'Activa', EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada', PENDING: 'Pendiente' })[value as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING'] || value

function fitted(value: string, font: PDFFont, startSize: number, width: number) {
  const text = safe(value)
  let size = startSize
  while (size > 7 && font.widthOfTextAtSize(text, size) > width) size--
  if (font.widthOfTextAtSize(text, size) <= width) return { text, size }
  let clipped = text
  while (clipped.length && font.widthOfTextAtSize(`${clipped}...`, size) > width)
    clipped = clipped.slice(0,-1)
  return { text: `${clipped}...`, size }
}

/** Generated from one scoped LILLY membership; address, phone, and email are absent. */
export async function createMembershipPdf(data: MembershipPdfData): Promise<Uint8Array> {
  const english = data.locale === 'en'
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  // These PNGs are lossless renders of the official SVG assets kept beside them.
  const [corazonLogo, emcLogo] = await Promise.all([
    doc.embedPng(await readFile(join(process.cwd(), 'public/brand/corazon-salud-white.png'))),
    doc.embedPng(await readFile(join(process.cwd(), 'public/brand/emc_logo_white.png'))),
  ])
  const page = doc.addPage([512,768])
  page.drawRectangle({ x:0,y:0,width:512,height:768,color:rgb(1,1,1) })
  page.drawRectangle({ x:0,y:652,width:512,height:116,color:coral })
  page.drawImage(corazonLogo, { x:42,y:686,width:200,height:72 })
  page.drawText(english ? 'MEMBERSHIP PROGRAM' : 'PROGRAMA DE MEMBRESÍA', { x:43,y:667,size:10,font:regular,color:rgb(1,1,1) })
  page.drawText(english ? 'A program of' : 'Una membresía de', { x:378,y:738,size:8,font:regular,color:rgb(1,1,1) })
  page.drawImage(emcLogo, { x:384,y:694,width:86,height:35 })
  page.drawText(english ? 'Corazón Salud is a program of Eminat Medical Center.' : 'Corazón Salud es un programa de Eminat Medical Center.',
    { x:43,y:625,size:11,font:bold,color:navy })
  if (data.qaSynthetic) page.drawText(english ? 'QA TEST · NO REAL PAYMENT' : 'QA SINTÉTICA · SIN PAGO REAL',
    { x:43,y:600,size:10,font:bold,color:coral })
  page.drawText(english ? 'MEMBER' : 'MIEMBRO', { x:43,y:574,size:10,font:bold,color:coral })
  const member = fitted(`${data.firstName} ${data.lastName}`, bold, 27, 424)
  page.drawText(member.text, { x:43,y:539,size:member.size,font:bold,color:navy })
  page.drawRectangle({ x:35,y:123,width:442,height:377,color:pale })
  const fields = [
    [english ? 'MEMBERSHIP CODE' : 'CÓDIGO DE MEMBRESÍA',data.code],
    [english ? 'MEMBER CODE' : 'CÓDIGO DEL MIEMBRO',data.memberCode ?? data.code],
    ['PLAN',data.plan==='LEGACY_UNSPECIFIED' ? (english ? 'Historical plan not specified' : 'Plan histórico sin especificar') : data.plan],
    [english ? 'TYPE' : 'TIPO',english ? (data.membershipType === 'FAMILY' ? 'Family' : data.membershipType === 'INDIVIDUAL' ? 'Individual' : 'Historical type not specified') : typeLabel(data.membershipType)],
    [english ? 'TERM' : 'MODALIDAD',english ? (data.duration === 'MONTHLY' ? 'Month-to-Month' : data.duration === 'LEGACY_UNSPECIFIED' ? 'Historical term not specified' : `${data.duration.slice(0,-1)} Months`) : durationLabel(data.duration)],
    [english ? 'EFFECTIVE DATE' : 'FECHA DE INICIO',data.issuedAt],
    [english ? 'EXPIRATION DATE' : 'VIGENCIA HASTA',data.expiresAt],
    [english ? 'STATUS' : 'ESTADO',english ? ({ACTIVE:'Active',EXPIRED:'Expired',CANCELLED:'Cancelled',PENDING:'Pending'}[data.status as 'ACTIVE'|'EXPIRED'|'CANCELLED'|'PENDING'] ?? data.status) : statusLabel(data.status)],
  ] as const
  fields.forEach(([label,value],index) => {
    const y = 465-index*41
    page.drawText(label,{x:52,y,size:9,font:bold,color:coral})
    const item = fitted(value,regular,15,400)
    page.drawText(item.text,{x:52,y:y-19,size:item.size,font:regular,color:navy})
  })
  page.drawRectangle({ x:0,y:0,width:512,height:76,color:coral })
  page.drawText(english ? 'Corazón Salud is not health insurance.' : 'Corazón Salud no es un seguro médico.',
    { x:43,y:42,size:11,font:bold,color:rgb(1,1,1) })
  page.drawText(english ? 'Keep this document for your membership records.' : 'Conserve este documento para consultar su membresía.',
    { x:43,y:23,size:9,font:regular,color:rgb(1,1,1) })
  return doc.save()
}
