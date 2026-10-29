#!/usr/bin/env node
// Local review tooling only. Not imported by the application or any deployment route.
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createTaskReportFixture, ids } from './fixture.mjs'

const root = process.cwd()
const fixturePort = 3140, appPort = 3139, reviewPort = 3138
const fixtureDir = path.join(root, '.tmp/local-report-review')
await mkdir(fixtureDir, { recursive: true })
const fixture = await createTaskReportFixture()
const people = [ids.admin, ids.employee, ids.superadmin].map(id => fixture.people.find(person => person.id === id))
function authUser(person) { return { id: person.auth_id, email: person.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
function session(person) {
  const expires = Math.floor(Date.now() / 1000) + 86400
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: person.auth_id, aud: 'authenticated', role: 'authenticated', exp: expires })}.local-qa-fixture`, refresh_token: `qa-${person.id}`, expires_at: expires, expires_in: 86400, token_type: 'bearer', user: authUser(person) }
}
function actor(req) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token.endsWith('.local-qa-fixture')) return null
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return people.find(person => person.auth_id === claims.sub) || null
  } catch { return null }
}
function json(res, value, status = 200, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...extra })
  res.end(JSON.stringify(value))
}
async function body(req) { let value = ''; for await (const chunk of req) value += chunk; try { return JSON.parse(value || '{}') } catch { return {} } }
function columns(select) {
  let level = 0, part = '', result = []
  for (const c of select) { if (c === '(') level++; if (c === ')') level--; if (c === ',' && !level) { result.push(part); part = '' } else part += c }
  if (part) result.push(part)
  return result.map(value => value.trim())
}
const fixtures = http.createServer(async (req, res) => {
  const origin = req.headers.origin || ''
  if (['http://localhost:3138','http://127.0.0.1:3138','http://[::1]:3138'].includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,prefer,x-supabase-api-version,range,accept-profile,content-profile')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'content-range')
  if (req.method === 'OPTIONS') return res.end()
  const url = new URL(req.url, `http://localhost:${fixturePort}`)
  if (url.pathname === '/health') return json(res, { fixtureOnly: true, database: 'disposable PostgreSQL' })
  const privileged = req.headers.authorization === 'Bearer dummy-service-role-key'
  const person = actor(req) || (privileged ? people[0] : null)
  if (!person) return json(res, { error: 'Local QA session required' }, 401)
  if (url.pathname === '/auth/v1/user') return json(res, authUser(person))
  if (url.pathname === '/auth/v1/logout') return json(res, {})
  try {
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name=url.pathname.split('/').at(-1), args=await body(req)
      const signatures={has_module:[['p_slug'],['text']]}
      if(name==='lilly_access_enforced') return json(res,true)
      if(!signatures[name]) return json(res,null)
      const [keys,types]=signatures[name]
      const result=await fixture.asUser(person.auth_id,`SELECT public.${name}(${keys.map((_,i)=>'$'+(i+1)+'::'+types[i]).join(',')}) AS value`,keys.map(key=>args[key]??null))
      return json(res,result.rows[0]?.value??null)
    }
    const table=url.pathname.split('/').at(-1)
    if (!['GET','HEAD'].includes(req.method)) {
      const data=await body(req)
      if(table==='usuarios' && req.method==='PATCH' && Object.keys(data).every(key=>['online_at','ubicacion'].includes(key))) return json(res,[])
      return json(res,{error:'Review fixtures are read-only'},405)
    }
    const known=['usuarios','roles','role_modules','empresas','actividades','actividad_responsables','projects','project_members','departamentos','equipos','v_equipo_hoy','project_task_stats','usuario_empresas_acceso','sales_members']
    if(!known.includes(table)) return json(res,req.headers.accept?.includes('vnd.pgrst.object')?null:[])
    const select=url.searchParams.get('select')||'*'
    const fields=columns(select).filter(column=>!column.includes('('))
    if(fields.some(column=>!/^([a-z_]+|\*)$/.test(column))) return json(res,{message:'Unsupported fixture selection'},400)
    const values=[],where=[]
    for(const [key,filter] of url.searchParams) {
      if(['select','order','limit','offset'].includes(key)) continue
      const [op,...rest]=filter.split('.'),value=rest.join('.')
      if(key==='actividad_responsables.usuario_id') {
        values.push(value);where.push(`EXISTS(SELECT 1 FROM actividad_responsables ar WHERE ar.actividad_id=actividades.id AND ar.usuario_id=$${values.length}::uuid)`);continue
      }
      if(!/^[a-z_]+$/.test(key))continue
      if(op==='in') { const list=value.replace(/^\(|\)$/g,'').split(','); const slots=list.map(item=>{values.push(item);return '$'+values.length});where.push(`"${key}" IN (${slots.join(',')})`);continue }
      const compare={eq:'=',gte:'>=',lt:'<',lte:'<=',gt:'>'}[op]
      if(compare){values.push(value);where.push(`"${key}" ${compare} $${values.length}`)}
    }
    const read = privileged ? (sql, params) => { if(table !== 'sales_members') throw Error('Privileged operational read forbidden'); return fixture.db.query(sql,params) } : (sql,params) => fixture.asUser(person.auth_id,sql,params)
    const result=await read(`SELECT ${fields.length?fields.map(column=>column==='*'?'*':'"'+column+'"').join(','):'id'} FROM public."${table}" ${where.length?'WHERE '+where.join(' AND '):''}`,values)
    let data=result.rows
    if(table==='sales_members') { for(const row of data) row.sales_organizations=(await fixture.db.query('SELECT code,status FROM sales_organizations WHERE id=(SELECT organization_id FROM sales_members WHERE user_id=$1 AND auth_id=$2 LIMIT 1)',[row.user_id,row.auth_id])).rows[0]; data=data.filter(row=>row.sales_organizations?.code==='stratix' && row.sales_organizations.status==='active') }
    if(table==='actividades' && select.includes('actividad_responsables')) {
      for(const task of data) task.actividad_responsables=(await fixture.asUser(person.auth_id,'SELECT usuario_id,es_lider FROM actividad_responsables WHERE actividad_id=$1',[task.id])).rows
    }
    for(const row of data) for(const key of ['fecha_inicio','fecha_entrega','fecha_requerida','fecha_aprobacion']) if(row[key] instanceof Date)row[key]=row[key].toISOString().slice(0,10)
    const offset=Number(url.searchParams.get('offset')||0), limit=Number(url.searchParams.get('limit')||1000)
    data=data.slice(offset,offset+limit)
    res.setHeader('Content-Range',`0-${Math.max(0,data.length-1)}/${data.length}`)
    return json(res,req.headers.accept?.includes('vnd.pgrst.object')?data[0]||null:data)
  } catch(error) { return json(res,{code:error.code||'FIXTURE_ERROR',message:error.message},error.code==='42501'?403:400) }
})
fixtures.listen(fixturePort, '127.0.0.1')
const adminUrl = `http://localhost:${reviewPort}/__qa/admin`
const employeeUrl = `http://127.0.0.1:${reviewPort}/__qa/employee`
const superadminUrl = `http://[::1]:${reviewPort}/__qa/superadmin`
const landing = `<!doctype html><meta charset="utf-8"><title>Local Report QA</title><h1>Controlled local fixtures</h1><p>Tasks → Report only. No production data.</p><a href="${superadminUrl}">SUPERADMIN</a> · <a href="${adminUrl}">ADMIN</a> · <a href="${employeeUrl}">Employee</a>`
const handleReview = async (req, res) => {
  const url = new URL(req.url, `http://localhost:${reviewPort}`)
  if (url.pathname === '/' || url.pathname === '/__qa') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(landing) }
  if (['/__qa/admin','/__qa/employee','/__qa/superadmin'].includes(url.pathname)) {
    const person = people[url.pathname.endsWith('/superadmin') ? 2 : url.pathname.endsWith('/admin') ? 0 : 1]
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Set-Cookie': `sb-127-auth-token=${encodeURIComponent(JSON.stringify(session(person)))}; Path=/; SameSite=Lax` })
    return res.end(`<!doctype html><meta charset="utf-8"><title>Opening local QA Reports</title><script>localStorage.setItem('locale','es');localStorage.setItem('eminat-onboarding-completed','true');localStorage.setItem('eminat:${person.id}:tab-stratix',JSON.stringify('reporte'));localStorage.setItem('eminat:${person.id}:tab-tasks',JSON.stringify('reporte'));location.replace('/tasks');</script><p>Opening local QA Reports…</p>`)
  }
  if (url.pathname.startsWith('/api/') && !(['/api/tasks/report','/api/tasks/report/pdf','/api/tasks/dashboard'].includes(url.pathname) && req.method === 'GET')) {
    if (!['GET','HEAD'].includes(req.method)) return json(res, { error: 'Local review is read-only' }, 405)
    if (url.pathname === '/api/ui-time') return json(res, { utcMs: Date.now() })
    if (url.pathname.includes('/sales')) return json(res, { allowed: false, scopes: [] }, 403)
    return json(res, { scopes: [], birthday: null })
  }
  const proxy = http.request({ hostname: '127.0.0.1', port: appPort, path: req.url, method: req.method, headers: { ...req.headers, host: `localhost:${appPort}` } }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res) })
  proxy.on('error', () => json(res, { error: 'Local application is starting. Refresh in a moment.' }, 503))
  req.pipe(proxy)
}
const gateway = http.createServer(handleReview)
const ipv6Gateway = http.createServer(handleReview)
ipv6Gateway.listen(reviewPort,'::1')
gateway.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(appPort, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries({ ...req.headers, host: `localhost:${appPort}` }).map(([key,value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`)
    if (head.length) upstream.write(head)
    upstream.pipe(socket); socket.pipe(upstream)
  })
  upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy())
})
gateway.listen(reviewPort, '127.0.0.1')
// Whitelist inherited process settings so no real integration secret can reach this app.
const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','SHELL','SYSTEMROOT','NODE_EXTRA_CA_CERTS'].filter(key => process.env[key]).map(key => [key,process.env[key]]))
Object.assign(env, { NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'dummy-anon-key', NEXT_PUBLIC_APP_ENV: 'local', SUPABASE_SECRET_KEY: 'dummy-service-role-key', NEXT_BUILD_DIR: '.next', NEXT_TELEMETRY_DISABLED: '1' })
const app = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(appPort)], { cwd: root, env, stdio: ['ignore','inherit','inherit'] })
console.log(`Local review: http://localhost:${reviewPort}/__qa\nADMIN: ${adminUrl}\nEmployee: ${employeeUrl}\nFixture backend: loopback only; all business data writes disabled.`)
function stop() { app.kill('SIGTERM'); gateway.close(); ipv6Gateway.close(); fixtures.close(); setTimeout(() => process.exit(), 1000).unref() }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
app.on('exit', code => { if (code) console.error('Local application exited:', code); gateway.close(); fixtures.close() })
