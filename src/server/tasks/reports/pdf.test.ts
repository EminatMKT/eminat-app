import { expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { productionReportPdf } from './pdf'
import type { ReportData } from './read'
const report: ReportData = { memberId:'qa',name:'Ada QA',month:'2026-10',tasks:[{id:'1',titulo:'Diseño',descripcion:'Primera línea.\nSegunda línea.',empresa:'S',estado:'Completado',fecha_inicio:'2026-10-10',fecha_entrega:'2026-10-20'}],members:[],canSelectEmployees:false }
it('exports the supplied vector logo and complete multiline Spanish work as a valid PDF', async () => {
  const document = await PDFDocument.load(await productionReportPdf(report))
  expect(document.getPageCount()).toBe(1)
})
it('paginates long work descriptions while keeping the exact source content', async () => {
  const document = await PDFDocument.load(await productionReportPdf({...report,tasks:[{...report.tasks[0],descripcion:'Descripción del trabajo. '.repeat(1500)}]}))
  expect(document.getPageCount()).toBeGreaterThan(2)
})
it('refuses to silently replace unsupported text', async () => {
  await expect(productionReportPdf({...report,name:'漢字'})).rejects.toThrow()
})
