import { catalogoMeta, localDate } from '@/shared/utils'
import type { EstadoReunion, ModalidadReunion, ReunionForm, TipoReunion } from '../types'

// El formulario en blanco. Ningún campo arranca con un valor de dominio escrito a mano:
// `modalidad` decía `'presencial'`, que es el bug de "New task" —un valor que nadie eligió y
// queda guardado igual—. Es una función y no una constante para que la fecha se calcule al
// montar y no al importar: en UTC, después de las 20:00 una reunión de hoy nacería mañana.
export const formVacio = (): ReunionForm => ({
  empresa: '', titulo: '', tipo: '', lugar: '',
  modalidad: '', fecha: localDate(), hora_inicio: '', hora_fin: '', objetivo: '',
})

// Los catálogos de la reunión en sí. Cada uno lista los MISMOS valores que su DOMAIN de
// Postgres (20260829221511_reuniones_esquema.sql) — son las dos mitades del mismo catálogo.
// Lo que se guarda es la clave; lo que se muestra sale de `.label(v, t)`, que pasa por i18n.

export const MODALIDAD = catalogoMeta<ModalidadReunion>({
  presencial: { labelKey: 'reuniones.modalidad.presencial', color: '#7C6FF7' },
  virtual:    { labelKey: 'reuniones.modalidad.virtual',    color: '#34D399' },
  hibrida:    { labelKey: 'reuniones.modalidad.hibrida',    color: '#FBB040' },
})

// El orden ES el del ciclo de vida del acta: se redacta, se celebra, se cierra.
export const ESTADO_REUNION = catalogoMeta<EstadoReunion>({
  borrador: { labelKey: 'reuniones.estado.borrador', color: '#9494B3' },
  en_curso: { labelKey: 'reuniones.estado.enCurso',  color: '#7C6FF7' },
  cerrada:  { labelKey: 'reuniones.estado.cerrada',  color: '#34D399' },
})

export const TIPO_REUNION = catalogoMeta<TipoReunion>({
  seguimiento:        { labelKey: 'reuniones.tipo.seguimiento' },
  planificacion:      { labelKey: 'reuniones.tipo.planificacion' },
  revision_direccion: { labelKey: 'reuniones.tipo.revisionDireccion' },
  comite:             { labelKey: 'reuniones.tipo.comite' },
  extraordinaria:     { labelKey: 'reuniones.tipo.extraordinaria' },
})
