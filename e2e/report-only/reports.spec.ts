import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// No route mocks: actual final Next endpoints query a disposable baseline-policy fixture.
// No excluded migration, production accounts or production network access.
const disclaimer = 'El beneficiario final del trabajo es Eminat (matriz), localizada en Estados Unidos.'
const adminId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const foreignId = '77777777-7777-4777-8777-777777777777'
for (const module of ['tasks']) for (const role of ['superadmin','admin','employee']) for (const mobile of [false,true]) {
  test(`${module} ${role} ${mobile?'mobile':'desktop'}: role-aware preview, print and authenticated PDF download`, async ({ page }) => {
    const host = role==='superadmin'?'[::1]':role==='admin'?'localhost':'127.0.0.1'
    const base = `http://${host}:3138`
    await page.setViewportSize(mobile ? { width:390,height:844 } : { width:1440,height:1000 })
    await page.goto(`${base}/__qa/${role}`)
    await page.locator('#reporte-content').getByText('Diseño de piezas para campaña',{exact:false}).waitFor()
    if(module==='tasks') await page.goto(`${base}/tasks`)
    const preview=page.locator('#reporte-content')
    await expect(preview.getByRole('button',{name:'Descargar PDF',exact:true})).toHaveCount(0)
    await expect(preview.getByRole('button',{name:'Imprimir',exact:true})).toHaveCount(1)
    await expect(preview.getByText('Diseño de piezas para campaña',{exact:false})).toBeVisible()
    if(mobile) await page.getByRole('button',{name:'Abrir menú',exact:true}).click()
    await expect(page.getByRole('button',{name:'📄 Reportes',exact:true})).toBeVisible()
    await page.getByRole('button',{name:'📄 Reportes',exact:true}).click()
    await expect(preview.getByRole('img',{name:'Stratix Communications',exact:true})).toBeVisible()
    await expect(preview.getByText(disclaimer,{exact:true})).toHaveCount(1)
    await expect(preview.getByText('Full-service agency · Integrated marketing',{exact:true})).toBeVisible()
    const dataResponse=await page.request.get(`${base}/api/tasks/report?month=2026-10`)
    expect(dataResponse.status()).toBe(200)
    const data=await dataResponse.json()
    expect(data.tasks).toHaveLength(2)
    expect(data.tasks.map((task: {estado: string}) => task.estado)).toEqual(expect.arrayContaining(['Completado','En proceso']))
    await expect(preview.getByRole('cell',{name:'Completado',exact:true})).toBeVisible()
    if(role==='superadmin') {
      expect(data.metrics).toEqual({totalTasks:2,completedTasks:1,totalHours:9.5,completionRate:50,productionDays:2})
      await expect(preview.getByText(/Tareas totales/)).toBeVisible()
      await expect(preview.getByText(/Completadas/)).toBeVisible()
    } else {
      expect(data).not.toHaveProperty('metrics')
      for(const task of data.tasks) for(const key of ['horas','dias_produccion','totalTasks','completedTasks'])expect(task).not.toHaveProperty(key)
      await expect(preview.getByText(/Tareas totales|Completadas|Total de horas/)).toHaveCount(0)
    }
    const foreign=await page.request.get(`${base}/api/tasks/report?user=${foreignId}&month=2026-10`)
    expect(foreign.status()).toBe(403)
    if(role==='employee') {
      expect((await page.request.get(`${base}/api/tasks/report?user=${adminId}&month=2026-10`)).status()).toBe(403)
      expect((await page.request.get(`${base}/api/tasks/report/pdf?user=${adminId}&month=2026-10`)).status()).toBe(403)
      await expect(preview.getByRole('combobox')).toHaveCount(0)
    } else await expect(preview.getByRole('combobox')).toBeVisible()
    const [popup]=await Promise.all([page.waitForEvent('popup'),preview.getByRole('button',{name:'Imprimir',exact:true}).click()])
    await expect(popup.getByRole('img',{name:'Stratix Communications',exact:true})).toBeVisible()
    await expect(popup.getByText(disclaimer,{exact:true})).toHaveCount(1)
    const label=`${module}-${role}-${mobile?'mobile':'desktop'}`
    await verifySignatures(popup,data.name,data.tasks.length)
    await popup.pdf({path:`test-results/print-${label}.pdf`,format:'A4',printBackground:true})
    await popup.close()
    const download=await page.request.get(`${base}/api/tasks/report/pdf?month=2026-10`)
    expect(download.status()).toBe(200)
    await writeFile(`test-results/download-${label}.pdf`,await download.body())
    await page.screenshot({path:`test-results/reports-${label}.png`,fullPage:true})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if(role==='admin') {
      await preview.getByRole('combobox').selectOption('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
      await expect(preview.getByRole('cell',{name:'Ada Employee QA',exact:true}).first()).toBeVisible()
      await expect(preview.getByText(/Tareas totales|Completadas/)).toHaveCount(0)
    }
    await preview.getByLabel('Período',{exact:true}).fill('2026-07')
    await expect(preview.getByText('Sin tareas en este período',{exact:true})).toBeVisible()
    await expect(preview.getByRole('button',{name:'Imprimir',exact:true})).toBeEnabled()
    await expect(preview.getByRole('button',{name:'Descargar PDF',exact:true})).toHaveCount(0)
  })
}

for (const role of ['superadmin','employee']) test(`September historical structure ${role}: complete multi-page report and correct metric ownership`, async ({page}) => {
  const host=role==='superadmin'?'[::1]':'127.0.0.1', base=`http://${host}:3138`
  await page.goto(`${base}/__qa/${role}`)
  const preview=page.locator('#reporte-content')
  await expect(preview.getByRole('button',{name:'Imprimir',exact:true})).toBeEnabled()
  await preview.getByLabel('Período',{exact:true}).fill('2026-09')
  await expect(preview.getByText('September structure QA work 02',{exact:false})).toBeVisible()
  const response=await page.request.get(`${base}/api/tasks/report?month=2026-09`)
  expect(response.status()).toBe(200)
  const data=await response.json()
  if(role==='superadmin') {
    expect(data.tasks).toHaveLength(83)
    expect(data.metrics).toMatchObject({totalTasks:83,completedTasks:56,totalHours:10,productionDays:6})
    expect(data.tasks.find((task:{titulo:string})=>task.titulo.endsWith('01')).assignedEmployees[0].name).toBe('Alex Admin QA')
    await expect(preview.getByRole('cell',{name:'Alex Admin QA',exact:true})).toBeVisible()
    await expect(preview.getByRole('cell',{name:'Ada Employee QA',exact:true}).first()).toBeVisible()
  } else {
    expect(data.tasks).toHaveLength(76)
    expect(data).not.toHaveProperty('metrics')
    for(const task of data.tasks) {expect(task).not.toHaveProperty('horas');expect(task).not.toHaveProperty('dias_produccion')}
    await expect(preview.getByText(/Tareas totales|Completadas|Días de producción|Horas totales/)).toHaveCount(0)
    expect(data.tasks.every((task:{assignedEmployees:{id:string}[]})=>task.assignedEmployees.some(person=>person.id==='dddddddd-dddd-4ddd-8ddd-dddddddddddd'))).toBe(true)
  }
  expect(data.tasks.map((task:{estado:string})=>task.estado)).toEqual(expect.arrayContaining(['Completado','Pendiente','En proceso']))
  const [popup]=await Promise.all([page.waitForEvent('popup'),preview.getByRole('button',{name:'Imprimir',exact:true}).click()])
  await verifySignatures(popup,data.name,data.tasks.length)
  await popup.pdf({path:`test-results/september-print-${role}.pdf`,format:'A4',printBackground:true})
  await popup.close()
  const download=await page.request.get(`${base}/api/tasks/report/pdf?month=2026-09`)
  expect(download.status()).toBe(200)
  await writeFile(`test-results/september-download-${role}.pdf`,await download.body())
  await page.screenshot({path:`test-results/september-${role}.png`,fullPage:true})
})

for(const role of ['employee','employee-two']) for(const mobile of [false,true]) test(`personal client-area assignments ${role} ${mobile?'mobile':'desktop'}: ownership, month, preview, print and PDF`,async({page})=>{
  const base='http://127.0.0.1:3138', own=role==='employee'?'dddddddd-dddd-4ddd-8ddd-dddddddddddd':'12121212-1212-4212-8212-121212121212'
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000})
  await page.goto(`${base}/__qa/${role}`)
  const preview=page.locator('#reporte-content')
  await expect(preview.getByRole('button',{name:'Imprimir',exact:true})).toBeEnabled()
  await preview.getByLabel('Período',{exact:true}).fill('2026-08')
  await expect(preview.getByText('Client-assignment QA 2',{exact:false})).toBeVisible()
  const response=await page.request.get(`${base}/api/tasks/report?month=2026-08`)
  expect(response.status()).toBe(200)
  const report=await response.json(), expected=role==='employee'?[1,2,3,4,5]:[2,3]
  expect(report.memberId).toBe(own)
  expect(report.tasks.map((task:{titulo:string})=>task.titulo).sort()).toEqual(expected.map(i=>`Client-assignment QA ${i}`))
  expect(report).not.toHaveProperty('metrics')
  for(const task of report.tasks){expect(task).not.toHaveProperty('horas');expect(task).not.toHaveProperty('dias_produccion')}
  await expect(preview.getByText(/Unrelated colleague|Client-assignment QA 8/)).toHaveCount(0)
  await expect(preview.getByText(/Tareas totales|Completadas|Días de producción|Horas totales/)).toHaveCount(0)
  if(role==='employee') expect(report.tasks.map((task:{estado:string})=>task.estado)).toEqual(expect.arrayContaining(['Pendiente','En proceso','Completado','Por aprobar','Cancelado']))
  expect((await page.request.get(`${base}/api/tasks/report?month=2026-08&user=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`)).status()).toBe(403)
  const [popup]=await Promise.all([page.waitForEvent('popup'),preview.getByRole('button',{name:'Imprimir',exact:true}).click()])
  await expect(popup.getByText(disclaimer,{exact:true})).toHaveCount(1)
  const label=`client-${role}-${mobile?'mobile':'desktop'}`
  await verifySignatures(popup,report.name,report.tasks.length)
  await popup.pdf({path:`test-results/print-${label}.pdf`,format:'A4',printBackground:true});await popup.close()
  const download=await page.request.get(`${base}/api/tasks/report/pdf?month=2026-08`)
  expect(download.status()).toBe(200)
  await writeFile(`test-results/download-${label}.pdf`,await download.body())
  await preview.getByLabel('Período',{exact:true}).fill('2026-06')
  await expect(preview.getByText(`Client-assignment QA ${role==='employee'?6:7}`,{exact:false})).toBeVisible()
  const june=await(await page.request.get(`${base}/api/tasks/report?month=2026-06`)).json()
  expect(june.tasks.map((task:{titulo:string})=>task.titulo)).toEqual([`Client-assignment QA ${role==='employee'?6:7}`])
})

async function verifySignatures(popup: import('@playwright/test').Page, subject: string, taskCount: number) {
  const signatures=popup.locator('.report-signatures')
  await expect(signatures).toHaveCount(1)
  await expect(signatures.locator(':scope > div').first().getByText(subject,{exact:true})).toBeVisible()
  await expect(signatures.getByText('Miembro del equipo',{exact:true})).toBeVisible()
  await expect(signatures.getByText('Freddy Crespín',{exact:true})).toBeVisible()
  await expect(signatures.getByText('Marketing Director — Approved by',{exact:true})).toBeVisible()
  expect(await popup.locator('tbody tr').count()).toBe(taskCount)
  expect(await signatures.evaluate(node=>!!(node.compareDocumentPosition(document.querySelector('table')!) & Node.DOCUMENT_POSITION_PRECEDING))).toBe(true)
  expect(await signatures.evaluate(node=>getComputedStyle(node).breakInside)).toBe('avoid')
  await popup.evaluate(()=>{window.print=()=>{document.body.dataset.printCalled='true'}})
  await popup.getByRole('button',{name:'Imprimir',exact:true}).click()
  await expect(popup.locator('body')).toHaveAttribute('data-print-called','true')
}
