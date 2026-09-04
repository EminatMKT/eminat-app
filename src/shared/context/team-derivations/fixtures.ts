import { MODULE, ADMIN_ROLE } from '@/shared/auth/permissions'

// Los usuarios y el mapa de roles que comparten los dos archivos de test de las derivaciones.
// Están acá y no duplicados en cada uno porque la gracia de estas fixtures es que las dos
// preguntas —quién es del equipo de marketing y quién es asignable— se contesten sobre la
// MISMA gente: es la única forma de que se vea que dan listas distintas.
export const mkt = { departamentos: { codigo: 'MKT' } }
export const otro = { departamentos: { codigo: 'FIN' } }

export const usuarios = [
  { id: 'u1', nombre: 'Freddy', apellido: 'Crespín', activo: true, rol: ADMIN_ROLE, equipos: mkt },
  { id: 'u2', nombre: 'Angie', apellido: 'Núñez', activo: true, rol: 'disenador', equipos: mkt },
  { id: 'u3', nombre: 'Jonathan', apellido: 'Bula', activo: false, rol: 'disenador', equipos: null }, // inactivo
  { id: 'u4', nombre: 'Ana', apellido: 'Pérez', activo: true, rol: 'medico', equipos: otro },         // sin el módulo
  { id: 'u5', nombre: 'Sinapellido', apellido: null, activo: true, rol: 'disenador', equipos: null }, // SIN equipo
]

// Rol -> módulos, como lo carga AppContext desde la DB. `enfermera` es el caso nuevo: otro
// departamento, con el módulo de tareas — exactamente para lo que se creó /tasks.
export const map = {
  disenador: [MODULE.TASKS, MODULE.STRATIX_MKT],
  medico: [MODULE.MEDICAL],
  enfermera: [MODULE.TASKS],
}
