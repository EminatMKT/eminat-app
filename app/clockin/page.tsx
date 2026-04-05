'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Marcacion = {
  id: string
  usuario_id: string
  nombre: string
  tipo: 'entrada' | 'salida'
  timestamp: string
}

export default function ClockinPage() {
  const [historial, setHistorial] = useState<Marcacion[]>([])
  const [loading, setLoading] = useState(true)
  const [marcando, setMarcando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [horaActual, setHoraActual] = useState('')
  const [fechaActual, setFechaActual] = useState('')

  useEffect(() => {
    // Reloj en tiempo real
    const actualizarReloj = () => {
      const ahora = new Date()
      setHoraActual(ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setFechaActual(ahora.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    }
    actualizarReloj()
    const intervalo = setInterval(actualizarReloj, 1000)

    // Cargar historial del día
    cargarHistorial()

    return () => clearInterval(intervalo)
  }, [])

  const cargarHistorial = async () => {
    const supabase = createClient()
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('clockin')
      .select('*')
      .gte('timestamp', hoy)
      .order('timestamp', { ascending: false })
      .limit(20)
    if (data) setHistorial(data)
    setLoading(false)
  }

  const marcar = async (tipo: 'entrada' | 'salida') => {
    setMarcando(true)
    setMensaje(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMensaje({ texto: 'No hay sesión activa. Por favor inicia sesión.', tipo: 'error' })
      setMarcando(false)
      return
    }
    const { error } = await supabase.from('clockin').insert({
      usuario_id: user.id,
      tipo,
      timestamp: new Date().toISOString(),
    })
    if (error) {
      setMensaje({ texto: 'Error al registrar. Intenta de nuevo.', tipo: 'error' })
    } else {
      setMensaje({ texto: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente ✓`, tipo: 'ok' })
      await cargarHistorial()
    }
    setMarcando(false)
    setTimeout(() => setMensaje(null), 4000)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clock In / Out</h1>
          <p className="text-gray-500 mt-1">Registro de asistencia diaria</p>
        </div>

        {/* Reloj */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-6">
          <p className="text-6xl font-bold text-gray-900 font-mono tracking-tight">{horaActual}</p>
          <p className="text-gray-500 mt-2 capitalize">{fechaActual}</p>

          {/* Mensaje */}
          {mensaje && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
              mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 justify-center mt-8">
            <button
              onClick={() => marcar('entrada')}
              disabled={marcando}
              className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
            >
              ↗ Entrada
            </button>
            <button
              onClick={() => marcar('salida')}
              disabled={marcando}
              className="px-8 py-3 bg-red-500 text-white rounded-xl font-semibold text-lg hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50"
            >
              ↙ Salida
            </button>
          </div>
        </div>

        {/* Historial del día */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Marcaciones de hoy</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : historial.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin marcaciones hoy todavía.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {historial.map(m => (
                <li key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${m.tipo === 'entrada' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.nombre || 'Usuario'}</p>
                      <p className="text-xs text-gray-400 capitalize">{m.tipo}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 font-mono">
                    {new Date(m.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
