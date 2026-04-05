'use client'

import { useState } from 'react'
import NavBar from '@/app/components/NavBar'

type Miembro = {
  nombre: string
  nickname?: string
  cargo: string
  email: string
  ubicacion: string
  credenciales?: string
  departamento: string
  empresa: string
  color: string
}

const DIRECTORIO: Miembro[] = [
  // LEADERSHIP
  { nombre: 'Sandra Viviana Negrete', nickname: 'Vivi', cargo: 'CEO', email: 'ceo@eminat.net', ubicacion: 'USA', credenciales: 'MBA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Javier Andrade', nickname: 'Javi', cargo: 'COO', email: 'javier@eminat.net', ubicacion: 'USA', credenciales: 'MD, MPH', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Emilio Andrade-Negrete', nickname: 'Emi', cargo: 'Clinical Research Regulatory Coordinator', email: 'emilioandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Natalya Andrade-Negrete', nickname: 'Nat', cargo: 'Vivi Negrete Foundation Coordinator', email: 'natalyaandraden@eminat.net', ubicacion: 'USA', departamento: 'Leadership', empresa: 'Eminat Holding', color: '#7C6FF7' },

  // DIRECTORS
  { nombre: 'Dayrelis Mesa-Sardina', nickname: 'Day', cargo: 'Director of Clinical Research Operations', email: 'dmsardina@eminat.net', ubicacion: 'USA', credenciales: 'PA-C, MCMs, MPH', departamento: 'Directors', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Daniel Valderrama', nickname: 'Dani', cargo: 'Director of Medical Center Operations', email: 'daniel@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Norma Torres', nickname: 'Normita', cargo: 'Finance and Administrative Director', email: 'ntorres@eminat.net', ubicacion: 'USA', credenciales: 'ECON', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Erick Lebed', cargo: 'Business Development Director', email: 'erick@eminat.net', ubicacion: 'USA', credenciales: 'BBA', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Raul Hernandez', nickname: 'Coach', cargo: 'Director of Digital Transformation and Intelligent Process', email: 'raul@eminat.net', ubicacion: 'USA', credenciales: 'ENG', departamento: 'Directors', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Freddy Crespin', nickname: 'Mr Freddy', cargo: 'Marketing Director', email: 'freddy@eminat.net', ubicacion: 'Ecuador', departamento: 'Directors', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Ivannia Castrillo', nickname: 'Ivannita', cargo: 'Eminat Premier Manager', email: 'ivannia@eminat.net', ubicacion: 'USA', departamento: 'Directors', empresa: 'Premier by Eminat', color: '#FB923C' },

  // FINANCE & ADMIN
  { nombre: 'María José Malaguera', nickname: 'Majito', cargo: 'Accounting and Revenue Operations Lead', email: 'majo@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance & Admin', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ana Vargas', nickname: 'Anita', cargo: 'Accounting and Revenue Operations Coordinator', email: 'ana@eminat.net', ubicacion: 'Ecuador', departamento: 'Finance & Admin', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Livingsthone Andrade', nickname: 'Livincito', cargo: 'Latin America Operations Manager', email: 'landrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MSES', departamento: 'Finance & Admin', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Ronny Andrade', nickname: 'Ronnicito', cargo: 'Head of Partnerships', email: 'randrade@eminat.net', ubicacion: 'Ecuador', credenciales: 'MBA', departamento: 'Finance & Admin', empresa: 'Eminat Holding', color: '#7C6FF7' },

  // BUSINESS DEVELOPMENT
  { nombre: 'Federico Salviche', cargo: 'Business Development Associate', email: 'federico@eminat.net', ubicacion: 'USA', departamento: 'Business Development', empresa: 'Eminat Holding', color: '#7C6FF7' },
  { nombre: 'Lina Guerrero', cargo: 'Business Development Associate', email: 'lina@eminat.net', ubicacion: 'USA', departamento: 'Business Development', empresa: 'Eminat Holding', color: '#7C6FF7' },

  // RESEARCH GROUP
  { nombre: 'Leonardo Salazar', nickname: 'Leo', cargo: 'Senior Clinical Research Coordinator', email: 'lsalazar@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research Group', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Diana Hernandez', nickname: 'Dianita', cargo: 'Senior Clinical Research Coordinator', email: 'diana@eminat.net', ubicacion: 'USA', credenciales: 'MD, RMA, FMG', departamento: 'Research Group', empresa: 'Eminat Research Group', color: '#60A5FA' },
  { nombre: 'Lisandra Cruz', nickname: 'Lissy', cargo: 'Clinical Research Coordinator', email: 'lcruz@eminat.net', ubicacion: 'USA', departamento: 'Research Group', empresa: 'Eminat Research Group', color: '#60A5FA' },

  // MEDICAL TEAM
  { nombre: 'Elli Soheili', cargo: 'Board Certified Physician — Principal Investigator', email: 'esoheili@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Yelena Vidgop', cargo: 'Neurologist, Neurophysiology, Telemedicine', email: 'yvidgop@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Natalie Zayas-Cruz', cargo: 'Cardiology — Internal Medicine', email: 'nzayas@emc.health', ubicacion: 'USA', credenciales: 'PA-C', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Yaneth Trujillo', cargo: 'Family Medicine Specialist', email: 'ytrujillo@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Carlos Romero', cargo: 'Family Medicine Specialist', email: 'cromero@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Mark Sabbota', cargo: 'Cardiology — Internal Medicine Specialist', email: 'msabbota@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },
  { nombre: 'Sergio Chacin', cargo: 'Pain Management Specialist', email: 'schacin@emc.health', ubicacion: 'USA', credenciales: 'MD', departamento: 'Medical Team', empresa: 'Eminat Medical Center', color: '#34D399' },

  // MARKETING
  { nombre: 'Joselyne Guerrero', nickname: 'Joss', cargo: 'Graphic Designer', email: 'joselyne@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'David Falconi', cargo: 'Graphic Designer and Animations', email: 'david@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Jonathan Bula', cargo: 'CRM Developer / Full Stack Developer', email: 'jonathan@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Guiselle Negrete', nickname: 'Gigi', cargo: 'Patient Recruitment and Retention Coordinator', email: 'guisella@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },
  { nombre: 'Gabriel Negrete', cargo: 'Patient Recruitment and Retention Coordinator', email: 'gnegrete@eminat.net', ubicacion: 'Ecuador', departamento: 'Marketing', empresa: 'Eminat Holding', color: '#F472B6' },

  // DIGITAL & AI
  { nombre: 'Luis Melo', nickname: 'Melocotón', cargo: 'Digital Transformation and Intelligent Process Consultant', email: 'luis@eminat.net', ubicacion: 'USA', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },
  { nombre: 'Wagner Duenas', cargo: 'AI Developer', email: 'wagner@eminat.net', ubicacion: 'Ecuador', departamento: 'Digital & AI', empresa: 'Eminat Holding', color: '#A78BFA' },

  // VNF
  { nombre: 'Giuliana Guerrero', nickname: 'Giuli', cargo: 'Operations Coordinator', email: 'giuliana@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'AASW', departamento: 'VNF Team', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Felipe Beltrán', cargo: 'Psychiatry', email: 'fbeltran@vivinegretefoundation.org', ubicacion: 'USA', departamento: 'VNF Team', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
  { nombre: 'Sara Hidalgo', cargo: 'Psychiatry', email: 'shidalgo@vivinegretefoundation.org', ubicacion: 'USA', credenciales: 'ARNP', departamento: 'VNF Team', empresa: 'Vivi Negrete Foundation', color: '#FB923C' },
]

const DEPARTAMENTOS = ['Todos', 'Leadership', 'Directors', 'Finance & Admin', 'Business Development', 'Research Group', 'Medical Team', 'Marketing', 'Digital & AI', 'VNF Team']

const EMPRESA_COLORS: Record<string, string> = {
  'Eminat Holding': '#7C6FF7',
  'Eminat Research Group': '#60A5FA',
  'Eminat Medical Center': '#34D399',
  'Premier by Eminat': '#FB923C',
  'Vivi Negrete Foundation': '#F472B6',
}

const UBICACION_FLAGS: Record<string, string> = {
  'USA': '🇺🇸',
  'Ecuador': '🇪🇨',
}

function getIniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function DirectorioPage() {
  const [filtro, setFiltro] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = DIRECTORIO
    .filter(m => filtro === 'Todos' || m.departamento === filtro)
    .filter(m =>
      busqueda === '' ||
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.cargo.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.empresa.toLowerCase().includes(busqueda.toLowerCase())
    )

  const porDepartamento = DEPARTAMENTOS.slice(1).reduce((acc, dep) => {
    const miembros = filtrados.filter(m => m.departamento === dep)
    if (miembros.length > 0) acc[dep] = miembros
    return acc
  }, {} as Record<string, Miembro[]>)

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Eminat Holding Directory</h1>
            <p className="text-gray-500 mt-1">{DIRECTORIO.length} members across all companies and departments</p>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {Object.entries(EMPRESA_COLORS).map(([empresa, color]) => (
              <div key={empresa} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                {empresa}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by name, role, email or company..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {DEPARTAMENTOS.map(dep => (
              <button
                key={dep}
                onClick={() => setFiltro(dep)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filtro === dep ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {dep}
                {dep !== 'Todos' && (
                  <span className="ml-1 opacity-60">{DIRECTORIO.filter(m => m.departamento === dep).length}</span>
                )}
              </button>
            ))}
          </div>

          {filtro === 'Todos' ? (
            <div className="space-y-10">
              {Object.entries(porDepartamento).map(([dep, miembros]) => (
                <section key={dep}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-800">{dep}</h2>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">{miembros.length}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {miembros.map((m, i) => <TarjetaMiembro key={i} miembro={m} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtrados.map((m, i) => <TarjetaMiembro key={i} miembro={m} />)}
            </div>
          )}

          {filtrados.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>No members found.</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function TarjetaMiembro({ miembro }: { miembro: Miembro }) {
  const iniciales = getIniciales(miembro.nombre)
  const empresaColor = EMPRESA_COLORS[miembro.empresa] || '#7C6FF7'
  const flag = UBICACION_FLAGS[miembro.ubicacion] || '🌎'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${miembro.color}, ${miembro.color}99)` }}
        >
          {iniciales}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${empresaColor}15`, color: empresaColor }}
        >
          {miembro.empresa.replace('Eminat ', '').replace(' by Eminat', '')}
        </span>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-900 text-sm leading-snug">
          {miembro.nombre}
          {miembro.credenciales && (
            <span className="text-gray-400 font-normal text-xs ml-1">{miembro.credenciales}</span>
          )}
        </p>
        {miembro.nickname && (
          <p className="text-xs text-gray-400 mt-0.5">"{miembro.nickname}"</p>
        )}
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{miembro.cargo}</p>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-gray-50">
        
          href={`mailto:${miembro.email}`}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 truncate"
        >
          <span>✉️</span>
          <span className="truncate">{miembro.email}</span>
        </a>
        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>{flag}</span>
          <span>{miembro.ubicacion}</span>
        </p>
      </div>
    </div>
  )
}
