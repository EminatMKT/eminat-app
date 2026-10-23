'use client'
import { useCallback,useEffect,useMemo,useState } from 'react'

type Organization = { id:string;name:string }
type User = { id:string;nombre:string;apellido:string;email:string;
  auth_id:string;activo:boolean;validado:boolean }
type Member = { id:string;organization_id:string;user_id:string;role:string;status:string }
type Directory = { organizations:Organization[];users:User[];members:Member[] }
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
    </>}
  </section>
}
