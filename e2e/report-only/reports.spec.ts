import { expect, test } from '@playwright/test'

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
      expect(data.metrics).toEqual({totalTasks:2,completedTasks:1,totalHours:9.5,completionRate:50})
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
    await popup.pdf({path:`test-results/print-${label}.pdf`,format:'A4',printBackground:true})
    await popup.close()
    const [download]=await Promise.all([page.waitForEvent('download'),preview.getByRole('button',{name:'Descargar PDF',exact:true}).click()])
    expect(download.suggestedFilename()).toBe('LILLY-production-2026-10.pdf')
    await download.saveAs(`test-results/download-${label}.pdf`)
    await page.screenshot({path:`test-results/reports-${label}.png`,fullPage:true})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    if(role==='admin') {
      await preview.getByRole('combobox').selectOption('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
      await expect(preview.getByRole('cell',{name:'Ada Employee QA',exact:true}).first()).toBeVisible()
      await expect(preview.getByText(/Tareas totales|Completadas/)).toHaveCount(0)
    }
    await preview.getByLabel('Período',{exact:true}).fill('2026-09')
    await expect(preview.getByText('Sin tareas en este período',{exact:true})).toBeVisible()
    await expect(preview.getByRole('button',{name:'Imprimir',exact:true})).toBeEnabled()
    await expect(preview.getByRole('button',{name:'Descargar PDF',exact:true})).toBeEnabled()
  })
}
