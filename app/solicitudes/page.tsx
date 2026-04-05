'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

type Actividad = {
  id: string
  titulo: string
  responsable_ref: string
  area_ref: string
  estado: string
  trimestre: string
  mes: string
  fecha_entrega: string | null
  solicitado_por: string
}

const ESTADO_COLORS: Record<string, string> = {
  Completado: 'bg-green-100 text-green-700',
  completado: 'bg-green-100 text-green-700',
  'En proceso': 'bg-blue-100 text-blue-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  Pendiente: 'bg-yellow-100 text-yellow-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  Cancelado: 'bg-red-100 text-red-700',
}

export default function SolicitudesPage() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('actividades')
      .select('id, titulo, responsable_ref, area_ref, estado, trimestre, mes, fecha_entrega, solicitado_por')
      .order('fecha_entrega', { ascending: false })
      .then(({ data }) => {
        if (data) setActividades(data)
        setLoading(false)
      })
  }, [])

  const filtradas = actividades
    .filter(a => filtro === 'todos' || a.estado === filtro)
    .filter(a => busqueda === '' || a.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || a.responsable_ref?.toLowerCase().includes(busqueda.toLowerCase()))

  const estados = ['todos', 'Completado', 'En proceso', 'Pendiente']

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Solicitudes</h1>
              <p className="text-gray-500 mt-1">{actividades.length} actividades registradas</p>
            </div>
            <a href="/solicitar" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              + Nueva solicitud
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Buscar tarea o responsable..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            />
            <div className="flex gap-2 flex-wrap">
              {estados.map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtro === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400">No hay actividades para este filtro.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actividad</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Responsable</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Área</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Mes</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtradas.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.titulo}</p>
                        <p className="text-xs text-gray-400">{a.solicitado_por}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{a.responsable_ref}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">{a.area_ref}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{a.mes}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[a.estado] || 'bg-gray-100 text-gray-600'}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                        {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('es-EC') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
