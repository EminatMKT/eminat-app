'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

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
  solicitado_por: string
}

type ResumenMiembro = {
  nombre: string
  horas: number
  dias: number
  tareas: number
  completadas: number
  tareasList: Actividad[]
}

const NOMBRES: Record<string, string> = {
  'DG_Joselyn': 'Joselyn Guerrero',
  'DGA_David': 'David Falconi',
  'Jonathan_CRM': 'Jonathan Bula',
  'D_Jonathan': 'Jonathan Bula',
  'DG_Ariana': 'Ariana Sig-Tú',
  'CM_ Naomi': 'Naomi Panchana',
  'EV_Bryan': 'Bryan Nuñez',
  'Coord_MFreddy': 'Freddy Crespín',
}

const TIPOS: Record<string, string> = {
  'DG_Joselyn': 'Tipo A — 8h/día · 160h/mes',
  'DGA_David': 'Tipo A — 8h/día · 160h/mes',
  'Jonathan_CRM': 'Tipo A — 8h/día · 160h/mes',
  'D_Jonathan': 'Tipo A — 8h/día · 160h/mes',
  'DG_Ariana': 'Tipo B — 6h/día · 120h/mes',
  'CM_ Naomi': 'Tipo B — 6h/día · 120h/mes',
  'EV_Bryan': 'Tipo B — 6h/día · 120h/mes',
  'Coord_MFreddy': 'Tipo A — 8h/día · 160h/mes',
}

