// Las seis uniones espejan los DOMAIN de Postgres (20260829221511_reuniones_esquema.sql):
// las dos mitades tienen que listar lo mismo. El objeto META de `constants/` le pone
// etiqueta y color a cada valor — el canónico NO se renderiza nunca, la etiqueta sale de i18n.
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

// Lo que llena el formulario: un solo objeto, porque se llena y se envía junto. Derivado de
// `Reunion` para que agregar una columna no se olvide acá. Los campos de texto son `string`
// —un <input> vacío da '', no null—. `tipo` y `modalidad` admiten '' porque sus <select>
// arrancan en el placeholder vacío: `modalidad` tiene DEFAULT en la base, pero un valor que
// nadie eligió y queda igual es el bug de "New task" del 12/08 (rules/ui.md).
export type ReunionForm =
  Pick<Reunion, 'empresa' | 'titulo' | 'fecha'> &
  { tipo: TipoReunion | ''; modalidad: ModalidadReunion | '' } &
  Record<'lugar' | 'hora_inicio' | 'hora_fin' | 'objetivo', string>
