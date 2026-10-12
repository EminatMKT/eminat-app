export type MeetingStatus = 'activa' | 'finalizada'
export type MeetingType =
  | 'comercial'
  | 'seguimiento'
  | 'kickoff'
  | 'cierre'
  | 'interna'
export type MeetingModality = 'presencial' | 'virtual' | 'hibrida'

export interface Company {
  id: string
  nombre: string
  codigo: string
}

export interface Profile {
  id: string
  nombre_display: string | null
  nombre: string | null
  apellido: string | null
  rol?: string | null
  email?: string | null
  activo?: boolean | null
  equipo_id?: string | null
}

export interface DepartmentRecord {
  id: string
  codigo: string
  nombre: string
}

export interface TeamRecord {
  id: string
  codigo: string
  nombre: string
  departamento_id: string
  activo: boolean
}

export interface TaskAssignee extends Profile {
  activo: true
  equipo_id: string | null
  equipo: TeamRecord | null
  departamento: DepartmentRecord | null
}

export interface TaskOrganization {
  companies: Company[]
  departments: DepartmentRecord[]
  teams: TeamRecord[]
  /** Usuarios mínimos para representar asignaciones históricas; nunca incluye email. */
  users: Profile[]
  assignees: TaskAssignee[]
}

/** Estilos por estado de una actividad del CRM. */
export const ACTIVIDAD_ESTADO_STYLES: Record<string, string> = {
  Pendiente: 'bg-amber-100 text-amber-800',
  'En proceso': 'bg-blue-100 text-blue-800',
  'Por aprobar': 'bg-purple-100 text-purple-800',
  Completado: 'bg-green-100 text-green-800',
  Rechazado: 'bg-red-100 text-red-800',
  Cancelado: 'bg-gray-100 text-gray-600',
  Solicitado: 'bg-gray-100 text-gray-600',
}

export function actividadEstadoStyle(estado?: string | null): string {
  return (
    (estado && ACTIVIDAD_ESTADO_STYLES[estado]) || 'bg-gray-100 text-gray-600'
  )
}

