'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type ResumenMiembro = {
  nombre: string
  horas_mes: number
  dias_trabajados: number
  tareas_completadas: number
  ultimo_clockin: string | null
}

export default function HorasPage() {
  const [resumen, setResumen] = useState<ResumenMiembro[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    cargarResumen()
  }, [mes])

  const cargarResumen = async () => {
    setLoading(true)
    const supabase = createClient()
    const inicio = `${mes}-01`
    const fin = new Date(Number(mes.split('-')[0]), Number(mes.split('-')[1]), 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('resumen_horas')
      .select('*')
      .gte('fecha', inicio)
      .lte('fecha', fin)

    if (data) setResumen(data)
    setLoading(false)
  }

  const totalHoras = resumen.reduce((acc, m) => acc + (m.horas_mes || 0), 0)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Horas</h1>
            <p className="text-gray-500 mt-1">Resumen de horas trabajadas por el equipo</p>
          </div>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Horas Equipo" valor={`${totalHoras.toFixed(0)}h`} color="blue" />
          <KPICard label="Miembros Activos" valor={`${resumen.length}`} color="green" />
          <KPICard label="Promedio por Miembro" valor={resumen.length > 0 ? `${(totalHoras / resumen.length).toFixed(0)}h` : '—'} color="purple" />
          <KPICard label="Mes" valor={new Date(`${mes}-01`).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })} color="gray" />
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resumen.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No hay datos de horas para este mes.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Miembro</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Horas</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Días</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Tareas ✓</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Último clock-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumen
                  .sort((a, b) => b.horas_mes - a.horas_mes)
                  .map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{m.nombre}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min((m.horas_mes / 160) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-800">{m.horas_mes?.toFixed(1)}h</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600 hidden sm:table-cell">{m.dias_trabajados}</td>
                      <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">{m.tareas_completadas}</td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">
                        {m.ultimo_clockin
                          ? new Date(m.ultimo_clockin).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
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

function KPICard({ label, valor, color }: { label: string; valor: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-50 to-blue-100 text-blue-700',
    green: 'from-green-50 to-green-100 text-green-700',
    purple: 'from-purple-50 to-purple-100 text-purple-700',
    gray: 'from-gray-50 to-gray-100 text-gray-700',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold capitalize">{valor}</p>
    </div>
  )
}
