'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import s from './NativeSalesModule.module.css'

type Report = {
  generatedAt: string; scope: string; range: { from: string; to: string }
  leads: { total: number; converted: number; byStage: { code: string; count: number }[];
    bySource: { code: string; count: number }[] }
  opportunities: { total: number; won: number; lost: number;
    byStage: { code: string; count: number }[] }
  memberships: { sold: number; byPlan: { code: string; count: number }[];
    byModality: { code: string; count: number }[] }
  activities: { total: number; followUps: number; byKind: { code: string; count: number }[] }
}

export default function NativeReportPdf({ report }: { report: Report }) {
  const { t } = useT()
  const [error, setError] = useState('')
  async function open(download: boolean) {
    const viewer = download ? null : window.open('', '_blank')
    setError('')
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const pdf = await PDFDocument.create()
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
      const lines = [
        `Period: ${report.range.from} to ${report.range.to}`,
        `Scope: ${report.scope === 'organization' ? 'Organization' : 'Permitted records'}`,
        `Generated: ${report.generatedAt.slice(0, 19).replace('T', ' ')} UTC`,
        `Leads: ${report.leads.total}   Converted: ${report.leads.converted}`,
        `Opportunities: ${report.opportunities.total}   Won: ${report.opportunities.won}   Lost: ${report.opportunities.lost}`,
        `Memberships sold: ${report.memberships.sold}`,
        `Activities: ${report.activities.total}   Follow-ups: ${report.activities.followUps}`,
        '', 'Leads by stage',
        ...report.leads.byStage.map(row => `${row.code.replaceAll('_',' ')}: ${row.count}`),
        '', 'Leads by source',
        ...report.leads.bySource.map(row => `${row.code.replaceAll('_',' ')}: ${row.count}`),
        '', 'Opportunities by stage',
        ...report.opportunities.byStage.map(row => `${row.code.replaceAll('_',' ')}: ${row.count}`),
        '', 'Memberships by plan',
        ...report.memberships.byPlan.map(row => `${row.code}: ${row.count}`),
        '', 'Memberships by modality',
        ...report.memberships.byModality.map(row => `${row.code}: ${row.count}`),
        '', 'Activities by type',
        ...report.activities.byKind.map(row => `${row.code.replaceAll('_',' ')}: ${row.count}`),
      ]
      let page = pdf.addPage([612, 792])
      let y = 730
      page.drawText('LILLY Sales report', { x: 48, y, size: 20, font: bold, color: rgb(0.06, 0.42, 0.4) })
      y -= 45
      for (const line of lines) {
        if (y < 52) { page = pdf.addPage([612, 792]); y = 730 }
        const safeLine = line.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\x20-\x7E]/g, '?').slice(0, 105)
        if (safeLine) page.drawText(safeLine, { x: 48, y, size: 11, font,
          color: rgb(0.1, 0.22, 0.24) })
        y -= safeLine ? 22 : 11
      }
      const bytes = await pdf.save()
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const objectUrl = URL.createObjectURL(new Blob([copy], { type: 'application/pdf' }))
      if (download) {
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = `lilly-sales-report-${report.range.from}-${report.range.to}.pdf`
        document.body.append(link); link.click(); link.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      } else if (viewer) {
        viewer.location.href = objectUrl
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 300_000)
      } else {
        URL.revokeObjectURL(objectUrl)
        throw new Error('POPUP_BLOCKED')
      }
    } catch {
      viewer?.close()
      setError('REPORT_PDF_UNAVAILABLE')
    }
  }
  return <div className={s.reportPdf}>
    <button type="button" onClick={() => void open(false)}>{t('salesNative.viewPrintPdf')}</button>
    <button type="button" onClick={() => void open(true)}>{t('salesNative.downloadPdf')}</button>
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div>
}
