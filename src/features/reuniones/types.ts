// Las seis uniones espejan los DOMAIN de Postgres (20260829221511_reuniones_esquema.sql) y
// tienen que listar lo mismo. El canónico NO se renderiza: la etiqueta sale del META de
// `constants/`, que le pone su clave de i18n y su color.
export type ModalidadReunion = 'presencial' | 'virtual' | 'hibrida'
export type EstadoReunion = 'borrador' | 'en_curso' | 'cerrada'
export type TipoReunion = 'seguimiento' | 'planificacion' | 'revision_direccion' | 'comite' | 'extraordinaria'
export type RolEnReunion = 'preside' | 'secretario' | 'participante' | 'invitado'
export type Asistencia = 'presente' | 'ausente' | 'invitado'
export type EstadoPendiente = 'Pendiente' | 'En proceso' | 'Por aprobar' | 'Completado'

export type Reunion = {
  id: string
  codigo: string | null
  empresa: string
  titulo: string
  tipo: TipoReunion | null
  lugar: string | null
  modalidad: ModalidadReunion
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  objetivo: string | null
  conclusiones: string | null
  proxima_fecha: string | null
  proxima_notas: string | null
  estado: EstadoReunion
  created_by: string | null
}

// Interno u externo, nunca los dos: lo obliga el CHECK `interno_xor_externo` de la base.
export type Participante = {
  id: string
  reunion_id: string
  usuario_id: string | null
  invitado_nombre: string | null
  invitado_empresa: string | null
  invitado_email: string | null
  rol_en_reunion: RolEnReunion
  asistencia: Asistencia
}

export type ParticipanteNuevo = Omit<Participante, 'id'>

// Lo que llena el formulario, derivado de `Reunion` para no olvidar una columna. Los de texto
// son `string` —un <input> vacío da '', no null— y `tipo` y `modalidad` admiten '' porque sus
// <select> arrancan en el placeholder: un valor que nadie eligió es el bug de "New task".
export type ReunionForm =
  Pick<Reunion, 'empresa' | 'titulo' | 'fecha'> &
  { tipo: TipoReunion | ''; modalidad: ModalidadReunion | '' } &
  Record<'lugar' | 'hora_inicio' | 'hora_fin' | 'objetivo', string>
