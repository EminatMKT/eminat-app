'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tarea = {
  id: string
  titulo: string
  responsable: string
  estado: string
  marca: string
  fecha_entrega: string | null
  prioridad: string
}

const COLUMNAS = ['pendiente', 'en_proceso', 'revision', 'completado']
const COLUMNA_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  revision: 'Revisión',
  completado: 'Completado',
}
const COLUMNA_COLORS: Record<string, string> = {
  pendiente: 'border-t-yellow-400',
  en_proceso: 'border-t-blue-500',
  revision: 'border-t-purple-500',
  completado: 'border-t-green-500',
}

export default function ProduccionPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tareas')
      .select('id, titulo, responsable, estado, marca, fecha_entrega, prioridad')
      .order('fecha_entrega', { ascending: true })
      .then(({ data }) => {
        if (data) setTareas(data)
        setLoading(false)
      })
  }, [])

  const tareasPorColumna = (estado: string) =>
    tareas.filter(t => t.estado === estado)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Producción</h1>
            <p className="text-gray-500 mt-1">Panel Kanban — Estado actual de todas las tareas</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {tareas.length} tareas activas
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNAS.map(col => (
            <div key={col} className={`bg-white rounded-xl border-t-4 border border-gray-200 shadow-sm ${COLUMNA_COLORS[col]}`}>
              {/* Columna Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 text-sm">{COLUMNA_LABELS[col]}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {tareasPorColumna(col).length}
                  </span>
                </div>
              </div>

              {/* Tarjetas */}
              <div className="p-3 space-y-2 min-h-32">
                {tareasPorColumna(col).length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-4">Sin tareas</p>
                ) : (
                  tareasPorColumna(col).map(t => (
                    <div key={t.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer">
                      <p className="text-sm font-medium text-gray-800 leading-snug mb-2">{t.titulo}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{t.responsable}</span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{t.marca}</span>
                      </div>
                      {t.fecha_entrega && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          📅 {new Date(t.fecha_entrega).toLocaleDateString('es-EC')}
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
  )
}
