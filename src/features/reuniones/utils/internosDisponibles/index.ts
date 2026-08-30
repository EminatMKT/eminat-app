import type { Usuario } from '@/shared/context/loadAppData'
import type { Participante } from '@/features/reuniones/types'

// A quién se puede sentar todavía en la mesa. Dos filtros y ninguno es cosmético:
//
// - **Activos.** Una reunión que se está armando es futura; ofrecer a alguien que ya no está en
//   la empresa sólo produce un participante que hay que borrar después.
// - **Los que no están ya.** El UNIQUE `participante_unico` rechazaría al repetido, así que la
//   base está protegida igual — pero ofrecerlo y que falle es peor que no ofrecerlo. La regla
//   sigue viviendo en la base; esto es para que el error no haga falta.
//
// NO filtra por el módulo `reuniones`: a una reunión va quien tenga que ir, y no todo el que se
// sienta en una mesa entra a la app a leer el acta. Es la diferencia con `miembrosAsignables` de
// Stratix, que sí pregunta por el módulo porque ahí se le ASIGNA trabajo a la persona.
export function internosDisponibles(usuarios: Usuario[], participantes: Participante[]) {
  const yaEstan = new Set(participantes.map(p => p.usuario_id).filter(Boolean))

  const libres = usuarios
    .filter(u => u.activo && u.nombre && !yaEstan.has(u.id))
    .map(u => ({ id: u.id, nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() }))
  return libres
}
