import type { Externo, Participante, ParticipanteNuevo } from '@/features/reuniones/types'

// Las dos formas de sentarse en la mesa, y son excluyentes: el CHECK `interno_xor_externo` exige
// que vaya `usuario_id` o `invitado_nombre`, nunca los dos ni ninguno. Las filas se arman acá y
// no en el componente para que esa invariante tenga UN lugar y su test — escrita al lado del
// botón, el día que alguien agregue un tercer camino de alta la va a escribir distinto.

export const filaInterna = (reunionId: string, usuarioId: string): ParticipanteNuevo => ({
  reunion_id: reunionId, usuario_id: usuarioId,
  invitado_nombre: null, invitado_empresa: null, invitado_email: null,
  rol_en_reunion: 'participante', asistencia: 'presente',
})

// Los vacíos van en NULL y no en '': `invitado_empresa = ''` no es lo mismo que no saber de dónde
// viene, y cualquier consulta que pregunte `IS NULL` los contaría distinto.
export const filaExterna = (reunionId: string, { nombre, empresa, email }: Externo): ParticipanteNuevo => ({
  reunion_id: reunionId, usuario_id: null,
  invitado_nombre: nombre.trim(),
  invitado_empresa: empresa.trim() || null,
  invitado_email: email.trim() || null,
  // Entra como `invitado`, que es lo que ES: quien no está en el directorio no preside ni
  // levanta el acta —`preside_o_secretaria()` mira `usuario_id`—. Se puede cambiar en la fila.
  rol_en_reunion: 'invitado', asistencia: 'presente',
})

// Quién es: un interno sale del directorio y un externo de su propia fila. El `fallback` lo pasa
// quien llama porque es texto traducido, y esto es una función pura.
export const nombreDeParticipante = (
  { usuario_id, invitado_nombre }: Participante,
  porId: Record<string, string>,
  fallback: string,
) => (usuario_id ? porId[usuario_id] : invitado_nombre) || fallback
