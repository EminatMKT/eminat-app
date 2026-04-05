'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Solicitud = {
  id: string
  titulo: string
  descripcion: string
  solicitante: string
  responsable: string
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
  prioridad: 'alta' | 'media' | 'baja'
  fecha_solicitud: string
  fecha_entrega: string | null
  marca: string
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: 'text-red-600',
  media: 'text-yellow-600',
  baja: 'text-gray-400',
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tareas')
      .select('*')
      .order('fecha_solicitud', { ascending: false })
      .then(({ data }) => {
        if (data) setSolicitudes(data)
        setLoading(false)
      })
  }, [])

  const filtradas = filtro === 'todos'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtro)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitudes</h1>
            <p className="text-gray-500 mt-1">{solicitudes.length} tareas registradas</p>
          </div>
          <a
            href="/solicitar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Nueva solicitud
          </a>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['todos', 'pendiente', 'en_proceso', 'completado', 'cancelado'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filtro === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {f === 'todos' ? 'Todos' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No hay solicitudes en este estado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarea</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Responsable</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Marca</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Prioridad</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.titulo}</p>
                      <p className="text-gray-400 text-xs truncate max-w-xs">{s.descripcion}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{s.responsable}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{s.marca}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${ESTADO_COLORS[s.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {s.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold capitalize ${PRIORIDAD_COLORS[s.prioridad] || ''}`}>
                        {s.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString('es-EC') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
