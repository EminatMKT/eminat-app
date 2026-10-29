import { NextRequest, NextResponse } from 'next/server'
import { readProductionReport } from '@/server/tasks/reports/read'
import { productionReportPdf } from '@/server/tasks/reports/pdf'

export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
  const report = await readProductionReport(req)
  if (report.error) return NextResponse.json({ error: report.error }, { status: report.status })
  try {
    const pdf = await productionReportPdf(report.data)
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="LILLY-production-${report.data.month}.pdf"`,
    } })
  } catch {
    return NextResponse.json({ error: 'No se pudo crear el PDF. Puedes utilizar Imprimir y guardar como PDF.' }, { status: 422 })
  }
}
