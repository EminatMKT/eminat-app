// El payload que va a la tabla, para crear Y para editar. Es UNO solo a propósito: si crear y
// editar armaran cada uno el suyo, un campo agregado a uno y olvidado en el otro daría una tarea
// que se puede crear con `drive_url` y nunca más limpiarlo. Ese era el riesgo que la marca de
// exención del hook defendía cuando el payload vivía adentro; acá está mejor, porque además se
// puede probar sin montar React.
//
// Completo y con nulls, no con campos omitidos: un campo ausente en un UPDATE de PostgREST no se
// toca, así que omitirlo haría que editar pudiera cambiar un valor pero nunca borrarlo.
import { trimestreDe } from '@/features/stratix-mkt/utils/periodo'
import { mesTestigo } from '@/features/stratix-mkt/utils/periodo/testigo'
import type { NuevaActForm } from '@/features/stratix-mkt/types'

export function payloadDeActividad(form: NuevaActForm): Record<string, unknown> {
  const {
    titulo, empresa, responsable_id, fecha_inicio, estado, descripcion,
    horas, dias_produccion, fecha_entrega, solicitante_id, drive_url,
  } = form

  const fila: Record<string, unknown> = {
    titulo: titulo.trim(),
    empresa,
    responsable_id,
    fecha_inicio,
    // Fase 1: `mes` y `trimestre` se siguen escribiendo para que el testigo no se quede viejo
    // mientras se verifica el backfill contra datos de producción. Se borran en la fase 2.
    mes: mesTestigo(fecha_inicio),
    trimestre: trimestreDe(fecha_inicio) || null,
    estado,
    descripcion: descripcion || null,
    horas: horas ? Number(horas) : null,
    dias_produccion: dias_produccion ? Number(dias_produccion) : null,
    fecha_entrega: fecha_entrega || null,
    solicitante_id: solicitante_id || null,
    drive_url: drive_url || null,
  }
  return fila
}

// El payload del ALTA: el compartido más el creador. Es la única excepción a "un solo payload",
// y por eso está afuera y no adentro: `created_by_id` se escribe UNA vez y no se toca nunca más.
// Si viajara en `payloadDeActividad`, cada edición lo pisaría con quien esté editando.
//
// Sin usuario (el perfil todavía cargando) va `null` explícito: una tarea sin creador es válida
// —las filas anteriores a esta columna lo son— y es mejor que un uuid vacío que revienta.
export function payloadDeAlta(form: NuevaActForm, creadorId: string | undefined): Record<string, unknown> {
  return { ...payloadDeActividad(form), created_by_id: creadorId || null }
}