const ORDEN_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function PagosPage() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState('Enero')
  const [miembroSeleccionado, setMiembroSeleccionado] = useState('')
  const [vistaReporte, setVistaReporte] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('actividades')
      .select('id, titulo, responsable_ref, area_ref, horas, dias_produccion, estado, mes, trimestre, solicitado_por')
      .then(({ data }) => {
        if (data) setActividades(data)
        setLoading(false)
      })
  }, [])

  const meses = ORDEN_MESES.filter(m => actividades.some(a => a.mes === m))

  // Todos los miembros únicos sin filtrar por mes
  const miembros = actividades
    .map(a => a.responsable_ref)
    .filter(Boolean)
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .sort((a, b) => (NOMBRES[a] || a).localeCompare(NOMBRES[b] || b))

  const calcularResumen = (nombre: string): ResumenMiembro => {
    const esFreddy = nombre === 'Coord_MFreddy'
    const filtradas = actividades.filter(a => a.mes === mesActual)
    const tareasList = filtradas.filter(a => {
      if (esFreddy) return a.responsable_ref === nombre || (a.solicitado_por || '').toLowerCase().includes('freddy')
      return a.responsable_ref === nombre
    })
    return {
      nombre,
      horas: tareasList.reduce((acc, a) => acc + (Number(a.horas) || 0), 0),
      dias: tareasList.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0),
      tareas: tareasList.length,
      completadas: tareasList.filter(a => a.estado === 'Completado').length,
      tareasList,
    }
  }

  const resumen = miembroSeleccionado ? calcularResumen(miembroSeleccionado) : null
  const hoy = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })

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

          {!vistaReporte ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
                <p className="text-gray-500 mt-1">Reporte de producción para pago — Holding Eminat</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md mx-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Generar Reporte</h2>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">👤 Responsable</label>
                  <select
                    value={miembroSeleccionado}
                    onChange={e => setMiembroSeleccionado(e.target.value)}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" style={{ color: '#6B7280' }}>Selecciona un miembro...</option>
                    {miembros.map(m => (
                      <option key={m} value={m} style={{ color: '#111827', fontWeight: 500 }}>
                        {NOMBRES[m] || m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">📅 Mes</label>
                  <select
                    value={mesActual}
                    onChange={e => setMesActual(e.target.value)}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {meses.map(m => (
                      <option key={m} value={m} style={{ color: '#111827' }}>{m}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { if (miembroSeleccionado) setVistaReporte(true) }}
                  disabled={!miembroSeleccionado}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Generar Reporte →
                </button>
              </div>
            </>
          ) : resumen && (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setVistaReporte(false)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
                >
                  ← Nuevo reporte
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  ⬇️ Descargar PDF
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-blue-900 text-white p-6 text-center">
                  <h2 className="text-base font-bold tracking-wide">EMINAT / VIVI NEGRETE — REPORTE DE PRODUCCIÓN PARA PAGO</h2>
                  {miembroSeleccionado === 'Coord_MFreddy' && (
                    <p className="text-xs opacity-70 mt-1">Reporte de Coordinación — incluye todas las tareas gestionadas y supervisadas</p>
                  )}
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-4 p-6 bg-blue-50 border-b border-blue-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Colaborador</p>
                    <p className="font-bold text-blue-900 text-sm">{NOMBRES[miembroSeleccionado] || miembroSeleccionado}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Jornada</p>
                    <p className="font-bold text-blue-900 text-sm">{TIPOS[miembroSeleccionado] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Período</p>
                    <p className="font-bold text-blue-900 text-sm">{mesActual} 2026</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fecha de reporte</p>
                    <p className="font-bold text-blue-900 text-sm">{hoy}</p>
                  </div>
                </div>

                {/* Nota Freddy */}
                {miembroSeleccionado === 'Coord_MFreddy' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 px-6 py-3 text-xs text-yellow-800">
                    ⚡ <strong>Nota de coordinación:</strong> Este reporte incluye tareas donde Freddy aparece como Responsable directo y todas las tareas que asignó como coordinador.
                  </div>
                )}

                {/* Tabla */}
                {resumen.tareasList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">📭</p>
                    <p>No hay tareas registradas para <strong>{NOMBRES[miembroSeleccionado] || miembroSeleccionado}</strong> en <strong>{mesActual}</strong></p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-center">#</th>
                          <th className="px-3 py-2 text-left">Actividad</th>
                          <th className="px-3 py-2 text-center">Área</th>
                          <th className="px-3 py-2 text-center">Días</th>
                          <th className="px-3 py-2 text-center">Horas</th>
                          <th className="px-3 py-2 text-center">Mes</th>
                          <th className="px-3 py-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {resumen.tareasList.map((t, i) => (
                          <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-center text-gray-500">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-800 font-medium">{t.titulo}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{t.area_ref}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-700">{t.dias_produccion || '—'}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{t.horas ? `${t.horas}h` : '—'}</td>
                            <td className="px-3 py-2 text-center text-gray-700">{t.mes}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${
                                t.estado === 'Completado' ? 'bg-green-100 text-green-700' :
                                t.estado === 'En proceso' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{t.estado}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totales */}
                <div className="bg-blue-900 text-white p-6 grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{resumen.tareas}</p>
                    <p className="text-xs opacity-80 mt-1 font-medium">Total Tareas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resumen.dias}</p>
                    <p className="text-xs opacity-80 mt-1 font-medium">Días Producción</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resumen.horas}h</p>
                    <p className="text-xs opacity-80 mt-1 font-medium">Horas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resumen.completadas}</p>
                    <p className="text-xs opacity-80 mt-1 font-medium">Completadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {resumen.tareas > 0 ? Math.round((resumen.completadas / resumen.tareas) * 100) : 0}%
                    </p>
                    <p className="text-xs opacity-80 mt-1 font-medium">Efectividad</p>
                  </div>
                </div>

                {/* Firma */}
                <div className="grid grid-cols-2 gap-8 p-8">
                  <div>
                    <div className="border-t-2 border-gray-300 pt-4">
                      <p className="font-bold text-gray-800">{NOMBRES[miembroSeleccionado] || miembroSeleccionado}</p>
                      <p className="text-xs text-gray-500 mt-1">Colaborador — Firma</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-t-2 border-gray-300 pt-4">
                      <p className="font-bold text-gray-800">Freddy Crespín</p>
                      <p className="text-xs text-gray-500 mt-1">Coordinador de Marketing — Aprobado por</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-xs text-gray-400 mt-2">
                    Fecha: {hoy} · Eminat / Vivi Negrete · Generado automáticamente desde Eminat App
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
