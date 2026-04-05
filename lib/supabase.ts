import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Tipos TypeScript para las tablas
export type Usuario = {
  id: string
  email: string
  nombre: string
  apellido: string
  nombre_display: string
  departamento_id: string
  rol: 'superadmin' | 'coordinador' | 'colaborador' | 'pasante' | 'externo'
  id_sheet: string | null
  tipo_jornada: 'A' | 'B' | 'externo'
  horas_dia: number
  marca_hora: boolean
  color: string
  activo: boolean
  validado: boolean
  fecha_inicio: string | null
}

export type Actividad = {
  id: string
  titulo: string
  descripcion: string | null
  responsable_id: string | null
  responsable_ref: string | null
  area_id: string | null
  area_ref: string | null
  dias_produccion: number | null
  horas: number | null
  trimestre: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  mes: string | null
  semana: string | null
  fecha_requerida: string | null
  fecha_entrega: string | null
  estado: 'Pendiente' | 'En proceso' | 'Completado' | 'Por aprobar' | 'Rechazado' | 'Cancelado'
  verificado: 'Aprobado' | 'Por aprobar' | 'Pendiente' | 'Rechazado'
  solicitado_por: string | null
  drive_url: string | null
  bloqueada: boolean
  created_at: string
  // Joins
  usuarios?: Usuario
  areas?: Area
}

export type Area = {
  id: string
  codigo: string
  nombre: string
  color: string
}

export type Solicitud = {
  id: string
  numero: number
  titulo: string
  descripcion: string
  tipo_entregable: string | null
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  estado: string
  fecha_requerida: string | null
  email_solicitante: string | null
  nombre_solicitante: string | null
  created_at: string
}

export type Marcacion = {
  id: string
  usuario_id: string
  fecha: string
  hora_entrada: string | null
  hora_salida: string | null
  horas_trabajadas: number | null
  tipo: string
}
