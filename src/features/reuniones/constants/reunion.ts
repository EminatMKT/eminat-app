import { catalogoMeta } from '@/shared/utils'
import type { EstadoReunion, ModalidadReunion, TipoReunion } from '../types'

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
