export const TIPOS_CITA = ['Consulta General', 'Seguimiento', 'Especialidad', 'Laboratorio', 'Imagen', 'Procedimiento', 'Urgencia', 'Telemedicina']
export const DOCTORES = ['Dr. Javier Andrade', 'Dra. Dayrelis Mesa-Sardina', 'Dr. Leonardo Salazar', 'Dra. Diana Hernandez']
export const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Consultorio A', 'Consultorio B', 'Telemedicina']
export const GENEROS = ['Masculino', 'Femenino', 'No binario', 'Prefiere no decir']
export const SEGUROS = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna', 'Humana', 'Privado', 'Sin seguro']

export const ESTADO_CITA_COLORS: Record<string, string> = {
  programada: '#60A5FA',
  confirmada: '#34D399',
  en_curso: '#7C6FF7',
  completada: '#34D399',
  cancelada: '#F87171',
  no_show: '#FBB040',
}

export const SEVERIDAD_COLORS: Record<string, string> = {
  baja: '#34D399',
  media: '#FBB040',
  alta: '#FB923C',
  critica: '#F87171',
}

export const NIVEL_LOG_COLORS: Record<string, string> = {
  info: '#60A5FA',
  warning: '#FBB040',
  critical: '#F87171',
}
