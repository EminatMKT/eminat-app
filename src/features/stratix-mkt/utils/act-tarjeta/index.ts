import { ESTADO } from '@/shared/constants/domain'
import type { Actividad } from '@/features/stratix-mkt/types'

export type DatosTarjeta = {
  inicial: string
  entrega: string
  vencida: boolean
}

// Lo que la tarjeta del Kanban muestra, decidido acá y no en el JSX: "vencida" es una regla de
// negocio (la entrega pasó Y la tarea no está completada), no un detalle de estilo, y así se
// prueba sin montar nada.
// La fecha se arma en hora LOCAL — sin el 'T00:00:00' se lee en UTC y después de las 20:00
// muestra el día siguiente (ver rules/codigo.md).
export function datosTarjeta(a: Actividad, nombre: string | undefined, locale: string, hoy = new Date()): DatosTarjeta {
  const vencida = !!a.fecha_entrega && new Date(a.fecha_entrega + 'T00:00:00') < hoy && a.estado !== ESTADO.COMPLETADO
  const entrega = a.fecha_entrega
    ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    : ''
  const datos = { inicial: nombre?.[0] ?? '?', entrega, vencida }
  return datos
}
