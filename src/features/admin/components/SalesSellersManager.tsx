'use client'
import { useCallback,useEffect,useMemo,useState } from 'react'

type Organization = { id:string;name:string }
type User = { id:string;nombre:string;apellido:string;email:string;
  auth_id:string;activo:boolean;validado:boolean }
type Member = { id:string;organization_id:string;user_id:string;role:string;status:string }
type Directory = { organizations:Organization[];users:User[];members:Member[] }
type AuditEvent = { id:string;at:string;action:string;actorUserId:string|null;
  previousState:string;newState:string }
const empty:Directory = { organizations:[],users:[],members:[] }

/** Ordinary LILLY user creation stays in Users; this grants only Native Sales SELLER. */
export default function SalesSellersManager() {
  const [directory,setDirectory] = useState<Directory>(empty)
  const [organizationId,setOrganizationId] = useState('')
  const [userId,setUserId] = useState('')
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [history,setHistory] = useState<AuditEvent[]>([])
  const [historyError,setHistoryError] = useState('')
  const [historyVersion,setHistoryVersion] = useState(0)
  const reload = useCallback(async () => {
    const response = await fetch('/api/admin/sales-sellers',{ cache:'no-store' })
    const body = await response.json() as Directory & { code?:string }
    if (!response.ok) throw new Error(body.code || 'No se pudo cargar el acceso de Sales.')
    setDirectory(body)
    setOrganizationId(current => current || body.organizations[0]?.id || '')
  },[])
  useEffect(() => { let mounted = true
    void reload().catch(cause => { if (mounted) setError(String(cause)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted=false }
  },[reload])
  const user = useMemo(() => directory.users.find(row => row.id===userId),[directory.users,userId])
  const member = useMemo(() => directory.members.find(row =>
    row.organization_id===organizationId && row.user_id===userId),
  [directory.members,organizationId,userId])
  const eligible = !!user?.auth_id && user.activo && user.validado
  const forbiddenRole = !!member && member.role!=='SELLER'
  useEffect(() => {
    if (!userId || !organizationId) { setHistory([]);return }
    setHistory([]);setHistoryError('')
    const controller = new AbortController()
    const params = new URLSearchParams({ organizationId,userId })
    void fetch(`/api/admin/sales-sellers/history?${params}`,{
      cache:'no-store',signal:controller.signal,
    }).then(async response => {
      const body = await response.json() as { events?:AuditEvent[];code?:string }
      if (!response.ok) throw new Error(body.code || 'No se pudo cargar el historial.')
      setHistory(body.events ?? []);setHistoryError('')
    }).catch(cause => { if (!controller.signal.aborted)
      setHistoryError(cause instanceof Error ? cause.message : 'Error de historial.') })
    return () => controller.abort()
  },[organizationId,userId,historyVersion])
  async function change(active:boolean) {
    if (!userId || !organizationId || saving || forbiddenRole) return
    const verb = active ? 'dar acceso SELLER' : 'revocar el acceso SELLER'
    if (!window.confirm(`¿Confirmas ${verb} a ${user?.nombre} ${user?.apellido} en esta organización?`)) return
    setSaving(true);setError('');setMessage('')
    try {
      const response = await fetch('/api/admin/sales-sellers',{
        method:'POST',headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ userId,organizationId,active }),
      })
      const body = await response.json() as { code?:string }
      if (!response.ok) throw new Error(body.code || 'No se pudo actualizar el acceso.')
      await reload()
      setHistoryVersion(version => version+1)
      setMessage(active ? 'Acceso SELLER activo. La distribución automática no cambió.' :
        'Acceso SELLER revocado.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de acceso.') }
    finally { setSaving(false) }
  }
  return <section aria-label="Acceso de vendedores de Sales" style={{ maxWidth:680,padding:24 }}>
    <h2>Vendedores de Sales</h2>
    <p>Crea primero la cuenta en Usuarios. Después asigna su acceso SELLER a una organización.
      Esta acción no añade a nadie al reparto automático de pacientes.</p>
    {loading && <p role="status">Cargando acceso…</p>}
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!loading && <>
      <label style={{ display:'block',marginBottom:12 }}>Organización<br />
        <select value={organizationId} onChange={event => setOrganizationId(event.target.value)}>
          {directory.organizations.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
      </label>
      <label style={{ display:'block',marginBottom:12 }}>Usuario LILLY<br />
        <select value={userId} onChange={event => { setUserId(event.target.value);setMessage('') }}>
          <option value="">Seleccionar usuario</option>
          {directory.users.map(row => <option key={row.id} value={row.id}>
            {row.nombre} {row.apellido} · {row.email}</option>)}
        </select>
      </label>
      {user && <p>Cuenta: {eligible ? 'activa y validada' : 'requiere identidad activa y validada'}.
        {' '}Sales: {member ? `${member.role} · ${member.status}` : 'sin acceso'}.</p>}
      {forbiddenRole && <p role="alert">Esta persona tiene otro rol de Sales. Este control no lo modifica.</p>}
      <div style={{ display:'flex',gap:12 }}>
        <button type="button" disabled={!eligible || forbiddenRole || member?.status==='active' || saving}
          onClick={() => void change(true)}>Activar SELLER</button>
        <button type="button" disabled={!member || forbiddenRole || member.status!=='active' || saving}
          onClick={() => void change(false)}>Revocar acceso</button>
      </div>
      {user && <section aria-label="Historial de acceso Sales" style={{ marginTop:28 }}>
        <h3>Historial de acceso</h3>
        {historyError && <p role="alert">{historyError}</p>}
        {!historyError && history.length===0 && <p>No hay eventos de acceso registrados.</p>}
        {history.length>0 && <div style={{ overflowX:'auto' }}><table>
          <thead><tr><th>Fecha y hora</th><th>Actor</th><th>Usuario</th>
            <th>Organización</th><th>Acción</th><th>Estado anterior</th><th>Estado nuevo</th></tr></thead>
          <tbody>{history.map(event => <tr key={event.id}>
            <td>{new Date(event.at).toLocaleString('es-EC')}</td>
            <td>{directory.users.find(row => row.id===event.actorUserId)?.nombre ?? 'No registrado'}
              {' '}{directory.users.find(row => row.id===event.actorUserId)?.apellido ?? ''}</td>
            <td>{user.nombre} {user.apellido}</td>
            <td>{event.action==='validated' || event.action==='activated' ? 'LILLY global' :
              directory.organizations.find(row => row.id===organizationId)?.name}</td>
            <td>{event.action==='validated' ? 'Validación' :
              event.action==='seller_access_revoked' ? 'Revocación SELLER' :
              event.action==='seller_access_granted' ? 'Activación SELLER' : 'Activación de cuenta'}</td>
            <td>{event.previousState==='unknown' ? 'No registrado' : event.previousState}</td>
            <td>{event.newState==='unknown' ? 'No registrado' : event.newState}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
    </>}
  </section>
}
