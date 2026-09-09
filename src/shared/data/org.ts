import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'

// centinela-exime: renombrar-lo-nombrado@1 — los catálogos se editan por `OrgModal`, que es
// data-driven y hace un update de TODOS los campos, el nombre incluido.

// Catálogos organizacionales (departamentos / equipos / cargos). Lectura para
// autenticados vía RLS; las mutaciones van por /api/admin/org (service_role).
export const listDepartamentos = () =>
  supabase.from(TABLES.departamentos).select('*').order('nombre', { ascending: true })

export const listEquipos = () =>
  supabase.from(TABLES.equipos).select('*').order('nombre', { ascending: true })

export const listCargos = () =>
  supabase.from(TABLES.cargos).select('*').order('nombre', { ascending: true })

export const listEmpresas = () =>
  supabase.from(TABLES.empresas).select('*').order('nombre', { ascending: true })

export const listJornadas = () =>
  supabase.from(TABLES.jornadas).select('*').order('horas_dia', { ascending: false })

export const listVinculaciones = () =>
  supabase.from(TABLES.vinculaciones).select('*').order('nombre', { ascending: true })