/** Nombre legible de un usuario del CRM. */
export function usuarioNombre(u: Profile): string {
  return (
    u.nombre_display ||
    `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() ||
    u.id
  )
}

export interface MeetingRecord {
  id: string
  user_id: string
  company_id: string | null
  title: string
  meeting_type: MeetingType | null
  objective: string | null
  modality: MeetingModality | null
  location: string | null
  meeting_date: string // YYYY-MM-DD
  start_time: string | null
  end_time: string | null
  participants: string[]
  status: MeetingStatus
  created_at: string
  updated_at: string
}

/**
 * Reemplazo COMPLETO del subconjunto editorial de una reunión.
 * No es PATCH: todos los campos son obligatorios para evitar que `undefined`
 * borre o altere datos accidentalmente en una futura persistencia.
 */
export type MeetingUpdateInput = Pick<
  MeetingRecord,
  | 'title'
  | 'objective'
  | 'modality'
  | 'location'
  | 'meeting_date'
  | 'start_time'
  | 'end_time'
  | 'meeting_type'
>

/** Alias temporal para consumidores existentes. */
export type Meeting = MeetingRecord

export type MeetingSection =
  | 'resumen'
  | 'decisiones'
  | 'proximos_pasos'
  | 'detalles'

export interface TopicRecord {
  id: string
  meeting_id: string
  user_id: string
  title: string
  description: string | null
  order_index: number
  section: MeetingSection
  responsable_id: string | null
  actividad_id: string | null
  created_at: string
}

/** Edición estrictamente editorial; actividad_id nunca debe entrar aquí. */
export type TopicEditorialUpdate = Pick<
  TopicRecord,
  'title' | 'description' | 'section' | 'order_index'
>

export interface ParticipantRecord {
  meeting_id: string
  profile_id: string
  profile: Profile | null
}

export type ParticipantLinkInput = Pick<
  ParticipantRecord,
  'meeting_id' | 'profile_id'
>

/** Única proyección CRM autorizada en la capa de lectura de Fase 1. */
export interface LinkedActivitySummary {
  id: string
  estado: string
  responsable_id: string | null
  /** Fecha límite funcional de TASK. */
  fecha_entrega: string | null
  /** Legado importado; sólo lectura para compatibilidad histórica. */
  fecha_requerida: string | null
}

export interface CanonicalTaskRecord {
  id: string
  titulo: string
  descripcion: string | null
  responsable_id: string
  estado: string
  fecha_inicio: string
  fecha_entrega: string | null
  empresa: string
  created_at: string
  updated_at: string
  responsable: { id: string; nombre: string } | null
  equipo: { id: string; codigo: string; nombre: string } | null
  departamento: { id: string; codigo: string; nombre: string } | null
}

export interface CanonicalTaskListItem extends CanonicalTaskRecord {
  meeting: { id: string; title: string; company: string | null } | null
  topic_id: string | null
  related_to_viewer: boolean
}

export interface CanonicalTaskList {
  tasks: CanonicalTaskListItem[]
  viewer: {
    profile_id: string
    equipo: { id: string; nombre: string } | null
    empresa: { id: string; codigo: string; nombre: string } | null
  }
}

export type TaskUpdateInput = {
  expected_updated_at: string
  titulo?: string
  descripcion?: string | null
  responsable_id?: string
  fecha_entrega?: string | null
  empresa?: string
}

export type TaskCreateInput = {
  topic_id: string
  titulo: string
  descripcion: string | null
  responsable_id: string
  fecha_inicio: string
  fecha_entrega: string | null
  empresa: string
}

/** Alias temporal para consumidores existentes. */
export type Topic = TopicRecord

export const MEETING_SECTIONS: {
  key: MeetingSection
  label: string
  description: string
}[] = [
  { key: 'resumen', label: 'Resumen', description: 'Puntos generales tratados' },
  {
    key: 'decisiones',
    label: 'Decisiones',
    description: 'Acuerdos tomados en la reunión',
  },
  {
    key: 'proximos_pasos',
    label: 'Tasks',
    description: 'Tasks vinculadas al CRM',
  },
  { key: 'detalles', label: 'Detalles', description: 'Notas y detalles adicionales' },
]

export const MEETING_SECTION_LABELS: Record<MeetingSection, string> = {
  resumen: 'Resumen',
  decisiones: 'Decisiones',
  proximos_pasos: 'Tasks',
  detalles: 'Detalles',
}

// Ajusta estas listas para que coincidan con tu CRM.
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  comercial: 'Comercial',
  seguimiento: 'Seguimiento',
  kickoff: 'Kickoff',
  cierre: 'Cierre',
  interna: 'Interna',
}
export const MEETING_TYPE_LABELS_EN: Record<MeetingType, string> = {
  comercial: 'Commercial', seguimiento: 'Follow-up', kickoff: 'Kickoff', cierre: 'Closing', interna: 'Internal',
}
export const MEETING_TYPE_OPTIONS: MeetingType[] = [
  'comercial',
  'seguimiento',
  'kickoff',
  'cierre',
  'interna',
]

export const MEETING_MODALITY_LABELS: Record<MeetingModality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
}
export const MEETING_MODALITY_LABELS_EN: Record<MeetingModality, string> = {
  presencial: 'In person', virtual: 'Virtual', hibrida: 'Hybrid',
}

export function meetingTypeLabel(value: MeetingType, locale: 'es' | 'en') {
  return (locale === 'en' ? MEETING_TYPE_LABELS_EN : MEETING_TYPE_LABELS)[value]
}

export function meetingModalityLabel(value: MeetingModality, locale: 'es' | 'en') {
  return (locale === 'en' ? MEETING_MODALITY_LABELS_EN : MEETING_MODALITY_LABELS)[value]
}

const TASK_STATUS_EN: Record<string, string> = {
  Pendiente: 'Pending', 'En proceso': 'In progress', 'Por aprobar': 'Awaiting approval',
  Completado: 'Completed', Rechazado: 'Rejected', Cancelado: 'Cancelled', Solicitado: 'Requested',
}
export function taskStatusLabel(value: string | null | undefined, locale: 'es' | 'en') {
  if (!value) return locale === 'en' ? 'In CRM' : 'En CRM'
  return locale === 'en' ? TASK_STATUS_EN[value] ?? value : value
}
export const MEETING_MODALITY_OPTIONS: MeetingModality[] = [
  'presencial',
  'virtual',
  'hibrida',
]
