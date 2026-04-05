'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Pago = {
  id: string
  miembro: string
  tipo: 'A' | 'B'
  mes: string
  tareas_completadas: number
  dias_produccion: number
  monto_base: number
  bonificacion: number
  total: number
  estado: 'pendiente' | 'pagado'
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('pagos')
      .select('*')
      .eq('mes', mes)
      .order('miembro')
      .then(({ data }) => {
        if (data) setPagos(data)
        setLoading(false)
      })
  }, [mes])

  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((acc, p) => acc + p.total, 0)
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((acc, p) => acc + p.total, 0)

  const formatUSD = (n: number) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
            <p className="text-gray-500 mt-1">Reporte de pagos del equipo de marketing</p>
          </div>
          <input
            type="month"
            value={mes}
            onChange={e => { setLoading(true); setMes(e.target.value) }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
            <p className="text-xs font-medium text-yellow-600 mb-1">Por pagar</p>
            <p className="text-2xl font-bold text-yellow-700">{formatUSD(totalPendiente)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <p className="text-xs font-medium text-green-600 mb-1">Pagado</p>
            <p className="text-2xl font-bold text-green-700">{formatUSD(totalPagado)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="text-xs font-medium text-blue-600 mb-1">Total del mes</p>
            <p className="text-2xl font-bold text-blue-700">{formatUSD(totalPendiente + totalPagado)}</p>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pagos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No hay datos de pagos para este mes.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Miembro</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tareas ✓</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden md:table-cell">Días Prod.</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Base</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 hidden lg:table-cell">Bonif.</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.miembro}</p>
                      <p className="text-xs text-gray-400">Tipo {p.tipo}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden sm:table-cell">{p.tareas_completadas}</td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden md:table-cell">{p.dias_produccion}</td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden lg:table-cell">{formatUSD(p.monto_base)}</td>
                    <td className="px-5 py-3 text-right text-green-600 hidden lg:table-cell">+{formatUSD(p.bonificacion)}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{formatUSD(p.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.estado === 'pagado'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="px-5 py-3 font-semibold text-gray-700 hidden lg:table-cell">Total</td>
                  <td colSpan={5} className="px-5 py-3 font-semibold text-gray-700 lg:hidden">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatUSD(totalPendiente + totalPagado)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
