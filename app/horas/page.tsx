'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Actividad = {
  id: string
  titulo: string
  responsable_ref: string
  area_ref: string
  horas: number
  dias_produccion: number
  estado: string
  mes: string
  trimestre: string
}

type ResumenMiembro = {
  nombre: string
  horas: number
  dias: number
  tareas: number
  completadas: number
}

export default function HorasPage() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState('Abril')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('actividades')
      .select('id, titulo, responsable_ref, area_ref, horas, dias_produccion, estado, mes, trimestre')
      .then(({ data }) => {
        if (data) setActividades(data)
        setLoading(false)
      })
  }, [])

  const meses = actividades
    .map(a => a.mes)
    .filter(Boolean)
    .filter((m, i, arr) => arr.indexOf(m) === i)

  const filtradas = actividades.filter(a => a.mes === mesActual)

  const resumen: ResumenMiembro[] = Object.values(
    filtradas.reduce((acc: Record<string, ResumenMiembro>, a) => {
      const nombre = a.responsable_ref || 'Sin asignar'
      if (!acc[nombre]) acc[nombre] = { nombre, horas: 0, dias: 0, tareas: 0, completadas: 0 }
      acc[nombre].horas += Number(a.horas) || 0
      acc[nombre].dias += Number(a.dias_produccion) || 0
      acc[nombre].tareas += 1
      if (a.estado === 'Completado') acc[nombre].completadas += 1
      return acc
    }, {})
  ).sort((a, b) => b.horas - a.horas)

  const totalHoras = resumen.reduce((acc, m) => acc + m.horas, 0)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Horas</h1>
            <p className="text-gray-500 mt-1">Resumen de horas trabajadas por el equipo</p>
          </div>
          <select
            value={mesActual}
            onChange={e => setMesActual(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 mb-1">Total Horas</p>
            <p className="text-2xl font-bold text-blue-700">{totalHoras.toFixed(0)}h</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs font-medium text-green-600 mb-1">Miembros</p>
            <p className="text-2xl font-bold text-green-700">{resumen.length}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-medium text-purple-600 mb-1">Promedio</p>
            <p className="text-2xl font-bold text-purple-700">{resumen.length > 0 ? (totalHoras / resumen.length).toFixed(0) : 0}h</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Mes</p>
            <p className="text-2xl font-bold text-gray-700">{mesActual}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resumen.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No hay datos para este mes.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Miembro</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Horas</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Días</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Tareas</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Completadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumen.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{m.nombre}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min((m.horas / 160) * 100, 100)}%` }} />
                        </div>
                        <span className="font-semibold text-gray-800">{m.horas}h</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden sm:table-cell">{m.dias}</td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">{m.tareas}</td>
                    <td className="px-5 py-3 text-right hidden md:table-cell">
                      <span className="text-green-600 font-medium">{m.completadas}</span>
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
