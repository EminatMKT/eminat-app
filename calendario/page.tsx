'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CalendarioPage() {
  const [actividades, setActividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('actividades')
        .select('*, areas(nombre, color, codigo), usuarios(nombre, color)')
        .not('fecha_entrega', 'is', null)
        .order('fecha_entrega')

      setActividades(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const anio = mesActual.getFullYear()
  const mes = mesActual.getMonth()
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const actividadesMes = actividades.filter(a => {
    if (!a.fecha_entrega) return false
    const fecha = new Date(a.fecha_entrega + 'T00:00:00')
    return fecha.getFullYear() === anio && fecha.getMonth() === mes
  })

  function actividadesDia(dia: number) {
    const fechaStr = `${anio}-${String(mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return actividades.filter(a => a.fecha_entrega === fechaStr)
  }

  const hoy = new Date()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 14, color: 'var(--t3)' }}>Cargando calendario...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '24px 36px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none', marginBottom: 8, display: 'block' }}>← Dashboard</Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>Calendario</h1>
          <p style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>{actividadesMes.length} entregas en {MESES_ES[mes]}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMesActual(new Date(anio, mes - 1, 1))} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer', fontSize: 16 }}>←</button>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MESES_ES[mes]} {anio}</div>
          <button onClick={() => setMesActual(new Date(anio, mes + 1, 1))} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: 'var(--t2)', cursor: 'pointer', fontSize: 16 }}>→</button>
          <button onClick={() => setMesActual(new Date())} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontSize: 12 }}>Hoy</button>
        </div>
      </div>

      <div style={{ padding: '24px 36px' }}>
        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '.08em' }}>{d}</div>
          ))}
        </div>

        {/* Grilla del calendario */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Celdas vacías antes del primer día */}
          {Array.from({ length: primerDia }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: 'var(--s1)', minHeight: 100, padding: 10, opacity: .3 }} />
          ))}

          {/* Días del mes */}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1
            const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
            const actsDelDia = actividadesDia(dia)
            const esFinDeSemana = [0, 6].includes(new Date(anio, mes, dia).getDay())
            return (
              <div key={dia} style={{
                background: esHoy ? 'rgba(124,111,247,.08)' : esFinDeSemana ? 'rgba(255,255,255,.02)' : 'var(--s1)',
                border: esHoy ? '1px solid rgba(124,111,247,.3)' : '1px solid transparent',
                minHeight: 100, padding: '8px 10px', position: 'relative'
              }}>
                <div style={{
                  fontSize: 13, fontWeight: esHoy ? 700 : 400,
                  color: esHoy ? '#7C6FF7' : esFinDeSemana ? 'var(--t3)' : 'var(--t2)',
                  marginBottom: 6,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: esHoy ? 24 : 'auto', height: esHoy ? 24 : 'auto',
                  borderRadius: esHoy ? '50%' : 0,
                  background: esHoy ? '#7C6FF7' : 'transparent',
                  color2: esHoy ? 'white' : undefined
                }}>
                  {dia}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {actsDelDia.slice(0, 3).map(a => (
                    <div key={a.id} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: `${a.areas?.color || '#7C6FF7'}20`,
                      color: a.areas?.color || '#7C6FF7',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      lineHeight: 1.4
                    }} title={a.titulo}>
                      {a.titulo?.slice(0, 25)}{a.titulo?.length > 25 ? '...' : ''}
                    </div>
                  ))}
                  {actsDelDia.length > 3 && (
                    <div style={{ fontSize: 10, color: 'var(--t3)', padding: '2px 6px' }}>+{actsDelDia.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { codigo: 'EMC', color: '#60A5FA' },
            { codigo: 'SVN', color: '#F472B6' },
            { codigo: 'ERG', color: '#A78BFA' },
            { codigo: 'VNF', color: '#FB923C' },
            { codigo: 'PREMIER', color: '#34D399' },
          ].map(a => (
            <div key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--t3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
              {a.codigo}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
