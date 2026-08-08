import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'

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
