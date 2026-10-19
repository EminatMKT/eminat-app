import { PDFDocument, type PDFFont, StandardFonts, rgb } from 'pdf-lib'

export type MembershipPdfData = {
  code: string
  firstName: string
  lastName: string
  plan: 'ESSENTIAL' | 'PLUS' | 'MAX' | 'LEGACY_UNSPECIFIED'
  membershipType: 'INDIVIDUAL' | 'FAMILY' | 'LEGACY_UNSPECIFIED'
  duration: 'MONTHLY' | '2M' | '3M' | '6M' | '12M' | 'LEGACY_UNSPECIFIED'
  issuedAt: string
  expiresAt: string
  status: string
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
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([512,768])
  page.drawRectangle({ x:0,y:0,width:512,height:768,color:rgb(1,1,1) })
  page.drawRectangle({ x:0,y:652,width:512,height:116,color:coral })
  page.drawText('CORAZÓN SALUD', { x:42,y:710,size:27,font:bold,color:rgb(1,1,1) })
  page.drawText('PROGRAMA DE MEMBRESÍA', { x:43,y:684,size:11,font:regular,color:rgb(1,1,1) })
  page.drawText('Corazón Salud es un programa de Eminat Medical Center.',
    { x:43,y:625,size:11,font:bold,color:navy })
  page.drawText('MIEMBRO', { x:43,y:574,size:10,font:bold,color:coral })
  const member = fitted(`${data.firstName} ${data.lastName}`, bold, 27, 424)
  page.drawText(member.text, { x:43,y:539,size:member.size,font:bold,color:navy })
  page.drawRectangle({ x:35,y:123,width:442,height:377,color:pale })
  const fields = [
    ['CÓDIGO DE MEMBRESÍA',data.code],
    ['PLAN',data.plan==='LEGACY_UNSPECIFIED' ? 'Plan histórico sin especificar' : data.plan],
    ['TIPO',typeLabel(data.membershipType)],
    ['MODALIDAD',durationLabel(data.duration)],
    ['FECHA DE INICIO',data.issuedAt],
    ['VIGENCIA HASTA',data.expiresAt],
    ['ESTADO',statusLabel(data.status)],
  ] as const
  fields.forEach(([label,value],index) => {
    const y = 465-index*47
    page.drawText(label,{x:52,y,size:9,font:bold,color:coral})
    const item = fitted(value,regular,15,400)
    page.drawText(item.text,{x:52,y:y-19,size:item.size,font:regular,color:navy})
  })
  page.drawRectangle({ x:0,y:0,width:512,height:76,color:coral })
  page.drawText('CORAZÓN SALUD NO ES UN SEGURO MÉDICO',
    { x:43,y:42,size:11,font:bold,color:rgb(1,1,1) })
  page.drawText('Conserve este documento para consultar su membresía.',
    { x:43,y:23,size:9,font:regular,color:rgb(1,1,1) })
  return doc.save()
}
