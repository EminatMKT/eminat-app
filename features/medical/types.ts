export interface Paciente {
  id: string
  mrn: string
  nombre: string
  apellido: string
  fecha_nacimiento: string
  genero: string
  telefono: string
  email: string
  seguro: string
  seguro_id: string
  direccion: string
  estado: 'activo' | 'inactivo' | 'alta'
  alergias: string
  condiciones: string
  notas: string
  created_at: string
  updated_at: string
}

export interface Cita {
  id: string
  paciente_id: string
  paciente_nombre: string
  tipo: string
  fecha: string
  hora: string
  duracion: number
  doctor: string
  estado: 'programada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'no_show'
  notas: string
  sala: string
  created_at: string
}

export interface HipaaLog {
  id: string
  usuario_email: string
  usuario_nombre: string
  accion: string
  recurso: string
  paciente_id: string
  paciente_nombre: string
  detalles: string
  ip: string
  timestamp: string
  nivel: 'info' | 'warning' | 'critical'
}

export interface HipaaIncidente {
  id: string
  titulo: string
  descripcion: string
  tipo: 'breach' | 'violation' | 'near_miss' | 'complaint'
  severidad: 'baja' | 'media' | 'alta' | 'critica'
  estado: 'abierto' | 'investigando' | 'resuelto' | 'cerrado'
  reportado_por: string
  fecha_incidente: string
  fecha_resolucion: string | null
  acciones_correctivas: string
  created_at: string
}

export interface HipaaTraining {
  id: string
  usuario_email: string
  usuario_nombre: string
  curso: string
  fecha_completado: string | null
  fecha_vencimiento: string
  estado: 'pendiente' | 'completado' | 'vencido'
  puntuacion: number | null
}
