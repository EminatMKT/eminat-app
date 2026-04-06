'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/app/components/NavBar'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MIEMBROS_REFS: Record<string, string> = {
  'DG_Joselyn': 'Joselyn Guerrero',
  'DGA_David': 'David Falconi',
  'Jonathan_CRM': 'Jonathan Bula',
  'DG_Ariana': 'Ariana Sig-Tu',
  'CM_ Naomi': 'Naomi Panchana',
  'EV_Bryan': 'Bryan Nunez',
  'Coord_MFreddy': 'Freddy Crespin',
}

export default function PagosPage() {
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState(MESES[new Date().getMonth()])
  const [miembroSeleccionado, setMiembroSeleccionado] = useState('')
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    async function cargar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: usr } = await supabase.from('usuarios').select('*').eq('email', user.email).single()
      setUsuario(usr)

      const esSuperAdmin = usr?.rol === 'superadmin' || usr?.rol === 'coordinador'

      let query = supabase.from('actividades').select('*')
      if (!esSuperAdmin && usr?.responsable_ref) {
        query = query.eq('responsable_ref', usr.responsable_ref)
        setMiembroSeleccionado(usr.responsable_ref)
      }

      const { data } = await query
      setActividades(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const esSuperAdmin = usuario?.rol === 'superadmin' || usuario?.rol === 'coordinador'

  const refs = esSuperAdmin
    ? Object.keys(MIEMBROS_REFS)
    : [usuario?.responsable_ref].filter(Boolean)

  const actsFiltradas = actividades.filter(a => {
    const ref = miembroSeleccionado || refs[0]
    const matchMes = a.mes === mesSeleccionado
    if (ref === 'Coord_MFreddy') {
      return matchMes && (a.responsable_ref === ref || a.solicitado_por === ref)
    }
    return matchMes && a.responsable_ref === ref
  })

  const totalHoras = actsFiltradas.reduce((acc, a) => acc + (Number(a.horas) || 0), 0)
  const totalDias = actsFiltradas.reduce((acc, a) => acc + (Number(a.dias_produccion) || 0), 0)
  const completadas = actsFiltradas.filter(a => a.estado === 'Completado').length
  const refActual = miembroSeleccionado || refs[0] || ''
  const nombreActual = MIEMBROS_REFS[refActual] || usuario?.nombre || refActual

  function imprimir() {
    window.print()
  }

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
      <main className="min-h-screen bg-gray-50 p-6 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8 print:hidden">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
              <p className="text-gray-500 mt-1">Reporte de produccion mensual</p>
            </div>
            <div className="flex gap-3">
              {esSuperAdmin && (
                <select value={miembroSeleccionado} onChange={e => setMiembroSeleccionado(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar miembro</option>
                  {refs.map(r => <option key={r} value={r}>{MIEMBROS_REFS[r] || r}</option>)}
                </select>
              )}
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MESES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={imprimir}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Imprimir reporte
              </button>
            </div>
          </div>

          {/* Reporte */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-none">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Reporte de Produccion</h2>
                <p className="text-gray-500 mt-1">Holding Eminat — Departamento de Marketing</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Periodo</div>
                <div className="font-bold text-gray-900">{mesSeleccionado} 2026</div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mb-6">
              <div className="text-sm text-gray-500 mb-1">Colaborador</div>
              <div className="text-xl font-bold text-gray-900">{nombreActual}</div>
              <div className="text-sm text-gray-400 font-mono">{refActual}</div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total tareas', value: actsFiltradas.length, color: 'text-blue-600' },
                { label: 'Completadas', value: completadas, color: 'text-green-600' },
                { label: 'Horas totales', value: `${totalHoras}h`, color: 'text-purple-600' },
                { label: 'Dias produccion', value: totalDias, color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tarea</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dias</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {actsFiltradas.map(a => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-gray-800">{a.titulo}</td>
                    <td className="px-3 py-2 text-gray-500">{a.area_ref}</td>
                    <td className="px-3 py-2 text-gray-500">{a.horas}h</td>
                    <td className="px-3 py-2 text-gray-500">{a.dias_produccion}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.estado === 'Completado' ? 'bg-green-100 text-green-700' :
                        a.estado === 'En proceso' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{a.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {actsFiltradas.length === 0 && (
              <p className="text-center text-gray-400 py-8">No hay tareas para este periodo</p>
            )}

            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t border-gray-300 pt-2 text-sm text-gray-500">Firma del colaborador</div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-300 pt-2 text-sm text-gray-500">Firma del coordinador</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
