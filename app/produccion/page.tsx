'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

const COLUMNAS = ['Pendiente', 'En proceso', 'Completado']
const COLUMNA_COLORS: Record<string, string> = {
  Pendiente: 'border-t-yellow-400',
  'En proceso': 'border-t-blue-500',
  Completado: 'border-t-green-500',
}

export default function ProduccionPage() {
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

      let query = supabase.from('actividades').select('id, titulo, responsable_ref, area_ref, estado, fecha_entrega, mes').order('fecha_entrega', { ascending: true })
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
  const meses = actividades.map(a => a.mes).filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i)
  const filtradas = mesActual ? actividades.filter(a => a.mes === mesActual) : actividades
  const porColumna = (estado: string) => filtradas.filter(a => a.estado === estado)

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
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Produccion</h1>
              <p className="text-gray-500 mt-1">
                {esSuperAdmin ? `${filtradas.length} actividades — Panel Kanban` : `${filtradas.length} tus tareas`}
              </p>
            </div>
            <select value={mesActual} onChange={e => setMesActual(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COLUMNAS.map(col => (
              <div key={col} className={`bg-white rounded-xl border-t-4 border border-gray-200 shadow-sm ${COLUMNA_COLORS[col]}`}>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">{col}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {porColumna(col).length}
                  </span>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {porColumna(col).length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">Sin actividades</p>
                  ) : (
                    porColumna(col).map(a => (
                      <div key={a.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-blue-200 transition-colors">
                        <p className="text-sm font-medium text-gray-800 leading-snug mb-2">{a.titulo}</p>
                        <div className="flex items-center justify-between">
                          {esSuperAdmin && <span className="text-xs text-gray-400">{a.responsable_ref}</span>}
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 ml-auto">{a.area_ref}</span>
                        </div>
                        {a.fecha_entrega && (
                          <p className="text-xs text-gray-400 mt-1.5">
                            📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
