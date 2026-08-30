import type { Reunion, ReunionForm } from '@/features/reuniones/types'

// El camino de vuelta de `filaDesde` (src/shared/data/reuniones): aquél convierte '' en NULL para
// la base, y éste convierte NULL en '' para el formulario. Sin la vuelta, un <input> con
// `value={null}` deja de ser controlado y React lo avisa por consola en cada tecla.
const oVacio = (v: string | null) => v ?? ''

// Postgres devuelve `time` como 'HH:MM:SS' y un <input type="time"> muestra 'HH:MM'. Si se le
// pasa con segundos, el navegador lo normaliza al pintar pero el ESTADO sigue con los segundos:
// abrir una reunión y guardarla sin tocar nada contaría como un cambio.
const horaCorta = (v: string | null) => oVacio(v).slice(0, 5)

export function reunionAForm(reunion: Reunion): ReunionForm {
  const { empresa, titulo, fecha, modalidad, tipo, lugar, objetivo, hora_inicio, hora_fin } = reunion

  const form: ReunionForm = {
    empresa,
    titulo,
    fecha,
    modalidad,
    tipo: tipo ?? '',
    lugar: oVacio(lugar),
    objetivo: oVacio(objetivo),
    hora_inicio: horaCorta(hora_inicio),
    hora_fin: horaCorta(hora_fin),
  }
  return form
}
