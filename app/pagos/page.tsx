'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PagosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [meses, setMeses] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedMes, setSelectedMes] = useState('Todos')
  const [reporte, setReporte] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const router = useRouter()

  const ORDEN_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: usrs } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido, color, tipo_jornada, horas_dia, id_sheet, rol')
        .eq('activo', true)
        .order('nombre')

      const { data: acts } = await supabase
        .from('actividades')
        .select('mes')

      const mesesUnicos = [...new Set(acts?.map(a => a.mes).filter(Boolean))]
      const mesesOrdenados = ORDEN_MESES.filter(m => mesesUnicos.includes(m))

      setUsuarios(usrs || [])
      setMeses(['Todos', ...mesesOrdenados])
      if (usrs?.length) setSelectedUser(usrs[0].id)
      setCargando(false)
    }
    cargar()
  }, [])

  async function generarReporte() {
    if (!selectedUser) return
    setLoading(true)

    const usr = usuarios.find(u => u.id === selectedUser)

    let query = supabase
      .from('actividades')
      .select('*, areas(nombre, color, codigo)')
      .eq('responsable_id', selectedUser)
      .order('fecha_entrega')

    if (selectedMes !== 'Todos') {
      query = query.eq('mes', selectedMes)
    }

    const { data: tareas } = await query

    const totalTareas = tareas?.length || 0
    const totalDias = tareas?.reduce((acc, t) => acc + (t.dias_produccion || 0), 0) || 0
    const totalHoras = tareas?.reduce((acc, t) => acc + (t.horas || 0), 0) || 0
    const completadas = tareas?.filter(t => t.estado === 'Completado').length || 0

    setReporte({
      usuario: usr,
      mes: selectedMes,
      tareas: tareas || [],
      totalTareas,
      totalDias,
      totalHoras,
      completadas,
      fecha: new Date().toLocaleDateString('es-ES'),
    })

    setLoading(false)
  }

  const ESTADO_COLORS: any = {
    'Completado': { bg: 'rgba(52,211,153,.14)', color: '#34D399' },
    'Por aprobar': { bg: 'rgba(251,176,64,.14)', color: '#FBB040' },
    'En proceso': { bg: 'rgba(124,111,247,.14)', color: '#7C6FF7' },
    'Pendiente': { bg: 'rgba(148,148,179,.14)', color: '#9494B3' },
  }

  const TIPO_LABEL: any = { A: 'Tipo A — 8h/día · 40h/sem · 160h/mes', B: 'Tipo B — 6h/día · 30h/sem · 120h/mes' }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Dashboard</Link>
        <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Reportes de Pago</h1>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>Genera reportes de producción para pagos de salarios</p>
      </div>

      <div style={{ padding: '28px 36px' }}>
        {/* Formulario */}
        <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28, marginBottom: 28, maxWidth: 680 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>📋 Generar Reporte</div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>Selecciona el colaborador y el período a reportar</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>👤 Responsable</label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{
                width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', appearance: 'none'
              }}>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.id_sheet})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>📅 Mes</label>
              <select value={selectedMes} onChange={e => setSelectedMes(e.target.value)} style={{
                width: '100%', padding: '11px 14px', background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 10, color: 'var(--t1)', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', appearance: 'none'
              }}>
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <button onClick={generarReporte} disabled={loading || !selectedUser} style={{
            padding: '13px 28px', borderRadius: 12, border: 'none', background: '#7C6FF7',
            color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .7 : 1, fontFamily: 'DM Sans'
          }}>
            {loading ? 'Generando...' : 'Generar Reporte →'}
          </button>
        </div>

        {/* Reporte generado */}
        {reporte && (
          <div id="reporte-pago">
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={() => window.print()} style={{
                padding: '11px 24px', borderRadius: 10, border: 'none', background: '#059669',
                color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans'
              }}>⬇️ Descargar / Imprimir PDF</button>
              <button onClick={() => setReporte(null)} style={{
                padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.13)',
                background: 'transparent', color: 'var(--t2)', fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans'
              }}>← Nuevo reporte</button>
            </div>

            <div style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              {/* Encabezado reporte */}
              <div style={{ background: '#1F3864', padding: '20px 28px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, letterSpacing: '.5px', color: 'white' }}>
                  EMINAT / VIVI NEGRETE — REPORTE DE PRODUCCIÓN PARA PAGO
                </h2>
              </div>

              {/* Info colaborador */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#EFF6FF', padding: '16px 28px', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Colaborador</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{reporte.usuario?.nombre} {reporte.usuario?.apellido}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Jornada</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{TIPO_LABEL[reporte.usuario?.tipo_jornada]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Período</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{reporte.mes === 'Todos' ? 'Todos los meses — 2026' : `${reporte.mes} 2026`}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>Fecha de reporte</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{reporte.fecha}</div>
                </div>
              </div>

              {/* Tabla tareas */}
              {reporte.tareas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                  No hay tareas registradas para este período
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#2563EB' }}>
                        {['#', 'Actividad / Tarea', 'Área', 'Días Prod.', 'Horas', 'Mes', 'Estado'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Actividad / Tarea' ? 'left' : 'center', fontSize: 11, color: 'white', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.tareas.map((t: any, i: number) => (
                        <tr key={t.id} style={{ background: i % 2 === 0 ? 'var(--s1)' : 'var(--s2)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--t3)', fontFamily: 'DM Mono', fontSize: 11 }}>{i + 1}</td>
                          <td style={{ padding: '9px 12px', maxWidth: 300, fontSize: 12 }}>{t.titulo}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            {t.area_ref && (
                              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: `${t.areas?.color || '#7C6FF7'}18`, color: t.areas?.color || '#7C6FF7' }}>{t.area_ref}</span>
                            )}
                          </td>
                          <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'DM Mono', fontSize: 12 }}>{t.dias_produccion || '—'}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'DM Mono', fontSize: 12 }}>{t.horas ? `${t.horas}h` : '—'}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>{t.mes}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'DM Mono', fontWeight: 500, ...ESTADO_COLORS[t.estado] }}>
                              {t.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totales */}
              <div style={{ background: '#1F3864', padding: '16px 28px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Total Tareas', value: reporte.totalTareas },
                  { label: 'Días Producción', value: reporte.totalDias },
                  { label: 'Horas Trabajadas', value: reporte.totalHoras > 0 ? `${reporte.totalHoras.toFixed(1)}h` : '—' },
                  { label: 'Completadas', value: `${reporte.completadas}/${reporte.totalTareas}` },
                ].map(t => (
                  <div key={t.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1 }}>{t.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>{t.label}</div>
                  </div>
                ))}
              </div>

              {/* Firma */}
              <div style={{ padding: '20px 28px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ borderTop: '1.5px solid rgba(255,255,255,.15)', paddingTop: 10, marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7C6FF7' }}>{reporte.usuario?.nombre} {reporte.usuario?.apellido}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Colaborador — Firma</div>
                  </div>
                </div>
                <div>
                  <div style={{ borderTop: '1.5px solid rgba(255,255,255,.15)', paddingTop: 10, marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7C6FF7' }}>Freddy Crespín</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Coordinador de Marketing — Aprobado por</div>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 10, color: 'var(--t3)', marginTop: 8 }}>
                  Fecha: {reporte.fecha} · Eminat / Vivi Negrete · Generado automáticamente desde eminat-app.vercel.app
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          #reporte-pago { display: block !important; }
        }
      `}</style>
    </div>
  )
}
