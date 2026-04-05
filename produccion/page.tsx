'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProduccionPage() {
  const [actividades, setActividades] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [filtroResp, setFiltroResp] = useState('todos')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroArea, setFiltroArea] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: acts } = await supabase
        .from('actividades')
        .select('*, areas(nombre, color, codigo), usuarios(nombre, apellido, color, id_sheet)')
        .order('fecha_entrega', { ascending: false })

      const { data: usrs } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, color, id_sheet, rol')
        .eq('activo', true)

      setActividades(acts || [])
      setUsuarios(usrs || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const ESTADOS = ['Pendiente','En proceso','Completado','Por aprobar','Rechazado']
  const AREAS = ['EMC','SVN','ERG','VNF','PREMIER','ORNELLA','Mentor']

  const filtradas = actividades.filter(a => {
    if (filtroResp !== 'todos' && a.responsable_ref !== filtroResp) return false
    if (filtroMes !== 'todos' && a.mes !== filtroMes) return false
    if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false
    if (filtroArea !== 'todos' && a.area_ref !== filtroArea) return false
    if (busqueda && !a.titulo?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const totalDias = filtradas.reduce((acc, a) => acc + (a.dias_produccion || 0), 0)
  const totalHoras = filtradas.reduce((acc, a) => acc + (a.horas || 0), 0)
  const completadas = filtradas.filter(a => a.estado === 'Completado').length

  const ESTADO_COLORS: any = {
    'Completado': { bg: 'rgba(52,211,153,.14)', color: '#34D399' },
    'Por aprobar': { bg: 'rgba(251,176,64,.14)', color: '#FBB040' },
    'En proceso': { bg: 'rgba(124,111,247,.14)', color: '#7C6FF7' },
    'Pendiente': { bg: 'rgba(148,148,179,.14)', color: '#9494B3' },
    'Rechazado': { bg: 'rgba(248,113,113,.14)', color: '#F87171' },
  }

  const responsablesUnicos = [...new Set(actividades.map(a => a.responsable_ref).filter(Boolean))]
  const mesesUnicos = MESES.filter(m => actividades.some(a => a.mes === m))

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando producción...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Dashboard</Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Producción</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>{filtradas.length} actividades · {actividades.length} total</p>
        </div>
        <Link href="/pagos" style={{
          padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.13)',
          color: 'var(--t2)', fontSize: 13, textDecoration: 'none'
        }}>💰 Reportes de pago</Link>
      </div>

      <div style={{ padding: '24px 36px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Actividades', value: filtradas.length, color: '#7C6FF7' },
            { label: 'Completadas', value: completadas, color: '#34D399' },
            { label: 'Días producción', value: totalDias, color: '#60A5FA' },
            { label: 'Horas trabajadas', value: totalHoras > 0 ? `${totalHoras.toFixed(0)}h` : '—', color: '#FBB040' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'DM Mono', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          <input
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar actividad..."
            style={{ padding: '9px 12px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 10, color: 'var(--t1)', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', gridColumn: '1 / 2' }}
          />
          {[
            { label: 'Responsable', value: filtroResp, setter: setFiltroResp, options: responsablesUnicos },
            { label: 'Mes', value: filtroMes, setter: setFiltroMes, options: mesesUnicos },
            { label: 'Estado', value: filtroEstado, setter: setFiltroEstado, options: ESTADOS },
            { label: 'Área', value: filtroArea, setter: setFiltroArea, options: AREAS },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e => f.setter(e.target.value)} style={{
              padding: '9px 12px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: 10, color: 'var(--t1)', fontSize: 13, fontFamily: 'DM Sans', outline: 'none', appearance: 'none'
            }}>
              <option value="todos">{f.label}: Todos</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--s2)' }}>
                  {['Actividad', 'Responsable', 'Área', 'Días', 'Horas', 'Mes', 'Semana', 'Estado', 'Verificado', 'F. Entrega'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 400, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, 100).map((a, i) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '11px 14px', maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{a.titulo}</div>
                      {a.descripcion && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{a.descripcion?.slice(0, 60)}{a.descripcion?.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.usuarios?.color || '#7C6FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {a.usuarios?.nombre?.[0]}{a.usuarios?.apellido?.[0]}
                        </div>
                        <span style={{ fontSize: 12 }}>{a.responsable_ref}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {a.area_ref && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, fontSize: 11, background: `${a.areas?.color || '#7C6FF7'}18`, color: a.areas?.color || '#7C6FF7' }}>
                          {a.area_ref}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: 'DM Mono', fontSize: 12 }}>{a.dias_produccion || '—'}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'center', fontFamily: 'DM Mono', fontSize: 12 }}>{a.horas ? `${a.horas}h` : '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--t3)' }}>{a.mes || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Mono' }}>{a.semana || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500, ...ESTADO_COLORS[a.estado] }}>
                        {a.estado}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {a.verificado && a.verificado !== 'Pendiente' && (
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', background: a.verificado === 'Aprobado' ? 'rgba(52,211,153,.14)' : 'rgba(251,176,64,.14)', color: a.verificado === 'Aprobado' ? '#34D399' : '#FBB040' }}>
                          {a.verificado}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                      {a.fecha_entrega || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtradas.length > 100 && (
            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--t3)', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              Mostrando 100 de {filtradas.length} resultados. Usa los filtros para refinar.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
