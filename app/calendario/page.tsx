'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Evento = {
  id: string
  titulo: string
  responsable: string
  fecha_entrega: string
  estado: string
  marca: string
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function CalendarioPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [hoy] = useState(new Date())
  const [vistaFecha, setVistaFecha] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const inicio = new Date(vistaFecha.getFullYear(), vistaFecha.getMonth(), 1).toISOString().split('T')[0]
    const fin = new Date(vistaFecha.getFullYear(), vistaFecha.getMonth() + 1, 0).toISOString().split('T')[0]
    supabase
      .from('tareas')
      .select('id, titulo, responsable, fecha_entrega, estado, marca')
      .gte('fecha_entrega', inicio)
      .lte('fecha_entrega', fin)
      .then(({ data }) => {
        if (data) setEventos(data)
        setLoading(false)
      })
  }, [vistaFecha])

  const cambiarMes = (delta: number) => {
    setDiaSeleccionado(null)
    setVistaFecha(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const primerDia = new Date(vistaFecha.getFullYear(), vistaFecha.getMonth(), 1).getDay()
  const diasEnMes = new Date(vistaFecha.getFullYear(), vistaFecha.getMonth() + 1, 0).getDate()

  const eventosDelDia = (dia: number) =>
    eventos.filter(e => {
      if (!e.fecha_entrega) return false
      const d = new Date(e.fecha_entrega + 'T00:00:00')
      return d.getDate() === dia && d.getMonth() === vistaFecha.getMonth() && d.getFullYear() === vistaFecha.getFullYear()
    })

  const eventosDiaSeleccionado = diaSeleccionado ? eventosDelDia(diaSeleccionado) : []

  const ESTADO_COLORS: Record<string, string> = {
    pendiente: 'bg-yellow-400',
    en_proceso: 'bg-blue-500',
    completado: 'bg-green-500',
    cancelado: 'bg-red-400',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-500 mt-1">Entregas y fechas clave del equipo</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Navegación del mes */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button
              onClick={() => cambiarMes(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              ‹
            </button>
            <h2 className="font-semibold text-gray-900 text-lg">
              {MESES[vistaFecha.getMonth()]} {vistaFecha.getFullYear()}
            </h2>
            <button
              onClick={() => cambiarMes(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              ›
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Días del mes */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Espacios vacíos antes del primer día */}
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50" />
              ))}

              {/* Días del mes */}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1
                const esHoy = dia === hoy.getDate() && vistaFecha.getMonth() === hoy.getMonth() && vistaFecha.getFullYear() === hoy.getFullYear()
                const eventosHoy = eventosDelDia(dia)
                const seleccionado = diaSeleccionado === dia

                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
                    className={`h-16 border-b border-r border-gray-50 p-1.5 text-left transition-colors hover:bg-blue-50 ${seleccionado ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
                  >
                    <span className={`text-xs font-medium flex items-center justify-center w-6 h-6 rounded-full ${
                      esHoy ? 'bg-blue-600 text-white' : 'text-gray-700'
                    }`}>
                      {dia}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {eventosHoy.slice(0, 3).map(e => (
                        <span
                          key={e.id}
                          className={`w-1.5 h-1.5 rounded-full ${ESTADO_COLORS[e.estado] || 'bg-gray-400'}`}
                        />
                      ))}
                      {eventosHoy.length > 3 && (
                        <span className="text-xs text-gray-400">+{eventosHoy.length - 3}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel de eventos del día seleccionado */}
        {diaSeleccionado && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
              <h3 className="font-semibold text-blue-800">
                {diaSeleccionado} de {MESES[vistaFecha.getMonth()]} — {eventosDiaSeleccionado.length} {eventosDiaSeleccionado.length === 1 ? 'entrega' : 'entregas'}
              </h3>
            </div>
            {eventosDiaSeleccionado.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Sin entregas programadas para este día.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {eventosDiaSeleccionado.map(e => (
                  <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ESTADO_COLORS[e.estado] || 'bg-gray-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{e.titulo}</p>
                      <p className="text-xs text-gray-500">{e.responsable} · {e.marca}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${
                      e.estado === 'completado' ? 'bg-green-100 text-green-700' :
                      e.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {e.estado.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
