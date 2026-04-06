'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

const ESTADOS = ['Todos', 'Pendiente', 'En proceso', 'Completado', 'Por aprobar']
const ESTADO_COLORS: Record<string, string> = {
  'Completado': 'bg-green-100 text-green-700',
  'Por aprobar': 'bg-yellow-100 text-yellow-700',
  'En proceso': 'bg-blue-100 text-blue-700',
  'Pendiente': 'bg-gray-100 text-gray-600',
}

export default function SolicitudesPage() {
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    async function cargar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      const esSuperAdmin = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'

      let query = supabase.from('actividades').select('*').order('fecha_entrega', { ascending: false })

      // Si no es superadmin/coordinador, solo ve sus propias tareas
      if (!esSuperAdmin && usr?.responsable_ref) {
        query = query.eq('responsable_ref', usr.responsable_ref)
      }

      const { data } = await query
      setActividades(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const filtradas = actividades
    .filter(a => filtroEstado === 'Todos' || a.estado === filtroEstado)
    .filter(a =>
      busqueda === '' ||
      a.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.area_ref?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.responsable_ref?.toLowerCase().includes(busqueda.toLowerCase())
    )

  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Solicitudes</h1>
            <p className="text-gray-500 mt-1">
              {esSuperAdmin ? `${filtradas.length} actividades totales` : `${filtradas.length} tus actividades`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Buscar por título, área o responsable..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {ESTADOS.map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filtroEstado === e ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}>
                {e}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Título', 'Área', ...(esSuperAdmin ? ['Responsable'] : []), 'Mes', 'Horas', 'Estado', 'Entrega'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtradas.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                        {a.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{a.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">{a.area_ref}</span>
                      </td>
                      {esSuperAdmin && (
                        <td className="px-4 py-3 text-xs text-gray-500">{a.responsable_ref}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-gray-500">{a.mes}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.horas}h</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLORS[a.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtradas.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-2xl mb-2">📋</p>
                  <p>No hay actividades para mostrar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
