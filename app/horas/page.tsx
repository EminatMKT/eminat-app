'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function HorasPage() {
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState('')
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    async function cargar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      const esSuperAdmin = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'

      let query = supabase.from('actividades').select('*')
      if (!esSuperAdmin && usr?.responsable_ref) {
        query = query.eq('responsable_ref', usr.responsable_ref)
      }

      const { data } = await query
      setActividades(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'
  const filtradas = mesActual ? actividades.filter(a => a.mes === mesActual) : actividades

  // Agrupar por miembro (solo superadmin ve todos)
  const refs = esSuperAdmin
    ? ['DG_Joselyn','DGA_David','Jonathan_CRM','DG_Ariana','CM_ Naomi','EV_Bryan','Coord_MFreddy']
    : [usuario?.responsable_ref].filter(Boolean)

  const resumen = refs.map(ref => {
    const acts = filtradas.filter(a => a.responsable_ref === ref)
    return {
      ref,
      nombre: ref?.replace('DG_','').replace('DGA_','').replace('_CRM','').replace('CM_ ','').replace('EV_','').replace('Coord_M',''),
      total: acts.length,
      completadas: acts.filter(a => a.estado === 'Completado').length,
      horas: acts.reduce((acc, a) => acc + (Number(a.horas) || 0), 0),
      dias: acts.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
    }
  }).filter(r => r.total > 0)

  if (loading) return (
    <>
      <NavBar />
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Horas</h1>
              <p className="text-gray-500 mt-1">{esSuperAdmin ? 'Resumen del equipo' : 'Tu resumen de horas'}</p>
            </div>
            <select value={mesActual} onChange={e => setMesActual(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los meses</option>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="grid gap-4">
            {resumen.map(r => (
              <div key={r.ref} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{r.nombre}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{r.ref}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{r.horas}h</div>
                    <div className="text-xs text-gray-400">{r.dias} días prod.</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total tareas', value: r.total, color: 'text-gray-700' },
                    { label: 'Completadas', value: r.completadas, color: 'text-green-600' },
                    { label: 'Efectividad', value: `${r.total > 0 ? Math.round((r.completadas / r.total) * 100) : 0}%`, color: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progreso</span>
                    <span>{r.completadas}/{r.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${r.total > 0 ? (r.completadas / r.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {resumen.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-2xl mb-2">⏱</p>
                <p>No hay datos de horas para mostrar</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
