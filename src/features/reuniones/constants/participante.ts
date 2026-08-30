import { catalogoMeta } from '@/shared/utils'
import type { Asistencia, RolEnReunion } from '../types'

// El orden ES el de jerarquía en la mesa: quien preside, quien levanta el acta, el resto.
// `preside` y `secretario` no son decorativos: son los dos roles que `preside_o_secretaria()`
// deja escribir el acta (ver las policies de 20260829221511_reuniones_esquema.sql).
export const ROL_EN_REUNION = catalogoMeta<RolEnReunion>({
  preside:      { labelKey: 'reuniones.rol.preside',      color: '#FBB040' },
  secretario:   { labelKey: 'reuniones.rol.secretario',   color: '#7C6FF7' },
  participante: { labelKey: 'reuniones.rol.participante', color: '#9494B3' },
  invitado:     { labelKey: 'reuniones.rol.invitado',     color: '#5EC8F2' },
})

export const ASISTENCIA = catalogoMeta<Asistencia>({
  presente: { labelKey: 'reuniones.asistencia.presente', color: '#34D399' },
  ausente:  { labelKey: 'reuniones.asistencia.ausente',  color: '#F27575' },
  invitado: { labelKey: 'reuniones.asistencia.invitado', color: '#9494B3' },
})
