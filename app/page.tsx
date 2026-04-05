'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LandingPage() {
  const [equipo, setEquipo] = useState<any[]>([])
  const [stats, setStats] = useState({ activas: 0, completadas: 0 })

  useEffect(() => {
    async function cargarDatos() {
      // Cargar equipo activo
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (usuarios) setEquipo(usuarios)

      // Cargar KPIs
      const { data: kpis } = await supabase
        .from('v_kpis_globales')
        .select('*')
        .eq('trimestre', 'Q1')

      if (kpis && kpis.length > 0) {
        const total = kpis.reduce((acc: any, k: any) => ({
          total_tareas: (acc.total_tareas || 0) + (k.total_tareas || 0),
          completadas: (acc.completadas || 0) + (k.completadas || 0),
        }), {})
        setStats({ activas: total.total_tareas || 0, completadas: total.completadas || 0 })
      }
    }
    cargarDatos()
  }, [])

  const AREAS = [
    { codigo: 'EMC', nombre: 'Eminat Medical Center', color: '#60A5FA' },
    { codigo: 'SVN', nombre: 'Soy Vivi Negrete', color: '#F472B6' },
    { codigo: 'ERG', nombre: 'Eminat Research Group', color: '#A78BFA' },
    { codigo: 'VNF', nombre: 'Vivi Negrete Foundation', color: '#FB923C' },
    { codigo: 'PREMIER', nombre: 'Eminat Premier', color: '#34D399' },
  ]

  const SERVICIOS = [
    { icon: '🎨', title: 'Diseño Gráfico', desc: 'Posts, banners, infografías, identidad visual para las 5 marcas del holding.', tag: 'Joselyn · Ariana' },
    { icon: '🎬', title: 'Diseño Audiovisual', desc: 'Animaciones, reels, motion graphics y edición de video profesional.', tag: 'David · Bryan' },
    { icon: '📱', title: 'Community Management', desc: 'Gestión de redes, estrategia de contenido y engagement para todas las marcas.', tag: 'Naomi' },
    { icon: '🤖', title: 'CRM & Automatización', desc: 'CRM, automatización de procesos e inteligencia artificial aplicada.', tag: 'Jonathan' },
    { icon: '📋', title: 'Coordinación', desc: 'Gestión de proyectos, priorización y reportes de producción mensual.', tag: 'Freddy' },
    { icon: '📊', title: 'Estrategia Digital', desc: 'Campañas, métricas, pauta digital y crecimiento del ecosistema.', tag: 'Equipo completo' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 44px', height: 64,
        background: 'rgba(8,8,13,.9)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C6FF7', boxShadow: '0 0 10px #7C6FF7' }} />
          eminat app
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Mono', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} className="live-dot" />
            {stats.activas} tareas activas
          </div>
          <Link href="/login" style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.13)',
            background: 'transparent', color: 'var(--t2)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', transition: 'all .2s'
          }}>Iniciar sesión</Link>
          <Link href="/solicitar" style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: '#7C6FF7', color: 'white', fontSize: 13, fontWeight: 600,
            textDecoration: 'none'
          }}>Solicitar tarea →</Link>
        </div>
      </header>

      {/* LIVE BAR */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        padding: '11px 44px', background: 'var(--s1)', borderBottom: '1px solid rgba(255,255,255,0.07)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#34D399' }}>
          <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
          En producción ahora
        </div>
        {equipo.slice(0, 4).map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.color, display: 'inline-block' }} />
            {u.nombre} — Produciendo
          </div>
        ))}
      </div>

      {/* HERO */}
      <section style={{ padding: '96px 44px 72px', textAlign: 'center', maxWidth: 920, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.13)', background: 'var(--s1)',
          fontSize: 12, color: 'var(--t2)', marginBottom: 32, fontFamily: 'DM Mono'
        }}>
          ◆ Holding Eminat · 4 marcas · 1 equipo creativo
        </div>
        <h1 style={{
          fontFamily: 'Syne', fontSize: 'clamp(52px, 7.5vw, 90px)',
          fontWeight: 800, lineHeight: 1, letterSpacing: '-.04em', marginBottom: 24
        }}>
          Producción creativa<br />
          <span style={{ color: 'var(--t2)', fontWeight: 400 }}>bajo </span>
          <span style={{ color: '#7C6FF7' }}>demanda.</span>
        </h1>
        <p style={{ fontSize: 17, color: 'var(--t2)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto 40px', fontWeight: 300 }}>
          Sistema unificado para gestionar solicitudes creativas del holding. Marketing, diseño, video y community — todo en un solo lugar.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Link href="/solicitar" style={{
            padding: '14px 32px', borderRadius: 12, border: 'none',
            background: '#7C6FF7', color: 'white', fontSize: 15, fontWeight: 600,
            textDecoration: 'none', display: 'inline-block'
          }}>Hacer una solicitud →</Link>
          <Link href="/dashboard" style={{
            padding: '14px 32px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.13)',
            background: 'transparent', color: 'var(--t2)', fontSize: 15, fontWeight: 500,
            textDecoration: 'none', display: 'inline-block'
          }}>Ver dashboard</Link>
        </div>
      </section>

      {/* BRANDS */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '32px 44px', borderTop: '1px solid rgba(255,255,255,0.07)'
      }}>
        <span style={{ fontSize: 12, color: 'var(--t3)', marginRight: 8 }}>Servimos a</span>
        {AREAS.map(a => (
          <div key={a.codigo} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
            borderRadius: 100, border: '1px solid rgba(255,255,255,0.13)',
            background: 'var(--s1)', fontSize: 13, fontWeight: 500
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
            {a.nombre}
          </div>
        ))}
      </div>

      {/* SERVICIOS */}
      <section style={{ padding: '72px 44px', maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 44, display: 'flex', alignItems: 'center', gap: 12 }}>
          Servicios del equipo
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          {SERVICIOS.map((s, i) => (
            <div key={i} style={{ background: 'var(--s1)', padding: 32 }}>
              <div style={{ fontSize: 24, marginBottom: 16 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>{s.desc}</div>
              <div style={{ marginTop: 16, fontFamily: 'DM Mono', fontSize: 11, color: '#7C6FF7' }}>↳ {s.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EQUIPO */}
      <section style={{ padding: '0 44px 72px', maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          El equipo
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {equipo.map(u => (
            <div key={u.id} style={{
              background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '20px 16px', textAlign: 'center'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: u.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, margin: '0 auto 12px', color: 'white'
              }}>
                {u.nombre[0]}{u.apellido[0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{u.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4 }}>
                {u.rol === 'superadmin' ? 'Coordinador' :
                 u.rol === 'colaborador' ? 'Colaborador' :
                 u.rol === 'pasante' ? 'Pasante' : u.rol}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                fontSize: 10, fontFamily: 'DM Mono', padding: '3px 8px',
                borderRadius: 20, background: 'rgba(52,211,153,.1)', color: '#34D399'
              }}>
                <span className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
                Activo
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '36px 44px', textAlign: 'center', marginTop: 20
      }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>eminat app</div>
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sistema de gestión creativa · Holding Eminat · eminat.app</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20, fontSize: 12, color: 'var(--t3)' }}>
          <Link href="/login" style={{ color: 'var(--t3)', textDecoration: 'none' }}>Iniciar sesión</Link>
          <span>·</span>
          <Link href="/solicitar" style={{ color: 'var(--t3)', textDecoration: 'none' }}>Solicitar tarea</Link>
          <span>·</span>
          <Link href="/dashboard" style={{ color: 'var(--t3)', textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </footer>
    </div>
  )
}
