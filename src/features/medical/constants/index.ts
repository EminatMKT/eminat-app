import type { I18nKey } from '@/shared/i18n'

type MetaEntry = { labelKey: I18nKey; color?: string }

export const TIPOS_CITA = ['Consulta General', 'Seguimiento', 'Especialidad', 'Laboratorio', 'Imagen', 'Procedimiento', 'Urgencia', 'Telemedicina']
export const DOCTORES = ['Dr. Javier Andrade', 'Dra. Dayrelis Mesa-Sardina', 'Dr. Leonardo Salazar', 'Dra. Diana Hernandez']
export const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Consultorio A', 'Consultorio B', 'Telemedicina']
export const SEGUROS = ['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna', 'Humana', 'Privado', 'Sin seguro']

// Los valores canónicos son los de los DOMAIN de la migración de pacientes.
// Agregar un valor es agregar una fila acá Y en el DOMAIN: las dos mitades listan lo mismo.
export const GENERO_META = {
  M:  { labelKey: 'med.genero.M'  },
  F:  { labelKey: 'med.genero.F'  },
  NB: { labelKey: 'med.genero.NB' },
  ND: { labelKey: 'med.genero.ND' },
} as const satisfies Record<string, MetaEntry>

export const ESTADO_PACIENTE_META = {
  activo:   { labelKey: 'med.estadoPaciente.activo',   color: '#34D399' },
  inactivo: { labelKey: 'med.estadoPaciente.inactivo', color: '#94A3B8' },
  alta:     { labelKey: 'med.estadoPaciente.alta',     color: '#60A5FA' },
} as const satisfies Record<string, MetaEntry>

export const FUENTE_META = {
  ecw:      { labelKey: 'med.fuente.ecw'      },
  eclinpro: { labelKey: 'med.fuente.eclinpro' },
  emed:     { labelKey: 'med.fuente.emed'     },
  manual:   { labelKey: 'med.fuente.manual'   },
} as const satisfies Record<string, MetaEntry>

export type Genero = keyof typeof GENERO_META
export type EstadoPaciente = keyof typeof ESTADO_PACIENTE_META
export type FuentePaciente = keyof typeof FUENTE_META

export const GENEROS = Object.keys(GENERO_META) as Genero[]
export const ESTADOS_PACIENTE = Object.keys(ESTADO_PACIENTE_META) as EstadoPaciente[]
export const FUENTES = Object.keys(FUENTE_META) as FuentePaciente[]

type T = (key: string) => string

// El valor canónico NUNCA se renderiza. Si no está en el catálogo se devuelve crudo:
// una fila con un valor viejo tiene que verse, no desaparecer.
const label = (meta: Record<string, MetaEntry>, v: string, t: T) =>
  meta[v] ? t(meta[v].labelKey) : v

export const generoLabel = (v: string, t: T) => label(GENERO_META, v, t)
export const estadoPacienteLabel = (v: string, t: T) => label(ESTADO_PACIENTE_META, v, t)
export const fuenteLabel = (v: string, t: T) => label(FUENTE_META, v, t)

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
