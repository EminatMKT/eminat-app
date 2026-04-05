'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Miembro = {
  id: string
  nombre: string
  rol: string
  tipo: 'A' | 'B'
  email: string
  estado: 'activo' | 'inactivo'
}

export default function EquipoPage() {
  const [equipo, setEquipo] = useState<Miembro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('usuarios')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        if (data) setEquipo(data)
        setLoading(false)
      })
  }, [])

  const tipoA = equipo.filter(m => m.tipo === 'A')
  const tipoB = equipo.filter(m => m.tipo === 'B')

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500 mt-1">Miembros del equipo de Marketing — Holding Eminat</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Tipo A */}
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">Tipo A — Staff Creativo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tipoA.map(m => <TarjetaMiembro key={m.id} miembro={m} />)}
              </div>
            </section>

            {/* Tipo B */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">Tipo B — Internos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tipoB.map(m => <TarjetaMiembro key={m.id} miembro={m} />)}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function TarjetaMiembro({ miembro }: { miembro: Miembro }) {
  const iniciales = miembro.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {iniciales}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{miembro.nombre}</p>
        <p className="text-sm text-gray-500 truncate">{miembro.rol}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{miembro.email}</p>
      </div>
      <div className="ml-auto flex-shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full block ${miembro.estado === 'activo' ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>
    </div>
  )
}
